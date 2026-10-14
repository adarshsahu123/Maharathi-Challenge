import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, MonitorPlay, Settings2, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { AnswerFeedback } from '../components/AnswerFeedback';
import { AnswerReveal } from '../components/AnswerReveal';
import { Brand } from '../components/Brand';
import { ControllerDialogs } from '../components/ControllerDialogs';
import { CountdownTimer } from '../components/CountdownTimer';
import { GameControls } from '../components/GameControls';
import { QuestionCard } from '../components/QuestionCard';
import { TeamScoreboard } from '../components/TeamScoreboard';
import { deriveControls } from '../game/controls';
import { scoreOf } from '../game/engine';
import { loadSoundEnabled, saveSoundEnabled } from '../game/sound';
import { buildQuestionView } from '../game/view';
import { useAnswerFeedback } from '../hooks/useAnswerFeedback';
import { useController } from '../hooks/useController';
import { useVictoryTune } from '../hooks/useVictoryTune';
import { useCountdownBeep } from '../hooks/useCountdownBeep';
import { navigate } from '../hooks/useGame';
import { ResultsPage } from './ResultsPage';

/**
 * The classroom screen AND a complete control screen: the teacher can run the whole game from here
 * (no second tab needed). It never shows the answer key before the answer is revealed. The control bar
 * can be hidden for a clean projector view. If a Teacher Panel is open too, both stay in sync.
 */
