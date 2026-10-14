import { expect, test } from '@playwright/test';
import { class9Questions as Q } from '../src/data/questions/class9';
import {
  L,
  NAME_A,
  NAME_B,
  answerCorrect,
  chromeText,
  nextQuestion,
  optionButton,
  pickTeam,
  scoreOf,
  startGame,
  startSingleScreen,
  timerSeconds,
  wrongIndex,
} from './helpers';

const DEVANAGARI = /[ऀ-ॿ]/;
const TOTAL = Q.length; // 30

test.describe('welcome & setup', () => {
  test('welcome page shows title, tagline and instructions modal', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'WHO IS OUR MAHARATHI?' })).toBeVisible();
    await expect(page.getByText('Think Fast. Answer Smart. Become a Maharathi!')).toBeVisible();
    await page.getByRole('button', { name: 'How to Play' }).click();
    await expect(page.getByRole('dialog', { name: /How to Play/ })).toBeVisible();
    await expect(page.getByText('50:50 lifeline')).toBeVisible();
    await expect(page.getByText(/30 questions: 8 Easy/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('classes without a question bank show a clear message and cannot start', async ({ page }) => {
    await page.goto('/#/setup');
    await page.getByRole('radio', { name: /Class 11/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No question bank is available for Class 11' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeDisabled();
    await page.getByRole('radio', { name: /Class 9/ }).click();
    await expect(page.getByText('Total 30: 8 Easy · 14 Intermediate · 8 Hard')).toBeVisible();
    await expect(page.getByText('30 seconds per question, starting as soon as it appears')).toBeVisible();
    await expect(page.getByText('Draft — teacher must verify')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeEnabled();
  });

  test('empty and duplicate team names are rejected with a message', async ({ page }) => {
    await page.goto('/#/setup');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText(/Both team names are required/)).toBeVisible();
    await expect(page).not.toHaveURL(/display|teacher/);
    await page.getByLabel('Team A name').fill('Tigers');
    await page.getByLabel('Team B name').fill(' tigers');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText(/must be different/)).toBeVisible();
    await expect(page).not.toHaveURL(/display|teacher/);
  });
});

test.describe('single screen: the whole game is run from the Student Display (no teacher tab)', () => {
  test('the 30 s clock starts by itself; pick the team while it counts; click an option: judged at once, scored once', async ({ context }) => {
    const d = await startSingleScreen(context);
    await expect(d.getByText(`Question 1 / ${TOTAL}`)).toBeVisible();
    // no team chosen and no button pressed — yet the clock is already counting down from 30
    await expect(d.getByRole('timer')).toHaveAttribute('aria-label', /Time running/);
    await expect(optionButton(d, Q[0].correctIndex)).toBeDisabled(); // nobody can answer before a team is chosen
    await d.waitForTimeout(2200);
    const before = await timerSeconds(d);
    expect(before).toBeLessThanOrEqual(28);
    expect(before).toBeGreaterThan(20);

    await pickTeam(d, 'A'); // picking the team neither restarts nor stops the clock
    await expect(d.getByText(`${NAME_A} is answering`)).toBeVisible();
    const after = await timerSeconds(d);
    expect(after).toBeLessThanOrEqual(before);
    expect(after).toBeGreaterThan(before - 3);
    await expect(optionButton(d, Q[0].correctIndex)).toBeEnabled();

    await optionButton(d, Q[0].correctIndex).dblclick(); // a double-click must not double score
    await expect(d.getByText(`Correct! ${NAME_A} gets +10 points`)).toBeVisible();
    expect(await scoreOf(d, NAME_A)).toBe(10);
    expect(await scoreOf(d, NAME_B)).toBe(0);
    await expect(d.getByText(`Correct answer: Option ${L[Q[0].correctIndex]}`)).toBeVisible();
    await expect(d.getByText(Q[0].explanation)).toBeVisible();
    await expect(optionButton(d, 0)).toBeDisabled(); // no more answers once judged

    await d.getByRole('button', { name: 'Next question' }).dblclick(); // double-click advances once
    await expect(d.getByText(`Question 2 / ${TOTAL}`)).toBeVisible();
    await expect(d.getByText(Q[1].text)).toBeVisible();
    expect(await scoreOf(d, NAME_A)).toBe(10);
    // every new question starts its own clock automatically
    await expect(d.getByRole('timer')).toHaveAttribute('aria-label', /Time running/);
    expect(await timerSeconds(d)).toBeGreaterThan(26);
  });

  test('the team pick can be corrected until the first answer is judged', async ({ context }) => {
    const d = await startSingleScreen(context);
    await pickTeam(d, 'A');
    await expect(d.getByText(`${NAME_A} is answering`)).toBeVisible();
    await pickTeam(d, 'B'); // wrong captain was clicked: fix it
    await expect(d.getByText(`${NAME_B} is answering`)).toBeVisible();
    await optionButton(d, Q[0].correctIndex).click();
    await expect(d.getByText(`Correct! ${NAME_B} gets +10 points`)).toBeVisible();
    expect(await scoreOf(d, NAME_B)).toBe(10);
  });

  test('a wrong option is marked incorrect and the question passes AUTOMATICALLY to the other team on the leftover time', async ({ context }) => {
    const d = await startSingleScreen(context);
    await d.waitForTimeout(2500);
    await pickTeam(d, 'A');
    await optionButton(d, wrongIndex(0)).click();
    await expect(d.getByText(new RegExp(`${NAME_A} answered incorrectly`))).toBeVisible();
    await expect(d.getByText('Incorrect').first()).toBeVisible();
    await expect(d.getByText('STEAL').first()).toBeVisible();
    await expect(d.getByText(/Correct answer: Option/)).toHaveCount(0);
    expect(await scoreOf(d, NAME_A)).toBe(0);
    for (const name of [/Submit/, /Mark/, /Enable steal/i, /Give steal/i, /start .*timer/i]) await expect(d.getByRole('button', { name })).toHaveCount(0);

    // ONE clock: it is still counting down from where it was, never reset to 30
    const t1 = await timerSeconds(d);
    expect(t1).toBeLessThanOrEqual(27);
    await d.waitForTimeout(1500);
    expect(await timerSeconds(d)).toBeLessThanOrEqual(t1 - 1);
    await expect(optionButton(d, wrongIndex(0))).toBeDisabled(); // the failed option cannot be picked again

    await optionButton(d, Q[0].correctIndex).click();
    await expect(d.getByText(`Correct! ${NAME_B} gets +10 points`)).toBeVisible();
    expect(await scoreOf(d, NAME_B)).toBe(10);
    expect(await scoreOf(d, NAME_A)).toBe(0);
  });

  test('both teams wrong → no points and the answer is shown', async ({ context }) => {
    const d = await startSingleScreen(context);
    await pickTeam(d, 'A');
    await optionButton(d, wrongIndex(0)).click();
    const other = [0, 1, 2, 3].find((i) => i !== Q[0].correctIndex && i !== wrongIndex(0))!;
    await optionButton(d, other).click();
    await expect(d.getByText('Both teams answered incorrectly — 0 points')).toBeVisible();
    await expect(d.getByText(`Correct answer: Option ${L[Q[0].correctIndex]}`)).toBeVisible();
    expect(await scoreOf(d, NAME_A)).toBe(0);
    expect(await scoreOf(d, NAME_B)).toBe(0);
  });

  test('50:50, pause and skip all work from the display', async ({ context }) => {
    const d = await startSingleScreen(context);
    await expect(d.getByRole('button', { name: /50:50 — / })).toBeDisabled(); // no team yet
    await pickTeam(d, 'A');
    await d.getByRole('button', { name: /50:50 — / }).click();
    await expect(d.getByText('— removed (50:50) —')).toHaveCount(2);
    for (const idx of Q[0].removableIndices) await expect(d.getByText(Q[0].options[idx], { exact: true })).toHaveCount(0);
    for (const idx of Q[0].removableIndices) await expect(optionButton(d, idx)).toBeDisabled();
    await expect(optionButton(d, Q[0].correctIndex)).toBeEnabled();
    await expect(d.getByRole('button', { name: /50:50 — / })).toBeDisabled();
    await expect(d.getByLabel('50:50 used')).toHaveCount(1);
    await expect(d.getByLabel('50:50 available')).toHaveCount(1);

    await d.getByRole('button', { name: 'Pause' }).click();
    await expect(d.getByText('The game is paused').first()).toBeVisible();
    const a = await timerSeconds(d);
    await d.waitForTimeout(2300);
    expect(await timerSeconds(d)).toBe(a);
    await expect(optionButton(d, Q[0].correctIndex)).toBeDisabled();
    await d.getByRole('button', { name: 'Resume' }).click();
    await d.waitForTimeout(1300);
    expect(await timerSeconds(d)).toBeLessThanOrEqual(a - 1);

    await d.getByRole('button', { name: /Skip question/ }).click();
    await d.getByRole('button', { name: 'Cancel' }).click();
    await expect(d.getByText(Q[0].text)).toBeVisible();
    await d.getByRole('button', { name: /Skip question/ }).click();
    await d.getByRole('button', { name: 'Yes, skip' }).click();
    await expect(d.getByText('Question skipped — 0 points for both teams')).toBeVisible();
    await expect(d.getByText(/Correct answer: Option/)).toHaveCount(0); // not revealed automatically
    await d.getByRole('button', { name: 'Show correct answer' }).click();
    await expect(d.getByText(`Correct answer: Option ${L[Q[0].correctIndex]}`)).toBeVisible();
    expect((await scoreOf(d, NAME_A)) + (await scoreOf(d, NAME_B))).toBe(0);
  });

  test('the answer key is never visible on the display before the answer is revealed', async ({ context }) => {
    const d = await startSingleScreen(context);
    await expect(d.getByText(/Correct answer: Option/)).toHaveCount(0);
    await expect(d.getByText(Q[0].explanation)).toHaveCount(0);
    await pickTeam(d, 'A');
    await expect(d.getByText(/Correct answer: Option/)).toHaveCount(0);
    await expect(d.locator('[aria-label="Question"]').getByText('Correct')).toHaveCount(0);
  });

  test('the control buttons are large and kept apart (no tiny tap targets)', async ({ context }) => {
    const d = await startSingleScreen(context);
    const group = d.getByRole('group', { name: 'Game controls' });
    const buttons = group.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(7);
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      expect(box!.height, `button #${i} is too short`).toBeGreaterThanOrEqual(52);
    }
    // the two team buttons (the most used) are the largest
    const teamBox = await d.getByRole('button', { name: NAME_A, exact: true }).first().boundingBox();
    expect(teamBox!.height).toBeGreaterThanOrEqual(60);
    expect(teamBox!.width).toBeGreaterThanOrEqual(180);
    expect(teamBox!.height).toBeLessThanOrEqual(80); // large, but not oversized
    // the bar floats above the bottom edge of the window, not glued to it
    const viewport = d.viewportSize()!;
    const endBox = await d.getByRole('button', { name: /End Game/ }).boundingBox();
    expect(viewport.height - (endBox!.y + endBox!.height)).toBeGreaterThanOrEqual(12);
    // End Game and Reset are separated from Pause/Skip/50:50 by a clear gap
    const pauseBox = await d.getByRole('button', { name: 'Pause' }).boundingBox();
    expect(endBox!.x - (pauseBox!.x + pauseBox!.width)).toBeGreaterThanOrEqual(24);
  });

  test('controls can be hidden for a clean projector view and shown again', async ({ context }) => {
    const d = await startSingleScreen(context);
    await expect(d.getByRole('group', { name: 'Game controls' })).toBeVisible();
    await d.getByRole('button', { name: 'Hide controls' }).click();
    await expect(d.getByRole('group', { name: 'Game controls' })).toHaveCount(0);
    await expect(d.getByText(Q[0].text)).toBeVisible();
    await d.getByRole('button', { name: 'Show controls' }).click();
    await expect(d.getByRole('group', { name: 'Game controls' })).toBeVisible();
  });

  test('plays all 30 questions on one screen: 600 max, winner shown, Play Again resets everything', async ({ context }) => {
    test.setTimeout(180_000);
    const d = await startSingleScreen(context);
    for (let i = 0; i < TOTAL; i++) {
      await expect(d.getByText(Q[i].text)).toBeVisible();
      await pickTeam(d, 'A');
      if (i === 3) await d.getByRole('button', { name: /50:50 — / }).click();
      await optionButton(d, Q[i].correctIndex).click();
      await nextQuestion(d);
    }
    await expect(d.getByTestId('winner-announcement')).toContainText(NAME_A);
    await expect(d.getByTestId('final-score-A')).toHaveText('600');
    await expect(d.getByTestId('final-score-B')).toHaveText('0');
    await expect(d.getByText(`Total questions: ${TOTAL} / ${TOTAL}`)).toBeVisible();
    await d.getByRole('button', { name: 'Play Again' }).click();
    await expect(d.getByText(`Question 1 / ${TOTAL}`)).toBeVisible();
    expect(await scoreOf(d, NAME_A)).toBe(0);
    await expect(d.getByLabel('50:50 available')).toHaveCount(2);
    expect(await timerSeconds(d)).toBeGreaterThan(24); // a fresh 30 s clock is already running
  });

  test('a 300–300 tie is announced and the tie-breaker (with automatic steal) decides it on one screen', async ({ context }) => {
    test.setTimeout(180_000);
    const d = await startSingleScreen(context);
    // Questions 1-8 Easy, 9-22 Intermediate, 23-30 Hard.
    // A: 8 Easy + 11 Intermediate = 300.   B: 3 Intermediate + 8 Hard = 300.
    for (let i = 0; i < TOTAL; i++) {
      await answerCorrect(d, i, i <= 18 ? 'A' : 'B');
      await nextQuestion(d);
    }
    await expect(d.getByTestId('winner-announcement')).toContainText('TIE');
    await expect(d.getByTestId('final-score-A')).toHaveText('300');
    await expect(d.getByTestId('final-score-B')).toHaveText('300');
    await d.getByRole('button', { name: /Start tie-breaker/ }).click();
    await expect(d.getByText('TIE-BREAKER').first()).toBeVisible();
    await expect(d.getByText('30 points')).toBeVisible();
    await pickTeam(d, 'A');
    await optionButton(d, 1).click(); // the draft tie-breaker's correct answer is option A
    await expect(d.getByText(new RegExp(`${NAME_A} answered incorrectly`))).toBeVisible();
    await optionButton(d, 0).click();
    await d.getByRole('button', { name: 'View final result' }).click();
    await expect(d.getByTestId('winner-announcement')).toContainText(NAME_B);
    await expect(d.getByTestId('final-score-A')).toHaveText('300'); // the main-game scores are unchanged
    await expect(d.getByTestId('final-score-B')).toHaveText('300');
    await expect(d.getByRole('button', { name: /Start tie-breaker/ })).toHaveCount(0);
  });
});

