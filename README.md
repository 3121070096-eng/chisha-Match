# 吃啥 Match

「吃啥 Match」是一个移动端优先的饭局决策 Web App。用户创建饭局房间后，把邀请链接发给朋友；每个人像交友软件一样左右滑餐厅卡片，系统会自动找出两位或更多成员都想吃的餐厅，并生成 Match。

## 项目简介

这个 Beta 版本已经接入 Supabase，支持真实多人房间、成员加入、滑卡记录、共同心动餐厅榜和最终餐厅选择。V3.0 增加了高德 Web 服务 API Spike；V3.1 增强高德餐厅图片获取和同源代理；V3.2 增加真实定位、地点搜索和热门地点创建饭局，并继续保证同一房间固定同一批餐厅。

## 核心功能

- 创建饭局房间，填写饭局名称、选择地点、预算、菜系偏好和参与人数。
- 地点支持三种方式：使用当前位置、搜索地点、选择热门地点。
- 高德 API 可用时按经纬度生成真实附近餐厅池；失败时 fallback 到本地地区餐厅包。
- 房间页展示邀请码、邀请链接、复制按钮和实时成员列表。
- 好友打开邀请链接后输入昵称加入房间。
- 餐厅滑卡：左滑/点击「不想吃」，右滑/点击「想吃」。
- `swipes` 使用 upsert，保证同一成员对同一餐厅只有一条记录。
- 两位或更多房间成员 like 同一家餐厅时生成 Match。
- 「共同心动餐厅榜」按共同喜欢人数从高到低排序。
- 点击「就吃这家」后写入最终选择，并在最终结果页展示「今晚就吃这家」。
- 使用 localStorage 保存当前浏览器在每个房间里的成员身份，刷新后不会重复要求输入昵称。

## V2.3 说明

V2.3 重点解决三个真实测试反馈：

- 修复部分按钮圆角、阴影和底部安全区被裁切的问题。
- 将餐厅 mock 图片切换为 `public/restaurants/` 下的本地图片资源，减少远程图片导致的首屏空白。
- 增加地点选择和地区餐厅池，让创建饭局、滑卡、共同心动榜和最终结果保持同一个地点上下文。

当前仍未接入真实餐厅 API，地点餐厅池是体验版 mock 数据，不代表真实商户信息或平台评价。后续 V3 可以接入 Google Places、高德地图或其他真实地图 / 餐厅 API。

本地图片资源需要放在：

```bash
public/restaurants/
```

## V2.4：反馈与埋点

V2.4 用来帮助真实测试闭环，重点是看用户是否能顺利完成一次选餐厅流程，以及他们可能卡在哪一步。

- 新增 `feedback` 表，用于收集最终结果页反馈。
- 新增 `events` 表，用于记录创建房间、选择地点、复制邀请、加入房间、滑卡、Match、最终选择等关键路径事件。
- 最终结果页新增「这次选餐体验怎么样？」反馈模块，支持「很好用 / 还可以 / 有点麻烦」和可选文字反馈。
- 埋点写入失败只会输出 `console.error`，不会阻塞创建房间、滑卡、Match 或最终选择。
- 新增隐藏调试页 `/debug`，用于 Beta 阶段查看基础统计、最新反馈和最近事件，不在首页暴露。

## V3.0：高德 API Spike

V3.0 用来小规模验证真实餐厅数据是否能进入现有多人 Match 流程。它不是完整商业级推荐系统，当前优先支持高德 Web 服务 API。

- `/api/restaurants/search` 会在 Next.js server route 中调用高德 API。
- 高德 API key 只能配置为服务端环境变量 `AMAP_API_KEY`。
- 如果高德后台开启了 Web 服务数字签名，可以额外配置服务端变量 `AMAP_SECURITY_KEY`，server route 会自动生成 `sig`。
- 不要使用 `NEXT_PUBLIC_AMAP_API_KEY`，也不要把真实 key 写进代码或 README。
- 如果配置了 `AMAP_API_KEY`，创建房间后会尝试按房间地点搜索附近餐厅。
- 预设地点会使用服务端内置经纬度查询；「当前位置附近」在暂未接入浏览器定位时默认按上海人民广场附近查询。
- 如果高德 API 成功且缓存写入成功，餐厅会写入 `restaurant_cache`，并通过 `room_restaurants` 固定到当前房间。
- 同一个房间的不同成员优先读取这批固定餐厅，避免各自请求 API 后看到不同列表。
- 如果没有配置 key、地理编码失败、搜索失败、返回餐厅太少或缓存写入失败，主流程会 fallback 到本地地区餐厅包。
- 高德结果有图片时会通过 `/api/restaurants/photo` 做同源代理，减少远程图片被浏览器拦截或加载失败。
- 高德结果缺图片时使用 `public/restaurants/` 下的本地 fallback 图片。
- 高德结果缺评分或人均时，界面显示「暂无评分 / 人均待确认」，不会伪装成真实平台数据。
- 模拟评论仍然是体验版食评，不是高德真实评论。

