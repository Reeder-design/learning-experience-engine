# Learning Project Workbench v0.3 — Checkpoint

**Date:** September 18, 2026  
**Repository:** `Reeder-design/learning-experience-engine`  
**Active feature branch:** `feature/workbench-ai`  
**Draft PR:** #1

## Product definition

Learning Project Workbench is an **AI-assisted editor/transformer for published-style learning web experiences**.

It is **not** intended to recreate the proprietary Rise or Storyline authoring interfaces.

North star:

```text
source content / existing published project / source template
        ↓
Learning Project Workbench
        ↓
generate or reconstruct
        ↓
edit learner-facing experience
        ↓
apply theme / behavior / metadata
        ↓
preview rendered experience
        ↓
export / reuse / template
```

Future Rise-like projects can expose:

```text
course → lessons → blocks → interactions
```

Future Storyline-like projects can expose:

```text
scenes → slides → layers → objects / state
```

They should share source handling, Project Profile, themes, history, AI, preview, and export systems rather than being forced into one identical content structure.

## User-facing workflow

The numbered workflow is now only:

```text
1 Source
2 Build & edit
3 Preview
4 Export
```

These are persistent **project tools**, not workflow steps:

```text
Ask AI
Theme
History
Project settings
```

Do not reintroduce AI, Theme, History, or Settings as numbered workflow stages.

## Workbench Project Profile

The runtime interaction JSON remains optimized for the learning experience itself.

A separate Project Profile carries broader published-web context and is embedded in exported JSON at:

```text
metadata.workbenchProfile
```

Canonical schema:

```text
schemas/workbench-project-profile.schema.json
```

Profile domains:

- **source**
  - origin: engine-native / Rise published web / Storyline published web / other
  - structure model: interaction / course-lessons-blocks / scenes-slides-layers
  - source-template ID and notes
- **learning**
  - audience
  - purpose
  - objectives
  - duration
  - prerequisites
- **presentation**
  - accessibility expectations
  - theme name
  - layout treatment
  - brand direction
  - colors
  - typography
  - logo treatment
  - motion
  - target-specific notes for web / Rise / Storyline / LMS
- **behavior**
  - navigation
  - progress
  - scoring
  - feedback style
- **export**
  - target
  - notes

## Theme model

Theme is now first-class project data rather than a prompt-only concept.

Workbench Theme UI includes:

- theme name
- layout treatment
- brand / visual direction
- primary / secondary / accent / background / text colors
- heading / body typography
- logo / identity treatment
- motion treatment
- standalone-web notes
- Rise embed notes
- Storyline Web Object notes
- LMS package notes

The current preview applies:

- theme colors
- heading/body font families
- layout treatments:
  - clean cards
  - editorial
  - technical dark
  - minimal

AI action:

```text
Set design theme
```

AI now returns both:

```text
project
profile
```

and can refine `profile.presentation.theme`.

Important accuracy boundary:

- theme rules currently affect the Engine/Workbench rendered web experience and travel as portable metadata
- production exporters that translate those rules into actual Rise embeds, Storyline Web Objects, or LMS packages are future work
- do not claim we directly edit proprietary Rise/Storyline authoring-tool theme settings

## Scoring rule

Learner-visible scoring is **off by default**.

Project Settings controls:

```text
No learner score
Internal only
Visible to learner
```

Choice-level score deltas are hidden from normal editing when scoring is `none`.

The previous template behavior that displayed arbitrary values such as:

```text
Discovery quality 50
```

must not return unless the project explicitly selects visible scoring.

## Internal IDs

Internal IDs are still required for:

- branch destinations
- validation
- stable runtime references
- project portability
- future import/export mapping

But they are now **engine-only**.

Removed from normal Workbench editing:

- Internal project ID
- node IDs
- response IDs
- outcome IDs
- Advanced fields toggle

The only place technical IDs/JSON should normally appear is:

```text
Export → Developer project data
```

for troubleshooting/development.

## AI transformation history

Every successful AI action creates a history entry with:

- timestamp
- action type
- prompt
- model
- change summary
- review notes
- before project snapshot
- after project snapshot
- before Project Profile
- after Project Profile

