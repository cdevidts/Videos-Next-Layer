/**
 * Iguala el color entre los clips de un proyecto.
 *
 *   npm run color -- --dir public/input/video-46
 *
 * Por qué existe: los clips vienen de piezas distintas con luz distinta. Medido
 * en Video 46, el brillo medio iba de 0,39 (dormitorio) a 0,58 (taller) — 49%
 * de diferencia — y la saturación al doble. Eso hace que el reel salte de
 * oscuro a claro en cada corte. Se nota aunque no se sepa nombrar.
 *
 * El método viene de `helpers/grade.py` de video-use (browser-use/video-use):
 * medir cada clip con el filtro `signalstats` de ffmpeg y corregir con `eq`.
 * Acá se agrega el paso que a nosotros nos hace falta: en vez de corregir cada
 * clip por separado, se corrigen todos hacia la MEDIANA del proyecto, que es lo
 * que hace que las tomas peguen entre sí.
 *
 * Las correcciones van acotadas: nada de rescatar una toma quemada o negra, que
 * eso se arregla filmando de nuevo. Acá solo se emparejan tomas ya usables.
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

/** Tope de corrección. Más que esto delata el arreglo. */
const MAX_GAMMA = 0.4;
const MAX_SAT = 0.25;

export type ColorStats = {yMean: number; satMean: number};

/**
 * Mide brillo y saturación medios con `signalstats`. Ojo: este filtro NO existe
 * en el ffmpeg recortado que trae Remotion; necesita el ffmpeg del sistema.
 */
/**
 * `signalstats` reporta en la escala del material: 0-255 en 8 bits y 0-1023 en
 * 10 bits. Los .MOV de la cámara son 10 bits, así que sin esto el brillo sale
 * en 2,3 y las correcciones quedan al revés.
 */
const escalaDe = (file: string): number => {
  const salida = run(
    'ffprobe',
    ['-v', 'quiet', '-select_streams', 'v:0', '-show_entries', 'stream=pix_fmt',
     '-of', 'default=noprint_wrappers=1:nokey=1', file],
    true,
  ).trim();
  return /10le|10be|p010/.test(salida) ? 1023 : /12le|12be/.test(salida) ? 4095 : 255;
};

export const analyze = (file: string, samples = 12): ColorStats => {
  const escala = escalaDe(file);
  const salida = run(
    'ffmpeg',
    [
      '-hide_banner', '-nostats',
      '-i', file,
      '-vf', `select='not(mod(n\\,${samples}))',signalstats,metadata=print:file=-`,
      '-frames:v', String(samples),
      '-f', 'null', '-',
    ],
    true,
  );

  const leer = (clave: string): number[] =>
    [...salida.matchAll(new RegExp(`lavfi\\.signalstats\\.${clave}=([\\d.]+)`, 'g'))].map((m) =>
      Number(m[1]),
    );

  const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    yMean: promedio(leer('YAVG')) / escala,
    satMean: promedio(leer('SATAVG')) / escala,
  };
};

const mediana = (xs: number[]) => {
  const orden = [...xs].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2;
};

const acotar = (valor: number, tope: number) => Math.max(-tope, Math.min(tope, valor));

/** Filtro `eq` que acerca un clip a la referencia del proyecto. */
export const filterFor = (clip: ColorStats, objetivo: ColorStats): string => {
  const partes: string[] = [];

  // Gamma corrige el brillo sin aplastar negros ni quemar altas luces, que es
  // lo que pasaría subiendo brightness a secas.
  if (clip.yMean > 0.02 && objetivo.yMean > 0.02) {
    const gamma = 1 + acotar(objetivo.yMean / clip.yMean - 1, MAX_GAMMA);
    if (Math.abs(gamma - 1) > 0.015) partes.push(`gamma=${gamma.toFixed(3)}`);
  }
  if (clip.satMean > 0.005 && objetivo.satMean > 0.005) {
    const sat = 1 + acotar(objetivo.satMean / clip.satMean - 1, MAX_SAT);
    if (Math.abs(sat - 1) > 0.02) partes.push(`saturation=${sat.toFixed(3)}`);
  }

  return partes.length ? `eq=${partes.join(':')}` : '';
};

const main = () => {
  const projectDir = arg('dir');
  if (!projectDir) throw new Error('Falta --dir <carpeta del proyecto>');

  const normalizedDir = path.join(projectDir, '_normalized');
  const clipsDir = fs.existsSync(path.join(projectDir, 'Videos'))
    ? path.join(projectDir, 'Videos')
    : projectDir;

  // Se mide SIEMPRE el material original, nunca los proxies: si se midieran los
  // proxies, cada corrida apilaría corrección sobre corrección y el color se
  // iría de a poco a cualquier parte.
  const fuentes = fs
    .readdirSync(clipsDir)
    .filter((f) => ['.mov', '.mp4', '.m4v'].includes(path.extname(f).toLowerCase()))
    .sort();
  if (!fuentes.length) throw new Error(`No hay clips en ${clipsDir}`);

  console.log(`\n🎨 Midiendo ${fuentes.length} clips originales...\n`);
  const medidas = new Map<string, ColorStats>();
  for (const fuente of fuentes) {
    const clip = `${path.basename(fuente, path.extname(fuente))}.mp4`;
    const stats = analyze(path.join(clipsDir, fuente));
    medidas.set(clip, stats);
    console.log(`   ${clip.padEnd(16)} brillo ${stats.yMean.toFixed(3)}  saturación ${stats.satMean.toFixed(3)}`);
  }

  const objetivo: ColorStats = {
    yMean: mediana([...medidas.values()].map((s) => s.yMean)),
    satMean: mediana([...medidas.values()].map((s) => s.satMean)),
  };

  const brillos = [...medidas.values()].map((s) => s.yMean);
  const dispersion = ((Math.max(...brillos) - Math.min(...brillos)) / objetivo.yMean) * 100;
  console.log(
    `\n   referencia (mediana): brillo ${objetivo.yMean.toFixed(3)}  saturación ${objetivo.satMean.toFixed(3)}`,
  );
  console.log(`   dispersión de brillo antes de igualar: ${dispersion.toFixed(0)}%\n`);

  const filtros: Record<string, string> = {};
  for (const [clip, stats] of medidas) {
    const filtro = filterFor(stats, objetivo);
    if (filtro) {
      filtros[clip] = filtro;
      console.log(`   ${clip.padEnd(16)} → ${filtro}`);
    }
  }

  fs.mkdirSync(normalizedDir, {recursive: true});
  const target = path.join(normalizedDir, 'color.json');
  fs.writeFileSync(target, `${JSON.stringify({objetivo, filtros}, null, 2)}\n`);
  console.log(`\n✅ ${Object.keys(filtros).length} clips a corregir → ${target}`);
  console.log('   Corre `npm run reel -- --plan <plan> --force` para aplicarlo.');
};

const isMain = process.argv[1] ? path.basename(process.argv[1]).startsWith('matchColor') : false;
if (isMain) {
  try {
    main();
  } catch (error: unknown) {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
