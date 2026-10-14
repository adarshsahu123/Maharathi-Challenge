import { remainingMs, scoreOf } from './engine';
import type { GameState } from './types';

export type Tone = 'info' | 'active' | 'good' | 'bad' | 'warn';

export interface StatusLine {
  tone: Tone;
  text: string;
  /** Short word shown with an icon so the meaning never depends on colour alone. */
  badge: string;
}

/** One human-readable sentence describing what is happening, shared by both screens. */
export function statusLine(s: GameState, now: number): StatusLine {
  const [nameA, nameB] = s.config.teamNames;
  const name = (t: 'A' | 'B' | null) => (t === 'A' ? nameA : t === 'B' ? nameB : '');
  const rem = remainingMs(s.timer, now);

  if (s.phase === 'completed') return { tone: 'good', badge: 'GAME OVER', text: 'The game is over' };
  if (s.paused) return { tone: 'warn', badge: 'PAUSED', text: 'The game is paused' };

  switch (s.phase) {
    case 'question':
      return rem <= 0
        ? { tone: 'bad', badge: "TIME'S UP", text: "Time's up — no team answered" }
        : { tone: 'info', badge: 'CLOCK RUNNING', text: 'Think fast — the captain who stands up first answers' };
    case 'answering':
      return rem <= 0
        ? { tone: 'bad', badge: "TIME'S UP", text: `Time's up for ${name(s.activeTeam)}` }
        : { tone: 'active', badge: 'ANSWERING', text: `${name(s.activeTeam)} is answering` };
    case 'steal':
      return rem <= 0
        ? { tone: 'bad', badge: "TIME'S UP", text: `Time's up — ${name(s.activeTeam)} could not answer the steal` }
        : {
            tone: 'warn',
            badge: 'INCORRECT ✗ → STEAL',
            text: `${name(s.selectedTeam)} answered incorrectly ✗ — ${name(s.activeTeam)} now answers with the remaining time`,
          };
    case 'reveal': {
      const last = s.mode === 'main' ? s.results[s.results.length - 1] : s.tiebreakResults[s.tiebreakResults.length - 1];
      if (s.outcome === 'correct' && last?.awardedTo) {
        return { tone: 'good', badge: 'CORRECT ✓', text: `Correct! ${name(last.awardedTo)} gets +${last.awardedPoints} points` };
      }
      if (s.outcome === 'skipped') return { tone: 'info', badge: 'SKIPPED', text: 'Question skipped — 0 points for both teams' };
      if (s.attempts.length >= 2) return { tone: 'bad', badge: 'INCORRECT ✗', text: 'Both teams answered incorrectly — 0 points' };
      if (s.attempts.length === 1) return { tone: 'bad', badge: "TIME'S UP", text: "Time's up on the steal — 0 points" };
      return { tone: 'bad', badge: "TIME'S UP", text: "Time's up — 0 points for both teams" };
    }
  }
}

export function scoresText(s: GameState): string {
  return `${s.config.teamNames[0]} ${scoreOf(s, 'A')} — ${scoreOf(s, 'B')} ${s.config.teamNames[1]}`;
}
