# Together Life v6

부부가 함께 쓰는 생활 관리 웹앱입니다.

## v6 추가 기능

- 다이어리 사진 첨부 기능 추가
- 다이어리 1개당 사진 최대 5장
- 사진 1장당 최대 5MB
- 지원 파일: jpg, png, webp, gif
- 기존 다이어리에 `사진추가` 버튼으로 사진 추가 가능
- 첨부 사진 개별 삭제 가능

## Supabase 적용

기존 v5까지 적용되어 있다면 Supabase SQL Editor에서 아래 파일만 실행하세요.

```text
supabase/update_v6.sql
```

v6는 Supabase Storage bucket `diary-photos`와 `diary_photos` 테이블을 추가합니다.

## 로컬 실행

```powershell
cd "프로젝트폴더"
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

## GitHub/Vercel 반영

```powershell
git add .
git commit -m "Add diary photo upload feature"
git push
```
