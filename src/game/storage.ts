import { STATE_SCHEMA } from './constants';
import type { GameState } from './types';
import { validateQuestion } from './validation';

/** Minimal Storage interface so the logic can be unit-tested without a browser. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PHASES = ['question', 'answering', 'steal', 'reveal', 'completed'];
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/** Structural check for state coming from localStorage / another tab (which may be corrupt). */
export function isValidGameState(x: unknown): x is GameState {
  try {
    if (!isObj(x)) return false;
    if (x.schema !== STATE_SCHEMA) return false;
    if (typeof x.sessionId !== 'string' || !isNum(x.rev) || !isNum(x.updatedAt)) return false;
    if (typeof x.phase !== 'string' || !PHASES.includes(x.phase)) return false;
    if (x.mode !== 'main' && x.mode !== 'tiebreak') return false;
    if (typeof x.paused !== 'boolean') return false;
    if (typeof x.answerShown !== 'boolean' || typeof x.endedEarly !== 'boolean') return false;
    if (!isNum(x.index) || !isNum(x.tbIndex)) return false;

    const cfg = x.config;
    if (!isObj(cfg) || !Array.isArray(cfg.teamNames) || cfg.teamNames.length !== 2) return false;
    if (!cfg.teamNames.every((n) => typeof n === 'string' && n.trim())) return false;

    if (!Array.isArray(x.questions) || x.questions.length === 0) return false;
    if (!Array.isArray(x.tiebreakers)) return false;
    for (const q of [...x.questions, ...x.tiebreakers]) if (validateQuestion(q).length) return false;
    if (x.index < 0 || x.index >= x.questions.length) return false;
    if (x.mode === 'tiebreak' && (x.tbIndex < 0 || x.tbIndex >= x.tiebreakers.length)) return false;

    const t = x.timer;
    if (!isObj(t) || !isNum(t.remainingMs) || !(t.runningSince === null || isNum(t.runningSince))) return false;
    if (!Array.isArray(x.hiddenOptions) || !x.hiddenOptions.every(isNum)) return false;
    if (!Array.isArray(x.triedOptions) || !x.triedOptions.every(isNum)) return false;
    if (!Array.isArray(x.attempts) || !Array.isArray(x.results) || !Array.isArray(x.tiebreakResults)) return false;

    const l = x.lifelines;
    if (!isObj(l) || !isObj(l.A) || !isObj(l.B)) return false;
    if (typeof l.A.used !== 'boolean' || typeof l.B.used !== 'boolean') return false;
    return true;
  } catch {
    return false;
  }
}

export interface ParseResult {
  state: GameState | null;
  /** Set when stored data existed but could not be used. */
  corrupt: boolean;
}

export function parseState(raw: string | null): ParseResult {
  if (raw === null || raw === '') return { state: null, corrupt: false };
  try {
    const data: unknown = JSON.parse(raw);
    if (isValidGameState(data)) return { state: data, corrupt: false };
  } catch {
    /* fall through */
  }
  return { state: null, corrupt: true };
}

export function readState(kv: KeyValueStore, key: string): ParseResult {
  try {
    return parseState(kv.getItem(key));
  } catch {
    return { state: null, corrupt: false };
  }
}

export function writeState(kv: KeyValueStore, key: string, state: GameState | null): boolean {
  try {
    if (state === null) kv.removeItem(key);
    else kv.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Should a state received from another tab replace ours? */
export function shouldAdopt(current: GameState | null, incoming: GameState | null): boolean {
  if (incoming === null) return current !== null;
  if (current === null) return true;
  if (incoming.sessionId !== current.sessionId) return incoming.updatedAt >= current.updatedAt;
  return incoming.rev > current.rev;
}
