# Deployment Guide

## Backend

Use AWS EC2, Render, Railway, or any Node-capable container platform.

Required environment variables:

```text
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://your-frontend-domain.com
MONGODB_URI=mongodb+srv://...
REDIS_URL=rediss://...
YT_DLP_PATH=yt-dlp
COOKIES_PATH=/opt/instadl/secrets/cookies.txt
ANALYZE_CACHE_TTL_SECONDS=600
ANALYZE_SYNC_WAIT_MS=25000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60
DOWNLOAD_RATE_LIMIT_MAX=20
```

Install and start:

```bash
npm install --omit=dev --workspaces
pm2 start deploy/pm2.config.cjs
pm2 save
```

## Frontend

Deploy `client` to Vercel.

```text
VITE_API_BASE_URL=https://api.your-domain.com
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

## Redis

Use Upstash, Elasticache, Redis Cloud, or self-hosted Redis. BullMQ requires normal Redis commands, so avoid severely restricted serverless modes that disable blocking or Lua commands.

## MongoDB

Use MongoDB Atlas or a managed MongoDB cluster. Keep indexes enabled for `sourceUrl`, `action`, and `createdAt`.

## Cookies

Never commit `cookies.txt`. Store it on the backend filesystem, container secret volume, or secret manager. Rotate it when story downloads fail with authentication errors.

## Nginx

Use `deploy/nginx.conf` as a baseline. Put TLS termination in front with Certbot, AWS ACM, Cloudflare, or your platform's HTTPS layer.

## Scaling

- API: scale horizontally behind Nginx or a cloud load balancer.
- Worker: scale by queue depth and CPU/network capacity.
- Redis: use a managed instance sized for queue throughput and cache hit volume.
- MongoDB: use a replica set, then shard only when write volume requires it.
- Downloads: stream data; do not persist downloaded files on local disk.
- Rate limiting: keep limits in Redis or proxy-level rate limiting for multi-instance production.
