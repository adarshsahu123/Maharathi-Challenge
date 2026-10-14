import { useEffect, useRef } from 'react';
import { winnerOf } from '../game/engine';
import { celebrationDue, type CelebrationMemory } from '../game/feedback';
import { playVictoryCelebration, stopCelebration } from '../game/sound';
import type { GameState } from '../game/types';

/**
 * Plays the winner celebration (grand fanfare, the jig twice, a huge final chord, then a spoken congratulation and applause) once, at the moment the winner is announced.
 * It is cut off at once when the teacher leaves the results screen or mutes the sound. Only the projector display uses this.
 */
export function useVictoryTune(state: GameState | null, soundEnabled: boolean) {
  const memory = useRef<CelebrationMemory | null>(null);
  const enabled = useRef(soundEnabled);
  enabled.current = soundEnabled;

  useEffect(() => {
    const result = celebrationDue(memory.current, state);
    memory.current = result.memory;
    if (result.celebrate && state && enabled.current && document.visibilityState === 'visible') {
      const w = winnerOf(state);
      playVictoryCelebration(w.kind === 'team' ? state.config.teamNames[w.team === 'A' ? 0 : 1] : 'our winner');
    } else if (!state || state.phase !== 'completed') stopCelebration();
  }, [state]);

  useEffect(() => {
    if (!soundEnabled) stopCelebration();
  }, [soundEnabled]);

  useEffect(() => () => stopCelebration(), []);
}
