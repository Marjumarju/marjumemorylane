CREATE TABLE public.person_details (
  person_id text PRIMARY KEY,
  city text,
  studies jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.person_details TO anon, authenticated;
GRANT ALL ON public.person_details TO service_role;
ALTER TABLE public.person_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read details" ON public.person_details FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can add details" ON public.person_details FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update details" ON public.person_details FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);