import { DownloadCloud, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-white shadow-lg">
          <DownloadCloud size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal">InstaDL</p>
          <h1 className="text-lg font-bold text-ink">Media Downloader</h1>
        </div>
      </div>
      <div className="hidden items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-ink shadow-sm md:flex">
        <ShieldCheck size={16} className="text-teal" />
        Server-side cookies only
      </div>
    </header>
  );
}
