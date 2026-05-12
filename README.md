# Together Life v21.2

부부가 함께 쓰는 생활 관리 앱입니다.

## v21 추가 기능

- 차량관리
  - 차량명, 차량번호, 현재 KM 등록
  - 엔진오일/타이어/브레이크오일 등 관리품목 등록
  - 현재 KM 기준으로 사용 KM/남은 KM를 막대그래프로 표시

- 맛집/가본곳/카페 기록
  - 맛집, 카페, 가본곳, 가고싶은곳 분류
  - 방문일, 주소, 평점, 메모 저장
  - Google 지도 공유 링크 또는 장소명/주소 기반 Google 지도 열기

## Supabase 적용

v21은 새 테이블이 필요합니다.
Supabase SQL Editor에서 `supabase/update_v21.sql`을 실행하세요.

## 로컬 실행

```powershell
cd "$env:USERPROFILE\OneDrive\Home\프로그램\family-life-manager"
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```
