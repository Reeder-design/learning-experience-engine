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

The first runtime supports responsive slide canvases, scenes/slides, layers, positioned objects, image assets, author/player variables, variable adjustments, conditions, layer show/hide, object show/hide, object state changes, action groups, basic media actions, slide navigation, timeline events, and pointer events such as release/rollover/press.

This is an engine-native runtime, not the original Storyline player. Unsupported Storyline actions remain preserved in normalized JSON and are treated as no-ops until a dedicated runtime implementation is added.
