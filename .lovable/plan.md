# Stories without a topic

## Goal
Let someone record a story without picking an area (topic) first — just choose who's telling, then speak or write.

## What will change

### Tell a story flow
- On the "Pick an area" step, add a pill **"No topic — just tell it"** next to the topic buttons and "Surprise me".
- Choosing it skips the generated question entirely: the page goes straight to the recording controls, with an optional line to type what it's about (e.g. "How Grandma and Grandpa met") instead of the fixed question.
- Everything else stays the same: audio recording, listen-back, transcription, note, photo/video, sensitive-story check, save.

### Showing topicless stories
- Story cards show **"A story"** in place of the topic line; the headline shows the person's own "what it's about" text, or nothing if they didn't type one.
- Topicless stories appear in the all-stories list, person pages, and patterns/timeline/question-box context exactly like other stories; they simply don't appear under any topic in the topic grid or topic timeline, and topic counts don't include them.

## Technical details
- Migration: `ALTER TABLE public.stories ALTER COLUMN category_id DROP NOT NULL`, same for `subtopic_id` and `question` (all currently NOT NULL). Regenerate the Supabase types after.
- `src/routes/record.tsx`: add a `freeStory` state; when set, hide the question box and allow saving without a `pick`, storing null category/subtopic and the optional typed line as `question`.
- `src/components/StoryCard.tsx`: render "A story" when `category_id` is null and guard the headline.
- `src/routes/stories.tsx`, person pages, and the AI context builders (`family-context.server.ts`, patterns, timeline): already tolerate missing topic data after null-guards; verify each place that reads `question`/`category_id`/`subtopic_id`.
- Topic timeline: free stories can't be grouped under a subtopic — they're naturally excluded because the timeline only renders for a selected category.

## Verification
- Record a topicless story with audio, confirm it saves, plays back, transcribes, and survives a refresh.
- Confirm it shows as "A story" on the Stories page and the person's page, with no topic filter matching it.
- Confirm a normal topic story still works end-to-end and the build stays clean.
