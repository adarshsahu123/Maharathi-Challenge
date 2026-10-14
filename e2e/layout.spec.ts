import { expect, test, type Page } from '@playwright/test';
import { class9Questions as Q } from '../src/data/questions/class9';
import { NAME_A, NAME_B, optionButton, startGame, startTimer } from './helpers';

const SIZES = [
  { w: 1024, h: 768 },
  { w: 1280, h: 720 },
  { w: 1366, h: 768 },
  { w: 1920, h: 1080 },
];

async function noHorizontalOverflow(page: Page, label: string) {
  const o = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(o.sw, `${label}: horizontal overflow (${o.sw} > ${o.cw})`).toBeLessThanOrEqual(o.cw);
}

/** The projector screen must fit one screen (no scrolling) so the status banner is never cut off. */
async function fitsOneScreen(page: Page, label: string) {
  const o = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ch: window.innerHeight }));
  expect(o.sh, `${label}: display taller than the screen (${o.sh} > ${o.ch})`).toBeLessThanOrEqual(o.ch);
}

for (const { w, h } of SIZES) {
  test(`no horizontal overflow on any screen at ${w}x${h}; screenshots saved`, async ({ context }) => {
    const { teacher, display } = await startGame(context);
    for (const p of [teacher, display]) await p.setViewportSize({ width: w, height: h });
    const shot = (p: Page, name: string) => p.screenshot({ path: `test-results/shots/${w}x${h}-${name}.png`, fullPage: false });

    // welcome + setup
    const other = await context.newPage();
    await other.setViewportSize({ width: w, height: h });
    await other.goto('/#/');
    await noHorizontalOverflow(other, 'welcome');
    await shot(other, '1-welcome');
    await other.goto('/#/setup');
    await noHorizontalOverflow(other, 'setup');
    await shot(other, '2-setup');
    await other.close();

    // question phase
    await noHorizontalOverflow(teacher, 'teacher/question');
    await noHorizontalOverflow(display, 'display/question');
    await shot(teacher, '3-teacher-question');
    await shot(display, '4-display-question');
    await noHorizontalOverflow(display, 'display/question+controls');
    await display.screenshot({ path: `test-results/shots/${w}x${h}-4b-display-with-controls.png` });
    await display.getByRole('button', { name: 'Hide controls' }).click();
    await fitsOneScreen(display, 'display/question');

    // answering with 50:50, then a wrong click → automatic steal
    await startTimer(teacher, 'A');
    await teacher.getByRole('button', { name: /50:50 — / }).click();
    await noHorizontalOverflow(teacher, 'teacher/answering');
    await noHorizontalOverflow(display, 'display/answering');
    await shot(teacher, '5-teacher-answering');
    await shot(display, '6-display-answering');
    await fitsOneScreen(display, 'display/answering');

    // reveal
    await optionButton(teacher, Q[0].correctIndex).click();
    await noHorizontalOverflow(display, 'display/reveal');
    await shot(display, '7-display-reveal');
    await fitsOneScreen(display, 'display/reveal');
    await shot(teacher, '8-teacher-reveal');

    // the longest question text (must wrap without overflowing) — skip ahead to it
    const longest = Q.reduce((best, q, i) => (q.text.length > Q[best].text.length ? i : best), 0);
    await teacher.getByRole('button', { name: /Next question/ }).click(); // Q1 → Q2
    for (let i = 1; i < longest; i++) {
      await teacher.getByRole('button', { name: /Skip question/ }).click();
      await teacher.getByRole('button', { name: 'Yes, skip' }).click();
      await teacher.getByRole('button', { name: /Next question/ }).click();
    }
    await expect(display.getByText(Q[longest].text)).toBeVisible();
    await noHorizontalOverflow(display, 'display/longest question');
    await shot(display, '9-display-longest');
    await fitsOneScreen(display, 'display/longest question');

    // final results
    await teacher.getByRole('button', { name: /End Game/ }).click();
    await teacher.getByRole('button', { name: 'Yes, end the game' }).click();
    await noHorizontalOverflow(display, 'display/results');
    await noHorizontalOverflow(teacher, 'teacher/results');
    await shot(display, 'A-display-results');
    expect(NAME_A + NAME_B).toBeTruthy();
  });
}
