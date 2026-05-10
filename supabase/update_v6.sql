-- Family Life Manager v6 업데이트 SQL
-- 다이어리 사진 첨부 기능용 Storage bucket + 사진 메타데이터 테이블입니다.
-- 기존 데이터는 유지됩니다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diary-photos',
  'diary-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

create table if not exists diary_photos (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade,
  diary_entry_id uuid references diary_entries(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  file_name text,
  file_size bigint,
  sort_order int default 0,
  created_at timestamp with time zone default now()
);

alter table diary_photos enable row level security;

DROP POLICY IF EXISTS diary_photos_select_member ON diary_photos;
DROP POLICY IF EXISTS diary_photos_insert_editor ON diary_photos;
DROP POLICY IF EXISTS diary_photos_update_editor ON diary_photos;
DROP POLICY IF EXISTS diary_photos_delete_editor ON diary_photos;

CREATE POLICY diary_photos_select_member ON diary_photos
FOR SELECT USING (public.is_life_group_member(group_id));

CREATE POLICY diary_photos_insert_editor ON diary_photos
FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));

CREATE POLICY diary_photos_update_editor ON diary_photos
FOR UPDATE USING (public.is_life_group_editor(group_id))
WITH CHECK (public.is_life_group_editor(group_id));

CREATE POLICY diary_photos_delete_editor ON diary_photos
FOR DELETE USING (public.is_life_group_editor(group_id));

create index if not exists diary_photos_group_idx on diary_photos(group_id);
create index if not exists diary_photos_entry_idx on diary_photos(diary_entry_id, sort_order);

DROP POLICY IF EXISTS diary_photos_storage_select_member ON storage.objects;
DROP POLICY IF EXISTS diary_photos_storage_insert_editor ON storage.objects;
DROP POLICY IF EXISTS diary_photos_storage_update_editor ON storage.objects;
DROP POLICY IF EXISTS diary_photos_storage_delete_editor ON storage.objects;

CREATE POLICY diary_photos_storage_select_member ON storage.objects
FOR SELECT USING (
  bucket_id = 'diary-photos'
  and public.is_life_group_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY diary_photos_storage_insert_editor ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'diary-photos'
  and public.is_life_group_editor(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY diary_photos_storage_update_editor ON storage.objects
FOR UPDATE USING (
  bucket_id = 'diary-photos'
  and public.is_life_group_editor(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'diary-photos'
  and public.is_life_group_editor(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY diary_photos_storage_delete_editor ON storage.objects
FOR DELETE USING (
  bucket_id = 'diary-photos'
  and public.is_life_group_editor(((storage.foldername(name))[1])::uuid)
);
