import sanitize from 'sanitize-filename';
import { createYtDlpDownloadStream } from '../services/ytDlp.js';
import { DownloadHistory } from '../models/DownloadHistory.js';
import { normalizeInstagramUrl } from '../utils/instagramUrl.js';
import { hashValue } from '../utils/hash.js';

const allowedMediaHosts = ['cdninstagram.com', 'fbcdn.net'];

function isAllowedMediaUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      allowedMediaHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

async function streamDirectMedia(req, res, normalizedUrl, mediaUrl, index) {
  if (!isAllowedMediaUrl(mediaUrl)) {
    res.status(400).json({ message: 'Invalid media URL.' });
    return;
  }

  const response = await fetch(mediaUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok || !response.body) {
    res.status(422).json({ message: 'Unable to download media from Instagram right now.' });
    return;
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const fileName = sanitize(`instagram-${Date.now()}${index !== undefined ? `-${index + 1}` : ''}.${extension}`);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'private, no-store');

  await DownloadHistory.create({
    sourceUrl: normalizedUrl,
    type: 'post',
    media: [{ url: mediaUrl, type: 'image' }],
    action: 'download',
    ipHash: hashValue(req.ip || 'unknown')
  }).catch(error => req.log.warn({ err: error }, 'failed to save download history'));

  const reader = response.body.getReader();

  async function pump() {
    const { done, value } = await reader.read();
    if (done) {
      res.end();
      return;
    }

    if (!res.write(Buffer.from(value))) {
      await new Promise(resolve => res.once('drain', resolve));
    }

    await pump();
  }

  await pump();
}

export async function downloadMedia(req, res, next) {
  let child;

  try {
    const normalizedUrl = normalizeInstagramUrl(String(req.query.url || ''));
    const index = req.query.index === undefined ? undefined : Number(req.query.index);
    const mediaUrl = String(req.query.mediaUrl || '');

    if (index !== undefined && (!Number.isInteger(index) || index < 0 || index > 50)) {
      res.status(400).json({ message: 'Invalid carousel index.' });
      return;
    }

    if (mediaUrl) {
      await streamDirectMedia(req, res, normalizedUrl, mediaUrl, index);
      return;
    }

    child = createYtDlpDownloadStream(normalizedUrl, index);
    const fileName = sanitize(`instagram-${Date.now()}${index !== undefined ? `-${index + 1}` : ''}.mp4`);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, no-store');

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => {
      req.log.warn({ ytDlp: chunk }, 'yt-dlp download warning');
    });

    child.on('error', error => {
      if (!res.headersSent) next(error);
      else req.destroy(error);
    });

    child.on('close', async code => {
      if (code === 0) {
        await DownloadHistory.create({
          sourceUrl: normalizedUrl,
          type: 'post',
          media: [],
          action: 'download',
          ipHash: hashValue(req.ip || 'unknown')
        }).catch(error => req.log.warn({ error }, 'failed to save download history'));
      }
    });

    req.on('close', () => {
      if (!child.killed) child.kill('SIGTERM');
    });

    child.stdout.pipe(res);
  } catch (error) {
    if (child && !child.killed) child.kill('SIGTERM');
    next(error);
  }
}
