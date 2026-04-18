import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link, Search } from 'lucide-react';

export default function HeroInput({ onSubmit, loading }) {
  const [url, setUrl] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }
    );
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    if (!url.trim() || loading) return;
    onSubmit(url.trim());
  }

  return (
    <section ref={ref} className="relative z-10 mx-auto flex min-h-[58vh] w-full max-w-4xl flex-col justify-center px-5 pb-12 pt-10">
      <div className="mb-7 max-w-3xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-teal">Reels, posts, carousels, stories</p>
        <h2 className="text-balance text-4xl font-black leading-tight text-ink sm:text-5xl lg:text-6xl">
          Instagram Media Downloader
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
          Analyze public Instagram links, preview media, and stream downloads through a scalable queue-backed backend.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass panel flex w-full flex-col gap-3 p-3 shadow-glass sm:flex-row">
        <label className="flex min-h-14 flex-1 items-center gap-3 rounded-md bg-white px-4">
          <Link size={20} className="shrink-0 text-coral" />
          <input
            className="focus-ring h-full min-w-0 flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-slate-400"
            placeholder="Paste Instagram URL"
            value={url}
            onChange={event => setUrl(event.target.value)}
            disabled={loading}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="focus-ring group inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-ink px-6 font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
          onMouseEnter={event => gsap.to(event.currentTarget, { scale: 1.03, duration: 0.18 })}
          onMouseLeave={event => gsap.to(event.currentTarget, { scale: 1, duration: 0.18 })}
        >
          <Search size={18} />
          {loading ? 'Analyzing' : 'Analyze'}
        </button>
      </form>
    </section>
  );
}
