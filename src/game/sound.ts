import type { BeepKind } from './beep';
import { planSpeech, type VoiceLike } from './speech';

/**
 * Tiny offline sound engine (Web Audio oscillators — no audio files, nothing to download).
 * Browsers only allow sound after the user has clicked or pressed a key once, so the audio
 * context is created on the first such gesture. The game never depends on sound.
 */
type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function ensure(): AudioContext | null {
  try {
    if (!ctx) {
      const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  const unlock = () => void ensure();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/** One note. `when` is an absolute time on the audio clock. */
function note(c: BaseAudioContext, dest: AudioNode, type: OscillatorType, freq: number, when: number, seconds: number, volume: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.01);
  gain.gain.linearRampToValueAtTime(0.0001, when + seconds);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + seconds + 0.02);
}

/** A beep / chime on the live context, `delay` seconds from now. */
function tone(frequency: number, seconds: number, type: OscillatorType, volume: number, delay = 0) {
  const c = ensure();
  if (!c) return;
  try {
    note(c, c.destination, type, frequency, c.currentTime + delay, seconds, volume);
  } catch {
    /* sound is optional */
  }
}

export function playBeep(kind: BeepKind) {
  if (kind === 'tick') tone(880, 0.1, 'sine', 0.35);
  else if (kind === 'urgent') tone(1175, 0.16, 'square', 0.22);
  else tone(330, 0.8, 'square', 0.3); // time is up
}

/** Right = a cheerful rising chime; wrong = a low, falling buzz. */
export function playAnswerSound(kind: 'right' | 'wrong') {
  if (kind === 'right') {
    tone(523.25, 0.2, 'triangle', 0.32, 0); // C5
    tone(659.25, 0.2, 'triangle', 0.32, 0.12); // E5
    tone(783.99, 0.45, 'triangle', 0.32, 0.24); // G5
  } else {
    tone(233, 0.3, 'sawtooth', 0.22, 0);
    tone(165, 0.55, 'sawtooth', 0.22, 0.25);
  }
}

// ───────────────────────── the winner's celebration ─────────────────────────
//
// When the winner appears on screen, in this order and with no gap:
//   1. a voice says "Congratulations, <winner>! What a brilliant game. You are our Maharathi!"
//   2. the INSTANT the voice finishes, the celebration music starts:
//        +  0 –  4 s    grand fanfare           (brass-like call and answer)
//        +4.2 – 10.6    the victory song        (melody + a CHOIR singing "aah" + pad + bass + drums)
//        +10.6 – 17.0   the song again, BIGGER  (harmony, choir in thirds, busier drums)
//        +16.2 – 17.0   timpani roll
//        +17.0 – 19.4   the huge final chord    (choir + cymbal crash)
//   3. after the music, APPLAUSE   (+19.5 – 27.5: a crowd murmur and hundreds of sharp claps, swelling, then fading)
//
// The music is scheduled on the audio clock the moment the voice ends (or after a safety delay if the voice never reports
// that it ended). Everything goes through one master volume and a compressor (many notes together never distort), so it
// can be cut instantly if the teacher leaves the results screen.

/** How long the voice is expected to take; only used to time the on-screen clapping hands (the sound itself follows the voice exactly). */
const VOICE_ESTIMATE = 4.8;
const APPLAUSE_AFTER_MUSIC = 19.5;
export const APPLAUSE_START = VOICE_ESTIMATE + APPLAUSE_AFTER_MUSIC;
export const APPLAUSE_SECONDS = 8;
export const CELEBRATION_SECONDS = APPLAUSE_START + APPLAUSE_SECONDS;
/** The voice starts this long after the winner appears. */
const VOICE_AT = 0.3;
/**
 * Measured on Windows Chrome: a real voice can take ~2 s to begin and ~7 s to say the sentence, and Chrome does not
 * always report the end. So the tune starts the moment ANY of these says the voice is over:
 *   - Chrome's "end" event,
 *   - Chrome's speechSynthesis.speaking flag turning off,
 *   - the voice never starting within VOICE_START_LIMIT seconds,
 *   - the voice still going VOICE_MAX seconds after it started (a stuck engine).
 */
const VOICE_START_LIMIT = 5;
const VOICE_MAX = 15;

/** The opening fanfare: [frequency Hz, start in seconds, length in seconds]. */
const FANFARE: ReadonlyArray<readonly [number, number, number]> = [
  [392.0, 0.0, 0.16],
  [523.25, 0.18, 0.16],
  [659.25, 0.36, 0.16],
  [783.99, 0.54, 0.5],
  [659.25, 1.15, 0.16],
  [783.99, 1.33, 0.16],
  [1046.5, 1.51, 0.7],
  [880.0, 2.35, 0.16],
  [783.99, 2.53, 0.16],
  [880.0, 2.71, 0.16],
  [1046.5, 2.89, 0.9],
];

const BEAT = 0.4;
const BARS = 4;
const JIG_BEATS = BARS * 4;
const JIG1_AT = 4.2;
const JIG2_AT = JIG1_AT + JIG_BEATS * BEAT; // 10.6
const FINAL_AT = JIG2_AT + JIG_BEATS * BEAT; // 17.0
// [frequency Hz, start beat, length in beats] — 4 bars of 4 beats (a catchy rising tune in C major)
const JIG: ReadonlyArray<readonly [number, number, number]> = [
  [659.25, 0, 0.5], [783.99, 0.5, 0.5], [1046.5, 1, 1], [987.77, 2, 0.5], [783.99, 2.5, 0.5], [880.0, 3, 1],
  [783.99, 4, 0.5], [659.25, 4.5, 0.5], [587.33, 5, 0.5], [659.25, 5.5, 0.5], [783.99, 6, 1], [659.25, 7, 1],
  [880.0, 8, 0.5], [880.0, 8.5, 0.5], [1046.5, 9, 1], [987.77, 10, 0.5], [880.0, 10.5, 0.5], [783.99, 11, 1],
  [659.25, 12, 0.5], [783.99, 12.5, 0.5], [880.0, 13, 0.5], [783.99, 13.5, 0.5], [1046.5, 14, 2],
];
// the notes of the C-major scale, used to add a harmony a third below the tune
const SCALE = [349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
const thirdBelow = (freq: number): number => {
  const i = SCALE.findIndex((f) => Math.abs(f - freq) < 0.5);
  return i >= 2 ? SCALE[i - 2] : freq / 1.25;
};
// bass: one note every 2 beats (C - G - F - C/G), and the chord pad under each bar
const BASS = [130.81, 130.81, 98.0, 98.0, 87.31, 87.31, 130.81, 98.0];
const PAD: ReadonlyArray<ReadonlyArray<number>> = [
  [261.63, 329.63, 392.0], // C
  [196.0, 246.94, 293.66], // G
  [174.61, 220.0, 261.63], // F
  [261.63, 329.63, 392.0], // C
];
/** The huge final chord (C major, wide). */
const FINAL_CHORD: ReadonlyArray<number> = [130.81, 261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
const CHOIR_CHORD: ReadonlyArray<number> = [523.25, 659.25, 783.99, 1046.5];

let master: GainNode | null = null;
let masterOut: AudioNode | null = null;
let speechTimer: number | undefined;
/** True from the start of a celebration until it is stopped, so stopCelebration() is a no-op during normal play. */
let celebrating = false;
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(c: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(c);
  if (cached) return cached;
  const length = Math.floor(c.sampleRate * 2);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseCache.set(c, buffer);
  return buffer;
}

/** A burst of noise through its own filter — used only for the one cymbal crash. */
function noiseBurst(c: BaseAudioContext, dest: AudioNode, when: number, seconds: number, volume: number, filter: BiquadFilterType, freq: number, q: number) {
  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.004);
  gain.gain.linearRampToValueAtTime(0.0001, when + seconds);
  source.connect(f);
  f.connect(gain);
  gain.connect(dest);
  source.start(when, Math.random() * 0.5, seconds + 0.02);
}

const crash = (c: BaseAudioContext, dest: AudioNode, when: number) => noiseBurst(c, dest, when, 1.8, 0.13, 'highpass', 5200, 0.6);

/** A drum: a falling sine (a deeper, slower one is a timpani). */
function kick(c: BaseAudioContext, dest: AudioNode, when: number, volume = 0.5, from = 160, to = 45) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, when);
  osc.frequency.exponentialRampToValueAtTime(to, when + 0.14);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.005);
  gain.gain.linearRampToValueAtTime(0.0001, when + 0.2);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + 0.22);
}

