# WHO IS OUR MAHARATHI? — ICT Classroom Quiz

*Think Fast. Answer Smart. Become a Maharathi!*

A two-team classroom quiz competition for ICT. One teacher runs the game from a **Teacher Control Panel**
on a single laptop while the class watches the **Student Display** on a projector (second browser tab/window).
Works fully offline after installation. No backend, database, login or external API.

Stack: React 18 · TypeScript · Vite · Tailwind CSS · Lucide icons. State is kept in `localStorage`.

---

## Install and run

Requires Node.js 18+ (tested with Node 24).

```bash
npm install        # once, needs internet only for this step
npm run dev        # development server  → http://localhost:5173
```

For classroom use the production build is steadier:

```bash
npm run build      # type-checks and builds into dist/
npm run preview    # serves the build        → http://localhost:4173
```

> Open the app through the URL above. Double-clicking `dist/index.html` (a `file://` address) does **not** work,
> because browsers block module scripts there.

## Running a game

**One screen is enough.** The Student Display is also the control screen (like a quiz-show host screen), so no second tab is needed.

1. Open the site in Chrome or Edge → **Start Game**.
2. Choose the class, type both team names, check the question set → **Start Game**. You land on the game screen.
3. For every question:
   1. The question appears and the **30-second clock starts by itself** — you press nothing.
   2. The captain who stands up first → click that team in the bar at the bottom *while the clock is counting*.
      (A wrong pick can be corrected until the first answer is judged.)
   3. **Click the option the team chose.** The app judges it at once:
      * **Correct** → the question's points go to that team; the correct answer and explanation are shown.
      * **Incorrect** → the option is marked ✗ and the question passes **automatically** to the other team (a steal)
        on the time that is left — the clock does not restart. If they are wrong too, nobody scores.
   4. **50:50** (once per team) removes two wrong options while that team is answering.
   5. If the clock reaches 0 press **Time's up — end question**. **Skip question** if nobody can answer.
      **Pause / Resume** at any time. **Next question** when ready.
4. After question 30 the Final Result appears. A tie offers a teacher-controlled tie-breaker.
5. Press **Hide controls** for a clean projector view; **Show controls** brings the bar back.
6. **Sound and effects** (Student Display only, all generated in the browser — no files, works offline):
   * the timer turns **red** and **beeps every second at 10 s and below** (higher pitch for the last 3 s, a long tone at 0);
   * a **right** answer plays a happy chime with a big 😄 for about a second; a **wrong** answer plays a low buzz with a big 😢;
   * when the **winner** is announced there is a party: spinning spotlight, fireworks, balloons, endless confetti, a bouncing trophy,
     scores that count up, and the banner "Congratulations, <winner>! What a brilliant game. You are our Maharathi!". In order:
     1. at once, a voice says exactly those words (see below), in its normal tone;
     2. **the instant the voice finishes** (no gap) the music: a fanfare, a victory song sung by a synthesized **choir ("aah")**
        over drums and bass, played twice (the second time bigger), and a huge final chord with a cymbal crash;
     3. right after the music, **applause** — a crowd murmur and hundreds of sharp claps, swelling to a roar and fading — with 👏
        floating up the screen. The tune waits for the voice however long it takes (a real Windows voice can take ~1–2 s to
        begin and ~7–9 s to speak); if the voice never starts at all, the music starts after 5 seconds.
     A tie gets none of this.
   * the **Sound on / Sound off** button in the bar mutes everything (the red timer and emoji still show). Browsers only allow sound
     after one click on the page, which always happens when you start a game. Nothing replays when you refresh the page, and leaving the
     results screen cuts the music and the voice off at once.

   **About the voice.** It is the voice your computer/browser provides, so it needs no internet, and it is always spoken in its normal tone
   and speed. The app prefers, in this order: an Indian-English voice (en-IN) → a Hindi voice (hi-IN, reading the line in Devanagari so it
   has a Hindi accent) → any English voice, and a **male** voice if there is one (Windows: *Microsoft Ravi* / *Hemant* / *David* / *Mark*).
   A Hindi-script team name is read by the Hindi voice. Online-only (Google) voices are used only while you are online, because they can
   stall offline. To get a better voice on Windows, add *English (India)* and *Hindi* under Settings → Time & language → Speech.

   **About the tune.** Browsers cannot sing real lyrics offline, so the "singing" is a synthesized choir singing "aah" on the melody and
   the final chord. The music is original (no copyrighted tune) and is measured by an automated test (`e2e/audio.spec.ts`), which renders it
   offline and checks it is audible, does not distort, has no silent gap at the start, and that the applause is loud enough.

## Rules implemented (in `src/game/engine.ts`)

