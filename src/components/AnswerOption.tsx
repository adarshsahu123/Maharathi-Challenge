import { Check, KeyRound, MinusCircle, X } from 'lucide-react';
import type { OptionView } from '../game/view';

interface Props {
  option: OptionView;
  /** When provided the option is a button (teacher): clicking it judges the team's answer. */
  onSelect?: (index: number) => void;
  disabled?: boolean;
  size: 'teacher' | 'display';
}

const BASE = 'relative flex w-full items-center gap-4 rounded-2xl border-4 text-left transition-colors';

const STYLES: Record<OptionView['status'], string> = {
  normal: 'border-white/30 bg-navy-700/80',
  removed: 'border-dashed border-white/20 bg-black/20 text-white/40',
  eliminated: 'border-dashed border-white/25 bg-black/20 text-white/55 line-through',
  tried: 'border-rose-300 bg-rose-900/50 text-white',
  correct: 'border-emerald-300 bg-emerald-700/50 shadow-[0_0_30px_rgba(52,211,153,0.5)]',
  wrong: 'border-rose-300 bg-rose-800/50',
};

function StatusTag({ option }: { option: OptionView }) {
  const common = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold uppercase tracking-wide';
  switch (option.status) {
    case 'correct':
      return (
        <span className={`${common} bg-emerald-300 text-emerald-950`}>
          <Check aria-hidden className="h-4 w-4" /> Correct answer
        </span>
      );
    case 'wrong':
    case 'tried':
      return (
        <span className={`${common} bg-rose-300 text-rose-950`}>
          <X aria-hidden className="h-4 w-4" /> Incorrect
        </span>
      );
    case 'removed':
    case 'eliminated':
      return (
        <span className={`${common} bg-white/15 text-white`}>
          <MinusCircle aria-hidden className="h-4 w-4" /> Removed by 50:50
        </span>
      );
    default:
      return null;
  }
}

export function AnswerOption({ option, onSelect, disabled, size }: Props) {
  const big = size === 'display';
  const hiddenText = option.status === 'removed' && option.text === '';
  const interactive = Boolean(onSelect);
  const isDisabled = disabled || option.status === 'removed' || option.status === 'tried';

  const body = (
    <>
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gold-400 font-display text-navy-950 ${
          big ? 'h-[clamp(2.25rem,min(3.4vw,5.4vh),3.5rem)] w-[clamp(2.25rem,min(3.4vw,5.4vh),3.5rem)] text-[clamp(1.2rem,min(2vw,3.2vh),2.1rem)]' : 'h-12 w-12 text-2xl'
        } ${option.status === 'removed' || option.status === 'eliminated' ? 'opacity-40' : ''}`}
      >
        {option.label}
      </span>
      <span className={`flex min-w-0 flex-1 ${big ? 'flex-row flex-wrap items-center gap-x-3 gap-y-1 py-1' : 'flex-col gap-1.5 py-3'} pr-3`}>
        <span
          className={`break-words font-semibold leading-snug ${
            big ? 'text-[clamp(1.05rem,min(2vw,3.4vh),2.2rem)]' : 'text-xl'
          }`}
        >
          {hiddenText ? <span className="italic opacity-70">— removed (50:50) —</span> : option.text}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <StatusTag option={option} />
          {option.isKey && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-300 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-sky-950">
              <KeyRound aria-hidden className="h-4 w-4" /> Correct answer (teacher only)
            </span>
          )}
        </span>
      </span>
    </>
  );

  const cls = `${BASE} ${STYLES[option.status]} ${big ? 'min-h-[clamp(3rem,7.4vh,6.5rem)] pl-3' : 'min-h-[84px] pl-3'}`;
  const ariaLabel = `Option ${option.label}: ${hiddenText ? 'removed by 50:50' : option.text}`;

  if (!interactive) {
    return (
      <div className={cls} aria-label={ariaLabel} role="group">
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={`${cls} ${isDisabled ? 'cursor-not-allowed' : 'hover:border-gold-300 hover:bg-navy-600'}`}
      disabled={isDisabled}
      aria-label={ariaLabel}
      onClick={() => onSelect?.(option.index)}
    >
      {body}
    </button>
  );
}
