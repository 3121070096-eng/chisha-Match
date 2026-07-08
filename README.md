# 吃啥 Match

「吃啥 Match」是一个移动端优先的饭局决策 Web App。用户创建饭局房间后，把邀请链接发给朋友；每个人像交友软件一样左右滑餐厅卡片，系统会自动找出两位或更多成员都想吃的餐厅，并生成 Match。

## 项目简介

这个 Beta 版本已经接入 Supabase，支持真实多人房间、成员加入、滑卡记录、共同心动餐厅榜和最终餐厅选择。V2.3 进一步优化了按钮裁切、首图加载和地点餐厅池，让作品更适合发给朋友真实测试。

## 核心功能

- 创建饭局房间，填写饭局名称、选择或输入地点、预算、菜系偏好和参与人数。
- 根据饭局地点加载不同的体验版餐厅池，例如当前位置、五角场、静安寺、古北、浦东新区和安福路。
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

## V3.0：真实餐厅 API 预留

当前仍默认使用本地地区餐厅包，真实餐厅 API 暂未启用。

- 已预留 `/api/restaurants/search`。
- 第三方餐厅 API key 必须放在服务端环境变量：
  - `GOOGLE_PLACES_API_KEY`
  - `AMAP_API_KEY`
- 不要使用 `NEXT_PUBLIC_` 暴露第三方餐厅 API key。
- API 未配置时会返回 `API_KEY_NOT_CONFIGURED`，主流程继续 fallback 到本地地区餐厅池。
- 未来真实 API 餐厅可缓存到 `restaurant_cache`。
- 每个房间未来可通过 `room_restaurants` 固定餐厅池，保证不同成员看到同一批餐厅。

新增 migration 执行顺序：

```text
supabase/migrate-v24-feedback-events.sql
supabase/migrate-v30-restaurant-source.sql
supabase/migrate-v30-restaurant-cache.sql
```

`migrate-v24-feedback-events.sql` 和 `migrate-v30-restaurant-source.sql` 建议 Beta 线上测试前执行。`migrate-v30-restaurant-cache.sql` 是 V3.0 真实餐厅 API 缓存预留；当前主流程不强制依赖，但可以提前执行。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Supabase Database + Realtime
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
  - V3.0 真实餐厅 API 缓存与房间餐厅池固定关系预留，当前主流程不强制使用。

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
```

`.env.example` 只保留变量名，不包含真实 key。`.gitignore` 已忽略 `.env.local`、`.env.*`、`.next`、`node_modules`、`.vercel` 等文件。

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
5. 添加或修改环境变量后，必须重新部署项目，线上页面才会拿到新的 Supabase 配置。
6. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
7. 如果之前执行过旧版 schema 且保留了旧数据，再执行 `supabase/migrate-v2-constraints.sql`。
8. 执行 V2.4/V3 预留 migration：
   - `supabase/migrate-v24-feedback-events.sql`
   - `supabase/migrate-v30-restaurant-source.sql`
   - `supabase/migrate-v30-restaurant-cache.sql`（可选预留）
9. 部署完成后，打开线上地址测试创建房间和邀请链接。

不要把 Supabase URL 或 anon key 硬编码到代码、README 或配置文件中。

如果线上提示无法连接 Supabase，先检查 Vercel 环境变量是否配置在当前项目和当前环境中，并确认修改后已经重新部署。如果报 RLS、permission denied、schema cache、check constraint 等错误，请确认 `supabase/schema.sql`、`supabase/migrate-v2-constraints.sql` 以及新增 V2.4/V3 migration 已经在同一个线上 Supabase 项目执行。

## 测试流程

1. 打开首页，点击「创建饭局」。
2. 填写饭局信息并创建房间。
3. 在房间页点击「复制邀请链接」。
4. 用隐身窗口或另一台手机打开邀请链接。
5. 第二个用户输入昵称加入房间。
6. 两个用户进入滑卡页，并对同一家餐厅点击「想吃」。
7. 出现 Match 弹窗后进入「共同心动餐厅榜」。
8. 在匹配清单里点击「就吃这家」。
9. 最终结果页展示「今晚就吃这家」和餐厅信息。
10. 在最终结果页提交一次体验反馈。
11. 可打开隐藏页 `/debug` 查看 feedback 和 events 是否写入成功。

## 当前版本限制

- 餐厅仍为本地 mock 数据，按地点拆分为多个体验版餐厅池。
- 暂未接入真实地图或餐厅 API。
- 暂未做正式登录，成员身份由 localStorage 模拟。
- Demo RLS 权限较开放，不适合直接作为正式生产权限策略。
- 餐厅池会根据地点切换，但暂未根据真实距离、预算和菜系做算法筛选。
- V3.0 API route 目前只做结构预留，未真正请求 Google Places 或高德地图。

## 后续规划

- 接入真实餐厅数据，例如 Google Places 或高德地图。
- 增加真实地点、预算和菜系筛选。
- 收紧 Supabase 权限和房间访问策略。
- 做小程序版本，降低分享和加入成本。
- 增加二轮投票功能，让入围餐厅进一步 PK。
