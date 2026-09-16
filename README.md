# Learning Experience Engine

A reusable framework for building data-driven instructional design interactions, courses, simulations, and learning experiences.

## Project Goals

- Separate course content from presentation and interaction logic
- Build learning interactions from structured JSON
- Create reusable instructional design components
- Generate custom Rise Code Block packages
- Analyze published Rise courses
- Support standalone web learning experiences
- Support AI-assisted course development
- Maintain strict separation between public and confidential content

## Planned Capabilities

- Rise course inspection
- Rise content extraction
- Course and lesson JSON schemas
- Reusable interaction library
- Scenario engines
- Assessment components
- Theme system
- Standalone web builds
- Rise Code Block builds
- SCORM and xAPI exploration
- Public portfolio demonstrations
- Confidentiality validation

## Repository Structure

- `components/` — reusable learning interactions
- `content/demos/` — public, sanitized demo content
- `content/examples/` — fictional examples and fixtures
- `schemas/` — course, lesson, interaction, and assessment schemas
- `themes/` — reusable visual systems
- `engine/` — rendering, tracking, asset, and validation logic
- `builders/` — output builders for web, Rise, and future LMS packages
- `tools/` — inspection, extraction, migration, and authoring utilities
- `scripts/` — validation and automation scripts
- `docs/` — GitHub Pages documentation and demos
- `tests/` — automated tests
- `dist/public/` — generated public-safe output

## Confidentiality

This is a public repository.

Confidential company, customer, and internal course content must remain outside this repository. Local confidential source material belongs in the separate sibling folder `learning-content-private/` and must never be committed here.

See `CONFIDENTIALITY.md` for project rules.

## Status

Early development and architecture phase.
