# Learning Experience Engine

A reusable framework for building data-driven instructional design interactions, courses, simulations, and learning experiences.

## Project Goals

- Separate learning content from presentation, interaction logic, and authoring-tool implementation
- Build learning interactions from structured JSON
- Create reusable instructional design components
- Import published Rise and Storyline experiences into normalized engine models
- Author new interactions directly in the engine without requiring Rise or Storyline first
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

### Engine-native component authoring

New interactions can now be authored without importing an Articulate file.

- `schemas/component.schema.json` defines a compact authoring-tool-neutral component contract
- `builders/component-web/` renders component JSON into a standalone themed interaction
- `content/demos/components/` contains sanitized reusable examples
- `docs/component-studio/` provides the first browser authoring interface
- component completion dispatches a common `lx:component-complete` browser event for future course tracking/LMS integrations

Current engine-native component types:

- `carousel` — grouped content with paging, keyboard controls, and view-all completion
- `hotspot-reveal` — positioned exploration points with reveal content and viewed-state tracking
- `assessment` — single-select questions, immediate feedback, basic scoring, and completion
- `media-presentation` — ordered video/audio segments, transcripts, and media-end completion

### Reusable Storyline-derived stateful adapters

The stateful runtime can also automatically enhance recognized patterns imported from Storyline while retaining the generic renderer as a safe fallback:

- `carousel`
- `hotspot-reveal`
- `assessment-shell`
- `media-presentation`

### Component Studio

Component Studio is the first user-facing authoring UI for the Learning Experience Engine.

It currently supports:

- choosing an interaction type
- editing titles, descriptions, instructions, and component-specific content through form fields
- adding/removing carousel items, hotspots, questions/options, and media segments
- live browser preview
- generated engine JSON preview
- copying or exporting JSON for use in the component builder/private content workflows

When GitHub Pages is enabled from `/docs`, the Studio is available from the engine landing page.

### Shared engine systems

- Authoring-tool-neutral JSON schemas
- Asset manifests and stable asset references
- Theme system
- Portfolio-aligned theme and reusable SVG icon set
- Responsive layouts and keyboard-accessible interaction patterns
- Public/private content architecture
- GitHub Actions smoke tests for engine-native component builds and Studio/runtime syntax

## Repository Structure

- `components/` — reusable learning interactions and Storyline-derived stateful adapters
- `content/demos/` — public, sanitized engine-native demo content
- `content/examples/` — fictional examples and fixtures
- `schemas/` — document/block, stateful, and engine-native component schemas
- `themes/` — reusable visual systems
- `engine/` — shared rendering, tracking, asset, and validation logic as it develops
- `builders/web/` — document/block course web builder
- `builders/stateful-web/` — stateful experience web builder
- `builders/component-web/` — engine-native component web builder
- `tools/` — Rise/Storyline inspection, extraction, normalization, migration, and preview utilities
- `scripts/` — validation and automation scripts
- `docs/` — GitHub Pages landing page and Component Studio
- `tests/` — automated smoke/regression tests
- `dist/public/` — generated public-safe output

## Architecture

The engine currently supports three complementary learning models:

```text
Existing Rise / document-style learning
  → course
    → lessons / assessments
      → blocks

Existing Storyline / stateful learning
  → experience
    → scenes
      → slides
        → layers
          → objects / states / events / actions

New engine-native interaction
  → component
    → instructional content + behavior settings
```

The long-term direction is to make the third path the preferred authoring workflow for new reusable interactions, while the Rise and Storyline pipelines remain important for migration, conversion, reference analysis, and compatibility.

All models are intended to share themes, assets, assessment concepts, completion/tracking, and output builders wherever practical.

## Typical authoring workflow

```text
ChatGPT or Component Studio
          ↓
engine-native component JSON
          ↓
Learning Experience Engine
          ↓
themed browser preview
          ↓
future Web / Rise / Storyline / LMS outputs
```

For confidential work, the component JSON and assets remain in the sibling `learning-content-private/` workspace while reusable engine code stays public.

## Confidentiality

This is a public repository.

Confidential company, customer, and internal course content must remain outside this repository. Local confidential source material belongs in the separate sibling folder `learning-content-private/` and must never be committed here.

See `CONFIDENTIALITY.md` for project rules.

## Status

Active prototype / early engine development. The Rise and Storyline import pipelines, normalized schemas, themed web renderers, first reusable stateful adapters, engine-native component builder, Component Studio, and automated component smoke tests are functioning. Full Storyline animation fidelity, advanced assessment models, course composition UI, persistent authoring projects, LMS packaging, Rise Code Block output, Storyline Web Object output, xAPI/SCORM tracking, and public-safe validation are still under development.
