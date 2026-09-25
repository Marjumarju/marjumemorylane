# Make each person's page only about them

## What changes
On a person's page (e.g. Marju's), remove the things that talk about other people:
- The "Parents / Partner / Children" lines under the name.
- The italic paragraph describing their whole generation (it describes the family group, not the person).

## What stays
- Photo, name, age.
- The story snapshot box (how many stories, topics covered), which fills in as stories are recorded.
- The record buttons.
- "In Marju's own words", plus "Stories about..." only where it exists today (the grandchildren).

## Technical details
- `src/routes/people.$id.tsx`: delete the relations block (`rel(...)` calls and helper, plus unused `parents`, `partner`, `kids`), delete the `app.generation_context` paragraph, and the "Generation N" label; clean up unused imports.
