import { useEffect, useState } from 'react';
import { Eye, EyeOff, Flag, MonitorPlay, Pause, Play, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { AnswerReveal } from '../components/AnswerReveal';
import { Brand } from '../components/Brand';
import { ControllerDialogs } from '../components/ControllerDialogs';
import { CountdownTimer } from '../components/CountdownTimer';
import { GameControls } from '../components/GameControls';
import { QuestionCard } from '../components/QuestionCard';
import { TeamScoreboard } from '../components/TeamScoreboard';
import { deriveControls } from '../game/controls';
import { scoreOf } from '../game/engine';
import type { TeamId } from '../game/types';
import { buildQuestionView } from '../game/view';
import { useController } from '../hooks/useController';
import { navigate } from '../hooks/useGame';

const displayUrl = () => `${window.location.origin}${window.location.pathname}#/display`;

/**
 * OPTIONAL second screen for the teacher. The Student Display can run the whole game on its own;
 * this panel adds the correct-answer key and the same controls on a laptop while the class watches the projector.
 */
export function TeacherDashboard() {
  const c = useController();
  const { state, store, storage, canSync, notice, now, message, say, run, setPending } = c;
  const [showKey, setShowKey] = useState(true);
  const [displaySeen, setDisplaySeen] = useState<number | null>(null);

  // Student Display presence check.
  useEffect(() => {
    const read = () => setDisplaySeen(store.displayLastSeen());
    read();
    const id = window.setInterval(read, 2000);
    return () => window.clearInterval(id);
  }, [store]);

  if (!state) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
        <Brand size="sm" />
        <p className="text-2xl font-bold">No game is in progress</p>
        {notice && <p className="text-lg text-amber-300">{notice}</p>}
        <button type="button" className="btn btn-primary" onClick={() => navigate('/setup')}>
          Go to Game Setup
        </button>
      </main>
    );
  }

  const s = state;
  const [nameA, nameB] = s.config.teamNames;
  const view = buildQuestionView(s, 'teacher', showKey);
  const k = deriveControls(s, now);
  const displayConnected = displaySeen !== null && now - displaySeen < 6000;
  const draft = s.config.bankStatus !== 'approved';

  const role = (t: TeamId) => (s.activeTeam === t && (s.phase === 'answering' || s.phase === 'steal') ? (s.phase as 'answering' | 'steal') : null);

  const openDisplay = () => {
    const w = window.open(displayUrl(), 'maharathi-display');
    if (!w) say(`The browser blocked the new window. Open this link in a new tab of the same browser: ${displayUrl()}`);
    else say(null);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 p-3 sm:p-5">
      {/* ───────── top bar ───────── */}
      <header className="panel flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
        <Brand size="sm" />
        <span className="chip border-gold-500/60 bg-navy-900 text-gold-300">
          Class {s.config.classLevel} · {s.mode === 'tiebreak' ? 'TIE-BREAKER' : `Question ${s.index + 1}/${s.questions.length}`}
        </span>
        {draft && <span className="chip border-amber-300 bg-amber-900/40 text-amber-100">Draft questions — teacher to verify</span>}
        {s.mode === 'tiebreak' && <span className="chip border-amber-300 bg-amber-900/40 text-amber-100">Tie-breaker: not approved (draft)</span>}
        {view?.needsReview && s.mode === 'main' && (
          <span className="chip border-amber-300 bg-amber-900/40 text-amber-100">This question was added by the developer — please verify</span>
        )}
        <span
          className={`chip ${displayConnected ? 'border-emerald-300 bg-emerald-900/40 text-emerald-100' : 'border-amber-300 bg-amber-900/40 text-amber-100'}`}
          role="status"
        >
          {displayConnected ? <Wifi aria-hidden className="h-4 w-4" /> : <WifiOff aria-hidden className="h-4 w-4" />}
          Student Display: {displayConnected ? 'connected ✓' : 'not connected'}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary !min-h-[48px] !text-base" onClick={openDisplay}>
            <MonitorPlay aria-hidden className="h-5 w-5" /> Open Student Display
          </button>
          <button type="button" className="btn btn-secondary !min-h-[48px] !text-base" onClick={() => run({ type: s.paused ? 'RESUME' : 'PAUSE' })}>
            {s.paused ? <Play aria-hidden className="h-5 w-5" /> : <Pause aria-hidden className="h-5 w-5" />}
            {s.paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="btn btn-danger !min-h-[48px] !text-base" onClick={() => setPending('end')}>
            <Flag aria-hidden className="h-5 w-5" /> End Game
          </button>
          <button type="button" className="btn btn-danger !min-h-[48px] !text-base" onClick={() => setPending('reset')}>
            <RotateCcw aria-hidden className="h-5 w-5" /> Reset
          </button>
        </div>
      </header>

      {(storage === 'unavailable' || !canSync) && (
        <p role="alert" className="rounded-xl border-4 border-amber-300 bg-amber-900/40 p-3 text-lg font-semibold">
          ⚠ Browser storage/sync is unavailable. The game will keep working, but the Student Display may not update by itself and the game may be lost on refresh.
        </p>
      )}

      {/* live feedback for rejected actions */}
      <div aria-live="assertive" className="min-h-[3.25rem]">
        {message && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl border-4 border-amber-300 bg-amber-900/50 px-4 py-2 text-lg font-bold">
            <span className="break-words">⚠ {message}</span>
            <button type="button" className="underline" onClick={() => say(null)}>
              Dismiss
            </button>
          </p>
        )}
      </div>

      <div className="grid flex-1 items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,1fr)]">
        {/* ───────── left: question ───────── */}
        <div className="space-y-4">
          {view && <QuestionCard view={view} size="teacher" selectable={k.canAnswerNow} onSelect={(index) => run({ type: 'ANSWER', index })} />}
          <AnswerReveal state={s} view={view} now={now} size="teacher" />
          <div className="flex flex-wrap items-center gap-3 text-base text-slate-200">
            <button type="button" className="btn btn-ghost !min-h-[44px] !text-base" onClick={() => setShowKey((v) => !v)} aria-pressed={showKey}>
              {showKey ? <EyeOff aria-hidden className="h-5 w-5" /> : <Eye aria-hidden className="h-5 w-5" />}
              {showKey ? 'Hide correct answer' : 'Show correct answer (only to me)'}
            </button>
            <span>
              Student Display link: <code className="rounded bg-black/40 px-2 py-1 text-gold-300">{displayUrl()}</code>
            </span>
          </div>
        </div>

        {/* ───────── right: scoreboard + controls ───────── */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TeamScoreboard size="teacher" team="A" name={nameA} score={scoreOf(s, 'A')} lifelineUsed={s.lifelines.A.used} role={role('A')} />
            <TeamScoreboard size="teacher" team="B" name={nameB} score={scoreOf(s, 'B')} lifelineUsed={s.lifelines.B.used} role={role('B')} />
          </div>
          <div className="flex justify-center">
            <CountdownTimer remainingMs={k.rem} started={k.started} running={k.running} paused={s.paused} />
          </div>
          <GameControls s={s} now={now} run={run} setPending={setPending} layout="column" />
        </div>
      </div>

      <ControllerDialogs c={c} />
    </div>
  );
}