// the formants (centre Hz, sharpness, level) that turn a buzzing wave into the vowel "aah"
const AH: ReadonlyArray<readonly [number, number, number]> = [
  [800, 7, 1.0],
  [1150, 9, 0.55],
  [2800, 11, 0.3],
];

/**
 * SHARED filters. Every sung note, clap and drum goes into one of these instead of building its own filters and vibrato.
 * (Building them per note made ~4,000 audio nodes — measured as more work than a computer can do in real time, so the
 * sound dropped out. Shared, the same sound costs about a fifth.)
 */
interface Buses {
  /** → the vowel "aah" formant filters (one set for the whole choir) */
  choir: GainNode;
  /** one gentle vibrato shared by every choir voice (it is connected to each voice's detune) */
  vibrato: GainNode;
  /** → band-pass filters at three pitches, so the claps do not all sound the same */
  claps: GainNode[];
  snare: GainNode;
  hat: GainNode;
}

function filterBus(c: BaseAudioContext, dest: AudioNode, type: BiquadFilterType, freq: number, q: number): GainNode {
  const input = c.createGain();
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  input.connect(f);
  f.connect(dest);
  return input;
}

function makeBuses(c: BaseAudioContext, dest: AudioNode, from: number, seconds: number): Buses {
  const choir = c.createGain();
  for (const [hz, q, level] of AH) {
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = hz;
    band.Q.value = q;
    const g = c.createGain();
    g.gain.value = level;
    choir.connect(band);
    band.connect(g);
    g.connect(dest);
  }
  const lfo = c.createOscillator();
  lfo.frequency.value = 5.4;
  const vibrato = c.createGain();
  vibrato.gain.value = 9; // cents
  lfo.connect(vibrato);
  lfo.start(from);
  lfo.stop(from + seconds);
  return {
    choir,
    vibrato,
    claps: [filterBus(c, dest, 'bandpass', 1700, 1.1), filterBus(c, dest, 'bandpass', 2500, 1.1), filterBus(c, dest, 'bandpass', 3400, 1.1)],
    snare: filterBus(c, dest, 'highpass', 1600, 0.7),
    hat: filterBus(c, dest, 'highpass', 6800, 0.7),
  };
}

