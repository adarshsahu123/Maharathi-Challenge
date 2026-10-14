import { describe, expect, it } from 'vitest';
import { URGENT_SECONDS, WARNING_SECONDS, beepKind } from '../src/game/beep';

describe('countdown beep rules', () => {
  it('warns at 10 seconds and below', () => {
    expect(WARNING_SECONDS).toBe(10);
    expect(URGENT_SECONDS).toBe(3);
  });

  it('is silent above 10 seconds', () => {
    for (let s = 29; s >= 11; s--) expect(beepKind(s + 1, s, true), `at ${s}s`).toBeNull();
  });

  it('beeps once for every second from 10 down to 1, with a higher pitch for the last 3', () => {
    const kinds: Array<string | null> = [];
    for (let s = 10; s >= 1; s--) kinds.push(beepKind(s + 1, s, true));
    expect(kinds).toEqual(['tick', 'tick', 'tick', 'tick', 'tick', 'tick', 'tick', 'urgent', 'urgent', 'urgent']);
  });

  it('plays a final tone at zero', () => {
    expect(beepKind(1, 0, true)).toBe('final');
  });

  it('never beeps while the clock is inactive (paused, finished) or just became active', () => {
    expect(beepKind(8, 7, false)).toBeNull(); // paused / not running
    expect(beepKind(null, 7, true)).toBeNull(); // first render, a refresh, or just resumed
    expect(beepKind(null, 0, true)).toBeNull();
  });

  it('does not repeat for the same second and does not beep when time goes up (new question)', () => {
    expect(beepKind(7, 7, true)).toBeNull();
    expect(beepKind(0, 30, true)).toBeNull();
  });
});
