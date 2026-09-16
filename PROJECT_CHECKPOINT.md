# Learning Experience Engine — Project Checkpoint

**Checkpoint date:** September 16, 2026  
**Repository:** `Reeder-design/learning-experience-engine`  
**Primary public site:** `https://reeder-design.github.io/learning-experience-engine/`

This file is a portable project handoff. It is intentionally sanitized for a public repository and should be sufficient to restart development in a new ChatGPT conversation without relying on prior chat history.

---

## 1. Product vision

Learning Experience Engine is a reusable authoring/compiler system for creating modern learning experiences outside the constraints of a single authoring tool.

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
2. reusable interaction components
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

Current UX rule:

> Controls should appear where they are needed in the authoring workflow. Global headers should contain only application-level navigation or project-level controls.

Normal user workflow should not require knowledge of Git, JSON, Node, HTML structure, or file paths.

### Division of labor

Default collaboration workflow:

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

Avoid asking the user to run repeated diagnostic commands or paste intermediary logs when the public repo can be inspected/edited directly.

---

## 3. Public vs. private architecture

### Public repository

Safe for:
- reusable engine code
- schemas
- generic components
- generic/sanitized demos
- browser authoring interfaces
- themes that contain no confidential company branding/content

### Private local workspace

Used for:
- confidential course content
- company/customer source files
- Articulate exports
- private assets
- private normalized JSON
- private previews/builds

Typical private sibling folder name:

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

The browser tools can read explicitly selected local files for preview/package creation without uploading those files to GitHub simply because the app is hosted on GitHub Pages.

---

## 4. Current engine models

Three related models exist and should remain conceptually distinct.

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

Implemented tools:
- `tools/rise-inspector/`
- `tools/rise-extractor/`
- `tools/rise-normalizer/`
- `builders/web/`

The Rise pipeline can inspect a Rise Web export, extract course data, normalize it, and build a themed web experience.

The normalizer handles HTML-heavy text, media references, asset IDs, metadata, and normalized block structures.

The web builder supports common text/media/interactions, navigation, progress/completion, and responsive rendering. Advanced assessment scoring is not complete.

### Storyline reverse-engineering pipeline

Implemented tools:
- `tools/storyline-inspector/`
- `tools/storyline-extractor/`
- `tools/storyline-normalizer/`
- `tools/storyline-preview/`
- `builders/stateful-web/`

The pipeline has been informed by multiple published Storyline Web specimens covering:
- hotspot/layer interactions
- media presentations
- multi-scene course structures
- image carousel logic
- variable-driven practical assessment logic

Stateful runtime supports scenes/slides, layers, positioned/nested objects, variables, conditions, show/hide, basic states, action groups, navigation, URLs, basic media, pointer events, timelines, and debugging.

Do **not** claim pixel-perfect Storyline parity or complete Storyline feature coverage.

### Storyline-derived reusable component adapters

Current reusable stateful adapters include:
- carousel
- hotspot reveal
- assessment shell
- media presentation

These are useful compatibility/reuse patterns, but new authoring should prefer the engine-native component contract when possible.

---

## 6. Engine-native component system

### Schema

`schemas/component.schema.json`

Current component types:
- `carousel`
- `hotspot-reveal`
- `assessment`
- `media-presentation`

Shared concepts include:
- schema version
- ID/title/type
- description/instruction
- theme
- completion strategy
- structured content
- metadata

### Component Web Builder

`builders/component-web/`

Build command:

```bash
npm run build-component -- content/demos/components/carousel.json \
  --output dist/component-carousel \
  --theme portfolio
```

It produces a standalone web interaction, copies local referenced assets, preserves remote/data URLs, adds theme assets, and writes a sanitized build manifest.

### Runtime

Supports:
- carousel paging + keyboard navigation + completion
- hotspot interaction + visited states
- single-select assessment + feedback + basic score
- video/audio presentation + transcript + media-end completion
- shared `lx:component-complete` browser event

### Generic demos

Stored in:

```text
content/demos/components/
```

