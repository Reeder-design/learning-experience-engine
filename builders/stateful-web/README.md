# Stateful Web Builder

Builds a standalone browser experience from normalized Storyline-style stateful JSON.

## Input

A normalized experience folder containing:

- `experience.json`
- `variables.json`
- `assets.json`
- `scenes/`
- `slides/`

## Usage

```bash
npm run build-stateful-web -- <normalized-experience-folder> --output <output-folder> [--assets <asset-folder>] [--theme portfolio]
```

The runtime supports responsive slide canvases, scenes/slides, layers, positioned objects, image/video/audio assets, author/player variables, variable adjustments, conditions, layer show/hide, object show/hide, object state changes, action groups, basic media actions, slide navigation, timeline events, and pointer events such as release/rollover/press.

## Reusable component adapters

The builder packages the public stateful component layer automatically. When the normalized structure provides enough evidence, the runtime enhances common Storyline-style patterns with engine-native UI:

- **Carousel** — paged image presentation with previous/next controls, indicators, and keyboard navigation.
- **Hotspot reveal** — labeled hotspots, viewed-state tracking, progress, keyboard activation, and closeable detail layers.
- **Assessment shell** — question progress, answer affordances, score display when available, and feedback-layer styling.
- **Media presentation** — native video/audio playback and segment controls for multi-part media slides.

If a pattern is not recognized, the experience remains available through the generic stateful slide/layer/object renderer instead of failing.

This is an engine-native runtime, not the original Storyline player. Unsupported Storyline actions remain preserved in normalized JSON and are treated as no-ops until a dedicated runtime implementation is added. Storyline motion-path/animation fidelity and every proprietary player behavior are not yet fully reproduced.
