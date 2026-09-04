/**
 * Extrae el audio de cada clip a WAV mono 16 kHz (el formato que pide whisper).
 *
 *   npm run audio -- --dir public/input/video-46
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
fs.mkdirSync(audioDir, {recursive: true});

const files = fs
  .readdirSync(clipsDir)
  .filter((f) => VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
  .sort();

for (const file of files) {
  const target = path.join(audioDir, `${path.basename(file, path.extname(file))}.wav`);
  if (fs.existsSync(target)) {
    console.log(`♻️  ${path.basename(target)}`);
    continue;
  }
  run('npx', [
    'remotion', 'ffmpeg', '-y', '-vn', '-i', path.join(clipsDir, file),
    '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', target,
  ]);
  console.log(`🔈 ${path.basename(target)}`);
}
