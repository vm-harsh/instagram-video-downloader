import { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import HeroInput from '../components/HeroInput.jsx';
import MediaPreview from '../components/MediaPreview.jsx';
import CarouselGrid from '../components/CarouselGrid.jsx';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import History from '../components/History.jsx';
import BackgroundScene from '../components/BackgroundScene.jsx';
import { analyzeUrl, pollAnalyze } from '../services/api.js';

function extractError(error) {
  return error.response?.data?.message || error.message || 'Something went wrong.';
}

export default function Home() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAnalyze(url) {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const initial = await analyzeUrl(url);

      if (initial.status === 'processing') {
        const startedAt = Date.now();
        let current = initial;

        while (current.status && Date.now() - startedAt < 60000) {
          await new Promise(resolve => window.setTimeout(resolve, 1800));
          current = await pollAnalyze(initial.jobId);
        }

        if (current.status) throw new Error('Processing is taking longer than expected. Try again shortly.');
        setResult(current);
      } else {
        setResult(initial);
      }
    } catch (requestError) {
      setError(extractError(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#fef3c7,transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_46%,#ecfeff_100%)]">
      <BackgroundScene />
      <Navbar />
      <HeroInput onSubmit={handleAnalyze} loading={loading} />
      <div className="relative z-10 px-5">
        {loading && <Loader label="Extracting media metadata" />}
        <ErrorMessage message={error} />
        <MediaPreview result={result} />
        <CarouselGrid result={result} />
        <History />
      </div>
    </main>
  );
}
