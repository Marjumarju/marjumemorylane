GRANT DELETE ON public.stories TO anon;

CREATE POLICY "Anyone can delete stories"
ON public.stories FOR DELETE TO anon
USING (true);

CREATE POLICY "Anyone can delete recordings"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'recordings');