/** A short burst of noise into an already-filtered bus: a clap, a snare or a hi-hat (just 2 nodes each). */
function hit(c: BaseAudioContext, bus: AudioNode, when: number, seconds: number, volume: number) {
  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.004);
  gain.gain.linearRampToValueAtTime(0.0001, when + seconds);
  source.connect(gain);
  gain.connect(bus);
  source.start(when, Math.random() * 0.5, seconds + 0.02);
}

/** A choir voice singing "aah": two slightly detuned buzzing waves, into the shared vowel filters and vibrato. */
function sing(c: BaseAudioContext, b: Buses, freq: number, when: number, seconds: number, volume: number) {
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.07);
  gain.gain.linearRampToValueAtTime(volume * 0.8, when + Math.max(0.08, seconds - 0.1));
  gain.gain.linearRampToValueAtTime(0.0001, when + seconds + 0.1);
  gain.connect(b.choir);
  for (const detune of [-8, 8]) {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    b.vibrato.connect(osc.detune);
    osc.connect(gain);
    osc.start(when);
    osc.stop(when + seconds + 0.15);
  }
}

/** A soft crowd murmur under the clapping: low-passed noise that swells and fades. */
function crowd(c: BaseAudioContext, dest: AudioNode, when: number, seconds: number, peak: number) {
  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 900;
  f.Q.value = 0.5;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(peak, when + seconds * 0.45);
  gain.gain.linearRampToValueAtTime(0.0001, when + seconds);
  source.connect(f);
  f.connect(gain);
  gain.connect(dest);
  source.start(when, 0, seconds + 0.05);
}

