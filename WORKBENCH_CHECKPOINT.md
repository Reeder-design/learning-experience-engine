# Learning Project Workbench v0.2 — Checkpoint

**Date:** September 17, 2026  
**Repository:** `Reeder-design/learning-experience-engine`  
**Active feature branch:** `feature/workbench-ai`

## Product north star

Learning Experience Engine is evolving into an **AI-assisted Learning Project Workbench**, not a replacement for Rise or Storyline.

```text
source content / files / existing project / saved template
        ↓
Learning Project Workbench
        ↓
AI-generated or reconstructed project
        ↓
editable populated fields + learner preview
        ↓
AI transformations + manual fine-tuning
        ↓
save / reuse / export / template
```

The specialized Scenario Builder, Interaction Builder, and Course Builder remain underneath as fine-tuning editors.

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

Do not rename stable implementation routes just to match public display labels.

## Public/private product split

This distinction is intentional and should remain:

```text
PUBLIC GITHUB PAGES
→ generic demos
→ public-safe manual authoring
→ engine docs / previews
→ no secret API key
→ no confidential source workflow

PRIVATE LOCAL WORKBENCH
→ npm run workbench
→ 127.0.0.1 only
→ password protected
→ private source materials
→ local Git-ignored API key
→ AI generation / transformation
```

GitHub Pages is not the private manager.

## Workbench v0.2 candidate

First supported project type:

```text
branching-scenario
```

### Source / project entry

- Start from a source template
- Start simple
- Open existing branching-scenario JSON
- Paste project brief / source outline
- Add individual source files or a source folder
- Read local TXT / MD / CSV / JSON reference content
- Use local images in project fields and learner preview

Built-in source templates:

- Customer discovery conversation
- Decision practice with coaching
- Objection handling conversation

### AI generation / transformation

Private local mode now has a secure AI integration contract for:

- project brief + source material → populated branching scenario
- sanitize for public portfolio
- adapt for another audience
- use current project as a structural template for new source content
- freeform plain-language project transformation

AI behavior:

```text
Workbench source/current project
        ↓
local authenticated API route
        ↓
OpenAI Responses API
        ↓
strict JSON-schema response
        ↓
Engine referential/flow validation
        ↓
optional one-pass repair if needed
        ↓
editable Workbench project + preview
```

The AI output is not applied until structural validation passes.

The Workbench keeps the pre-AI project in memory so **Undo AI change** can restore it.

### Source-file behavior

Selecting a file does not send it anywhere.

Only an explicit Generate / Apply AI action packages supported source material for the API request.

Current AI packaging:

- readable reference text is included as project context
- selected images can be sent as image inputs
- selected document files can be sent as file inputs
- a local asset manifest constrains image paths the generated project may reference
- large source files are skipped and reported rather than silently exceeding the local request limit

OpenAI request uses:

```text
store: false
```

The user must still follow applicable company/client rules before sending confidential source material to any external AI API.

## Private local security

The private Workbench server binds only to:

```text
127.0.0.1
```

Implemented protections:

- trusted-host enforcement
- first-run password setup
- PBKDF2-HMAC-SHA256 password hashing
- 600,000 iterations
- unique random salt
- no plaintext password storage
- Git-ignored `.env.workbench`
- random local session signing secret
- signed 8-hour session
- HttpOnly cookie
- SameSite=Strict cookie
- CSRF token required for modifying API requests
- login throttling after repeated failures
- private settings page
- sign out action

First launch:

```text
npm run workbench
        ↓
first-time secure setup
        ↓
create Workbench password
        ↓
optionally paste separate OpenAI API key
        ↓
private Workbench
```

Later launches:

```text
npm run workbench
→ password
→ Workbench
```

Private settings can:

- add / rotate OpenAI API key
- switch between GPT-5.6 Terra, Sol, and Luna
- change the Workbench password

Secrets remain in local `.env.workbench`, which is already covered by the repository's `.env.*` Git ignore rule.

## API model choice

Default:

```text
gpt-5.6-terra
```

Rationale: balanced intelligence/cost for repeated content transformation.

Available private setting choices:

- `gpt-5.6-terra`
- `gpt-5.6-sol`
- `gpt-5.6-luna`

## Current editor / preview behavior

- populated editable scenario fields
- internal IDs hidden behind Advanced fields
- decision/response/outcome editing
- coaching feedback
- optional score deltas
- destination dropdowns
- local image selection
- continuous branch validation
- interactive learner preview
- local autosave
- download interaction JSON
- advanced JSON inspection

## Deliberate boundaries

Not implemented yet:

- persistent Source Template Library
- saved Theme Library
- Workbench project ZIP containing source + metadata + project JSON
- source files surviving browser reload
- broader project types beyond branching scenarios
- guided Rise/Storyline import inside the Workbench
- SCORM/xAPI/LMS deployment
- full arbitrary scenario-variable system
- hosted/private cloud Workbench authentication

Do not move confidential AI workflows to public GitHub Pages merely for convenience.

## Testing / guardrails

The feature branch now includes regression coverage for:

- browser/server JavaScript syntax
- Workbench UX markers
- canonical app naming
- favicon coverage
- password hashing / password verification
- signed session validation
- CSRF validation
- unauthenticated Workbench redirect
- authenticated login
- protected AI POST rejecting missing CSRF
- mock AI generation round trip
- generated branching-scenario validation
- existing component-builder smoke tests

Relevant files:

```text
server/workbench-auth.js
server/local-config.js
server/workbench-ai-core.js
api/workbench-ai.js
docs/workbench/ai-client.js
scripts/preview-docs.js
tests/workbench-ai.test.js
.github/workflows/component-smoke.yml
```

## Next after this feature is QA'd and merged

1. Source Template Library for complete reusable projects.
2. Theme Library and AI rebrand transformation contract.
3. Editable Workbench project package.
4. Guided Rise/Storyline import.
5. Expand AI Workbench beyond branching scenarios.

## UX rule

The user should normally think:

> Use this source/project/template and turn it into what I need.

Not:

> Which JSON object, block, node, trigger, API route, or file path do I need to construct?
