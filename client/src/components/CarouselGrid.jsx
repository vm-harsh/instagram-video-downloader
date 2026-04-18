import { Images } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

export default function CarouselGrid({ result }) {
  if (!result || result.media?.length <= 1) return null;

  return (
    <section className="mx-auto mt-8 w-full max-w-5xl px-0">
      <div className="mb-4 flex items-center gap-2 px-1">
        <Images size={20} className="text-coral" />
        <h3 className="text-xl font-black text-ink">Carousel media</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.media.map((item, index) => (
          <article key={`${item.url}-${index}`} className="panel glass overflow-hidden p-3 shadow-lg">
            <div className="mb-3 overflow-hidden rounded-md bg-ink">
              {item.type === 'video' ? (
                <video className="aspect-square w-full object-cover" src={item.url} poster={item.thumbnail} controls preload="metadata" />
              ) : (
                <img className="aspect-square w-full object-cover" src={item.url || item.thumbnail} alt={`Carousel item ${index + 1}`} />
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold capitalize text-slate-700">Item {index + 1}: {item.type}</p>
              <DownloadButton
                sourceUrl={result.sourceUrl}
                index={index}
                mediaUrl={item.type === 'image' ? item.url : undefined}
                label="Download"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
