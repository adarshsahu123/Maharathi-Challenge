import { ConfirmDialog } from './ConfirmDialog';
import type { Controller } from '../hooks/useController';

/** The three confirmations for destructive actions (skip, end, reset). */
export function ControllerDialogs({ c }: { c: Controller }) {
  const { pending, setPending, run, confirmReset } = c;
  return (
    <>
      <ConfirmDialog
        open={pending === 'end'}
        danger
        title="End the game?"
        message="The game will finish now and the remaining questions will not be asked. The final result will be shown."
        confirmLabel="Yes, end the game"
        onConfirm={() => {
          setPending(null);
          run({ type: 'END_GAME' });
        }}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === 'reset'}
        danger
        title="Reset the game?"
        message="All scores, lifelines and question progress will be erased. The game restarts from Question 1 with the same teams and class."
        confirmLabel="Yes, reset"
        onConfirm={confirmReset}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === 'skip'}
        title="Skip this question?"
        message="Both teams get 0 points and this question will not come back."
        confirmLabel="Yes, skip"
        onConfirm={() => {
          setPending(null);
          run({ type: 'SKIP' });
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
