import { expect, test } from '@playwright/test';

/**
 * These tests cannot "listen", so they render the celebration music offline in the real browser and MEASURE it:
 * is it audible, undistorted, shaped as designed, and is the applause loud enough to hear?
 */
interface Measure {
  peak: number;
  rms: number[]; // loudness of every half second
  window: number;
  work: number; // seconds of computer work per second of sound, at 22 kHz
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

test('the celebration music is audible, not distorted, and shaped as designed', async ({ page }) => {
  await page.goto('/');
  const m: Measure = await page.evaluate(async () => {
    const audio = (window as unknown as { __maharathiAudio: { measureCelebration: () => Promise<Measure> } }).__maharathiAudio;
    return audio.measureCelebration();
  });
  const between = (from: number, to: number) => m.rms.slice(Math.round(from / m.window), Math.round(to / m.window));

  expect(m.rms.every((x) => Number.isFinite(x)), 'no NaN / infinite samples').toBe(true);
  // Light enough to play live without dropouts: live audio (48 kHz) needs ~2x this work, and it must stay well below 1x.
  expect(m.work, 'too heavy to play live without dropouts').toBeLessThan(0.1);
  expect(m.peak, 'loud enough to hear').toBeGreaterThan(0.3);
  expect(m.peak, 'no clipping / distortion').toBeLessThan(0.98);

  // The music starts at 0 s here (in the game it starts the instant the voice finishes — there is no silent gap built in).
  expect(mean(between(0.1, 3.5)), 'fanfare is audible straight away').toBeGreaterThan(0.08);
  const song1 = between(4.5, 10.0);
  const song2 = between(11.0, 16.5);
  expect(Math.min(...song1), 'song, first time').toBeGreaterThan(0.08);
  expect(Math.min(...song2), 'song, second time').toBeGreaterThan(0.08);
  expect(mean(song2), 'the second round is bigger').toBeGreaterThan(mean(song1) * 0.95);

  // the huge final chord
  expect(mean(between(17.0, 18.5)), 'final chord').toBeGreaterThan(0.15);

  // the applause comes AFTER the music, is audible from the start, swells and then fades away
  const start = mean(between(19.6, 20.6));
  const swell = mean(between(22.5, 25.5));
  const fade = mean(between(26.5, 27.5));
  expect(start, 'applause is audible from the start').toBeGreaterThan(0.02);
  expect(swell, 'applause swells to a full roar').toBeGreaterThan(0.08);
  expect(swell, 'applause swells').toBeGreaterThan(start * 1.5);
  expect(fade, 'applause fades').toBeLessThan(swell * 0.6);

  // and then it is over
  expect(Math.max(...between(28.2, 29.0)), 'silence at the end').toBeLessThan(0.005);
});
