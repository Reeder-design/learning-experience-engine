# Draft normalized learning schema

These schemas are the first authoring-tool-neutral model for the Learning Experience Engine.

**Status: DRAFT v0.1 — Rise-informed, not Storyline-finalized.**

The goal is to separate learning meaning from authoring-tool implementation. Rise and Storyline source data should be preserved separately, while normalized files use a consistent vocabulary that the engine can render into multiple targets.

## Core objects

- `course.schema.json` — course-level metadata and ordered learning units
- `lesson.schema.json` — lessons/sections and their ordered blocks
- `block.schema.json` — reusable content or interaction blocks
- `assessment.schema.json` — assessments and questions
- `asset.schema.json` — media and file references

## Design principles

1. Preserve source fidelity outside the normalized model.
2. Normalize concepts, not proprietary implementation details.
3. Allow extensions while the schema is still evolving.
4. Keep IDs stable so chat-based edits can target specific objects.
5. Keep content, behavior, theme, and build logic separate.

These schemas will be reviewed after the first Storyline web export is inspected.
