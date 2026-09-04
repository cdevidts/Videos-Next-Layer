/**
 * Genera los efectos de sonido del reel por síntesis (sin librerías ni samples
 * externos, así que no hay problemas de licencia):
 *   whoosh · tick · riser · impact
 *
 *   npm run sfx
 */
import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 48000;

const writeWav = (file: string, samples: number[]) => {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, i) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    data.writeInt16LE(Math.round(clamped * 32767), i * 2);
  });

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, Buffer.concat([header, data]));
  console.log(`🔊 ${file} (${(samples.length / SAMPLE_RATE).toFixed(2)}s)`);
};

const frames = (seconds: number) => Math.round(seconds * SAMPLE_RATE);

/** Filtro pasa-bajos de un polo; el cutoff puede variar en el tiempo. */
const lowpass = (input: number[], cutoffAt: (t: number) => number): number[] => {
  const out: number[] = [];
  let last = 0;
  for (let i = 0; i < input.length; i++) {
    const t = i / SAMPLE_RATE;
    const alpha = 1 - Math.exp((-2 * Math.PI * cutoffAt(t)) / SAMPLE_RATE);
    last += alpha * (input[i] - last);
    out.push(last);
  }
  return out;
};

const noise = (seconds: number) =>
  Array.from({length: frames(seconds)}, () => Math.random() * 2 - 1);

/** Transición: ruido filtrado que sube y baja. */
const whoosh = () => {
  const seconds = 0.5;
  const raw = noise(seconds);
  const swept = lowpass(raw, (t) => 300 + 5200 * Math.sin((Math.PI * t) / seconds));
  const highpassed = swept.map((v, i) => v - (swept[i - 1] ?? 0));
  return highpassed.map((v, i) => {
    const t = i / SAMPLE_RATE;
    const envelope = Math.sin((Math.PI * t) / seconds) ** 1.6;
    return v * envelope * 6;
  });
};

/** Aparición de subtítulo: click corto y limpio. */
const tick = () => {
  const seconds = 0.07;
  return Array.from({length: frames(seconds)}, (_, i) => {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 90);
    return (Math.sin(2 * Math.PI * 2100 * t) * 0.6 + Math.sin(2 * Math.PI * 3300 * t) * 0.25) * envelope;
  });
};

/** Entrada del gancho: barrido ascendente. */
const riser = () => {
  const seconds = 0.9;
  const raw = noise(seconds);
  const swept = lowpass(raw, (t) => 400 + 6000 * (t / seconds) ** 2);
  return swept.map((v, i) => {
    const t = i / SAMPLE_RATE;
    const envelope = (t / seconds) ** 2;
    const tone = Math.sin(2 * Math.PI * (220 + 700 * (t / seconds) ** 2) * t) * 0.18;
    return (v * 3 + tone) * envelope;
  });
};

/** Cierre: golpe grave con cuerpo. */
const impact = () => {
  const seconds = 0.9;
  return Array.from({length: frames(seconds)}, (_, i) => {
    const t = i / SAMPLE_RATE;
    const sweep = 120 * Math.exp(-t * 9) + 42;
    const body = Math.sin(2 * Math.PI * sweep * t) * Math.exp(-t * 3.2);
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 140) * 0.35;
    return body * 0.9 + click;
  });
};

const targets: Array<[string, number[]]> = [
  ['public/sfx/whoosh.wav', whoosh()],
  ['public/sfx/tick.wav', tick()],
  ['public/sfx/riser.wav', riser()],
  ['public/sfx/impact.wav', impact()],
];

for (const [file, samples] of targets) {
  writeWav(file, samples);
}
