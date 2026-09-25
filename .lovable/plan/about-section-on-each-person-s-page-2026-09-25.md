# Family patterns snapshot

A new "Patterns" box on the Stories page, written by AI from everything the family has recorded.

## What you'll see
Under the story counts on the Stories page, a "Patterns across the family" box with:
- **Common threads**: 3-5 short themes that show up in more than one person's stories (for example "Summers in Tõrva", "Leaving home for work"), each naming the people who touch on it.
- **Connections**: pairs of people whose stories link up, like the same place, event or person, or a parent and child describing the same thing from different sides. Each has one line on why they connect, and tapping a name opens that person's page.
- **Across generations**: one or two sentences on how the grandparents' stories differ from or echo those of the younger generations.
- A "Refresh" link to rewrite it, and it updates on its own when new stories are added.
- If there are fewer than 2 stories, a gentle note that patterns appear once more of the family has recorded.

On each person's page, a small "Connected stories" line lists the other people whose stories link to theirs, taken from the same snapshot.

## Technical details
- New server function `src/lib/patterns.functions.ts`: builds context (each story's teller, age/generation, category, subtopic, question, transcript/note) and calls the AI gateway `/v1/responses` with `openai/gpt-6-astra`, streamed, with strict JSON output `{ threads:[{title,summary,people[]}], connections:[{a,b,why}], generations:string }`. Person ids are checked against family.json and unknown ones dropped. 402/429 are shown as friendly messages.
- Cached on the client with react-query, keyed on story ids and the latest update, so it only regenerates when stories change or you tap Refresh.
- UI in `src/routes/stories.tsx` (only when no filter is on) and a small connections line in `src/routes/people.$id.tsx`. No database changes.
