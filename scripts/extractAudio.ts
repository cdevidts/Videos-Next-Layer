/**
 * Extrae dos pistas de audio por clip, con propósitos distintos:
 *
 *   _audio/<clip>.wav      mono 16 kHz  → SOLO para whisper (es lo que exige)
 *   _audio/hq/<clip>.wav   estéreo 48 kHz → la que se escucha en el reel
 *
 *   npm run audio -- --dir public/input/video-46
 *
 * Ojo: nunca uses la de 16 kHz como pista del video. Está limitada a 8 kHz de
 * ancho de banda (calidad teléfono) y el resultado suena opaco. El primer
 * render de Video 46 tenía justamente ese error.
 */
import fs from 'node:fs';
import path from 'node:path';
import {run} from './lib/media';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv'];

const projectDir = arg('dir');
if (!projectDir) throw new Error('Falta --dir <carpeta del proyecto>');

const clipsDir = fs.existsSync(path.join(projectDir, 'Videos'))
  ? path.join(projectDir, 'Videos')
  : projectDir;
const audioDir = path.join(projectDir, '_audio');
const hqDir = path.join(audioDir, 'hq');
fs.mkdirSync(hqDir, {recursive: true});

const files = fs
  .readdirSync(clipsDir)
  .filter((f) => VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
  .sort();

for (const file of files) {
  const name = path.basename(file, path.extname(file));
  const source = path.join(clipsDir, file);

  // Para whisper: mono 16 kHz.
  const speechTarget = path.join(audioDir, `${name}.wav`);
  if (fs.existsSync(speechTarget)) {
    console.log(`♻️  ${name}.wav (whisper)`);
  } else {
    run('npx', [
      'remotion', 'ffmpeg', '-y', '-vn', '-i', source,
      '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', speechTarget,
    ]);
    console.log(`🔈 ${name}.wav (whisper)`);
  }

  // Para el reel: estéreo 48 kHz, tal como salió de la cámara.
  const hqTarget = path.join(hqDir, `${name}.wav`);
  if (fs.existsSync(hqTarget)) {
    console.log(`♻️  hq/${name}.wav (reel)`);
    continue;
  }
  run('npx', [
    'remotion', 'ffmpeg', '-y', '-vn', '-i', source,
    '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', hqTarget,
  ]);
  console.log(`🎧 hq/${name}.wav (reel)`);
}