/**
 * Something to play at a time on the audio clock. The celebration is a list of ~2,000 of these; they are only turned
 * into real audio nodes about 2 seconds before they sound, so the computer never juggles thousands of them at once.
 */
interface Job {
  at: number;
  run: () => void;
}
type Later = (at: number, run: () => void) => void;
const immediately: Later = (_at, run) => run();
/** How far ahead of time sounds are prepared. */
const LOOKAHEAD = 2;

/** Describes the whole musical part (no voice) on any audio context, live or offline. */
function scheduleCelebration(c: BaseAudioContext, lead = 0, later: Later = immediately): { master: GainNode; out: AudioNode; t0: number } {
  const out = c.createDynamicsCompressor();
  out.threshold.value = -22;
  out.knee.value = 24;
  out.ratio.value = 8;
  out.attack.value = 0.003;
  out.release.value = 0.25;
  out.connect(c.destination);
  if (c === ctx) {
    // a level meter on the live output, so a diagnostic can confirm the music is really playing
    try {
      meter = c.createAnalyser();
      meter.fftSize = 2048;
      out.connect(meter);
    } catch {
      meter = null;
    }
  }
  const m = c.createGain();
  m.gain.value = 0.85;
  m.connect(out);
  const t0 = c.currentTime + 0.05 + lead;
  const at = (x: number) => t0 + x;
  const L = (x: number, run: () => void) => later(at(x), run);
  const b = makeBuses(c, m, t0, FINAL_AT + 3);

  // 1. grand fanfare: a clear, bright lead (a triangle with a little square for brass)
  for (const [freq, start, len] of FANFARE) {
    L(start, () => {
      note(c, m, 'triangle', freq, at(start), len, 0.3);
      note(c, m, 'square', freq, at(start), len, 0.06);
    });
  }

  // 2 + 3. the victory song, twice — the second time bigger
  for (let round = 0; round < 2; round++) {
    const base = round === 0 ? JIG1_AT : JIG2_AT;
    for (const [freq, beat, beats] of JIG) {
      const start = base + beat * BEAT;
      const len = Math.max(0.12, beats * BEAT * 0.92);
      L(start, () => {
        const when = at(start);
        note(c, m, 'triangle', freq, when, len, 0.24);
        note(c, m, 'square', freq, when, len, 0.04);
        sing(c, b, freq, when, len, round === 0 ? 0.2 : 0.32); // the choir sings the tune
        if (round === 1) {
          note(c, m, 'triangle', thirdBelow(freq), when, len, 0.11); // harmony
          sing(c, b, thirdBelow(freq), when, len, 0.2); // the choir in thirds
          note(c, m, 'sine', freq * 2, when, len, 0.05); // sparkle an octave up
        }
      });
    }
    PAD.forEach((chord, bar) => {
      const start = base + bar * 4 * BEAT;
      L(start, () => chord.forEach((freq) => note(c, m, 'triangle', freq, at(start), 4 * BEAT * 0.98, round === 1 ? 0.05 : 0.035)));
    });
    BASS.forEach((freq, i) => {
      const start = base + i * 2 * BEAT;
      L(start, () => note(c, m, 'triangle', freq, at(start), BEAT * 1.8, 0.2));
    });
    for (let beat = 0; beat < JIG_BEATS; beat++) {
      const start = base + beat * BEAT;
      L(start, () => {
        const when = at(start);
        kick(c, m, when, 0.4);
        if (beat % 2 === 1) hit(c, b.snare, when, 0.1, 0.16); // snare on 2 and 4
        hit(c, b.hat, when + BEAT / 2, 0.035, 0.05); // hi-hat on the off-beat
        if (round === 1) {
          hit(c, b.hat, when + BEAT / 4, 0.025, 0.03); // busier: 16th hi-hats
          hit(c, b.hat, when + (3 * BEAT) / 4, 0.025, 0.03);
        }
      });
    }
  }

  // 4. timpani roll building into the finish
  L(FINAL_AT - 0.8, () => {
    for (let i = 0; i < 8; i++) kick(c, m, at(FINAL_AT - 0.8 + i * 0.1), 0.2 + i * 0.04, 110, 60);
  });

  // 5. the huge final chord: instruments, the choir and a cymbal crash, with a rising sparkle
  L(FINAL_AT, () => {
    crash(c, m, at(FINAL_AT));
    for (const freq of FINAL_CHORD) {
      note(c, m, 'triangle', freq, at(FINAL_AT), 2.4, 0.13);
      note(c, m, 'sine', freq / 2, at(FINAL_AT), 2.4, 0.08);
    }
    for (const freq of CHOIR_CHORD) sing(c, b, freq, at(FINAL_AT), 2.3, 0.26);
    [1046.5, 1318.5, 1568.0, 2093.0].forEach((freq, i) => note(c, m, 'triangle', freq, at(FINAL_AT + 0.05 + i * 0.09), 0.7, 0.1));
  });

  // 6. applause: a crowd murmur plus MANY short, sharp claps. It starts audible, swells to a full-house roar and then
  //    fades. (Levels were measured offline: the claps are short, narrow-band bursts, so they need a high gain.)
  L(APPLAUSE_AFTER_MUSIC, () => crowd(c, m, at(APPLAUSE_AFTER_MUSIC), APPLAUSE_SECONDS, 0.5));
  const claps = 720;
  for (let i = 0; i < claps; i++) {
    const offset = Math.pow(Math.random(), 0.85) * APPLAUSE_SECONDS;
    const progress = offset / APPLAUSE_SECONDS;
    const envelope = Math.max(0.3, Math.sin(Math.PI * progress) ** 0.7); // clear from the start → peak → fade
    const volume = (0.3 + 0.5 * Math.random()) * envelope;
    const length = 0.022 + Math.random() * 0.03;
    const bus = b.claps[i % b.claps.length];
    const start = APPLAUSE_AFTER_MUSIC + offset;
    L(start, () => hit(c, bus, at(start), length, volume));
  }
  return { master: m, out, t0 };
}

