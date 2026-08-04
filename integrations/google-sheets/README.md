# Google Sheets Article Pipeline

이 폴더는 Notion `아티클 DB`와 `아티클 편집기`를 Google Sheets/Apps Script로 연결해 Cafe24 상품 등록용 CSV를 만드는 1차 초안이다.

## 파일

- `cafe24-article-pipeline.gs`: Google Apps Script 코드

## Script Properties

Apps Script 프로젝트 설정에서 아래 값을 추가한다.

```text
NOTION_TOKEN=secret_...
WEB_APP_TOKEN=원하는_임의_문자열
```

Notion integration에는 최소 권한이 필요하다.

- 아티클 DB 읽기
- 아티클 편집기 읽기
- 변환 HTML을 다시 기록하려면 아티클 편집기 업데이트 권한

`WEB_APP_TOKEN`은 선택값이다. 값을 넣어두면 Netlify/HTML 에디터에서 GAS Web App을 호출할 때 같은 토큰을 보내야 실행된다.

## 아티클 편집기 DB 추가 권장 속성

HTML 에디터를 원문 작성의 기준으로 쓰려면 `아티클 편집기` DB에 아래 속성을 둔다.

- `HTML 출력`: rich text, Cafe24 상세설명에 들어갈 최종 HTML
- `에디터 데이터`: rich text, HTML 에디터의 JSON 원본
- `피드백`: rich text, 변환/저장 로그
- `변환 상태`: select, `변환 요청`, `변환완료`, `웹에디터 저장`, `오류`
- `변환기 버전`: rich text
- `변환 시각`: date

## 시트 메뉴

스프레드시트에 스크립트를 붙이면 상단 메뉴에 `ANU Articles`가 생긴다.

0. `Run all`
   - 아래 1~5번 작업을 순서대로 모두 실행한다.
1. `Setup sheets`
   - `Articles`, `Cafe24_Article_Registration`, `Cafe24_Article_Update` 시트를 만들고 헤더를 세팅한다.
2. `Convert linked editor HTML`
   - `시작 전`, `작성 중`을 제외한 아티클에 연결된 편집기 원고를 HTML로 변환해 `아티클 편집기.HTML 출력`에 다시 기록한다.
   - `변환 상태 = 변환 요청`이거나 `HTML 출력`이 비어 있는 편집기만 변환한다.
3. `Sync active articles from Notion`
   - Notion `아티클 DB.상태`가 `시작 전`, `작성 중`이 아닌 항목을 가져온다.
   - 현재 기준으로 `등록 중`, `업데이트`, `업로드` 상태가 시트 싱크 대상이다.
   - `아티클코드` 기준으로 대표 이미지 URL을 자동 생성한다.
4. `Build Cafe24 registration sheet`
   - Cafe24 상품 등록용 고정 102컬럼 시트를 만든다.
   - `상태 = 등록 중`인 아티클만 신규 등록 대상으로 본다.
5. `Build Cafe24 update sheet`
   - `상태 = 업데이트`인 아티클을 수정용 시트로 출력한다.
   - 수정용 시트는 식별을 위해 맨 앞에 `상품번호`를 추가하고, Cafe24 `상품코드`에는 Notion `카페24 상품코드`를 넣는다.

## HTML 에디터에서 호출

`cafe24-article-pipeline.gs`에는 Web App 호출용 `doPost(e)`가 있다. Apps Script에서 Web App으로 배포한 뒤, 에디터의 `Cafe24 Export > GAS Web App URL`에 `/exec` URL을 넣으면 된다.

지원 액션:

- `runAll`: 메뉴의 Run all과 동일하게 전체 파이프라인 실행
- `saveEditorData`: HTML 에디터의 JSON 원본과 출력 HTML을 `아티클 편집기` 페이지에 저장
- `exportRegistrationCsv`: 등록용 시트 생성 후 CSV 문자열 반환
- `exportUpdateCsv`: 수정용 시트 생성 후 CSV 문자열 반환

브라우저는 반환된 CSV 문자열을 파일로 다운로드한다. Cafe24 업로드는 현재 CSV 기준으로 잡아두었고, xlsx가 꼭 필요하면 같은 API에서 Drive export 방식으로 확장한다.

Netlify에서 운영할 때는 브라우저가 GAS를 직접 호출하지 않고 `/.netlify/functions/gas-proxy`를 통해 호출한다. Netlify 환경 변수에 아래 값을 넣는다.

```text
GAS_WEB_APP_URL=https://script.google.com/macros/s/.../exec
GAS_WEB_APP_TOKEN=WEB_APP_TOKEN과 같은 값
```

로컬 테스트에서는 에디터 화면의 `GAS Web App URL` 입력칸에 `/exec` URL을 직접 넣어 확인한다.

## 현재 기준

- `아티클 DB.아티클코드`는 직접 입력 텍스트 속성이다.
- Cafe24 `자체 상품코드`에는 `아티클코드`를 그대로 넣는다.
- Cafe24 `상품코드`, `상품번호`는 등록 후 생성되는 값이므로 신규 등록 CSV에서는 비운다.
- Cafe24 `상품명(관리용)`은 관리자 검색을 쉽게 하기 위해 `[Article] 제목` 형식으로 생성한다.
- 대표 이미지는 별도 Notion 속성 없이 아래 규칙으로 만든다.

```text
https://pub-14eaf4c4a9324927bf2879a272de972a.r2.dev/{연도}/{아티클코드 소문자}/cover.jpg
```

예: `ARTI26-001` -> `/2026/arti26-001/cover.jpg`

## 보류

- 관련상품/추가구성상품 자동 연결
- 기존 HTML 변환기 로직의 GAS 이식 또는 Node 변환기 연동
- Cafe24 업로드 후 생성된 상품번호/상품코드 역기록 자동화
