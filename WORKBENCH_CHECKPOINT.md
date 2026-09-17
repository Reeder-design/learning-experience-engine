# Learning Project Workbench v0.1 — Checkpoint

**Date:** September 16, 2026  
**Repository:** `Reeder-design/learning-experience-engine`

## Product pivot

The primary product direction is now an **AI-assisted Learning Project Workbench**, not a replacement for Rise or Storyline.

North star:

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

The specialized Scenario Builder, Interaction Builder, and Course Composer remain underneath as fine-tuning editors.

## Workbench v0.1

Public path:

```text
docs/workbench/
```

First supported project type:

```text
branching-scenario
```

### Implemented

- Start from template
- Start simple
- Open existing branching-scenario JSON
- Built-in source templates:
  - Customer discovery conversation
  - Decision practice with coaching
  - Objection handling conversation
- Source brief / outline field
- Add source files or a source folder
- Read local TXT / MD / CSV / JSON reference content
- Local image files become selectable in project fields and learner preview
- Reconstruct JSON into editable project fields
- Edit scenario title, purpose, instruction, decisions, responses, coaching feedback, destinations, and outcomes
- Internal IDs hidden behind Advanced fields
- Continuous flow validation
- Interactive learner preview
- Local draft autosave
- Download interaction JSON
- AI transformation UI/presets for:
  - Sanitize for portfolio
  - Apply another theme
  - Adapt for another audience
  - Create a similar version
- AI execution intentionally disabled until a secure backend is added

### Deliberate v0.1 boundaries

- AI generation/transformation is not connected yet
- OpenAI API key must never be placed in GitHub Pages client JavaScript
- Source Template Library is not persistent yet
- Theme Library is not implemented yet
- Source files are current-session browser objects and do not survive reload
- PDF/PPT/DOC files can be selected but are not parsed locally in v0.1
- Only branching-scenario JSON is reconstructed in the Workbench today
- Project ZIP packaging for the Workbench itself is not yet implemented
- Rise/Storyline guided Workbench import is future work

## Secure AI architecture — next implementation layer

Target:

```text
Browser Workbench
        ↓
secure backend / serverless route
        ↓
OpenAI API
        ↓
structured project response
        ↓
component schema + branch validation
        ↓
editable project + learner preview
```

Initial AI tasks:

1. Source outline/reference content → populated scenario JSON.
2. Sanitize confidential/internal information, files, and links while preserving learning structure.
3. Rebrand using a saved theme.
4. Adapt for another learner audience.
5. Use an existing project as a source template and rebuild it around new content/assets.

Use a separate OpenAI API Project/key for Learning Experience Engine rather than placing an existing secret in the public frontend. The same OpenAI organization/account can contain multiple API Projects.

## Next milestones

1. Secure AI API/serverless layer.
2. Structured AI generation contract + schema validation.
3. Source Template Library for complete reusable projects.
4. Theme Library.
5. Editable Workbench project package containing source brief, source metadata/files, project JSON, and template/theme references.
6. Guided Rise/Storyline import into the Workbench.
7. Expand Workbench beyond branching scenarios.

## UX rule

The user should normally think:

> Use this source/project/template and turn it into what I need.

Not:

> Which JSON object, block, node, trigger, or file path do I need to construct?

## Testing

WorkBench browser JavaScript syntax, required Workbench workflow markers, static navigation, and existing component-builder smoke tests are covered by `.github/workflows/component-smoke.yml` and `tests/docs-navigation.test.js`.
