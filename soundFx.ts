// Web Audio API Sound Synthesizer for Game Effects (Zero external assets needed)

let audioCtx: AudioContext | null = null;
const activeKidsGameSounds = new Set<OscillatorNode>();

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

type KidsGameSound = 'flip' | 'correct' | 'wrong' | 'bingo' | 'reward';

const kidsGameTunes: Record<KidsGameSound, Array<{ frequency: number; offset: number; duration: number }>> = {
  flip: [{ frequency: 620, offset: 0, duration: 0.075 }],
  correct: [
    { frequency: 660, offset: 0, duration: 0.11 },
    { frequency: 880, offset: 0.085, duration: 0.14 },
  ],
  wrong: [
    { frequency: 330, offset: 0, duration: 0.11 },
    { frequency: 260, offset: 0.09, duration: 0.14 },
  ],
  bingo: [
    { frequency: 523.25, offset: 0, duration: 0.14 },
    { frequency: 659.25, offset: 0.11, duration: 0.14 },
    { frequency: 783.99, offset: 0.22, duration: 0.22 },
  ],
  reward: [
    { frequency: 523.25, offset: 0, duration: 0.13 },
    { frequency: 659.25, offset: 0.1, duration: 0.13 },
    { frequency: 783.99, offset: 0.2, duration: 0.13 },
    { frequency: 1046.5, offset: 0.3, duration: 0.27 },
  ],
};

/** Gentle, short feedback tones for the children's game hub. Call only from a user action. */
export function playKidsGameSound(sound: KidsGameSound): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  kidsGameTunes[sound].forEach(({ frequency, offset, duration }) => {
    const start = ctx.currentTime + offset;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.04, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.onended = () => activeKidsGameSounds.delete(oscillator);
    activeKidsGameSounds.add(oscillator);
    try {
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    } catch {
      activeKidsGameSounds.delete(oscillator);
    }
  });
}

export function stopKidsGameSounds(): void {
  activeKidsGameSounds.forEach((oscillator) => {
    try {
      oscillator.stop();
    } catch {
      // The tone may have already ended.
    }
  });
  activeKidsGameSounds.clear();
}

/** Âm thanh chém kiếm (Sword Slash) */
export function playSlashSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (e) {}
}

/** Âm thanh đòn chí mạng (Critical Strike) */
export function playCriticalSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
    osc1.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

/** Âm thanh quái vật bị thương (Monster Hurt) */
export function playMonsterHurtSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.21);
  } catch (e) {}
}

/** Âm thanh người chơi bị tấn công (Player Hurt / Lost Heart) */
export function playPlayerHurtSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch (e) {}
}

/** Âm thanh mở tầng tháp thành công (Victory Fanfare) */
export function playVictorySound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.32);
    });
  } catch (e) {}
}

/** Âm thanh thất bại (Defeat) */
export function playDefeatSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [392.0, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.15;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.37);
    });
  } catch (e) {}
}
