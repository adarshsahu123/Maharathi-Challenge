import { describe, expect, it } from 'vitest';
import { canStartTiebreak, createGame, reduce, remainingMs, scoreOf, statsOf, winnerOf } from '../src/game/engine';
import { class9Bank } from '../src/data/questions/class9';
import { ANSWER_MS, ANSWER_SECONDS, MAX_SCORE_PER_TEAM, STANDARD_QUESTION_COUNT } from '../src/game/constants';
import type { GameState, QuestionBank } from '../src/game/types';
import {
  T0,
  answerCorrectly,
  clickCorrect,
  clickWrong,
  correctIndexOf,
  must,
  newGame,
  reject,
  startAnswering,
  wrongIndexOf,
} from './helpers';

const N = STANDARD_QUESTION_COUNT;

describe('constants', () => {
  it('30 questions, a 30-second clock, 600 points maximum', () => {
    expect(N).toBe(30);
    expect(ANSWER_SECONDS).toBe(30);
    expect(ANSWER_MS).toBe(30_000);
    expect(MAX_SCORE_PER_TEAM).toBe(600);
    expect(class9Bank.questions.reduce((a, q) => a + q.points, 0)).toBe(600);
  });
});

describe('game creation', () => {
  it('starts on Q1 with the 30 s clock ALREADY RUNNING (no team chosen yet)', () => {
    const s = newGame();
    expect(s.phase).toBe('question');
    expect(s.index).toBe(0);
    expect(s.selectedTeam).toBeNull();
    expect(s.timer.runningSince).toBe(T0);
    expect(remainingMs(s.timer, T0)).toBe(30_000);
    expect(remainingMs(s.timer, T0 + 10_000)).toBe(20_000); // counting without anyone choosing a team
    expect(s.lifelines.A.used).toBe(false);
    expect(s.lifelines.B.used).toBe(false);
  });

  it('rejects empty, duplicate and over-long team names', () => {
    expect(createGame(class9Bank, ['', 'B'], T0).error).toBeTruthy();
    expect(createGame(class9Bank, ['  ', 'B'], T0).error).toBeTruthy();
    expect(createGame(class9Bank, ['Tigers', ' tigers '], T0).error).toBeTruthy();
    expect(createGame(class9Bank, ['x'.repeat(40), 'B'], T0).error).toBeTruthy();
  });

  it('refuses a class with no question bank instead of using unrelated questions', () => {
    const empty: QuestionBank = { ...class9Bank, id: 'x', classLevel: 10, status: 'placeholder', questions: [], tiebreakers: [] };
    expect(createGame(empty, ['A', 'B'], T0).error).toMatch(/not available yet/);
  });

  it('refuses invalid question data and a bank with the wrong number of questions', () => {
    const bad = JSON.parse(JSON.stringify(class9Bank)) as QuestionBank;
    bad.questions[3].removableIndices = [bad.questions[3].correctIndex, 0];
    expect(createGame(bad, ['A', 'B'], T0).error).toBeTruthy();
    const short = { ...class9Bank, questions: class9Bank.questions.slice(0, 20) };
    expect(createGame(short, ['A', 'B'], T0).error).toMatch(/30 questions/);
  });

  it('snapshots questions so editing the bank cannot reorder a running game', () => {
    const bank = JSON.parse(JSON.stringify(class9Bank)) as QuestionBank;
    const s = newGame(bank);
    bank.questions.reverse();
    expect(s.questions[0].id).toBe(class9Bank.questions[0].id);
  });
});

