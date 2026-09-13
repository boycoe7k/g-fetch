# g-fetch

Vercel-ready React + serverless developer utility.

## Features

- GitHub latest release lookup
- Release asset downloads
- Repository ZIP download
- Public website HTML source viewer
- Linked CSS / JS / media asset discovery
- Public text asset viewing
- Responsive white developer-tool UI

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repository into Vercel.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. No server start command is needed.

The `/api` directory is deployed as Vercel serverless functions.

## Local development

```bash
npm install
npm run dev
```

For the source viewer, only public HTTP/HTTPS resources should be used. A production deployment should add stronger SSRF protection (DNS/IP validation, redirect validation, and rate limiting) before exposing arbitrary URL fetching publicly.
