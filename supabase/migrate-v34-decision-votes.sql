-- 吃啥 Match V3.4：二轮投票
-- 当前项目的 rooms.id 和 room_members.id 是 text，因此这里按实际字段类型建外键。
-- Beta Demo RLS：允许 anon 基础读写。正式上线前必须结合 Supabase Auth 收紧权限。

create extension if not exists pgcrypto;

create table if not exists public.decision_votes (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  member_id text not null references public.room_members(id) on delete cascade,
  restaurant_id text not null,
  created_at timestamptz not null default now(),
  unique (room_id, member_id)
);

create index if not exists decision_votes_room_id_idx
on public.decision_votes(room_id);

create index if not exists decision_votes_restaurant_id_idx
on public.decision_votes(room_id, restaurant_id);

alter table public.decision_votes enable row level security;

do $$
begin
  alter publication supabase_realtime add table public.decision_votes;
exception
  when duplicate_object then null;
end $$;

drop policy if exists "demo decision_votes select" on public.decision_votes;
create policy "demo decision_votes select"
on public.decision_votes for select
to anon
using (true);

drop policy if exists "demo decision_votes insert" on public.decision_votes;
create policy "demo decision_votes insert"
on public.decision_votes for insert
to anon
with check (true);

drop policy if exists "demo decision_votes delete" on public.decision_votes;
create policy "demo decision_votes delete"
on public.decision_votes for delete
to anon
using (true);
