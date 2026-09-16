# Storyline Normalizer

Converts Storyline Extractor output into the Learning Experience Engine's draft stateful-experience model.

## Why Storyline has a separate normalized model

Rise is mostly document/block oriented. Storyline is stateful and timeline driven. Forcing Storyline into the Rise lesson/block model would lose the concepts that make Storyline useful: scenes, slides, layers, object states, variables, triggers, conditions, timelines, and navigation logic.

The Storyline normalizer therefore produces an `experience.json` plus normalized scene and slide files.

## Usage

```bash
npm run normalize-storyline -- <storyline-extracted-folder>
```

By default the normalizer writes to `<storyline-extracted-folder>/normalized`.

Optional explicit output:

```bash
npm run normalize-storyline -- <storyline-extracted-folder> --output <folder>
```

## Output

```text
normalized/
├── experience.json
├── variables.json
├── assets.json
├── normalization-manifest.json
├── scenes/
└── slides/
```

A normalized slide surfaces:

- canvas dimensions
- slide duration and transition
- base layer and slide layers
- objects and bounds
- accessibility metadata
- linked assets
- object states
- events
- normalized actions
- action groups
- interaction signals

Normalized actions use engine-facing names where possible, including:

- `object.show`
- `object.hide`
- `object.state.set`
- `layer.show`
- `layer.hide`
- `variable.adjust`
- `navigation.next`
- `navigation.previous`
- `navigation.slide`
- `assessment.submit`
- `media.play`
- `javascript.execute`
- `condition`

Unknown Storyline action kinds are retained with a `storyline.*` action type and their original `rawKind` so the normalizer does not silently discard behavior.

## Source fidelity

The normalized model is intentionally not a replacement for the extracted Storyline runtime data. The extractor output remains the lossless/reference layer. Normalized files are the authoring-tool-neutral working layer.

Status: **draft v0.1, Storyline-informed**.
