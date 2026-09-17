# Learning Experience Engine — Project Checkpoint

**Checkpoint date:** September 16, 2026  
**Repository:** `Reeder-design/learning-experience-engine`  
**Public site:** `https://reeder-design.github.io/learning-experience-engine/`

This is the portable handoff for continuing development in a new ChatGPT conversation. Treat the repository as the source of truth and inspect current files before making changes because development may have advanced after this checkpoint.

---

## 1. Product vision

Learning Experience Engine is a reusable browser-first instructional-design workbench plus a technical import/rendering engine.

The product exists primarily to help an instructional designer **reuse and templatize Rise/Storyline learning patterns instead of rebuilding them repeatedly**.

Human-facing north star:

```text
What do I want to make?
        ↓
What source material do I have?
        ↓
Build it
        ↓
Preview it as a learner
        ↓
Save and reuse it
```

Technical north star underneath:

```text
ChatGPT / browser authoring / imported Articulate content
        ↓
structured engine models
        ↓
Learning Experience Engine
        ↓
Web / portfolio / future Rise / Storyline / LMS outputs
```

**Important product rule:** JSON, Git, Node, schemas, internal IDs, and file paths are engine concepts, not normal authoring tasks. They can remain available under Advanced, but the default interface should speak instructional-design language.

---

## 2. Working relationship / division of labor

Default workflow:

```text
USER
• provides desired learning experience and source content
• visually QA's finished browser experiences
• handles private local files only when physically necessary

ASSISTANT
• inspects and edits the public GitHub repository directly
• designs architecture and interactions
• writes code
• runs tests / CI
• fixes public bugs
• keeps public examples generic and sanitized

USER only when necessary
• git pull
• run one final local command for confidential/private files
```

Do not use the user as a diagnostic test harness when the public repository can be inspected or edited directly.

When terminal use is required, label it clearly as PUBLIC repo or PRIVATE local folder.

---

## 3. Public/private boundary

### Public GitHub repository

Safe for:
- reusable engine code
- generic schemas
- sanitized demos
- browser authoring interfaces
- themes
- public documentation
- tests

### Private local workspace

Typical sibling folder:

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

Private/confidential:
- company/customer content
- Articulate exports
- source PPT/PDF/ZIP files
- private normalized JSON
- private preview builds
- private assets

Never commit confidential source content to the public engine repository.

---

## 4. Core engine models

Keep three conceptual models distinct.

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

### Engine-native interaction model

```text
interaction/component
→ instructional content
→ behavior settings
→ completion rules
```

Do not force Storyline into the Rise schema. New reusable authoring increasingly uses the engine-native interaction contract.

---

## 5. Implemented Rise pipeline

Implemented:

```text
tools/rise-inspector/
tools/rise-extractor/
tools/rise-normalizer/
builders/web/
```

Capabilities:
- inspect Rise Web exports
- decode runtime course data
- extract lessons/assessments/assets
- normalize content
- build themed standalone web course previews
- support common text/media/tabs/accordion/assessment display/navigation/progress patterns

Advanced assessment scoring is not complete.

A **guided browser workflow for “Reuse existing Rise content” is not yet built**. The technical pipeline exists and should become a human-facing reuse wizard later.

---

## 6. Implemented Storyline pipeline

Implemented:

```text
tools/storyline-inspector/
tools/storyline-extractor/
tools/storyline-normalizer/
tools/storyline-preview/
builders/stateful-web/
```

The prototype stateful runtime supports useful subsets of:
- scenes/slides/layers
- positioned objects
- variables and conditions
- show/hide
- basic states
- actions/action groups
- navigation
- URLs
- media
- pointer events
- timelines

Storyline-derived reusable adapters include:
- carousel
- hotspot reveal
- assessment shell
- media presentation

Do **not** claim pixel-perfect Storyline reconstruction, full animation fidelity, complete quiz parity, or universal classifier accuracy.

A **guided browser workflow for “Reuse existing Storyline content” is not yet built**. The import/reverse-engineering foundation exists.

---

## 7. Engine-native interaction system

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

Generic sanitized demos live under:

```text
content/demos/components/
```

---

# 8. HUMAN-CENTERED ID WORKBENCH BASELINE

This is the most important product checkpoint as of this file.

The browser UX was intentionally refactored away from developer-first wording.

Shared human-facing layer:

```text
docs/assets/id-workbench.css
docs/assets/id-workbench.js
```

This layer provides:
- common ID-facing terminology
- progressive disclosure for technical fields
- hidden internal IDs during normal authoring
- consistent Preview wording
- consistent Save & reuse wording
- generated/dynamic UI vocabulary cleanup
- humanized source-file drawer language
- shared Advanced controls

### UX rule

> The interface should ask “What are you trying to make?” rather than “Which technical object are you manipulating?”

### Shared authoring rhythm

```text
Define / choose
→ Source files & media
→ Build
→ Preview
→ Save & reuse
```

Do not regress to JSON-first/export-first wording as the primary workflow.

---

## 9. Engine Home

Public path:

```text
docs/index.html
```

The homepage now opens with:

> **What do you want to make?**

