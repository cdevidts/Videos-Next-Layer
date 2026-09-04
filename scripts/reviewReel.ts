/**
 * Extrae frames parejos de un render + un resumen de nivel de audio, para
 * revisarlo sin sacar cada frame a mano con `npx remotion ffmpeg -ss ...`.
 *
 *   npm run review -- renders/video-46-reel.mp4
 *   npm run review -- --project video-46          # busca renders/video-46-reel.mp4
 *
 * El ffmpeg que trae Remotion es una build recortada para su pipeline de
 * encode/decode: no incluye filtros como `fps`, `tile` o `showwavespic` (se
 * probó y falla con "No option name"). Por eso esto usa solo lo que el propio
 * pipeline ya usa en otros lados: extracción por `-ss` + `scale` para frames,
 * y análisis de energía en Node (igual que `energyRanges` en
 * transcribeClips.ts) para el audio, en vez de un ffmpeg completo.
 */
import fs from 'node:fs';
import path from 'node:path';
import {probe, run} from './lib/media';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

const FRAME_COUNT = 8;

const resolveInput = (): string => {
  const positional = argv.find((a) => !a.startsWith('--'));
  if (positional) return positional;
  const project = arg('project');
  if (project) return path.join('renders', `${project}-reel.mp4`);
  throw new Error('Indica el archivo a revisar o --project <nombre>.');
};

/** Niveles RMS del WAV en ventanas de `window` segundos (misma técnica que transcribeClips.ts). */
const rmsWindows = (file: string, window = 0.5): number[] => {
  const buffer = fs.readFileSync(file);
  const dataIndex = buffer.indexOf('data', 12, 'ascii');
  if (dataIndex === -1) return [];
  const sampleRate = buffer.readUInt32LE(24);
  const samples = buffer.subarray(dataIndex + 8);
  const size = Math.floor(sampleRate * window) * 2;
  const levels: number[] = [];
  for (let offset = 0; offset + size <= samples.length; offset += size) {
    let sum = 0;
    for (let i = offset; i < offset + size; i += 2) {
      const value = samples.readInt16LE(i) / 32768;
      sum += value * value;
    }
    levels.push(20 * Math.log10(Math.sqrt(sum / (size / 2)) + 1e-9));
  }
  return levels;
};

/** Barra de texto para un nivel en dBFS: silencio total (-90) a pico (0). */
const levelBar = (db: number): string => {
  const ratio = Math.max(0, Math.min(1, (db + 60) / 60));
  const width = 20;
  const filled = Math.round(ratio * width);
  return '█'.repeat(filled) + '·'.repeat(width - filled);
};

const main = () => {
  const input = resolveInput();
  if (!fs.existsSync(input)) throw new Error(`No existe: ${input}`);

  const info = probe(input);
  const base = path.basename(input, path.extname(input));
  const outDir = path.join('out', 'review', base);
  fs.mkdirSync(outDir, {recursive: true});

  console.log(`\n📼 ${input} · ${info.durationInSeconds.toFixed(1)}s · ${info.width}x${info.height}`);

  // Frames parejos a lo largo del video, cada uno un archivo (para leerlos con Read).
  const interval = info.durationInSeconds / FRAME_COUNT;
  console.log(`\n🖼️  ${FRAME_COUNT} frames en ${outDir}/`);
  for (let i = 0; i < FRAME_COUNT; i++) {
    const seconds = i * interval;
    const frameFile = path.join(outDir, `${seconds.toFixed(1)}s.jpg`);
    run('npx', [
      'remotion', 'ffmpeg', '-y',
      '-ss', seconds.toFixed(3),
      '-i', input,
      '-frames:v', '1',
      '-vf', 'scale=480:-2',
      '-q:v', '4',
      frameFile,
    ]);
    console.log(`   ${frameFile}`);
  }

  // Audio: se extrae a WAV temporal solo para medir nivel, no se guarda.
  const audioFile = path.join(outDir, '_audio.wav');
  run('npx', [
    'remotion', 'ffmpeg', '-y',
    '-vn', '-i', input,
    '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le',
    audioFile,
  ]);
  const levels = rmsWindows(audioFile);
  fs.unlinkSync(audioFile);

  console.log(`\n🔊 Nivel de audio (ventanas de 0.5s, ${levels.length} en total):`);
  const silent = levels.every((db) => db < -50);
  if (silent) {
    console.log('   ⚠️  TODO el audio está por debajo de -50dBFS: puede que el render haya quedado mudo.');
  }
  levels.forEach((db, i) => {
    if (i % 4 === 0 || i === levels.length - 1) {
      console.log(`   ${(i * 0.5).toFixed(1).padStart(5)}s  ${levelBar(db)}  ${db.toFixed(0)}dBFS`);
    }
  });

  console.log('\nPara ver un instante puntual con más detalle:');
  console.log(`  npx remotion ffmpeg -ss <segundos> -i ${input} -frames:v 1 out.jpg`);
};

main();