describe('the clock and choosing the team', () => {
  it('picking the team does not restart or change the clock', () => {
    let s = newGame();
    s = must(s, { type: 'SELECT_TEAM', team: 'A' }, T0 + 8000);
    expect(s.phase).toBe('answering');
    expect(s.activeTeam).toBe('A');
    expect(remainingMs(s.timer, T0 + 8000)).toBe(22_000); // 30 s minus the 8 s already gone
    expect(remainingMs(s.timer, T0 + 10_000)).toBe(20_000);
  });

  it('nothing can be answered or used before a team is chosen', () => {
    const s = newGame();
    reject(s, { type: 'ANSWER', index: 0 }, T0 + 1000);
    reject(s, { type: 'USE_LIFELINE' }, T0 + 1000);
  });

  it('the team pick can be corrected until the first answer is judged or 50:50 is used', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = must(s, { type: 'SELECT_TEAM', team: 'B' }, T0 + 2000); // slip of the finger corrected
    expect(s.activeTeam).toBe('B');
    expect(s.selectedTeam).toBe('B');
    expect(remainingMs(s.timer, T0 + 2000)).toBe(28_000);
    const withLifeline = must(s, { type: 'USE_LIFELINE' }, T0 + 3000);
    reject(withLifeline, { type: 'SELECT_TEAM', team: 'A' }, T0 + 4000);
    const afterWrong = clickWrong(s, T0 + 3000);
    reject(afterWrong, { type: 'SELECT_TEAM', team: 'A' }, T0 + 4000);
  });

  it('never shows a negative time', () => {
    const s = newGame();
    expect(remainingMs(s.timer, T0 + ANSWER_MS + 50_000)).toBe(0);
  });

  it('pause freezes and resume continues with the exact remaining time (even before a team is chosen)', () => {
    let s = newGame();
    s = must(s, { type: 'PAUSE' }, T0 + 10_000); // 20 s left
    expect(remainingMs(s.timer, T0 + 10_000)).toBe(20_000);
    expect(remainingMs(s.timer, T0 + 500_000)).toBe(20_000); // frozen however long we wait
    reject(s, { type: 'SELECT_TEAM', team: 'A' }, T0 + 20_000); // paused: nothing else works
    s = must(s, { type: 'RESUME' }, T0 + 100_000);
    expect(remainingMs(s.timer, T0 + 100_000)).toBe(20_000);
    expect(remainingMs(s.timer, T0 + 105_000)).toBe(15_000);
  });

  it('pause blocks answers and 50:50 mid-question', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = must(s, { type: 'PAUSE' }, T0 + 5000);
    reject(s, { type: 'ANSWER', index: 0 }, T0 + 6000);
    reject(s, { type: 'USE_LIFELINE' }, T0 + 6000);
    s = must(s, { type: 'RESUME' }, T0 + 9000);
    expect(remainingMs(s.timer, T0 + 9000)).toBe(25_000);
  });

  it('timestamp-based: a throttled/background tab cannot make the clock inaccurate', () => {
    const s = newGame();
    expect(remainingMs(s.timer, T0 + 12_000)).toBe(18_000); // no ticks at all, still exact
  });

  it('EXPIRE stops the clock at exactly zero and is idempotent', () => {
    let s = newGame();
    expect(reduce(s, { type: 'EXPIRE' }, T0 + 10_000).state).toBe(s); // not yet zero: no change
    s = must(s, { type: 'EXPIRE' }, T0 + ANSWER_MS + 5);
    expect(s.timer).toEqual({ remainingMs: 0, runningSince: null, wasRunning: false });
    expect(reduce(s, { type: 'EXPIRE' }, T0 + ANSWER_MS + 900).state).toBe(s);
  });

  it('a team cannot answer after the time expired; the teacher ends the question and reveals', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    const late = T0 + ANSWER_MS + 1;
    expect(reject(s, { type: 'ANSWER', index: correctIndexOf(s) }, late)).toMatch(/Time is up/);
    reject(s, { type: 'USE_LIFELINE' }, late);
    reject(s, { type: 'END_ATTEMPT' }, T0 + 10_000); // still running: cannot end early
    s = must(s, { type: 'END_ATTEMPT' }, late);
    expect(s.phase).toBe('reveal');
    expect(s.outcome).toBe('no-points');
    expect(s.answerShown).toBe(false); // timeout: the teacher decides when to reveal
    s = must(s, { type: 'REVEAL_ANSWER' }, late + 1000);
    expect(s.answerShown).toBe(true);
    reject(s, { type: 'REVEAL_ANSWER' }, late + 2000);
    expect(scoreOf(s, 'A')).toBe(0);
    expect(scoreOf(s, 'B')).toBe(0);
  });

  it('if the clock runs out before ANY team was chosen: no team can be picked, the question ends with 0 points', () => {
    let s = newGame();
    const late = T0 + ANSWER_MS + 1;
    expect(reject(s, { type: 'SELECT_TEAM', team: 'A' }, late)).toMatch(/Time is up/);
    s = must(s, { type: 'END_ATTEMPT' }, late);
    expect(s.phase).toBe('reveal');
    expect(s.outcome).toBe('no-points');
    expect(s.attempts).toHaveLength(0);
    expect(scoreOf(s, 'A') + scoreOf(s, 'B')).toBe(0);
  });
});

