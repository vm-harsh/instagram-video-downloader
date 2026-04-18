import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Download } from 'lucide-react';
import { downloadUrl } from '../services/api.js';

export default function DownloadButton({ sourceUrl, index, mediaUrl, label = 'Download' }) {
  const [status, setStatus] = useState('idle');
  const progressRef = useRef(null);

  useEffect(() => {
    if (status !== 'downloading') return undefined;
    const tween = gsap.fromTo(progressRef.current, { scaleX: 0 }, { scaleX: 1, duration: 1.1, repeat: -1, ease: 'power1.inOut' });
    return () => tween.kill();
  }, [status]);

  function handleClick() {
    setStatus('downloading');
    window.location.href = downloadUrl(sourceUrl, index, mediaUrl);
    window.setTimeout(() => setStatus('success'), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="focus-ring relative inline-flex min-h-11 w-full overflow-hidden rounded-md bg-ink px-4 py-2 font-bold text-white shadow-md transition hover:bg-slate-800 sm:w-auto"
    >
      <span ref={progressRef} className="absolute inset-x-0 bottom-0 h-1 origin-left bg-teal" />
      <span className="relative flex items-center justify-center gap-2">
        <Download size={17} />
        {status === 'downloading' ? 'Starting' : status === 'success' ? 'Ready' : label}
      </span>
    </button>
  );
}
