# Storyline Preview Pipeline

Runs the full private Storyline workflow in one command:

1. Extract published Storyline Web data.
2. Normalize it into the Learning Experience Engine stateful schema.
3. Copy referenced published assets from the ZIP.
4. Build a standalone browser preview with the stateful runtime.

## Usage

```bash
npm run preview-storyline -- "../learning-content-private/references/storyline-exports/Image Carousel.zip" \
  --output ../learning-content-private/exports/image-carousel-preview \
  --theme portfolio \
  --open
```

The output folder contains the browser preview plus private `_extracted/` and `_normalized/` working layers so source fidelity is preserved.

This pipeline is intentionally local/private for proprietary course content. Only generic engine code belongs in the public repository.