describe('click-to-judge answering', () => {
  it('a correct click is judged at once: points to that team exactly once', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = clickCorrect(s, T0 + 2000);
    expect(s.phase).toBe('reveal');
    expect(s.outcome).toBe('correct');
    expect(s.answerShown).toBe(true);
    expect(scoreOf(s, 'A')).toBe(10);
    expect(scoreOf(s, 'B')).toBe(0);
    reject(s, { type: 'ANSWER', index: correctIndexOf(s) }, T0 + 2001); // double-click
    reject(s, { type: 'ANSWER', index: 0 }, T0 + 2002);
    expect(scoreOf(s, 'A')).toBe(10);
    expect(s.results).toHaveLength(1);
  });

  it('a wrong click gives 0 points and passes AUTOMATICALLY to the other team, the same clock continuing', () => {
    let s = startAnswering(newGame(), 'A', T0 + 2000);
    s = must(s, { type: 'ANSWER', index: wrongIndexOf(s) }, T0 + 10_000); // 20 s left
    expect(s.phase).toBe('steal');
    expect(s.activeTeam).toBe('B');
    expect(s.selectedTeam).toBe('A'); // the original answering team is remembered
    expect(scoreOf(s, 'A')).toBe(0);
    expect(s.answerShown).toBe(false); // not revealed while a steal is still possible
    expect(remainingMs(s.timer, T0 + 10_000)).toBe(20_000); // leftover of the ONE 30 s clock, not a new 30
    expect(remainingMs(s.timer, T0 + 15_000)).toBe(15_000);
  });

  it('the steal team answering correctly gets the points, not the original team', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = clickWrong(s, T0 + 10_000);
    s = clickCorrect(s, T0 + 15_000);
    expect(scoreOf(s, 'B')).toBe(10);
    expect(scoreOf(s, 'A')).toBe(0);
    expect(s.results[0].awardedTo).toBe('B');
    expect(s.results[0].attempts.map((a) => [a.team, a.kind, a.correct])).toEqual([
      ['A', 'primary', false],
      ['B', 'steal', true],
    ]);
    expect(s.answerShown).toBe(true);
  });

  it('both teams wrong → no points, answer shown, 2 incorrect attempts', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = clickWrong(s, T0 + 5000);
    s = clickWrong(s, T0 + 9000);
    expect(s.phase).toBe('reveal');
    expect(s.outcome).toBe('no-points');
    expect(s.answerShown).toBe(true);
    expect(scoreOf(s, 'A') + scoreOf(s, 'B')).toBe(0);
    expect(statsOf(s)).toMatchObject({ answered: 1, skipped: 0, correctAttempts: 0, incorrectAttempts: 2 });
  });

  it('the steal team cannot re-pick the option the first team already got wrong', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    const wrong = wrongIndexOf(s);
    s = must(s, { type: 'ANSWER', index: wrong }, T0 + 2000);
    expect(reject(s, { type: 'ANSWER', index: wrong }, T0 + 3000)).toMatch(/already tried/);
  });

  it('the steal expires with the original 30 s: no answer after that, the teacher ends the question', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = clickWrong(s, T0 + 28_000); // 2 s left for the steal team
    expect(remainingMs(s.timer, T0 + 28_000)).toBe(2000);
    const late = T0 + 30_001;
    expect(reject(s, { type: 'ANSWER', index: correctIndexOf(s) }, late)).toMatch(/Time is up/);
    s = must(s, { type: 'END_ATTEMPT' }, late);
    expect(s.outcome).toBe('no-points');
    expect(scoreOf(s, 'B')).toBe(0);
  });

  it('rejects invalid options and answers outside an answering phase', () => {
    const s = startAnswering(newGame(), 'A', T0 + 1000);
    reject(s, { type: 'ANSWER', index: 4 }, T0 + 2000);
    reject(s, { type: 'ANSWER', index: -1 }, T0 + 2000);
    reject(s, { type: 'ANSWER', index: 1.5 }, T0 + 2000);
    const done = clickCorrect(s, T0 + 2000);
    reject(done, { type: 'ANSWER', index: 0 }, T0 + 3000);
  });

  it('skip awards zero to both teams, counts as skipped and does not reveal automatically', () => {
    let s = newGame();
    s = must(s, { type: 'SKIP' }, T0 + 1000);
    expect(s.phase).toBe('reveal');
    expect(s.outcome).toBe('skipped');
    expect(s.answerShown).toBe(false);
    expect(scoreOf(s, 'A') + scoreOf(s, 'B')).toBe(0);
    reject(s, { type: 'SKIP' }, T0 + 1500);
    expect(statsOf(s)).toMatchObject({ answered: 0, skipped: 1 });
    s = must(s, { type: 'NEXT' }, T0 + 2000);
    expect(s.index).toBe(1);
  });

  it('can be skipped during the steal too; zero points to both', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = clickWrong(s, T0 + 5000);
    s = must(s, { type: 'SKIP' }, T0 + 6000);
    expect(s.outcome).toBe('skipped');
    expect(scoreOf(s, 'A') + scoreOf(s, 'B')).toBe(0);
    expect(s.answerShown).toBe(true); // an attempt was already judged
  });

  it('the answer is never revealed during play and REVEAL is refused', () => {
    const s = startAnswering(newGame(), 'A', T0 + 1000);
    expect(s.answerShown).toBe(false);
    reject(s, { type: 'REVEAL_ANSWER' }, T0 + 1500);
  });

  it('cannot advance twice or before the question is finished; every new question restarts the 30 s clock', () => {
    let s = newGame();
    reject(s, { type: 'NEXT' }, T0);
    s = answerCorrectly(s, 'A', T0 + 5000);
    s = must(s, { type: 'NEXT' }, T0 + 20_000);
    expect(s.index).toBe(1);
    expect(s.phase).toBe('question');
    expect(s.selectedTeam).toBeNull();
    expect(s.timer.runningSince).toBe(T0 + 20_000); // the clock starts with the new question…
    expect(remainingMs(s.timer, T0 + 25_000)).toBe(25_000); // …and is a full 30 s again
    reject(s, { type: 'NEXT' }, T0 + 20_001); // accidental double click
    expect(s.index).toBe(1);
  });

  it('a save made by an older version (previous schema) is not accepted as valid state', async () => {
    const { isValidGameState } = await import('../src/game/storage');
    expect(isValidGameState({ ...newGame(), schema: 2 })).toBe(false);
    expect(isValidGameState(newGame())).toBe(true);
  });
});

