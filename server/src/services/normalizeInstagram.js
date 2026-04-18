import { inferTypeFromUrl } from '../utils/instagramUrl.js';

function pickBestFormat(info) {
  const formats = Array.isArray(info.formats) ? info.formats : [];
  const directFormats = formats.filter(format => format.url && ['https://', 'http://'].some(protocol => format.url.startsWith(protocol)));
  const progressive = directFormats
    .filter(format => format.vcodec && format.vcodec !== 'none' && format.acodec && format.acodec !== 'none')
    .sort((a, b) => (b.height || 0) - (a.height || 0));
  const videoOnly = directFormats
    .filter(format => format.vcodec && format.vcodec !== 'none')
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  return progressive[0]?.url || info.url || videoOnly[0]?.url || info.webpage_url || '';
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

export function normalizeInstagramMetadata(raw, sourceUrl) {
  const root = Array.isArray(raw) ? raw[0] : raw;
  const entries = Array.isArray(root?.entries) ? root.entries.filter(Boolean) : [];
  const media = entries.length > 0 ? entries.map(mapEntry) : [mapEntry(root)];
  const inferred = inferTypeFromUrl(sourceUrl);
  const type = entries.length > 1 ? 'carousel' : inferred;

  const normalized = {
    type,
    media: media.filter(item => item.url || item.thumbnail),
    caption: root?.description || root?.title || '',
    duration: root?.duration || media.find(item => item.duration)?.duration,
    timestamp: root?.timestamp ? new Date(root.timestamp * 1000).toISOString() : null,
    sourceUrl,
    extractor: root?.extractor_key || root?.extractor || 'Instagram'
  };

  if (normalized.media.length === 0) {
    throw new Error('No media found for this Instagram URL.');
  }

  return normalized;
}
