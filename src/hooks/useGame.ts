import { useEffect, useState, useSyncExternalStore } from 'react';
import { gameStore } from '../game/store';

/** Subscribe to the shared game session. */
export function useGame() {
  const snap = useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot);
  return { ...snap, store: gameStore };
}

/** Re-renders on an interval; the value is only used to derive timestamp-based countdowns. */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    // Catch up immediately when a throttled background tab becomes visible again.
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}

/** Hash router: '#/teacher' → '/teacher'. */
export function useRoute(): string {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
}
