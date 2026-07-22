-- Categories → Trackers → Items (FK strictes, plus de catégorie aléatoire)

-- 1) Catégories (par utilisateur)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  kind text not null default 'custom'
    check (kind in ('sellers', 'searches', 'custom')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists idx_categories_user on public.categories(user_id);

-- 2) Trackers unifiés (toujours liés à une catégorie)
create table if not exists public.trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  type text not null check (type in ('seller', 'search')),
  domain text not null default 'vinted.fr',
  source_url text,
  photo_url text,
  is_active boolean not null default true,
  last_crawled_at timestamptz,
  created_at timestamptz not null default now(),
  -- seller
  vinted_seller_id text,
  vinted_username text not null default '',
  -- search
  search_url text,
  label text not null default '',
  parsed_filters jsonb not null default '{}'::jsonb,
  constraint trackers_seller_fields check (
    type <> 'seller' or (vinted_seller_id is not null and length(vinted_seller_id) > 0)
  ),
  constraint trackers_search_fields check (
    type <> 'search' or (search_url is not null and length(search_url) > 0)
  )
);

create unique index if not exists uq_trackers_seller
  on public.trackers (user_id, vinted_seller_id)
  where type = 'seller' and vinted_seller_id is not null;

create unique index if not exists uq_trackers_search
  on public.trackers (user_id, search_url)
  where type = 'search' and search_url is not null;

create index if not exists idx_trackers_user on public.trackers(user_id);
create index if not exists idx_trackers_category on public.trackers(category_id);
create index if not exists idx_trackers_type on public.trackers(user_id, type);

-- 3) Items liés à un tracker
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  vinted_item_id text not null,
  title text,
  brand text,
  price_cents integer,
  currency text default 'EUR',
  photo_url text,
  seller_login text,
  seller_photo_url text,
  item_url text,
  status text not null default 'active'
    check (status in ('active', 'sold', 'removed')),
  listed_at timestamptz,
  sold_at timestamptz,
  sale_speed_hours numeric,
  created_at timestamptz not null default now(),
  unique (user_id, vinted_item_id)
);

create index if not exists idx_items_user on public.items(user_id);
create index if not exists idx_items_tracker on public.items(tracker_id);
create index if not exists idx_items_sold on public.items(user_id, sold_at desc)
  where status = 'sold';

-- 4) Catégories système par défaut pour chaque profil
create or replace function public.ensure_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, slug, kind, is_system)
  values
    (p_user_id, 'Vendeurs', 'vendeurs', 'sellers', true),
    (p_user_id, 'Recherches', 'recherches', 'searches', true)
  on conflict (user_id, slug) do nothing;
end;
$$;

create or replace function public.handle_new_user_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_default_categories(new.id);
  return new;
end;
$$;

drop trigger if exists on_profile_default_categories on public.profiles;
create trigger on_profile_default_categories
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_categories();

-- Backfill catégories pour profils existants
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.ensure_default_categories(r.id);
  end loop;
end $$;

-- 5) Migration depuis seller_trackers / search_trackers / detected_sales
do $$
declare
  r record;
  cat_sellers uuid;
  cat_searches uuid;
  new_tracker_id uuid;
begin
  if to_regclass('public.seller_trackers') is not null then
    for r in select * from public.seller_trackers loop
      perform public.ensure_default_categories(r.user_id);
      select id into cat_sellers from public.categories
        where user_id = r.user_id and slug = 'vendeurs' limit 1;
      if cat_sellers is null then continue; end if;

      insert into public.trackers (
        id, user_id, category_id, type, domain, source_url, photo_url,
        is_active, last_crawled_at, created_at,
        vinted_seller_id, vinted_username
      )
      values (
        r.id, r.user_id, cat_sellers, 'seller', r.domain, r.source_url, r.photo_url,
        r.is_active, r.last_crawled_at, r.created_at,
        r.vinted_seller_id, coalesce(r.vinted_username, '')
      )
      on conflict do nothing;
    end loop;
  end if;

  if to_regclass('public.search_trackers') is not null then
    for r in select * from public.search_trackers loop
      perform public.ensure_default_categories(r.user_id);
      select id into cat_searches from public.categories
        where user_id = r.user_id and slug = 'recherches' limit 1;
      if cat_searches is null then continue; end if;

      insert into public.trackers (
        id, user_id, category_id, type, domain, source_url,
        is_active, last_crawled_at, created_at,
        search_url, label, parsed_filters
      )
      values (
        r.id, r.user_id, cat_searches, 'search', r.domain, r.search_url,
        r.is_active, r.last_crawled_at, r.created_at,
        r.search_url, coalesce(r.label, ''), coalesce(r.parsed_filters, '{}'::jsonb)
      )
      on conflict do nothing;
    end loop;
  end if;

  if to_regclass('public.detected_sales') is not null then
    for r in select * from public.detected_sales loop
      new_tracker_id := coalesce(r.seller_tracker_id, r.search_tracker_id);
      if new_tracker_id is null then
        -- rattacher au premier tracker vendeur du user si possible
        select id into new_tracker_id from public.trackers
          where user_id = r.user_id and type = 'seller' and is_active
          limit 1;
      end if;
      if new_tracker_id is null then
        select id into new_tracker_id from public.trackers
          where user_id = r.user_id and is_active
          limit 1;
      end if;
      if new_tracker_id is null then continue; end if;

      insert into public.items (
        user_id, tracker_id, vinted_item_id, title, brand, price_cents, currency,
        photo_url, seller_login, seller_photo_url, item_url,
        status, listed_at, sold_at, sale_speed_hours, created_at
      )
      values (
        r.user_id, new_tracker_id, r.vinted_item_id, r.title, r.brand, r.price_cents, coalesce(r.currency, 'EUR'),
        r.photo_url, r.seller_login, r.seller_photo_url, r.item_url,
        'sold', r.listed_at, r.sold_at, r.sale_speed_hours, r.created_at
      )
      on conflict (user_id, vinted_item_id) do nothing;
    end loop;
  end if;
end $$;

-- 6) RLS
alter table public.categories enable row level security;
alter table public.trackers enable row level security;
alter table public.items enable row level security;

do $$ begin
  create policy "categories_own" on public.categories
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "trackers_own" on public.trackers
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "items_own" on public.items
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Empêche d'assigner un tracker à la catégorie d'un autre user
create or replace function public.enforce_tracker_category_owner()
returns trigger
language plpgsql
as $$
declare
  cat_owner uuid;
begin
  select user_id into cat_owner from public.categories where id = new.category_id;
  if cat_owner is null then
    raise exception 'category_not_found';
  end if;
  if cat_owner <> new.user_id then
    raise exception 'category_user_mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_trackers_category_owner on public.trackers;
create trigger trg_trackers_category_owner
  before insert or update of category_id, user_id on public.trackers
  for each row execute procedure public.enforce_tracker_category_owner();

notify pgrst, 'reload schema';
