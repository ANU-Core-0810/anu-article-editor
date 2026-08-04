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
```

Apps Script 쪽 이름은 다르다.

```text
Apps Script: WEB_APP_TOKEN
Cloudflare: GAS_WEB_APP_TOKEN
```

## Proxy Route

Cloudflare Pages Function 파일:

```text
anu-editor-v2/functions/api/gas-proxy.js
```

배포 후 호출 경로:

```text
/api/gas-proxy
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
