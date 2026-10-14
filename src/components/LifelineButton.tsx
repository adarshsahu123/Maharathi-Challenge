import { Scissors } from 'lucide-react';

/** Teacher control: activates the 50:50 lifeline for the team that is currently answering. */
export function LifelineButton({
  teamName,
  used,
  enabled,
  reason,
  onUse,
  compact,
}: {
  teamName: string;
  used: boolean;
  enabled: boolean;
  /** Why it is disabled — shown under the button so the teacher is never confused. */
  reason: string;
  onUse: () => void;
  /** Compact: no caption under the button (used in the Student Display bar). */
  compact?: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        className={`btn btn-secondary ${compact ? '!min-h-[56px] !px-5 !py-2 !text-lg' : 'w-full'}`}
        disabled={!enabled}
        onClick={onUse}
        title={enabled ? 'Removes two wrong options' : used ? '50:50 already used by this team' : reason}
      >
        <Scissors aria-hidden className="h-6 w-6" />
        50:50 — {teamName}
      </button>
      {!compact && (
        <p className="mt-1 text-sm text-slate-200" aria-live="polite">
          {used ? '50:50 already used by this team' : enabled ? 'Removes two wrong options' : reason}
        </p>
      )}
    </div>
  );
}

/** Read-only lifeline indicator for scoreboards. Text + icon, not colour alone. */
export function LifelineBadge({ used, big }: { used: boolean; big?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-bold ${
        big ? 'text-[clamp(0.9rem,1.4vw,1.4rem)]' : 'text-sm'
      } ${used ? 'border-slate-500 bg-slate-800 text-slate-300 line-through decoration-2' : 'border-gold-400 bg-gold-400/15 text-gold-300'}`}
      aria-label={used ? '50:50 used' : '50:50 available'}
    >
      <Scissors aria-hidden className="h-4 w-4" />
      <span>50:50</span>
      <span className="no-underline">{used ? '(Used)' : '(Available)'}</span>
    </span>
  );
}
