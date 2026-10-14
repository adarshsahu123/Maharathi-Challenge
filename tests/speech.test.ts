import { describe, expect, it } from 'vitest';
import { NORMAL_PITCH, isMaleVoice, planSpeech, type VoiceLike } from '../src/game/speech';

const enUS: VoiceLike = { name: 'Local English US', lang: 'en-US', localService: true };
const enGB: VoiceLike = { name: 'Local English UK', lang: 'en-GB', localService: true };
const enIN: VoiceLike = { name: 'Local English India', lang: 'en-IN', localService: true };
const hiIN: VoiceLike = { name: 'Local Hindi', lang: 'hi-IN', localService: true };
const heera: VoiceLike = { name: 'Microsoft Heera - English (India)', lang: 'en-IN', localService: true };
const ravi: VoiceLike = { name: 'Microsoft Ravi - English (India)', lang: 'en-IN', localService: true };
const hemant: VoiceLike = { name: 'Microsoft Hemant - Hindi (India)', lang: 'hi-IN', localService: true };
const kalpana: VoiceLike = { name: 'Microsoft Kalpana - Hindi (India)', lang: 'hi-IN', localService: true };
const googleUS: VoiceLike = { name: 'Google US English', lang: 'en-US', localService: false };
const googleHI: VoiceLike = { name: 'Google Hindi', lang: 'hi-IN', localService: false };
const googleIN: VoiceLike = { name: 'Google India English', lang: 'en-IN', localService: false };

const LINE = 'What a brilliant game. You are our Maharathi!';

describe('the spoken congratulation (says what the screen says, in a normal tone, male voice preferred, Indian accent)', () => {
  it('uses an Indian-English voice first and says exactly the words on the screen', () => {
    const plan = planSpeech('Ravi', [enUS, enGB, hiIN, enIN], true);
    expect(plan).toEqual([{ text: `Congratulations, Ravi! ${LINE}`, voice: enIN, lang: 'en-IN', pitch: NORMAL_PITCH }]);
  });

  it('chooses a MALE voice when the computer has one', () => {
    expect(isMaleVoice(ravi)).toBe(true);
    expect(isMaleVoice(hemant)).toBe(true);
    expect(isMaleVoice(heera)).toBe(false);
    expect(isMaleVoice(kalpana)).toBe(false);
    const plan = planSpeech('Arjun', [heera, ravi], true);
    expect(plan).toHaveLength(1);
    expect(plan[0].voice).toBe(ravi);
  });

  it('the tone is never altered: the pitch is always normal, whatever voice is used', () => {
    expect(NORMAL_PITCH).toBe(1);
    for (const voices of [[ravi], [heera], [hemant], [enUS], [], [googleIN]]) {
      for (const part of planSpeech('Arjun', voices, true)) expect(part.pitch).toBe(1);
    }
  });

  it('prefers a LOCAL voice over an online one of the same language', () => {
    expect(planSpeech('Ravi', [googleIN, enIN], true)[0].voice).toBe(enIN);
  });

  it('with no Indian-English voice, a Hindi voice (male first) reads the same words written in Devanagari', () => {
    const plan = planSpeech('Ravi', [enUS, kalpana, hemant], true);
    expect(plan).toEqual([{ text: 'कॉन्ग्रैचुलेशंस, Ravi! व्हाट अ ब्रिलियंट गेम. यू आर अवर महारथी!', voice: hemant, lang: 'hi-IN', pitch: NORMAL_PITCH }]);
  });

  it('a Hindi-script name is handed to the Hindi voice, the English words stay with the Indian-English voice', () => {
    const plan = planSpeech('अर्जुन', [enIN, hiIN], true);
    expect(plan.map((p) => p.text)).toEqual(['Congratulations,', 'अर्जुन', LINE]);
    expect(plan.map((p) => p.voice?.name)).toEqual(['Local English India', 'Local Hindi', 'Local English India']);
    expect(plan[1].lang).toBe('hi-IN');
  });

  it('a Hindi-script name with only a Hindi voice is read in full Hindi script', () => {
    const plan = planSpeech('अर्जुन', [hiIN], true);
    expect(plan).toHaveLength(1);
    expect(plan[0].text).toContain('अर्जुन');
    expect(plan[0].voice).toBe(hiIN);
  });

  it('a name that no available voice can read is replaced by "the winning team"', () => {
    expect(planSpeech('محمد', [enIN], true)[0].text).toBe(`Congratulations to the winning team! ${LINE}`);
    expect(planSpeech('محمد', [hiIN], true)[0].text).toContain('विजेता टीम');
    expect(planSpeech('अर्जुन', [enUS], true)[0].text).toBe('Congratulations to the winning team! What a brilliant game. You are our Maha Rathee!');
  });

  it('other English voices are used when there is no Indian or Hindi voice (with a pronunciation that works)', () => {
    const plan = planSpeech('Ravi', [enUS, enGB], true);
    expect(plan).toEqual([{ text: 'Congratulations, Ravi! What a brilliant game. You are our Maha Rathee!', voice: enGB, lang: 'en-GB', pitch: NORMAL_PITCH }]);
  });

  it('online-only voices are ignored while offline (they stall), so the browser default is used asking for Indian English, deepened', () => {
    const offline = planSpeech('Ravi', [googleHI, googleUS, googleIN], false);
    expect(offline).toEqual([{ text: `Congratulations, Ravi! ${LINE}`, lang: 'en-IN', pitch: NORMAL_PITCH }]);
    expect(planSpeech('Ravi', [googleHI, googleUS, googleIN], true)[0].voice).toBe(googleIN);
  });

  it('with no voices listed at all the browser default is used, asking for Indian English, deepened', () => {
    expect(planSpeech('Ravi', [], true)).toEqual([{ text: `Congratulations, Ravi! ${LINE}`, lang: 'en-IN', pitch: NORMAL_PITCH }]);
  });

  it('keeps apostrophes, dots and digits in Latin names', () => {
    expect(planSpeech("D'Souza Team 2", [enIN], true)[0].text).toContain("D'Souza Team 2");
  });
});
