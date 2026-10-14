import { expect, test } from '@playwright/test';
import { class9Questions as Q } from '../src/data/questions/class9';
import { NAME_A, nextQuestion, optionButton, pickTeam, startSingleScreen } from './helpers';

/**
 * Runs the winner celebration in a REAL, visible Chrome with this computer's REAL voices (headless Chrome has none),
 * muted so nothing plays out loud, and checks the order: voice → tune (no gap, no dropouts) → applause.
 * Run with:  npm run test:voice
 */
test.use({ headless: false, launchOptions: { args: ['--mute-audio'] } });

interface Status {
  trace: string[];
  level: number;
}
const status = () => (window as unknown as { __maharathiAudio: { status: () => Status } }).__maharathiAudio.status();
const secondsOf = (trace: string[], event: RegExp) => {
  const line = trace.find((l) => event.test(l));
  return line ? parseFloat(line) : NaN;
};

test('real voice: congratulation first, then the tune straight away and without dropouts, then the applause', async ({ context }) => {
  test.setTimeout(150_000);
  const d = await startSingleScreen(context);
  await pickTeam(d, 'A');
  await optionButton(d, Q[0].correctIndex).click();
  await nextQuestion(d);
  await d.getByRole('button', { name: /End Game/ }).click();
  await d.getByRole('button', { name: 'Yes, end the game' }).click();
  await expect(d.getByTestId('winner-announcement')).toContainText(NAME_A);

  // sample the real output level 5 times a second for 40 s, together with the celebration's own trace
  const samples = await d.evaluate(async (statusFn) => {
    const read = new Function(`return (${statusFn})()`) as () => Status;
    const out: Array<{ t: number; level: number }> = [];
    const start = performance.now();
    for (let i = 0; i < 200; i++) {
      await new Promise((r) => setTimeout(r, 200));
      out.push({ t: (performance.now() - start) / 1000, level: read().level });
    }
    return out;
  }, status.toString());
  const { trace } = await d.evaluate(status);
  console.log('TRACE\n  ' + trace.join('\n  '));

  const voiceStarted = secondsOf(trace, /voice started/);
  const voiceEnded = secondsOf(trace, /voice finished/);
  const musicStarted = secondsOf(trace, /music started/);
  expect(voiceStarted, 'the voice must start').toBeLessThan(5);
  expect(trace.join('\n')).not.toMatch(/never started|ran too long|music failed/);
  expect(musicStarted, 'the tune comes AFTER the voice').toBeGreaterThanOrEqual(voiceEnded);
  expect(musicStarted - voiceEnded, 'no gap between the voice and the tune').toBeLessThan(0.5);

  // silent while the voice speaks; sound in EVERY second of the tune and the applause (no dropouts)
  const during = (from: number, to: number) => samples.filter((s) => s.t >= from && s.t < to).map((s) => s.level);
  expect(Math.max(...during(voiceStarted + 0.5, voiceEnded - 0.5)), 'the music must not talk over the voice').toBeLessThan(0.01);
  for (let second = Math.ceil(musicStarted); second < musicStarted + 25; second++) {
    expect(Math.max(...during(second, second + 1)), `silence (a dropout?) ${(second - musicStarted).toFixed(0)} s into the music`).toBeGreaterThan(0.02);
  }
});
