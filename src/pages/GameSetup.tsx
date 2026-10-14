import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, Play } from 'lucide-react';
import { CLASS_LEVELS, banksForClass } from '../data/banks';
import { ANSWER_SECONDS, MAX_SCORE_PER_TEAM, MAX_TEAM_NAME_LENGTH, POINTS_BY_DIFFICULTY, STANDARD_DISTRIBUTION } from '../game/constants';
import type { BankStatus, ClassLevel } from '../game/types';
import { bankAvailability, validateBank, validateTeamNames } from '../game/validation';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { navigate, useGame } from '../hooks/useGame';

const PREFS_KEY = 'maharathi.setup.v1';

interface Prefs {
  classLevel: ClassLevel;
  a: string;
  b: string;
}

function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return {
        classLevel: CLASS_LEVELS.includes(p.classLevel as ClassLevel) ? (p.classLevel as ClassLevel) : 9,
        a: typeof p.a === 'string' ? p.a.slice(0, MAX_TEAM_NAME_LENGTH) : '',
        b: typeof p.b === 'string' ? p.b.slice(0, MAX_TEAM_NAME_LENGTH) : '',
      };
    }
  } catch {
    /* ignore corrupt prefs */
  }
  return { classLevel: 9, a: '', b: '' };
}

const STATUS_LABEL: Record<BankStatus, string> = {
  approved: 'Approved',
  draft: 'Draft — teacher must verify',
  placeholder: 'Placeholder — no questions yet',
};

