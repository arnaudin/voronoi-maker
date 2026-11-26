# Voronoi Maker: Figma Community listing

Paste-ready copy for the Publish plugin modal (Figma desktop → Plugins → Manage plugins →
⋯ next to Voronoi Maker → Publish). Images are in this folder; regenerate them with
`./render.sh` after `npm run build`.

---

## 1. Describe your resource

**Name**

```
Voronoi Maker
```

**Tagline**

```
Generate editable vector Voronoi patterns in Figma
```

Alternates:
- `Create Voronoi patterns where every cell is an editable vector`
- `Organic cell patterns, mosaics, and geometric textures as Figma vectors`

**Category:** Design tools

**Description** (plain-text formatting, so it pastes cleanly whether or not the editor
parses Markdown)

```
Voronoi Maker generates Voronoi patterns as editable vectors inside Figma. Every cell is its own closed shape, so you can click any cell to recolor it, restyle it, or pull it out of the frame.

STYLES
• Colored: 6 built-in themes. Choose Balanced (keeps neighboring cells different colors), Random, or By cell size.
• Gradient: cells shaded along a theme gradient at any angle.
• Outline: black outlines on white for line art and custom fills.

CONTROLS
• Density: 12 to 800 cells.
• Uniformity: irregular scatter up to near-even honeycomb.
• Pattern: Scatter, Clusters, Grid, or Orbits.
• Gap & Rounding: even gutters and rounded corners for pebble, terrazzo, or mosaic looks.
• Rings: nested outlines inside each cell (like tree rings or agate), shaded from dark to light or in alternating tints.
• Stroke, frame size (100–4000 px), and seed.

The same seed and settings always produce the exact same layout. Hit Shuffle for a new one.

EDITABLE LATER
Select any frame Voronoi Maker created and click "Edit Voronoi pattern" in the properties panel to reopen the plugin with that frame's settings. When you click "Update selected", the frame regenerates in place and keeps any cells you recolored by hand. Restyling keeps them on the exact same cells; changing the size, density, pattern, gap, or seed maps them onto the nearest new cells.

USES
Backgrounds and textures, mosaics, packaging, posters, and stylized maps.

PRIVACY
Runs entirely inside your Figma file with no network access, accounts, or analytics.
```

## 2. Choose some images

| Slot | File | Size |
|---|---|---|
| Icon | `icon.png` | 128 × 128 |
| Thumbnail | `thumbnail.png` | 1920 × 1080 |
| Carousel 1 | `carousel-1-styles.png` | 1920 × 1080 |
| Carousel 2 | `carousel-2-patterns.png` | 1920 × 1080 |
| Carousel 3 | `carousel-3-themes.png` | 1920 × 1080 |
| Carousel 4 | `carousel-4-editing.png` | 1920 × 1080 |

Every image is real plugin output drawn by `dist/core.iife.js`; carousel 4 embeds the
actual plugin UI (`dist/ui.html`). Check each PNG after `./render.sh`: headless Chrome
once left a blank strip along the bottom of the thumbnail.

Optional, worth adding later:
- **Carousel 5:** a real Figma screenshot of a generated frame selected, with the
  **Edit Voronoi pattern** button visible in the properties panel. It's the feature people
  won't expect, and only a real capture shows it.
- **Playground file:** a Figma file with Getting started steps, a frame to try, and
  examples. Insert the "Try it out" frame with the **published** plugin, after the
  manifest id switch (see §5), so its Edit Voronoi pattern button works for people who
  open the file.

## 3. Data security (optional form)

The form's wording may vary; these are the facts to answer from:

- **Network access:** none. The manifest sets `networkAccess.allowedDomains` to
  `["none"]`, so Figma should label it *No access to network*.
- **Collects, stores externally, or transmits user data:** no. No analytics or telemetry,
  no third-party services, no accounts or sign-in, no payments.
- **Reads:** only the current selection, to check whether it's a frame Voronoi Maker
  created.
- **Writes:** new frames of vector shapes on the current page. The settings used for
  each frame (density, seed, theme name, and similar values) are saved on that frame
  as plugin data so it can be edited later. That data stays in the user's file.

## 4. Add the final details

- **Publish to:** Community
- **Publish as:** yourself (or your team)
- **Support contact:** a support email, or the public repo's Issues page once the repo
  is public
- **Network access label:** confirm it shows *No access to network*
- **Comments:** allow (recommended for a free plugin; it's where people post requests)

## 5. Publish checklist: read before clicking Publish

1. **Two-factor authentication** must be enabled on your Figma account.
2. **Build is current:** `npm run build` if `src/` changed since the last build.
3. **⚠️ Manifest id switch.** Our id `849301276554182930` was made locally, and Figma
   has to issue the real one. Per Figma's manifest docs, you can get a new plugin ID
   during publishing. Then:
   - Put the Figma-issued id in `manifest.json` → `id`, and **never change it again**.
   - Frames you made during development are tied to the old id. Plugin data is private
     to the plugin id that wrote it, so the published plugin can't read their settings
     and their **Edit Voronoi pattern** button won't work. Regenerate any frames you want to keep
     editable using the published version.
4. Upload images, paste copy, submit. Figma reviews Community plugins before listing.
   The data-security answers are reviewed separately and can take up to two weeks.
