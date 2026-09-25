-- Allow stories that are told without a topic: no category, no subtopic, no fixed question
ALTER TABLE public.stories ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE public.stories ALTER COLUMN subtopic_id DROP NOT NULL;
ALTER TABLE public.stories ALTER COLUMN question DROP NOT NULL;