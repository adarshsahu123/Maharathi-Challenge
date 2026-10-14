import { useState } from 'react';
import { BookOpen, MonitorPlay, Play } from 'lucide-react';
import { Brand } from '../components/Brand';
import { InstructionsModal } from '../components/InstructionsModal';
import { navigate, useGame } from '../hooks/useGame';

export function HomePage() {
  const { state, notice, store } = useGame();
  const [help, setHelp] = useState(false);
  const active = state && state.phase !== 'completed';

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 p-6">
      <Brand />

      {notice && (
        <div role="status" className="panel w-full border-amber-300 p-4 text-center text-lg">
          {notice}{' '}
          <button type="button" className="underline" onClick={store.clearNotice}>
            Dismiss
          </button>
        </div>
      )}

      {active && (
        <div className="panel w-full border-gold-400 p-5 text-center">
          <p className="text-xl font-bold">A game is in progress</p>
          <p className="mt-1 text-lg text-slate-200">
            {state.config.teamNames[0]} vs {state.config.teamNames[1]} · Question {state.index + 1}/{state.questions.length}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn btn-success" onClick={() => navigate('/display')}>
              <Play aria-hidden className="h-6 w-6" /> Resume game
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/teacher')}>
              Open Teacher Panel
            </button>
          </div>
        </div>
      )}

      <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row">
        <button type="button" className="btn btn-primary !min-h-[72px] !px-10 !text-2xl" onClick={() => navigate('/setup')}>
          <Play aria-hidden className="h-8 w-8" /> Start Game
        </button>
        <button type="button" className="btn btn-secondary !min-h-[72px] !px-10 !text-2xl" onClick={() => setHelp(true)}>
          <BookOpen aria-hidden className="h-8 w-8" /> How to Play
        </button>
      </div>

      <p className="flex items-center gap-2 text-center text-base text-slate-300">
        <MonitorPlay aria-hidden className="h-5 w-5 shrink-0" />
        The whole game can be played from one screen — answer options and controls appear on the game screen itself. A separate Teacher Panel is optional.
      </p>

      <InstructionsModal open={help} onClose={() => setHelp(false)} />
    </main>
  );
}
