# Together Life v7

부부가 함께 쓰는 생활 관리 웹앱입니다.

## v7 추가 기능

- 홈 화면에 **다가오는 알림** 추가
  - 일정, 기념일, 고정비, 할 일의 임박 항목을 모아 표시
- **반복 날짜 자동 계산** 보강
  - 매일/매주/매월/매년 반복 항목의 다음 날짜를 계산해 알림에 표시
- **전체 검색** 탭 추가
  - 거래, 일정, 기념일, 다이어리, 장보기, 할 일, 목표 검색
- **사진앨범** 탭 추가
  - 사진이 첨부된 다이어리를 날짜순으로 모아보기
- **PWA 준비**
  - `public/manifest.json` 추가
  - 모바일 홈화면 추가 준비

## Supabase 적용

v7은 DB 구조 변경이 없습니다.

이미 v6의 `supabase/update_v6.sql`을 실행했다면 추가 SQL 실행은 필요 없습니다.

`supabase/update_v7.sql`은 안내용 파일입니다.

## 로컬 실행

```powershell
cd "프로젝트폴더"
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

## GitHub/Vercel 반영

```powershell
git add .
git commit -m "Add reminders search album features"
git push
```
