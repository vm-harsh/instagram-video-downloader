import { useEffect, useState } from 'react';
import { Clock3, ExternalLink } from 'lucide-react';
import { getHistory } from '../services/api.js';

export default function History() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getHistory()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  if (history.length === 0) return null;

  return (
    <section className="mx-auto mt-10 w-full max-w-5xl pb-16">
      <div className="mb-4 flex items-center gap-2 px-1">
        <Clock3 size={20} className="text-teal" />
        <h3 className="text-xl font-black text-ink">Recent history</h3>
      </div>
      <div className="panel glass divide-y divide-white/60 overflow-hidden shadow-lg">
        {history.map(item => (
          <a
            key={item._id}
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-white/60"
          >
            <span className="min-w-0">
              <span className="block font-bold capitalize text-ink">{item.type} {item.action}</span>
              <span className="block truncate text-slate-600">{item.sourceUrl}</span>
            </span>
            <ExternalLink size={16} className="shrink-0 text-slate-500" />
          </a>
        ))}
      </div>
    </section>
  );
}
