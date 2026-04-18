# Architecture

## Runtime Components

- React client: statically hosted on Vercel or similar CDN.
- Express API: stateless HTTP service, safe for PM2 cluster mode and horizontal scaling.
- BullMQ worker: isolated extraction service that runs `yt-dlp` via `spawn`.
- Redis: queue transport plus short-lived metadata cache.
- MongoDB: durable download and analyze history.
- Nginx: reverse proxy and load balancer.

## Analyze Flow

1. Client sends `POST /api/analyze` with an Instagram URL.
2. API validates host and normalizes the URL.
3. API checks Redis cache using a SHA-256 key.
4. Cache hit returns immediately.
5. Cache miss enqueues a BullMQ job.
6. Worker executes `yt-dlp --cookies cookies.txt -j <url>`.
7. Worker maps single entries and carousel `entries` to a stable response shape.
8. Worker writes cache with 5-10 minute TTL and saves MongoDB history.
9. API returns the job result or a `202` polling response.

## Download Flow

1. Client opens `GET /api/download?url=<url>&index=<n>`.
2. API validates the Instagram URL.
3. API spawns `yt-dlp --cookies cookies.txt -o - <url>`.
4. Output streams directly to the response.
5. No media file is stored on disk.

## High-Concurrency Strategy

- Stateless API lets any request go to any instance.
- Queue-based extraction prevents HTTP workers from being saturated by slow `yt-dlp` calls.
- Worker concurrency can be tuned independently.
- Redis cache absorbs repeated viral URL requests.
- PM2 cluster mode uses all CPU cores per host.
- Horizontal scaling adds API and worker hosts behind the same Redis/MongoDB layer.
- Streaming downloads avoid expensive local storage and cleanup.

## Operational Notes

- Keep `yt-dlp` updated because Instagram extraction changes frequently.
- Use proxy-level abuse controls for public deployments.
- Monitor queue wait time, job failure rate, Redis memory, MongoDB write latency, and download bandwidth.
- Cookies expire. Treat refresh as an operational runbook item.
