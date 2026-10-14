import { Pause, Timer } from 'lucide-react';
import { WARNING_SECONDS } from '../game/beep';
import { ANSWER_MS } from '../game/constants';

interface Props {
  remainingMs: number;
  /** True once the teacher has started the answering phase for this question. */
  started: boolean;
  running: boolean;
  paused: boolean;
  size?: 'md' | 'xl';
}

/** Large countdown. Never shows a negative value; state is also spelled out in words. */
export function CountdownTimer({ remainingMs, started, running, paused, size = 'md' }: Props) {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const fraction = Math.max(0, Math.min(1, remainingMs / ANSWER_MS));
  // 10 seconds and below: the whole timer turns red (and the projector beeps)
  const low = started && seconds <= WARNING_SECONDS && seconds > 0;
  const over = started && seconds === 0;

  let label = 'Timer not started';
  if (paused) label = 'Paused';
  else if (over) label = "Time's up!";
  else if (running) label = low ? 'Hurry!' : 'Time running';
  else if (started) label = 'Timer stopped';

  const tone = over
    ? 'border-red-500 bg-red-950/70 text-red-300'
    : low
      ? 'border-red-500 bg-red-950/60 text-red-300 shadow-[0_0_32px_rgba(239,68,68,0.6)]'
      : running
        ? 'border-gold-400 text-gold-300'
        : 'border-white/30 text-white';

  const big = size === 'xl';
  return (
    <div
      role="timer"
      aria-label={`Time remaining ${seconds} seconds. ${label}`}
      className={`flex flex-col items-center rounded-2xl border-4 bg-navy-900/80 ${big ? 'px-5 py-1' : 'px-6 py-3'} ${tone} ${low ? 'pulse-ring-red' : running ? 'pulse-ring' : ''}`}
    >
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest sm:text-base">
        {paused ? <Pause aria-hidden className="h-5 w-5" /> : <Timer aria-hidden className="h-5 w-5" />}
        <span>{label}</span>
      </div>
      <div
        className={`font-display tabular-nums leading-none ${big ? 'text-[clamp(2.5rem,min(6vw,9.5vh),6rem)]' : 'text-6xl sm:text-7xl'}`}
        aria-hidden
      >
        {seconds}
        <span className={`ml-1 font-sans font-bold ${big ? 'text-[clamp(1rem,min(1.8vw,2.8vh),1.8rem)]' : 'text-2xl'}`}>s</span>
      </div>
      <div className={`${big ? 'mt-1 h-2.5' : 'mt-2 h-3'} w-full min-w-[9rem] overflow-hidden rounded-full bg-white/15`} aria-hidden>
        <div
          className={`h-full rounded-full ${over || low ? 'bg-red-500' : 'bg-gold-400'}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}
