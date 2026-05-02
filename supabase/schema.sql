create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  image_url text not null,
  description text not null,
  price numeric(10, 2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Public read products" on public.products;
create policy "Public read products"
on public.products
for select
to public
using (true);

drop policy if exists "No direct write products" on public.products;
create policy "No direct write products"
on public.products
for all
to public
using (false)
with check (false);

create table if not exists public.ai_usage_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null,
  description text not null,
  request_type text not null check (request_type in ('text', 'image')),
  model text not null,
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  total_tokens bigint check (total_tokens is null or total_tokens >= 0),
  estimated_cost_usd numeric(12, 6) not null default 0 check (estimated_cost_usd >= 0),
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ai_usage_logs_created_at_idx on public.ai_usage_logs (created_at desc);
create index if not exists ai_usage_logs_model_idx on public.ai_usage_logs (model);
create index if not exists ai_usage_logs_source_idx on public.ai_usage_logs (source);

alter table public.ai_usage_logs enable row level security;

drop policy if exists "No direct read usage logs" on public.ai_usage_logs;
create policy "No direct read usage logs"
on public.ai_usage_logs
for select
to public
using (false);

drop policy if exists "No direct write usage logs" on public.ai_usage_logs;
create policy "No direct write usage logs"
on public.ai_usage_logs
for all
to public
using (false)
with check (false);

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  mobile text not null unique,
  is_admin boolean not null default false,
  profile_image_url text,
  profile_analysis jsonb,
  profile_analysis_saved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_mobile_idx
on public.users (mobile);

alter table public.users enable row level security;

drop policy if exists "No direct read users" on public.users;
create policy "No direct read users"
on public.users
for select
to public
using (false);

drop policy if exists "No direct write users" on public.users;
create policy "No direct write users"
on public.users
for all
to public
using (false)
with check (false);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx
on public.sessions (user_id);

create index if not exists sessions_token_idx
on public.sessions (session_token);

alter table public.sessions enable row level security;

drop policy if exists "No direct read sessions" on public.sessions;
create policy "No direct read sessions"
on public.sessions
for select
to public
using (false);

drop policy if exists "No direct write sessions" on public.sessions;
create policy "No direct write sessions"
on public.sessions
for all
to public
using (false)
with check (false);

create table if not exists public.product_tryons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  generated_image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists product_tryons_user_id_idx
on public.product_tryons (user_id);

create index if not exists product_tryons_product_id_idx
on public.product_tryons (product_id);

create index if not exists product_tryons_created_at_idx
on public.product_tryons (created_at desc);

alter table public.product_tryons enable row level security;

drop policy if exists "No direct read product tryons" on public.product_tryons;
create policy "No direct read product tryons"
on public.product_tryons
for select
to public
using (false);

drop policy if exists "No direct write product tryons" on public.product_tryons;
create policy "No direct write product tryons"
on public.product_tryons
for all
to public
using (false)
with check (false);
