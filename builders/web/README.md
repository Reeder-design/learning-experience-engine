# Web Builder

Builds a standalone browser learning experience from Learning Experience Engine normalized JSON.

## Input

A normalized course folder containing:

- `course.json`
- `assets.json`
- `lessons/`
- `assessments/`

## Usage

```bash
npm run build-web -- <normalized-course-folder> --output <output-folder> [--theme <theme-id>]
```

Example:

```bash
npm run build-web -- ../learning-content-private/exports/pcn-rise-extracted/normalized --output ../learning-content-private/exports/pcn-web-preview --theme portfolio
```

`portfolio` is currently the default theme, so `--theme portfolio` is optional.

## Theme system

Themes live under `themes/<theme-id>/` and contain:

- `theme.json` — theme metadata and semantic icon mappings
- `theme.css` — visual tokens and component styling
- `icons.svg` — reusable SVG icon sprite
- `favicon.svg` — browser/course mark

The `portfolio` theme is aligned to Haley Reeder's portfolio design system: taupe, charcoal, pine-blue, mint-leaf, yellow-green, Montserrat/Open Sans typography, soft system-oriented geometry, purposeful motion, and the shared L&D icon library.

The renderer uses semantic icon keys such as `lesson`, `interaction`, `assessment`, and `multimedia`. This lets future themes replace the icon set without changing course content.

## Learner UX

Web Builder v0.2 adds:

- responsive desktop sidebar and mobile contents drawer
- active-unit highlighting
- visited-unit completion marks
- course progress indicator
- lesson/section/assessment icons
- themed course hero and visual system graphic
- next-unit navigation
- accessible tab keyboard controls
- accordion interaction affordances
- media/transcript cards
- polished media placeholders when assets are not copied
- reduced-motion support
- visible keyboard focus states

## Media

The builder checks for an `assets/` directory beside the `normalized/` directory, which is where the Rise Extractor writes assets when run with `--copy-assets`.

If media files are unavailable, the preview still builds and displays themed placeholders. This lets content and interaction development continue before duplicating large source media files.

## Current component support

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

This is a standalone web renderer. LMS packaging, scored assessment behavior, Rise Code Block packaging, and Storyline bridges are separate builder/component layers.