test.describe('two screens: Teacher Panel + Student Display stay in sync', () => {
  test('Q1 appears on both; the clock runs by itself on both; the key is visible to the teacher only', async ({ context }) => {
    const { teacher, display } = await startGame(context);
    for (const p of [teacher, display]) {
      await expect(p.getByText(Q[0].text)).toBeVisible();
      await expect(p.getByText(`Question 1 / ${TOTAL}`)).toBeVisible();
      await expect(p.getByText('10 points').first()).toBeVisible();
      await expect(p.getByRole('timer')).toHaveAttribute('aria-label', /Time running/);
    }
    await teacher.waitForTimeout(2500);
    const t = await timerSeconds(teacher);
    const d = await timerSeconds(display);
    expect(t).toBeLessThanOrEqual(27);
    expect(Math.abs(t - d)).toBeLessThanOrEqual(1);
    await expect(display.getByText(/Correct answer: Option/)).toHaveCount(0);
    await expect(display.getByText('Correct answer (teacher only)')).toHaveCount(0);
    await expect(teacher.getByText('Correct answer (teacher only)')).toBeVisible();
  });

  test('a team picked on one screen and an answer clicked on the other are reflected on both', async ({ context }) => {
    const { teacher, display } = await startGame(context);
    await pickTeam(display, 'A'); // from the DISPLAY…
    await expect(teacher.getByText(`${NAME_A} is answering`)).toBeVisible();
    await optionButton(teacher, wrongIndex(0)).click(); // …wrong answer from the TEACHER panel
    await expect(display.getByText(new RegExp(`${NAME_A} answered incorrectly`))).toBeVisible();
    await expect(teacher.getByText(new RegExp(`${NAME_A} answered incorrectly`))).toBeVisible();
    await optionButton(display, Q[0].correctIndex).click(); // finish from the display
    for (const p of [teacher, display]) {
      await expect(p.getByText(`Correct! ${NAME_B} gets +10 points`)).toBeVisible();
      await expect.poll(() => scoreOf(p, NAME_B)).toBe(10);
      expect(await scoreOf(p, NAME_A)).toBe(0);
      await expect(p.getByText(Q[0].explanation)).toBeVisible();
    }
  });

  test('50:50 appears on both screens and the used badge updates on both', async ({ context }) => {
    const { teacher, display } = await startGame(context);
    await pickTeam(teacher, 'A');
    await teacher.getByRole('button', { name: /50:50 — / }).click();
    await expect(display.getByText('— removed (50:50) —')).toHaveCount(2);
    await expect(teacher.getByText('Removed by 50:50')).toHaveCount(2);
    for (const idx of Q[0].removableIndices) await expect(display.getByText(Q[0].options[idx], { exact: true })).toHaveCount(0);
    await expect(display.getByLabel('50:50 used')).toHaveCount(1);
    await expect(teacher.getByLabel('50:50 used')).toHaveCount(1);
    await display.reload();
    await expect(display.getByText('— removed (50:50) —')).toHaveCount(2);
    await expect(display.getByLabel('50:50 used')).toHaveCount(1);
    await optionButton(teacher, Q[0].correctIndex).click();
    await nextQuestion(teacher);
    await pickTeam(teacher, 'A');
    await expect(teacher.getByRole('button', { name: /50:50 — / })).toBeDisabled(); // Team A already used its 50:50
    await optionButton(teacher, wrongIndex(1)).click();
    await expect(teacher.getByRole('button', { name: new RegExp(`50:50 — ${NAME_B}`) })).toBeEnabled(); // B still has one
  });

  test('pausing on the teacher panel freezes the clock on the display', async ({ context }) => {
    const { teacher, display } = await startGame(context);
    await pickTeam(teacher, 'A');
    await teacher.waitForTimeout(1200);
    await teacher.getByRole('button', { name: 'Pause' }).click();
    await expect(display.getByText('The game is paused').first()).toBeVisible();
    const a = await timerSeconds(display);
    await teacher.waitForTimeout(2500);
    expect(await timerSeconds(display)).toBe(a);
    await expect(optionButton(teacher, Q[0].correctIndex)).toBeDisabled();
    await teacher.getByRole('button', { name: 'Resume' }).click();
    await teacher.waitForTimeout(2300);
    expect(await timerSeconds(display)).toBeLessThanOrEqual(a - 1);
  });

  test('refreshing and opening extra displays never duplicates the game or its clock', async ({ context }) => {
    const { teacher, display } = await startGame(context);
    await pickTeam(teacher, 'A');
    await teacher.getByRole('button', { name: /50:50 — / }).click();
    await teacher.waitForTimeout(1500);
    const before = await timerSeconds(display);
    await teacher.reload();
    await expect(teacher.getByText(Q[0].text)).toBeVisible();
    await expect(teacher.getByText('Removed by 50:50')).toHaveCount(2);
    const after = await timerSeconds(teacher);
    expect(after).toBeLessThanOrEqual(before);
    expect(after).toBeGreaterThanOrEqual(before - 3);

    const d2 = await context.newPage();
    await d2.goto('/#/display');
    const d3 = await context.newPage();
    await d3.goto('/#/display');
    await d3.reload();
    await d2.waitForTimeout(800);
    const secs = [await timerSeconds(teacher), await timerSeconds(display), await timerSeconds(d2), await timerSeconds(d3)];
    expect(Math.max(...secs) - Math.min(...secs)).toBeLessThanOrEqual(1);
    await expect(d2.getByText('— removed (50:50) —')).toHaveCount(2);
    expect(await scoreOf(d3, NAME_A)).toBe(0);
    await expect(d3.getByText(`Question 1 / ${TOTAL}`)).toBeVisible();
  });

  test('Home offers Resume after refresh; the teacher panel reports whether a display is connected', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.getByRole('radio', { name: /Class 9/ }).click();
    await page.getByLabel('Team A name').fill(NAME_A);
    await page.getByLabel('Team B name').fill(NAME_B);
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.evaluate(() => (window.location.hash = '/teacher'));
    const display = await context.newPage();
    await display.goto('/#/display');
    await expect(page.getByText('Student Display: connected ✓')).toBeVisible({ timeout: 8000 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Resume game/ })).toBeVisible();
    await page.getByRole('button', { name: /Resume game/ }).click();
    await expect(page.getByText(Q[0].text)).toBeVisible();
  });

  test('the teacher panel flags questions added by the developer for verification', async ({ context }) => {
    const { teacher } = await startGame(context, { withDisplay: false });
    await expect(teacher.getByText(/added by the developer — please verify/)).toHaveCount(0); // Q1 is a teacher question
    await teacher.getByRole('button', { name: /Skip question/ }).click();
    await teacher.getByRole('button', { name: 'Yes, skip' }).click();
    // jump to the first developer-added question (the 6th Easy question)
    const firstAdded = Q.findIndex((q) => q.needsReview);
    expect(firstAdded).toBe(5);
    await nextQuestion(teacher);
    for (let i = 1; i < firstAdded; i++) {
      await teacher.getByRole('button', { name: /Skip question/ }).click();
      await teacher.getByRole('button', { name: 'Yes, skip' }).click();
      await nextQuestion(teacher);
    }
    await expect(teacher.getByText(Q[firstAdded].text)).toBeVisible();
    await expect(teacher.getByText(/added by the developer — please verify/)).toBeVisible();
  });
});

