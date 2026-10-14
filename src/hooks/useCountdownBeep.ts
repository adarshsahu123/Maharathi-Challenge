import { useEffect, useRef } from 'react';
import { beepKind } from '../game/beep';
import { playBeep } from '../game/sound';

/**
 * Beeps once per second while the countdown is at 10 s or below.
 * Only the screen that opts in (the projector display) calls this, so two open screens never double the sound.
 */
export function useCountdownBeep(seconds: number, active: boolean, enabled: boolean) {
  const prev = useRef<number | null>(null);
  useEffect(() => {
    const kind = beepKind(prev.current, seconds, active);
    prev.current = active ? seconds : null;
    if (kind && enabled && document.visibilityState === 'visible') playBeep(kind);
  }, [seconds, active, enabled]);
}
