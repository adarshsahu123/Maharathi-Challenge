import type { FeedbackKind } from '../game/feedback';

const LOOK: Record<FeedbackKind, { emoji: string; label: string; glow: string }> = {
  right: { emoji: '😄', label: 'Correct answer', glow: 'bg-emerald-500/30' },
  wrong: { emoji: '😢', label: 'Wrong answer', glow: 'bg-rose-500/30' },
};

/** A big emoji that pops in the middle of the screen for about a second. Purely decorative: the status banner says the same in words. */
export function AnswerFeedback({ kind }: { kind: FeedbackKind }) {
  const look = LOOK[kind];
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center" aria-hidden={false}>
      <div role="img" aria-label={look.label} className="feedback-pop flex items-center justify-center rounded-full p-8">
        <span className={`absolute inset-0 rounded-full blur-2xl ${look.glow}`} aria-hidden />
        <span className="relative select-none text-[clamp(5.5rem,13vw,9rem)] leading-none drop-shadow-[0_6px_24px_rgba(0,0,0,0.6)]">{look.emoji}</span>
      </div>
    </div>
  );
}
