export type BeepKind = 'tick' | 'urgent' | 'final';

/** At this many seconds left (and below) the timer turns red and starts beeping. */
export const WARNING_SECONDS = 10;
/** The last seconds get a higher, more urgent pitch. */
export const URGENT_SECONDS = 3;

/**
 * Decides whether the countdown should beep when the displayed second changes.
 * `prev` is the last second shown while the clock was active (null = the clock was not active),
 * so pausing, resuming, a refresh or a new question never causes a stray beep.
 */
export function beepKind(prev: number | null, seconds: number, active: boolean): BeepKind | null {
  if (!active || prev === null || seconds >= prev) return null;
  if (seconds === 0) return 'final';
  if (seconds <= URGENT_SECONDS) return 'urgent';
  if (seconds <= WARNING_SECONDS) return 'tick';
  return null;
}
