import { winnerOf } from './engine';
import type { GameState } from './types';

export type FeedbackKind = 'right' | 'wrong';

/** What the display remembers between renders to notice that a NEW answer has just been judged. */
export interface FeedbackMemory {
  key: string;
  attempts: number;
}

const keyOf = (s: GameState) => `${s.sessionId}|${s.mode}|${s.index}|${s.tbIndex}`;

/**
 * Compares the current state with what was seen last time and says whether an answer was judged in between.
 * Loading the page (or refreshing, or opening a second display) in the middle of a question never replays
 * old feedback, and starting a new question / a new game never triggers it either.
 */
export function judgeFeedback(prev: FeedbackMemory | null, s: GameState | null): { memory: FeedbackMemory | null; kind: FeedbackKind | null } {
  if (!s) return { memory: null, kind: null };
  const memory: FeedbackMemory = { key: keyOf(s), attempts: s.attempts.length };
  if (!prev || prev.key !== memory.key || memory.attempts <= prev.attempts) return { memory, kind: null };
  const last = s.attempts[s.attempts.length - 1];
  return { memory, kind: last.correct ? 'right' : 'wrong' };
}

export interface CelebrationMemory {
  sessionId: string;
  phase: GameState['phase'];
}

/**
 * True exactly once: when the game moves INTO the completed phase during this session and there is a winner
 * (also after a tie-breaker decides it). Loading or refreshing the page on the results screen, a tie, or a new game
 * never celebrates.
 */
export function celebrationDue(prev: CelebrationMemory | null, s: GameState | null): { memory: CelebrationMemory | null; celebrate: boolean } {
  if (!s) return { memory: null, celebrate: false };
  const memory: CelebrationMemory = { sessionId: s.sessionId, phase: s.phase };
  const justFinished = prev !== null && prev.sessionId === s.sessionId && prev.phase !== 'completed' && s.phase === 'completed';
  return { memory, celebrate: justFinished && winnerOf(s).kind === 'team' };
}
