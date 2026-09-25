CREATE TABLE public.person_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id text NOT NULL,
  year integer,
  label text NOT NULL,
  place text,
  story_id uuid,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_timeline TO anon, authenticated;
GRANT ALL ON public.person_timeline TO service_role;
ALTER TABLE public.person_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read timeline" ON public.person_timeline FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can add timeline" ON public.person_timeline FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can edit timeline" ON public.person_timeline FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can remove timeline" ON public.person_timeline FOR DELETE TO anon, authenticated USING (true);