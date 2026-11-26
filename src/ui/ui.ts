import { DEFAULT_PARAMS, generate, PALETTES, VoronoiParams } from '../core';

const state: VoronoiParams = { ...DEFAULT_PARAMS };

let currentSvg = '';
let targetId: string | null = null;
let targetName = '';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const randSeed = (): number => Math.floor(Math.random() * 1_000_000_000);

// Coalesce slider drags to one render per animation frame — a dense, heavily
// relaxed tessellation can take >100ms to compute.
let renderQueued = false;
function scheduleRender(): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    if (renderQueued) render();
  });
}

function render(): void {
  renderQueued = false;
  const t0 = performance.now();
  const res = generate(state);
  currentSvg = res.svg;
  const box = $('preview');
  box.style.aspectRatio = `${state.width} / ${state.height}`;
  box.innerHTML = res.svg.replace(
    /width="[\d.]+" height="[\d.]+"/,
    'width="100%" height="100%"',
  );
  const target = targetId ? ` · updating “${targetName}”` : '';
  const rings = res.ringCount ? ` + ${res.ringCount} rings` : '';
  $('meta').textContent = `${res.cellCount} cells${rings} · seed ${state.seed} · ${(
    performance.now() - t0
  ).toFixed(0)}ms${target}`;
  $('insert').textContent = targetId ? 'Update selected' : 'Insert into Figma';
  $('insertNew').classList.toggle('hide', !targetId);
  $('themeRow').classList.toggle('hide', state.style === 'bw');
  $('strategyRow').classList.toggle('hide', state.style !== 'color');
  $('angleRow').classList.toggle('hide', state.style !== 'gradient');
  $('ringShadingRow').classList.toggle('hide', state.style === 'bw' || !state.ringSpacing);
}

/** Slider readout; a zero ring spacing reads as "Off". */
function showValue(id: string, value: string): void {
  const val = document.getElementById(`${id}Val`);
  if (val) val.textContent = id === 'ringSpacing' && Number(value) === 0 ? 'Off' : value;
}

function setSeg(id: 'style' | 'ringShading', value: string): void {
  $(id)
    .querySelectorAll('button')
    .forEach((b) => b.classList.toggle('on', b.dataset.v === value));
}

/** Stored settings from a selected frame. Start from the defaults so a frame
 *  saved before a setting existed doesn't inherit the panel's current value. */
function hydrate(params: Partial<VoronoiParams>): void {
  Object.assign(state, DEFAULT_PARAMS, params);
  applyState();
}

/** Push current state into every control (hydrate from a selected frame). */
function applyState(): void {
  const numeric = [
    'density',
    'relax',
    'gap',
    'rounding',
    'ringSpacing',
    'strokeWidth',
    'gradientAngle',
    'width',
    'height',
    'seed',
  ] as const;
  for (const id of numeric) {
    const el = $<HTMLInputElement>(id);
    el.value = String(state[id]);
    showValue(id, el.value);
  }
  $<HTMLSelectElement>('pattern').value = state.pattern;
  $<HTMLSelectElement>('colorStrategy').value = state.colorStrategy;
  setSeg('style', state.style);
  setSeg('ringShading', state.ringShading);
  $('themes')
    .querySelectorAll<HTMLElement>('.swatch')
    .forEach((s) => s.classList.toggle('on', s.dataset.id === state.themeId));
}

window.onmessage = (e: MessageEvent) => {
  const msg = e.data?.pluginMessage;
  if (!msg) return;
  if (msg.type === 'hydrate' && msg.params) {
    hydrate(msg.params);
    render();
  } else if (msg.type === 'target') {
    const changed = msg.nodeId !== targetId;
    targetId = msg.nodeId ?? null;
    targetName = msg.name ?? '';
    if (targetId && changed && msg.params) hydrate(msg.params);
    render();
  }
};

// Theme swatches
const themes = $('themes');
for (const p of PALETTES) {
  const sw = document.createElement('div');
  sw.className = 'swatch' + (p.id === state.themeId ? ' on' : '');
  sw.title = p.name;
  sw.dataset.id = p.id;
  for (const c of p.colors.slice(0, 4)) {
    const bar = document.createElement('i');
    bar.style.background = c;
    sw.appendChild(bar);
  }
  sw.addEventListener('click', () => {
    themes.querySelectorAll('.swatch').forEach((s) => s.classList.remove('on'));
    sw.classList.add('on');
    state.themeId = p.id;
    render();
  });
  themes.appendChild(sw);
}

function bindSlider(
  id: 'density' | 'relax' | 'gap' | 'rounding' | 'ringSpacing' | 'strokeWidth' | 'gradientAngle',
): void {
  const el = $<HTMLInputElement>(id);
  el.addEventListener('input', () => {
    state[id] = Number(el.value);
    showValue(id, el.value);
    scheduleRender();
  });
}

/** Frame dims commit on change (blur/enter) so clamping doesn't fight typing. */
function bindDimension(id: 'width' | 'height'): void {
  const el = $<HTMLInputElement>(id);
  el.addEventListener('change', () => {
    const v = Math.min(4000, Math.max(100, Math.round(Number(el.value) || state[id])));
    el.value = String(v);
    state[id] = v;
    render();
  });
}

function bindSelect(id: 'pattern' | 'colorStrategy'): void {
  const el = $<HTMLSelectElement>(id);
  el.addEventListener('change', () => {
    (state as unknown as Record<string, unknown>)[id] = el.value;
    render();
  });
}

bindSlider('density');
bindSlider('relax');
bindSlider('gap');
bindSlider('rounding');
bindSlider('ringSpacing');
bindSlider('strokeWidth');
bindSlider('gradientAngle');
bindDimension('width');
bindDimension('height');
bindSelect('pattern');
bindSelect('colorStrategy');

function bindSeg(id: 'style' | 'ringShading'): void {
  $(id)
    .querySelectorAll('button')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        setSeg(id, btn.dataset.v ?? '');
        (state as unknown as Record<string, unknown>)[id] = btn.dataset.v;
        render();
      });
    });
}

bindSeg('style');
bindSeg('ringShading');

$<HTMLInputElement>('seed').addEventListener('input', () => {
  state.seed = Number($<HTMLInputElement>('seed').value) || 0;
  scheduleRender();
});

$('shuffle').addEventListener('click', () => {
  state.seed = randSeed();
  $<HTMLInputElement>('seed').value = String(state.seed);
  render();
});

function send(type: 'insert' | 'update'): void {
  // A slider drag's last render may still be waiting on the next frame; send
  // what the controls say now, not the previous frame's SVG.
  if (renderQueued) render();
  parent.postMessage(
    {
      pluginMessage: {
        type,
        nodeId: targetId,
        svg: currentSvg,
        seed: state.seed,
        style: state.style,
        params: { ...state },
      },
    },
    '*',
  );
}

$('insert').addEventListener('click', () => send(targetId ? 'update' : 'insert'));
// With a frame selected the main button updates it; this adds a new one instead.
$('insertNew').addEventListener('click', () => send('insert'));

render();
