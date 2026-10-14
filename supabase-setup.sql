-- CollabBoard: run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
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

-- Photos, videos and PDFs: public to view, 50 MB per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-media', 'portfolio-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf'])
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

-- Each creator's private data: profile, saved and applied collabs, and the portfolio draft.
-- Only the owner can read or change it.
create table if not exists public.creator_state (
  owner uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.creator_state enable row level security;

drop policy if exists "Owners read their data" on public.creator_state;
create policy "Owners read their data" on public.creator_state
  for select to authenticated using (owner = auth.uid());

drop policy if exists "Owners add their data" on public.creator_state;
create policy "Owners add their data" on public.creator_state
  for insert to authenticated with check (owner = auth.uid());

drop policy if exists "Owners update their data" on public.creator_state;
create policy "Owners update their data" on public.creator_state
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- Contact form messages from the website. Anyone can send one; nobody can read them
-- through the website (view them in Supabase → Table Editor → contact_messages).
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  topic text check (char_length(topic) <= 60),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can send a message" on public.contact_messages;
create policy "Anyone can send a message" on public.contact_messages
  for insert to anon, authenticated with check (true);

-- Portfolio analytics (same as analytics-setup.sql)

create table if not exists public.portfolio_events (
  id bigint generated always as identity primary key,
  slug text not null,
  kind text not null check (kind in ('open', 'visit', 'click')),
  visitor text not null check (char_length(visitor) between 8 and 64),
  is_new boolean not null default false,
  module_id text check (char_length(module_id) <= 40),
  module_type text check (char_length(module_type) <= 20),
  label text check (char_length(label) <= 120),
  created_at timestamptz not null default now()
);

create index if not exists portfolio_events_slug_time on public.portfolio_events (slug, created_at);

alter table public.portfolio_events enable row level security;

-- Anyone can record an event, but only for a portfolio that is published.
drop policy if exists "Visitors record events on published portfolios" on public.portfolio_events;
create policy "Visitors record events on published portfolios" on public.portfolio_events
  for insert to anon, authenticated
  with check (exists (select 1 from public.portfolios p where p.slug = portfolio_events.slug and p.published));

-- Only the owner of the portfolio can read its events. Nobody can change or delete them.
drop policy if exists "Owners read their portfolio events" on public.portfolio_events;
create policy "Owners read their portfolio events" on public.portfolio_events
  for select to authenticated
  using (exists (select 1 from public.portfolios p where p.slug = portfolio_events.slug and p.owner = auth.uid()));

-- Totals for the dashboard. Runs with the caller's rights, so the rule above keeps each creator's numbers private.
create or replace function public.portfolio_stats(p_slug text, p_since timestamptz)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'opens', count(*) filter (where kind = 'open'),
    'visits', count(*) filter (where kind = 'visit'),
    'unique', count(distinct visitor) filter (where kind in ('open', 'visit')),
    'new', count(distinct visitor) filter (where kind = 'visit' and is_new),
    'clicks', count(*) filter (where kind = 'click'),
    'modules', coalesce((
      select json_agg(m order by m.clicks desc)
      from (
        select module_id, max(module_type) as module_type, max(label) as label, count(*) as clicks
        from public.portfolio_events
        where slug = p_slug and created_at >= p_since and kind = 'click'
        group by module_id
      ) m
    ), '[]'::json)
  )
  from public.portfolio_events
  where slug = p_slug and created_at >= p_since;
$$;

grant execute on function public.portfolio_stats(text, timestamptz) to authenticated;
