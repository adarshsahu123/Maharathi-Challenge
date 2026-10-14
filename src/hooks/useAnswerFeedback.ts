import { useEffect, useRef, useState } from 'react';
import { judgeFeedback, type FeedbackKind, type FeedbackMemory } from '../game/feedback';
import { playAnswerSound } from '../game/sound';
import type { GameState } from '../game/types';

/** How long the big emoji stays on screen. */
export const FEEDBACK_MS = 1400;

/**
 * Plays a "right" or "wrong" sound and returns the emoji to flash for about a second
 * whenever an answer is judged. Only the projector display uses this.
 */
export function useAnswerFeedback(state: GameState | null, soundEnabled: boolean): { kind: FeedbackKind; id: number } | null {
  const memory = useRef<FeedbackMemory | null>(null);
  const enabled = useRef(soundEnabled);
  const hide = useRef<number | undefined>(undefined);
  const [shown, setShown] = useState<{ kind: FeedbackKind; id: number } | null>(null);
  enabled.current = soundEnabled;

  useEffect(() => {
    const result = judgeFeedback(memory.current, state);
    memory.current = result.memory;
    if (!result.kind) return;
    window.clearTimeout(hide.current);
    setShown({ kind: result.kind, id: Date.now() });
    if (enabled.current && document.visibilityState === 'visible') playAnswerSound(result.kind);
    hide.current = window.setTimeout(() => setShown(null), FEEDBACK_MS);
  }, [state]);

  // Only clear the pending timer when the screen goes away (not whenever the game state changes).
  useEffect(() => () => window.clearTimeout(hide.current), []);

  return shown;
}
