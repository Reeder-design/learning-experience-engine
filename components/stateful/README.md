# Stateful component library

Reusable presentation adapters for normalized stateful learning experiences.

The stateful runtime always preserves the generic scene/slide/layer/object model. Components sit on top of that model and enhance common interaction patterns when the normalized structure provides enough evidence to do so.

Current adapters:

- `carousel` — detects a horizontally arranged image strip and rebuilds it as an accessible paged carousel.
- `hotspot-reveal` — detects multiple clickable objects that reveal layers and adds labeled hotspots, viewed-state feedback, and layer-close controls.
- `assessment-shell` — detects native or question-like assessment slides and adds assessment progress, score feedback, and answer/feedback styling.

## Design rules

1. Components must be authoring-tool neutral at runtime.
2. Detection may use Storyline-derived normalized behavior, but rendering must not require the Storyline runtime.
3. Components must fail safely back to the generic stateful renderer.
4. No company/customer/course-specific strings or assets belong here.
5. Components must support keyboard use and reduced-motion preferences.
6. Theme tokens should control visual styling rather than hard-coded client branding.

Browser integration is implemented by `components/stateful/components.js` and `components/stateful/components.css`, which the stateful web builder packages into generated previews.
