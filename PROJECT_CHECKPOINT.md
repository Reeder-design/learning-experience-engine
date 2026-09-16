# Learning Experience Engine — Project Checkpoint

**Checkpoint date:** September 16, 2026  
**Repository:** `Reeder-design/learning-experience-engine`  
**Primary public site:** `https://reeder-design.github.io/learning-experience-engine/`

This file is the portable project handoff for the Learning Experience Engine. It is intentionally sanitized for a public repository and should be sufficient to restart development in a new ChatGPT conversation without depending on prior chat history.

---

## 1. Product vision

Learning Experience Engine is a reusable browser-first authoring/compiler system for creating modern learning experiences outside the constraints of a single authoring tool.

North-star workflow:

```text
Tell ChatGPT what learning experience you want
        ↓
Author / assemble it in the browser
        ↓
Preview the learner experience
        ↓
Export or publish to the required destination
```

The engine separates:

1. structured learning content/data
2. reusable interactions and simulations
3. themes/design systems
4. builders/export pipelines

Long-term target:

```text
ChatGPT / browser authoring
        ↓
structured engine JSON
        ↓
Learning Experience Engine
        ↓
Web / portfolio / LMS / Rise / Storyline-supporting outputs
```

JSON is the engine language, not the normal user interface.

---

## 2. Core workflow and UX principles

The interface should follow how an instructional designer thinks about the work, not expose repository architecture.

Current UX rules:

> Controls should appear where they are needed in the authoring workflow. Global headers should contain only application-level navigation or project-level controls.

> Load assets before fields that depend on those assets so paths can be suggested or filled automatically.

> Authoring canvases should keep related content visible together rather than forcing users to select an item in one area and edit it somewhere else.

Normal use should not require knowledge of Git, JSON, Node, HTML structure, or file paths.

### Division of labor

```text
USER
• provides desired learning experience / source content
• visually reviews finished experiences
• handles local-only confidential files when physically necessary

CHATGPT
• designs architecture and interactions
• edits public GitHub code directly
• debugs and tests
• runs GitHub CI checks
• keeps public engine generic/sanitized

USER only when necessary
• git pull
• run one final local command for private local processing
```

Avoid asking the user to run repeated diagnostic commands or paste intermediary logs when the public repo can be inspected or edited directly.

---

## 3. Public vs. private architecture

### Public repository

Safe for:
- reusable engine code
- schemas
- generic components
- generic/sanitized demos
- browser authoring interfaces
- public themes
- public documentation

### Private local workspace

Used for:
- confidential course content
- company/customer source files
- Articulate exports
- private assets
- private normalized JSON
- private previews/builds

Typical private sibling folder:

```text
learning-content-private/
├── courses/
├── assets/
├── references/
│   ├── rise-exports/
│   └── storyline-exports/
├── exports/
└── scratch/
```

Confidential files must never be committed to the public engine repository.

The GitHub Pages authoring apps can read explicitly selected local files for preview/package creation without uploading those files to GitHub simply because the app itself is publicly hosted.

---

## 4. Current engine models

Three related models remain conceptually distinct.

### Rise/document model

```text
course
→ lessons / assessments
→ blocks
```

### Storyline/stateful model

```text
experience
→ scenes
→ slides
→ layers
→ objects
→ states
→ events
→ actions
→ variables
```

### Engine-native component model

```text
component
→ instructional content
→ behavior settings
→ completion rules
```

Do not force Storyline content into the Rise schema. New custom interactions should increasingly use the engine-native component contract.

---

## 5. Major implemented systems

### Rise import pipeline

Implemented:
- `tools/rise-inspector/`
- `tools/rise-extractor/`
- `tools/rise-normalizer/`
- `builders/web/`

The Rise pipeline can inspect a Rise Web export, extract course data, normalize it, and build a themed web experience.

The web builder supports common text/media/interactions, navigation, progress/completion, and responsive rendering. Advanced assessment scoring is not complete.

### Storyline reverse-engineering pipeline

Implemented:
- `tools/storyline-inspector/`
- `tools/storyline-extractor/`
- `tools/storyline-normalizer/`
- `tools/storyline-preview/`
- `builders/stateful-web/`

The stateful runtime supports a useful prototype subset of scenes/slides, layers, positioned objects, variables, conditions, show/hide, basic states, action groups, navigation, URLs, media, pointer events, and timelines.

