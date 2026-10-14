import { ANSWER_MS, STATE_SCHEMA } from './constants';
import type {
  Attempt,
  GameAction,
  GameConfig,
  GameState,
  LifelineState,
  OutcomeKind,
  Question,
  QuestionBank,
  QuestionResult,
  ReduceResult,
  TeamId,
  TimerState,
} from './types';
import { bankAvailability, validateBank, validateTeamNames } from './validation';

// ───────────────────────── helpers ─────────────────────────

export const otherTeam = (t: TeamId): TeamId => (t === 'A' ? 'B' : 'A');

export function remainingMs(timer: TimerState, now: number): number {
  if (timer.runningSince === null) return Math.max(0, timer.remainingMs);
  const elapsed = Math.max(0, now - timer.runningSince); // tolerate the clock moving backwards
  return Math.max(0, timer.remainingMs - elapsed);
}

const freezeTimer = (timer: TimerState, now: number): TimerState => ({
  remainingMs: remainingMs(timer, now),
  runningSince: null,
  wasRunning: false,
});

export function currentQuestion(s: GameState): Question | null {
  const list = s.mode === 'main' ? s.questions : s.tiebreakers;
  return list[s.mode === 'main' ? s.index : s.tbIndex] ?? null;
}

/** True while a team is allowed to answer (first attempt or steal). */
export const isTimerActivePhase = (s: GameState): boolean => s.phase === 'answering' || s.phase === 'steal';

/** A new question: the clock starts RIGHT NOW (the teacher picks the answering team while it counts). */
const freshQuestion = (now: number) => ({
  phase: 'question' as const,
  paused: false,
  selectedTeam: null,
  activeTeam: null,
  timer: { remainingMs: ANSWER_MS, runningSince: now, wasRunning: false },
  hiddenOptions: [] as number[],
  triedOptions: [] as number[],
  attempts: [] as Attempt[],
  answerShown: false,
  outcome: null,
});

const ok = (state: GameState): ReduceResult => ({ state });
const fail = (state: GameState, error: string): ReduceResult => ({ state, error });

function newSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ───────────────────────── creation ─────────────────────────

export type CreateResult = { state: GameState; error?: undefined } | { state?: undefined; error: string };

export function createGame(bank: QuestionBank, teamNames: [string, string], now: number): CreateResult {
  const nameError = validateTeamNames(teamNames[0], teamNames[1]);
  if (nameError) return { error: nameError };
  const availability = bankAvailability(bank);
  if (availability === 'empty') {
    return { error: `The question bank for Class ${bank.classLevel} is not available yet (no questions).` };
  }
  if (availability === 'invalid') {
    const first = validateBank(bank)[0];
    return { error: `The question bank has a problem: ${first?.message ?? 'invalid data'}` };
  }
  const config: GameConfig = {
    classLevel: bank.classLevel,
    bankId: bank.id,
    bankTitle: bank.title,
    bankStatus: bank.status,
    teamNames: [teamNames[0].trim(), teamNames[1].trim()],
  };
  const lifeline = (): LifelineState => ({ used: false, usedOnQuestionId: null });
  const state: GameState = {
    schema: STATE_SCHEMA,
    sessionId: newSessionId(),
    rev: 1,
    updatedAt: now,
    config,
    // Snapshot (deep copy) so later edits to the bank cannot reorder or change a running game.
    questions: JSON.parse(JSON.stringify(bank.questions)) as Question[],
    tiebreakers: JSON.parse(JSON.stringify(bank.tiebreakers)) as Question[],
    mode: 'main',
    index: 0,
    tbIndex: 0,
    endedEarly: false,
    ...freshQuestion(now),
    lifelines: { A: lifeline(), B: lifeline() },
    results: [],
    tiebreakResults: [],
  };
  return { state };
}

// ───────────────────────── scoring / queries ─────────────────────────

export function scoreOf(s: GameState, team: TeamId): number {
  // Derived from the immutable result log, so a score can never drift or be double-counted.
  return s.results.reduce((sum, r) => (r.awardedTo === team ? sum + r.awardedPoints : sum), 0);
}

export const allMainQuestionsDone = (s: GameState): boolean => s.results.length >= s.questions.length;

export type Winner =
  | { kind: 'team'; team: TeamId; by: 'score' | 'tiebreak' }
  | { kind: 'tie' };

export function tiebreakWinner(s: GameState): TeamId | null {
  const r = s.tiebreakResults.find((x) => x.awardedTo);
  return r?.awardedTo ?? null;
}

export function winnerOf(s: GameState): Winner {
  const a = scoreOf(s, 'A');
  const b = scoreOf(s, 'B');
  if (a !== b) return { kind: 'team', team: a > b ? 'A' : 'B', by: 'score' };
  const tb = tiebreakWinner(s);
  if (tb) return { kind: 'team', team: tb, by: 'tiebreak' };
  return { kind: 'tie' };
}