test.describe('the 30 s clock with a controlled clock (single screen)', () => {
  test('30 s run out → zero (never negative), cannot answer, then end question and reveal', async ({ context }) => {
    await context.clock.install();
    const d = await startSingleScreen(context);
    await pickTeam(d, 'A');
    await context.clock.runFor(10_000);
    expect(Math.abs((await timerSeconds(d)) - 20)).toBeLessThanOrEqual(2); // the label re-renders every 250 ms
    await context.clock.runFor(25_000); // 35 s in total
    await expect(d.getByRole('timer')).toHaveAttribute('aria-label', /0 seconds/);
    await expect(d.getByText(/Time's up/).first()).toBeVisible();
    await expect(optionButton(d, Q[0].correctIndex)).toBeDisabled();
    await expect(d.getByText(/Correct answer: Option/)).toHaveCount(0);
    await d.getByRole('button', { name: /Time's up — end question/ }).click();
    await expect(d.getByText("Time's up — 0 points for both teams")).toBeVisible();
    await d.getByRole('button', { name: 'Show correct answer' }).click();
    await expect(d.getByText(`Correct answer: Option ${L[Q[0].correctIndex]}`)).toBeVisible();
    expect(await scoreOf(d, NAME_A)).toBe(0);
  });

  test('if nobody is chosen before the clock runs out, no team can be picked and the question just ends', async ({ context }) => {
    await context.clock.install();
    const d = await startSingleScreen(context);
    await context.clock.runFor(32_000);
    await expect(d.getByRole('timer')).toHaveAttribute('aria-label', /0 seconds/);
    await expect(d.getByText("Time's up — no team answered").first()).toBeVisible();
    await pickTeam(d, 'A');
    await expect(d.getByRole('alert').filter({ hasText: /Time is up/ })).toBeVisible();
    await d.getByRole('button', { name: /Time's up — end question/ }).click();
    await expect(d.getByText("Time's up — 0 points for both teams")).toBeVisible();
    expect((await scoreOf(d, NAME_A)) + (await scoreOf(d, NAME_B))).toBe(0);
  });

  test('the steal gets only the leftover time of the original 30 s', async ({ context }) => {
    await context.clock.install();
    const d = await startSingleScreen(context);
    await pickTeam(d, 'A');
    await context.clock.runFor(26_000);
    await optionButton(d, wrongIndex(0)).click(); // about 4 s left → automatic steal
    expect(await timerSeconds(d)).toBeLessThanOrEqual(5);
    await expect(d.getByText(/answered incorrectly/).first()).toBeVisible();
    await context.clock.runFor(6000);
    await expect(d.getByRole('timer')).toHaveAttribute('aria-label', /0 seconds/);
    await expect(optionButton(d, Q[0].correctIndex)).toBeDisabled();
    await d.getByRole('button', { name: /Time's up — end question/ }).click();
    await expect(d.getByText("Time's up on the steal — 0 points")).toBeVisible();
    expect(await scoreOf(d, NAME_B)).toBe(0);
  });
});

/** Replaces the browser's audio with counters, so a test can "hear" tones, drums/claps and cut-offs without a speaker. */
const fakeAudio = () => {
  const w = window as unknown as { __beeps: number[]; __noise: number[]; __disconnects: number[]; AudioContext: unknown };
  w.__beeps = []; // one entry per oscillator (every beep, note, chime and kick)
  w.__noise = []; // one entry per noise burst (every clap, snare and hi-hat)
  w.__disconnects = []; // one entry each time a celebration is cut off
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const clockStart = performance.now();
  class FakeAudioContext {
    state = 'running';
    get currentTime() {
      return (performance.now() - clockStart) / 1000;
    }
    sampleRate = 44100;
    destination = {};
    resume() {
      return Promise.resolve();
    }
    createBuffer(_channels: number, length: number, sampleRate: number) {
      return { sampleRate, length, getChannelData: () => new Float32Array(8) };
    }
    createGain() {
      return { gain: param(), connect() {}, disconnect() { w.__disconnects.push(1); } };
    }
    createDynamicsCompressor() {
      return { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect() {}, disconnect() {} };
    }
    createBiquadFilter() {
      return { type: '', frequency: param(), Q: param(), connect() {} };
    }
    createBufferSource() {
      return { buffer: null, connect() {}, start() { w.__noise.push(1); } };
    }
    createOscillator() {
      return { type: '', frequency: param(), detune: param(), connect() {}, stop() {}, start() { w.__beeps.push(1); } };
    }
  }
  w.AudioContext = FakeAudioContext;
  // a fake voice: records what would be said and how often speech is cancelled
  const spoken: string[] = [];
  const cancels: number[] = [];
  (w as unknown as { __voiceUsed: string[] }).__voiceUsed = [];
  (w as unknown as { __pitches: number[] }).__pitches = [];
  (w as unknown as { __spoken: string[]; __speechCancels: number[] }).__spoken = spoken;
  (w as unknown as { __speechCancels: number[] }).__speechCancels = cancels;
  // Chrome's real utterance only accepts its own voice objects, so the fake one accepts anything
  class FakeUtterance {
    text: string;
    voice: unknown = null;
    lang = '';
    rate = 1;
    pitch = 1;
    volume = 1;
    constructor(text: string) {
      this.text = text;
    }
  }
  (w as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = FakeUtterance;
  const synthState = { speaking: false };
  (w as unknown as { __synthState: unknown }).__synthState = synthState;
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      get speaking() {
        return synthState.speaking;
      },
      pending: false,
      paused: false,
      speak: (u: { text: string; voice?: { name: string } | null; lang?: string; pitch?: number; onend?: () => void }) => {
        (w as unknown as { __pitches: number[] }).__pitches.push(u.pitch ?? -1);
        spoken.push(u.text);
        const withEnd = u as { onend?: () => void };
        (w as unknown as { __lastUtterance: unknown }).__lastUtterance = u;
        synthState.speaking = true;
        // the voice finishes straight away, unless a test takes manual control of when it ends
        if (!(w as unknown as { __manualEnd?: boolean }).__manualEnd) {
          setTimeout(() => {
            synthState.speaking = false;
            withEnd.onend?.();
          }, 0);
        }
        (w as unknown as { __voiceUsed: string[] }).__voiceUsed.push(u.voice?.name ?? `(default ${u.lang ?? ''})`);
      },
      cancel: () => cancels.push(1),
      resume: () => undefined,
      getVoices: () => (w as unknown as { __voices?: unknown[] }).__voices ?? [],
    },
  });
};
const beepCount = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __beeps: number[] }).__beeps.length);
const noiseCount = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __noise: number[] }).__noise.length);
const spokenWords = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.slice());
const voiceUsed = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __voiceUsed: string[] }).__voiceUsed.slice());
const pitchesUsed = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __pitches: number[] }).__pitches.slice());
const speechCancels = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __speechCancels: number[] }).__speechCancels.length);
const finishSpeech = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __lastUtterance: { onend?: () => void }; __synthState: { speaking: boolean } };
    w.__synthState.speaking = false;
    w.__lastUtterance.onend?.();
  });
