import { Trophy } from 'lucide-react';

export const TITLE = 'WHO IS OUR MAHARATHI?';
export const TAGLINE = 'Think Fast. Answer Smart. Become a Maharathi!';

export function Brand({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2 font-display text-xl tracking-wide text-gold-400">
        <Trophy aria-hidden className="h-6 w-6" />
        <span>{TITLE}</span>
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-gold-400 bg-navy-800 shadow-[0_0_60px_rgba(248,210,74,0.45)]">
        <Trophy aria-hidden className="h-14 w-14 text-gold-400" />
      </div>
      <h1 className="font-display text-[clamp(2.25rem,6vw,5rem)] leading-tight tracking-wide text-gold-400 drop-shadow-[0_0_24px_rgba(248,210,74,0.45)]">
        {TITLE}
      </h1>
      <p className="mt-3 text-[clamp(1.1rem,2.2vw,1.75rem)] font-semibold text-white">“{TAGLINE}”</p>
    </div>
  );
}
