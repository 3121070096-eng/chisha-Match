-- 吃啥 Match V2 Supabase schema
-- Demo 说明：
-- 当前 RLS 策略为了作品演示允许 anon 用户 select / insert / update。
-- 正式上线前需要接入 Supabase Auth，并按房间成员身份收紧访问权限。
--
-- 重要：
-- 这是 Demo 重建脚本，会删除旧的 rooms / room_members / swipes 表和其中数据。
-- 如果你之前执行过旧版本 schema，请直接重新执行本文件来重建 V2 表结构。

create extension if not exists pgcrypto;

drop table if exists public.swipes cascade;
drop table if exists public.room_members cascade;
drop table if exists public.rooms cascade;

create table public.rooms (
  id text primary key default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  title text not null,
  location text not null,
  budget integer not null check (budget > 0),
  cuisine_preference text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'choosing', 'matched', 'decided', 'closed')),
  final_restaurant_id text null,
  share_token text null unique,
  location_area_key text null,
  location_city text null,
  location_lat double precision null,
  location_lng double precision null,
  location_radius_m integer null,
  location_source text null,
  created_at timestamptz not null default now()
);

create table public.room_members (
  id text primary key,
  room_id text not null references public.rooms(id) on delete cascade,
  name text not null,
  avatar text not null default '',
  joined_at timestamptz not null default now()
);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  member_id text not null references public.room_members(id) on delete cascade,
  restaurant_id text not null,
  choice text not null check (choice in ('like', 'pass')),
  created_at timestamptz not null default now(),
  unique (room_id, member_id, restaurant_id)
);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.swipes enable row level security;

-- Demo RLS policies: anon 用户可读写。正式上线前必须收紧权限。

drop policy if exists "demo rooms select" on public.rooms;
create policy "demo rooms select"
on public.rooms for select
to anon
using (true);

drop policy if exists "demo rooms insert" on public.rooms;
create policy "demo rooms insert"
on public.rooms for insert
to anon
with check (true);

drop policy if exists "demo rooms update" on public.rooms;
create policy "demo rooms update"
on public.rooms for update
to anon
using (true)
with check (true);

drop policy if exists "demo room_members select" on public.room_members;
create policy "demo room_members select"
on public.room_members for select
to anon
using (true);

drop policy if exists "demo room_members insert" on public.room_members;
create policy "demo room_members insert"
on public.room_members for insert
to anon
with check (true);

drop policy if exists "demo room_members update" on public.room_members;
create policy "demo room_members update"
on public.room_members for update
to anon
using (true)
with check (true);

drop policy if exists "demo swipes select" on public.swipes;
create policy "demo swipes select"
on public.swipes for select
to anon
using (true);

drop policy if exists "demo swipes insert" on public.swipes;
create policy "demo swipes insert"
on public.swipes for insert
to anon
with check (true);

drop policy if exists "demo swipes update" on public.swipes;
create policy "demo swipes update"
on public.swipes for update
to anon
using (true)
with check (true);

-- Demo reset 支持：允许删除 swipes。正式上线前需要限制为房间成员只能删除自己的记录。
drop policy if exists "demo swipes delete" on public.swipes;
create policy "demo swipes delete"
on public.swipes for delete
to anon
using (true);

do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.room_members;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.swipes;
exception
  when duplicate_object then null;
end;
$$;
