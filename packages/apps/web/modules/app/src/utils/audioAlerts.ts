import { SoundAlertKey } from "../context/BusinessContext";

// Synthesized audio notification engine using Web Audio API
// 100% offline, cross-browser, zero external mp3 dependencies

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn("Web Audio API not supported or blocked by browser", e);
    return null;
  }
};

export const playOrderAlert = (soundKey: SoundAlertKey = "bell"): void => {
  if (soundKey === "mute") return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  switch (soundKey) {
    case "bell": {
      // Classic Reception Bell (Two warm harmonic tones: ding-dong)
      // Note 1 (Ding: 784 Hz - G5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(783.99, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2 (Dong: 1046.50 Hz - C6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1046.5, now + 0.15);
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.85);
      break;
    }

    case "chime": {
      // 3-note ascending chime (E5 -> G#5 -> B5)
      const notes = [659.25, 830.61, 987.77];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.1;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
      });
      break;
    }

    case "kitchen_ding": {
      // Sharp metal bell with higher frequency overtone
      const oscMetal = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      oscMetal.type = "sine";
      oscMetal.frequency.setValueAtTime(1200, now);

      oscHarmonic.type = "triangle";
      oscHarmonic.frequency.setValueAtTime(2400, now);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      oscMetal.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(ctx.destination);

      oscMetal.start(now);
      oscHarmonic.start(now);
      oscMetal.stop(now + 0.9);
      oscHarmonic.stop(now + 0.9);
      break;
    }

    case "pos_beep": {
      // Crisp POS double-beep
      [0, 0.12].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + offset;
        osc.type = "square";
        osc.frequency.setValueAtTime(idx === 0 ? 880 : 1320, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.08);
      });
      break;
    }

    default:
      break;
  }
};
