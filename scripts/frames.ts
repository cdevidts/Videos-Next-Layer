/**
 * Una tira de frames de UN clip en los instantes que tú eliges, con el tiempo
 * impreso. Para decidir ventanas: dónde empieza la acción, cuándo entra la
 * pieza, si el plano está oscuro donde cae la palabra.
 *
 *   npm run frames -- --project video-44 --clip DSCF7506 --at 19,20.5,22,23.5
 *   npm run frames -- --project video-45 --clip DSCF7515 --at 1,3,4.5,6 --rotate 90
 *
 * Deja out/frames/<clip>-<instantes>.jpg; ábrela con Read. La hoja del digest
 * reparte frames parejos y sirve para conocer el clip; esta sirve para cortar.
 * En el Video 44 mostró que el "Perfecto" del 7508 cae sobre un plano negro y
 * que el cenital del 7515 tiene el soporte roto y la pieza entrando: las dos
 * cosas eran invisibles en la hoja.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ffmpegCompleto} from './lib/ffmpegFull';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const index = argv.indexOf(`--${name}`);
  return index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : undefined;
};

// Mismo sentido que "rotate" del plan: grados en sentido horario.
const GIRO: Record<string, string> = {'90': 'transpose=1,', '-90': 'transpose=2,', '180': 'hflip,vflip,'};

const main = () => {
  const proyecto = arg('project');
  const clip = arg('clip');
  const at = arg('at');
  if (!proyecto || !clip || !at) throw new Error('Uso: --project <slug> --clip <nombre> --at t1,t2,...');
  const dir = path.join('public', 'input', proyecto, 'Videos');
  const archivo = fs.readdirSync(dir).find((f) => path.parse(f).name === path.parse(clip).name);
  if (!archivo) throw new Error(`No está ${clip} en ${dir}`);
  const giro = GIRO[arg('rotate') ?? ''] ?? '';
  const instantes = at.split(',').map(Number).filter((t) => Number.isFinite(t));

  const ffmpeg = ffmpegCompleto();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
  const sueltos = instantes.map((t, i) => {
    const out = path.join(tmp, `${i}.jpg`);
    execFileSync(ffmpeg, [
      '-nostdin', '-loglevel', 'error', '-y', '-ss', String(t), '-i', path.join(dir, archivo), '-frames:v', '1',
      '-vf', `${giro}scale=-2:420,drawtext=text='${t.toFixed(1)}':fontsize=40:fontcolor=yellow:borderw=3:x=12:y=10`,
      out,
    ]);
    return out;
  });

  const destino = path.join('out', 'frames', `${path.parse(archivo).name}-${instantes.join('_')}.jpg`);
  fs.mkdirSync(path.dirname(destino), {recursive: true});
  execFileSync(ffmpeg, [
    '-nostdin', '-loglevel', 'error', '-y',
    ...sueltos.flatMap((f) => ['-i', f]),
    '-filter_complex', sueltos.length > 1 ? `hstack=${sueltos.length}` : 'null',
    destino,
  ]);
  fs.rmSync(tmp, {recursive: true, force: true});
  console.log(`🖼️  ${destino}`);
};

main();
