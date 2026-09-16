# Learning Experience Engine

A reusable framework for building data-driven instructional design interactions, courses, simulations, and learning experiences.

## Project Goals

- Separate learning content from presentation, interaction logic, and authoring-tool implementation
- Build learning interactions from structured JSON
- Create reusable instructional design components
- Import published Rise and Storyline experiences into normalized engine models
- Render standalone themed web learning experiences without requiring the original authoring runtime
- Support future Rise Code Block, Storyline Web Object, LMS, SCORM, and xAPI workflows
- Support AI-assisted course development
- Maintain strict separation between public engine code and confidential learning content

## Current Capabilities

### Rise pipeline

- Inspect published Rise Web exports
- Extract course, lesson, assessment, and asset data
- Normalize Rise content into document/block learning schemas
- Build themed standalone web courses
- Render text, images, audio/video placeholders or media, tabs, accordions, assessments, navigation, and completion/progress behavior

### Storyline pipeline

- Inspect published Storyline Web exports
- Extract scenes, slides, layers, variables, assets, and published runtime data
- Normalize Storyline into a stateful experience model with scenes, slides, layers, objects, events, actions, and variables
- Build standalone responsive stateful web previews
- Execute core variable, condition, layer, object, navigation, timeline, and media behaviors
- Process a Storyline Web ZIP through extract → normalize → preview with the local preview pipeline

### Reusable stateful components

The stateful runtime can automatically enhance recognized interaction patterns while retaining the generic renderer as a safe fallback:

- `carousel` — accessible paged image carousel
- `hotspot-reveal` — map/diagram hotspot exploration with viewed-state tracking
- `assessment-shell` — question progress, score feedback, answer affordances, and feedback styling
- `media-presentation` — native video/audio playback and multi-segment media navigation

### Shared engine systems

- Authoring-tool-neutral JSON schemas
- Asset manifests and stable asset references
- Theme system
- Portfolio-aligned theme and reusable SVG icon set
- Responsive layouts and keyboard-accessible interaction patterns
- Public/private content architecture

## Repository Structure

- `components/` — reusable learning interactions and stateful adapters
- `content/demos/` — public, sanitized demo content
- `content/examples/` — fictional examples and fixtures
- `schemas/` — document/block and stateful learning schemas
- `themes/` — reusable visual systems
- `engine/` — shared rendering, tracking, asset, and validation logic as it develops
- `builders/` — web and stateful web output builders
- `tools/` — Rise/Storyline inspection, extraction, normalization, migration, and preview utilities
- `scripts/` — validation and automation scripts
- `docs/` — GitHub Pages documentation and demos
- `tests/` — automated tests as they are added
- `dist/public/` — generated public-safe output

## Architecture

The engine currently supports two complementary normalized learning models:

```text
Rise / document-style learning
  → course
    → lessons / assessments
      → blocks

Storyline / stateful learning
  → experience
    → scenes
      → slides
        → layers
          → objects / states / events / actions
```

Both models are intended to share themes, assets, reusable components, assessment concepts, tracking, and output builders wherever practical.

## Confidentiality

This is a public repository.

Confidential company, customer, and internal course content must remain outside this repository. Local confidential source material belongs in the separate sibling folder `learning-content-private/` and must never be committed here.

See `CONFIDENTIALITY.md` for project rules.

## Status

Active prototype / early engine development. The Rise and Storyline import pipelines, normalized schemas, themed web renderers, and first reusable stateful component adapters are functioning. Full Storyline animation fidelity, every proprietary trigger/player behavior, advanced assessment scoring, LMS packaging, Rise Code Block output, Storyline Web Object output, and public-safe validation are still under development.