/** The voice stops talking but Chrome "forgets" to send the end event (seen on real Windows machines). */
const stopSpeakingSilently = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    (window as unknown as { __synthState: { speaking: boolean } }).__synthState.speaking = false;
  });
const manualSpeech = () => {
  (window as unknown as { __manualEnd: boolean }).__manualEnd = true;
};
const cutOffCount = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __disconnects: number[] }).__disconnects.length);

test.describe('warning at 10 seconds and below: red timer and a beep every second', () => {
  test('silent and normal above 10 s; red + beeping at 10 s and below; silent when paused or muted', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.clock.install();
    const d = await startSingleScreen(context);
    await pickTeam(d, 'A');
    const timer = d.getByRole('timer');

    await context.clock.runFor(14_000); // about 16 s left
    expect(await beepCount(d)).toBe(0);
    await expect(timer).not.toHaveClass(/border-red-500/);
    await expect(timer).toHaveAttribute('aria-label', /Time running/);

    await context.clock.runFor(7000); // about 9 s left: inside the warning zone
    await expect(timer).toHaveClass(/border-red-500/);
    await expect(timer).toHaveAttribute('aria-label', /Hurry!/); // not colour alone: the label says it too
    expect(await beepCount(d)).toBeGreaterThanOrEqual(1);

    await d.getByRole('button', { name: 'Pause' }).click();
    await expect(d.getByRole('button', { name: 'Resume' })).toBeVisible();
    const paused = await beepCount(d); // counted AFTER pausing, so a beep in flight cannot confuse the check
    await context.clock.runFor(5000);
    expect(await beepCount(d)).toBe(paused); // no beeping while paused
    await d.getByRole('button', { name: 'Resume' }).click();

    await context.clock.runFor(3000);
    const resumed = await beepCount(d);
    expect(resumed).toBeGreaterThan(paused); // beeping again, about once a second

    await d.getByRole('button', { name: 'Sound on' }).click(); // mute
    await expect(d.getByRole('button', { name: 'Sound off' })).toBeVisible();
    const muted = await beepCount(d);
    await context.clock.runFor(2000);
    expect(await beepCount(d)).toBe(muted);
    await expect(timer).toHaveClass(/border-red-500/); // still red when muted

    await d.getByRole('button', { name: 'Sound off' }).click(); // unmute
    const c3 = await beepCount(d);
    await context.clock.runFor(8000); // runs out
    await expect(timer).toHaveAttribute('aria-label', /0 seconds/);
    expect(await beepCount(d)).toBeGreaterThan(c3); // the final tone at zero
    await expect(timer).toHaveClass(/border-red-500/);
  });

  test('the timer turns red on the Teacher Panel too, but only the Student Display makes sound', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.clock.install();
    const { teacher } = await startGame(context, { withDisplay: false });
    await pickTeam(teacher, 'A');
    await context.clock.runFor(23_000); // about 7 s left
    await expect(teacher.getByRole('timer')).toHaveClass(/border-red-500/);
    expect(await beepCount(teacher)).toBe(0);
  });

  test('a beep does not start by itself on a fresh question', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.clock.install();
    const d = await startSingleScreen(context);
    await pickTeam(d, 'A');
    await optionButton(d, Q[0].correctIndex).click();
    await expect(d.getByRole('img', { name: 'Correct answer' })).toBeVisible();
    const afterChime = await beepCount(d); // the "right" chime, not a countdown beep
    await nextQuestion(d);
    await context.clock.runFor(5000);
    expect(await beepCount(d)).toBe(afterChime); // nothing new on the fresh question (30 s → 25 s)
    await expect(d.getByRole('timer')).not.toHaveClass(/border-red-500/);
  });
});

