-- 吃啥 Match V4.0：Public Beta 轻量房间访问 token
--
-- 新房间会由前端生成 share_token，并将它附在邀请链接中。旧房间保留
-- NULL，避免历史 Demo 链接在升级后立即失效。
--
-- 这不是正式身份认证：Public Beta 仍需在正式上线前结合 Supabase Auth、
-- 短期签名 token 或 server-side room gateway 进一步收紧访问权限。

alter table public.rooms
add column if not exists share_token text;

create unique index if not exists rooms_share_token_uidx
on public.rooms(share_token)
where share_token is not null;

comment on column public.rooms.share_token is
'V4.0 Public Beta invite token. New rooms require it in client routing; legacy rooms may remain NULL for compatibility.';
