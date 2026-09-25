# About section on each person's page

Add an "About" section to every person's page: a short, warm paragraph written by AI from two things — the era they were born in (from the family data's generation context) and the stories they have told so far. It refreshes as new stories are added.

## What you'll see

- On each person's page, under their photo and name, an "About Marju" box with 2–4 sentences.
- With no stories yet, it describes their generation and era (e.g. growing up in Soviet-era Estonia) and gently invites the first story.
- As stories are recorded, the text weaves in what they've shared — childhood, work, food, love — in their own words' spirit.
- A small "Refresh" option so the text can be rewritten after new stories arrive.

## How it works

1. New server function `getPersonAbout` (src/lib/about.functions.ts): given the person id, it gathers their era context from family.json and their stories (questions + transcripts) from the database, then asks the AI (Lovable AI Gateway, default model) for a short paragraph.
2. The person page (src/routes/people.$id.tsx) calls it and shows the result in the About box, with a loading state.
3. Result is cached per person and re-fetched when their story count changes, so it stays fresh without an AI call on every visit.
4. Failures fall back to the plain generation text, so the page never breaks.

## Technical notes

- AI call runs server-side only (LOVABLE_API_KEY never in the browser), streamed per the gateway Responses contract, model `openai/gpt-6-astra`.
- No database schema changes needed.
- Verified with a typecheck and a live check of one person's page.
