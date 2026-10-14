import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Eye, Flag, Hand, MousePointerClick, Pause, Play, RotateCcw, SkipForward, Timer as TimerIcon } from 'lucide-react';
import { deriveControls } from '../game/controls';
import type { GameAction, GameState, TeamId } from '../game/types';
import type { Pending } from '../hooks/useController';
import { LifelineButton } from './LifelineButton';

interface Props {
  s: GameState;
  now: number;
  run: (action: GameAction) => void;
  setPending: (p: Pending) => void;
  /** 'column' = Teacher Panel side column; 'bar' = large touch-friendly bar under the Student Display. */
  layout: 'column' | 'bar';
  /** Extra control rendered at the end of the bar (the Student Display puts "Hide controls" here). */
  trailing?: ReactNode;
}

/**
 * Every game control (choose team, start timer, 50:50, skip, reveal, next …).
 * Answers are NOT given here: the options on the question card are the answer buttons and a
 * click is judged automatically.
 */
export function GameControls({ s, now, run, setPending, layout, trailing }: Props) {
  const c = deriveControls(s, now);
  const bar = layout === 'bar';
  const nameOf = (t: TeamId | null) => (t === 'A' ? s.config.teamNames[0] : t === 'B' ? s.config.teamNames[1] : '—');
  // Bar sizes: the action you need most is HUGE, everything else is still comfortably large,
  // and the destructive buttons are kept apart from the rest so they are hard to hit by accident.
  const primary = '!min-h-[64px] !text-2xl !px-8 !py-2';
  const secondary = '!min-h-[56px] !text-lg !px-5 !py-2';
  const big = bar ? secondary : '';
  const huge = bar ? `flex-1 ${primary}` : 'w-full !min-h-[68px] !text-2xl';

  const teamButtons = (
    <div className={bar ? 'flex w-full flex-wrap items-stretch gap-3' : 'grid grid-cols-2 gap-3'}>
      {bar && (
        <span className="flex items-center gap-2 text-xl font-bold text-gold-300">
          <Hand aria-hidden className="h-6 w-6" /> Captain stood first:
        </span>
      )}
      {(['A', 'B'] as TeamId[]).map((t) => (
        <button
          key={t}
          type="button"
          className={`btn ${bar ? `min-w-[12rem] flex-1 ${primary}` : ''} ${s.selectedTeam === t ? 'btn-primary' : 'btn-secondary'}`}
          aria-pressed={s.selectedTeam === t}
          disabled={s.paused}
          onClick={() => run({ type: 'SELECT_TEAM', team: t })}
        >
          {s.selectedTeam === t && <CheckCircle2 aria-hidden className="h-6 w-6" />}
          <span className="max-w-[14rem] truncate">{nameOf(t)}</span>
        </button>
      ))}
    </div>
  );

  const timeUpButton = c.timeUp && (
    <button type="button" className={`btn btn-primary ${bar ? `flex-1 ${primary}` : 'w-full !min-h-[64px] !text-xl'}`} onClick={() => run({ type: 'END_ATTEMPT' })}>
      <TimerIcon aria-hidden className="h-6 w-6" /> Time&apos;s up — end question
    </button>
  );

  const lifeline = s.phase !== 'reveal' && (
    <LifelineButton
      teamName={nameOf(c.lifelineTeam)}
      used={c.lifelineUsed}
      enabled={c.lifelineEnabled}
      reason={c.lifelineReason}
      onUse={() => run({ type: 'USE_LIFELINE' })}
      compact={bar}
    />
  );

  const revealButtons = s.phase === 'reveal' && (
    <>
      <button
        type="button"
        className={`btn ${s.answerShown ? 'btn-secondary' : 'btn-primary'} ${bar ? (s.answerShown ? secondary : `flex-1 ${primary}`) : 'w-full'}`}
        disabled={s.answerShown}
        onClick={() => run({ type: 'REVEAL_ANSWER' })}
      >
        <Eye aria-hidden className="h-6 w-6" /> {s.answerShown ? 'Correct answer is shown' : 'Show correct answer'}
      </button>
      <button type="button" className={`btn btn-success ${huge}`} onClick={() => run({ type: 'NEXT' })}>
        {s.mode === 'tiebreak' || c.lastQuestion ? 'View final result' : 'Next question'} <ArrowRight aria-hidden className="h-6 w-6" />
      </button>
    </>
  );

  const skipButton = (s.phase === 'question' || s.phase === 'answering' || s.phase === 'steal') && (
    <button type="button" className={`btn btn-ghost ${bar ? big : 'w-full'}`} disabled={s.paused} onClick={() => setPending('skip')}>
      <SkipForward aria-hidden className="h-6 w-6" /> Skip question{bar ? '' : ' (no team can answer)'}
    </button>
  );

  const pauseButton = (
    <button type="button" className={`btn btn-secondary ${big}`} onClick={() => run({ type: s.paused ? 'RESUME' : 'PAUSE' })}>
      {s.paused ? <Play aria-hidden className="h-5 w-5" /> : <Pause aria-hidden className="h-5 w-5" />}
      {s.paused ? 'Resume' : 'Pause'}
    </button>
  );

  const answerPrompt = c.live && (
    <p className={`flex items-center gap-3 rounded-xl border-2 border-gold-400/60 bg-gold-400/10 px-4 font-semibold ${bar ? 'min-h-[64px] flex-1 text-xl' : 'py-2 text-lg'}`}>
      <MousePointerClick aria-hidden className="h-6 w-6 shrink-0 text-gold-400" />
      {bar ? `${s.phase === 'steal' ? 'STEAL' : 'Answering'}: ${nameOf(s.activeTeam)} — click an option above` : 'Click an option on the left to judge the answer.'}
    </p>
  );

  const showTeamPick = (s.phase === 'question' || s.phase === 'answering') && s.attempts.length === 0;

  if (bar) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Game controls" role="group">
        {/* The one thing to do right now — the largest buttons (omitted when there is nothing to press) */}
        {(showTeamPick || c.timeUp || s.phase === 'reveal') && (
          <div className="flex min-w-[min(100%,26rem)] flex-1 flex-wrap items-stretch gap-3">
            {showTeamPick && teamButtons}
            {timeUpButton}
            {revealButtons}
          </div>
        )}
        {/* Helpers, then the destructive buttons kept well apart on the right. On a wide screen this shares ONE row with the main action. */}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {lifeline}
          {skipButton}
          {pauseButton}
          <span className="flex flex-wrap items-center gap-3 border-l-2 border-white/20 pl-5">
            <button type="button" className={`btn btn-danger ${secondary}`} onClick={() => setPending('end')}>
              <Flag aria-hidden className="h-5 w-5" /> End Game
            </button>
            <button type="button" className={`btn btn-danger ${secondary}`} onClick={() => setPending('reset')}>
              <RotateCcw aria-hidden className="h-5 w-5" /> Reset
            </button>
            {trailing}
          </span>
        </div>
      </div>
    );
  }

  return (
    <section className="panel space-y-4 p-4" aria-label="Game controls">
      <p className="flex items-start gap-2 rounded-xl bg-navy-900/80 p-3 text-lg font-semibold text-gold-200" role="note">
        <ArrowRight aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold-400" />
        <span>{c.hint}</span>
      </p>
      {(s.phase === 'question' || (s.phase === 'answering' && s.attempts.length === 0)) && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gold-300">
            <Hand aria-hidden className="h-6 w-6" /> Which captain stood up first?
          </h3>
          {teamButtons}
          <p className="text-sm text-slate-200">The clock is already running — just pick the team. You can change the pick until the first answer is judged.</p>
        </div>
      )}
      {(c.live || c.timeUp) && (
        <div className="space-y-3">
          {answerPrompt}
          {timeUpButton}
        </div>
      )}
      {lifeline}
      {s.phase === 'reveal' && <div className="space-y-3">{revealButtons}</div>}
      {skipButton}
    </section>
  );
}