export function GameSetup() {
  const { state, store } = useGame();
  const [prefs] = useState(loadPrefs);
  const [classLevel, setClassLevel] = useState<ClassLevel>(prefs.classLevel);
  const [nameA, setNameA] = useState(prefs.a);
  const [nameB, setNameB] = useState(prefs.b);
  const [touched, setTouched] = useState(false);
  const [bankId, setBankId] = useState<string>('');
  const [startError, setStartError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const banks = useMemo(() => banksForClass(classLevel), [classLevel]);
  useEffect(() => {
    setBankId((cur) => (banks.some((b) => b.id === cur) ? cur : (banks[0]?.id ?? '')));
  }, [banks]);

  const bank = banks.find((b) => b.id === bankId) ?? null;
  const availability = bank ? bankAvailability(bank) : 'empty';
  const issues = bank && availability === 'invalid' ? validateBank(bank) : [];
  const nameError = validateTeamNames(nameA, nameB);
  const canStart = availability === 'ready' && !nameError;

  const begin = () => {
    setTouched(true);
    setStartError(null);
    if (!bank || !canStart) return;
    if (state && state.phase !== 'completed') {
      setConfirmReplace(true);
      return;
    }
    launch();
  };

  const launch = () => {
    if (!bank) return;
    const err = store.startGame(bank, [nameA, nameB]);
    if (err) {
      setStartError(err);
      setConfirmReplace(false);
      return;
    }
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ classLevel, a: nameA.trim(), b: nameB.trim() }));
    } catch {
      /* preferences are optional */
    }
    navigate('/display');
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <header className="flex items-center justify-between gap-3">
        <button type="button" className="btn btn-ghost !min-h-[48px]" onClick={() => navigate('/')}>
          <ArrowLeft aria-hidden className="h-5 w-5" /> Home
        </button>
        <h1 className="text-right font-display text-3xl text-gold-400 sm:text-4xl">Game Setup</h1>
      </header>

      <section className="panel p-5" aria-labelledby="class-h">
        <h2 id="class-h" className="mb-3 text-2xl font-bold text-gold-300">
          1. Choose class
        </h2>
        <div role="radiogroup" aria-label="Class" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CLASS_LEVELS.map((lvl) => {
            const ready = banksForClass(lvl).some((b) => bankAvailability(b) === 'ready');
            const selected = lvl === classLevel;
            return (
              <button
                key={lvl}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setClassLevel(lvl)}
                className={`flex min-h-[88px] flex-col items-center justify-center rounded-xl border-4 px-3 py-2 text-2xl font-bold transition-colors ${
                  selected ? 'border-gold-400 bg-gold-400/20' : 'border-white/25 bg-navy-700/70 hover:border-gold-300'
                }`}
              >
                <span>Class {lvl}</span>
                <span className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold ${ready ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {ready ? <CheckCircle2 aria-hidden className="h-4 w-4" /> : <Lock aria-hidden className="h-4 w-4" />}
                  {ready ? 'Questions available' : 'No questions yet'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel p-5" aria-labelledby="teams-h">
        <h2 id="teams-h" className="mb-3 text-2xl font-bold text-gold-300">
          2. Team names
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-lg font-semibold">Team A name</span>
            <input
              className="w-full rounded-xl border-4 border-white/30 bg-navy-900 px-4 py-3 text-2xl text-white placeholder:text-slate-400"
              value={nameA}
              maxLength={MAX_TEAM_NAME_LENGTH}
              onChange={(e) => setNameA(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Arjun"
              aria-invalid={touched && !!nameError}
              aria-describedby="name-error"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-lg font-semibold">Team B name</span>
            <input
              className="w-full rounded-xl border-4 border-white/30 bg-navy-900 px-4 py-3 text-2xl text-white placeholder:text-slate-400"
              value={nameB}
              maxLength={MAX_TEAM_NAME_LENGTH}
              onChange={(e) => setNameB(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Karna"
              aria-invalid={touched && !!nameError}
              aria-describedby="name-error"
            />
          </label>
        </div>
        <p id="name-error" role="alert" className="mt-3 min-h-[1.75rem] text-lg font-semibold text-amber-300">
          {touched && nameError ? `⚠ ${nameError}` : ''}
        </p>
      </section>

      <section className="panel p-5" aria-labelledby="set-h">
        <h2 id="set-h" className="mb-3 text-2xl font-bold text-gold-300">
          3. Question Set
        </h2>
        {banks.length > 1 && (
          <select
            className="mb-3 w-full rounded-xl border-4 border-white/30 bg-navy-900 px-4 py-3 text-xl"
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
            aria-label="Question set"
          >
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        )}
        {bank && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-bold">{bank.title}</span>
              <span className={`chip ${bank.status === 'approved' ? 'border-emerald-300 text-emerald-200' : 'border-amber-300 bg-amber-900/40 text-amber-100'}`}>
                {STATUS_LABEL[bank.status]}
              </span>
            </div>
            <p className="text-lg text-slate-100">{bank.note}</p>

            {availability === 'empty' && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border-4 border-amber-300 bg-amber-900/40 p-4 text-lg font-semibold">
                <AlertTriangle aria-hidden className="mt-0.5 h-7 w-7 shrink-0" />
                No question bank is available for Class {classLevel} yet. Choose another class, or wait until questions are added. (Questions from other classes are never used.)
              </div>
            )}
            {availability === 'invalid' && (
              <div role="alert" className="rounded-xl border-4 border-rose-300 bg-rose-900/40 p-4 text-lg">
                <p className="flex items-center gap-2 font-bold">
                  <AlertTriangle aria-hidden className="h-6 w-6" /> The question bank has a problem — the game cannot start:
                </p>
                <ul className="mt-2 list-inside list-disc">
                  {issues.slice(0, 6).map((i, n) => (
                    <li key={n}>
                      {i.questionId ? `${i.questionId}: ` : ''}
                      {i.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {availability === 'ready' && (
              <dl className="grid gap-3 text-lg sm:grid-cols-2" aria-label="Scoring rules">
                <div className="rounded-xl bg-navy-900/70 p-4">
                  <dt className="font-bold text-gold-300">Questions</dt>
                  <dd>
                    Total {bank.questions.length}: {STANDARD_DISTRIBUTION.Easy} Easy · {STANDARD_DISTRIBUTION.Intermediate} Intermediate · {STANDARD_DISTRIBUTION.Hard} Hard
                  </dd>
                </div>
                <div className="rounded-xl bg-navy-900/70 p-4">
                  <dt className="font-bold text-gold-300">Points</dt>
                  <dd>
                    Easy {POINTS_BY_DIFFICULTY.Easy} · Intermediate {POINTS_BY_DIFFICULTY.Intermediate} · Hard {POINTS_BY_DIFFICULTY.Hard} (maximum {MAX_SCORE_PER_TEAM})
                  </dd>
                </div>
                <div className="rounded-xl bg-navy-900/70 p-4">
                  <dt className="font-bold text-gold-300">Timer and steal</dt>
                  <dd>{ANSWER_SECONDS} seconds per question, starting as soon as it appears · wrong answer = 0 points (no negative marking) · a wrong answer passes to the other team automatically, using only the remaining time</dd>
                </div>
                <div className="rounded-xl bg-navy-900/70 p-4">
                  <dt className="font-bold text-gold-300">Lifeline</dt>
                  <dd>One 50:50 per team for the whole game</dd>
                </div>
              </dl>
            )}
          </div>
        )}
      </section>

      {startError && (
        <p role="alert" className="rounded-xl border-4 border-rose-300 bg-rose-900/40 p-4 text-lg font-semibold">
          {startError}
        </p>
      )}

      <div className="flex justify-end">
        <button type="button" className="btn btn-primary !min-h-[72px] !px-10 !text-2xl" onClick={begin} disabled={availability !== 'ready'}>
          <Play aria-hidden className="h-8 w-8" /> Start Game
        </button>
      </div>

      <ConfirmDialog
        open={confirmReplace}
        danger
        title="Start a new game?"
        message="A game is already in progress. Starting a new game will erase it and its scores."
        confirmLabel="Yes, start a new game"
        onConfirm={launch}
        onCancel={() => setConfirmReplace(false)}
      />
    </main>
  );
}
