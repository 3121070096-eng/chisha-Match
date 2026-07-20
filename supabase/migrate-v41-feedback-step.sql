-- 吃啥 Match V4.1：真实用户测试反馈字段
-- 非破坏性 migration：仅为已有 feedback 表增加可选的卡点字段，不会重建或删除历史反馈。

alter table public.feedback
  add column if not exists improvement_area text;

comment on column public.feedback.improvement_area is
  'V4.1 真实测试中用户认为最需要改进的步骤；可为空。';
