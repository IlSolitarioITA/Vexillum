// Lightweight synthesized tactical sound effects via Web Audio API (no external audio assets)

let audioCtx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    try {
      audioCtx = new AudioContextCtor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted(): boolean {
  return muted;
}

export function toggleSoundMute(): boolean {
  muted = !muted;
  return muted;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.05,
  delay = 0
): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    // Audio playback is strictly optional
  }
}

export const sfx = {
  select: () => playTone(520, 0.06, 'triangle', 0.035),
  turn: () => {
    playTone(390, 0.09, 'sine', 0.04, 0);
    playTone(540, 0.12, 'sine', 0.04, 0.07);
  },
  war: () => {
    playTone(170, 0.22, 'sawtooth', 0.055, 0);
    playTone(135, 0.3, 'sawtooth', 0.05, 0.16);
  },
  victory: () => {
    playTone(440, 0.12, 'triangle', 0.05, 0);
    playTone(554, 0.12, 'triangle', 0.05, 0.1);
    playTone(659, 0.24, 'triangle', 0.055, 0.2);
  },
  recruit: () => playTone(640, 0.07, 'sine', 0.03),
};
