-- Family Life Manager v3 업데이트 SQL
-- 기존 데이터 유지용입니다. reset 하지 말고 이 파일만 새 family Supabase 프로젝트에서 실행하세요.

alter table calendar_events add column if not exists event_type text default 'schedule';
alter table calendar_events add column if not exists is_important boolean default false;

create table if not exists anniversary_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  title text not null,
  anniversary_date date not null,
  calendar_type text default 'solar',
  repeat_type text default 'yearly',
  member_id uuid references group_members(id) on delete set null,
  memo text,
  created_at timestamp with time zone default now()
);

create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  author_member_id uuid references group_members(id) on delete set null,
  diary_date date not null,
  title text not null,
  mood text default 'normal',
  content text not null,
  visibility text default 'group',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table anniversary_events enable row level security;
alter table diary_entries enable row level security;

DROP POLICY IF EXISTS anniversary_events_select_member ON anniversary_events;
DROP POLICY IF EXISTS anniversary_events_insert_editor ON anniversary_events;
DROP POLICY IF EXISTS anniversary_events_update_editor ON anniversary_events;
DROP POLICY IF EXISTS anniversary_events_delete_editor ON anniversary_events;
CREATE POLICY anniversary_events_select_member ON anniversary_events FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY anniversary_events_insert_editor ON anniversary_events FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY anniversary_events_update_editor ON anniversary_events FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY anniversary_events_delete_editor ON anniversary_events FOR DELETE USING (public.is_life_group_editor(group_id));

DROP POLICY IF EXISTS diary_entries_select_member ON diary_entries;
DROP POLICY IF EXISTS diary_entries_insert_editor ON diary_entries;
DROP POLICY IF EXISTS diary_entries_update_editor ON diary_entries;
DROP POLICY IF EXISTS diary_entries_delete_editor ON diary_entries;
CREATE POLICY diary_entries_select_member ON diary_entries FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY diary_entries_insert_editor ON diary_entries FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY diary_entries_update_editor ON diary_entries FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY diary_entries_delete_editor ON diary_entries FOR DELETE USING (public.is_life_group_editor(group_id));

create index if not exists anniversary_events_group_date_idx on anniversary_events(group_id, anniversary_date);
create index if not exists diary_entries_group_date_idx on diary_entries(group_id, diary_date desc);
create index if not exists calendar_events_group_date_idx on calendar_events(group_id, event_date);
