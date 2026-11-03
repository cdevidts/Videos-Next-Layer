/**
 * Retranscribe cada tramo con voz de un clip AISLADO y reemplaza las palabras
 * del clip por esas.
 *
 *   npm run tramos -- --project video-44                 # muestra, no escribe
 *   npm run tramos -- --project video-44 --clip DSCF7506 # uno solo
 *   npm run tramos -- --project video-44 --aplicar       # escribe _audio/<clip>.json
 *
 * Por qué existe: whisper sobre el clip entero pierde frases enteras y deja los
 * tiempos fuera de orden. En el Video 44 "yo lo arreglo" figuraba a los 18 s
 * cuando se dice a los 29, y una frase de 9 palabras colapsó en 0,6 s. El mismo
 * whisper sobre el tramo recortado (con 0,25 s de aire) acierta el texto y da
 * tiempos por palabra (-ml 1 -sow) que solo hay que desplazar.
 *
 * Lo que whisper inventa en un tramo sin habla ("[Puerta abriéndose]",
 * "*risas*", "¡Suscríbete!") se descarta. Con --aplicar el JSON queda con
 * "tramosAislados": true y el texto de cada tramo en "tramos", para que una
 * persona lo revise; buildReel bloquea esas palabras igual que una corrección
 * a mano (syncCaptions conserva el texto y mide solo los tiempos).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const index = argv.indexOf(`--${name}`);
  return index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : undefined;
};
const flag = (name: string) => argv.includes(`--${name}`);

type Word = {text: string; start: number; end: number};
type Transcript = {
  words: Word[];
  speech: Array<{start: number; end: number}>;
  correctedByHuman?: boolean;
  tramosAislados?: boolean;
  tramos?: Array<{start: number; end: number; text: string}>;
};

const AIRE = 0.25;
const WHISPER = path.resolve('whisper.cpp');
// Ruido que whisper escribe cuando no hay habla: corchetes, asteriscos,
// paréntesis, y la despedida de YouTube que alucina al final de un audio.
const RUIDO = /^[[(*]|^¡?suscr[ií]bete!?$/i;

const transcribirTramo = (wav: string, start: number, end: number, dir: string): Word[] => {
  const seg = path.join(dir, 'seg.wav');
  spawnSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-ss', String(start), '-to', String(end), '-i', wav, seg]);
  spawnSync(
    path.join(WHISPER, 'main'),
    ['-m', path.join(WHISPER, 'ggml-medium.bin'), '-l', 'es', '-ml', '1', '-sow', '-oj', '-of', path.join(dir, 'seg'), '-f', seg],
    {stdio: 'ignore'},
  );
  const out = JSON.parse(fs.readFileSync(path.join(dir, 'seg.json'), 'utf8')) as {
    transcription: Array<{offsets: {from: number; to: number}; text: string}>;
  };
  const palabras: Word[] = [];
  let dentroDeRuido = false;
  for (const t of out.transcription) {
    const text = t.text.trim();
    if (!text) continue;
    // Un "[Puerta abriéndose]" puede venir partido en varias palabras.
    if (/^[[(*]/.test(text)) dentroDeRuido = true;
    const ruido = dentroDeRuido || RUIDO.test(text);
    if (/[\])*]$/.test(text)) dentroDeRuido = false;
    if (ruido) continue;
    palabras.push({
      text,
      start: Number((start + t.offsets.from / 1000).toFixed(2)),
      end: Number((start + t.offsets.to / 1000).toFixed(2)),
    });
  }
  return palabras;
};

const main = () => {
  const proyecto = arg('project');
  if (!proyecto) throw new Error('Falta --project <slug>');
  const audioDir = path.join('public', 'input', proyecto, '_audio');
  const clips = arg('clip')
    ? [arg('clip') as string]
    : fs.readdirSync(audioDir).filter((f) => f.endsWith('.json')).map((f) => path.basename(f, '.json'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tramos-'));

  for (const clip of clips) {
    const jsonPath = path.join(audioDir, `${clip}.json`);
    const wav = path.join(audioDir, `${clip}.wav`);
    if (!fs.existsSync(wav)) continue;
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Transcript;
    if (data.correctedByHuman) {
      console.log(`⏭️  ${clip}: corregido a mano, no se toca.`);
      continue;
    }
    console.log(`\n🎙️  ${clip}`);
    const words: Word[] = [];
    const tramos: NonNullable<Transcript['tramos']> = [];
    for (const r of data.speech ?? []) {
      const desde = Math.max(r.start - AIRE, 0);
      const hasta = r.end + AIRE;
      const palabras = transcribirTramo(wav, desde, hasta, tmp)
        // El aire de un tramo pisa al siguiente: sin palabras repetidas.
        .filter((w) => !words.length || w.start >= words[words.length - 1].end - 0.05);
      const text = palabras.map((w) => w.text).join(' ');
      console.log(`   [${r.start.toFixed(2)}–${r.end.toFixed(2)}] ${text || '(sin habla)'}`);
      words.push(...palabras);
      tramos.push({start: r.start, end: r.end, text});
    }
    if (flag('aplicar')) {
      fs.writeFileSync(jsonPath, `${JSON.stringify({...data, words, tramos, tramosAislados: true}, null, 2)}\n`);
      console.log(`   ✍️  ${jsonPath}`);
    }
  }
  fs.rmSync(tmp, {recursive: true, force: true});
  if (!flag('aplicar')) console.log('\n(solo lectura: --aplicar para escribir)');
};

main();
