const VOICE_PREFERENCE_KEY = 'preferred_english_speech_voice';
const VOICES_CHANGED_EVENT = 'speech-voices-changed';

let cachedVoices: SpeechSynthesisVoice[] = [];
let speechToken = 0;
let voicesListenerAttached = false;

function getSynth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
}

function initializeVoices(): SpeechSynthesisVoice[] {
  const synth = getSynth();
  if (!synth) return [];

  const currentVoices = synth.getVoices();
  if (currentVoices.length) cachedVoices = currentVoices;
  if (!voicesListenerAttached) {
    synth.addEventListener('voiceschanged', () => {
      cachedVoices = synth.getVoices();
      window.dispatchEvent(new Event(VOICES_CHANGED_EVENT));
    });
    voicesListenerAttached = true;
  }
  return cachedVoices;
}

export function getSpeechVoiceId(voice: SpeechSynthesisVoice): string {
  return voice.voiceURI || `${voice.name}|${voice.lang}`;
}

function voiceScore(voice: SpeechSynthesisVoice, language: string): number {
  const lang = voice.lang.toLowerCase().replace('_', '-');
  const target = language.toLowerCase().replace('_', '-');
  if (!lang.startsWith('en')) return -1;

  const name = voice.name.toLowerCase();
  let score = lang === target ? 35 : lang === 'en-us' ? 30 : 10;
  if (/natural|neural|online|wavenet|chirp|dragonhd/.test(name)) score += 100;
  if (/google.*us english|us english.*google/.test(name)) score += 85;
  if (/\b(aria|ava|jenny|samantha|zira|emma|cora|luna)\b/.test(name)) score += 25;
  if (/\b(david|mark|guy|christopher|andrew)\b/.test(name)) score -= 15;
  if (voice.default) score += 2;
  return score;
}

export function getAvailableEnglishVoices(): SpeechSynthesisVoice[] {
  return initializeVoices()
    .filter((voice) => voiceScore(voice, 'en-US') >= 0)
    .sort((a, b) => voiceScore(b, 'en-US') - voiceScore(a, 'en-US') || a.name.localeCompare(b.name));
}

export function shouldUseEnhancedSpeechForKids(): boolean {
  if (getPreferredSpeechVoiceId()) return true;
  return getAvailableEnglishVoices().some((voice) => voiceScore(voice, 'en-US') >= 100);
}

export function subscribeToSpeechVoices(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const update = () => listener();
  window.addEventListener(VOICES_CHANGED_EVENT, update);
  initializeVoices();
  return () => window.removeEventListener(VOICES_CHANGED_EVENT, update);
}

export function getPreferredSpeechVoiceId(): string | null {
  try {
    return window.localStorage.getItem(VOICE_PREFERENCE_KEY);
  } catch {
    return null;
  }
}

export function setPreferredSpeechVoiceId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(VOICE_PREFERENCE_KEY, id);
    else window.localStorage.removeItem(VOICE_PREFERENCE_KEY);
  } catch {
    // Speech remains available when browser storage is disabled.
  }
}

function selectVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | null {
  const normalizedLanguage = language.toLowerCase().replace('_', '-');
  const compatible = voices.filter((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith(normalizedLanguage.split('-')[0]));
  if (!compatible.length) return null;

  const preferredId = getPreferredSpeechVoiceId();
  if (preferredId) {
    const preferred = compatible.find((voice) => getSpeechVoiceId(voice) === preferredId);
    if (preferred) return preferred;
  }

  if (normalizedLanguage.startsWith('en')) {
    return compatible.sort((a, b) => voiceScore(b, normalizedLanguage) - voiceScore(a, normalizedLanguage))[0];
  }
  return compatible.find((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith(normalizedLanguage))
    || compatible[0];
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export function speakText(text: string, options: SpeakOptions = {}): void {
  const synth = getSynth();
  if (!synth || !text.trim()) {
    options.onEnd?.();
    return;
  }

  try {
    const token = ++speechToken;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;
    utterance.voice = selectVoice(initializeVoices(), utterance.lang);

    utterance.onstart = () => {
      if (token === speechToken) options.onStart?.();
    };
    const finish = () => {
      if (token === speechToken) options.onEnd?.();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    synth.speak(utterance);
  } catch (error) {
    console.warn('Speech synthesis failed:', error);
    options.onEnd?.();
  }
}

export function stopSpeech(): void {
  speechToken += 1;
  getSynth()?.cancel();
}

initializeVoices();
