import { BookOpen, CircleCheck, CircleX, Info } from 'lucide-react';
import type { GameState } from '../game/types';
import { statusLine, type Tone } from '../game/status';
import type { QuestionView } from '../game/view';

const TONE: Record<Tone, string> = {
  info: 'border-sky-300 bg-sky-900/50',
  active: 'border-gold-400 bg-gold-400/15',
  good: 'border-emerald-300 bg-emerald-800/50',
  bad: 'border-rose-300 bg-rose-900/50',
  warn: 'border-amber-300 bg-amber-900/50',
};

function ToneIcon({ tone }: { tone: Tone }) {
  const cls = 'h-8 w-8 shrink-0';
  if (tone === 'good') return <CircleCheck aria-hidden className={cls} />;
  if (tone === 'bad') return <CircleX aria-hidden className={cls} />;
  return <Info aria-hidden className={cls} />;
}

/** Status banner + (after reveal) the correct answer and explanation. */
export function AnswerReveal({ state, view, now, size }: { state: GameState; view: QuestionView | null; now: number; size: 'teacher' | 'display' }) {
  const status = statusLine(state, now);
  const big = size === 'display';
  const showAnswer = state.phase === 'reveal' && state.answerShown && view?.explanation;
  if (big) {
    // Projector: one compact panel (status on top, correct answer + reason underneath) so nothing needs scrolling.
    return (
      <div className={`overflow-hidden rounded-2xl border-4 ${TONE[status.tone]}`}>
        <div role="status" aria-live="polite" className="flex items-center gap-3 px-4 py-1.5 text-[clamp(1.05rem,min(2vw,3.2vh),2rem)] font-bold">
          <ToneIcon tone={status.tone} />
          <span className="rounded-md bg-white/15 px-2 py-0.5 text-[0.7em] uppercase tracking-wider">{status.badge}</span>
          <span className="min-w-0 flex-1 break-words">{status.text}</span>
        </div>
        {showAnswer && view && (
          <div data-testid="answer-block" className="border-t-2 border-emerald-300/70 bg-emerald-950/60 px-4 py-1.5 text-[clamp(1rem,min(1.8vw,2.9vh),1.7rem)]">
            <p className="flex items-center gap-2 font-extrabold text-emerald-200">
              <CircleCheck aria-hidden className="h-5 w-5 shrink-0" /> Correct answer: Option {view.correctLabel}
            </p>
            <p className="mt-0.5 flex gap-2 leading-snug">
              <BookOpen aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold-300" />
              <span>{view.explanation}</span>
            </p>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={big ? "space-y-2" : "space-y-3"}>
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-3 rounded-2xl border-4 px-5 ${big ? "py-2" : "py-3"} ${TONE[status.tone]} ${big ? 'text-[clamp(1.1rem,min(2.2vw,3.8vh),2.3rem)]' : 'text-xl'} font-bold`}
      >
        <ToneIcon tone={status.tone} />
        <span className="rounded-md bg-white/15 px-2 py-0.5 text-[0.7em] uppercase tracking-wider">{status.badge}</span>
        <span className="min-w-0 flex-1 break-words">{status.text}</span>
      </div>
      {showAnswer && view && (
        <div data-testid="answer-block" className={`rounded-2xl border-4 border-emerald-300 bg-emerald-900/40 px-5 ${big ? "py-2" : "py-4"} ${big ? 'text-[clamp(1rem,min(1.9vw,3.3vh),2rem)]' : 'text-lg'}`}>
          <p className="flex items-center gap-2 font-extrabold text-emerald-200">
            <CircleCheck aria-hidden className="h-6 w-6" /> Correct answer: Option {view.correctLabel}
          </p>
          <p className="mt-2 flex gap-2 leading-relaxed">
            <BookOpen aria-hidden className="mt-1 h-6 w-6 shrink-0 text-gold-300" />
            <span>{view.explanation}</span>
          </p>
        </div>
      )}
    </div>
  );
}
