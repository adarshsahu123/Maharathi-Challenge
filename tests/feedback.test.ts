import { describe, expect, it } from 'vitest';
import { celebrationDue, judgeFeedback } from '../src/game/feedback';
import type { GameState } from '../src/game/types';
import { T0, answerCorrectly, clickCorrect, clickWrong, must, newGame, startAnswering } from './helpers';

describe('answer feedback (emoji + sound) detection', () => {
  it('stays silent when the screen first loads, even if answers were already judged (refresh mid-question)', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = clickWrong(s, T0 + 2000); // one wrong attempt is already on record
    const r = judgeFeedback(null, s);
    expect(r.kind).toBeNull();
    expect(r.memory?.attempts).toBe(1);
  });

  it('a newly judged CORRECT answer gives "right"', () => {
    const before = startAnswering(newGame(), 'A', T0 + 1000);
    const m = judgeFeedback(null, before).memory;
    expect(judgeFeedback(m, clickCorrect(before, T0 + 2000)).kind).toBe('right');
  });

  it('a newly judged WRONG answer gives "wrong", and so does a wrong answer on the steal', () => {
    const before = startAnswering(newGame(), 'A', T0 + 1000);
    const afterFirst = clickWrong(before, T0 + 2000);
    const r1 = judgeFeedback(judgeFeedback(null, before).memory, afterFirst);
    expect(r1.kind).toBe('wrong');
    const afterSteal = clickWrong(afterFirst, T0 + 3000);
    expect(judgeFeedback(r1.memory, afterSteal).kind).toBe('wrong');
  });

  it('a correct answer on the steal gives "right" for the stealing team', () => {
    const afterFirst = clickWrong(startAnswering(newGame(), 'A', T0 + 1000), T0 + 2000);
    const m = judgeFeedback(null, afterFirst).memory;
    expect(judgeFeedback(m, clickCorrect(afterFirst, T0 + 3000)).kind).toBe('right');
  });

  it('fires exactly once per judged answer (re-rendering the same state does nothing)', () => {
    const before = startAnswering(newGame(), 'A', T0 + 1000);
    const after = clickCorrect(before, T0 + 2000);
    const first = judgeFeedback(judgeFeedback(null, before).memory, after);
    expect(first.kind).toBe('right');
    expect(judgeFeedback(first.memory, after).kind).toBeNull();
  });

  it('does not fire for picking a team, 50:50, pause, skip, or moving to the next question', () => {
    let s = newGame();
    let m = judgeFeedback(null, s).memory;
    for (const step of [
      (x: typeof s) => must(x, { type: 'SELECT_TEAM', team: 'A' }, T0 + 1000),
      (x: typeof s) => must(x, { type: 'USE_LIFELINE' }, T0 + 2000),
      (x: typeof s) => must(x, { type: 'PAUSE' }, T0 + 3000),
      (x: typeof s) => must(x, { type: 'RESUME' }, T0 + 4000),
      (x: typeof s) => must(x, { type: 'SKIP' }, T0 + 5000),
      (x: typeof s) => must(x, { type: 'NEXT' }, T0 + 6000),
    ]) {
      s = step(s);
      const r = judgeFeedback(m, s);
      expect(r.kind).toBeNull();
      m = r.memory;
    }
  });

  it('a new question or a new game never replays old feedback', () => {
    const answered = clickCorrect(startAnswering(newGame(), 'A', T0 + 1000), T0 + 2000);
    const m = judgeFeedback(null, answered).memory;
    const next = must(answered, { type: 'NEXT' }, T0 + 3000);
    expect(judgeFeedback(m, next).kind).toBeNull();
    const freshGame = newGame(); // different session id
    expect(judgeFeedback(m, freshGame).kind).toBeNull();
  });

  it('forgets everything when there is no game', () => {
    expect(judgeFeedback({ key: 'x', attempts: 1 }, null)).toEqual({ memory: null, kind: null });
  });
});

describe('winner celebration detection', () => {
  /** Q1 won by A, then the game is ended: A is the winner. */
  const winnerGame = (): { before: GameState; after: GameState } => {
    const before = must(answerCorrectly(newGame(), 'A', T0), { type: 'NEXT' }, T0 + 5000);
    return { before, after: must(before, { type: 'END_GAME' }, T0 + 6000) };
  };

  it('celebrates once, at the moment the game finishes with a winner', () => {
    const { before, after } = winnerGame();
    const m = celebrationDue(null, before).memory;
    const r = celebrationDue(m, after);
    expect(r.celebrate).toBe(true);
    expect(celebrationDue(r.memory, after).celebrate).toBe(false); // the same results screen re-rendering
  });

  it('does not celebrate when the page is loaded or refreshed on the results screen', () => {
    expect(celebrationDue(null, winnerGame().after).celebrate).toBe(false);
  });

  it('does not celebrate a tie', () => {
    const before = newGame();
    const after = must(before, { type: 'END_GAME' }, T0 + 1000); // 0 - 0
    expect(celebrationDue(celebrationDue(null, before).memory, after).celebrate).toBe(false);
  });

  it('does not celebrate when a new game starts', () => {
    const { after } = winnerGame();
    const m = celebrationDue(null, after).memory;
    expect(celebrationDue(m, newGame()).celebrate).toBe(false);
  });

  it('celebrates when a tie-breaker decides a tied game', () => {
    // 300-300 after 30 questions
    let s = newGame();
    let t = T0;
    for (let n = 0; n < 30; n++) {
      s = answerCorrectly(s, n <= 18 ? 'A' : 'B', (t += 10_000));
      s = must(s, { type: 'NEXT' }, (t += 1000));
    }
    expect(celebrationDue(celebrationDue(null, s).memory, s).celebrate).toBe(false); // the tie itself: no celebration
    s = must(s, { type: 'START_TIEBREAK' }, t + 1000);
    s = answerCorrectly(s, 'B', t + 2000);
    const m = celebrationDue(null, s).memory; // the tie-breaker question has just been decided
    s = must(s, { type: 'NEXT' }, t + 3000);
    expect(celebrationDue(m, s).celebrate).toBe(true);
  });

  it('forgets everything when there is no game', () => {
    expect(celebrationDue({ sessionId: 'x', phase: 'reveal' }, null)).toEqual({ memory: null, celebrate: false });
  });
});
