# Family patterns snapshot + city and studies on each person

## 1. Patterns across the family (Stories page)
Under the story counts, a "Patterns across the family" box written by AI from everything recorded:
- **Common threads**: 3-5 short themes that show up in more than one person's stories (for example "Summers in Tõrva"), each naming the people involved.
- **Connections**: pairs of people whose stories link up (same place, event or person, or two sides of the same memory), each with one line on why. Tapping a name opens that person's page.
- **Across generations**: one or two sentences on how the grandparents' stories echo or differ from the younger ones.
- It updates by itself when new stories are added, and a "Refresh" link rewrites it.
- With fewer than 2 stories, a gentle note says patterns will appear once more of the family has recorded.

On each person's page, a small "Connected stories" line lists the people whose stories link to theirs.

## 2. Where they live and what they studied (person page)
- Each person's page shows **Lives in** (city) and **Studied** (what and where, for example "Marketing at Tartu University"; more than one entry is allowed).
- An "Edit details" button opens a small form to fill these in or change them. Anyone with the link can edit, the same as stories.
- The About text and the patterns snapshot use these details too, for example linking people who studied or live in the same place.

## Technical details
- New table `person_details` (person_id text primary key, city text, studies jsonb `[{what, where}]`, updated_at), with grants and anon plus authenticated select/insert/update policies, matching the current open access.
- `src/lib/patterns.functions.ts`: builds context from stories (teller, generation, category, subtopic, question, transcript or note) plus person details, and calls the AI gateway `/v1/responses` with `openai/gpt-6-astra`, streamed, with strict JSON `{threads, connections, generations}`. Unknown person ids are dropped. 402 and 429 show friendly messages.
- Cached with react-query and keyed on story and detail updates, so it only regenerates on change or when you tap Refresh.
- The About function gets city and studies added to its context.
- UI changes in `src/routes/stories.tsx` and `src/routes/people.$id.tsx`, with the edit form in a dialog.
