-- 吃啥 Match V4.0：Public Beta 渐进式 RLS 收紧
--
-- 这套策略保留 anon 多人 Demo 的必要读写能力，但移除不需要的 delete / update，
-- 并禁止已决定房间继续写入 swipe 或二轮投票。
--
-- 重要：当前没有正式 Auth，RLS 无法识别真实用户身份或验证 URL token。
-- 正式上线前仍必须引入 Supabase Auth、服务端签名访问令牌和成员级权限。

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.swipes enable row level security;
alter table public.feedback enable row level security;
alter table public.events enable row level security;
alter table public.restaurant_cache enable row level security;
alter table public.room_restaurants enable row level security;
alter table public.decision_votes enable row level security;

-- rooms：保留创建与读取；只有尚未决定的房间能由 anon 更新。
-- 这允许从 open -> decided 的最终拍板，但不允许对已决定结果再次写入。
drop policy if exists "demo rooms select" on public.rooms;
drop policy if exists "demo rooms insert" on public.rooms;
drop policy if exists "demo rooms update" on public.rooms;
drop policy if exists "beta rooms select" on public.rooms;
drop policy if exists "beta rooms insert" on public.rooms;
drop policy if exists "beta rooms update before decision" on public.rooms;

create policy "beta rooms select"
on public.rooms for select to anon
using (true);

create policy "beta rooms insert"
on public.rooms for insert to anon
with check (true);

create policy "beta rooms update before decision"
on public.rooms for update to anon
using (status <> 'decided')
with check (true);

-- room_members：允许加入与读取成员列表；不开放 anon 修改或删除成员记录。
drop policy if exists "demo room_members select" on public.room_members;
drop policy if exists "demo room_members insert" on public.room_members;
drop policy if exists "demo room_members update" on public.room_members;
drop policy if exists "beta room_members select" on public.room_members;
drop policy if exists "beta room_members insert" on public.room_members;

create policy "beta room_members select"
on public.room_members for select to anon
using (true);

create policy "beta room_members insert"
on public.room_members for insert to anon
with check (true);

-- swipes：开放房间仅可写入、更新、重置；已决定房间不能再改变选择。
drop policy if exists "demo swipes select" on public.swipes;
drop policy if exists "demo swipes insert" on public.swipes;
drop policy if exists "demo swipes update" on public.swipes;
drop policy if exists "demo swipes delete" on public.swipes;
drop policy if exists "beta swipes select" on public.swipes;
drop policy if exists "beta swipes insert for open rooms" on public.swipes;
drop policy if exists "beta swipes update for open rooms" on public.swipes;
drop policy if exists "beta swipes delete for open rooms" on public.swipes;

create policy "beta swipes select"
on public.swipes for select to anon
using (true);

create policy "beta swipes insert for open rooms"
on public.swipes for insert to anon
with check (
  exists (
    select 1 from public.rooms
    where rooms.id = swipes.room_id and rooms.status <> 'decided'
  )
);

create policy "beta swipes update for open rooms"
on public.swipes for update to anon
using (
  exists (
    select 1 from public.rooms
    where rooms.id = swipes.room_id and rooms.status <> 'decided'
  )
)
with check (
  exists (
    select 1 from public.rooms
    where rooms.id = swipes.room_id and rooms.status <> 'decided'
  )
);

create policy "beta swipes delete for open rooms"
on public.swipes for delete to anon
using (
  exists (
    select 1 from public.rooms
    where rooms.id = swipes.room_id and rooms.status <> 'decided'
  )
);

-- feedback / events：Public Beta 仅接受新记录，匿名客户端不能读取、修改或删除。
drop policy if exists "demo feedback select" on public.feedback;
drop policy if exists "demo feedback insert" on public.feedback;
drop policy if exists "beta feedback insert" on public.feedback;
drop policy if exists "demo events select" on public.events;
drop policy if exists "demo events insert" on public.events;
drop policy if exists "beta events insert" on public.events;

create policy "beta feedback insert"
on public.feedback for insert to anon
with check (true);

create policy "beta events insert"
on public.events for insert to anon
with check (true);

-- 餐厅缓存和房间餐厅池：前端仅可读取；写入只由 server route + service role 完成。
drop policy if exists "demo restaurant_cache select" on public.restaurant_cache;
drop policy if exists "demo room_restaurants select" on public.room_restaurants;
drop policy if exists "beta restaurant_cache select" on public.restaurant_cache;
drop policy if exists "beta room_restaurants select" on public.room_restaurants;

create policy "beta restaurant_cache select"
on public.restaurant_cache for select to anon
using (true);

create policy "beta room_restaurants select"
on public.room_restaurants for select to anon
using (true);

-- 二轮投票：开放房间可读、投票、改投（delete + insert）；已决定房间不再变更。
drop policy if exists "demo decision_votes select" on public.decision_votes;
drop policy if exists "demo decision_votes insert" on public.decision_votes;
drop policy if exists "demo decision_votes delete" on public.decision_votes;
drop policy if exists "beta decision_votes select" on public.decision_votes;
drop policy if exists "beta decision_votes insert for open rooms" on public.decision_votes;
drop policy if exists "beta decision_votes delete for open rooms" on public.decision_votes;

create policy "beta decision_votes select"
on public.decision_votes for select to anon
using (true);

create policy "beta decision_votes insert for open rooms"
on public.decision_votes for insert to anon
with check (
  exists (
    select 1 from public.rooms
    where rooms.id = decision_votes.room_id and rooms.status <> 'decided'
  )
);

create policy "beta decision_votes delete for open rooms"
on public.decision_votes for delete to anon
using (
  exists (
    select 1 from public.rooms
    where rooms.id = decision_votes.room_id and rooms.status <> 'decided'
  )
);
