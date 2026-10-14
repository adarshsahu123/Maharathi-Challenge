import { expect, type BrowserContext, type Page } from '@playwright/test';
import { class9Questions } from '../src/data/questions/class9';

export const NAME_A = 'Arjun';
export const NAME_B = 'Karna';
export const L = 'ABCD';

/** Opens the app, sets up a Class 9 game, and returns teacher + display pages in ONE browser context. */
export async function startGame(context: BrowserContext, opts: { withDisplay?: boolean } = {}) {
  const teacher = await context.newPage();
  await teacher.goto('/');
  await teacher.getByRole('button', { name: 'Start Game' }).click();
  await teacher.getByRole('radio', { name: /Class 9/ }).click();
  await teacher.getByLabel('Team A name').fill(NAME_A);
  await teacher.getByLabel('Team B name').fill(NAME_B);
  await teacher.getByRole('button', { name: 'Start Game' }).click();
  await expect(teacher).toHaveURL(/#\/display/); // single-screen play view
  await teacher.evaluate(() => {
    window.location.hash = '/teacher'; // this tab becomes the optional Teacher Panel
  });
  await expect(teacher.getByText('Student Display:')).toBeVisible();
  let display: Page | undefined;
  if (opts.withDisplay !== false) {
    display = await context.newPage();
    await display.goto('/#/display');
    await expect(display.getByText(class9Questions[0].text)).toBeVisible();
  }
  return { teacher, display: display as Page };
}

/** Single-screen mode: the whole game is played from the Student Display (no teacher tab). */
export async function startSingleScreen(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Game' }).click();
  await page.getByRole('radio', { name: /Class 9/ }).click();
  await page.getByLabel('Team A name').fill(NAME_A);
  await page.getByLabel('Team B name').fill(NAME_B);
  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page).toHaveURL(/#\/display/);
  await expect(page.getByText(class9Questions[0].text)).toBeVisible();
  return page;
}

export const optionButton = (teacher: Page, index: number) => teacher.getByRole('button', { name: new RegExp(`^Option ${L[index]}:`) });

export async function pickTeam(teacher: Page, team: 'A' | 'B') {
  await teacher.getByRole('button', { name: team === 'A' ? NAME_A : NAME_B, exact: true }).first().click();
}

/**
 * The 30 s clock starts by itself as soon as the question appears, so "starting" an answer is just
 * choosing the team whose captain stood up first (while the clock counts).
 */
export async function startTimer(teacher: Page, team: 'A' | 'B') {
  await pickTeam(teacher, team);
}

/** Reads the countdown out of the aria-label of the timer. */
export async function timerSeconds(page: Page): Promise<number> {
  const label = (await page.getByRole('timer').getAttribute('aria-label')) ?? '';
  const m = label.match(/(\d+) seconds/);
  if (!m) throw new Error(`No seconds in timer label: ${label}`);
  return Number(m[1]);
}

export async function scoreOf(page: Page, name: string): Promise<number> {
  const label = (await page.getByRole('region', { name: new RegExp(`^${name} score`) }).getAttribute('aria-label')) ?? '';
  return Number(label.match(/score (\d+)/)![1]);
}

export const wrongIndex = (qIndex: number) => [0, 1, 2, 3].find((i) => i !== class9Questions[qIndex].correctIndex)!;

/** Starts the timer for `team` and clicks the correct option (judged immediately). */
export async function answerCorrect(teacher: Page, qIndex: number, team: 'A' | 'B') {
  await startTimer(teacher, team);
  await optionButton(teacher, class9Questions[qIndex].correctIndex).click();
}

export async function nextQuestion(teacher: Page) {
  await teacher.getByRole('button', { name: /Next question|View final result/ }).click();
}

/** Text of the page with the question content (Hindi + English) removed. */
export async function chromeText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[aria-label="Question"], [data-testid="answer-block"]').forEach((n) => n.remove());
    return clone.innerText;
  });
}
