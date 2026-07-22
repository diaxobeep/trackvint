-- Trackers unifiés : vendeurs + niches/recherches + ventes détectées

create table if not exists public.seller_trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vinted_seller_id text not null,
  vinted_username text not null default '',
  domain text not null default 'vinted.fr',
  photo_url text,
  source_url text,
  is_active boolean not null default true,
  last_crawled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, vinted_seller_id)
);

create table if not exists public.search_trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  search_url text not null,
  label text not null default '',
  parsed_filters jsonb not null default '{}'::jsonb,
  domain text not null default 'vinted.fr',
  is_active boolean not null default true,
  last_crawled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, search_url)
);

create table if not exists public.detected_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  seller_tracker_id uuid references public.seller_trackers(id) on delete set null,
  search_tracker_id uuid references public.search_trackers(id) on delete set null,
  vinted_item_id text not null,
  title text,
  brand text,
  price_cents integer,
  currency text default 'EUR',
  photo_url text,
  seller_login text,
  seller_photo_url text,
  item_url text,
  listed_at timestamptz,
  sold_at timestamptz not null default now(),
  sale_speed_hours numeric,
  created_at timestamptz not null default now(),
  unique (user_id, vinted_item_id)
);

create index if not exists idx_seller_trackers_user on public.seller_trackers(user_id);
create index if not exists idx_search_trackers_user on public.search_trackers(user_id);
create index if not exists idx_detected_sales_user_sold on public.detected_sales(user_id, sold_at desc);

alter table public.seller_trackers enable row level security;
alter table public.search_trackers enable row level security;
alter table public.detected_sales enable row level security;

do $$ begin
  create policy "seller_trackers_own" on public.seller_trackers
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "search_trackers_own" on public.search_trackers
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "detected_sales_own" on public.detected_sales
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
