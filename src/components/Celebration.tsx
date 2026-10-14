import type { CSSProperties } from 'react';
import { APPLAUSE_START } from '../game/sound';

const COLORS = ['#f8d24a', '#fb7185', '#60a5fa', '#34d399', '#f97316', '#c084fc'];

// where the fireworks burst (percent of the screen), when, and in what colour
const BURSTS = [
  { left: 14, top: 22, delay: 0.2 },
  { left: 84, top: 18, delay: 0.9 },
  { left: 28, top: 62, delay: 1.5 },
  { left: 72, top: 58, delay: 0.5 },
  { left: 50, top: 12, delay: 1.2 },
  { left: 8, top: 72, delay: 2.0 },
  { left: 92, top: 70, delay: 1.7 },
];
const PARTICLES = 14;
const BALLOONS = ['🎈', '🎈', '🎈', '🎈', '🎈', '🎈', '🎈', '🎈'];
const CLAPS = 22;

/**
 * Decorative party layers behind the results: colour-shifting lights, a spinning spotlight, fireworks, balloons,
 * and — when the applause starts — a rain of clapping hands. Hidden for people who prefer reduced motion.
 */
export function Celebration({ winnerName }: { winnerName: string }) {
  return (
    <>
    <div aria-hidden className="fx pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="party-glow" />
      <div className="rays" />

      {BURSTS.map((b, i) => (
        <div key={i} className="absolute" style={{ left: `${b.left}%`, top: `${b.top}%` }}>
          {Array.from({ length: PARTICLES }, (_, p) => (
            <span
              key={p}
              className="fw-particle"
              style={
                {
                  '--a': `${(360 / PARTICLES) * p}deg`,
                  '--c': COLORS[(i + p) % COLORS.length],
                  '--d': `${b.delay}s`,
                  '--r': `${90 + (p % 3) * 22}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}

      {BALLOONS.map((emoji, i) => (
        <span
          key={i}
          className="balloon"
          style={{ left: `${6 + i * 12.5}%`, animationDelay: `${i * 0.9}s`, fontSize: `${2.6 + (i % 3) * 0.9}rem` } as CSSProperties}
        >
          {emoji}
        </span>
      ))}

      {/* the clapping hands rise when the sound of applause begins */}
      {Array.from({ length: CLAPS }, (_, i) => (
        <span
          key={i}
          className="clap-hand"
          style={{ left: `${3 + ((i * 37) % 94)}%`, animationDelay: `${APPLAUSE_START + (i % 11) * 0.45}s`, fontSize: `${2 + (i % 4) * 0.6}rem` } as CSSProperties}
        >
          👏
        </span>
      ))}
    </div>

    {/* The warm congratulation appears the moment the winner does, while the voice says it. It lives in its own layer ABOVE the score cards. */}
    <div aria-hidden className="congrats fx" style={{ animationDelay: '0.3s' } as CSSProperties}>
      <p className="font-display text-[clamp(1.6rem,min(3.6vw,6vh),3.5rem)] leading-tight">🎊 Congratulations, {winnerName}! 🎊</p>
      <p className="mt-1 text-[clamp(1.05rem,min(1.8vw,3vh),1.8rem)] font-semibold">What a brilliant game. You are our Maharathi!</p>
    </div>
    </>
  );
}