test.describe('right / wrong feedback: sound + a big emoji for about a second', () => {
  test('a wrong answer shows 😢 and plays a sound, then the emoji goes away by itself', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const d = await startSingleScreen(context);
    await pickTeam(d, 'A');
    expect(await beepCount(d)).toBe(0);
    await optionButton(d, wrongIndex(0)).click();
    const sad = d.getByRole('img', { name: 'Wrong answer' });
    await expect(sad).toBeVisible();
    await expect(sad).toContainText('😢');
    await expect(d.getByRole('img', { name: 'Correct answer' })).toHaveCount(0);
    expect(await beepCount(d)).toBeGreaterThanOrEqual(2); // the falling two-note "wrong" buzz
    await expect(sad).toHaveCount(0, { timeout: 4000 }); // about a second, then gone
  });

  test('a right answer shows 😄 and plays a different, happier sound', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const d = await startSingleScreen(context);
    await pickTeam(d, 'A');
    await optionButton(d, wrongIndex(0)).click(); // wrong first, so we can compare the two sounds
    await expect(d.getByRole('img', { name: 'Wrong answer' })).toBeVisible();
    await expect(d.getByRole('img', { name: 'Wrong answer' })).toHaveCount(0, { timeout: 4000 });
    const afterWrong = await beepCount(d);
    await optionButton(d, Q[0].correctIndex).click(); // the other team steals it
    const happy = d.getByRole('img', { name: 'Correct answer' });
    await expect(happy).toBeVisible();
    await expect(happy).toContainText('😄');
    expect(await beepCount(d)).toBe(afterWrong + 3); // the rising three-note chime
    await expect(happy).toHaveCount(0, { timeout: 4000 });
    await expect(d.getByText(`Correct! ${NAME_B} gets +10 points`)).toBeVisible(); // the words stay on screen
  });

  test('with Sound off the emoji still shows but nothing is played', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const d = await startSingleScreen(context);
    await d.getByRole('button', { name: 'Sound on' }).click();
    await pickTeam(d, 'A');
    await optionButton(d, Q[0].correctIndex).click();
    await expect(d.getByRole('img', { name: 'Correct answer' })).toBeVisible();
    expect(await beepCount(d)).toBe(0);
  });

  test('refreshing the display after an answer does not replay the emoji or the sound', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const d = await startSingleScreen(context);
    await pickTeam(d, 'A');
    await optionButton(d, wrongIndex(0)).click();
    await expect(d.getByRole('img', { name: 'Wrong answer' })).toHaveCount(0, { timeout: 4000 });
    await d.reload();
    await expect(d.getByText(Q[0].text)).toBeVisible();
    await d.waitForTimeout(800);
    await expect(d.getByRole('img', { name: /answer/ })).toHaveCount(0);
    expect(await beepCount(d)).toBe(0);
  });

  test('a second screen shows the emoji when the answer is clicked on the other screen; the Teacher Panel stays silent', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const { teacher, display } = await startGame(context);
    await pickTeam(teacher, 'A');
    await optionButton(teacher, Q[0].correctIndex).click();
    await expect(display.getByRole('img', { name: 'Correct answer' })).toBeVisible();
    expect(await beepCount(display)).toBeGreaterThanOrEqual(3);
    await expect(teacher.getByRole('img', { name: /answer/ })).toHaveCount(0);
    expect(await beepCount(teacher)).toBe(0);
  });
});