/** Collects jobs, sorted by time, and hands out the ones due before a given time. */
function jobQueue() {
  const jobs: Job[] = [];
  let next = 0;
  return {
    later: ((at, run) => jobs.push({ at, run })) as Later,
    sort: () => jobs.sort((x, y) => x.at - y.at),
    runUntil(until: number) {
      while (next < jobs.length && jobs[next].at <= until) {
        try {
          jobs[next].run();
        } catch {
          /* one failed note must not stop the rest */
        }
        next++;
      }
      return next >= jobs.length;
    },
    get size() {
      return jobs.length;
    },
  };
}

/** Stops the celebration at once (leaving the results screen, muting the sound). */
export function stopCelebration() {
  if (!celebrating) return;
  celebrating = false;
  celebrationToken++;
  clearVoiceTimers();
  speaking = [];
  log('stopped');
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* speech is optional */
  }
  if (!master || !ctx) return;
  const m = master;
  const out = masterOut;
  master = null;
  masterOut = null;
  try {
    m.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    window.setTimeout(() => {
      try {
        m.disconnect();
        out?.disconnect();
      } catch {
        /* already gone */
      }
    }, 400);
  } catch {
    /* sound is optional */
  }
}

let celebrationToken = 0;
let meter: AnalyserNode | null = null;
/** Utterances are kept referenced while they speak: Chrome can otherwise garbage-collect them and never fire "end". */
let speaking: SpeechSynthesisUtterance[] = [];
/** What happened during the last celebration (seconds after it started) — shown by diagnostics, never to students. */
const trace: string[] = [];
let traceStart = 0;
const log = (event: string) => {
  trace.push(`${((performance.now() - traceStart) / 1000).toFixed(2)}s ${event}`);
  if (trace.length > 50) trace.shift();
};

