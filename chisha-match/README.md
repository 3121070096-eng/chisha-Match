# 吃啥 Match

「吃啥 Match」是一个移动端优先的饭局决策 Web App。用户创建饭局房间后，把邀请链接发给朋友；每个人像交友软件一样左右滑餐厅卡片，系统会自动找出两位或更多成员都想吃的餐厅，并生成 Match。

## 项目简介

这个 Beta 版本已经接入 Supabase，支持真实多人房间、成员加入、滑卡记录、共同心动餐厅榜和最终餐厅选择。它适合部署到 Vercel 后分享给朋友进行真实测试。

## 核心功能

- 创建饭局房间，填写饭局名称、地点、预算、菜系偏好和参与人数。
- 房间页展示邀请码、邀请链接、复制按钮和实时成员列表。
- 好友打开邀请链接后输入昵称加入房间。
- 餐厅滑卡：左滑/点击「不想吃」，右滑/点击「想吃」。
- `swipes` 使用 upsert，保证同一成员对同一餐厅只有一条记录。
- 两位或更多房间成员 like 同一家餐厅时生成 Match。
- 「共同心动餐厅榜」按共同喜欢人数从高到低排序。
- 点击「就吃这家」后写入最终选择，并在最终结果页展示「今晚就吃这家」。
- 使用 localStorage 保存当前浏览器在每个房间里的成员身份，刷新后不会重复要求输入昵称。

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
5. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
6. 部署完成后，打开线上地址测试创建房间和邀请链接。

不要把 Supabase URL 或 anon key 硬编码到代码、README 或配置文件中。

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

## 当前版本限制

- 餐厅仍为本地 mock 数据，共 20 家。
- 暂未接入真实地图或餐厅 API。
- 暂未做正式登录，成员身份由 localStorage 模拟。
- Demo RLS 权限较开放，不适合直接作为正式生产权限策略。
- 餐厅推荐暂未根据地点、预算和菜系做真实筛选。

## 后续规划

- 接入真实餐厅数据。
- 增加地点和预算筛选。
- 收紧 Supabase 权限和房间访问策略。
- 做小程序版本，降低分享和加入成本。
- 增加二轮投票功能，让入围餐厅进一步 PK。