test.describe('winner celebration: a party with a long tune and then applause', () => {
  /** Team A answers Q1, then the game is ended so that A is ahead. Returns the sound counters just before results appear. */
  async function finishWithWinner(d: import('@playwright/test').Page) {
    await pickTeam(d, 'A');
    await optionButton(d, Q[0].correctIndex).click();
    await expect(d.getByRole('img', { name: 'Correct answer' })).toBeVisible();
    await nextQuestion(d);
    await d.getByRole('button', { name: /End Game/ }).click();
    const before = { tones: await beepCount(d), noise: await noiseCount(d) };
    await d.getByRole('button', { name: 'Yes, end the game' }).click();
    return before;
  }

  test('announcing a winner: fireworks, balloons, spotlight, trophy and confetti, with a long fanfare and applause', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.clock.install();
    const d = await startSingleScreen(context);
    const before = await finishWithWinner(d);
    await expect(d.getByTestId('winner-announcement')).toContainText(NAME_A);
    await expect(d.getByTestId('winner-announcement')).toContainText('🎉');
    // the party layers
    expect(await d.locator('.confetti-piece').count()).toBeGreaterThanOrEqual(100);
    await expect(d.locator('.trophy-star')).toBeVisible();
    await expect(d.locator('.rays')).toBeAttached();
    expect(await d.locator('.fw-particle').count()).toBeGreaterThanOrEqual(70); // fireworks
    expect(await d.locator('.balloon').count()).toBeGreaterThanOrEqual(6);
    expect(await d.locator('.clap-hand').count()).toBeGreaterThanOrEqual(15); // the clapping hands for the applause
    await expect(d.locator('.congrats')).toContainText(`Congratulations, ${NAME_A}!`); // the warm message (appears with the applause)
    await expect(d.locator('.congrats')).toContainText('You are our Maharathi!'); // the same words the voice says
    // the long tune: many notes plus drums, then the applause (hundreds of noise bursts in total). Sounds are prepared
    // just before they play, so let the whole ~30 s celebration run.
    await context.clock.runFor(36_000);
    await expect.poll(() => beepCount(d)).toBeGreaterThanOrEqual(before.tones + 240); // the grand tune: ~260 notes and drum hits
    await expect.poll(() => noiseCount(d)).toBeGreaterThanOrEqual(before.noise + 500); // drums, a cymbal, a crowd murmur and ~520 sharp claps
    const afterTone = await beepCount(d);
    await context.clock.runFor(10_000);
    expect(await beepCount(d)).toBe(afterTone); // played once, not repeated
  });

  test('the moment the winner appears, a voice says what the screen says in a normal tone', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.clock.install();
    const d = await startSingleScreen(context);
    await finishWithWinner(d);
    await expect(d.getByTestId('winner-announcement')).toContainText(NAME_A);
    await context.clock.runFor(1000); // less than a second after the winner appeared
    await expect.poll(() => spokenWords(d)).toEqual([`Congratulations, ${NAME_A}! What a brilliant game. You are our Maharathi!`]);
    expect(await pitchesUsed(d)).toEqual([1]); // a normal tone
    // the on-screen message appears together with the voice, and the clapping hands wait for the applause
    expect(await d.locator('.congrats').evaluate((el) => getComputedStyle(el).animationDelay)).toBe('0.3s');
    const firstClap = await d.locator('.clap-hand').first().evaluate((el) => parseFloat(getComputedStyle(el).animationDelay));
    expect(firstClap).toBeGreaterThanOrEqual(24); // the clapping hands wait for the music to end
  });

  test('the ORDER is: the voice first, the tune the instant the voice ends, then the clapping right behind the tune', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.addInitScript(manualSpeech);
    await context.clock.install();
    const d = await startSingleScreen(context);
    const before = await finishWithWinner(d);
    await context.clock.runFor(1000);
    await expect.poll(() => spokenWords(d)).toHaveLength(1);
    // 1. the voice is talking: the music and the clapping have NOT started
    expect(await beepCount(d)).toBe(before.tones);
    expect(await noiseCount(d)).toBe(before.noise);
    // 2. the voice finishes → the tune starts immediately (no gap), with the clapping scheduled to follow it
    await finishSpeech(d);
    await context.clock.runFor(500);
    expect(await beepCount(d)).toBeGreaterThan(before.tones); // the tune has started at once
    expect(await noiseCount(d)).toBeLessThan(before.noise + 200); // …but the clapping has NOT started yet
    await context.clock.runFor(36_000); // the tune, then the applause
    await expect.poll(() => beepCount(d)).toBeGreaterThanOrEqual(before.tones + 240);
    await expect.poll(() => noiseCount(d)).toBeGreaterThanOrEqual(before.noise + 500);
  });

  test('Chrome forgets the "end" event (as on real Windows): the tune still starts the moment the voice stops talking', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.addInitScript(manualSpeech);
    await context.clock.install();
    const d = await startSingleScreen(context);
    const before = await finishWithWinner(d);
    await context.clock.runFor(3000); // the voice is still talking
    await expect.poll(() => spokenWords(d)).toHaveLength(1);
    expect(await beepCount(d)).toBe(before.tones);
    await stopSpeakingSilently(d); // it stops — but no "end" event arrives
    await context.clock.runFor(500);
    await expect.poll(() => beepCount(d)).toBeGreaterThan(before.tones); // the tune starts anyway, straight away
  });

  test('a long real voice is never cut off by the safety timer: the tune waits until it has finished', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.addInitScript(manualSpeech);
    await context.clock.install();
    const d = await startSingleScreen(context);
    const before = await finishWithWinner(d);
    await context.clock.runFor(1000);
    await expect.poll(() => spokenWords(d)).toHaveLength(1);
    // the voice reports that it started (real voices take ~2 s to begin), then talks for 9 s
    await d.evaluate(() => (window as unknown as { __lastUtterance: { onstart?: () => void } }).__lastUtterance.onstart?.());
    await context.clock.runFor(9000);
    expect(await beepCount(d)).toBe(before.tones); // still talking → no music yet, however long it takes
    await finishSpeech(d);
    await context.clock.runFor(500);
    await expect.poll(() => beepCount(d)).toBeGreaterThan(before.tones); // then straight into the tune
  });

  test('if the voice never even starts, the music still starts after a short safety delay', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.addInitScript(manualSpeech);
    await context.clock.install();
    const d = await startSingleScreen(context);
    const before = await finishWithWinner(d);
    await context.clock.runFor(1000);
    expect(await beepCount(d)).toBe(before.tones);
    await context.clock.runFor(7000);
    await expect.poll(() => beepCount(d)).toBeGreaterThan(before.tones); // the music has started
  });

  test('leaving the results while the voice is still talking means the music never starts late', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.addInitScript(manualSpeech);
    await context.clock.install();
    const d = await startSingleScreen(context);
    await finishWithWinner(d);
    await context.clock.runFor(1000);
    await expect.poll(() => spokenWords(d)).toHaveLength(1);
    await d.getByRole('button', { name: 'Play Again' }).click();
    await expect(d.getByText(`Question 1 / ${TOTAL}`)).toBeVisible();
    const tones = await beepCount(d);
    await finishSpeech(d); // the (cancelled) voice reports its end late
    await context.clock.runFor(8000);
    expect(await beepCount(d)).toBe(tones); // nothing starts
  });

  test('the congratulation banner is in the top layer, above the score cards', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const d = await startSingleScreen(context);
    await finishWithWinner(d);
    await expect(d.getByTestId('winner-announcement')).toContainText(NAME_A);
    const layers = await d.evaluate(() => {
      const banner = document.querySelector('.congrats') as HTMLElement;
      const card = document.querySelector('[aria-label="Final scores"]') as HTMLElement;
      const z = (el: HTMLElement) => Number.parseInt(getComputedStyle(el).zIndex || '0', 10) || 0;
      return { bannerZ: z(banner), bannerPos: getComputedStyle(banner).position, cardZ: z(card), insideBackgroundLayer: Boolean(banner.closest('.fx.z-0')) };
    });
    expect(layers.bannerPos).toBe('fixed');
    expect(layers.bannerZ).toBeGreaterThanOrEqual(60);
    expect(layers.bannerZ).toBeGreaterThan(layers.cardZ);
    expect(layers.insideBackgroundLayer).toBe(false); // it used to live in the background layer, behind the cards
  });

  test('the voice is a MALE Indian-English voice when the computer has one, in its normal tone', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.addInitScript(() => {
      (window as unknown as { __voices: unknown[] }).__voices = [
        { name: 'Google US English', lang: 'en-US', localService: false },
        { name: 'Microsoft Hemant - Hindi (India)', lang: 'hi-IN', localService: true },
        { name: 'Microsoft Heera - English (India)', lang: 'en-IN', localService: true },
        { name: 'Microsoft Ravi - English (India)', lang: 'en-IN', localService: true },
        { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true },
      ];
    });
    await context.clock.install();
    const d = await startSingleScreen(context);
    await finishWithWinner(d);
    await context.clock.runFor(2_000);
    await expect.poll(() => voiceUsed(d)).toEqual(['Microsoft Ravi - English (India)']);
    expect(await pitchesUsed(d)).toEqual([1]); // a normal tone
  });

  test('with only an online voice and internet available, that voice is used (normal tone)', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.addInitScript(() => {
      (window as unknown as { __voices: unknown[] }).__voices = [{ name: 'Google US English', lang: 'en-US', localService: false }];
    });
    await context.clock.install();
    const d = await startSingleScreen(context);
    await finishWithWinner(d);
    await context.clock.runFor(2_000);
    await expect.poll(() => voiceUsed(d)).toEqual(['Google US English']);
  });

  test('while OFFLINE an online-only voice is never used (it would stall); the browser default asks for Indian English', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.addInitScript(() => {
      (window as unknown as { __voices: unknown[] }).__voices = [{ name: 'Google US English', lang: 'en-US', localService: false }];
    });
    await context.clock.install();
    const d = await startSingleScreen(context);
    await context.setOffline(true);
    await finishWithWinner(d);
    await context.clock.runFor(2_000);
    await expect.poll(() => voiceUsed(d)).toEqual(['(default en-IN)']);
    await context.setOffline(false);
  });

  test('a Hindi-script name is read by the Hindi voice between two Indian-English parts', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.addInitScript(() => {
      (window as unknown as { __voices: unknown[] }).__voices = [
        { name: 'Microsoft Ravi - English (India)', lang: 'en-IN', localService: true },
        { name: 'Microsoft Hemant - Hindi (India)', lang: 'hi-IN', localService: true },
      ];
    });
    await context.clock.install();
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.getByRole('radio', { name: /Class 9/ }).click();
    await page.getByLabel('Team A name').fill('अर्जुन');
    await page.getByLabel('Team B name').fill(NAME_B);
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.getByRole('button', { name: 'अर्जुन', exact: true }).first().click();
    await optionButton(page, Q[0].correctIndex).click();
    await nextQuestion(page);
    await page.getByRole('button', { name: /End Game/ }).click();
    await page.getByRole('button', { name: 'Yes, end the game' }).click();
    await context.clock.runFor(2_000);
    await expect.poll(() => spokenWords(page)).toEqual(['Congratulations,', 'अर्जुन', 'What a brilliant game. You are our Maharathi!']);
    expect(await voiceUsed(page)).toEqual(['Microsoft Ravi - English (India)', 'Microsoft Hemant - Hindi (India)', 'Microsoft Ravi - English (India)']);
    expect(await pitchesUsed(page)).toEqual([1, 1, 1]);
  });

  test('a team name in Hindi script is not mangled by an English voice', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.clock.install();
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.getByRole('radio', { name: /Class 9/ }).click();
    await page.getByLabel('Team A name').fill('अर्जुन');
    await page.getByLabel('Team B name').fill(NAME_B);
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.getByRole('button', { name: 'अर्जुन', exact: true }).first().click();
    await optionButton(page, Q[0].correctIndex).click();
    await nextQuestion(page);
    await page.getByRole('button', { name: /End Game/ }).click();
    await page.getByRole('button', { name: 'Yes, end the game' }).click();
    await expect(page.getByTestId('winner-announcement')).toContainText('अर्जुन');
    await context.clock.runFor(2_000);
    await expect.poll(() => spokenWords(page)).toEqual(['Congratulations to the winning team! What a brilliant game. You are our Maharathi!']);
  });

  test('leaving the results screen cancels the voice at once', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.clock.install();
    const d = await startSingleScreen(context);
    await finishWithWinner(d);
    await context.clock.runFor(1000);
    await expect.poll(() => spokenWords(d)).toHaveLength(1);
    const before = await speechCancels(d);
    await d.getByRole('button', { name: 'Play Again' }).click();
    await expect(d.getByText(`Question 1 / ${TOTAL}`)).toBeVisible();
    await expect.poll(() => speechCancels(d)).toBeGreaterThan(before);
  });

  test('with Sound off nothing is spoken', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    await context.clock.install();
    const d = await startSingleScreen(context);
    await d.getByRole('button', { name: 'Sound on' }).click();
    await finishWithWinner(d);
    await context.clock.runFor(5_000);
    expect(await spokenWords(d)).toEqual([]);
  });

  test('the scores roll up from zero to their final values', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const d = await startSingleScreen(context);
    await finishWithWinner(d);
    await expect(d.getByTestId('final-score-A')).toHaveText('10'); // counts up and lands on the real score
    await expect(d.getByTestId('final-score-B')).toHaveText('0');
  });

  test('leaving the results screen cuts the music off at once', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const d = await startSingleScreen(context);
    const before = await finishWithWinner(d);
    await expect(d.getByTestId('winner-announcement')).toContainText(NAME_A);
    await expect.poll(() => beepCount(d)).toBeGreaterThan(before.tones); // the music has started (right after the voice)
    expect(await cutOffCount(d)).toBe(0);
    await d.getByRole('button', { name: 'Play Again' }).click(); // a new game starts…
    await expect(d.getByText(`Question 1 / ${TOTAL}`)).toBeVisible();
    await expect.poll(() => cutOffCount(d)).toBeGreaterThanOrEqual(1); // …and the celebration is silenced
  });

  test('a tie gets no party sound and no confetti', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const d = await startSingleScreen(context);
    await d.getByRole('button', { name: /End Game/ }).click();
    const tones = await beepCount(d);
    const noise = await noiseCount(d);
    await d.getByRole('button', { name: 'Yes, end the game' }).click();
    await expect(d.getByTestId('winner-announcement')).toContainText('TIE');
    await d.waitForTimeout(800);
    expect(await beepCount(d)).toBe(tones);
    expect(await noiseCount(d)).toBe(noise);
    await expect(d.locator('.confetti-piece')).toHaveCount(0);
    await expect(d.locator('.fw-particle')).toHaveCount(0);
  });

  test('with Sound off the party is silent but still shows', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const d = await startSingleScreen(context);
    await d.getByRole('button', { name: 'Sound on' }).click();
    const before = await finishWithWinner(d);
    await expect(d.getByTestId('winner-announcement')).toContainText(NAME_A);
    await expect(d.locator('.confetti-piece').first()).toBeAttached();
    await expect(d.locator('.fw-particle').first()).toBeAttached();
    await d.waitForTimeout(800);
    expect(await beepCount(d)).toBe(before.tones);
    expect(await noiseCount(d)).toBe(before.noise);
  });

  test('refreshing on the results screen does not replay the music', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const d = await startSingleScreen(context);
    await finishWithWinner(d);
    await expect(d.getByTestId('winner-announcement')).toContainText(NAME_A);
    await d.reload();
    await expect(d.getByTestId('winner-announcement')).toContainText(NAME_A);
    await d.waitForTimeout(800);
    expect(await beepCount(d)).toBe(0);
    expect(await noiseCount(d)).toBe(0);
  });

  test('only the Student Display plays the music, not a Teacher Panel open beside it', async ({ context }) => {
    await context.addInitScript(fakeAudio);
    const { teacher, display } = await startGame(context);
    await pickTeam(teacher, 'A');
    await optionButton(teacher, Q[0].correctIndex).click();
    await nextQuestion(teacher);
    await teacher.getByRole('button', { name: /End Game/ }).click();
    const before = await beepCount(display);
    await teacher.getByRole('button', { name: 'Yes, end the game' }).click();
    await expect(teacher.getByTestId('winner-announcement')).toContainText(NAME_A);
    await expect.poll(() => beepCount(display)).toBeGreaterThan(before + 10); // the music is playing on the display
    expect(await beepCount(teacher)).toBe(0);
    expect(await noiseCount(teacher)).toBe(0);
  });
});

