alter table public.stories alter column created_by set default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
grant select, insert on public.stories to anon;
create policy "Anyone can read stories" on public.stories for select to anon using (true);
create policy "Anyone can add stories" on public.stories for insert to anon, authenticated with check (true);
create policy "Anyone can read recordings" on storage.objects for select to anon using (bucket_id = 'recordings');
create policy "Anyone can upload recordings" on storage.objects for insert to anon, authenticated with check (bucket_id = 'recordings');