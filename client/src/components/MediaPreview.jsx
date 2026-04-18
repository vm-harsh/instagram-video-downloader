import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { CalendarClock, Clock, Layers, MessageSquare } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

function formatDuration(seconds) {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function MediaPreview({ result }) {
  const ref = useRef(null);
  const firstMedia = result?.media?.[0];

  useEffect(() => {
    if (!result) return;
    gsap.fromTo(ref.current, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' });
  }, [result]);

  if (!result || !firstMedia) return null;

  return (
    <section ref={ref} className="panel glass mx-auto mt-6 grid w-full max-w-5xl gap-5 p-4 shadow-glass md:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-md bg-ink">
        {firstMedia.type === 'video' ? (
          <video
            className="aspect-video h-full w-full object-contain"
            src={firstMedia.url}
            poster={firstMedia.thumbnail}
            controls
            preload="metadata"
          />
        ) : (
          <img className="aspect-video h-full w-full object-contain" src={firstMedia.url || firstMedia.thumbnail} alt="Instagram preview" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-md bg-teal/10 px-3 py-1 text-sm font-bold capitalize text-teal">
            <Layers size={16} />
            {result.type}
          </span>
          <h3 className="mt-4 text-2xl font-black text-ink">Media preview</h3>
        </div>
        <div className="grid gap-2 text-sm text-slate-600">
          {formatDuration(result.duration) && (
            <p className="flex items-center gap-2">
              <Clock size={16} className="text-coral" />
              {formatDuration(result.duration)}
            </p>
          )}
          {result.timestamp && (
            <p className="flex items-center gap-2">
              <CalendarClock size={16} className="text-amber" />
              {new Date(result.timestamp).toLocaleString()}
            </p>
          )}
          {result.caption && (
            <p className="line-clamp-5 flex gap-2 leading-6">
              <MessageSquare size={16} className="mt-1 shrink-0 text-violet" />
              <span>{result.caption}</span>
            </p>
          )}
        </div>
        <div className="mt-auto">
          <DownloadButton
            sourceUrl={result.sourceUrl}
            mediaUrl={firstMedia.type === 'image' ? firstMedia.url : undefined}
            label="Download media"
          />
        </div>
      </div>
    </section>
  );
}
