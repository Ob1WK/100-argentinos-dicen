'use client';

// Efectos sintetizados con Web Audio: no hace falta ningún archivo de sonido.
let ctx;

export function unlockAudio() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
}

function tone({ freq, type = 'sine', start = 0, dur = 0.5, gain = 0.3, attack = 0.005, endFreq }) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// "Ding" de respuesta correcta: campana brillante con dos golpes.
export function playDing() {
  [0, 0.16].forEach((start) => {
    tone({ freq: 1318.5, start, dur: 1.1, gain: 0.28 });
    tone({ freq: 1975.5, start, dur: 0.8, gain: 0.12 });
    tone({ freq: 2637, start, dur: 0.5, gain: 0.06 });
  });
}

// Chicharra de respuesta incorrecta.
export function playBuzzer() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
  g.gain.setValueAtTime(0.35, t + 0.85);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
  filter.connect(g).connect(ctx.destination);
  [98, 104, 147].forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start(t);
    osc.stop(t + 1.05);
  });
}

// Fanfarria corta cuando una familia se lleva el pozo.
export function playAward() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
  const times = [0, 0.12, 0.24, 0.36, 0.56, 0.68];
  notes.forEach((freq, i) => {
    tone({ freq, type: 'square', start: times[i], dur: i === notes.length - 1 ? 0.9 : 0.22, gain: 0.09 });
    tone({ freq: freq / 2, type: 'triangle', start: times[i], dur: 0.3, gain: 0.12 });
  });
}

// "Tic" del contador de puntos; sube de tono a medida que avanza (progress 0..1).
let lastTick = 0;
export function playTick(progress = 0) {
  if (!ctx || ctx.currentTime - lastTick < 0.05) return;
  lastTick = ctx.currentTime;
  tone({ freq: 520 + progress * 700, type: 'square', dur: 0.05, gain: 0.05 });
}

// Barrido al mostrar la pregunta.
export function playWhoosh() {
  tone({ freq: 220, endFreq: 880, type: 'triangle', dur: 0.35, gain: 0.12 });
  tone({ freq: 440, endFreq: 1760, type: 'sine', start: 0.05, dur: 0.3, gain: 0.06 });
}
