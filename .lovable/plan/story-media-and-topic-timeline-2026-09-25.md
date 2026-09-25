# Story media and topic timeline

## Goal
Let each family story include one photo or short video clip, while keeping the data ready for a future gallery. Rework topic results into a visual timeline that makes related stories easy to follow.

## What will change

### Add media to a story
- Add an optional **Photo or video** step to the existing Tell a story flow.
- Accept common photo formats and short browser-playable video clips, with a preview before saving and clear file-size/type feedback.
- Save the story first, then attach its media safely; if the media upload fails, keep the story and offer a retry rather than losing the recording.
- Show the photo prominently or the video with familiar playback controls alongside the story.

### Manage media later
- Add an attachment action on saved stories so a family member can add, replace, or remove the photo/video later.
- When a story is deleted, remove its audio and attached media too.
- Start with one visible attachment per story, but store attachments as separate records so multiple-item galleries can be added later without redesigning the data.

### Make same-topic stories easier to follow
- When a topic is selected, replace the current flat card stack with a **visual story timeline**.
- Group entries under the topic’s subtopics, ordered by story date, with a clear connecting line, storyteller portrait/name, question, media preview, audio, and transcript or note.
- Keep person filtering available and make the selected topic and result count obvious.
- Preserve the current all-topics overview, family question box, and patterns section when no topic is selected.
- On small screens, use a simple single-column timeline; on wider screens, keep the reading order clear rather than alternating entries unpredictably.

## Technical details
- Create a `story_media` table linked to `stories`, with media type, storage path, original filename, ordering, and timestamps. Add the required public access grants and policies matching the app’s current no-login mode.
- Create a private `story-media` storage bucket with image/video MIME restrictions and a practical per-file limit; serve files through temporary signed links like recordings.
- Extend story queries to include media records and add focused upload, replacement, removal, and cleanup helpers.
- Split the display into reusable media and topic-timeline components so the existing person pages can show attachments without duplicating logic.
- Keep all current audio recording, transcription, deletion, filters, and story data working unchanged.

## Verification
- Create a story with a photo and another with a short video; confirm previews, saving, playback, and persistence after refresh.
- Add, replace, and remove media on an existing story, then confirm story deletion cleans up both audio and media.
- Check a populated topic timeline with person filtering on desktop and mobile, plus empty and media-free stories.
- Confirm the Stories page metadata remains complete and the final preview has no build or runtime errors.
