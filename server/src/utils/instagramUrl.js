import { z } from 'zod';

const allowedHosts = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com']);

export const analyzeSchema = z.object({
  url: z.string().trim().url().max(2048)
});

export function normalizeInstagramUrl(input) {
  const parsed = new URL(input);
  const host = parsed.hostname.toLowerCase();

  if (!allowedHosts.has(host)) {
    throw new Error('Only instagram.com URLs are supported.');
  }

  parsed.hash = '';
  parsed.searchParams.delete('utm_source');
  parsed.searchParams.delete('utm_medium');
  parsed.searchParams.delete('utm_campaign');

  return parsed.toString();
}

export function inferTypeFromUrl(url) {
  const pathname = new URL(url).pathname;
  if (pathname.includes('/reel/')) return 'reel';
  if (pathname.includes('/stories/')) return 'story';
  return 'post';
}
