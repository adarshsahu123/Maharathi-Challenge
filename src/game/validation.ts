import {
  POINTS_BY_DIFFICULTY,
  STANDARD_DISTRIBUTION,
  STANDARD_QUESTION_COUNT,
  MAX_TEAM_NAME_LENGTH,
} from './constants';
import type { Difficulty, Question, QuestionBank } from './types';

export interface Issue {
  questionId?: string;
  message: string;
}

const DIFFICULTIES: Difficulty[] = ['Easy', 'Intermediate', 'Hard'];

/** Validates one question. Safe to call with untrusted (e.g. localStorage) data. */
export function validateQuestion(input: unknown): Issue[] {
  const issues: Issue[] = [];
  const q = input as Partial<Question> | null;
  if (!q || typeof q !== 'object') return [{ message: 'Question object missing' }];
  const id = typeof q.id === 'string' && q.id ? q.id : undefined;
  const add = (message: string) => issues.push({ questionId: id, message });

  if (!id) add('Question id missing');
  if (typeof q.text !== 'string' || !q.text.trim()) add('Question text is empty');
  if (typeof q.topic !== 'string' || !q.topic.trim()) add('Topic is empty');
  if (typeof q.explanation !== 'string' || !q.explanation.trim()) add('Explanation is empty');

  const opts = q.options;
  if (!Array.isArray(opts) || opts.length !== 4) {
    add('Exactly four options are required');
  } else {
    if (opts.some((o) => typeof o !== 'string' || !o.trim())) add('An option is empty');
    const norm = opts.map((o) => String(o).trim().toLowerCase());
    if (new Set(norm).size !== 4) add('The four options must be distinct');
  }

  const ci = q.correctIndex;
  const ciOk = Number.isInteger(ci) && (ci as number) >= 0 && (ci as number) <= 3;
  if (!ciOk) add('correctIndex must be 0-3');

  if (!q.difficulty || !DIFFICULTIES.includes(q.difficulty)) {
    add('Difficulty must be Easy, Intermediate or Hard');
  } else if (q.points !== POINTS_BY_DIFFICULTY[q.difficulty]) {
    add(`Points must be ${POINTS_BY_DIFFICULTY[q.difficulty]} for ${q.difficulty} (found ${String(q.points)})`);
  }

  const r = q.removableIndices;
  if (!Array.isArray(r) || r.length !== 2) {
    add('Exactly two removable (50:50) incorrect options are required');
  } else {
    const valid = r.every((x) => Number.isInteger(x) && x >= 0 && x <= 3);
    if (!valid) add('removableIndices must be option indices 0-3');
    else {
      if (r[0] === r[1]) add('removableIndices must be two different options');
      if (ciOk && r.includes(ci as number)) add('50:50 must never remove the correct answer');
    }
  }
  return issues;
}

/** Validates a whole bank. An empty placeholder bank is "unavailable", not "invalid". */
export function validateBank(bank: QuestionBank): Issue[] {
  const issues: Issue[] = [];
  const all = [...bank.questions, ...bank.tiebreakers];
  for (const q of all) {
    issues.push(...validateQuestion(q));
    if (q.classLevel !== bank.classLevel) {
      issues.push({ questionId: q.id, message: `Question belongs to class ${q.classLevel}, bank is class ${bank.classLevel}` });
    }
  }
  const ids = all.map((q) => q.id);
  if (new Set(ids).size !== ids.length) issues.push({ message: 'Duplicate question ids in bank' });

  if (bank.questions.length > 0) {
    if (bank.questions.length !== STANDARD_QUESTION_COUNT) {
      issues.push({ message: `A standard game needs ${STANDARD_QUESTION_COUNT} questions (found ${bank.questions.length})` });
    }
    for (const d of DIFFICULTIES) {
      const n = bank.questions.filter((q) => q.difficulty === d).length;
      if (n !== STANDARD_DISTRIBUTION[d]) {
        issues.push({ message: `Expected ${STANDARD_DISTRIBUTION[d]} ${d} questions (found ${n})` });
      }
    }
    // Round order: all Easy, then all Intermediate, then all Hard.
    const rank = (d: Difficulty) => DIFFICULTIES.indexOf(d);
    for (let i = 1; i < bank.questions.length; i++) {
      if (rank(bank.questions[i].difficulty) < rank(bank.questions[i - 1].difficulty)) {
        issues.push({ message: 'Questions must be ordered Easy, then Intermediate, then Hard' });
        break;
      }
    }
  }
  for (const q of bank.tiebreakers) {
    if (q.difficulty !== 'Hard') issues.push({ questionId: q.id, message: 'Tie-breaker questions must be Hard' });
  }
  return issues;
}

export type BankAvailability = 'ready' | 'empty' | 'invalid';

export function bankAvailability(bank: QuestionBank): BankAvailability {
  if (bank.questions.length === 0) return 'empty';
  return validateBank(bank).length === 0 ? 'ready' : 'invalid';
}

/** Returns an error message, or null when both names are acceptable. */
export function validateTeamNames(a: string, b: string): string | null {
  const x = a.trim();
  const y = b.trim();
  if (!x || !y) return 'Both team names are required (names cannot be empty).';
  if (x.length > MAX_TEAM_NAME_LENGTH || y.length > MAX_TEAM_NAME_LENGTH) {
    return `Each team name must be at most ${MAX_TEAM_NAME_LENGTH} characters.`;
  }
  if (x.toLowerCase() === y.toLowerCase()) return 'The two team names must be different (duplicate names).';
  return null;
}
