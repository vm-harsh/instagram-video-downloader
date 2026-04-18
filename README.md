# Instagram Media Downloader

Production-oriented MERN stack application for analyzing and streaming public Instagram media through `yt-dlp`.

> Educational use only. Public deployments must comply with Instagram's terms, applicable laws, and copyright rules.

## Stack

- React + Vite + Tailwind CSS
- GSAP animations
- Three.js background scene
- Express API
- BullMQ worker queue
- Redis cache and job transport
- MongoDB download history
- `yt-dlp` via `child_process.spawn`
- PM2 cluster config and Nginx reverse proxy example

## Local Prerequisites

- Node.js 20+
- MongoDB
- Redis
- Python + `yt-dlp` available on `PATH`
- Optional `cookies.txt` for story/private-authenticated metadata on the server only

Install `yt-dlp`:

```bash
python -m pip install -U yt-dlp
```

## Setup

```bash
npm install
cp server/.env.example server/.env
cp worker/.env.example worker/.env
cp client/.env.example client/.env
```

Place `cookies.txt` outside version control. By default both API and worker look for:

```text
server/secrets/cookies.txt
```

Run all services:

```bash
npm run dev
```

Or run separately:

```bash
npm run dev:api
npm run dev:worker
npm run dev:client
```

## API

### `POST /api/analyze`

```json
{
  "url": "https://www.instagram.com/reel/..."
}
```

Returns cached metadata when available. Otherwise enqueues a BullMQ job and waits up to `ANALYZE_SYNC_WAIT_MS`. If processing takes longer, it returns `202` with a job id.

### `GET /api/analyze/:jobId`

Poll for an async analyze result.

### `GET /api/download?url=<instagram-url>&index=0`

Streams media from `yt-dlp` with cookies kept server-side. For carousel posts, `index` selects one entry.

### `GET /api/history`

Recent successful analyze/download records.

## Scaling Architecture

The API is stateless. Every request can hit any backend instance behind Nginx or a cloud load balancer. Redis owns cache and queue state, MongoDB stores durable history, and BullMQ workers can scale horizontally based on queue depth.

Production path:

1. Client submits an Instagram URL.
2. API validates the URL, checks Redis cache, and enqueues a BullMQ job.
3. Worker runs `yt-dlp --cookies cookies.txt -j <url>` with `spawn`.
4. Worker normalizes media entries, writes Redis cache with a short TTL, and records history in MongoDB.
5. API returns the structured response.
6. Downloads stream through `yt-dlp --cookies cookies.txt -o - <url>`.

## Production Commands

```bash
npm install --omit=dev --workspaces
pm2 start deploy/pm2.config.cjs
```

Use `deploy/nginx.conf` as a starting point for reverse proxy and load balancing.
