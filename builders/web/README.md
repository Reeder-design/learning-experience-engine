# Web Builder

Builds a standalone browser preview from Learning Experience Engine normalized JSON.

## Input

A normalized course folder containing:

- `course.json`
- `assets.json`
- `lessons/`
- `assessments/`

## Usage

```bash
npm run build-web -- <normalized-course-folder> --output <output-folder>
```

Example:

```bash
npm run build-web -- ../learning-content-private/exports/pcn-rise-extracted/normalized --output ../learning-content-private/exports/pcn-web-preview
```

## Media

The builder checks for an `assets/` directory beside the `normalized/` directory, which is where the Rise Extractor writes assets when run with `--copy-assets`.

If media files are unavailable, the preview still builds and displays placeholders. This lets the content/interaction pipeline be tested before duplicating large media files.

## v0.1 support

- course navigation
- sections and lessons
- text
- image galleries
- audio with transcript
- video
- accordion interactions
- tab interactions
- generic interaction fallback
- custom/embed fallback
- assessment review cards

This is a preview renderer, not yet a production LMS package or full Rise/Storyline rebuilder.
