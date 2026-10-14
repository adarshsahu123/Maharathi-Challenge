import { useCallback, useEffect, useRef, useState } from 'react';
import { findBank } from '../data/banks';
import type { GameAction } from '../game/types';
import { useGame, useNow } from './useGame';

export type Pending = null | 'end' | 'reset' | 'skip';

/**
 * Shared by every screen that can run the game (Student Display and Teacher Panel):
 * action dispatch with a readable error message, confirmation state, and the clock watcher.
 * All of them act on the SAME stored game, so any screen can be used on its own.
 */
export function useController() {
  const game = useGame();
  const { store } = game;
  const now = useNow(250);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const timer = useRef<number | undefined>(undefined);

  const say = useCallback((text: string | null) => {
    window.clearTimeout(timer.current);
    setMessage(text);
    if (text) timer.current = window.setTimeout(() => setMessage(null), 7000);
  }, []);

  const run = useCallback((action: GameAction) => say(store.dispatch(action)), [store, say]);

  // Stops an expired clock at exactly zero. Idempotent, so having several screens open is harmless.
  useEffect(() => {
    const id = window.setInterval(store.tick, 250);
    return () => window.clearInterval(id);
  }, [store]);

  const confirmReset = useCallback(() => {
    setPending(null);
    const cur = store.getSnapshot().state;
    if (!cur) return;
    const bank = findBank(cur.config.bankId);
    if (!bank) return say('The question bank for this game was not found — the game could not be reset.');
    say(store.restart(bank));
  }, [store, say]);

  return { ...game, now, message, say, run, pending, setPending, confirmReset };
}

export type Controller = ReturnType<typeof useController>;
