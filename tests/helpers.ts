import { class9Bank } from '../src/data/questions/class9';
import { createGame, reduce } from '../src/game/engine';
import type { GameAction, GameState, QuestionBank } from '../src/game/types';

export const T0 = 1_000_000;

/** Creates a game at T0. The first question's clock is already running from T0. */
export function newGame(bank: QuestionBank = class9Bank, names: [string, string] = ['Team A', 'Team B']): GameState {
  const r = createGame(bank, names, T0);
  if (!r.state) throw new Error(r.error);
  return r.state;
}

/** Applies an action and throws if it is rejected (for steps that must succeed). */
export function must(s: GameState, a: GameAction, now: number): GameState {
  const r = reduce(s, a, now);
  if (r.error) throw new Error(`${a.type} rejected: ${r.error}`);
  return r.state;
}

export function reject(s: GameState, a: GameAction, now: number): string {
  const r = reduce(s, a, now);
  if (!r.error) throw new Error(`${a.type} should have been rejected`);
  if (r.state !== s) throw new Error('A rejected action must not change state');
  return r.error;
}

/** The captain stood up: the teacher picks the team. The clock is already running and is not touched. */
export function startAnswering(s: GameState, team: 'A' | 'B', now: number): GameState {
  return must(s, { type: 'SELECT_TEAM', team }, now);
}

export function correctIndexOf(s: GameState): number {
  const q = s.mode === 'main' ? s.questions[s.index] : s.tiebreakers[s.tbIndex];
  return q.correctIndex;
}

export function wrongIndexOf(s: GameState): number {
  const q = s.mode === 'main' ? s.questions[s.index] : s.tiebreakers[s.tbIndex];
  return [0, 1, 2, 3].find((i) => i !== q.correctIndex)!;
}

/** Click the correct option for whoever is currently answering. */
export function clickCorrect(s: GameState, now: number): GameState {
  return must(s, { type: 'ANSWER', index: correctIndexOf(s) }, now);
}

/** Click a wrong option for whoever is currently answering. */
export function clickWrong(s: GameState, now: number): GameState {
  const q = s.mode === 'main' ? s.questions[s.index] : s.tiebreakers[s.tbIndex];
  const wrong = [0, 1, 2, 3].find((i) => i !== q.correctIndex && !s.triedOptions.includes(i))!;
  return must(s, { type: 'ANSWER', index: wrong }, now);
}

/** Picks `team` at `now` and answers correctly one second later. */
export function answerCorrectly(s: GameState, team: 'A' | 'B', now: number): GameState {
  return clickCorrect(startAnswering(s, team, now), now + 1000);
}
