# Component Web Builder

Builds standalone themed learning interactions directly from engine-native component JSON. No Rise or Storyline source is required.

## Why this exists

The import pipelines teach the engine how existing authoring tools represent learning experiences. The component builder flips that workflow around: author a clean interaction definition first, then let the engine render it.

Current component types:

- `carousel`
- `hotspot-reveal`
- `assessment`
- `media-presentation`

All use `schemas/component.schema.json`.

## Usage

```bash
npm run build-component -- content/demos/components/carousel.json \
  --output dist/component-carousel \
  --theme portfolio
```

The generated folder contains:

- `index.html`
- `component.css`
- `runtime.js`
- `theme.css` when available
- theme favicon/icons when available
- copied local component assets
- `build-manifest.json`

## Authoring model

A component definition intentionally describes learning intent rather than authoring-tool mechanics.

Example carousel:

```json
{
  "schemaVersion": "0.1",
  "id": "customer-signals",
  "title": "Customer Signals",
  "type": "carousel",
  "instruction": "Review each signal.",
  "completion": { "strategy": "view-all", "required": true },
  "content": {
    "pageSize": 3,
    "items": [
      {
        "id": "signal-1",
        "title": "Reliability",
        "body": "The current workflow is disrupted by recurring outages."
      }
    ]
  }
}
```

This is the preferred direction for new learning experiences. Storyline/Rise imports remain useful for migration, reverse engineering, and converting existing work, but new interactions should increasingly be authored against engine-native contracts.

## Assets

Asset paths are resolved relative to the component JSON file. Local files are copied into the generated preview's `assets/` folder. Remote HTTP(S) and data URLs are referenced directly.

Keep confidential assets and component JSON in `learning-content-private/`. Public demos in this repository must stay fictional/sanitized.

## Completion events

When a required interaction completes, the runtime dispatches:

```js
window.addEventListener('lx:component-complete', (event) => {
  console.log(event.detail.id, event.detail.type);
});
```

This event is the first common tracking hook for future course composition, xAPI, SCORM, and LMS integrations.
