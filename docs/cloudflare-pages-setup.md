# Cloudflare Pages Setup

ANU Article Editor를 Cloudflare Pages에서 운영하기 위한 설정 메모.

## GitHub 연결

Cloudflare 대시보드에서 아래 순서로 연결한다.

```text
Workers & Pages
→ Create
→ Pages
→ Connect to Git
→ ANU-Article-Editor 선택
```

## Build Settings

repo 루트가 `ANU-Article-Editor`일 때:

```text
Project name: anu-article-editor
Production branch: main
Framework preset: None
Build command: 비움
Build output directory: anu-editor-v2
Root directory: anu-editor-v2
```

Cloudflare 화면에서 `Root directory`와 `Build output directory`를 동시에 쓰는 방식이 헷갈리면 아래처럼 잡는다.

```text
Root directory: anu-editor-v2
Build command: 비움
Build output directory: .
```

## Environment Variables

Cloudflare Pages 프로젝트에서:

```text
Settings
→ Variables and Secrets
→ Add
```

Production과 Preview에 같은 값을 넣는다.

```text
GAS_WEB_APP_URL=https://script.google.com/macros/s/.../exec
GAS_WEB_APP_TOKEN=Apps Script WEB_APP_TOKEN과 같은 값
ARTICLE_IMAGE_BASE=https://pub-14eaf4c4a9324927bf2879a272de972a.r2.dev
```

Apps Script 쪽 이름은 다르다.

```text
Apps Script: WEB_APP_TOKEN
Cloudflare: GAS_WEB_APP_TOKEN
```

이미지 업로드 토큰을 GAS 토큰과 분리하고 싶으면 Cloudflare에 아래 값을 추가한다. 없으면 `GAS_WEB_APP_TOKEN`을 업로드 토큰으로도 사용한다.

```text
R2_UPLOAD_TOKEN=긴 랜덤 문자열
```

## R2 Binding

에디터 내부 이미지 업로드는 Cloudflare Pages Function에서 R2로 직접 저장한다.

Cloudflare Pages 프로젝트에서:

```text
Settings
→ Bindings
→ Add binding
→ R2 bucket
```

아래처럼 맞춘다.

```text
Variable name: ANU_ARTICLE_BUCKET
R2 bucket: anu-article
```

저장 경로는 아티클 코드 기준으로 자동 생성된다.

```text
ARTI26-001 → /2026/arti26-001/image-1.jpg
ARTI26-001 → /2026/arti26-001/duo-1.jpg
ARTI26-001 → /2026/arti26-001/slide-1.jpg
```

업로드가 실패하면 먼저 아래 네 가지를 확인한다.

- Pages 프로젝트에 `ANU_ARTICLE_BUCKET` 바인딩이 있는지
- `GAS_WEB_APP_TOKEN` 또는 `R2_UPLOAD_TOKEN`이 Production/Preview 변수에 모두 있는지
- 에디터의 토큰 입력값이 위 변수 중 하나와 같은지
- 경로가 `/2026/arti26-001/slot.jpg`처럼 맨 앞 `/`를 포함한 형태인지

## Proxy Route

Cloudflare Pages Function 파일:

```text
anu-editor-v2/functions/api/gas-proxy.js
anu-editor-v2/functions/api/r2-upload.js
```

배포 후 호출 경로:

```text
/api/gas-proxy
/api/r2-upload
```

에디터는 배포 도메인이 `*.netlify.app`이면 Netlify 프록시를 쓰고, 그 외 배포 도메인에서는 Cloudflare 프록시를 자동으로 쓴다.

## Verification

배포 후 아래 요청이 `Missing GAS_WEB_APP_URL`이 아니어야 한다.

```bash
curl -X POST https://프로젝트.pages.dev/api/gas-proxy \
  -H 'Content-Type: application/json' \
  --data '{"action":"__healthcheck__"}'
```

`Unknown action` 또는 GAS가 반환한 JSON이 나오면 Cloudflare → GAS 연결은 성공이다.
