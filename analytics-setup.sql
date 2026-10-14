-- Collab Pro portfolio analytics: run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
-- Records opens, visits and module clicks on published portfolios. Only the portfolio's owner can read them.
-- No names, emails or IP addresses are stored: a visitor is a random ID kept in their own browser.

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