| Rule | Value |
|---|---|
| Questions | 30 = 8 Easy (10 pts) + 14 Intermediate (20 pts) + 8 Hard (30 pts); max 600 per team |
| Wrong answer / skip | 0 points, no negative marking |
| Timer | 30 s per question, starts automatically when the question appears (team is picked while it counts); timestamp-based so it stays exact in background tabs |
| Steal | automatic after a wrong answer, one per question, uses only the leftover time of the same 30 s |
| 50:50 | one per team per game, removes exactly two wrong options, usable only during that team's active answering |
| Tie | optional extra Hard question; it is recorded separately and never changes the 20-question history |

All rules live in one pure reducer; both screens read the same single state, so the teacher and the display cannot disagree.

**If the celebration sounds wrong** on a particular computer, open the Student Display, press F12 → Console after a winner is
announced and type `__maharathiAudio.status()`. It shows what happened (when the voice started and finished, when the music
started, the audio engine state) and the current output level.

## Adding or editing question banks

Questions are plain TypeScript data in `src/data/questions/`. The game engine never needs to change.

* Edit wording of the Class 9 questions: open `src/data/questions/class9.ts`.
* Add a class: copy `class9.ts` to e.g. `class10.ts`, change the ids/`classLevel`/content, then in
  `src/data/banks.ts` import it and replace the matching `placeholder(10)` entry.
* A question needs: `id`, `classLevel`, `topic`, `text`, four distinct `options`, `correctIndex` (0 = A … 3 = D),
  `explanation`, `difficulty`, `points`, and `removableIndices` — **two wrong options** that 50:50 may remove.
* Order each bank Easy → Intermediate → Hard with exactly 8 / 14 / 8 questions (30 in total). Optional `needsReview: true` marks a question the teacher still has to verify.
* Optional `tiebreakers`: extra **Hard** questions.
* Set `status` to `'approved'` once the teacher has verified a bank (`'draft'` shows a warning chip in the app).

The data is validated when a game starts (`src/game/validation.ts`). A bad bank shows a readable message on the
setup screen and the game refuses to start — it never runs with a broken question. Classes without a bank
(10, 11, 12 for now) show "सवाल उपलब्ध नहीं" and cannot be started.

## Tests and checks

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm test             # 108 unit tests: engine rules, scoring, timer, 50:50, question data, storage, speech choice
npm run test:e2e     # 70+ browser tests (builds, then drives a real Chrome: single screen, two screens, language,
                     # recovery, sound effects, the winner celebration, and an offline measurement of the music)
npm run test:voice   # opens a visible, MUTED Chrome window and runs the winner celebration with this computer's real
                     # voice: checks voice → tune (no gap, no dropouts) → applause. Headless Chrome has no voices.
```

`test:e2e` uses the Chrome installed on the machine (`channel: 'chrome'` in `playwright.config.ts`).

## Project structure

```
src/
  game/        types · constants · validation · engine (all rules) · view (what the projector may see)
               status · storage (localStorage + validation) · store (shared session, cross-tab sync)
  data/        banks.ts (registry) · questions/class9.ts
  components/  QuestionCard · AnswerOption · TeamScoreboard · CountdownTimer · LifelineButton · GameControls
               AnswerReveal · ResultsScreen · InstructionsModal · ConfirmDialog · Confetti · Brand
  pages/       HomePage · GameSetup · StudentDisplay (game + controls) · TeacherDashboard (optional) · ResultsPage
  hooks/       useGame (store, clock, hash router)
tests/         Vitest unit tests        e2e/   Playwright browser tests
```

## Known limitations

* Question text is edited in the source files; there is no in-app editor yet.
* Questions c9-q21 … c9-q30 (10 of the 30) and the tie-breaker were **written by the developer**, not supplied by the teacher — the Teacher Panel flags them "please verify"; the tie-breaker is a **developer-written draft** (flagged in the app) — replace it with an approved one.
* Class 10–12 have no questions yet.
* Teacher and student tabs must share one browser profile. The answer key is stored in `localStorage`
  (the projector tab never *shows* it early, but someone opening DevTools on that laptop could read it).
* Any open game screen stops an expired clock; keep at least one open. (Time itself is computed from timestamps, so it is never wrong.)
* The interface is in English; only the questions, options and explanations use Hindi + English.
* A click on an option is final (there is no undo), so click carefully.
* Sound plays only on the Student Display tab (so two open screens never double it) and needs one click on the page first (browser rule).
* The voice depends on what the computer provides; the app cannot install voices. Automated tests use a stand-in voice, so the real voice should be checked by ear once.
* Tested in Chrome only (see the final report for what was not tested).
