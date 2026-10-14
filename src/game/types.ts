export type TeamId = 'A' | 'B';
export type Difficulty = 'Easy' | 'Intermediate' | 'Hard';
export type ClassLevel = 9 | 10 | 11 | 12;

/** draft = written from syllabus excerpts, teacher must verify; placeholder = no real content yet. */
export type BankStatus = 'approved' | 'draft' | 'placeholder';

export interface Question {
  id: string;
  classLevel: ClassLevel;
  topic: string;
  text: string;
  /** Exactly four options. */
  options: string[];
  /** Index (0-3) of the single correct option. */
  correctIndex: number;
  explanation: string;
  difficulty: Difficulty;
  points: number;
  /** Exactly two INCORRECT option indices that the 50:50 lifeline may remove. */
  removableIndices: [number, number];
  /** True for questions added by the developer (not supplied by the teacher): shown to the teacher as verify. */
  needsReview?: boolean;
}

export interface QuestionBank {
  id: string;
  classLevel: ClassLevel;
  title: string;
  status: BankStatus;
  /** Shown to the teacher in the setup screen. */
  note: string;
  /** The 30 standard questions (empty for a class with no content yet). */
  questions: Question[];
  /** Optional extra Hard questions for the teacher-controlled tie-breaker. */
  tiebreakers: Question[];
}

export type Phase =
  | 'question' // question is shown and the clock is already running; waiting for the teacher to pick the team
  | 'answering' // first team's countdown is running
  | 'steal' // first team was wrong; the other team answers automatically on the leftover time
  | 'reveal' // question finished; result (and maybe answer) shown
  | 'completed'; // all questions done (or game ended early)

export type Mode = 'main' | 'tiebreak';

export interface TimerState {
  /** Time left at the moment `runningSince` was set (or the frozen time if not running). */
  remainingMs: number;
  /** Timestamp (ms) when the clock last started, or null if stopped. */
  runningSince: number | null;
  /** True while the game is paused and the clock must continue after resume. */
  wasRunning: boolean;
}

export interface Attempt {
  team: TeamId;
  kind: 'primary' | 'steal';
  /** Option (0-3) the teacher clicked for the team. */
  option: number;
  correct: boolean;
}

export type OutcomeKind = 'correct' | 'no-points' | 'skipped';

export interface QuestionResult {
  questionId: string;
  mode: Mode;
  /** 1-based position in the question list; 0 for tie-breaker questions. */
  number: number;
  difficulty: Difficulty;
  points: number;
  outcome: OutcomeKind;
  awardedTo: TeamId | null;
  awardedPoints: number;
  attempts: Attempt[];
}

export interface LifelineState {
  used: boolean;
  usedOnQuestionId: string | null;
}

export interface GameConfig {
  classLevel: ClassLevel;
  bankId: string;
  bankTitle: string;
  bankStatus: BankStatus;
  teamNames: [string, string];
}

export interface GameState {
  schema: number;
  sessionId: string;
  /** Increments on every accepted change; used to order updates across tabs. */
  rev: number;
  updatedAt: number;
  config: GameConfig;
  /** Snapshot taken at game start, so editing the bank mid-game cannot change the order. */
  questions: Question[];
  tiebreakers: Question[];

  phase: Phase;
  paused: boolean;
  mode: Mode;
  /** Index into `questions` for the current (or last finished) main question. */
  index: number;
  /** Index into `tiebreakers` while mode === 'tiebreak'. */
  tbIndex: number;
  endedEarly: boolean;

  // ---- per-question state (reset for every question) ----
  selectedTeam: TeamId | null;
  /** The team allowed to answer right now. */
  activeTeam: TeamId | null;
  timer: TimerState;
  hiddenOptions: number[];
  triedOptions: number[];
  attempts: Attempt[];
  answerShown: boolean;
  outcome: OutcomeKind | null;

  // ---- game-wide state ----
  lifelines: Record<TeamId, LifelineState>;
  results: QuestionResult[];
  tiebreakResults: QuestionResult[];
}

export type GameAction =
  | { type: 'SELECT_TEAM'; team: TeamId }
  /** The teacher clicked the option the answering team chose; it is judged immediately. */
  | { type: 'ANSWER'; index: number }
  | { type: 'USE_LIFELINE' }
  | { type: 'END_ATTEMPT' }
  | { type: 'SKIP' }
  | { type: 'REVEAL_ANSWER' }
  | { type: 'NEXT' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'EXPIRE' }
  | { type: 'START_TIEBREAK' }
  | { type: 'END_GAME' };

export interface ReduceResult {
  state: GameState;
  /** Message when the action was rejected. */
  error?: string;
}