/** True when the teacher may start (another) tie-breaker question. */
export function canStartTiebreak(s: GameState): boolean {
  return (
    s.phase === 'completed' &&
    !s.endedEarly &&
    allMainQuestionsDone(s) &&
    scoreOf(s, 'A') === scoreOf(s, 'B') &&
    tiebreakWinner(s) === null &&
    s.tiebreakResults.length < s.tiebreakers.length
  );
}

export interface GameStats {
  answered: number;
  skipped: number;
  correctAttempts: number;
  incorrectAttempts: number;
}

export function statsOf(s: GameState): GameStats {
  const stats: GameStats = { answered: 0, skipped: 0, correctAttempts: 0, incorrectAttempts: 0 };
  for (const r of s.results) {
    if (r.outcome === 'skipped') stats.skipped += 1;
    else stats.answered += 1;
    for (const a of r.attempts) {
      if (a.correct) stats.correctAttempts += 1;
      else stats.incorrectAttempts += 1;
    }
  }
  return stats;
}

/** Which options the 50:50 lifeline removes for the current question. */
export function lifelineTargets(q: Question, triedOptions: number[]): number[] {
  const base = [...q.removableIndices];
  // After a failed attempt, never leave that known-wrong option as one of the two survivors,
  // otherwise the stealing team would get a guaranteed answer.
  const leftover = triedOptions.find((t) => t !== q.correctIndex && !base.includes(t));
  const chosen = leftover === undefined ? base : [leftover, base[0]];
  return chosen.sort((x, y) => x - y);
}

// ───────────────────────── transitions ─────────────────────────

function finalize(s: GameState, outcome: OutcomeKind, awardedTo: TeamId | null, now: number): ReduceResult {
  const q = currentQuestion(s);
  if (!q) return fail(s, 'No active question.');
  const log = s.mode === 'main' ? s.results : s.tiebreakResults;
  if (log.some((r) => r.questionId === q.id)) {
    return fail(s, 'This question already has a result (duplicate scoring blocked).');
  }
  const result: QuestionResult = {
    questionId: q.id,
    mode: s.mode,
    number: s.mode === 'main' ? s.index + 1 : 0,
    difficulty: q.difficulty,
    points: q.points,
    outcome,
    awardedTo,
    awardedPoints: awardedTo ? q.points : 0,
    attempts: s.attempts,
  };
  const next: GameState = {
    ...s,
    phase: 'reveal',
    timer: freezeTimer(s.timer, now),
    outcome,
    // The answer is shown automatically only if an attempt was actually judged.
    answerShown: s.attempts.length > 0,
    results: s.mode === 'main' ? [...s.results, result] : s.results,
    tiebreakResults: s.mode === 'tiebreak' ? [...s.tiebreakResults, result] : s.tiebreakResults,
  };
  return ok(next);
}

/**
 * The teacher clicked the option the answering team chose. It is judged at once:
 *  - correct → the question's points go to the team that answered, question ends;
 *  - wrong on the first attempt → the OTHER team gets the steal automatically, on the leftover time;
 *  - wrong on the steal → no points, question ends.
 */
function answer(s: GameState, index: number, now: number): ReduceResult {
  const q = currentQuestion(s);
  if (!q) return fail(s, 'No active question.');
  if (!isTimerActivePhase(s) || !s.activeTeam) return fail(s, 'Answers can only be taken while a team is answering.');
  if (!Number.isInteger(index) || index < 0 || index > 3) return fail(s, 'Invalid option.');
  const rem = remainingMs(s.timer, now);
  if (rem <= 0) return fail(s, 'Time is up for this team. Press "Time\'s up — end question".');
  if (s.hiddenOptions.includes(index)) return fail(s, 'That option was removed by 50:50.');
  if (s.triedOptions.includes(index)) return fail(s, 'That option was already tried and was wrong.');

  const team = s.activeTeam;
  const correct = index === q.correctIndex;
  const attempt: Attempt = { team, kind: s.phase === 'steal' ? 'steal' : 'primary', option: index, correct };
  const base: GameState = { ...s, timer: freezeTimer(s.timer, now), attempts: [...s.attempts, attempt] };

  if (correct) return finalize(base, 'correct', team, now);

  if (s.phase === 'answering') {
    // Hand over to the other team immediately. Same clock: only the leftover time continues.
    return ok({
      ...base,
      phase: 'steal',
      activeTeam: otherTeam(team),
      triedOptions: [...s.triedOptions, index],
      timer: { remainingMs: rem, runningSince: now, wasRunning: false },
    });
  }
  return finalize(base, 'no-points', null, now);
}

