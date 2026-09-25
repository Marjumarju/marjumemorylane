# Hear your recording back + automatic transcripts

## What you'll get
- Right after you stop recording, a clear "Listen back" player appears that actually plays, so you can check it before saving (or tap "Record again").
- Saved stories play reliably on the story cards and person pages.
- Every recording is turned into written text automatically. You see the transcript on the Tell a story page before saving (and can fix typos), and it shows under the player on each story card.
- Older stories without text get a "Make transcript" button.

## Technical details
- Playback bug: the preview uses `URL.createObjectURL(blob)` inline in render, creating a new URL every re-render (timer, typing), which resets/breaks the player. Create it once per blob in state/`useMemo`, revoke on change. Pick a supported mime type (`audio/webm;codecs=opus`, else `audio/mp4`) and fall back when `mr.mimeType` is empty so the Blob has a playable type. Record with a timeslice so chunks are always collected.
- Saved playback: verify signed URLs load for anon in Playwright; fix the storage read policy if not.
- Migration: add `transcript text` column to `public.stories` (plus anon/authenticated UPDATE grant + policy limited to this use).
- Server function `transcribeAudio` (createServerFn): receives the audio (base64/FormData), calls Lovable AI Gateway `/v1/audio/transcriptions` with `google/gemini-3.5-transcribe`, returns text; surfaces 402/429 errors as friendly toasts.
- record.tsx: after stop, auto-transcribe, show editable transcript box with "Transcribing…" state; save `transcript` with the story.
- StoryCard: show transcript text; "Make transcript" for stories with audio but no text (downloads audio, transcribes, updates row).
- Verify end-to-end with a spoken test sample.
