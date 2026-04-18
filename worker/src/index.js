import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import pino from 'pino';
import { z } from 'zod';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

dotenv.config();

const env = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    MONGODB_URI: z.string().min(1),
    REDIS_URL: z.string().min(1),
    YT_DLP_PATH: z.string().default('yt-dlp'),
    COOKIES_PATH: z.string().default('../server/secrets/cookies.txt'),
    ANALYZE_CACHE_TTL_SECONDS: z.coerce.number().default(600),
    WORKER_CONCURRENCY: z.coerce.number().default(4)
  })
  .parse(process.env);

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' }
        }
});

const mediaSchema = new mongoose.Schema(
  {
    url: String,
    thumbnail: String,
    type: { type: String, enum: ['image', 'video'], required: true },
    width: Number,
    height: Number,
    duration: Number
  },
  { _id: false }
);

const DownloadHistory = mongoose.model(
  'DownloadHistory',
  new mongoose.Schema(
    {
      sourceUrl: { type: String, required: true, index: true },
      type: { type: String, enum: ['reel', 'post', 'story', 'carousel'], required: true },
      caption: String,
      duration: Number,
      timestamp: Date,
      media: [mediaSchema],
      action: { type: String, enum: ['analyze', 'download'], default: 'analyze', index: true },
      ipHash: String
    },
    { timestamps: true }
  )
);

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});
const cache = new Redis(env.REDIS_URL);

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function cacheKeyForUrl(url) {
  return `analyze:${hashValue(url)}`;
}

function inferTypeFromUrl(url) {
  const pathname = new URL(url).pathname;
  if (pathname.includes('/reel/')) return 'reel';
  if (pathname.includes('/stories/')) return 'story';
  return 'post';
}

function cookieHeaderFromFile(filePath) {
  if (!existsSync(filePath)) return '';

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('\t'))
    .filter(parts => parts.length >= 7)
    .map(parts => `${parts[5]}=${parts.slice(6).join('\t')}`)
    .join('; ');
}