Do **not** claim pixel-perfect Storyline parity or complete Storyline feature coverage.

### Storyline-derived reusable adapters

Current adapters:
- carousel
- hotspot reveal
- assessment shell
- media presentation

These are compatibility/reuse patterns. New authoring should prefer the engine-native contract when possible.

---

## 6. Engine-native component system

### Schema

`schemas/component.schema.json`

Current component types:
- `carousel`
- `hotspot-reveal`
- `assessment`
- `media-presentation`
- `branching-scenario`

Shared concepts:
- schema version
- ID/title/type
- description/instruction
- theme
- completion strategy
- structured content
- metadata

### Component Web Builder

`builders/component-web/`

Example:

```bash
npm run build-component -- content/demos/components/carousel.json \
  --output dist/component-carousel \
  --theme portfolio
```

It produces a standalone themed interaction, resolves local referenced assets, adds theme/runtime files, and writes a sanitized build manifest.

### Shared completion

Engine-native components dispatch:

```text
lx:component-complete
```

for future course/LMS tracking integrations.

### Generic demos

Stored in:

```text
content/demos/components/
```

Current public demos include carousel, hotspot, assessment, media presentation, and branching scenario examples.

---

## 7. Component Studio

Public path:

```text
docs/component-studio/
```

Public URL:

`https://reeder-design.github.io/learning-experience-engine/component-studio/`

Purpose: browser-first authoring for compact reusable interactions.

### UX flow

```text
1. Choose interaction
2. Load project assets
3. Author
4. Preview
5. Export
```

Assets intentionally come before authoring fields.

### Current capabilities

- carousel / hotspot / assessment / media presentation authoring
- local project asset library
- project-folder import
- individual-file import
- automatic asset classification
- portable relative paths
- local image/video/audio preview
- source-context file reading
- VTT matching support for local media preview
- compatible-path auto-fill
- generated JSON
- copy JSON
- export JSON
- import/export project ZIP
- contextual help
- dedicated User Guide
- explicit Preview and Export actions

### Package

```text
component-project.zip
├── component.json
├── context/
└── assets/
```

Never store absolute local machine paths in component JSON.

---

## 8. Course Composer

Public path:

```text
docs/course-composer/
```

Purpose: assemble multiple learning sections and reusable components into one complete course.

### UX flow

```text
1. Course basics
2. Upload project assets
3. Build course content
4. Preview
5. Export
```

### Major UX decision

Do **not** return to the old select-on-left/edit-elsewhere sidebar model.

Course Composer uses a **single authoring canvas** where all course sections are visible and editable in one view.

Each section card supports direct editing, reordering, move up/down, duplicate, and delete.

### Current content types

- text
- image
- video
- resource/document
- imported engine-native component

### Current capabilities

- course metadata
- audience/objectives
- shared project assets and source context
- media/resource path auto-fill when possible
- all course content in one editing canvas
- component JSON import
- learner preview
- Previous/Next navigation
- focused/full preview
- autosave
- undo/redo
- generated course JSON
- JSON export
- project ZIP import/export

### Package

```text
course-project.zip
├── course.json
├── context/
└── assets/
```

### Current component handoff

```text
Component Studio or Scenario Builder
→ Export component JSON
→ Course Composer
→ Add Component
→ Import component JSON
```

Direct browser-to-browser **Add to Course** handoff is not yet implemented.

---

## 9. Scenario Builder v0.1

Public path:

```text
docs/scenario-builder/
```

Purpose: author branching decision practice and customer-conversation simulations as engine-native components.

### UX flow

```text
1. Scenario basics
2. Upload project assets
3. Build decisions
4. Preview
5. Export
```

Scenario Builder follows the same asset-first, single-canvas, explicit-preview/export conventions as the other authoring apps.

### Engine contract

Component type:

```text
branching-scenario
```

Completion strategy:

```text
reach-outcome
```

Conceptual structure:

```text
scenario
├── start node
├── optional decision-quality score
├── decision nodes
│   └── learner choices
│       ├── immediate feedback
│       ├── score delta
│       └── target node/outcome
└── outcomes
```

### Current authoring capabilities

