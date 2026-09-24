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

const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.aac', '.aif', '.aiff', '.flac', '.ogg'];

/**
 * Voces en off: todo lo de Sonido/ que no esté en Musica/ ni SFX/. Llevan el
 * prefijo `vo__` para que un "VO1.wav" nunca pise el audio de un clip y para
 * que se reconozcan de un vistazo en _audio/. La música y los efectos no se
 * extraen acá: no se transcriben, whisper les inventa letra.
 */
const vocesEnOff = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];
  const salida: string[] = [];
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/^(musica|música|music|sfx)$/i.test(e.name)) continue;
      salida.push(...vocesEnOff(full));
    } else if ([...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS].includes(path.extname(e.name).toLowerCase())) {
      salida.push(full);
    }
  }
  return salida;
};

const files: Array<{name: string; source: string}> = [
  ...fs
    .readdirSync(clipsDir)
    .filter((f) => VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => ({name: path.basename(f, path.extname(f)), source: path.join(clipsDir, f)})),
  ...vocesEnOff(path.join(projectDir, 'Sonido')).map((f) => ({
    name: `vo__${path.basename(f, path.extname(f))}`,
    source: f,
  })),
];

for (const {name, source} of files) {

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
