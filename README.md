# Family Life Manager v2

부부·커플·가족용 생활 관리 웹앱입니다.

## v2 추가 기능

- owner / admin / member / viewer 권한 구조
- 초대코드 생성 및 참여
- 일정 관리
- 정산 기록 생성 및 완료 처리
- viewer 조회 전용 제한
- 관리자 전용 설정: 구성원, 초대, 계좌, 예산, 카테고리, 고정비

## 기존 v1에서 업데이트하는 경우

Supabase SQL Editor에서 아래 파일만 실행하세요.

```text
supabase/update_v2.sql
```

기존 데이터를 유지하면서 필요한 테이블과 권한 정책을 추가합니다.

## 새 Supabase 프로젝트에서 처음 설치하는 경우

Supabase SQL Editor에서 아래 파일을 실행하세요.

```text
supabase/schema.sql
```

주의: schema.sql은 reset용이라 기존 family-life-manager 데이터가 있으면 삭제됩니다.

## 실행

```powershell
cd C:\Users\seung\Downloads\family-life-manager-v2
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

브라우저:

```text
http://localhost:3000
```

## 환경변수

`.env.example`을 `.env.local`로 복사하고 새 Supabase 프로젝트 값을 입력하세요.

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
