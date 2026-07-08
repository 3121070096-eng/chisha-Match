-- 吃啥 Match V3.0 restaurant API cache 预留 migration
-- 当前版本不强制使用这些表；未来真实 API 查询和缓存写入应通过 server route 完成。
-- Beta Demo RLS 策略：允许 anon select 方便调试展示。正式上线前需要收紧权限。

create extension if not exists pgcrypto;

create table if not exists public.restaurant_cache (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_place_id text not null,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  area_key text,
  cuisine text,
  price_level text,
  rating numeric,
  distance_text text,
  tags text[],
  images text[],
  photo_refs text[],
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, source_place_id)
);

create table if not exists public.room_restaurants (
  id uuid primary key default gen_random_uuid(),
  room_id text references public.rooms(id) on delete cascade,
  restaurant_id uuid references public.restaurant_cache(id) on delete cascade,
  rank integer,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_cache_area_key_idx on public.restaurant_cache(area_key);
create index if not exists room_restaurants_room_id_idx on public.room_restaurants(room_id);

alter table public.restaurant_cache enable row level security;
alter table public.room_restaurants enable row level security;

drop policy if exists "demo restaurant_cache select" on public.restaurant_cache;
create policy "demo restaurant_cache select"
on public.restaurant_cache for select
to anon
using (true);

drop policy if exists "demo room_restaurants select" on public.room_restaurants;
create policy "demo room_restaurants select"
on public.room_restaurants for select
to anon
using (true);
