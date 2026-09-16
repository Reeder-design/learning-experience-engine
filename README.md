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

New interactions can be authored without importing an Articulate file.

- `schemas/component.schema.json` defines a compact authoring-tool-neutral component contract
- `builders/component-web/` renders component JSON into a standalone themed interaction
- `content/demos/components/` contains sanitized reusable examples
- `docs/component-studio/` provides browser authoring for reusable component patterns
- `docs/scenario-builder/` provides specialized browser authoring for branching decision simulations
- component completion dispatches a common `lx:component-complete` browser event for future course tracking/LMS integrations

Current engine-native component types:

- `carousel` — grouped content with paging, keyboard controls, and view-all completion
- `hotspot-reveal` — positioned exploration points with reveal content and viewed-state tracking
- `assessment` — single-select questions, immediate feedback, basic scoring, and completion
- `media-presentation` — ordered video/audio segments, transcripts, and media-end completion
- `branching-scenario` — decision nodes, learner choices, immediate coaching feedback, score changes, explicit branches/outcomes, replay, and outcome-based completion

### Reusable Storyline-derived stateful adapters

The stateful runtime can also automatically enhance recognized patterns imported from Storyline while retaining the generic renderer as a safe fallback:

- `carousel`
- `hotspot-reveal`
- `assessment-shell`
- `media-presentation`

### Component Studio

Component Studio is the browser authoring UI for compact reusable interactions.

Current UX flow:

```text
Choose interaction
→ Load project assets
→ Author
→ Preview
→ Export
```

It supports local project assets/source context, portable relative paths, live learner preview, generated JSON, JSON export, and portable project ZIP import/export.

### Course Composer

Course Composer assembles full learning experiences.

Current UX flow:

```text
Course basics
→ Upload project assets
→ Build course content
→ Preview
→ Export
```

The authoring canvas keeps all course sections visible/editable in one view rather than using a select-one/edit-elsewhere sidebar model. Current section types include text, image, video, resources, and imported engine-native components.

### Scenario Builder

Scenario Builder creates branching simulations and judgment-practice interactions.

Current UX flow:

```text
Scenario basics
→ Upload project assets
→ Build decisions
→ Preview
→ Export
```

Scenario Builder currently supports:

- one visible/editable authoring canvas for all decision nodes and outcomes
- decision nodes with title, speaker/role, situation text, and optional visuals
- learner choices with explicit target dropdowns
- immediate choice feedback
- optional decision-quality score changes
- multiple outcomes
- continuous path validation for duplicate IDs, missing destinations, unreachable content, and outcome reachability
- inline preview and focused preview
- replay and path-history review
- local assets/source context
- generated component JSON
- JSON export
- complete project ZIP import/export

The first scenario contract intentionally uses one simple decision-quality score. Arbitrary multi-variable conditions/state are not yet exposed in the v0.1 authoring UI.

### Shared engine systems

- Authoring-tool-neutral JSON schemas
- Asset manifests and stable asset references
- Theme system
- Portfolio-aligned theme and reusable SVG icon set
- Responsive layouts and keyboard-accessible interaction patterns
- Public/private content architecture
- GitHub Pages browser authoring apps
- GitHub Actions smoke/regression tests for builders, browser runtime syntax, static navigation, help alignment, and workflow UX rules

## Repository Structure

- `components/` — reusable learning interactions and Storyline-derived stateful adapters
- `content/demos/` — public, sanitized engine-native demo content
- `content/examples/` — fictional examples and fixtures
- `schemas/` — document/block, stateful, and engine-native component schemas
- `themes/` — reusable visual systems
- `engine/` — shared rendering, tracking, asset, and validation logic as it develops
- `builders/web/` — document/block course web builder
- `builders/stateful-web/` — stateful experience web builder
- `builders/component-web/` — engine-native component web builder, including branching-scenario runtime
- `tools/` — Rise/Storyline inspection, extraction, normalization, migration, and preview utilities
- `scripts/` — validation and automation scripts
- `docs/` — GitHub Pages landing page, Component Studio, Course Composer, Scenario Builder, and User Guides
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

## Typical authoring workflows

```text
Component Studio / Scenario Builder / ChatGPT
          ↓
engine-native component JSON
          ↓
Course Composer or component web builder
          ↓
themed browser preview
          ↓
future Web / Rise / Storyline / LMS outputs
```

For confidential work, component/course JSON and assets remain in the sibling `learning-content-private/` workspace while reusable engine code stays public.

## Confidentiality

This is a public repository.

Confidential company, customer, and internal course content must remain outside this repository. Local confidential source material belongs in the separate sibling folder `learning-content-private/` and must never be committed here.

See `CONFIDENTIALITY.md` for project rules.

## Status

Active prototype / early engine development. The Rise and Storyline import pipelines, normalized schemas, themed web renderers, first reusable stateful adapters, engine-native component builder, Component Studio, Course Composer, Scenario Builder v0.1, local project packaging, GitHub Pages authoring interfaces, and automated smoke/regression checks are functioning.

Still under development: richer scenario variables/conditions, direct authoring-tool handoffs, full Storyline animation fidelity, advanced assessment models, persistent cloud authoring projects, LMS packaging, Rise Code Block output, Storyline Web Object output, xAPI/SCORM tracking, Theme Manager, and comprehensive public-safe validation.
