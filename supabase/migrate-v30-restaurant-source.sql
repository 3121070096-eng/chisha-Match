-- 吃啥 Match V3.0 restaurant_source 预留 migration
-- 非破坏性 migration：为未来真实餐厅 API / fallback 来源记录预留字段。

alter table public.rooms
add column if not exists restaurant_source text not null default 'local_pack';

comment on column public.rooms.restaurant_source is
'Restaurant source marker reserved for V3.0. Current values may include local_pack, api, api_fallback.';