History actions:

- Restore this version
- Restore before change
- Edit & rerun

**Edit & rerun** restores the original starting state, places the old prompt back in Ask AI, and lets the user revise it before running again.

History is retained in local Workbench autosave and capped to the most recent 30 AI transformations.

## AI structured-output contract

Private local AI flow:

```text
source/current project
+ Workbench Project Profile
        ↓
authenticated localhost API
        ↓
OpenAI Responses API
        ↓
strict structured output:
  project
  profile
  changeSummary
  reviewNotes
        ↓
asset-path enforcement
        ↓
branch/reference validation
        ↓
optional one-pass repair
        ↓
Workbench
```

Requests use:

```text
store: false
```

Supported project type today:

```text
branching-scenario
```

## Private local security

Private Workbench:

```text
npm run workbench
```

Server binds only to:

```text
127.0.0.1
```

Implemented:

- first-run password setup
- PBKDF2-HMAC-SHA256 password hash
- 600,000 iterations
- random salt
- no plaintext password storage
- Git-ignored `.env.workbench`
- random session signing secret
- signed ~8-hour session
- HttpOnly cookie
- SameSite=Strict
- CSRF on modifying API calls
- login throttling
- Private settings
- Sign out

Private settings manages:

- OpenAI API key
- AI model
- Workbench password

## Public/private split

```text
PUBLIC GITHUB PAGES
→ public-safe demos
→ generic/manual Engine tools
→ docs
→ no confidential-source AI workflow

PRIVATE LOCAL WORKBENCH
→ password protected
→ private source files
→ local OpenAI secret
→ AI generation/transformation
```

Do not move confidential workflows to public GitHub Pages.

## Local draft migration

Current storage key:

```text
lx-learning-project-workbench:v0.3
```

The Workbench auto-migrates the previous:

```text
lx-learning-project-workbench:v0.1
```

draft on first v0.3 load so the UX refactor does not silently discard the user's existing test project.

## Stable app naming contract

```text
workbench        → Learning Project Workbench
component-studio → Interaction Builder
scenario-builder → Scenario Builder
course-composer  → Course Builder
```

Canonical registry:

```text
docs/assets/app-registry.js
```

Do not create a duplicate `course-builder/` implementation path.

## Current deliberate boundaries

Not implemented yet:

- persistent Source Template Library
- saved Theme Library
- Workbench project ZIP containing source files + interaction + Project Profile + history metadata
- source files surviving browser reload
- full Rise published-web Workbench reconstruction
- full Storyline published-web Workbench reconstruction
- broader Workbench experience types beyond branching scenarios
- production Rise embed output
- production Storyline Web Object output
- SCORM/xAPI/LMS packaging
- arbitrary Storyline-style variables/triggers/state parity
- hosted/private cloud Workbench authentication

Existing Rise/Storyline inspector/extractor/normalizer foundations remain valuable and should later feed the Workbench rather than be discarded.

## Automated guardrails

CI now checks:

- browser/server JavaScript syntax
- canonical app naming
- favicon coverage
- v0.3 workflow markers
- AI is not a numbered workflow step
- Workbench does not expose internal IDs / Advanced fields
- Project Profile schema exists
- Theme / History / Project Settings panels exist
- password hashing / session verification
- CSRF behavior
- authenticated private Workbench route
- mock AI returns both branching-scenario project + Project Profile
- default learner scoring stays hidden
- existing component-builder smoke tests

## Next product milestones after v0.3 is QA'd

1. **Source Template Library**
   - save complete reusable source projects
   - include content roles, Project Profile, asset roles, and AI generation instructions
2. **Saved Theme Library**
   - save/apply/duplicate named brand themes
   - use Project Profile theme contract
3. **Workbench project package**
   - source brief
   - source metadata/files
   - interaction JSON
   - Project Profile
   - template/theme references
   - history metadata
4. **Guided Rise published-web import**
5. **Guided Storyline published-web import**
6. Expand beyond branching scenarios

## UX rule

The user should think:

> Use this source/project/template and turn it into the learning experience I need.

The user should not need to think:

> Which JSON object, node ID, trigger, internal route, or file path do I need to construct?
