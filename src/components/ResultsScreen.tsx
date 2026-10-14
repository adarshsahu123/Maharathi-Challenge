import { Handshake, Home, RotateCcw, Swords, Trophy } from 'lucide-react';
import { canStartTiebreak, scoreOf, statsOf, tiebreakWinner, winnerOf } from '../game/engine';
import type { GameState, TeamId } from '../game/types';
import { useCountUp } from '../hooks/useCountUp';
import { Celebration } from './Celebration';
import { Confetti } from './Confetti';

interface Props {
  state: GameState;
  audience: 'teacher' | 'student';
  onPlayAgain?: () => void;
  onHome?: () => void;
  onTiebreak?: () => void;
}

export function ResultsScreen({ state, audience, onPlayAgain, onHome, onTiebreak }: Props) {
  const [nameA, nameB] = state.config.teamNames;
  const shown = { A: useCountUp(scoreOf(state, 'A')), B: useCountUp(scoreOf(state, 'B')) };
  const winner = winnerOf(state);
  const stats = statsOf(state);
  const name = (t: TeamId) => (t === 'A' ? nameA : nameB);
  const teacher = audience === 'teacher';
  const tieBreakAvailable = canStartTiebreak(state);
  const tbDone = state.tiebreakResults.length > 0;
  const decidedByTb = winner.kind === 'team' && winner.by === 'tiebreak';

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-[clamp(0.5rem,1.5vh,1.25rem)] p-[clamp(0.5rem,1.6vh,1.5rem)]">
      {winner.kind === 'team' && (
        <>
          <Celebration winnerName={name(winner.team)} />
          <Confetti />
        </>
      )}

      <header className="text-center">
        <p className="chip mx-auto border-gold-400 bg-navy-900 text-gold-300">
          {state.endedEarly ? 'Game ended early' : 'FINAL RESULT'}
        </p>
        {winner.kind === 'team' ? (
          <>
            <Trophy aria-hidden className="trophy-star mx-auto mt-1 h-[clamp(3.25rem,10vh,6.5rem)] w-[clamp(3.25rem,10vh,6.5rem)] text-gold-400 drop-shadow-[0_0_36px_rgba(248,210,74,0.75)]" />
            <h1 className="headline-shine mt-1 font-display text-[clamp(1.6rem,min(3.8vw,6.2vh),3.75rem)] leading-tight text-gold-400" data-testid="winner-announcement">
              <span aria-hidden className="sparkle">🎉</span> {name(winner.team)} — our{' '}
              <span className="whitespace-nowrap">
                Maharathi! <span aria-hidden className="sparkle">🎉</span>
              </span>
            </h1>
            <p className="mt-1 text-[clamp(1rem,min(1.6vw,2.6vh),1.6rem)] font-semibold">
              {decidedByTb ? 'Winner by the tie-breaker question' : `Winner with ${scoreOf(state, winner.team)} points`}
            </p>
          </>
        ) : (
          <>
            <Handshake aria-hidden className="mx-auto mt-1 h-[clamp(3.25rem,10vh,6rem)] w-[clamp(3.25rem,10vh,6rem)] text-gold-400" />
            <h1 className="mt-1 font-display text-[clamp(1.6rem,min(3.8vw,6.2vh),3.75rem)] leading-tight text-gold-400" data-testid="winner-announcement">
              It's a TIE!
            </h1>
            <p className="mt-1 text-[clamp(1rem,min(1.6vw,2.6vh),1.6rem)] font-semibold">
              {tbDone ? 'The teams are still level after the tie-breaker' : tieBreakAvailable ? `Both teams scored ${scoreOf(state, 'A')} points — ready for one extra Hard tie-breaker question?` : `Both teams scored ${scoreOf(state, 'A')} points`}
            </p>
          </>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Final scores">
        {(['A', 'B'] as TeamId[]).map((t) => {
          const isWinner = winner.kind === 'team' && winner.team === t;
          return (
            <div key={t} className={`panel p-[clamp(0.5rem,1.6vh,1.25rem)] text-center ${isWinner ? 'pulse-ring border-gold-400 shadow-[0_0_44px_rgba(248,210,74,0.5)]' : ''}`}>
              <p className="chip mx-auto border-gold-500/60 bg-navy-900 text-gold-300">
                TEAM {t} {isWinner && '· 🏆 WINNER'}
                {winner.kind === 'tie' && '· TIE'}
              </p>
              <h2 className="mt-1 break-words text-[clamp(1.25rem,3.2vh,1.9rem)] font-bold">{name(t)}</h2>
              <p className="font-display text-[clamp(2.75rem,min(7vw,11vh),5.5rem)] leading-none text-gold-400" data-testid={`final-score-${t}`}>
                {shown[t]}
              </p>
              <p className="text-base text-slate-200">points (after {state.results.length} of {state.questions.length} questions{tiebreakWinner(state) === t ? ' · tie-breaker winner' : ''})</p>
            </div>
          );
        })}
      </section>

      <section className="panel p-[clamp(0.5rem,1.4vh,1rem)]" aria-label="Game statistics">
        <h2 className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 text-xl font-bold text-gold-400">
          Game Summary
          <span className="text-sm font-normal text-slate-200">
            Total questions: {state.results.length} / {state.questions.length}
            {tbDone && ' · The tie-breaker is recorded separately (the main-game record is unchanged)'}
          </span>
        </h2>
        <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {[
            ['Questions answered', stats.answered],
            ['Questions skipped', stats.skipped],
            ['Correct attempts', stats.correctAttempts],
            ['Incorrect attempts', stats.incorrectAttempts],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl bg-navy-900/70 p-1.5">
              <dt className="text-sm text-slate-200">{label}</dt>
              <dd className="font-display text-[clamp(1.5rem,4.2vh,2.25rem)] leading-tight text-gold-300">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {teacher && (
        <section aria-label="Next steps">
          <div className="flex flex-wrap justify-center gap-3">
            {tieBreakAvailable && (
              <button type="button" className="btn btn-primary" onClick={onTiebreak}>
                <Swords aria-hidden className="h-6 w-6" /> Start tie-breaker
              </button>
            )}
            <button type="button" className={`btn ${tieBreakAvailable ? 'btn-secondary' : 'btn-primary'}`} onClick={onPlayAgain}>
              <RotateCcw aria-hidden className="h-6 w-6" /> Play Again
            </button>
            <button type="button" className="btn btn-secondary" onClick={onHome}>
              <Home aria-hidden className="h-6 w-6" /> Return to Home
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
