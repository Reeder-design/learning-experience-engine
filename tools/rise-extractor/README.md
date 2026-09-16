# Rise Extractor

Rise Extractor converts a published Rise Web ZIP into a private, editable working directory while preserving the original decoded Rise runtime data.

## Why it exists

The extractor creates two layers at the same time:

1. **Editable working files** for course, lesson, assessment, and asset data.
2. **Lossless source data** under `_source/` so early normalization work does not throw away information needed for future rebuilding.

The normalized structure is intentionally marked `draft-rise-informed` until Storyline output is inspected and the shared authoring-tool-neutral schema is finalized.

## Recommended confidentiality workflow

Run the extractor from the public `learning-experience-engine` repo, but write extracted proprietary course content to the separate local `learning-content-private` workspace.

Example:

```bash
node tools/rise-extractor/index.js \
  ../learning-content-private/references/rise-exports/pcn-rise-export.zip \
  --output ../learning-content-private/exports/pcn-rise-extracted
```

To copy media files into the extracted project too:

```bash
node tools/rise-extractor/index.js \
  ../learning-content-private/references/rise-exports/pcn-rise-export.zip \
  --output ../learning-content-private/exports/pcn-rise-extracted \
  --copy-assets
```

## Output

```text
pcn-rise-extracted/
├── course.json
├── source-manifest.json
├── assets.json
├── lessons/
│   └── *.json
├── assessments/
│   └── *.json
├── assets/                 # only when --copy-assets is used
└── _source/
    ├── runtime-data.decoded.json
    └── rise-config.json
```

### `course.json`

A readable course-level view with title, description, navigation, theme, export settings, and references to lesson/assessment files.

### `lessons/*.json`

One file per non-quiz Rise lesson or section. The original lesson object is retained under `_riseSource` while commonly useful fields are surfaced at the top level.

### `assessments/*.json`

One file per Rise quiz lesson, including the original question structures.

### `assets.json`

A manifest of real learning assets in the package. macOS ZIP metadata such as `__MACOSX`, `._*`, and `.DS_Store` is ignored.

### `_source/runtime-data.decoded.json`

The full decoded Rise runtime. This is the lossless reference used to compare extracted/normalized data and support future rebuilding.

## Important

Extracted course data may contain confidential or proprietary content. Do not write internal course output into this public repository.
