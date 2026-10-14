import { describe, expect, it } from 'vitest';
import { class9Bank } from '../src/data/questions/class9';
import { QUESTION_BANKS } from '../src/data/banks';
import { bankAvailability, validateBank, validateQuestion, validateTeamNames } from '../src/game/validation';
import type { Question } from '../src/game/types';

const qs = class9Bank.questions;

describe('Class 9 question bank (as supplied by the teacher)', () => {
  it('has no validation issues', () => {
    expect(validateBank(class9Bank)).toEqual([]);
    expect(bankAvailability(class9Bank)).toBe('ready');
  });

  it('has exactly 30 questions: 8 Easy, 14 Intermediate, 8 Hard, in that order', () => {
    expect(qs).toHaveLength(30);
    expect(qs.filter((q) => q.difficulty === 'Easy')).toHaveLength(8);
    expect(qs.filter((q) => q.difficulty === 'Intermediate')).toHaveLength(14);
    expect(qs.filter((q) => q.difficulty === 'Hard')).toHaveLength(8);
    expect(qs.slice(0, 8).every((q) => q.difficulty === 'Easy')).toBe(true);
    expect(qs.slice(8, 22).every((q) => q.difficulty === 'Intermediate')).toBe(true);
    expect(qs.slice(22).every((q) => q.difficulty === 'Hard')).toBe(true);
    expect(new Set(qs.map((q) => q.id)).size).toBe(30);
  });

  it('keeps the 20 teacher-supplied questions first within their rounds, in their original order', () => {
    const ids = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `c9-q${String(from + i).padStart(2, '0')}`);
    const idsOf = (d: string) => qs.filter((q) => q.difficulty === d).map((q) => q.id);
    expect(idsOf('Easy')).toEqual([...ids(1, 5), ...ids(21, 23)]);
    expect(idsOf('Intermediate')).toEqual([...ids(6, 15), ...ids(24, 27)]);
    expect(idsOf('Hard')).toEqual([...ids(16, 20), ...ids(28, 30)]);
  });

  it('flags exactly the 10 developer-added questions for teacher review, and none of the supplied ones', () => {
    const flagged = qs.filter((q) => q.needsReview).map((q) => q.id);
    expect(flagged).toEqual(['c9-q21', 'c9-q22', 'c9-q23', 'c9-q24', 'c9-q25', 'c9-q26', 'c9-q27', 'c9-q28', 'c9-q29', 'c9-q30']);
    expect(qs.filter((q) => !q.needsReview)).toHaveLength(20);
  });

  it('points match difficulty and total 600', () => {
    for (const q of qs) expect(q.points).toBe({ Easy: 10, Intermediate: 20, Hard: 30 }[q.difficulty]);
    expect(qs.reduce((a, q) => a + q.points, 0)).toBe(600);
  });

  it('every question: 4 distinct options, one valid correct answer, explanation, two safe 50:50 targets', () => {
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
      expect(q.explanation.length).toBeGreaterThan(10);
      expect(q.removableIndices).toHaveLength(2);
      expect(q.removableIndices[0]).not.toBe(q.removableIndices[1]);
      expect(q.removableIndices).not.toContain(q.correctIndex);
    }
  });

  it('matches the supplied correct answers (A=0 … D=3) for the 20 teacher questions', () => {
    const supplied = ['B', 'C', 'D', 'B', 'C', 'B', 'B', 'A', 'C', 'B', 'A', 'B', 'C', 'A', 'C', 'B', 'B', 'A', 'A', 'B'];
    const byId = (n: number) => qs.find((q) => q.id === `c9-q${String(n).padStart(2, '0')}`)!;
    expect(supplied.map((_, i) => 'ABCD'[byId(i + 1).correctIndex])).toEqual(supplied);
  });

  it('keeps the Hindi + English style (Devanagari text with English technical terms)', () => {
    const devanagari = /[ऀ-ॿ]/;
    for (const q of qs) {
      expect(devanagari.test(q.text + q.explanation)).toBe(true);
    }
    expect(qs[0].text).toBe('Computer के IPO Cycle में Data को Process कौन करता है?');
    expect(qs.find((q) => q.id === 'c9-q20')!.text).toContain('Low-Level Instructions');
  });
});

describe('tie-breaker bank data', () => {
  it('is Hard, valid, and clearly flagged as an unapproved draft', () => {
    expect(class9Bank.tiebreakers).toHaveLength(1);
    const tb = class9Bank.tiebreakers[0];
    expect(validateQuestion(tb)).toEqual([]);
    expect(tb.difficulty).toBe('Hard');
    expect(tb.topic).toMatch(/unapproved/i);
  });
});

describe('bank registry', () => {
  it('Class 10-12 are clearly identified placeholders with no questions', () => {
    for (const level of [10, 11, 12]) {
      const b = QUESTION_BANKS.find((x) => x.classLevel === level)!;
      expect(b.status).toBe('placeholder');
      expect(b.questions).toHaveLength(0);
      expect(bankAvailability(b)).toBe('empty');
    }
  });
  it('Class 9 is marked draft, never "approved"', () => {
    expect(class9Bank.status).toBe('draft');
  });
});

describe('validation catches bad data', () => {
  const good = qs[0];
  const bad = (patch: Partial<Question>) => validateQuestion({ ...good, ...patch });

  it('duplicate options', () => expect(bad({ options: ['a', 'a', 'b', 'c'] }).length).toBeGreaterThan(0));
  it('wrong option count', () => expect(bad({ options: ['a', 'b', 'c'] }).length).toBeGreaterThan(0));
  it('correct index out of range', () => expect(bad({ correctIndex: 4 }).length).toBeGreaterThan(0));
  it('50:50 targets the correct answer', () =>
    expect(bad({ removableIndices: [good.correctIndex, 0] }).length).toBeGreaterThan(0));
  it('50:50 targets identical options', () => expect(bad({ removableIndices: [2, 2] }).length).toBeGreaterThan(0));
  it('missing 50:50 data', () => expect(bad({ removableIndices: undefined as never }).length).toBeGreaterThan(0));
  it('points that do not match difficulty', () => expect(bad({ points: 25 }).length).toBeGreaterThan(0));
  it('empty explanation', () => expect(bad({ explanation: '  ' }).length).toBeGreaterThan(0));
  it('garbage input', () => expect(validateQuestion(null).length).toBeGreaterThan(0));

  it('bank with the wrong difficulty mix or count', () => {
    const b = { ...class9Bank, questions: class9Bank.questions.slice(0, 29) };
    expect(validateBank(b).length).toBeGreaterThan(0);
    const swapped = { ...class9Bank, questions: [...class9Bank.questions].reverse() };
    expect(validateBank(swapped).length).toBeGreaterThan(0);
  });
});

describe('team name validation', () => {
  it('accepts two different names', () => expect(validateTeamNames('Arjun', 'Karna')).toBeNull());
  it('rejects empty', () => expect(validateTeamNames('', 'Karna')).not.toBeNull());
  it('rejects duplicates ignoring case and spaces', () => expect(validateTeamNames('Arjun', ' ARJUN ')).not.toBeNull());
});
