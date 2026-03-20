-- Grail (Supabase) schema
-- Source of truth for MVP + launch pricing/broker-grade features.

-- Required extensions
create extension if not exists pgcrypto;

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  currency_preference text not null default 'USD' check (currency_preference in ('USD','EUR','GBP','CNY')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trades (Trades)
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  skin_name text not null,
  wear text not null check (wear in ('FN','MW','FT','WW','BS')),
  variant text not null default 'none' check (variant in ('none','stattrak','souvenir')),
  float_value decimal(5,4) check (float_value >= 0 and float_value <= 1),
  image_url text,
  buy_price decimal(10,2) not null,
  sell_price decimal(10,2),
  status text not null default 'open' check (status in ('open','sold')),
  currency text not null default 'USD' check (currency in ('USD','EUR','GBP','CNY')),
  buy_date date not null,
  sell_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sell_after_buy check (sell_date is null or sell_date >= buy_date)
);

-- Loadouts (Loadouts)
create table if not exists loadouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  is_public boolean not null default false,
  slots jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Targets (Watchlist)
create table if not exists targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  skin_name text not null,
  wear text check (wear in ('FN','MW','FT','WW','BS')),
  variant text not null default 'none' check (variant in ('none','stattrak','souvenir')),
  image_url text,
  target_price decimal(10,2) not null,
  currency text not null default 'USD' check (currency in ('USD','EUR','GBP','CNY')),
  min_float decimal(5,4) check (min_float >= 0 and min_float <= 1),
  max_float decimal(5,4) check (max_float >= 0 and max_float <= 1),
  status text not null default 'hunting' check (status in ('hunting','acquired','abandoned')),
  acquired_price decimal(10,2),
  acquired_date date,
  notes text,
  marketplace_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint float_range_valid check (min_float is null or max_float is null or min_float <= max_float),
  constraint acquired_requires_fields check (
    status <> 'acquired'
    or (acquired_price is not null and acquired_date is not null)
  )
);

-- Watchlist groups (broker-like marketwatch)
create table if not exists target_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists target_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  watchlist_id uuid not null references target_watchlists(id) on delete cascade,
  target_id uuid not null references targets(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (watchlist_id, target_id)
);

-- Static CS2 items (canonical catalog)
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  weapon_type text,
  collection text,
  rarity text check (rarity in ('consumer','industrial','milspec','restricted','classified','covert','gold')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Live pricing (multi-market time-series)
create table if not exists market_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  market text not null,
  currency text not null check (currency in ('USD','EUR','GBP','CNY')),
  price decimal(10,2),
  volume_24h integer,
  change_24h_pct decimal(7,3),
  change_7d_pct decimal(7,3),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_name, market, currency)
);

create table if not exists market_price_candles (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  market text not null,
  currency text not null check (currency in ('USD','EUR','GBP','CNY')),
  timeframe text not null check (timeframe in ('5m','30m','1h','1d')),
  ts timestamptz not null,
  open decimal(10,2),
  high decimal(10,2),
  low decimal(10,2),
  close decimal(10,2),
  volume integer,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_name, market, currency, timeframe, ts)
);

-- Price alerts (GTT-like; notify/link only)
create table if not exists price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  item_name text not null,
  market text, -- null = any market / best price
  currency text not null check (currency in ('USD','EUR','GBP','CNY')),
  condition text not null check (condition in ('below','above')),
  trigger_price decimal(10,2) not null,
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generic updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  -- Attach updated_at trigger to all tables that have updated_at
  perform 1;
end $$;

-- Indexes
create index if not exists trades_user_id_idx on trades(user_id);
create index if not exists trades_user_buy_date_idx on trades(user_id, buy_date desc);
create index if not exists loadouts_user_id_idx on loadouts(user_id);
create index if not exists targets_user_id_idx on targets(user_id);
create index if not exists targets_status_idx on targets(user_id, status);
create index if not exists items_name_idx on items(name);
create index if not exists items_weapon_type_idx on items(weapon_type);
create index if not exists market_price_snapshots_item_idx on market_price_snapshots(item_name);
create index if not exists market_price_candles_item_ts_idx on market_price_candles(item_name, market, currency, timeframe, ts desc);
create index if not exists price_alerts_user_active_idx on price_alerts(user_id, is_active);

-- =========================================================
-- Auth + RLS (per-user isolation)
-- =========================================================

-- Auto-create profile rows when a user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url, currency_preference)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'USD'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Profiles
alter table public.profiles enable row level security;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Loadouts (public for is_public=true, private otherwise)
alter table public.loadouts enable row level security;

create policy "loadouts_select_public"
on public.loadouts
for select
using (is_public = true);

create policy "loadouts_select_own"
on public.loadouts
for select
using (auth.uid() = user_id);

create policy "loadouts_insert_own"
on public.loadouts
for insert
with check (auth.uid() = user_id);

create policy "loadouts_update_own"
on public.loadouts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "loadouts_delete_own"
on public.loadouts
for delete
using (auth.uid() = user_id);

-- Trades
alter table public.trades enable row level security;
create policy "trades_select_own"
on public.trades
for select
using (auth.uid() = user_id);
create policy "trades_insert_own"
on public.trades
for insert
with check (auth.uid() = user_id);
create policy "trades_update_own"
on public.trades
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy "trades_delete_own"
on public.trades
for delete
using (auth.uid() = user_id);

-- Targets (Watchlist)
alter table public.targets enable row level security;
create policy "targets_select_own"
on public.targets
for select
using (auth.uid() = user_id);
create policy "targets_insert_own"
on public.targets
for insert
with check (auth.uid() = user_id);
create policy "targets_update_own"
on public.targets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy "targets_delete_own"
on public.targets
for delete
using (auth.uid() = user_id);

-- Watchlist groups (optional broker-like grouping)
alter table public.target_watchlists enable row level security;
create policy "target_watchlists_select_own"
on public.target_watchlists
for select
using (auth.uid() = user_id);
create policy "target_watchlists_insert_own"
on public.target_watchlists
for insert
with check (auth.uid() = user_id);
create policy "target_watchlists_update_own"
on public.target_watchlists
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy "target_watchlists_delete_own"
on public.target_watchlists
for delete
using (auth.uid() = user_id);

alter table public.target_watchlist_items enable row level security;
create policy "target_watchlist_items_select_own"
on public.target_watchlist_items
for select
using (auth.uid() = user_id);
create policy "target_watchlist_items_insert_own"
on public.target_watchlist_items
for insert
with check (auth.uid() = user_id);
create policy "target_watchlist_items_update_own"
on public.target_watchlist_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy "target_watchlist_items_delete_own"
on public.target_watchlist_items
for delete
using (auth.uid() = user_id);

-- Price alerts (notifications/link-only)
alter table public.price_alerts enable row level security;
create policy "price_alerts_select_own"
on public.price_alerts
for select
using (auth.uid() = user_id);
create policy "price_alerts_insert_own"
on public.price_alerts
for insert
with check (auth.uid() = user_id);
create policy "price_alerts_update_own"
on public.price_alerts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy "price_alerts_delete_own"
on public.price_alerts
for delete
using (auth.uid() = user_id);
