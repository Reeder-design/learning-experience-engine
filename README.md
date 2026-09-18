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

## Learning Project Workbench v0.2 candidate

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

Implemented in the current v0.2 candidate:

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
- AI generation from source outline/reference material in private local mode
- AI transformation presets for sanitize, audience adaptation, and create-similar workflows
- freeform AI project transformation
- strict structured-output contract for branching-scenario projects
- branch/reference validation before AI output is applied
- one-pass repair attempt when generated branch references fail validation
- Undo AI change in the Workbench
- password-protected private local Workbench with signed 8-hour sessions, HttpOnly/SameSite cookies, CSRF protection, and login throttling
- first-run secure setup for Workbench password + optional OpenAI API key
- Private settings for API-key rotation, model choice, and password changes

The public GitHub Pages site remains a public-safe demo/manual authoring surface. Private source material and AI actions belong in the local password-protected Workbench.

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

### Course Builder

Implementation path remains:

```text
docs/course-composer/
```

Course Builder provides a manual full-course editing canvas. It remains available, but expanding Rise-like block authoring is not the immediate product priority.

## App naming contract

User-facing product names and implementation identifiers are intentionally separate. Display names can evolve without renaming stable routes, storage keys, schemas, or integration references.

Canonical registry:

```text
docs/assets/app-registry.js
```

Current contract:

| Internal ID / route | Public display name |
| --- | --- |
| `workbench` | Learning Project Workbench |
| `component-studio` | Interaction Builder |
| `scenario-builder` | Scenario Builder |
| `course-composer` | Course Builder |

Rules:

- normal UI and guides use the public display name
- implementation paths and internal identifiers stay stable unless a deliberate migration is planned
- do not create duplicate alias folders such as `course-builder/` just to match a display name
- legacy display names may exist only as migration metadata in the registry, not in normal public HTML
- CI scans public HTML for naming regressions and validates the registry

This avoids breaking saved links, local projects, tests, and future integrations when a user-facing label changes.

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

## Favicon / browser identity rule

Every public HTML page under `docs/` must explicitly include the Engine SVG favicon plus ICO fallback and Safari mask icon metadata. `docs/favicon.ico` remains the site-level fallback.

The docs regression test discovers `docs/**/*.html` automatically, so new pages fail CI if favicon metadata is omitted.

## Private AI architecture

Do **not** place an OpenAI API key in GitHub Pages JavaScript.

Current architecture:

```text
npm run workbench
        ↓
password-protected localhost server (127.0.0.1)
        ↓
source/current project
        ↓
local authenticated API route + CSRF check
        ↓
OpenAI Responses API (store: false)
        ↓
strict structured scenario output
        ↓
branch/reference validation
        ↓
editable Workbench project + preview
```

On first local launch, the browser creates the Workbench password and optionally accepts the separate OpenAI API key. Secrets are written only to Git-ignored `.env.workbench`; the plaintext password is never stored.

Run locally with:

```bash
npm run workbench
```

Current AI actions:

- source materials → populated branching scenario
- sanitize internal/confidential content for public-safe reuse
- adapt for another learner audience
- create a similar project using a source project as the structural template
- freeform project rewriting while preserving interaction logic

Theme-based rebranding remains visible in the product direction but becomes fully useful after the Theme Library is implemented.

## Next product milestones

1. **Source Template Library** with complete reusable project structures rather than only block-level templates.
2. **Theme Library** separated from project content/interaction structure.
3. **Editable project packaging** that preserves source instructions, assets, project JSON, and template metadata together.
4. Guided Workbench reuse flows for existing Rise and Storyline exports.
5. Expand the Workbench beyond branching scenarios to other interaction/course project types.

## Public/private boundary

This is a public repository.

Reusable code, schemas, generic templates, themes, demos, and documentation are public-safe. Confidential company/customer content, Articulate exports, source documents, private assets, and private generated projects belong outside this repository in the sibling `learning-content-private/` workspace.

## Status

Active prototype / early product development.

Workbench v0.2 candidate, password-protected local AI generation/transformation, Scenario Builder, Interaction Builder, Course Builder, Rise/Storyline import foundations, engine-native component rendering, local asset workflows, and automated syntax/navigation/security/mock-AI/smoke regression checks are functioning on the feature branch.

Still future work includes the reusable source-template library, theme library, richer project packaging, guided Rise/Storyline Workbench import, richer scenario state, persistent cloud projects, LMS/SCORM/xAPI packaging, Rise Code Block output, Storyline Web Object output, and direct deployment integrations.
