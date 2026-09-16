# Draft normalized learning schema

These schemas are the authoring-tool-neutral model for the Learning Experience Engine.

**Status: DRAFT v0.1 — now informed by both Rise and Storyline published output.**

The goal is to separate learning meaning from authoring-tool implementation. Rise and Storyline source data stay preserved separately, while normalized files use a consistent engine vocabulary that can later render into multiple targets.

## Two complementary learning models

The engine now supports two different structural families instead of forcing every tool into one shape.

### Document / block experiences

Best suited to Rise-style courses and other vertically structured learning.

- `course.schema.json` — course-level metadata and ordered learning units
- `lesson.schema.json` — lessons/sections and their ordered blocks
- `block.schema.json` — reusable content or interaction blocks
- `assessment.schema.json` — assessments and questions
- `asset.schema.json` — media and file references

### Stateful / slide experiences

Best suited to Storyline-style simulations, interactions, and timeline-driven content.

- `experience.schema.json` — scenes, variables, assets, canvas, and stateful-experience metadata
- `slide.schema.json` — slide canvas, layers, objects, states, events, actions, and timelines

The two families are intended to share components, themes, assets, assessment concepts, tracking, and builders where practical.

## Design principles

1. Preserve source fidelity outside the normalized model.
2. Normalize concepts, not proprietary implementation details.
3. Do not force stateful Storyline content into a block-only structure.
4. Allow extensions while the schema is still evolving.
5. Keep IDs stable so chat-based edits can target specific objects.
6. Keep content, behavior, theme, assets, and build logic separate.
7. Preserve unknown source behaviors through references or generic action types instead of silently dropping them.

These schemas will continue to evolve as additional Storyline interaction, assessment, multimedia, and simulation examples are normalized and rendered.