function decodeHtml(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function metaContent(html, property) {
  const escaped = property.replaceAll(':', '\\:');
  const patterns = [
    new RegExp(`<meta\\s+property=["']${escaped}["']\\s+content=["']([^"']+)`, 'i'),
    new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+property=["']${escaped}["']`, 'i')
  ];
  const match = patterns.map(pattern => html.match(pattern)).find(Boolean);
  return match ? decodeHtml(match[1]) : '';
}

async function fetchInstagramImageMetadata(url) {
  const cookiesPath = path.resolve(process.cwd(), env.COOKIES_PATH);
  const cookie = cookieHeaderFromFile(cookiesPath);
  const response = await fetch(url, {
    headers: {
      cookie,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Instagram page fetch failed with HTTP ${response.status}.`);
  }

  const html = await response.text();
  const imageUrl = metaContent(html, 'og:image');
  if (!imageUrl) throw new Error('No image media found for this Instagram URL.');

  return {
    type: inferTypeFromUrl(url),
    media: [
      {
        url: imageUrl,
        thumbnail: imageUrl,
        type: 'image'
      }
    ],
    caption: metaContent(html, 'og:description'),
    duration: undefined,
    timestamp: null,
    sourceUrl: url
  };
}

function runYtDlpJson(url) {
  return new Promise((resolve, reject) => {
    const args = ['--no-playlist'];
    const cookiesPath = path.resolve(process.cwd(), env.COOKIES_PATH);

    if (existsSync(cookiesPath)) {
      args.push('--cookies', cookiesPath);
    }

    args.push('-j', url);

    const child = spawn(
      env.YT_DLP_PATH,
      args,
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.on('error', error => reject(new Error(normalizeYtDlpError(error.message))));
    child.on('close', code => {
      if (code !== 0) {
        const error = new Error(normalizeYtDlpError(stderr));
        error.rawYtDlpError = stderr;
        reject(error);
        return;
      }

      const lines = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        const error = new Error(normalizeYtDlpError(stderr || 'yt-dlp returned no metadata.'));
        error.rawYtDlpError = stderr;
        reject(error);
        return;
      }

      try {
        resolve(lines.length > 1 ? lines.map(JSON.parse) : JSON.parse(lines[0]));
      } catch (error) {
        reject(new Error(`Unable to parse yt-dlp metadata: ${error.message}`));
      }
    });
  });
}

function normalizeYtDlpError(rawError) {
  const lower = rawError.toLowerCase();
  if (lower.includes('there is no video in this post')) {
    return 'This Instagram post contains an image, not a video.';
  }
  if (lower.includes('enoent')) {
    return 'yt-dlp was not found. Install yt-dlp or set YT_DLP_PATH to the full executable path.';
  }
  if (lower.includes('eacces')) {
    return 'yt-dlp exists but Windows denied execution. Reinstall yt-dlp or set YT_DLP_PATH to a working executable.';
  }
  if (lower.includes('cookies') || lower.includes('login required')) {
    return 'Instagram authentication failed or cookies are expired. Refresh cookies.txt on the server.';
  }
  if (lower.includes('requested content is not available')) {
    return 'This media is private, deleted, or unavailable.';
  }
  if (lower.includes('unable to extract')) {
    return 'Instagram extraction failed. Update yt-dlp and retry.';
  }
  return 'Unable to extract media from Instagram right now.';
}

function pickBestFormat(info) {
  const formats = Array.isArray(info.formats) ? info.formats : [];
  const direct = formats
    .filter(format => format.url && ['https://', 'http://'].some(protocol => format.url.startsWith(protocol)))
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  return direct[0]?.url || info.url || info.webpage_url || '';
}

function mediaType(info) {
  if (info.vcodec && info.vcodec !== 'none') return 'video';
  if (info.ext && ['mp4', 'webm', 'mov', 'mkv'].includes(info.ext)) return 'video';
  return 'image';
}

function mapEntry(entry) {
  return {
    url: pickBestFormat(entry),
    thumbnail: entry.thumbnail || entry.thumbnails?.at(-1)?.url || '',
    type: mediaType(entry),
    width: entry.width,
    height: entry.height,
    duration: entry.duration
  };
}

function normalizeInstagramMetadata(raw, sourceUrl) {
  const root = Array.isArray(raw) ? raw[0] : raw;
  const entries = Array.isArray(root?.entries) ? root.entries.filter(Boolean) : [];
  const media = entries.length > 0 ? entries.map(mapEntry) : [mapEntry(root)];
  const type = entries.length > 1 ? 'carousel' : inferTypeFromUrl(sourceUrl);

  const normalized = {
    type,
    media: media.filter(item => item.url || item.thumbnail),
    caption: root?.description || root?.title || '',
    duration: root?.duration || media.find(item => item.duration)?.duration,
    timestamp: root?.timestamp ? new Date(root.timestamp * 1000).toISOString() : null,
    sourceUrl
  };

  if (normalized.media.length === 0) throw new Error('No media found for this Instagram URL.');
  return normalized;
}

await mongoose.connect(env.MONGODB_URI, {
  autoIndex: env.NODE_ENV !== 'production'
});

const worker = new Worker(
  'instagram-analyze',
  async job => {
    const { url, ipHash } = job.data;
    const key = cacheKeyForUrl(url);
    const cached = await cache.get(key);

    if (cached) return JSON.parse(cached);

    let normalized;

    try {
      const raw = await runYtDlpJson(url);
      normalized = normalizeInstagramMetadata(raw, url);
    } catch (error) {
      if (error.rawYtDlpError?.toLowerCase().includes('there is no video in this post')) {
        normalized = await fetchInstagramImageMetadata(url);
      } else {
        throw error;
      }
    }

    await cache.set(key, JSON.stringify(normalized), 'EX', env.ANALYZE_CACHE_TTL_SECONDS);
    await DownloadHistory.create({
      sourceUrl: url,
      type: normalized.type,
      caption: normalized.caption,
      duration: normalized.duration,
      timestamp: normalized.timestamp,
      media: normalized.media,
      action: 'analyze',
      ipHash
    });

    return normalized;
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
    limiter: {
      max: 120,
      duration: 60000
    }
  }
);

worker.on('completed', job => logger.info({ jobId: job.id }, 'analyze job completed'));
worker.on('failed', (job, error) => logger.error({ jobId: job?.id, err: error }, 'analyze job failed'));

async function shutdown(signal) {
  logger.info({ signal }, 'shutting down worker');
  await Promise.allSettled([worker.close(), connection.quit(), cache.quit(), mongoose.disconnect()]);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.info({ concurrency: env.WORKER_CONCURRENCY }, 'worker listening');