- scenario title/description/instruction
- optional decision-quality score
- score label/start/min/max/show-to-learner settings
- selectable start node
- local project assets and source context
- node/outcome visual selectors using asset paths
- unused-image auto-assignment for newly created cards when possible
- all decision nodes visible/editable in one canvas
- all outcomes visible/editable in one canvas
- add / move / duplicate / delete nodes and outcomes
- learner choices with text, score delta, feedback, and branch target
- branch-target **dropdowns** rather than manually typed IDs
- automatic reference updates when node/outcome IDs are renamed
- continuous path validation
- inline learner preview
- focused learner preview
- score changes
- immediate coaching feedback
- path-history review
- outcome screens
- replay/reset
- generated JSON
- copy/export JSON
- complete project ZIP import/export
- contextual help and dedicated User Guide

### Path Check

Blocking issues include:
- missing IDs
- duplicate IDs
- missing start node
- no outcome
- decision node with no choices
- missing choice destination
- no outcome reachable from the start node

Warnings include unreachable nodes/outcomes.

### Learner runtime

Standalone branching runtime:

```text
builders/component-web/scenario-runtime.js
```

Styles:

```text
builders/component-web/scenario.css
```

The component builder validates scenario branches and creates standalone scenario interactions.

When an outcome is reached, the shared completion event includes outcome ID, final score, and learner path history.

### Public demo

```text
content/demos/components/branching-scenario.json
```

The demo is generic/sanitized customer-discovery practice.

### Deliberate v0.1 limitation

Scenario Builder currently exposes **one simple decision-quality score**.

It does **not** yet expose arbitrary variables, multi-dimensional state, conditional visibility, or advanced rules such as trust/urgency/stakeholder state. Add those only when an instructional simulation requires them; do not turn the default interface into a programming/state-machine tool.

### Course Composer integration limitation

Course Composer can import a `branching-scenario` component JSON today.

However, the **rich interactive scenario learner runtime is currently available in Scenario Builder and standalone component-web output**. Course Composer's embedded component preview does not yet reproduce the complete interactive scenario runtime and currently falls back to the generic component preview for this new type.

Do not claim full rich Scenario Builder → Composer preview integration until this is implemented.

### Package

```text
scenario-project.zip
├── component.json
├── context/
└── assets/
```

---

## 10. Preview and export UX standard

Preview and Export are separate workflow steps.

Do not make users infer that an adjacent pane is automatically the preview or that header buttons are the only way to export.

### Preview actions should be obvious

Examples:
- Preview from beginning
- Review interaction
- Refresh preview
- Open focused/full preview

### Export actions should be obvious

Examples:
- Copy JSON
- Export JSON
- Export project ZIP
- View generated JSON

Carry this convention forward into future tools.

---

## 11. Asset workflow standard

Assets should be loaded **before fields that depend on them**.

Recommended structure:

```text
project/
├── context/
├── assets/
│   ├── images/
│   ├── video/
│   ├── audio/
│   ├── captions/
│   └── documents/
└── component.json or course.json
```

Folders are recommended but not mandatory. Browser tools can classify loose files by extension.

Normal authoring should use folders directly. ZIP is primarily for portability, backup, reopening, and transfer.

---

## 12. Navigation/help UX standard

All public static-site internal navigation must work both:
- on GitHub Pages
- when opening `index.html` directly from a local filesystem

Use explicit HTML targets such as:

```text
../user-guide/index.html
```

rather than directory-only URLs.

Help bubbles use centered `?` marks with flex centering and should link to the relevant User Guide page/section.

Current app family:

```text
Engine Home
↕
Course Composer
↕
Scenario Builder
↕
Component Studio
↕
User Guide
```

The Learning Experience Engine has its own favicon, separate from other portfolio/library projects.

---

## 13. GitHub Pages and CI

GitHub Pages is enabled from:

```text
main → /docs
```

Public site:

`https://reeder-design.github.io/learning-experience-engine/`

Automated checks currently cover:
- shared/component runtime JavaScript syntax
- branching-scenario runtime syntax
- Component Studio scripts
- Course Composer scripts
- Scenario Builder scripts
- static navigation rules
- help-bubble alignment rules
- authoring workflow order
- required workflow actions
- component-builder smoke tests
- branching-scenario demo build

Latest Scenario Builder v0.1 CI status at this checkpoint: **green**.

---

## 14. Theme

Current public theme:

- Taupe `#4A4238`
- Charcoal `#4D5359`
- Pine-Blue `#508484`
- Mint `#79C99E`
- Yellow-Green `#97DB4F`
- Montserrat + Open Sans

Theme files:

```text
themes/portfolio/
```

Long-term Theme Manager should separate styling from content so private corporate branding can be applied without entering the public repository.

---

## 15. Important accuracy limits

Do not claim these are finished:
- full Storyline animation fidelity
- pixel-perfect Storyline reconstruction
- complete native Storyline quiz support
- complete custom variable-driven Storyline assessment scoring
- arbitrary Scenario Builder state/conditions
- rich interactive scenario runtime inside Course Composer preview
- direct Studio/Scenario Builder → Composer handoff
- Rise Code Block output
- Storyline Web Object export
- SCORM/xAPI packaging
- Docebo deployment
- universal Storyline classifier accuracy
- persistent cloud authoring projects

Implemented/prototype-ready claims are safe for:
- Rise import/normalize pipeline
- Storyline import/normalize pipeline
- prototype stateful web runtime
- first Storyline-derived component adapters
- engine-native component schema/runtime/builder
- Component Studio browser authoring
- Course Composer browser authoring
- Scenario Builder v0.1 browser authoring
- branching-scenario learner runtime
- local project asset/package workflows
- browser preview
- GitHub CI regression/smoke checks

---

## 16. Current repository shape

Approximate important structure:

```text
learning-experience-engine/
├── components/
│   └── stateful/
├── content/
│   ├── demos/components/
│   └── examples/
├── schemas/
│   ├── course.schema.json
│   └── component.schema.json
├── themes/
│   ├── default/
│   └── portfolio/
├── builders/
│   ├── web/
│   ├── stateful-web/
│   └── component-web/
│       ├── index.js
│       ├── runtime.js
│       ├── scenario-runtime.js
│       ├── component.css
│       └── scenario.css
├── tools/
│   ├── rise-inspector/
│   ├── rise-extractor/
│   ├── rise-normalizer/
│   ├── storyline-inspector/
│   ├── storyline-extractor/
│   ├── storyline-normalizer/
│   └── storyline-preview/
├── docs/
│   ├── index.html
│   ├── assets/
│   ├── component-studio/
│   ├── course-composer/
│   ├── scenario-builder/
│   └── user-guide/
├── tests/
├── .github/workflows/
├── README.md
├── CONFIDENTIALITY.md
├── PROJECT_CHECKPOINT.md
└── package.json
```

---

## 17. Current next steps

Scenario Builder v0.1 is implemented. Do **not** restart it from scratch.

Immediate next action should be **visual/user-flow QA of Scenario Builder**.

Recommended QA path:

```text
1. Open Scenario Builder
2. Edit scenario basics
3. Load a few images + source-context files
4. Add a decision node
5. Confirm image auto-assignment / selector behavior
6. Add/edit learner choices
7. Choose branch targets from dropdowns
8. Watch Path Check
9. Preview from beginning
10. Test alternate branches
11. Open focused preview
12. Export JSON
13. Export/reopen project ZIP
```

After QA, likely next milestones are:

1. polish Scenario Builder UX based on real authoring feedback
2. add rich `branching-scenario` preview/runtime inside Course Composer
3. direct Component Studio / Scenario Builder → Course Composer handoff
4. richer scenario state/conditions only where real simulations require them
5. richer course content/composition patterns
6. Theme Manager
7. project dashboard/recent projects/persistent local project workflows
8. future LMS/export targets

---

## 18. Restart instructions for a new ChatGPT conversation

If conversation context is lost, tell ChatGPT:

> We are continuing development of `Reeder-design/learning-experience-engine`. Read `PROJECT_CHECKPOINT.md` in the repo first and inspect the current repo before editing because development may have advanced since the checkpoint. Use GitHub directly for public repo work. Keep confidential source content local/private. Do not make me run repeated terminal diagnostics. Component Studio, Course Composer, and Scenario Builder v0.1 are implemented with asset-first workflows, explicit Preview/Export steps, and single-canvas authoring where appropriate. `branching-scenario` is now an engine-native component type with a standalone learner runtime. CI was green at the checkpoint. The immediate next step is Scenario Builder visual/user-flow QA; Course Composer rich scenario preview and direct builder-to-composer handoff remain future work.
