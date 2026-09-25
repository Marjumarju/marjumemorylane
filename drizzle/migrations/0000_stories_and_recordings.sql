create table public.stories (
  id uuid primary key default gen_random_uuid(),
  storyteller_id text not null,
  about_person_id text,
  category_id text not null,
  subtopic_id text not null,
  question text not null,
  title text,
  note text,
  audio_path text,
  duration_seconds integer,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.stories to authenticated;
grant all on public.stories to service_role;
alter table public.stories enable row level security;
create policy "Family can read stories" on public.stories for select to authenticated using (true);
create policy "Family can add stories" on public.stories for insert to authenticated with check (created_by = auth.uid());
create policy "Authors update own stories" on public.stories for update to authenticated using (created_by = auth.uid());
create policy "Authors delete own stories" on public.stories for delete to authenticated using (created_by = auth.uid());

create policy "Family can read recordings" on storage.objects for select to authenticated using (bucket_id = 'recordings');
create policy "Family can upload recordings" on storage.objects for insert to authenticated with check (bucket_id = 'recordings' and owner = auth.uid());