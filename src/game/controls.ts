import { ANSWER_MS } from './constants';
import { isTimerActivePhase, remainingMs } from './engine';
import type { GameState, TeamId } from './types';

/** Everything a control screen needs to know about what may be pressed right now. */
export interface Controls {
  rem: number;
  /** A team is answering (first attempt or steal). */
  live: boolean;
  timeUp: boolean;
  running: boolean;
  /** The answering phase has begun for this question (even if it already ended). */
  started: boolean;
  canAnswerNow: boolean;
  lifelineTeam: TeamId | null;
  lifelineUsed: boolean;
  lifelineEnabled: boolean;
  lifelineReason: string;
  lastQuestion: boolean;
  hint: string;
}

export function deriveControls(s: GameState, now: number): Controls {
  const nameOf = (t: TeamId | null) => (t === 'A' ? s.config.teamNames[0] : t === 'B' ? s.config.teamNames[1] : '—');
  const rem = remainingMs(s.timer, now);
  const live = isTimerActivePhase(s);
  // The clock also runs while the team is still being chosen, so it can run out before anyone answers.
  const timeUp = (live || s.phase === 'question') && rem <= 0;
  const running = s.timer.runningSince !== null && !s.paused;
  const started = s.phase !== 'reveal' || s.timer.remainingMs < ANSWER_MS;
  const canAnswerNow = live && !s.paused && rem > 0;

  const lifelineTeam: TeamId | null = s.activeTeam ?? s.selectedTeam;
  const lifelineUsed = lifelineTeam ? s.lifelines[lifelineTeam].used : false;
  let lifelineReason = 'Select the answering team first';
  if (lifelineTeam) {
    if (s.paused) lifelineReason = 'The game is paused';
    else if (!live) lifelineReason = 'Available once a team is answering';
    else if (rem <= 0) lifelineReason = "Time's up";
    else if (lifelineUsed) lifelineReason = "This team's 50:50 has been used";
    else if (s.hiddenOptions.length > 0) lifelineReason = '50:50 was already applied to this question';
  }
  const lifelineEnabled = canAnswerNow && !!lifelineTeam && !lifelineUsed && s.hiddenOptions.length === 0;

  let hint = '';
  if (s.paused) hint = 'The game is paused — press Resume.';
  else if (s.phase === 'question') {
    hint = timeUp
      ? 'Time is up and no team answered. Press “Time’s up — end question”.'
      : `The ${ANSWER_MS / 1000}-second clock is running. Select the team whose captain stood up first.`;
  } else if (live) {
    hint = timeUp
      ? 'Time is up. Press “Time’s up — end question”.'
      : s.phase === 'steal'
        ? `Steal: click the option ${nameOf(s.activeTeam)} chooses. The remaining time is all they get.`
        : `Click the option ${nameOf(s.activeTeam)} chooses — the result shows immediately. A wrong answer passes to the other team automatically.`;
  } else if (s.phase === 'reveal') {
    hint = s.answerShown ? 'Open the next question when ready.' : 'Show the correct answer if you wish, then open the next question.';
  }

  return {
    rem,
    live,
    timeUp,
    running,
    started,
    canAnswerNow,
    lifelineTeam,
    lifelineUsed,
    lifelineEnabled,
    lifelineReason,
    lastQuestion: s.mode === 'main' && s.index + 1 >= s.questions.length,
    hint,
  };
}