test.describe('language: Hindi is used for questions only', () => {
  test('every screen uses English for buttons, labels and messages', async ({ context }) => {
    const d = await startSingleScreen(context);
    const checks: Array<[string, string]> = [];
    const snap = async (label: string) => checks.push([label, await chromeText(d)]);

    await snap('question, clock running');
    await pickTeam(d, 'A');
    await d.getByRole('button', { name: /50:50 — / }).click();
    await snap('answering + 50:50');
    await optionButton(d, wrongIndex(0)).click();
    await snap('steal');
    await optionButton(d, Q[0].correctIndex).click();
    await snap('reveal');
    await nextQuestion(d);
    await d.getByRole('button', { name: 'Pause' }).click();
    await snap('paused');
    await d.getByRole('button', { name: 'Resume' }).click();
    await d.getByRole('button', { name: /End Game/ }).click();
    await snap('end dialog');
    await d.getByRole('button', { name: 'Yes, end the game' }).click();
    await snap('results');

    for (const [label, text] of checks) expect(DEVANAGARI.test(text), `Hindi found in UI text on the "${label}" screen`).toBe(false);

    const home = await context.newPage();
    await home.goto('/#/');
    expect(DEVANAGARI.test(await chromeText(home)), 'home').toBe(false);
    await home.getByRole('button', { name: 'How to Play' }).click();
    expect(DEVANAGARI.test(await chromeText(home)), 'instructions').toBe(false);
    await home.keyboard.press('Escape');
    await home.goto('/#/setup');
    expect(DEVANAGARI.test(await chromeText(home)), 'setup').toBe(false);
    await home.getByRole('radio', { name: /Class 10/ }).click();
    expect(DEVANAGARI.test(await chromeText(home)), 'setup / no bank').toBe(false);
    await home.goto('/#/teacher');
    expect(DEVANAGARI.test(await chromeText(home)), 'teacher').toBe(false);

    // …while the questions themselves keep their Hindi + English wording
    const d2 = await startSingleScreen(await context.browser()!.newContext());
    await expect(d2.locator('[aria-label="Question"]')).toContainText('Computer के IPO Cycle में Data को Process कौन करता है?');
  });
});