Primary choices:
- Full learning experience → Course Composer
- Interactive activity → Interaction Builder
- Practice scenario → Scenario Builder

It also exposes the strategic **Reuse instead of rebuild** direction:
- Reusable templates — next milestone
- Existing Rise content — technical importer ready, guided workflow next
- Existing Storyline content — technical importer ready, guided workflow next
- Existing Engine project — reopen in relevant builder

Do not revert the homepage to architecture-first sections such as “three authoring layers” as the primary experience. Technical architecture belongs in README/docs, not the main task entry point.

---

## 10. Interaction Builder

Implementation path remains:

```text
docs/component-studio/
```

**User-facing name is now `Interaction Builder`.**

Keep the filesystem/path name `component-studio` for compatibility unless there is a separate deliberate migration project.

### UX flow

```text
1 Choose
2 Source files & media
3 Build
4 Preview
5 Save & reuse
```

### First decision is learner behavior

- Browse or compare → Carousel
- Explore a visual → Hotspot
- Practice with a question → Knowledge check
- Watch or listen → Guided media

### Human-centered behavior

- `Engine-native` is shown as `Reusable interaction`
- internal item IDs are hidden under **Advanced fields**
- generated JSON is labeled **Advanced project data**
- source drawer uses `Source files & media`, `Reference content`, etc.
- `Preview as learner` / `Restart preview` are standard terms
- Step 5 centers `Download editable project` and `Download interaction for a course`
- direct Add to course is still future work

### Package

```text
component-project.zip
├── component.json
├── context/
└── assets/
```

---

## 11. Course Composer

Public path:

```text
docs/course-composer/
```

### UX flow

```text
1 Course basics
2 Source files & media
3 Build course
4 Preview
5 Save & reuse
```

### Major UX principle

Course Composer uses a **single authoring canvas** where all sections remain visible/editable together.

Do not return to a select-on-left/edit-elsewhere sidebar model.

### Current human-facing content choices

- Text / explanation
- Image + explanation
- Video
- Job aid / resource
- Interaction

Underlying technical types remain unchanged for compatibility.

### Current capabilities

- course title/purpose/audience/objectives
- source files/reference content/media
- compatible asset auto-fill
- direct section editing
- drag/reorder + move controls
- duplicate/delete
- interaction file import
- autosave
- undo/redo
- embedded preview
- Preview as learner
- editable project download
- advanced course data download/inspection

### Package

```text
course-project.zip
├── course.json
├── context/
└── assets/
```

### Current interaction handoff

Today:

```text
Interaction Builder / Scenario Builder
→ download interaction file
→ Course Composer
→ add Interaction
→ choose interaction file
```

This is functional but intentionally marked as temporary UX.

Future target:

```text
Add interaction
→ choose existing / template / create new
→ save
→ return directly to course
```

---

## 12. Scenario Builder

Public path:

```text
docs/scenario-builder/
```

### UX flow

```text
1 Scenario setup
2 Source files & media
3 Build decisions
4 Preview
5 Save & reuse
```

Scenario Builder should feel like a simulation-design worksheet, not a visible state-machine editor.

### Human-facing prompts

- What is the learner practicing?
- What should the learner do?
- First decision
- Who is speaking?
- What's happening?
- What does the learner know?
- Learner choice
- What happens next?
- Coaching feedback
- Impact on score
- Outcome name
- What happened?
- Learner takeaway / next step

### Progressive disclosure

Scoring is under:

```text
Optional scoring
```

Settings include:
- Track learner performance
- Score name
- Starting score
- Minimum/maximum
- Show score to learner

Internal node/outcome IDs are hidden under:

```text
Advanced fields
```

### Scenario check language

Technical path validation still runs, but user-facing state is translated to:
- `Things to fix before preview...`
- `Ready to preview, with...`
- `Ready to preview ✓ ...`

### Current capabilities

- decision points
- realistic learner choices
- explicit next destinations
- coaching feedback
- optional simple score
- outcomes
- continuous branch validation
- unreachable-content warnings
- inline preview
- focused learner preview
- replay
- path history
- local source/reference files
- editable project ZIP
- scenario interaction file export

### Deliberate limitation

Only one simple decision-quality score exists today.

Do not add arbitrary variables/trust/urgency/stakeholder state until the template/reuse/direct-handoff UX is stabilized, unless a real scenario use case requires it.

---

## 13. User Guides

Current guides:

```text
docs/user-guide/index.html                 # Interaction Builder Guide
docs/user-guide/course-composer.html
docs/user-guide/scenario-builder.html
```

The guides were rewritten to teach tasks, not architecture.

They should preserve the five-step workflow and keep technical details under Advanced.

---

## 14. Preview language standard

Use these terms consistently:

```text
Preview
Preview as learner
Restart preview
```

Avoid proliferating alternatives such as:
- Review interaction
- Open focused preview
- Open full preview

unless a distinct behavior truly requires a distinct label.

---

## 15. Save & reuse language standard

Step 5 is now **Save & reuse**, not Export.

Primary user questions:
- How do I keep editing this later?
- How do I reuse this?
- How do I put it into a course?