let voiceWatch: number | undefined;
let pump: number | undefined;
let voiceLimit: number | undefined;

function clearVoiceTimers() {
  window.clearTimeout(speechTimer);
  window.clearInterval(pump);
  window.clearTimeout(voiceLimit);
  window.clearInterval(voiceWatch);
}

/** The congratulation, in a normal-toned voice (a male one if the computer has it), saying what the screen says. */
function congratulate(winnerName: string, onFinished: (why: string) => void) {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    log('no speech engine in this browser');
    speechTimer = window.setTimeout(() => onFinished('no voice'), VOICE_AT * 1000); // straight to the music
    return;
  }
  synth.getVoices(); // starts loading the voice list early
  let finished = false;
  const done = (why: string) => {
    if (finished) return;
    finished = true;
    clearVoiceTimers();
    speaking = [];
    log(`voice finished (${why})`);
    onFinished(why);
  };
  speechTimer = window.setTimeout(() => {
    try {
      const plan = planSpeech(winnerName, synth.getVoices() as VoiceLike[], navigator.onLine);
      // Only clear the queue if something is actually stuck in it: cancelling right before speaking makes some
      // Chrome/Windows versions drop or mis-report the next sentence.
      if (synth.speaking || synth.pending) synth.cancel();
      if (synth.paused) synth.resume();
      speaking = plan.map((part, i) => {
        const words = new SpeechSynthesisUtterance(part.text);
        words.lang = part.lang;
        words.rate = 1;
        words.pitch = part.pitch;
        words.volume = 1;
        if (part.voice) words.voice = part.voice as SpeechSynthesisVoice;
        if (i === 0) {
          words.onstart = () => {
            log(`voice started (${part.voice?.name ?? 'browser default'})`);
            // it has started: now allow it the time it needs, but never forever
            window.clearTimeout(voiceLimit);
            voiceLimit = window.setTimeout(() => done('voice ran too long'), VOICE_MAX * 1000);
          };
        }
        if (i === plan.length - 1) {
          words.onend = () => done('end'); // the music starts the instant the voice finishes
          words.onerror = (e) => done(`error: ${(e as SpeechSynthesisErrorEvent).error ?? 'unknown'}`);
        }
        return words;
      });
      log(`speaking ${speaking.length} part(s)`);
      for (const words of speaking) synth.speak(words);
      // If the voice never even starts, do not keep the class waiting.
      voiceLimit = window.setTimeout(() => done('voice never started'), VOICE_START_LIMIT * 1000);
      // Chrome does not always fire "end", so also watch its speaking flag.
      const askedAt = performance.now();
      let wasBusy = false;
      voiceWatch = window.setInterval(() => {
        const busy = synth.speaking || synth.pending;
        if (busy) wasBusy = true;
        else if (wasBusy && performance.now() - askedAt > 400) done('stopped speaking');
      }, 150);
    } catch (e) {
      done(`exception: ${String(e)}`);
    }
  }, VOICE_AT * 1000);
}

