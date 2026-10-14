/** The parts of a browser speech voice that we need (kept minimal so this can be tested without a browser). */
export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
}

export interface SpokenPart {
  text: string;
  voice?: VoiceLike;
  lang: string;
  /** Always the normal pitch (1). */
  pitch: number;
}

const DEVANAGARI = /[ऀ-ॿ]/;
const LATIN = /^[\p{Script=Latin}\p{N}\s.'’&-]+$/u;

type NameKind = 'latin' | 'devanagari' | 'other';
const kindOf = (name: string): NameKind => (DEVANAGARI.test(name) ? 'devanagari' : LATIN.test(name.trim()) ? 'latin' : 'other');

// Browsers do not say whether a voice is male, so the names of the common voices are used.
const FEMALE = /female|woman|heera|kalpana|zira|hazel|susan|linda|catherine|neerja|swara|aria|jenny|samantha|karen|fiona|google|veena|lekha|priya|aditi/i;
const MALE = /\bmale\b|\bman\b|ravi|hemant|prabhat|rishi|madhur|david|mark|george|james|daniel|alex|guy|christopher|eric|ryan|thomas|richard|sean|rishabh/i;
export const isMaleVoice = (v: VoiceLike): boolean => !FEMALE.test(v.name) && MALE.test(v.name);

/** The voice is left at its normal, natural tone. */
export const NORMAL_PITCH = 1;
const pitchFor = (): number => NORMAL_PITCH;

/** Local voices work offline; online ones only count while there is internet. Males first, then local ones. */
function ranked(all: VoiceLike[], online: boolean): VoiceLike[] {
  const score = (v: VoiceLike) => (isMaleVoice(v) ? 0 : 2) + (v.localService !== false ? 0 : 1);
  return all.filter((v) => v.localService !== false || online).sort((a, b) => score(a) - score(b));
}

/**
 * Plans the spoken congratulation so it says what the screen says — "Congratulations, <name>! What a brilliant game.
 * You are our Maharathi!" — in a normal-toned voice with an Indian accent:
 *  1. an Indian-English voice (en-IN) reads it; a Hindi-script name is handed to a Hindi voice;
 *  2. otherwise a Hindi voice (hi-IN) reads the same words written in Devanagari (so the accent is Hindi);
 *  3. otherwise any English voice, then the browser's default.
 * A male voice is chosen whenever the computer has one. The tone is never altered.
 * A name the chosen voice cannot read (e.g. Arabic script) is replaced by "the winning team".
 */
export function planSpeech(name: string, all: VoiceLike[], online: boolean): SpokenPart[] {
  const voices = ranked(all, online);
  const indian = voices.find((v) => /^en[-_]IN/i.test(v.lang));
  const hindi = voices.find((v) => /^hi[-_]IN/i.test(v.lang));
  const english = voices.find((v) => /^en[-_](GB|AU)/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang));
  const kind = kindOf(name);
  const TAIL = 'What a brilliant game. You are our Maharathi!';
  const part = (text: string, voice: VoiceLike): SpokenPart => ({ text, voice, lang: voice.lang, pitch: pitchFor() });

  if (indian) {
    if (kind === 'latin') return [part(`Congratulations, ${name}! ${TAIL}`, indian)];
    if (kind === 'devanagari') return [part('Congratulations,', indian), part(name, hindi ?? indian), part(TAIL, indian)];
    return [part(`Congratulations to the winning team! ${TAIL}`, indian)];
  }

  if (hindi) {
    const who = kind === 'other' ? 'विजेता टीम' : name;
    return [part(`कॉन्ग्रैचुलेशंस, ${who}! व्हाट अ ब्रिलियंट गेम. यू आर अवर महारथी!`, hindi)];
  }

  if (english) {
    const who = kind === 'latin' ? `, ${name}` : ' to the winning team';
    return [part(`Congratulations${who}! What a brilliant game. You are our Maha Rathee!`, english)];
  }

  // no usable voice listed: let the browser choose, asking for Indian English
  const who = kind === 'latin' ? `, ${name}` : ' to the winning team';
  return [{ text: `Congratulations${who}! ${TAIL}`, lang: 'en-IN', pitch: pitchFor() }];
}
