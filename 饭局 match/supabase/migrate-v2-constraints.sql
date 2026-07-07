-- 吃啥 Match V2 constraint migration
-- 非破坏性修复脚本：用于已经创建过旧版 rooms / swipes 表的 Supabase 项目。
-- 如果你不想删除已有 Demo 房间数据，可以先执行本文件。

update public.swipes
set choice = 'pass'
where choice = 'skip';

alter table public.swipes
drop constraint if exists swipes_choice_check;

alter table public.swipes
add constraint swipes_choice_check
check (choice in ('like', 'pass'));

update public.rooms
set status = 'decided'
where status = 'finalized';

alter table public.rooms
drop constraint if exists rooms_status_check;

alter table public.rooms
add constraint rooms_status_check
check (status in ('open', 'choosing', 'matched', 'decided', 'closed'));