describe('50:50 lifeline', () => {
  it('removes exactly two incorrect options and keeps the correct one; the clock keeps running', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = must(s, { type: 'USE_LIFELINE' }, T0 + 10_000);
    expect(s.hiddenOptions).toHaveLength(2);
    expect(s.hiddenOptions).not.toContain(correctIndexOf(s));
    const visible = [0, 1, 2, 3].filter((i) => !s.hiddenOptions.includes(i));
    expect(visible).toHaveLength(2);
    expect(visible).toContain(correctIndexOf(s));
    expect(s.lifelines.A.used).toBe(true);
    expect(s.lifelines.B.used).toBe(false);
    expect(remainingMs(s.timer, T0 + 20_000)).toBe(10_000); // no extra time, still running
    expect(scoreOf(s, 'A')).toBe(0); // no points
    reject(s, { type: 'ANSWER', index: s.hiddenOptions[0] }, T0 + 11_000); // removed options cannot be picked
  });

  it('can be used once per team per game', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = must(s, { type: 'USE_LIFELINE' }, T0 + 2000);
    reject(s, { type: 'USE_LIFELINE' }, T0 + 3000); // same question
    s = clickCorrect(s, T0 + 4000);
    s = must(s, { type: 'NEXT' }, T0 + 5000);
    s = startAnswering(s, 'A', T0 + 6000);
    expect(reject(s, { type: 'USE_LIFELINE' }, T0 + 7000)).toMatch(/already been used/); // Team A already used it
    s = clickWrong(s, T0 + 8000); // wrong → automatically Team B's steal; B still has its own lifeline
    expect(s.activeTeam).toBe('B');
    s = must(s, { type: 'USE_LIFELINE' }, T0 + 10_000);
    expect(s.lifelines.B.used).toBe(true);
    expect(s.lifelines.B.usedOnQuestionId).toBe(class9Bank.questions[1].id);
  });

  it("is only available during that team's active answering phase", () => {
    let s = newGame();
    reject(s, { type: 'USE_LIFELINE' }, T0 + 1000); // clock running but no team chosen yet
    s = must(s, { type: 'SELECT_TEAM', team: 'A' }, T0 + 1000);
    s = must(s, { type: 'PAUSE' }, T0 + 2000);
    reject(s, { type: 'USE_LIFELINE' }, T0 + 2500); // paused
    s = must(s, { type: 'RESUME' }, T0 + 3000);
    s = clickCorrect(s, T0 + 4000);
    reject(s, { type: 'USE_LIFELINE' }, T0 + 4500); // question finished
    expect(s.lifelines.A.used).toBe(false);
    expect(s.lifelines.B.used).toBe(false);
  });

  it('survives a state round-trip (what another tab reads from storage)', () => {
    let s = startAnswering(newGame(), 'A', T0 + 1000);
    s = must(s, { type: 'USE_LIFELINE' }, T0 + 2000);
    const copy = JSON.parse(JSON.stringify(s)) as GameState;
    expect(copy.hiddenOptions).toEqual(s.hiddenOptions);
  });

  it('never removes the correct answer for any of the 30 questions, even on an automatic steal after a failed attempt', () => {
    for (let n = 0; n < N; n++) {
      for (const tried of [0, 1, 2, 3]) {
        let s = newGame();
        s = { ...s, index: n };
        const correct = s.questions[n].correctIndex;
        if (tried === correct) continue;
        s = startAnswering(s, 'A', T0 + 1000);
        s = must(s, { type: 'ANSWER', index: tried }, T0 + 2000); // wrong → automatic steal for B
        s = must(s, { type: 'USE_LIFELINE' }, T0 + 3000);
        expect(s.hiddenOptions).toHaveLength(2);
        expect(s.hiddenOptions).not.toContain(correct);
        const visible = [0, 1, 2, 3].filter((i) => !s.hiddenOptions.includes(i));
        expect(visible).toHaveLength(2);
        expect(visible).toContain(correct);
        expect(visible).not.toContain(tried); // the already-failed option cannot be a free survivor
      }
    }
  });
});