服务端缓存写入建议额外配置：

```bash
SUPABASE_SERVICE_ROLE_KEY=
```

这个 key 只能放在 Vercel / 本地服务端环境变量里，不能使用 `NEXT_PUBLIC_`，也不能提交到 GitHub。没有配置时，高德搜索可以执行，但餐厅缓存无法安全写入，项目会回退到本地地区餐厅包。

V3.0 后续正式化还需要继续处理：高德 API 费用、调用限额、搜索结果质量、图片稳定性、缓存策略和数据合规。

## V3.1：高德图片增强

V3.1 重点修复「高德餐厅已经接入，但卡片仍显示默认图片」的问题。

- 搜索结果没有 `photos` 时，会追加高德 POI 详情查询，尽量补齐餐厅图片。
- 新增 `/api/restaurants/photo` 同源图片代理，减少高德远程图片因为 http、跨域或远程加载策略失败而回落到默认图。
- 支持可选服务端环境变量 `AMAP_SECURITY_KEY`，如果高德 Web 服务开启数字签名，server route 会自动生成 `sig`。
- 旧房间会继续读取之前已经固定的 `room_restaurants` 缓存；部署 V3.1 后建议新建饭局测试图片效果。

## V3.2：真实定位与地点搜索

V3.2 重点把地点选择从固定上海地点升级为更接近真实使用的创建流程。

- 创建饭局页支持「使用当前位置」「搜索地点」「选择热门地点」三种方式。
- 当前位置通过浏览器 `navigator.geolocation.getCurrentPosition` 获取，只在浏览器端触发；定位需要 HTTPS，Vercel 线上环境支持。
- 用户拒绝定位不会阻塞创建饭局，仍可搜索地点或选择热门地点。
- 服务端新增高德逆地理编码，用于把经纬度转成更友好的地点名，例如「徐汇区附近」。
- 地点搜索会通过高德地理编码 / POI 搜索解析学校、商场、地铁站等关键词。
- 热门地点配置位于 `data/locations.ts`，当前包含人民广场、静安寺、徐家汇、陆家嘴、五角场、大学路、南京西路和淮海中路。
- `AMAP_API_KEY` 是服务端环境变量，不能使用 `NEXT_PUBLIC_`，也不要提交到 GitHub。
- 高德 API 失败、返回过少或缓存写入失败时，会 fallback 到本地餐厅包。
- 每个房间创建后会固定餐厅池，所有成员读取同一批 `room_restaurants`，避免不同用户看到不同餐厅。

新增 migration 执行顺序：

```text
supabase/migrate-v24-feedback-events.sql
supabase/migrate-v30-restaurant-source.sql
supabase/migrate-v30-restaurant-cache.sql
supabase/migrate-v32-room-location.sql
```

`migrate-v24-feedback-events.sql`、`migrate-v30-restaurant-source.sql`、`migrate-v30-restaurant-cache.sql` 和 `migrate-v32-room-location.sql` 建议在 V3.2 线上测试前执行。`restaurant_source` 用于标记房间餐厅来源，`restaurant_cache` 和 `room_restaurants` 用于高德 API 餐厅缓存与房间固定餐厅池，V3.2 的地点字段用于保存经纬度、区域 key、半径和地点来源。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Supabase Database + Realtime
- 高德 Web 服务 API（服务端 Spike）
- localStorage

## Supabase 表结构

项目 SQL 位于 `supabase/schema.sql`，会创建三张表：

- `rooms`
  - `id`
  - `title`
  - `location`
  - `budget`
  - `cuisine_preference`
  - `status`
  - `final_restaurant_id`
  - `restaurant_source`（通过 `supabase/migrate-v30-restaurant-source.sql` 增加）
  - `location_area_key` / `location_city` / `location_lat` / `location_lng` / `location_radius_m` / `location_source`（通过 `supabase/migrate-v32-room-location.sql` 增加）
  - `created_at`
- `room_members`
  - `id`
  - `room_id`
  - `name`
  - `avatar`
  - `joined_at`
- `swipes`
  - `id`
  - `room_id`
  - `member_id`
  - `restaurant_id`
  - `choice`
  - `created_at`
  - `unique(room_id, member_id, restaurant_id)`
- `feedback`（通过 `supabase/migrate-v24-feedback-events.sql` 增加）
  - `id`
  - `room_id`
  - `rating`
  - `comment`
  - `created_at`
- `events`（通过 `supabase/migrate-v24-feedback-events.sql` 增加）
  - `id`
  - `room_id`
  - `member_id`
  - `event_name`
  - `metadata`
  - `created_at`
- `restaurant_cache` / `room_restaurants`（通过 `supabase/migrate-v30-restaurant-cache.sql` 增加）
  - V3.0 高德 API 餐厅缓存与房间餐厅池固定关系。
  - 写入应通过 Next.js server route 完成，正式上线建议使用 `SUPABASE_SERVICE_ROLE_KEY` 并收紧 RLS。

