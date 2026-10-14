import type { ClassLevel, QuestionBank } from '../game/types';
import { class9Bank } from './questions/class9';

/**
 * Placeholder banks have NO questions on purpose. They exist so the setup screen can say
 * clearly "no approved question bank yet" instead of silently using unrelated questions.
 *
 * To add content for a class, create src/data/questions/classNN.ts (copy class9.ts) and
 * replace the matching placeholder below with that bank.
 */
const placeholder = (classLevel: ClassLevel): QuestionBank => ({
  id: `class${classLevel}-placeholder`,
  classLevel,
  title: `Class ${classLevel} — ICT`,
  status: 'placeholder',
  note: `There is no approved question bank for Class ${classLevel} yet. Questions will be added once the teacher supplies them.`,
  questions: [],
  tiebreakers: [],
});

export const QUESTION_BANKS: QuestionBank[] = [
  class9Bank,
  placeholder(10),
  placeholder(11),
  placeholder(12),
];

export const CLASS_LEVELS: ClassLevel[] = [9, 10, 11, 12];

export function banksForClass(level: ClassLevel): QuestionBank[] {
  return QUESTION_BANKS.filter((b) => b.classLevel === level);
}

export function findBank(id: string): QuestionBank | undefined {
  return QUESTION_BANKS.find((b) => b.id === id);
}