describe('full game', () => {
  function playAll(s: GameState, winnerOfQuestion: (n: number) => 'A' | 'B' | 'none'): GameState {
    let t = T0;
    for (let n = 0; n < N; n++) {
      const w = winnerOfQuestion(n);
      if (w === 'none') s = must(s, { type: 'SKIP' }, (t += 1000));
      else s = answerCorrectly(s, w, (t += 10_000));
      s = must(s, { type: 'NEXT' }, (t += 1000));
    }
    return s;
  }

  it('the maximum score is 600: 8x10 + 14x20 + 8x30', () => {
    const s = playAll(newGame(), () => 'A');
    expect(s.phase).toBe('completed');
    expect(scoreOf(s, 'A')).toBe(600);
    expect(scoreOf(s, 'B')).toBe(0);
    expect(s.results).toHaveLength(30);
    const byD = (d: string) => s.results.filter((r) => r.difficulty === d);
    expect(byD('Easy').reduce((a, r) => a + r.awardedPoints, 0)).toBe(80);
    expect(byD('Intermediate').reduce((a, r) => a + r.awardedPoints, 0)).toBe(280);
    expect(byD('Hard').reduce((a, r) => a + r.awardedPoints, 0)).toBe(240);
    expect(winnerOf(s)).toEqual({ kind: 'team', team: 'A', by: 'score' });
    expect(statsOf(s)).toEqual({ answered: 30, skipped: 0, correctAttempts: 30, incorrectAttempts: 0 });
    expect(canStartTiebreak(s)).toBe(false);
  });

  it('question order is stable: Q1..Q30 in sequence', () => {
    let s = newGame();
    const seen: string[] = [];
    for (let n = 0; n < N; n++) {
      seen.push(s.questions[s.index].id);
      s = must(s, { type: 'SKIP' }, T0 + n);
      s = must(s, { type: 'NEXT' }, T0 + n);
    }
    expect(seen).toEqual(class9Bank.questions.map((q) => q.id));
    expect(s.phase).toBe('completed');
    expect(s.timer.runningSince).toBeNull(); // no clock keeps running after the game
  });

  it('team scores stay accurate when teams alternate and skip', () => {
    const s = playAll(newGame(), (n) => (n % 3 === 0 ? 'A' : n % 3 === 1 ? 'B' : 'none'));
    const expA = class9Bank.questions.filter((_, n) => n % 3 === 0).reduce((a, q) => a + q.points, 0);
    const expB = class9Bank.questions.filter((_, n) => n % 3 === 1).reduce((a, q) => a + q.points, 0);
    expect(scoreOf(s, 'A')).toBe(expA);
    expect(scoreOf(s, 'B')).toBe(expB);
    expect(statsOf(s).skipped).toBe(class9Bank.questions.filter((_, n) => n % 3 === 2).length);
  });

  it('a completed game rejects every gameplay action', () => {
    const s = playAll(newGame(), () => 'A');
    for (const a of [{ type: 'NEXT' }, { type: 'SKIP' }, { type: 'PAUSE' }, { type: 'SELECT_TEAM', team: 'A' }, { type: 'ANSWER', index: 0 }] as const) {
      reject(s, a, T0 + 999_999);
    }
  });

  it('ending the game early completes it without a tie-breaker', () => {
    let s = answerCorrectly(newGame(), 'A', T0);
    s = must(s, { type: 'NEXT' }, T0 + 5000);
    s = must(s, { type: 'END_GAME' }, T0 + 6000);
    expect(s.phase).toBe('completed');
    expect(s.endedEarly).toBe(true);
    expect(scoreOf(s, 'A')).toBe(10);
    expect(canStartTiebreak(s)).toBe(false);
    reject(s, { type: 'END_GAME' }, T0 + 7000);
  });
});

