import { Star, Swords } from 'lucide-react';
import type { QuestionView } from '../game/view';
import { AnswerOption } from './AnswerOption';

interface Props {
  view: QuestionView;
  size: 'teacher' | 'display';
  /** Teacher only: clicking an option judges the team's answer immediately. */
  onSelect?: (index: number) => void;
  /** Whether the options may currently be chosen. */
  selectable?: boolean;
}

const DIFF_STYLE = {
  Easy: 'border-emerald-300 bg-emerald-900/60 text-emerald-100',
  Intermediate: 'border-amber-300 bg-amber-900/60 text-amber-100',
  Hard: 'border-rose-300 bg-rose-900/60 text-rose-100',
} as const;

export function QuestionMeta({ view, big }: { view: QuestionView; big?: boolean }) {
  const size = big ? 'text-[clamp(0.9rem,min(1.4vw,2.4vh),1.4rem)] !px-3 !py-0.5' : '';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`chip border-gold-400 bg-gold-400 text-navy-950 ${size}`}>
        {view.isTiebreak ? (
          <>
            <Swords aria-hidden className="h-5 w-5" /> TIE-BREAKER
          </>
        ) : (
          <>Question {view.number} / {view.total}</>
        )}
      </span>
      <span className={`chip ${DIFF_STYLE[view.difficulty]} ${size}`}>{view.difficulty}</span>
      <span className={`chip border-gold-300 bg-navy-900 text-gold-300 ${size}`}>
        <Star aria-hidden className="h-4 w-4" /> {view.points} points
      </span>
    </div>
  );
}

export function QuestionCard({ view, size, onSelect, selectable }: Props) {
  const big = size === 'display';
  return (
    <section className={`panel ${big ? "p-[clamp(0.5rem,1.2vh,1rem)]" : "p-4 sm:p-6"}`} aria-label="Question">
      <QuestionMeta view={view} big={big} />
      <h2
        className={`${big ? "mt-2" : "mt-4"} font-bold leading-snug text-white ${
          big ? 'text-[clamp(1.25rem,min(2.8vw,4.4vh),3rem)]' : 'text-2xl sm:text-3xl'
        }`}
      >
        {view.text}
      </h2>
      <div className={`${big ? 'mt-2 md:gap-3' : 'mt-5'} grid grid-cols-1 gap-3 md:grid-cols-2`}>
        {view.options.map((o) => (
          <AnswerOption key={o.index} option={o} size={size} onSelect={onSelect} disabled={!selectable} />
        ))}
      </div>
    </section>
  );
}
