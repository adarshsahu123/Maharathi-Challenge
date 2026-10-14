import type { Difficulty } from './types';

/** One clock per question: it starts when the question appears; a steal shares the leftover time. */
export const ANSWER_SECONDS = 30;
export const ANSWER_MS = ANSWER_SECONDS * 1000;

export const POINTS_BY_DIFFICULTY: Record<Difficulty, number> = {
  Easy: 10,
  Intermediate: 20,
  Hard: 30,
};

/** The standard game: 30 questions = 8 Easy + 14 Intermediate + 8 Hard. */
export const STANDARD_DISTRIBUTION: Record<Difficulty, number> = {
  Easy: 8,
  Intermediate: 14,
  Hard: 8,
};
export const STANDARD_QUESTION_COUNT = 30;
export const MAX_SCORE_PER_TEAM = 600;

export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export const MAX_TEAM_NAME_LENGTH = 24;

export const STORAGE_KEY = 'maharathi.game.v1';
export const DISPLAY_PING_KEY = 'maharathi.display.ping';
export const CHANNEL_NAME = 'maharathi-sync-v1';
// Bumped when the game rules changed shape (old saves are discarded): 2 = click-to-judge + auto steal,
// 3 = the clock starts when the question appears.
export const STATE_SCHEMA = 3;
