import { OPTION_LABELS } from './constants';
import { currentQuestion } from './engine';
import type { Difficulty, GameState } from './types';

export type OptionStatus =
  | 'normal'
  | 'removed' // hidden by 50:50 while the question is live
  | 'eliminated' // removed by 50:50, shown dimmed after the answer is revealed
  | 'tried' // a wrong option already attempted by the first team
  | 'correct' // revealed correct answer
  | 'wrong'; // revealed wrong option that was chosen

export interface OptionView {
  index: number;
  label: string;
  /** Empty string for a 50:50-removed option on the student display (text must stay hidden). */
  text: string;
  status: OptionStatus;
  /** Teacher-only hint marking the correct answer. Always false for the student audience. */
  isKey: boolean;
}

export interface QuestionView {
  id: string;
  /** "Q3" or "Tie-breaker" */
  label: string;
  number: number;
  total: number;
  isTiebreak: boolean;
  topic: string;
  text: string;
  difficulty: Difficulty;
  points: number;
  options: OptionView[];
  /** Only populated once the teacher has revealed the answer (or always for the teacher audience). */
  explanation: string | null;
  correctLabel: string | null;
  answerRevealed: boolean;
  /** True when the question was added by the developer and still needs the teacher's verification. */
  needsReview: boolean;
}

export type Audience = 'teacher' | 'student';

/**
 * Builds what a screen is allowed to render.
 * The STUDENT audience never receives `correctIndex`, the explanation, or the text of removed
 * options until the answer has been revealed — the projector cannot leak the key.
 */
export function buildQuestionView(s: GameState, audience: Audience, showKey = true): QuestionView | null {
  const q = currentQuestion(s);
  if (!q) return null;
  const revealed = s.phase === 'reveal' && s.answerShown;
  const wrongPicks = new Set(s.attempts.filter((a) => !a.correct).map((a) => a.option));
  const teacher = audience === 'teacher';

  const options: OptionView[] = q.options.map((text, index) => {
    const hidden = s.hiddenOptions.includes(index);
    let status: OptionStatus = 'normal';
    if (revealed) {
      if (index === q.correctIndex) status = 'correct';
      else if (wrongPicks.has(index)) status = 'wrong';
      else if (hidden) status = 'eliminated';
    } else if (hidden) status = 'removed';
    else if (s.triedOptions.includes(index)) status = 'tried';

    const hideText = status === 'removed' && !teacher;
    return {
      index,
      label: OPTION_LABELS[index],
      text: hideText ? '' : text,
      status,
      isKey: teacher && showKey && index === q.correctIndex,
    };
  });

  const showAnswer = revealed || (teacher && showKey);
  return {
    id: q.id,
    label: s.mode === 'main' ? `Q${s.index + 1}` : 'Tie-breaker',
    number: s.mode === 'main' ? s.index + 1 : 0,
    total: s.questions.length,
    isTiebreak: s.mode === 'tiebreak',
    topic: q.topic,
    text: q.text,
    difficulty: q.difficulty,
    points: q.points,
    options,
    explanation: showAnswer ? q.explanation : null,
    correctLabel: showAnswer ? OPTION_LABELS[q.correctIndex] : null,
    answerRevealed: revealed,
    needsReview: Boolean(q.needsReview),
  };
}
