import { describe, expect, it } from 'vitest';
import { class9Bank } from '../src/data/questions/class9';
import { buildQuestionView } from '../src/game/view';
import { isValidGameState, parseState, readState, shouldAdopt, writeState, type KeyValueStore } from '../src/game/storage';
import { must, newGame, startAnswering, T0, correctIndexOf, wrongIndexOf } from './helpers';

describe('student display never leaks the answer', () => {
  it('has no correct answer or explanation during question and answering phases', () => {
    let s = newGame();
    for (const step of ['question', 'answering', 'lifeline', 'steal'] as const) {
      if (step === 'answering') s = startAnswering(s, 'A', T0);
      if (step === 'lifeline') s = must(s, { type: 'USE_LIFELINE' }, T0 + 2000);
      if (step === 'steal') s = must(s, { type: 'ANSWER', index: [0, 1, 2, 3].find((i) => i !== correctIndexOf(s) && !s.hiddenOptions.includes(i))! }, T0 + 3000);
      const v = buildQuestionView(s, 'student')!;
      expect(v.explanation).toBeNull();
      expect(v.correctLabel).toBeNull();
      expect(v.answerRevealed).toBe(false);
      expect(v.options.some((o) => o.isKey || o.status === 'correct')).toBe(false);
      // the projected object must not even contain the key by structure
      expect(JSON.stringify(v)).not.toContain(class9Bank.questions[0].explanation);
      expect(JSON.stringify(v)).not.toContain('correctIndex');
    }
  });

  it('hides the TEXT of 50:50-removed options on the student display until reveal', () => {
    let s = startAnswering(newGame(), 'A', T0);
    s = must(s, { type: 'USE_LIFELINE' }, T0 + 1000);
    const v = buildQuestionView(s, 'student')!;
    const removed = v.options.filter((o) => o.status === 'removed');
    expect(removed).toHaveLength(2);
    expect(removed.every((o) => o.text === '')).toBe(true);
    expect(v.options.filter((o) => o.status !== 'removed')).toHaveLength(2);
    // teacher still sees what was removed
    const t = buildQuestionView(s, 'teacher')!;
    expect(t.options.filter((o) => o.status === 'removed').every((o) => o.text !== '')).toBe(true);
  });

  it('timeout/skip: answer stays hidden until the teacher reveals it', () => {
    let s = newGame();
    s = must(s, { type: 'SKIP' }, T0 + 1);
    expect(buildQuestionView(s, 'student')!.answerRevealed).toBe(false);
    expect(buildQuestionView(s, 'student')!.explanation).toBeNull();
    s = must(s, { type: 'REVEAL_ANSWER' }, T0 + 2);
    const v = buildQuestionView(s, 'student')!;
    expect(v.answerRevealed).toBe(true);
    expect(v.explanation).toBe(class9Bank.questions[0].explanation);
    expect(v.options.filter((o) => o.status === 'correct')).toHaveLength(1);
  });

  it('reveal after a wrong + correct sequence marks correct and wrong with distinct statuses', () => {
    let s = startAnswering(newGame(), 'A', T0);
    s = must(s, { type: 'ANSWER', index: wrongIndexOf(s) }, T0 + 1000); // wrong → automatic steal
    const during = buildQuestionView(s, 'student')!;
    expect(during.options.filter((o) => o.status === 'tried')).toHaveLength(1); // shown as incorrect straight away
    expect(during.answerRevealed).toBe(false); // …but the correct answer stays hidden for the steal
    expect(during.options.some((o) => o.status === 'correct')).toBe(false);
    s = must(s, { type: 'ANSWER', index: correctIndexOf(s) }, T0 + 5000);
    const v = buildQuestionView(s, 'student')!;
    expect(v.options.filter((o) => o.status === 'correct')).toHaveLength(1);
    expect(v.options.filter((o) => o.status === 'wrong')).toHaveLength(1);
  });

  it('teacher can hide the key', () => {
    const s = newGame();
    expect(buildQuestionView(s, 'teacher', true)!.options.some((o) => o.isKey)).toBe(true);
    expect(buildQuestionView(s, 'teacher', false)!.options.some((o) => o.isKey)).toBe(false);
  });
});

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
}

describe('storage & recovery', () => {
  it('round-trips an active game through JSON (browser refresh)', () => {
    let s = startAnswering(newGame(), 'A', T0);
    s = must(s, { type: 'USE_LIFELINE' }, T0 + 1000);
    const kv = memoryStore();
    expect(writeState(kv, 'k', s)).toBe(true);
    const back = readState(kv, 'k');
    expect(back.corrupt).toBe(false);
    expect(back.state).toEqual(s);
  });

  it('treats corrupt JSON, wrong schema and tampered questions as corrupt (no crash)', () => {
    expect(parseState('{not json').corrupt).toBe(true);
    expect(parseState('42').corrupt).toBe(true);
    expect(parseState('{"schema":99}').corrupt).toBe(true);
    const s = newGame();
    const tampered = JSON.parse(JSON.stringify(s));
    tampered.questions[0].removableIndices = [tampered.questions[0].correctIndex, 0];
    expect(isValidGameState(tampered)).toBe(false);
    const bad2 = JSON.parse(JSON.stringify(s));
    delete bad2.lifelines;
    expect(parseState(JSON.stringify(bad2)).corrupt).toBe(true);
    expect(parseState(null)).toEqual({ state: null, corrupt: false });
  });

  it('survives a storage that throws', () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(writeState(throwing, 'k', newGame())).toBe(false);
    expect(readState(throwing, 'k')).toEqual({ state: null, corrupt: false });
  });

  it('shouldAdopt: only newer revisions of the same session replace local state', () => {
    const a = newGame();
    const newer = must(a, { type: 'SELECT_TEAM', team: 'A' }, T0 + 1);
    expect(shouldAdopt(a, newer)).toBe(true);
    expect(shouldAdopt(newer, a)).toBe(false); // stale update ignored
    expect(shouldAdopt(newer, newer)).toBe(false); // same rev: no duplicate render
    expect(shouldAdopt(null, a)).toBe(true);
    expect(shouldAdopt(a, null)).toBe(true);
    expect(shouldAdopt(null, null)).toBe(false);
  });
});
