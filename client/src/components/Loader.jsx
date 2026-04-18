import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Loader({ label = 'Processing' }) {
  const dotRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to('.loader-dot', {
        y: -8,
        repeat: -1,
        yoyo: true,
        duration: 0.45,
        stagger: 0.12,
        ease: 'power1.inOut'
      });
    }, dotRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex min-h-24 items-center justify-center gap-3 text-sm font-semibold text-slate-600">
      <div ref={dotRef} className="flex gap-1.5">
        <span className="loader-dot h-2.5 w-2.5 rounded-full bg-coral" />
        <span className="loader-dot h-2.5 w-2.5 rounded-full bg-amber" />
        <span className="loader-dot h-2.5 w-2.5 rounded-full bg-teal" />
      </div>
      {label}
    </div>
  );
}