describe('tie and tie-breaker', () => {
  /** Plays a full game that ends 300–300. */
  function tiedGame(): { s: GameState; t: number } {
    let s = newGame();
    let t = T0;
    // Questions 1-8 Easy, 9-22 Intermediate, 23-30 Hard.
    // A: 8 Easy + 11 Intermediate = 80 + 220 = 300.  B: 3 Intermediate + 8 Hard = 60 + 240 = 300.
    for (let n = 0; n < N; n++) {
      s = answerCorrectly(s, n <= 18 ? 'A' : 'B', (t += 10_000));
      s = must(s, { type: 'NEXT' }, (t += 1000));
    }
    return { s, t };
  }

  it('equal scores announce a tie and allow a teacher-started tie-breaker', () => {
    const { s: done, t } = tiedGame();
    let s = done;
    expect(s.phase).toBe('completed');
    expect(scoreOf(s, 'A')).toBe(300);
    expect(scoreOf(s, 'B')).toBe(300);
    expect(winnerOf(s)).toEqual({ kind: 'tie' });
    expect(canStartTiebreak(s)).toBe(true);

    const historyBefore = JSON.stringify(s.results);
    s = must(s, { type: 'START_TIEBREAK' }, t + 1000);
    expect(s.mode).toBe('tiebreak');
    expect(s.phase).toBe('question');
    expect(remainingMs(s.timer, t + 1000)).toBe(30_000); // the tie-breaker has its own full clock
    expect(s.tiebreakers[s.tbIndex].difficulty).toBe('Hard');
    s = answerCorrectly(s, 'B', t + 2000);
    s = must(s, { type: 'NEXT' }, t + 20_000);
    expect(s.phase).toBe('completed');

    expect(JSON.stringify(s.results)).toBe(historyBefore); // the 30-question history is untouched
    expect([scoreOf(s, 'A'), scoreOf(s, 'B')]).toEqual([300, 300]);
    expect(s.results).toHaveLength(30);
    expect(s.tiebreakResults).toHaveLength(1);
    expect(winnerOf(s)).toEqual({ kind: 'team', team: 'B', by: 'tiebreak' });
    expect(canStartTiebreak(s)).toBe(false);
  });

  it('a tie-breaker with a steal: wrong first team → other team wins it', () => {
    const { s: done, t } = tiedGame();
    let s = must(done, { type: 'START_TIEBREAK' }, t + 1000);
    s = startAnswering(s, 'A', t + 2000);
    s = clickWrong(s, t + 3000);
    s = clickCorrect(s, t + 4000);
    s = must(s, { type: 'NEXT' }, t + 5000);
    expect(winnerOf(s)).toEqual({ kind: 'team', team: 'B', by: 'tiebreak' });
  });

  it('an unresolved tie-breaker with no extra question left stays a tie', () => {
    const { s: done, t } = tiedGame();
    let s = must(done, { type: 'START_TIEBREAK' }, t + 1000);
    s = must(s, { type: 'SKIP' }, t + 2000);
    s = must(s, { type: 'NEXT' }, t + 3000);
    expect(s.phase).toBe('completed');
    expect(winnerOf(s)).toEqual({ kind: 'tie' });
    expect(canStartTiebreak(s)).toBe(false); // only one extra question exists
  });

  it('tie-breaker cannot be started when scores are not tied', () => {
    let g = newGame();
    for (let n = 0; n < N; n++) {
      g = must(g, { type: 'SKIP' }, T0 + n);
      g = must(g, { type: 'NEXT' }, T0 + n);
    }
    expect(canStartTiebreak(g)).toBe(true); // 0-0 is a tie…
    const decided: GameState = {
      ...g,
      results: [{ ...g.results[0], awardedTo: 'A', awardedPoints: 10, outcome: 'correct' }, ...g.results.slice(1)],
    };
    expect(canStartTiebreak(decided)).toBe(false); // …a decided game is not
    reject(decided, { type: 'START_TIEBREAK' }, T0 + 5000);
  });
});

describe('purity & rev counter', () => {
  it('never mutates its input and bumps rev only on accepted changes', () => {
    const s = newGame();
    const frozen = JSON.stringify(s);
    const r1 = reduce(s, { type: 'SELECT_TEAM', team: 'B' }, T0 + 1);
    expect(JSON.stringify(s)).toBe(frozen);
    expect(r1.state.rev).toBe(s.rev + 1);
    const r2 = reduce(r1.state, { type: 'NEXT' }, T0 + 2);
    expect(r2.error).toBeTruthy();
    expect(r2.state.rev).toBe(r1.state.rev);
  });
});
