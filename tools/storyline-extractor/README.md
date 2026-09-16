# Storyline Extractor

Extracts readable, private reference JSON from an Articulate Storyline **Publish → Web** ZIP.

The extractor is intentionally source-preserving. It does not try to normalize Storyline interaction logic into the Learning Experience Engine schema yet.

## Usage

```bash
npm run extract-storyline -- <storyline-web.zip> --output <folder>
```

Example:

```bash
npm run extract-storyline -- ../learning-content-private/references/storyline-exports/sample.zip --output ../learning-content-private/exports/sample-storyline-extracted
```

## Output

```text
storyline-extracted/
├── project.json
├── variables.json
├── assets.json
├── source-manifest.json
├── scenes/
├── slides/
└── _source/
    ├── data.decoded.json
    ├── meta.xml
    ├── frame.xml
    ├── triggers.js
    └── user.js
```

Each real Storyline scene gets a scene manifest. Each slide whose published HTML5 data can be decoded gets its own JSON file under `slides/`.

## Why source-preserving first?

Storyline interactions can be composed from layers, object states, variables, conditions, triggers, native quiz interactions, media, and custom JavaScript. The extractor preserves those published structures before any normalization step so the Learning Experience Engine can compare multiple real Storyline patterns without losing authoring logic.

## Confidentiality

Use the extractor against ZIPs stored in `learning-content-private/` and write extracted output there as well. Do not commit extracted company or client content to the public engine repository.
