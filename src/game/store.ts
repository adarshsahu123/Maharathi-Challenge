import { CHANNEL_NAME, DISPLAY_PING_KEY, STORAGE_KEY } from './constants';
import { createGame, reduce, remainingMs, isTimerActivePhase } from './engine';
import { readState, shouldAdopt, writeState, type KeyValueStore } from './storage';
import type { GameAction, GameState, QuestionBank } from './types';

export interface StoreSnapshot {
  state: GameState | null;
  /** 'ok' = localStorage works; 'unavailable' = running from memory + BroadcastChannel only. */
  storage: 'ok' | 'unavailable';
  /** True when at least one cross-tab mechanism (BroadcastChannel / storage events) exists. */
  canSync: boolean;
  /** One-off message for the teacher (e.g. "saved game was corrupt and was cleared"). */
  notice: string | null;
}

function getLocalStorage(): KeyValueStore | null {
  try {
    const ls = window.localStorage;
    const probe = '__maharathi_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

/**
 * One shared game session per browser. The Teacher tab is the only writer of game actions
 * (timer, scoring, lifelines); the Student Display tab only reads. Both read the same
 * localStorage entry and are nudged through BroadcastChannel / storage events.
 */
class GameStore {
  private kv: KeyValueStore | null;
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<() => void>();
  private snap: StoreSnapshot;

  constructor() {
    this.kv = typeof window === 'undefined' ? null : getLocalStorage();
    let state: GameState | null = null;
    let notice: string | null = null;
    if (this.kv) {
      const parsed = readState(this.kv, STORAGE_KEY);
      state = parsed.state;
      if (parsed.corrupt) {
        writeState(this.kv, STORAGE_KEY, null);
        notice = 'The saved game data was damaged and has been cleared. Please start a new game.';
      }
    }
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (e: MessageEvent) => this.onRemote(e.data);
      }
    } catch {
      this.channel = null;
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === null || (e.key === STORAGE_KEY && e.newValue === null)) this.adopt(null);
        else if (e.key === STORAGE_KEY) this.pull();
      });
    }
    this.snap = {
      state,
      storage: this.kv ? 'ok' : 'unavailable',
      canSync: this.channel !== null || this.kv !== null,
      notice: this.kv ? notice : 'Browser storage is unavailable — the game may be lost if the page is refreshed.',
    };
  }

  // ---- subscription (useSyncExternalStore) ----
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = (): StoreSnapshot => this.snap;

  private set(patch: Partial<StoreSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }

  // ---- persistence & sync ----
  private persist(state: GameState | null) {
    let storage: StoreSnapshot['storage'] = this.snap.storage;
    if (this.kv) {
      const saved = writeState(this.kv, STORAGE_KEY, state);
      storage = saved ? 'ok' : 'unavailable';
    }
    try {
      this.channel?.postMessage({ type: 'state', state });
    } catch {
      /* channel closed — storage events still work */
    }
    if (storage !== this.snap.storage) this.set({ storage });
  }

  private adopt(incoming: GameState | null) {
    if (!shouldAdopt(this.snap.state, incoming)) return;
    this.set({ state: incoming });
  }

  private onRemote(data: unknown) {
    if (!data || typeof data !== 'object' || (data as { type?: string }).type !== 'state') return;
    const raw = (data as { state: unknown }).state;
    if (raw === null) return this.adopt(null);
    // Validate through the same parser used for localStorage.
    const parsed = readState({ getItem: () => JSON.stringify(raw), setItem() {}, removeItem() {} }, 'x');
    if (parsed.state) this.adopt(parsed.state);
  }

  /** Re-read localStorage (used by storage events and a 1 s safety poll in the display). */
  pull = () => {
    if (!this.kv) return;
    const parsed = readState(this.kv, STORAGE_KEY);
    // Only adopt real states here. An empty/corrupt entry must never wipe the live in-memory game
    // (e.g. after a failed save); an explicit clear arrives via the storage event or channel.
    if (parsed.state) this.adopt(parsed.state);
  };

  clearNotice = () => {
    if (this.snap.notice) this.set({ notice: null });
  };

  // ---- teacher operations ----
  /** Apply one action. Returns an error message, or null on success. */
  dispatch = (action: GameAction): string | null => {
    this.pull(); // never act on a stale copy
    const current = this.snap.state;
    if (!current) return 'No game is in progress.';
    const result = reduce(current, action, Date.now());
    if (result.error) return result.error;
    if (result.state !== current) {
      this.set({ state: result.state });
      this.persist(result.state);
    }
    return null;
  };

  startGame = (bank: QuestionBank, teamNames: [string, string]): string | null => {
    const created = createGame(bank, teamNames, Date.now());
    if (created.error !== undefined) return created.error;
    this.set({ state: created.state, notice: null });
    this.persist(created.state);
    return null;
  };

  /** Fresh game with the same class, bank and team names (Play Again / Reset). */
  restart = (bank: QuestionBank): string | null => {
    const cur = this.snap.state;
    if (!cur) return 'No game is in progress.';
    return this.startGame(bank, cur.config.teamNames);
  };

  clear = () => {
    this.set({ state: null });
    this.persist(null);
  };

  /** Called by the teacher tab on a short interval: stops the clock exactly once at zero. */
  tick = () => {
    const s = this.snap.state;
    if (!s || s.paused || !(s.phase === 'question' || isTimerActivePhase(s))) return;
    if (s.timer.runningSince !== null && remainingMs(s.timer, Date.now()) <= 0) this.dispatch({ type: 'EXPIRE' });
  };

  // ---- display presence ----
  beatDisplay = () => {
    try {
      this.kv?.setItem(DISPLAY_PING_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  displayLastSeen = (): number | null => {
    try {
      const v = this.kv?.getItem(DISPLAY_PING_KEY);
      const n = v ? Number(v) : NaN;
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  };
}

export const gameStore = new GameStore();
