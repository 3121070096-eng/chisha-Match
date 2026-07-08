-- 吃啥 Match V2.4 feedback / events migration
-- 非破坏性 migration：不会删除或重建 rooms / room_members / swipes。
--
-- Beta Demo RLS 策略说明：当前允许 anon 用户 select / insert，方便真实测试收集反馈和路径事件。
-- 正式上线前必须接入 Supabase Auth，并按房间成员身份收紧读写权限。

create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  room_id text references public.rooms(id) on delete set null,
  rating text not null check (rating in ('good', 'ok', 'bad')),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  room_id text references public.rooms(id) on delete set null,
  -- room_members.id 在当前 V2 schema 中是客户端生成的 text，不是 uuid。
  member_id text references public.room_members(id) on delete set null,
  event_name text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_event_name_idx on public.events(event_name);
create index if not exists events_created_at_idx on public.events(created_at desc);
create index if not exists feedback_created_at_idx on public.feedback(created_at desc);

alter table public.feedback enable row level security;
alter table public.events enable row level security;

drop policy if exists "demo feedback select" on public.feedback;
create policy "demo feedback select"
on public.feedback for select
to anon
using (true);

drop policy if exists "demo feedback insert" on public.feedback;
create policy "demo feedback insert"
on public.feedback for insert
to anon
with check (true);

drop policy if exists "demo events select" on public.events;
create policy "demo events select"
on public.events for select
to anon
using (true);

drop policy if exists "demo events insert" on public.events;
create policy "demo events insert"
on public.events for insert
to anon
with check (true);

do $$
begin
  alter publication supabase_realtime add table public.feedback;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.events;
exception
  when duplicate_object then null;
end;
$$;
