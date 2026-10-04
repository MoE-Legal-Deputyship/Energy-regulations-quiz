-- Results table for the quiz website. Run once in Supabase → SQL Editor.
-- Participants (the public "anon" role) may only add rows; only you can read
-- them, in Table Editor → results (Export → CSV opens in Excel).
create table public.results (
  id bigint generated always as identity primary key,
  submitted_at timestamptz not null default now(),
  department text, name text,
  score int, total int, percent int, duration_seconds int,
  by_level text, by_system text, wrong text, answers jsonb
);
alter table public.results enable row level security;
grant insert on table public.results to anon;
create policy "participants can submit" on public.results
  for insert to anon with check (true);