/** Starts the music now, making sure the audio engine is running first. */
function startMusic(c: AudioContext, token: number) {
  const go = () => {
    if (token !== celebrationToken || !celebrating) {
      log('music skipped (the results screen was left)');
      return;
    }
    try {
      const queue = jobQueue();
      const scheduled = scheduleCelebration(c, 0.12, queue.later);
      queue.sort();
      master = scheduled.master;
      masterOut = scheduled.out;
      const pumpOnce = () => {
        if (token !== celebrationToken || !celebrating) {
          window.clearInterval(pump);
          return;
        }
        if (queue.runUntil(c.currentTime + LOOKAHEAD)) {
          window.clearInterval(pump);
          log('every sound prepared');
        }
      };
      pumpOnce();
      pump = window.setInterval(pumpOnce, 250);
      log(`music started (audio engine: ${c.state}, ${queue.size} sounds lined up)`);
    } catch (e) {
      log(`music failed: ${String(e)}`);
    }
  };
  if (c.state === 'running') go();
  else {
    log(`audio engine was ${c.state} — resuming it`);
    c.resume().then(go, go);
  }
}

/** The winner celebration: a voice congratulates, THEN the music and choir, THEN the applause — in that order. */
export function playVictoryCelebration(winnerName: string) {
  const c = ensure();
  if (!c) return;
  stopCelebration();
  celebrating = true;
  trace.length = 0;
  traceStart = performance.now();
  log(`celebration for ${winnerName} (audio engine: ${c.state})`);
  const token = ++celebrationToken;
  try {
    congratulate(winnerName, () => startMusic(c, token));
  } catch (e) {
    log(`celebration failed: ${String(e)}`);
  }
}

/** Diagnostics: how loud the live output is right now (0 = silent). */
function outputLevel(): number {
  if (!meter) return 0;
  const data = new Float32Array(meter.fftSize);
  meter.getFloatTimeDomainData(data);
  let sum = 0;
  for (const v of data) sum += v * v;
  return Math.sqrt(sum / data.length);
}

/**
 * Renders the whole celebration music offline (no speakers) and measures it: the loudest sample and the loudness of
 * every half second. Used by the automated tests to check the sound is audible, not distorted, and shaped as intended.
 */
async function measureCelebration(): Promise<{ peak: number; rms: number[]; window: number; work: number }> {
  const rate = 22050;
  const seconds = APPLAUSE_AFTER_MUSIC + APPLAUSE_SECONDS + 1.5;
  const offline = new OfflineAudioContext(1, Math.ceil(rate * seconds), rate);
  const began = performance.now();
  const queue = jobQueue();
  scheduleCelebration(offline, 0, queue.later);
  queue.sort();
  queue.runUntil(LOOKAHEAD);
  // prepare the next sounds every second while rendering, exactly like the live game does
  for (let t = 1; t < seconds; t += 1) {
    void offline.suspend(t).then(() => {
      queue.runUntil(t + LOOKAHEAD);
      return offline.resume();
    });
  }
  const data = (await offline.startRendering()).getChannelData(0);
  // seconds of computer work per second of sound (at this low sample rate; live audio needs about twice as much)
  const work = (performance.now() - began) / 1000 / seconds;
  const win = Math.floor(rate * 0.5);
  const rms: number[] = [];
  let peak = 0;
  for (let start = 0; start < data.length; start += win) {
    let sum = 0;
    const end = Math.min(data.length, start + win);
    for (let i = start; i < end; i++) {
      const v = data[i];
      sum += v * v;
      if (Math.abs(v) > peak) peak = Math.abs(v);
    }
    rms.push(Math.sqrt(sum / (end - start)));
  }
  return { peak, rms, window: 0.5, work };
}

if (typeof window !== 'undefined') {
  (window as unknown as { __maharathiAudio?: unknown }).__maharathiAudio = {
    measureCelebration,
    status: () => ({ trace: trace.slice(), engine: ctx?.state ?? 'none', level: outputLevel(), celebrating }),
  };
}

const SOUND_KEY = 'maharathi.sound';

export function loadSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundEnabled(on: boolean) {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}