Includes generic/sanitized examples for all four current component types.

---

## 7. Component Studio

Public URL:

`https://reeder-design.github.io/learning-experience-engine/component-studio/`

Purpose: browser-first authoring for one reusable interaction.

### Current UX flow

```text
1. Choose interaction
        ↓
2. Load project assets
        ↓
3. Author
        ↓
4. Preview
        ↓
5. Export
```

Important: **assets come before authoring fields** so file paths can be auto-filled/suggested.

### Current capabilities

- choose carousel / hotspot / assessment / media presentation
- component basics fields
- dynamic repeatable content editors
- local project asset library
- project-folder import
- individual-file import
- asset classification by extension
- portable relative paths
- local image/video/audio preview
- source-context file reading
- optional VTT matching for video preview
- auto-fill compatible paths
- generated JSON
- copy JSON
- export JSON
- import/export project ZIP
- contextual `?` help bubbles
- dedicated User Guide
- explicit Preview actions
- explicit Export section

### Recommended component project package

```text
my-interaction/
├── context/
│   └── source-content.txt
├── assets/
│   ├── images/
│   ├── video/
│   ├── audio/
│   ├── captions/
│   └── documents/
└── component.json
```

ZIP package:

```text
component-project.zip
├── component.json
├── context/
└── assets/
```

Paths stored in JSON should be portable, e.g.:

```text
assets/video/walkthrough.mp4
```

Never absolute local machine paths.

---

## 8. Course Composer

Public app lives under:

`docs/course-composer/`

Purpose: assemble multiple learning sections and reusable components into one complete course.

### Current UX flow

```text
1. Course basics
        ↓
2. Upload project assets
        ↓
3. Build course content
        ↓
4. Preview
        ↓
5. Export
```

This order is intentional. **Project Assets must come before content creation** so adding image/video/resource content can auto-fill compatible files.

### Major UX decision

Do **not** return to the old left-sidebar/select-one/edit-elsewhere model.

Course Composer now uses a **single authoring canvas** where all course sections are visible and editable in one view.

Each course section is its own editable card with direct controls for:
- edit
- reorder / drag
- move up/down
- duplicate
- delete

The user should be able to understand the entire course structure while editing without jumping between a sidebar and a separate editor pane.

### Current content types

- text
- image
- video
- resource/document
- imported engine-native component

### Current course capabilities

- title
- description
- audience
- objectives
- shared project asset library
- source-context files
- automatic compatible asset assignment for newly added media/resource sections when possible
- ordered content cards
- component JSON import
- course-level preview
- Previous/Next learner navigation
- autosave to browser local storage
- undo/redo
- generated course JSON
- JSON export
- full project ZIP export/import

### Course project package

```text
course-project.zip
├── course.json
├── context/
└── assets/
```

### Composer ↔ Component Studio handoff

Current handoff is still file-based:

```text
Component Studio
→ Export component JSON
→ Course Composer
→ Add Component
→ Import component JSON
```

A future improvement should support direct **Add to Course** behavior.

---

## 9. Preview and export UX standard

Preview and Export are separate workflow steps.

Do not make users infer that the right-hand pane is automatically the preview or that header buttons are the only export method.

### Preview sections should have obvious actions

Examples:
- Preview from beginning
- Review interaction
- Refresh preview
- Open full preview

### Export sections should have obvious actions

Examples:
- Copy JSON
- Export JSON
- Export project ZIP
- View generated JSON

This pattern should carry forward into future tools.

---

## 10. Asset workflow standard

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

Folders are recommended but not mandatory. The browser can classify loose files by extension.

Supported examples include:
- JPEG/PNG/SVG
- MP4/MOV/WebM
- MP3/WAV/M4A
- VTT/SRT
- PDF and common office files
- TXT/MD/CSV/JSON context files

Normal authoring should use folders directly. ZIP is primarily for portability, backup, reopening, and transfer.

---

## 11. Navigation/help UX standard

All public static-site internal navigation must work both:
- on GitHub Pages
- when opening `index.html` directly from a local filesystem

