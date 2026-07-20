-- 吃啥 Match V4.2：饭局场景、候选池确认与决策满意度
-- 非破坏性 migration：只增加可选字段，不重建历史表，也不删除历史数据。

alter table public.rooms
  add column if not exists dining_scenario text,
  add column if not exists restaurant_pool_confirmed_at timestamptz,
  add column if not exists restaurant_pool_refresh_count integer not null default 0;

alter table public.feedback
  add column if not exists decision_satisfaction integer;

alter table public.feedback
  drop constraint if exists feedback_decision_satisfaction_range;

alter table public.feedback
  add constraint feedback_decision_satisfaction_range
  check (decision_satisfaction is null or decision_satisfaction between 1 and 5);

comment on column public.rooms.dining_scenario is
  'V4.2 饭局场景：casual / friends / date / colleagues / celebration / solo / late_night / afternoon_tea。';
comment on column public.rooms.restaurant_pool_confirmed_at is
  'V4.2 房主确认当前固定餐厅池的时间；为空时可继续预览和调整。';
comment on column public.rooms.restaurant_pool_refresh_count is
  'V4.2 当前房间已换批次数，Public Beta 阶段最多允许 2 次。';
comment on column public.feedback.decision_satisfaction is
  'V4.2 用户对最终餐厅结果的可选满意度，范围 1-5。';