export function StudentDisplay() {
  const c = useController();
  const { state, store, canSync, storage, notice, now, message, say, run, setPending } = c;
  const [controls, setControls] = useState(true);
  const [sound, setSound] = useState(loadSoundEnabled);

  // Beeps at 10 s and below. The clock counts while a team is being chosen too, so the whole question is covered;
  // paused, finished (reveal) and completed states are silent. Computed even when no game exists (hooks must not be conditional).
  const live = state !== null && state.phase !== 'reveal' && state.phase !== 'completed';
  const k = state ? deriveControls(state, now) : null;
  const secondsLeft = k ? Math.max(0, Math.ceil(k.rem / 1000)) : 0;
  useCountdownBeep(secondsLeft, live && k !== null && (k.running || k.timeUp), sound);
  // A right/wrong sound and a big emoji for a moment whenever an answer is judged.
  const feedback = useAnswerFeedback(state, sound);
  // A fanfare when the winner is announced.
  useVictoryTune(state, sound);

  useEffect(() => {
    // Heartbeat so a Teacher Panel can tell this display is connected,
    // plus a safety poll in case a browser drops storage events.
    store.beatDisplay();
    const beat = window.setInterval(store.beatDisplay, 2000);
    const poll = window.setInterval(store.pull, 1000);
    return () => {
      window.clearInterval(beat);
      window.clearInterval(poll);
    };
  }, [store]);

  const soundToggle = (
    <button
      type="button"
      className="btn btn-ghost !min-h-[56px] !px-5 !py-2 !text-lg"
      onClick={() => {
        const next = !sound;
        setSound(next);
        saveSoundEnabled(next);
      }}
      aria-pressed={sound}
    >
      {sound ? <Volume2 aria-hidden className="h-5 w-5" /> : <VolumeX aria-hidden className="h-5 w-5" />}
      {sound ? 'Sound on' : 'Sound off'}
    </button>
  );

  const toggle = (
    <button
      type="button"
      className="btn btn-ghost !min-h-[56px] !px-5 !py-2 !text-lg"
      onClick={() => setControls((v) => !v)}
      aria-expanded={controls}
    >
      {controls ? <ChevronDown aria-hidden className="h-5 w-5" /> : <ChevronUp aria-hidden className="h-5 w-5" />}
      {controls ? 'Hide controls' : 'Show controls'}
    </button>
  );

  if (!state) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
        <Brand />
        <div className="panel max-w-2xl p-6">
          <MonitorPlay aria-hidden className="mx-auto h-12 w-12 text-gold-400" />
          <p className="mt-3 text-3xl font-bold">Waiting for the game to start…</p>
          <p className="mt-2 text-xl text-slate-200">The questions will appear here automatically once a game is started.</p>
          {notice && <p className="mt-3 text-lg text-amber-300">{notice}</p>}
          <button type="button" className="btn btn-primary mt-5" onClick={() => navigate('/setup')}>
            <Settings2 aria-hidden className="h-6 w-6" /> Set up a game
          </button>
          {!canSync && (
            <p role="alert" className="mt-4 flex items-center justify-center gap-2 text-lg font-semibold text-amber-300">
              <WifiOff aria-hidden className="h-5 w-5" /> Syncing between tabs is not available in this browser.
            </p>
          )}
        </div>
      </main>
    );
  }

  if (state.phase === 'completed') {
    return (
      <>
        <ResultsPage showControls={controls} />
        <div className="fixed bottom-4 right-4 z-30 rounded-xl bg-navy-950/90">{toggle}</div>
      </>
    );
  }

  const s = state;
  const ctl = deriveControls(s, now);
  const view = buildQuestionView(s, 'student');
  const role = (t: 'A' | 'B') => (s.activeTeam === t && (s.phase === 'answering' || s.phase === 'steal') ? (s.phase as 'answering' | 'steal') : null);
  const [nameA, nameB] = s.config.teamNames;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-[1900px] flex-1 flex-col gap-[clamp(0.35rem,0.9vh,0.8rem)] p-[clamp(0.35rem,0.9vh,0.8rem)]">
        {(storage === 'unavailable' || !canSync) && (
          <p role="alert" className="flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-900/40 px-4 py-2 text-lg font-semibold">
            <WifiOff aria-hidden className="h-5 w-5" /> Saving/sync is unavailable — the game works on this screen but will be lost on refresh.
          </p>
        )}
        {message && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl border-4 border-amber-300 bg-amber-900/50 px-4 py-2 text-lg font-bold">
            <span className="break-words">⚠ {message}</span>
            <button type="button" className="underline" onClick={() => say(null)}>
              Dismiss
            </button>
          </p>
        )}
        <div className="grid items-stretch gap-[clamp(0.35rem,0.9vh,0.8rem)] lg:grid-cols-[1fr_auto_1fr]">
          <TeamScoreboard size="display" team="A" name={nameA} score={scoreOf(s, 'A')} lifelineUsed={s.lifelines.A.used} role={role('A')} />
          <div className="flex items-center justify-center">
            <CountdownTimer size="xl" remainingMs={ctl.rem} started={ctl.started} running={ctl.running} paused={s.paused} />
          </div>
          <TeamScoreboard size="display" team="B" name={nameB} score={scoreOf(s, 'B')} lifelineUsed={s.lifelines.B.used} role={role('B')} />
        </div>

        {view && <QuestionCard view={view} size="display" selectable={controls && ctl.canAnswerNow} onSelect={(index) => run({ type: 'ANSWER', index })} />}
        <AnswerReveal state={s} view={view} now={now} size="display" />
      </main>

      {controls ? (
        <div className="sticky bottom-0 z-30 bg-gradient-to-t from-navy-950 via-navy-950/90 to-transparent px-3 pb-2 pt-1.5">
          <div className="mx-auto w-full max-w-[1900px] rounded-2xl border-2 border-gold-500/50 bg-navy-900 p-2 shadow-[0_-8px_30px_rgba(0,0,0,0.55)]">
            <GameControls
              s={s}
              now={now}
              run={run}
              setPending={setPending}
              layout="bar"
              trailing={
                <>
                  {soundToggle}
                  {toggle}
                </>
              }
            />
          </div>
        </div>
      ) : (
        <div className="fixed bottom-4 right-4 z-30 rounded-xl bg-navy-950/90">{toggle}</div>
      )}

      {feedback && <AnswerFeedback key={feedback.id} kind={feedback.kind} />}
      <ControllerDialogs c={c} />
    </div>
  );
}