Therefore internal links should target actual HTML files rather than directory-only URLs.

Example:

```text
../user-guide/index.html
```

rather than:

```text
../user-guide/
```

Help bubbles use centered `?` marks with real flex centering and should link to the relevant User Guide section.

Current app family should feel like one product:

```text
Engine Home
↕
Component Studio
↕
Course Composer
↕
User Guide
```

The Learning Experience Engine also has its own favicon, separate from other portfolio/library projects.

---

## 12. GitHub Pages and CI

GitHub Pages is enabled from `main` → `/docs`.

Public site:

`https://reeder-design.github.io/learning-experience-engine/`

GitHub Actions currently checks:
- browser JavaScript syntax
- Component Studio scripts
- Course Composer scripts
- static navigation rules
- help-bubble alignment rules
- workflow-order UX expectations
- component builder smoke tests

Latest checkpoint status: CI green after the asset-first/single-canvas Composer UX redesign.

---

## 13. Theme

Current portfolio-derived public theme:

- Taupe `#4A4238`
- Charcoal `#4D5359`
- Pine-Blue `#508484`
- Mint `#79C99E`
- Yellow-Green `#97DB4F`
- Montserrat + Open Sans

Theme files live under:

```text
themes/portfolio/
```

Long-term, Theme Manager should allow content and styling to remain separate so private corporate branding can be applied without entering the public repository.

---

## 14. Important accuracy limits

Do not claim these are finished:
- full Storyline animation fidelity
- pixel-perfect Storyline reconstruction
- complete native Storyline quiz support
- complete custom variable-driven assessment scoring
- Rise Code Block output
- Storyline Web Object export
- SCORM/xAPI packaging
- Docebo deployment
- universal Storyline classifier accuracy
- persistent cloud authoring projects
- direct Studio → Composer handoff

Implemented/prototype-ready claims are safe for:
- Rise import/normalize pipeline
- Storyline import/normalize pipeline
- prototype stateful web runtime
- first Storyline-derived component adapters
- engine-native component schema/runtime/builder
- Component Studio browser authoring
- local asset/project packages
- Course Composer browser authoring
- course-level single-canvas editing
- browser preview
- GitHub CI regression checks

---

## 15. Current repository shape

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
│   └── user-guide/
├── tests/
├── .github/workflows/
├── README.md
├── CONFIDENTIALITY.md
├── PROJECT_CHECKPOINT.md
└── package.json
```

---

## 16. Next milestone

**Do not start this until the current checkpoint/UX review is accepted.**

Next major feature: **Scenario Builder**.

Goal: the first advanced engine-native interaction for branching/customer-discovery simulations.

Likely concepts:
- nodes/steps
- learner choices
- branches/outcomes
- conditions
- variables/state
- feedback
- scoring or decision quality
- replay/reset
- completion rules
- generic sales/discovery scenario template

The Scenario Builder should inherit the UX conventions established by Component Studio and Course Composer:
- asset-first when assets are needed
- one clear workflow
- obvious Preview step
- obvious Export step
- contextual help
- User Guide integration
- local/private asset compatibility
- browser-first authoring

After Scenario Builder, likely milestones include:
- direct Component Studio → Course Composer handoff
- richer course composition/content types
- Theme Manager
- project dashboard/recent projects
- stronger persistent local project workflows
- LMS/export targets

---

## 17. Restart instructions for a new ChatGPT conversation

If conversation context is lost, tell ChatGPT:

> We are continuing development of `Reeder-design/learning-experience-engine`. Read `PROJECT_CHECKPOINT.md` in the repo first. Use GitHub directly for public repo work. Keep confidential source content local/private. Do not make me run repeated terminal diagnostics. The current UX has Component Studio and Course Composer with asset-first authoring, explicit Preview/Export steps, and a single-canvas Course Composer. CI was green at the checkpoint. The next planned milestone is Scenario Builder.

Then have ChatGPT inspect the current repository before changing anything, because the code may have advanced since this checkpoint.
