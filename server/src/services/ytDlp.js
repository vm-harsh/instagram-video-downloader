import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const ERROR_HINTS = [
  ['enoent', 'yt-dlp was not found. Install yt-dlp or set YT_DLP_PATH to the full executable path.'],
  ['eacces', 'yt-dlp exists but Windows denied execution. Reinstall yt-dlp or set YT_DLP_PATH to a working executable.'],
  ['cookies', 'Instagram authentication failed or cookies are expired. Refresh cookies.txt on the server.'],
  ['login required', 'Instagram requires authentication for this media. Provide valid server-side cookies.txt.'],
  ['requested content is not available', 'This media is private, deleted, or unavailable in the current region.'],
  ['unable to extract', 'Instagram changed its response format or blocked this request. Update yt-dlp and retry.']
];

function resolveCookiesPath() {
  return path.resolve(process.cwd(), env.COOKIES_PATH);
}

function buildBaseArgs() {
  const args = ['--no-playlist'];
  const cookiesPath = resolveCookiesPath();

  if (existsSync(cookiesPath)) {
    args.push('--cookies', cookiesPath);
  }

  return args;
}

export function runYtDlpJson(url, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(env.YT_DLP_PATH, [...buildBaseArgs(), ...extraArgs, '-j', url], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

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
    child.on('error', error => reject(new Error(toUserFacingYtDlpError(error.message))));
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(toUserFacingYtDlpError(stderr || `yt-dlp exited with code ${code}`)));
        return;
      }

      try {
        const lines = stdout
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);

        if (lines.length === 0) {
          reject(new Error(toUserFacingYtDlpError(stderr || 'yt-dlp returned no metadata.')));
          return;
        }

        resolve(lines.length > 1 ? lines.map(JSON.parse) : JSON.parse(lines[0]));
      } catch (error) {
        reject(new Error(`Unable to parse yt-dlp response: ${error.message}`));
      }
    });
  });
}

export function createYtDlpDownloadStream(url, index) {
  const args = [...buildBaseArgs()];

  if (Number.isInteger(index) && index >= 0) {
    args.push('--playlist-items', String(index + 1));
  }

  args.push('-f', 'bv*+ba/best', '-o', '-', url);

  return spawn(env.YT_DLP_PATH, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
}

function toUserFacingYtDlpError(rawError) {
  const lower = rawError.toLowerCase();
  if (lower.includes('there is no video in this post')) {
    return 'This Instagram post contains an image, not a video.';
  }
  const match = ERROR_HINTS.find(([needle]) => lower.includes(needle));
  return match ? match[1] : 'Unable to extract media from Instagram right now.';
}
