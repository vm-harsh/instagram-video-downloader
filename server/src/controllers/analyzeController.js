import { analyzeQueue, analyzeQueueEvents } from '../queue/analyzeQueue.js';
import { cache } from '../redis/client.js';
import { env } from '../config/env.js';
import { DownloadHistory } from '../models/DownloadHistory.js';
import { analyzeSchema, normalizeInstagramUrl } from '../utils/instagramUrl.js';
import { cacheKeyForUrl, hashValue } from '../utils/hash.js';

export async function analyzeInstagram(req, res, next) {
  try {
    const { url } = analyzeSchema.parse(req.body);
    const normalizedUrl = normalizeInstagramUrl(url);
    const cacheKey = cacheKeyForUrl(normalizedUrl);
    const jobId = hashValue(normalizedUrl);
    const cached = await cache.get(cacheKey);

    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const existingJob = await analyzeQueue.getJob(jobId);
    if (existingJob) {
      const state = await existingJob.getState();

      if (state === 'completed') {
        res.json(existingJob.returnvalue);
        return;
      }

      if (state === 'failed') {
        await existingJob.remove();
      }
    }

    const job = await analyzeQueue.add(
      'analyze',
      {
        url: normalizedUrl,
        ipHash: hashValue(req.ip || 'unknown')
      },
      {
        jobId
      }
    );

    try {
      const result = await job.waitUntilFinished(analyzeQueueEvents, env.ANALYZE_SYNC_WAIT_MS);
      res.json(result);
    } catch (error) {
      if (error.message?.includes('timed out')) {
        res.status(202).json({
          status: 'processing',
          jobId: job.id,
          pollUrl: `/api/analyze/${job.id}`
        });
        return;
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
}

export async function getAnalyzeJob(req, res, next) {
  try {
    const job = await analyzeQueue.getJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ message: 'Analyze job not found.' });
      return;
    }

    const state = await job.getState();
    if (state === 'completed') {
      res.json(job.returnvalue);
      return;
    }

    if (state === 'failed') {
      res.status(422).json({ message: job.failedReason || 'Analyze job failed.' });
      return;
    }

    res.status(202).json({ status: state, jobId: job.id });
  } catch (error) {
    next(error);
  }
}

export async function getHistory(req, res, next) {
  try {
    const history = await DownloadHistory.find().sort({ createdAt: -1 }).limit(25).lean();
    res.json(history);
  } catch (error) {
    next(error);
  }
}
