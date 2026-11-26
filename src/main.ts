/// <reference types="@figma/plugin-typings" />
import { layerFillMap, matchLayers, prettyName, VoronoiParams } from './core';

const PARAMS_KEY = 'voronoi-params';

figma.showUI(__html__, { width: 360, height: 720, themeColors: true });

function prettify(node: BaseNode): void {
  node.name = prettyName(node.name);
  if ('children' in node) {
    for (const child of node.children) prettify(child);
  }
}

/** Walk up from a node to the generated Voronoi frame that contains it. */
function voronoiFrameFor(node: BaseNode): SceneNode | null {
  let cur: BaseNode | null = node;
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') {
    if (cur.getPluginData(PARAMS_KEY)) return cur as SceneNode;
    cur = cur.parent;
  }
  return null;
}

/** Tell the UI which Voronoi frame (if any) the current selection targets. */
function postTarget(): void {
  for (const selected of figma.currentPage.selection) {
    const frame = voronoiFrameFor(selected);
    if (frame) {
      let params: unknown = null;
      try {
        params = JSON.parse(frame.getPluginData(PARAMS_KEY));
      } catch {
        // corrupt data — still allow targeting, just without hydration
      }
      figma.ui.postMessage({ type: 'target', nodeId: frame.id, name: frame.name, params });
      return;
    }
  }
  figma.ui.postMessage({ type: 'target', nodeId: null });
}

postTarget();
figma.on('selectionchange', postTarget);

/** "#rrggbb" of a single solid fill, else null (mixed/gradient/multiple). */
function solidHex(paints: readonly Paint[] | typeof figma.mixed): string | null {
  if (paints === figma.mixed || !Array.isArray(paints) || paints.length !== 1) return null;
  const p = paints[0];
  if (p.type !== 'SOLID') return null;
  const to = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(p.color.r)}${to(p.color.g)}${to(p.color.b)}`;
}

/** Leaf vectors keyed by layer name ("Background", "Cell 001", …) — the
 *  tessellation is flat, so names alone are unique. */
function leafMap(root: SceneNode): Map<string, SceneNode> {
  const map = new Map<string, SceneNode>();
  const walk = (node: SceneNode): void => {
    if ('children' in node && node.children.length > 0) {
      for (const child of node.children) walk(child);
    } else {
      map.set(node.name, node);
    }
  };
  if ('children' in root) {
    for (const child of root.children) walk(child);
  }
  return map;
}

/** The background rect sits under every cell; lock it so clicks in the gaps
 *  don't grab it by accident (unlock in the Layers panel to recolor it). */
function lockBackground(frame: FrameNode): void {
  for (const child of frame.children) {
    if (child.name === 'Background') child.locked = true;
  }
}

/** `kept` of `total` overrides landed on a cell; the rest had none nearby, or
 *  lost it to a closer override when cells merged. */
function updateNotice(kept: number, total: number): string {
  if (total === 0) return 'Pattern updated';
  const noun = `color${total === 1 ? '' : 's'} you changed by hand`;
  if (kept === total) return `Pattern updated. Kept ${kept} ${noun}.`;
  return `Pattern updated. Kept ${kept} of ${total} ${noun}; ${total - kept} had no matching cell.`;
}

interface PluginMsg {
  type: string;
  svg?: string;
  seed?: number;
  style?: string;
  nodeId?: string | null;
  params?: VoronoiParams;
}

function stampAndPlace(frame: FrameNode, msg: PluginMsg, x?: number, y?: number): void {
  const suffix = msg.style === 'bw' ? ' (Outline)' : msg.style === 'gradient' ? ' (Gradient)' : '';
  frame.name = `Voronoi ${msg.seed ?? ''}${suffix}`.trim();
  prettify(frame);
  lockBackground(frame);
  if (msg.params) {
    frame.setPluginData(PARAMS_KEY, JSON.stringify(msg.params));
    frame.setRelaunchData({ edit: 'Reopen Voronoi Maker with this pattern’s settings' });
  }
  frame.x = x ?? Math.round(figma.viewport.center.x - frame.width / 2);
  frame.y = y ?? Math.round(figma.viewport.center.y - frame.height / 2);
}

figma.ui.onmessage = async (msg: PluginMsg) => {
  try {
    await handle(msg);
  } catch (e) {
    figma.notify(`Something went wrong: ${e instanceof Error ? e.message : String(e)}`, {
      error: true,
    });
  }
};

async function handle(msg: PluginMsg): Promise<void> {
  if (msg.type === 'insert' && msg.svg) {
    const frame = figma.createNodeFromSvg(msg.svg);
    stampAndPlace(frame, msg);
    figma.currentPage.appendChild(frame);
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);
    figma.notify('Voronoi pattern added. Every cell is its own vector, so you can recolor any of them.');
  } else if (msg.type === 'update' && msg.svg && msg.nodeId) {
    const old = await figma.getNodeByIdAsync(msg.nodeId);
    if (!old || old.removed || !('x' in old)) {
      figma.ui.postMessage({ type: 'target', nodeId: null });
      figma.notify('The original pattern was deleted. Use Insert to add a new one.', { error: true });
      return;
    }
    // Collect manual fill overrides: any cell whose current fill differs from
    // what its stored params originally generated. Cell names are sequential,
    // so once the geometry changes "Cell 042" is a different cell —
    // matchLayers re-targets each override to the cell now in its spot.
    const overrides = new Map<string, Paint[]>();
    const placed = new Map<string, Paint[]>();
    try {
      const stored = JSON.parse(old.getPluginData(PARAMS_KEY)) as VoronoiParams;
      const original = layerFillMap(stored);
      for (const [key, node] of leafMap(old as SceneNode)) {
        const orig = original.get(key);
        if (!orig || !('fills' in node)) continue;
        const cur = solidHex(node.fills);
        if (cur === null || cur.toLowerCase() !== orig.toLowerCase()) {
          overrides.set(key, JSON.parse(JSON.stringify(node.fills)) as Paint[]);
        }
      }
      if (overrides.size > 0 && msg.params) {
        for (const [from, to] of matchLayers(stored, msg.params, overrides.keys())) {
          placed.set(to, overrides.get(from) as Paint[]);
        }
      }
    } catch {
      // no/corrupt stored params — update without preservation
    }

    const fresh = figma.createNodeFromSvg(msg.svg);
    stampAndPlace(fresh, msg, old.x, old.y);
    let kept = 0;
    if (placed.size > 0) {
      const freshLeaves = leafMap(fresh);
      for (const [key, paints] of placed) {
        const node = freshLeaves.get(key);
        if (node && 'fills' in node) {
          node.fills = paints;
          kept++;
        }
      }
    }
    const parent = old.parent ?? figma.currentPage;
    parent.insertChild(parent.children.indexOf(old as SceneNode), fresh);
    old.remove();
    figma.currentPage.selection = [fresh];
    figma.notify(updateNotice(kept, overrides.size));
  } else if (msg.type === 'close') {
    figma.closePlugin();
  }
}