test.describe('recovery & robustness', () => {
  test('corrupt saved data is discarded with a clear message instead of crashing', async ({ context }) => {
    const page = await context.newPage();
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('maharathi.game.v1', '{"schema":3,"broken":');
        sessionStorage.setItem('seeded', '1');
      }
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByText(/saved game data was damaged/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
    await page.goto('/#/display');
    await expect(page.getByText('Waiting for the game to start')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('valid JSON with tampered question data is also rejected', async ({ context }) => {
    const d = await startSingleScreen(context);
    const bad = await d.evaluate(() => {
      const g = JSON.parse(localStorage.getItem('maharathi.game.v1')!);
      g.questions[0].removableIndices = [g.questions[0].correctIndex, 0];
      return JSON.stringify(g);
    });
    const fresh = await context.newPage();
    await fresh.addInitScript((v) => {
      if (!sessionStorage.getItem('t')) {
        localStorage.setItem('maharathi.game.v1', v);
        sessionStorage.setItem('t', '1');
      }
    }, bad);
    await fresh.goto('/');
    await expect(fresh.getByText(/saved game data was damaged/)).toBeVisible();
  });

  test('refreshing the display mid-game restores the same game, and the clock kept counting', async ({ context }) => {
    const d = await startSingleScreen(context);
    await pickTeam(d, 'A');
    await d.getByRole('button', { name: /50:50 — / }).click();
    await d.waitForTimeout(1500);
    const before = await timerSeconds(d);
    await d.reload();
    await expect(d.getByText(Q[0].text)).toBeVisible();
    await expect(d.getByText('— removed (50:50) —')).toHaveCount(2);
    const after = await timerSeconds(d);
    expect(after).toBeLessThanOrEqual(before);
    expect(after).toBeGreaterThanOrEqual(before - 3);
    await expect(d.getByText(`Question 1 / ${TOTAL}`)).toBeVisible();
  });

  test('End Game and Reset both require confirmation', async ({ context }) => {
    const d = await startSingleScreen(context);
    await answerCorrect(d, 0, 'A');
    await d.getByRole('button', { name: 'Reset' }).click();
    await expect(d.getByRole('alertdialog')).toBeVisible();
    await d.getByRole('button', { name: 'Cancel' }).click();
    expect(await scoreOf(d, NAME_A)).toBe(10); // accidental reset avoided
    await d.getByRole('button', { name: 'Reset' }).click();
    await d.getByRole('button', { name: 'Yes, reset' }).click();
    await expect(d.getByText(`Question 1 / ${TOTAL}`)).toBeVisible();
    expect(await scoreOf(d, NAME_A)).toBe(0);

    await pickTeam(d, 'A');
    await d.getByRole('button', { name: /End Game/ }).click();
    await expect(d.getByRole('alertdialog')).toBeVisible();
    await d.getByRole('button', { name: 'Yes, end the game' }).click();
    await expect(d.getByText('Game ended early')).toBeVisible();
    await expect(d.getByTestId('winner-announcement')).toContainText('TIE');
    await expect(d.getByRole('button', { name: /Start tie-breaker/ })).toHaveCount(0); // ended early → none
  });

  test('works when localStorage throws (privacy mode): playable on one screen, with a visible warning', async ({ context }) => {
    const page = await context.newPage();
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new Error('blocked');
      };
      Storage.prototype.getItem = () => {
        throw new Error('blocked');
      };
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.getByRole('radio', { name: /Class 9/ }).click();
    await page.getByLabel('Team A name').fill(NAME_A);
    await page.getByLabel('Team B name').fill(NAME_B);
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText(Q[0].text)).toBeVisible();
    await expect(page.getByText(/Saving\/sync is unavailable/)).toBeVisible();
    await pickTeam(page, 'A');
    await optionButton(page, Q[0].correctIndex).click();
    expect(await scoreOf(page, NAME_A)).toBe(10);
    expect(errors).toEqual([]);
  });
});
