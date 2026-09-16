# Draft normalized learning schema

These schemas are the authoring-tool-neutral model for the Learning Experience Engine.

The engine now has two complementary schema families.

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

The two families share components, themes, assets, assessment concepts, tracking, and builders where practical.

## Design principles

1. Preserve source fidelity outside the normalized model.
2. Normalize concepts, not proprietary implementation details.
3. Do not force stateful Storyline content into a block-only structure.
4. Allow extensions while the schema is still evolving.
5. Keep IDs stable so chat-based edits can target specific objects.
6. Keep content, behavior, theme, assets, and build logic separate.
7. Preserve unknown source behaviors through generic action types instead of silently dropping them.

Storyline v0.2 is based on published Web examples covering layered interactions, video-heavy slides, image carousels, native assessment structures, and variable-driven practical assessments. It is still a draft and is not a reconstruction of the original `.story` authoring file.
