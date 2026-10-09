-- CollabBoard: run once in Supabase → SQL Editor → New query → paste → Run.
-- Creates the portfolios table, a public media bucket, and the rules that let
-- anyone read published portfolios but only the owner change their own.

create table if not exists public.portfolios (
  owner uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  data jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;

drop policy if exists "Published portfolios are public" on public.portfolios;
create policy "Published portfolios are public" on public.portfolios
  for select using (published or owner = auth.uid());

drop policy if exists "Owners add their portfolio" on public.portfolios;
create policy "Owners add their portfolio" on public.portfolios
  for insert to authenticated with check (owner = auth.uid());

drop policy if exists "Owners update their portfolio" on public.portfolios;
create policy "Owners update their portfolio" on public.portfolios
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "Owners delete their portfolio" on public.portfolios;
create policy "Owners delete their portfolio" on public.portfolios
  for delete to authenticated using (owner = auth.uid());

-- Photos and videos: public to view, 50 MB per file, images and videos only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-media', 'portfolio-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Media is public" on storage.objects;
create policy "Media is public" on storage.objects
  for select using (bucket_id = 'portfolio-media');

drop policy if exists "Creators upload to their own folder" on storage.objects;
create policy "Creators upload to their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Creators delete their own files" on storage.objects;
create policy "Creators delete their own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text);
