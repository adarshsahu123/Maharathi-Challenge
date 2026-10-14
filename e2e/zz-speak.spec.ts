import { test } from '@playwright/test';

test.use({ headless: false, launchOptions: { args: ['--mute-audio'] } });

test('how long does the real voice talk, and does speechSynthesis.speaking turn off?', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const synth = speechSynthesis;
    const voices = synth.getVoices();
    const out: string[] = [`voices: ${voices.map((v) => v.name).join(', ')}`];
    const t0 = performance.now();
    const t = () => ((performance.now() - t0) / 1000).toFixed(2);
    const u = new SpeechSynthesisUtterance('Congratulations, Arjun! What a brilliant game. You are our Maharathi!');
    const david = voices.find((v) => /David/.test(v.name));
    if (david) u.voice = david;
    u.onstart = () => out.push(`${t()} onstart`);
    u.onend = () => out.push(`${t()} onend`);
    u.onerror = (e) => out.push(`${t()} onerror ${(e as SpeechSynthesisErrorEvent).error}`);
    (window as unknown as { keep: unknown }).keep = u;
    synth.speak(u);
    let last = '';
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const now = `speaking=${synth.speaking} pending=${synth.pending}`;
      if (now !== last) out.push(`${t()} ${now}`);
      last = now;
    }
    return out;
  });
  console.log(r.join('\n'));
});
