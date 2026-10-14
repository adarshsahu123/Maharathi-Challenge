import { expect, test, type Page } from '@playwright/test';
import { class9Questions as Q } from '../src/data/questions/class9';
import { L, NAME_A, optionButton, pickTeam, startSingleScreen, wrongIndex } from './helpers';

/**
 * Usable page area of Chrome at 100% zoom (window minus tab bar, address bar and the Windows taskbar):
 *  - 1920x1080 monitor      → about 1905 x 915
 *  - 1536x864 laptop (125%) → about 1536 x 730
 *  - 1366x768 laptop        → about 1366 x 630
 */
const VIEWPORTS = [
  { name: '1920x1080 monitor', width: 1905, height: 915 },
  { name: '1536x864 laptop', width: 1536, height: 730 },
  { name: '1366x768 laptop', width: 1366, height: 630 },
];

async function expectNoScroll(page: Page, label: string) {
  const m = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(m.scrollHeight, `${label}: the page needs vertical scrolling (${m.scrollHeight} > ${m.innerHeight})`).toBeLessThanOrEqual(m.innerHeight + 1);
  expect(m.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(m.innerWidth);
}

/** The control bar must be fully on screen too (it floats at the bottom). */
async function expectBarVisible(page: Page, label: string) {
  const bar = await page.getByRole('group', { name: 'Game controls' }).boundingBox();
  const h = page.viewportSize()!.height;
  expect(bar, `${label}: control bar missing`).not.toBeNull();
  expect(bar!.y, `${label}: bar starts above the screen`).toBeGreaterThanOrEqual(0);
  expect(bar!.y + bar!.height, `${label}: bar is cut off at the bottom`).toBeLessThanOrEqual(h);
}

const longestExplanation = Q.reduce((best, q, i) => (q.explanation.length > Q[best].explanation.length ? i : best), 0);
const longestQuestion = Q.reduce((best, q, i) => (q.text.length > Q[best].text.length ? i : best), 0);

/** Skips question after question, starting from question number `from` (0-based), until `index` is on screen. */
async function skipTo(d: Page, from: number, index: number) {
  for (let i = from; i < index; i++) {
    await d.getByRole('button', { name: /Skip question/ }).click();
    await d.getByRole('button', { name: 'Yes, skip' }).click();
    await d.getByRole('button', { name: /Next question/ }).click();
  }
  await expect(d.getByText(Q[index].text)).toBeVisible();
}

for (const vp of VIEWPORTS) {
  test(`${vp.name}: the answer and its reason are visible WITHOUT scrolling (controls shown)`, async ({ context }) => {
    test.setTimeout(120_000);
    const d = await startSingleScreen(context);
    await d.setViewportSize({ width: vp.width, height: vp.height });
    const shot = (name: string) => d.screenshot({ path: `test-results/fit/${vp.width}x${vp.height}-${name}.png` });

    // 1. a question just appeared, clock running
    await expectNoScroll(d, 'question');
    await expectBarVisible(d, 'question');
    await shot('1-question');

    // 2. answering with 50:50 applied
    await pickTeam(d, 'A');
    await d.getByRole('button', { name: /50:50 — / }).click();
    await expectNoScroll(d, 'answering + 50:50');
    await shot('2-answering');

    // 3. correct answer on the FIRST question: answer + reason shown
    await optionButton(d, Q[0].correctIndex).click();
    await expect(d.getByText(`Correct answer: Option ${L[Q[0].correctIndex]}`)).toBeVisible();
    await expect(d.getByText(Q[0].explanation)).toBeInViewport({ ratio: 1 });
    await expectNoScroll(d, 'reveal Q1');
    await expectBarVisible(d, 'reveal Q1');
    await shot('3-reveal');

    // 4. both teams wrong → both incorrect options + the answer panel
    await d.getByRole('button', { name: /Next question/ }).click();
    await pickTeam(d, 'B');
    await optionButton(d, wrongIndex(1)).click();
    const other = [0, 1, 2, 3].find((i) => i !== Q[1].correctIndex && i !== wrongIndex(1))!;
    await optionButton(d, other).click();
    await expect(d.getByText('Both teams answered incorrectly — 0 points')).toBeVisible();
    await expect(d.getByText(Q[1].explanation)).toBeInViewport({ ratio: 1 });
    await expectNoScroll(d, 'reveal after two wrong answers');
    await expectBarVisible(d, 'reveal after two wrong answers');
    await shot('4-both-wrong');

    // 5. the question with the LONGEST explanation
    await d.getByRole('button', { name: /Next question/ }).click();
    await skipTo(d, 2, longestExplanation);
    await pickTeam(d, 'A');
    await optionButton(d, Q[longestExplanation].correctIndex).click();
    await expect(d.getByText(Q[longestExplanation].explanation)).toBeInViewport({ ratio: 1 });
    await expectNoScroll(d, 'reveal with the longest explanation');
    await expectBarVisible(d, 'reveal with the longest explanation');
    await shot('5-longest-explanation');
    expect(NAME_A).toBeTruthy();
  });

  test(`${vp.name}: the longest question text also fits without scrolling`, async ({ context }) => {
    test.setTimeout(120_000);
    const d = await startSingleScreen(context);
    await d.setViewportSize({ width: vp.width, height: vp.height });
    await skipTo(d, 0, longestQuestion);
    await expectNoScroll(d, 'longest question');
    await expectBarVisible(d, 'longest question');
    await pickTeam(d, 'A');
    await optionButton(d, Q[longestQuestion].correctIndex).click();
    await expect(d.getByText(Q[longestQuestion].explanation)).toBeInViewport({ ratio: 1 });
    await expectNoScroll(d, 'longest question, revealed');
    await d.screenshot({ path: `test-results/fit/${vp.width}x${vp.height}-6-longest-question.png` });
  });
}

for (const vp of VIEWPORTS) {
  test(`${vp.name}: the winner screen fits without scrolling and Play Again is reachable`, async ({ context }) => {
    const d = await startSingleScreen(context);
    await d.setViewportSize({ width: vp.width, height: vp.height });
    await pickTeam(d, 'A');
    await optionButton(d, Q[0].correctIndex).click();
    await d.getByRole('button', { name: /Next question/ }).click();
    await d.getByRole('button', { name: /End Game/ }).click();
    await d.getByRole('button', { name: 'Yes, end the game' }).click();
    await expect(d.getByTestId('winner-announcement')).toContainText(NAME_A);
    await expect(d.getByTestId('final-score-A')).toHaveText('10');
    await expectNoScroll(d, 'winner screen');
    await expect(d.getByRole('button', { name: 'Play Again' })).toBeInViewport({ ratio: 1 });
    await expect(d.getByRole('button', { name: 'Return to Home' })).toBeInViewport({ ratio: 1 });
    // the headline stays on one line (no awkward wrap)
    const h = await d.getByTestId('winner-announcement').boundingBox();
    const sizePx = await d.getByTestId('winner-announcement').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(h!.height, 'headline wrapped onto two lines').toBeLessThanOrEqual(sizePx * 1.5);
    await d.screenshot({ path: `test-results/fit/${vp.width}x${vp.height}-7-winner.png` });
  });

  test(`${vp.name}: the tie screen with the tie-breaker button fits without scrolling`, async ({ context }) => {
    const d = await startSingleScreen(context);
    await d.setViewportSize({ width: vp.width, height: vp.height });
    await d.getByRole('button', { name: /Skip question/ }).click();
    await d.getByRole('button', { name: 'Yes, skip' }).click();
    // finish the game by skipping everything (all 0-0 → a tie, tie-breaker offered)
    for (let i = 1; i < Q.length; i++) {
      await d.getByRole('button', { name: /Next question/ }).click();
      await d.getByRole('button', { name: /Skip question/ }).click();
      await d.getByRole('button', { name: 'Yes, skip' }).click();
    }
    await d.getByRole('button', { name: /View final result/ }).click();
    await expect(d.getByTestId('winner-announcement')).toContainText('TIE');
    await expect(d.getByRole('button', { name: /Start tie-breaker/ })).toBeVisible();
    await expectNoScroll(d, 'tie screen');
    await expect(d.getByRole('button', { name: 'Play Again' })).toBeInViewport({ ratio: 1 });
  });
}
