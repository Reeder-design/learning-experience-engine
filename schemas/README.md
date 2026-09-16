# Draft normalized learning schemas

These schemas form the authoring-tool-neutral model for the Learning Experience Engine.

The engine now has three complementary schema families.

## Document / block experiences — v0.1

Best suited to Rise-style courses and other vertically structured learning.

- `course.schema.json` — course-level metadata and ordered learning units
- `lesson.schema.json` — lessons/sections and their ordered blocks
- `block.schema.json` — reusable content or interaction blocks
- `assessment.schema.json` — assessments and questions
- `asset.schema.json` — media and file references

## Stateful / slide experiences — v0.2

Added after inspecting multiple real Storyline Web publishes. This model supports simulations, slide interactions, and timeline-driven content without forcing them into a block-only hierarchy.

- `experience.schema.json` — scenes, variables, assets, canvas, and stateful-experience metadata
- `slide.schema.json` — slide canvas, layers, positioned objects, states, events, action groups, conditions, and timelines

## Engine-native components — v0.1

This is the preferred authoring model for new reusable interactions. It describes the instructional interaction directly instead of reproducing Rise or Storyline implementation details.

- `component.schema.json` — a compact contract for reusable components such as carousels, hotspot reveals, assessments, media presentations, and branching scenarios

Current engine-native component types:

- `carousel`
- `hotspot-reveal`
- `assessment`
- `media-presentation`
- `branching-scenario`

`branching-scenario` adds a compact model for decision practice:

```text
scenario
├── start node
├── optional decision-quality score
├── decision nodes
│   └── choices
│       ├── feedback
│       ├── score change
│       └── target node/outcome
└── outcomes
```

The first scenario contract intentionally uses one simple score rather than exposing arbitrary variables/conditions by default. Richer state can be added as an extension once a learning simulation actually needs it.

Example conceptual flow:

```text
Author / ChatGPT / browser authoring UI
          ↓
component JSON
          ↓
Learning Experience Engine
          ↓
themed browser interaction
```

The component model is intentionally simpler than imported Storyline data. A hotspot interaction, for example, stores hotspot coordinates and reveal content rather than layers, trigger IDs, and proprietary runtime actions. A branching scenario stores learner decisions and destinations rather than reproducing a slide/trigger implementation.

## How the schema families work together

```text
Existing Rise content      → document/block normalization
Existing Storyline content → stateful/slide normalization
New interaction            → engine-native component definition
```

All three families are intended to share themes, assets, assessment concepts, completion events, tracking, and output builders where practical.

## Design principles

1. Preserve imported source fidelity outside the normalized model.
2. Normalize learning concepts, not proprietary implementation details.
3. Do not force stateful Storyline content into a block-only structure.
4. Prefer compact engine-native contracts for newly authored interactions.
5. Allow extensions while the schemas are still evolving.
6. Keep IDs stable so chat-based edits can target specific objects.
7. Keep content, behavior, theme, assets, and build logic separate.
8. Preserve unknown source behaviors through generic action types instead of silently dropping them.

Storyline v0.2 is based on published Web examples covering layered interactions, video-heavy slides, image carousels, native assessment structures, and variable-driven practical assessments. It is still a draft and is not a reconstruction of the original `.story` authoring file.