当前 RLS 是 Demo 策略，允许 anon 用户基本读写，方便作品测试。正式上线前需要接入 Supabase Auth，并收紧房间访问权限。

如果已经执行过旧版 schema 且不想删除 Demo 数据，可以执行：

```bash
supabase/migrate-v2-constraints.sql
```

该脚本会把旧的 `swipes.choice = skip` 迁移为 `pass`，并更新 `swipes.choice` 与 `rooms.status` 的 check 约束。

## 环境变量

本地创建 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
AMAP_API_KEY=
AMAP_SECURITY_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`.env.example` 只保留变量名，不包含真实 key。`.gitignore` 已忽略 `.env.local`、`.env.*`、`.next`、`node_modules`、`.vercel` 等文件。

`AMAP_API_KEY`、`AMAP_SECURITY_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY` 都是服务端变量，不要加 `NEXT_PUBLIC_`。

## 本地运行

```bash
npm install
npm run dev
```

打开：

```bash
http://localhost:3000
```

生产构建检查：

```bash
npm run build
```

## Vercel 部署

1. 将项目推送到 GitHub。
2. 在 Vercel 新建项目并导入该仓库。
3. Framework Preset 选择 Next.js。
4. 在 Vercel Project Settings -> Environment Variables 中配置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `AMAP_API_KEY`（高德 Web 服务 API key）
   - `AMAP_SECURITY_KEY`（可选，高德 Web 服务数字签名私钥）
   - `SUPABASE_SERVICE_ROLE_KEY`（server route 写入餐厅缓存时使用）
5. `AMAP_API_KEY`、`AMAP_SECURITY_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY` 不要使用 `NEXT_PUBLIC_`。添加或修改环境变量后，必须重新部署项目，线上页面和 server route 才会拿到新的配置。
6. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
7. 如果之前执行过旧版 schema 且保留了旧数据，再执行 `supabase/migrate-v2-constraints.sql`。
8. 执行 V2.4/V3 migration：
   - `supabase/migrate-v24-feedback-events.sql`
   - `supabase/migrate-v30-restaurant-source.sql`
   - `supabase/migrate-v30-restaurant-cache.sql`
   - `supabase/migrate-v32-room-location.sql`
9. 部署完成后，打开线上地址测试创建房间和邀请链接。

不要把 Supabase URL 或 anon key 硬编码到代码、README 或配置文件中。

如果线上提示无法连接 Supabase，先检查 Vercel 环境变量是否配置在当前项目和当前环境中，并确认修改后已经重新部署。如果报 RLS、permission denied、schema cache、check constraint 等错误，请确认 `supabase/schema.sql`、`supabase/migrate-v2-constraints.sql` 以及新增 V2.4/V3 migration 已经在同一个线上 Supabase 项目执行。

## 测试流程

1. 打开首页，点击「创建饭局」。
2. 填写饭局信息，使用当前位置、搜索地点或选择热门地点创建房间。
3. 如果已配置 `AMAP_API_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY`，观察 console 或 `/debug` 中是否出现 `restaurant_api_requested`、`restaurant_api_succeeded`、`restaurant_cache_written`。
4. 如果没有配置高德 key，`/api/restaurants/search` 会返回 `AMAP_API_KEY_NOT_CONFIGURED`，页面仍使用本地地区餐厅包。
5. 图片修复部署后建议新建饭局测试，因为旧房间会继续读取之前已经固定的 `room_restaurants` 缓存。
5. 在房间页点击「复制邀请链接」。
6. 用隐身窗口或另一台手机打开邀请链接。
7. 第二个用户输入昵称加入房间。
8. 两个用户进入滑卡页，并对同一家餐厅点击「想吃」。
9. 出现 Match 弹窗后进入「共同心动餐厅榜」。
10. 在匹配清单里点击「就吃这家」。
11. 最终结果页展示「今晚就吃这家」和餐厅信息。
12. 在最终结果页提交一次体验反馈。
13. 可打开隐藏页 `/debug` 查看 feedback 和 events 是否写入成功。

## 当前版本限制

- V3.0 是高德 API Spike，不保证真实餐厅数据完整或排序质量。
- 未配置 `AMAP_API_KEY` 或缓存写入失败时，餐厅仍为本地 mock 数据，按地点拆分为多个体验版餐厅池。
- 暂未做正式登录，成员身份由 localStorage 模拟。
- Demo RLS 权限较开放，不适合直接作为正式生产权限策略。
- 地点解析和周边搜索已经接入高德 Web 服务，但暂未接入复杂地图 UI 或正式推荐算法。
- 高德图片字段不一定稳定，当前会使用本地 fallback 图片兜底。
- 模拟食评不是高德真实评论。

## 后续规划

- 完善高德 API 结果质量、费用控制、调用限额和缓存刷新策略。
- 后续可评估 Google Places 或其他真实餐厅数据源。
- 增加真实地点、预算和菜系筛选。
- 收紧 Supabase 权限和房间访问策略。
- 做小程序版本，降低分享和加入成本。
- 增加二轮投票功能，让入围餐厅进一步 PK。
