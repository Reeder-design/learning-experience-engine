# Storyline Inspector

Inspects an Articulate Storyline **Publish → Web** ZIP without executing the published JavaScript.

## Usage

```bash
npm run inspect-storyline -- <storyline-web.zip>
```

Write the structured report to JSON:

```bash
npm run inspect-storyline -- <storyline-web.zip> --output report.json
```

Print JSON instead of the human-readable report:

```bash
npm run inspect-storyline -- <storyline-web.zip> --json
```

## Extracted with high confidence

- project metadata and Storyline runtime version
- real scenes and slides (message/prompt scenes excluded from normal counts)
- slide dimensions and transitions
- slide layers and timeline durations
- project variables
- asset library and media/caption counts
- Storyline object kinds
- trigger/action kinds
- alt-text and tab-enabled object signals
- custom JavaScript blocks emitted through Storyline's published script files

## Heuristic analysis

The inspector also labels useful signals such as:

- layered interactions
- native assessment/evaluation slides
- conditional + variable-driven interaction logic
- likely author-defined vs generated/system variables

These classifications are explicitly heuristic because a Storyline Web publish is generated runtime data, not the original `.story` authoring file.

## Important limitation

The inspector does not claim to reconstruct the original Storyline project perfectly. Some authoring-time names, UI organization, or source-only features may not be emitted into the published Web output. The tool keeps direct extracted facts separate from inferred classifications for that reason.
