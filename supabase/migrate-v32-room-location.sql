-- 吃啥 Match V3.2 room location metadata
-- Demo 说明：
-- 这些字段用于保存创建饭局时选择的真实地点上下文，包括热门地点、搜索地点和当前位置。
-- 当前 Demo RLS 仍沿用已有策略；正式上线前需要结合 Supabase Auth 收紧权限。

alter table public.rooms
add column if not exists location_area_key text,
add column if not exists location_city text,
add column if not exists location_lat double precision,
add column if not exists location_lng double precision,
add column if not exists location_radius_m integer,
add column if not exists location_source text;

comment on column public.rooms.location_area_key is 'V3.2 地点区域 key，例如 preset/search/current_location。';
comment on column public.rooms.location_city is 'V3.2 地点所属城市。';
comment on column public.rooms.location_lat is 'V3.2 地点纬度。';
comment on column public.rooms.location_lng is 'V3.2 地点经度。';
comment on column public.rooms.location_radius_m is 'V3.2 周边餐厅搜索半径，单位米。';
comment on column public.rooms.location_source is 'V3.2 地点来源：current_location / search / preset。';