Primary actions:
- Download editable project
- Download interaction for a course / scenario for a course
- future Save as reusable template
- future Add to course

Technical JSON/project data belongs under **Advanced project data**.

---

## 16. Template system — NEXT MAJOR MILESTONE

The next major product pass should build reusable templates across Course Composer, Interaction Builder, and Scenario Builder as one shared system.

Target start experience:

```text
Start blank
Start from template
Open saved project
```

Target end experience:

```text
Save editable project
Save as reusable template
Add to course (where relevant)
Advanced project data
```

Template categories should support at least:
- course
- interaction
- scenario
- carousel
- hotspot / visual exploration
- knowledge check
- guided media
- sales/customer conversation scenario

Templates should preserve structure/design/behavior while making learner-facing content easy to replace.

Do not build three unrelated template implementations. Use a shared template contract/library UX.

---

## 17. Planned integration pass after templates

After templates:

1. Direct Interaction Builder → Course Composer handoff
2. Direct Scenario Builder → Course Composer handoff
3. Course Composer interaction picker:
   - existing interaction
   - template
   - create new
4. Guided `Reuse existing content` flow:
   - Rise Web export
   - Storyline Web export
   - existing Engine project
5. Present useful detected structures/patterns rather than extracted JSON

Example Rise reuse target:

```text
We found:
✓ lessons
✓ knowledge checks
✓ media
✓ reusable interaction patterns

Create editable course
Save reusable interactions
Review extracted content
```

Example Storyline reuse target:

```text
We found:
✓ carousel-style interaction
✓ decision slides
✓ layers
✓ variable-driven logic

Create reusable interaction
Create branching scenario
Open full reconstruction
```

---

## 18. Theme

Public palette:
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

Engine favicon:

```text
docs/assets/experience-engine-favicon.svg
docs/favicon.ico
```

Authoring UX should remain polished, restrained, and mildly interactive rather than flashy.

---

## 19. GitHub Pages / local navigation

Pages are deployed from:

```text
main → /docs
```

Internal static links must work both:
- on GitHub Pages
- when opening HTML locally via `file://`

Use explicit targets such as:

```text
../user-guide/index.html
```

not directory-only links.

---

## 20. Automated regression rules

Workflow:

```text
.github/workflows/component-smoke.yml
```

Current checks cover:
- browser/runtime JavaScript syntax
- shared `id-workbench.js` syntax
- component builder smoke tests
- scenario builder/runtime
- static local-safe navigation
- favicon coverage
- help bubble alignment
- workflow ordering
- required Preview/Save actions
- Scenario Builder visual QA
- human-centered ID UX markers
- Interaction Builder naming
- source-files-first wording
- Save & reuse wording
- optional scoring controls
- hidden advanced/internal-ID layer
- homepage Build / Reuse pathways
- guide alignment

Do not weaken these UX tests merely to make a regression pass.

---

## 21. Important accuracy limits

Do not claim these are implemented:
- reusable template library (next milestone)
- direct builder → course handoff
- guided Rise reuse browser wizard
- guided Storyline reuse browser wizard
- rich full branching runtime inside Course Composer preview
- arbitrary scenario state/conditions
- full Storyline fidelity
- full native/custom assessment parity
- Rise Code Block output
- Storyline Web Object output
- SCORM/xAPI packaging
- Docebo publishing
- persistent cloud projects
- Theme Manager

Safe implemented/prototype-ready claims:
- Rise inspect/extract/normalize pipeline
- Storyline inspect/extract/normalize pipeline
- prototype stateful web runtime
- first Storyline-derived adapters
- engine-native interaction schema/builder/runtime
- Interaction Builder browser authoring
- Course Composer browser authoring
- Scenario Builder v0.1
- branching scenario standalone runtime
- local source-file/project packaging
- browser previews
- ID-facing workbench UX layer
- GitHub Actions regression/smoke checks

---

## 22. Approximate repository shape

```text
learning-experience-engine/
├── components/stateful/
├── content/demos/components/
├── schemas/
│   ├── course.schema.json
│   └── component.schema.json
├── themes/
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
│   ├── assets/
│   │   ├── experience-engine-favicon.svg
│   │   ├── id-workbench.css
│   │   └── id-workbench.js
│   ├── component-studio/      # user-facing Interaction Builder
│   ├── course-composer/
│   ├── scenario-builder/
│   └── user-guide/
├── tests/
├── .github/workflows/
├── README.md
├── CONFIDENTIALITY.md
└── PROJECT_CHECKPOINT.md
```

---

## 23. Immediate continuation instruction for a new chat

If restarting from this checkpoint:

1. Inspect current `main` before editing.
2. Read `README.md` and this checkpoint.
3. Preserve the human-centered ID workbench baseline.
4. Do not rename repository folders merely because visible product language changed.
5. Do not re-expose JSON/IDs/paths as default authoring fields.
6. Continue with **Reusable Template System** unless the user reports a QA bug first.
7. After templates, build direct builder-to-course handoffs, then the guided Rise/Storyline reuse interface.

The product direction is now:

> **Make powerful reuse feel boringly simple for an instructional designer.**
