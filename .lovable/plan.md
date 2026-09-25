# Delete voice notes

Let anyone remove a recorded story — both its audio file and its entry — right from the story card.

## What changes

1. **Delete button on each story card** — a small trash icon on the card. Tapping it asks "Delete this story? This can't be undone." with Delete / Cancel choices, so nobody removes a memory by accident.
2. **Removes everything** — confirming deletes the audio file from storage and the story's entry, so no orphaned recordings are left behind.
3. **Page updates instantly** — the story disappears from the family tree counts, person pages, and the Stories list without a refresh.

## Technical details

- The stories table currently only lets signed-in authors delete rows, but the app has no login — so a small database change will allow deletion for everyone (matching the existing "anyone can add/read" setup). Same for the audio files in the recordings bucket.
- Implementation: add a delete policy for `anon` on `public.stories` and on `storage.objects` for the `recordings` bucket; add a delete mutation in `src/components/StoryCard.tsx` that removes the storage object (when `audio_path` exists) then the row, and invalidates the stories query.
- Note: since the app is public without login, anyone with the link can delete stories. When sign-in is turned back on later, deletion can be restricted to the person who recorded it.
