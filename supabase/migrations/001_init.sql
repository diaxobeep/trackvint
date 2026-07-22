-- TrackVint · schéma Supabase initial
-- Exécute dans SQL Editor après création du projet.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vinted_id text not null,
  login text not null,
  domain text default 'vinted.fr',
  photo_url text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, vinted_id)
);

create table if not exists public.tracked_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete set null,
  vinted_item_id text not null,
  title text,
  brand text,
  price_cents integer,
  status text not null default 'active' check (status in ('active', 'sold', 'removed')),
  listed_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, vinted_item_id)
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.sellers enable row level security;
alter table public.tracked_items enable row level security;
alter table public.folders enable row level security;

create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "sellers_own" on public.sellers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "items_own" on public.tracked_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "folders_own" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
