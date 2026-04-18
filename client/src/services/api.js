import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export async function analyzeUrl(url) {
  const response = await api.post('/api/analyze', { url });
  return response.data;
}

export async function pollAnalyze(jobId) {
  const response = await api.get(`/api/analyze/${jobId}`);
  return response.data;
}

export async function getHistory() {
  const response = await api.get('/api/history');
  return response.data;
}

export function downloadUrl(sourceUrl, index, mediaUrl) {
  const params = new URLSearchParams({ url: sourceUrl });
  if (Number.isInteger(index)) params.set('index', String(index));
  if (mediaUrl) params.set('mediaUrl', mediaUrl);
  return `${API_BASE_URL}/api/download?${params.toString()}`;
}
