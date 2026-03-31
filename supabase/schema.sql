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
