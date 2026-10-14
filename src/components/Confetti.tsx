import { useMemo, type CSSProperties } from 'react';

const COLORS = ['#f8d24a', '#e9b322', '#ffffff', '#60a5fa', '#34d399', '#fb7185'];

/** Lightweight CSS-only celebration; disabled automatically for reduced-motion users. */
export function Confetti({ count = 130 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 97) % 100}%`,
        color: COLORS[i % COLORS.length],
        delay: `${(i % 12) * 0.28}s`,
        dur: `${3.6 + (i % 5) * 0.5}s`,
        dx: `${((i % 7) - 3) * 24}px`,
        w: `${8 + (i % 4) * 3}px`,
        h: `${i % 3 === 0 ? 12 + (i % 4) * 3 : 16 + (i % 5) * 3}px`,
        round: i % 3 === 0,
      })),
    [count],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: p.left,
              background: p.color,
              '--delay': p.delay,
              '--dur': p.dur,
              '--dx': p.dx,
              '--w': p.w,
              '--h': p.h,
              borderRadius: p.round ? '9999px' : '2px',
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
