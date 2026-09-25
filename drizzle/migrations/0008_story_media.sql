CREATE TABLE public.story_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_path text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_media TO anon, authenticated;
GRANT ALL ON public.story_media TO service_role;
ALTER TABLE public.story_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read story media" ON public.story_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can add story media" ON public.story_media FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update story media" ON public.story_media FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can remove story media" ON public.story_media FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX story_media_story_id_idx ON public.story_media (story_id, sort_order, created_at);

CREATE POLICY "Anyone can read story media files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'story-media');
CREATE POLICY "Anyone can upload story media files" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'story-media');
CREATE POLICY "Anyone can update story media files" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'story-media') WITH CHECK (bucket_id = 'story-media');
CREATE POLICY "Anyone can remove story media files" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'story-media');