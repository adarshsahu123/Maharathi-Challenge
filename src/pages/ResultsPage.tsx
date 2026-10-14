import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResultsScreen } from '../components/ResultsScreen';
import { findBank } from '../data/banks';
import { navigate, useGame } from '../hooks/useGame';

/**
 * Final result with Play Again / Tie-breaker / Home. `showControls` is false when the Student
 * Display has its control bar hidden (clean projector view).
 */
export function ResultsPage({ showControls }: { showControls: boolean }) {
  const { state, store } = useGame();
  const [confirmHome, setConfirmHome] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state) return null;

  const playAgain = () => {
    const bank = findBank(state.config.bankId);
    if (!bank) return setError('The question bank was not found — start again from Game Setup.');
    setError(store.restart(bank));
  };

  return (
    <>
      {error && (
        <p role="alert" className="mx-auto mt-4 max-w-3xl rounded-xl border-4 border-amber-300 bg-amber-900/50 p-3 text-center text-lg font-bold">
          ⚠ {error}
        </p>
      )}
      <ResultsScreen
        state={state}
        audience={showControls ? 'teacher' : 'student'}
        onPlayAgain={playAgain}
        onHome={() => setConfirmHome(true)}
        onTiebreak={() => setError(store.dispatch({ type: 'START_TIEBREAK' }))}
      />
      <ConfirmDialog
        open={confirmHome}
        title="Return to Home?"
        message="Going home will remove this game and its result."
        confirmLabel="Yes, go Home"
        onConfirm={() => {
          setConfirmHome(false);
          store.clear();
          navigate('/');
        }}
        onCancel={() => setConfirmHome(false)}
      />
    </>
  );
}
