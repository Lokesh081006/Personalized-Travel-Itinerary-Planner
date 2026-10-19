create extension if not exists "pgcrypto";

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  destination text not null,
  country text not null default '',
  start_date date not null,
  end_date date not null,
  travelers integer not null check (travelers between 1 and 20),
  budget numeric not null check (budget > 0),
  currency text not null default 'USD',
  interests jsonb not null default '[]'::jsonb,
  pace text not null default 'Balanced',
  accommodation text not null default '',
  notes text not null default '',
  status text not null default 'upcoming',
  summary text not null default '',
  total_estimated_cost numeric not null default 0,
  itinerary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trips_created_at_idx on public.trips (created_at desc);

alter table public.trips enable row level security;

-- The backend uses the service role key and bypasses RLS. Add user_id and
-- authenticated-user policies here when you add Supabase Auth to the product.
