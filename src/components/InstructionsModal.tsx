import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const RULES: { title: string; body: string }[] = [
  { title: 'Teams and questions', body: 'Two teams compete. There are 30 questions: 8 Easy (10 points), 14 Intermediate (20 points) and 8 Hard (30 points). The maximum score is 600.' },
  { title: 'Who answers', body: 'The 30-second timer starts by itself as soon as a question appears. The captain who stands up first answers for the team, and the teacher selects that team while the clock is counting.' },
  { title: 'Right and wrong answers', body: 'The teacher clicks the option the team chose and the result shows at once. A correct answer earns the question\'s points. A wrong answer earns 0 points — there is no negative marking.' },
  { title: 'Steal', body: 'If the first team is wrong, the question passes automatically to the other team. They answer using only the time left from the original 30 seconds — the timer does not restart.' },
  { title: '50:50 lifeline', body: 'Each team gets one 50:50 for the whole game. It removes two wrong options while the team is answering. The timer keeps running and no extra time or points are given.' },
  { title: 'Skip', body: 'If no team can answer, the teacher skips the question. Both teams get 0 points.' },
  { title: 'Winner', body: 'After 30 questions the team with more points is the Maharathi. If the scores are level, the teacher can ask one extra Hard tie-breaker question.' },
];

export function InstructionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="how-title" className="panel flex max-h-[92vh] w-full max-w-3xl flex-col">
        <div className="flex items-center justify-between border-b border-gold-500/30 p-5">
          <h2 id="how-title" className="text-3xl font-bold text-gold-400">
            How to Play
          </h2>
          <button ref={closeRef} type="button" className="btn btn-ghost !min-h-[48px] !px-3" onClick={onClose} aria-label="Close instructions">
            <X aria-hidden className="h-6 w-6" />
          </button>
        </div>
        <ol className="space-y-4 overflow-y-auto p-5 text-lg">
          {RULES.map((r, i) => (
            <li key={r.title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400 font-bold text-navy-950">{i + 1}</span>
              <div>
                <h3 className="text-xl font-bold text-gold-300">{r.title}</h3>
                <p className="mt-1 leading-relaxed text-white">{r.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="border-t border-gold-500/30 p-5 text-right">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
