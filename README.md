# Learning Experience Engine

A reusable framework and browser-first instructional-design workbench for building, reusing, and eventually converting courses, interactions, and simulations across authoring environments.

## Product principle

The engine can be technical underneath without requiring the instructional designer to think technically during normal authoring.

Normal browser workflow should answer:

```text
What do I want to make?
→ What source material do I have?
→ Build it
→ Preview it as a learner
→ Save and reuse it
```

Git, Node, schemas, JSON, internal IDs, and file paths remain available for advanced/debug/integration work but are intentionally not the default user experience.

## Project Goals

- Separate learning content from presentation, interaction logic, and authoring-tool implementation
- Create reusable instructional-design patterns instead of rebuilding common Rise/Storyline mechanics
- Import published Rise and Storyline experiences into normalized engine models
- Author new courses, interactions, and scenarios directly in the browser
- Keep technical project structure underneath a human-centered ID workflow
- Render standalone themed web learning experiences without requiring the original authoring runtime
- Support future reusable templates, direct builder-to-course handoffs, Rise Code Block, Storyline Web Object, LMS, SCORM, and xAPI workflows
- Support AI-assisted course development
- Maintain strict separation between public engine code and confidential learning content

## Current Capabilities

### Rise pipeline

- Inspect published Rise Web exports
- Extract course, lesson, assessment, and asset data
- Normalize Rise content into document/block learning schemas
- Build themed standalone web courses
- Render common text/media/interaction patterns, navigation, and completion/progress behavior

The pipeline works today. A human-facing guided **Reuse existing Rise content** browser workflow is still planned.

### Storyline pipeline

- Inspect published Storyline Web exports
- Extract scenes, slides, layers, variables, assets, and published runtime data
- Normalize Storyline into a stateful experience model
- Build standalone responsive stateful web previews
- Execute a useful subset of variable, condition, layer, object, navigation, timeline, and media behavior
- Process a Storyline Web ZIP through extract → normalize → preview

The pipeline works today. A human-facing guided **Reuse existing Storyline content** workflow is still planned.

### Engine-native interaction system

New interactions can be authored without importing an Articulate file.

- `schemas/component.schema.json` defines the underlying portable interaction contract
- `builders/component-web/` renders interaction data into standalone themed experiences
- `content/demos/components/` contains sanitized examples
- `docs/component-studio/` is the implementation path for the user-facing **Interaction Builder**
- `docs/scenario-builder/` provides specialized branching-scenario authoring
- completion dispatches a common `lx:component-complete` browser event for future course/LMS tracking

Current interaction types:

- `carousel`
- `hotspot-reveal`
- `assessment`
- `media-presentation`
- `branching-scenario`

### Reusable Storyline-derived stateful adapters

The stateful runtime can enhance recognized patterns imported from Storyline while retaining the generic renderer as a safe fallback:

- carousel
- hotspot reveal
- assessment shell
- media presentation

## Browser authoring workbench

The current public UX follows one shared convention: **source files before authoring, one visible editing canvas where practical, explicit learner preview, and Save & reuse as the final step.**

A shared `docs/assets/id-workbench.js` / `id-workbench.css` layer keeps human-facing terminology consistent while preserving technical engine fields underneath.

### Interaction Builder

Implementation path: `docs/component-studio/`

User-facing purpose: create compact reusable interactions based on what the learner needs to do.

```text
Choose
→ Source files & media
→ Build
→ Preview
→ Save & reuse
```

The first decision is learner behavior rather than implementation terminology:

- Browse or compare → Carousel
- Explore a visual → Hotspot
- Practice with a question → Knowledge check
- Watch or listen → Guided media

Internal item IDs and advanced project data are hidden during normal authoring but remain available when needed.

### Course Composer

Implementation path: `docs/course-composer/`

User-facing purpose: assemble the complete learner journey in one editable course canvas.

```text
Course basics
→ Source files & media
→ Build course
→ Preview
→ Save & reuse
```

Current content choices are presented in ID language:

- Text / explanation
- Image + explanation
- Video
- Job aid / resource
- Interaction

The whole course remains visible/editable in one canvas rather than using a select-one/edit-elsewhere sidebar model.

### Scenario Builder

Implementation path: `docs/scenario-builder/`

User-facing purpose: design branching practice as a simulation worksheet rather than a visible state machine.

```text
Scenario setup
→ Source files & media
→ Build decisions
→ Preview
→ Save & reuse
```

Authoring prompts now focus on instructional decisions:

- What is the learner practicing?
- What should the learner do?
- Who is speaking?
- What's happening?
- What does the learner know?
- What happens next?
- Coaching feedback
- Impact on score

Internal node/outcome IDs are hidden behind **Advanced fields**. Scoring is collapsed under **Optional scoring** so a scenario can be authored without configuring a score model first.

Current scenario capabilities include decision points, realistic learner choices, coaching feedback, optional score changes, multiple outcomes, path validation, inline/focused preview, replay/path history, local source files/media, and editable project packaging.

## Save & reuse direction

The browser tools currently support editable project downloads and structured interaction/course files. The next major product pass is a shared reusable-template system:

```text
Start blank
Start from template
Open saved project

...author...

Save editable project
Save as reusable template
Add to course
```

Direct Interaction Builder / Scenario Builder → Course Composer handoff is also planned so users no longer need to download and re-import the interaction file manually.

## Shared engine systems

- Authoring-tool-neutral schemas
- Asset manifests and portable references
- Theme system
- Responsive and keyboard-accessible patterns
- Public/private content architecture
- GitHub Pages browser authoring apps
- GitHub Actions smoke/regression checks
- Human-centered ID UX regression rules

## Repository Structure

- `components/` — reusable interactions and Storyline-derived adapters
- `content/demos/` — public sanitized demos
- `content/examples/` — fictional examples and fixtures
- `schemas/` — document/block, stateful, course, and interaction schemas
- `themes/` — reusable visual systems
- `engine/` — shared engine logic as it develops
- `builders/web/` — document/block course builder
- `builders/stateful-web/` — stateful experience builder
- `builders/component-web/` — engine-native interaction builder/runtime
- `tools/` — Rise/Storyline inspection, extraction, normalization, migration, and preview utilities
- `docs/` — GitHub Pages workbench, authoring apps, and guides
- `docs/assets/id-workbench.*` — shared ID-facing vocabulary/progressive-disclosure layer
- `tests/` — automated smoke/regression tests
- `dist/public/` — generated public-safe output

## Architecture

The engine supports three complementary learning models:

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

New reusable interaction
  → component
    → instructional content + behavior settings
```

The technical models remain distinct where necessary. The browser workbench hides that distinction during normal instructional-design tasks wherever possible.

## Confidentiality

This is a public repository.

Confidential company, customer, and internal course content must remain outside this repository. Local confidential source material belongs in the separate sibling `learning-content-private/` workspace and must never be committed here.

See `CONFIDENTIALITY.md` for project rules.

## Status

Active prototype / early product development. The Rise and Storyline import pipelines, normalized schemas, themed web renderers, reusable adapters, engine-native interaction builder, Interaction Builder, Course Composer, Scenario Builder v0.1, local project packaging, human-centered ID UX layer, GitHub Pages authoring interfaces, and automated smoke/regression checks are functioning.

Next major product milestone: **Reusable Template System**, followed by direct builder-to-course handoffs and the guided Rise/Storyline reuse workflow.

Still under development: richer scenario variables/conditions, full Storyline animation fidelity, advanced assessment models, persistent cloud projects, LMS packaging, Rise Code Block output, Storyline Web Object output, xAPI/SCORM tracking, Theme Manager, and comprehensive public-safe validation.