function reduceInner(s: GameState, action: GameAction, now: number): ReduceResult {
  const q = currentQuestion(s);

  // Finished games only accept the tie-breaker action.
  if (s.phase === 'completed') {
    if (action.type === 'START_TIEBREAK') {
      if (!canStartTiebreak(s)) return fail(s, 'A tie-breaker is not available.');
      return ok({ ...s, ...freshQuestion(now), mode: 'tiebreak', tbIndex: s.tiebreakResults.length });
    }
    return fail(s, 'The game is over.');
  }

  if (action.type === 'END_GAME') {
    return ok({
      ...s,
      phase: 'completed',
      paused: false,
      timer: freezeTimer(s.timer, now),
      endedEarly: s.mode === 'main' ? !allMainQuestionsDone(s) : false,
    });
  }

  if (s.paused) {
    if (action.type === 'RESUME') {
      return ok({
        ...s,
        paused: false,
        timer: s.timer.wasRunning
          ? { remainingMs: s.timer.remainingMs, runningSince: now, wasRunning: false }
          : s.timer,
      });
    }
    return fail(s, 'The game is paused — press Resume first.');
  }

  switch (action.type) {
    case 'PAUSE': {
      const running = s.timer.runningSince !== null;
      return ok({
        ...s,
        paused: true,
        timer: { remainingMs: remainingMs(s.timer, now), runningSince: null, wasRunning: running },
      });
    }
    case 'RESUME':
      return fail(s, 'The game is not paused.');

    case 'SELECT_TEAM': {
      // The clock is already running. Picking the team only says who answers; it never touches the clock.
      if (s.phase === 'question') {
        if (remainingMs(s.timer, now) <= 0) return fail(s, 'Time is up, so nobody can answer. Press "Time\'s up — end question".');
        return ok({ ...s, phase: 'answering', selectedTeam: action.team, activeTeam: action.team });
      }
      // A slip of the finger can be corrected until the first answer is judged or a lifeline is used.
      if (s.phase === 'answering' && s.attempts.length === 0 && s.hiddenOptions.length === 0) {
        return ok({ ...s, selectedTeam: action.team, activeTeam: action.team });
      }
      return fail(s, 'The answering team can no longer be changed.');
    }

    case 'ANSWER':
      return answer(s, action.index, now);

    case 'USE_LIFELINE': {
      if (!q) return fail(s, 'No active question.');
      if (!isTimerActivePhase(s) || !s.activeTeam) return fail(s, '50:50 can only be used while a team is answering.');
      if (remainingMs(s.timer, now) <= 0) return fail(s, 'Time is up for this team.');
      const team = s.activeTeam;
      if (s.lifelines[team].used) return fail(s, "This team's 50:50 has already been used.");
      if (s.hiddenOptions.length > 0) return fail(s, '50:50 has already been applied to this question.');
      return ok({
        ...s,
        hiddenOptions: lifelineTargets(q, s.triedOptions),
        lifelines: { ...s.lifelines, [team]: { used: true, usedOnQuestionId: q.id } },
      });
    }

    case 'EXPIRE': {
      if (s.timer.runningSince === null || remainingMs(s.timer, now) > 0) return ok(s);
      return ok({ ...s, timer: { remainingMs: 0, runningSince: null, wasRunning: false } });
    }

    case 'END_ATTEMPT': {
      const timedOut = (s.phase === 'question' || isTimerActivePhase(s)) && remainingMs(s.timer, now) <= 0;
      if (!timedOut) return fail(s, 'The question cannot be ended yet — the clock is still running.');
      return finalize(s, 'no-points', null, now);
    }

    case 'SKIP':
      if (s.phase === 'reveal') return fail(s, 'This question has already finished.');
      return finalize(s, 'skipped', null, now);

    case 'REVEAL_ANSWER':
      if (s.phase !== 'reveal') return fail(s, 'The answer cannot be revealed yet.');
      if (s.answerShown) return fail(s, 'The answer is already shown.');
      return ok({ ...s, answerShown: true });

    case 'NEXT': {
      if (s.phase !== 'reveal') return fail(s, 'Finish this question before opening the next one.');
      if (s.mode === 'tiebreak' || s.index + 1 >= s.questions.length) {
        return ok({ ...s, ...freshQuestion(now), phase: 'completed', timer: freezeTimer(s.timer, now) });
      }
      return ok({ ...s, ...freshQuestion(now), index: s.index + 1 });
    }

    case 'START_TIEBREAK':
      return fail(s, 'The tie-breaker can only start after the game is over.');
  }
}

/** The single entry point for all game changes. Pure: never mutates `state`. */
export function reduce(state: GameState, action: GameAction, now: number): ReduceResult {
  const result = reduceInner(state, action, now);
  if (result.error || result.state === state) return result;
  return { state: { ...result.state, rev: state.rev + 1, updatedAt: now } };
}
