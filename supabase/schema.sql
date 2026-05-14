-- ─────────────────────────────────────────────────────────────
--  FERO — waitlist schéma pre Supabase
--  Spustite v Supabase → SQL Editor → New query → Run.
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.waitlist (
  id               uuid          primary key default gen_random_uuid(),
  created_at       timestamptz   not null     default now(),

  -- form data
  name             text          not null,
  email            text          not null,
  phone            text,
  company          text          not null,
  team_size        text          not null,
  current_system   text          not null,
  pain             text          not null,
  source           text,
  wants_interview  boolean       not null     default false,

  -- meta
  ip               text,
  user_agent       text,

  -- email is unique → bránime duplicitným zápisom (HTTP 409)
  constraint waitlist_email_unique unique (email)
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);
create index if not exists waitlist_interview_idx  on public.waitlist (wants_interview)
  where wants_interview = true;

-- ─── Row-Level Security ───
-- Service-role kľúč RLS obchádza (server-side insert), takže nás chráni
-- pred priamym čítaním cez anon / verejnosť.
alter table public.waitlist enable row level security;

-- Žiadne SELECT/INSERT pre anon ani authenticated — všetko ide cez backend.
drop policy if exists "deny anon read"   on public.waitlist;
drop policy if exists "deny anon insert" on public.waitlist;
-- (Nevytvárame žiadne policies = default deny.)

-- ─── Pohľad pre Founder dashboard (voliteľné) ───
create or replace view public.waitlist_summary as
  select
    count(*)                                   as total,
    count(*) filter (where wants_interview)    as want_interview,
    count(*) filter (where created_at > now() - interval '7 days') as last_7_days
  from public.waitlist;

-- ─── Hotovo ───
-- Cez API route /api/waitlist sa budú zapisovať nové submissions.
-- Pozrite ich v Supabase → Table editor → waitlist.
