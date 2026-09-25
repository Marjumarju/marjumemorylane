-- Labels from the story classifier (see docs/jev.md). All nullable: a story saves fine
-- when no classifier is configured or the call fails.
ALTER TABLE public.stories
  ADD COLUMN on_topic real,
  ADD COLUMN richness real,
  ADD COLUMN mood text,
  ADD COLUMN sensitive real,
  -- Which model answered, and whether its numbers are calibrated probabilities.
  ADD COLUMN labels_provider text;
