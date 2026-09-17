# Learning Experience Engine

A reusable instructional-design engine evolving into an **AI-assisted Learning Project Workbench** for creating, transforming, previewing, sanitizing, rebranding, templating, and reusing learning experiences from source material or existing projects.

## Product north star

The primary user should not need to rebuild common Rise/Storyline patterns or work directly with JSON.

```text
source content / files / existing project / saved template
        ↓
Learning Project Workbench
        ↓
editable populated project + learner preview
        ↓
AI transformations + manual fine-tuning
        ↓
save / reuse / export / template
```

The technical engine remains underneath for schema validation, rendering, asset handling, branch integrity, themes, and future publishing targets.

## Learning Project Workbench v0.1

Public path:

```text
docs/workbench/
```

The Workbench is now the primary product surface. The first supported project type is `branching-scenario` so the source → project → edit → preview workflow can be proven with a complete interaction model before expanding to other formats.

Current workflow:

```text
Start from template / Start simple / Open existing JSON
        ↓
Source
        ↓
Edit populated fields
        ↓
Preview as learner
        ↓
AI actions
        ↓
Save & reuse
```

Implemented in v0.1:

- three built-in source template projects: customer discovery, decision practice, and objection handling
- existing Engine `branching-scenario` JSON → editable project reconstruction
- local source-file and source-folder intake
- readable TXT/MD/CSV/JSON reference content
- local image assets available inside scenario image selectors and learner preview
- one-canvas editable decision points, responses, coaching feedback, destinations, and outcomes
- hidden Advanced internal IDs
- continuous flow validation
- interactive learner preview
- local autosave
- scenario JSON download
- visible AI transformation workspace with presets for sanitize, rebrand, audience adaptation, and create-similar workflows
- secure AI execution intentionally disabled until the server-side API layer is connected

The AI UI is deliberately present now so the project architecture is designed around transformation rather than adding AI as an afterthought.

## Specialized editors

These remain useful but are now treated as fine-tuning tools underneath the Workbench.

### Scenario Builder

`docs/scenario-builder/`

Fine-tunes branching decisions, coaching feedback, optional scoring, outcomes, branch validation, source media, and scenario-specific preview behavior.

### Interaction Builder

Implementation path remains `docs/component-studio/` for compatibility.

Builds/fine-tunes reusable:

- carousel
- visual exploration / hotspot reveal
- knowledge check
- guided media

### Course Composer

`docs/course-composer/`

Provides a manual full-course editing canvas. It remains available, but expanding Rise-like block authoring is not the immediate product priority.

## Existing import foundations

### Rise

Implemented:

```text
tools/rise-inspector/
tools/rise-extractor/
tools/rise-normalizer/
builders/web/
```

The technical pipeline can inspect, extract, normalize, and render published Rise Web exports. A human-facing Workbench import flow is planned after the source/template/AI transformation model is proven.

### Storyline

Implemented:

```text
tools/storyline-inspector/
tools/storyline-extractor/
tools/storyline-normalizer/
tools/storyline-preview/
builders/stateful-web/
```

The prototype stateful runtime supports useful subsets of scenes, slides, layers, objects, variables, conditions, actions, navigation, media, and timelines. Storyline-derived adapters include carousel, hotspot reveal, assessment shell, and media presentation.

Do not claim pixel-perfect Storyline reconstruction or full Storyline parity.

## Engine-native interaction system

Schema:

```text
schemas/component.schema.json
```

Current types:

- `carousel`
- `hotspot-reveal`
- `assessment`
- `media-presentation`
- `branching-scenario`

Standalone builder:

```text
builders/component-web/
```

Shared completion event:

```text
lx:component-complete
```

## Human-centered UX rules

Normal instructional-design work should not require knowledge of Git, Node, schemas, internal IDs, or file paths.

Shared ID-facing layer:

```text
docs/assets/id-workbench.css
docs/assets/id-workbench.js
```

Preferred language:

```text
Source files & media
Editable fields
Preview / Preview as learner
Coaching feedback
What happens next?
Save & reuse
Advanced project data
```

## AI architecture — next implementation layer

Do **not** place an OpenAI API key in GitHub Pages JavaScript.

Target architecture:

```text
Browser Workbench
        ↓
secure backend / serverless API route
        ↓
OpenAI API
        ↓
structured project response
        ↓
schema + flow validation
        ↓
editable Workbench project + preview
```

Initial AI actions:

- source materials → populated branching scenario
- sanitize internal/confidential content for public-safe reuse
- rebrand using a saved theme
- adapt for another learner audience
- create a similar project using a source project as the structural template
- rewrite coaching feedback / distractors / examples while preserving interaction logic

## Next product milestones

1. **Secure AI generation/transformation layer** for Workbench scenarios.
2. **Source Template Library** with complete reusable project structures rather than only block-level templates.
3. **Theme Library** separated from project content/interaction structure.
4. **Editable project packaging** that preserves source instructions, assets, project JSON, and template metadata together.
5. Guided Workbench reuse flows for existing Rise and Storyline exports.
6. Expand the Workbench beyond branching scenarios to other interaction/course project types.

## Public/private boundary

This is a public repository.

Reusable code, schemas, generic templates, themes, demos, and documentation are public-safe. Confidential company/customer content, Articulate exports, source documents, private assets, and private generated projects belong outside this repository in the sibling `learning-content-private/` workspace.

## Status

Active prototype / early product development.

Workbench v0.1, Scenario Builder, Interaction Builder, Course Composer, Rise/Storyline import foundations, engine-native component rendering, local asset workflows, and automated syntax/navigation/smoke regression checks are functioning.

Still future work includes the secure AI API connection, reusable source-template library, theme library, guided Rise/Storyline Workbench import, richer scenario state, persistent cloud projects, LMS/SCORM/xAPI packaging, Rise Code Block output, Storyline Web Object output, and direct deployment integrations.
