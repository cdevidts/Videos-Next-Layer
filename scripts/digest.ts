/**
 * El digest de un proyecto: todo lo que hay que saber de cada clip, en una sola
 * página y una imagen por clip.
 *
 *   npm run digest -- --project video-43
 *
 * Por qué existe. Mirar el material es obligatorio (en el Video 46 el mejor
 * clip quedó fuera por no abrirlo) pero mirar frame por frame es lo que más
 * tokens gasta en todo el pipeline: son decenas de imágenes por video. Una hoja
 * de contactos por clip —varios frames con el instante y lo que se dice en cada
 * uno— reemplaza todo eso por una imagen, y DIGEST.md reemplaza abrir cada
 * transcripción. El agente lee una página, abre N hojas y ya puede planear.
 *
 * Completa la compuerta de `npm run fetch-drive`: allá se verifica que todo se
 * bajó; acá, que todo se puede VER. `npm run check` exige que exista la hoja de
 * cada clip del MANIFEST antes de validar un plan.
 */
import fs from 'node:fs';
import path from 'node:path';
import {ffmpeg} from './lib/ffmpegFull';
import {manifiestoDe, type Manifiesto} from './ingest';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

type Palabra = {text: string; start: number; end: number};
type Transcripcion = {
  segments?: Array<{text: string; start: number; end: number}>;
  words?: Palabra[];
  speech?: Array<{start: number; end: number}>;
  correctedByHuman?: boolean;
};

const FUENTE = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'].find(
  (f) => fs.existsSync(f),
);

const ANCHO = 240;

const leerTranscripcion = (dir: string, nombre: string): Transcripcion | null => {
  const p = path.join(dir, '_audio', `${nombre}.json`);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf8')) as Transcripcion) : null;
};

/** Lo que se dice alrededor de un instante, para escribirlo bajo el frame. */
const dichoEn = (t: Transcripcion | null, s: number): string => {
  const palabras = (t?.words ?? []).filter((w) => w.end > s - 1.2 && w.start < s + 1.2);
  const texto = palabras.map((w) => w.text).join(' ').trim();
  return texto.length > 34 ? `${texto.slice(0, 33)}…` : texto;
};

const mmss = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

/**
 * La hoja: frames parejos a lo largo del clip, cada uno con su instante y lo
 * que se dice ahí. Con -ss antes de -i la búsqueda salta al keyframe y no
 * decodifica el clip entero, que en un 4K de 48 s es la diferencia entre
 * segundos y minutos.
 */
const hoja = (fuente: string, duracion: number, t: Transcripcion | null, salida: string) => {
  const n = Math.min(8, Math.max(4, Math.ceil(duracion / 4)));
  const tmp = `${salida}.frames`;
  fs.rmSync(tmp, {recursive: true, force: true});
  fs.mkdirSync(tmp, {recursive: true});

  for (let i = 0; i < n; i++) {
    const s = 0.3 + ((duracion - 0.6) * i) / Math.max(n - 1, 1);
    const textoArchivo = path.join(tmp, `t${i}.txt`);
    const dicho = dichoEn(t, s);
    fs.writeFileSync(textoArchivo, dicho ? `${mmss(s)}\n${dicho}` : `${mmss(s)}  (sin voz)`);
    const etiqueta = FUENTE
      ? `,drawtext=fontfile=${FUENTE}:textfile=${textoArchivo}:fontsize=15:fontcolor=white:line_spacing=4:` +
        `box=1:boxcolor=0x07080cDD:boxborderw=7:x=6:y=h-th-10`
      : '';
    ffmpeg([
      '-ss', s.toFixed(2), '-i', fuente, '-frames:v', '1',
      '-vf', `scale=${ANCHO}:-2${etiqueta}`,
      '-q:v', '4', path.join(tmp, `f${String(i).padStart(2, '0')}.jpg`),
    ]);
  }

  const columnas = n <= 4 ? n : 4;
  const filas = Math.ceil(n / columnas);
  ffmpeg([
    '-i', path.join(tmp, 'f%02d.jpg'),
    '-vf', `tile=${columnas}x${filas}:padding=6:margin=6:color=0x07080c`,
    '-frames:v', '1', '-q:v', '4', salida,
  ]);
  fs.rmSync(tmp, {recursive: true, force: true});
  return n;
};

const tramos = (t: Transcripcion | null) =>
  (t?.speech ?? []).map((r) => `${r.start.toFixed(1)}–${r.end.toFixed(1)}`).join(', ');

export const digest = (slug: string, forzar = argv.includes('--force')) => {
  const m: Manifiesto | null = manifiestoDe(slug);
  if (!m) throw new Error(`No hay MANIFEST de ${slug}. Corre primero: npm run fetch-drive -- --project "<Video N>"`);
  const dir = path.join('public', 'input', slug);
  const hojasDir = path.join(dir, '_digest');
  fs.mkdirSync(hojasDir, {recursive: true});

  const clips = m.archivos.filter((a) => a.tipo === 'clip' && a.ok);
  const voces = m.archivos.filter((a) => a.tipo === 'voz' && a.ok);
  const otros = m.archivos.filter((a) => (a.tipo === 'musica' || a.tipo === 'sfx') && a.ok);

  const filas: string[] = [];
  const detalle: string[] = [];
  let sinTranscripcion = 0;

  for (const [i, c] of clips.entries()) {
    const nombre = path.basename(c.local, path.extname(c.local));
    const t = leerTranscripcion(dir, nombre);
    if (!t) sinTranscripcion++;
    const salida = path.join(hojasDir, `${nombre}.jpg`);
    const frames = fs.existsSync(salida) && !forzar
      ? 'cache'
      : hoja(c.local, c.duracion ?? 0, t, salida);
    const orient = (c.alto ?? 0) > (c.ancho ?? 0) ? 'vertical' : 'horizontal';
    const conVoz = (t?.speech?.length ?? 0) > 0;
    console.log(`   🖼️  [${i + 1}/${clips.length}] ${nombre} ${frames === 'cache' ? '(cache)' : `${frames} frames`}`);

    filas.push(
      `| ${nombre} | ${c.duracion}s | ${orient} | ${conVoz ? `sí (${t?.speech?.length} tramos)` : t ? 'no — B-roll' : '¿? sin transcribir'} | \`${path.relative(dir, salida)}\` |`,
    );
    detalle.push(
      `### ${nombre} — ${c.duracion}s · ${orient}${t?.correctedByHuman ? ' · transcripción corregida a mano' : ''}`,
      '',
      conVoz ? `Voz en: ${tramos(t)}` : t ? 'Sin voz: B-roll. Candidato para una voz en off.' : 'Sin transcribir todavía.',
      // Un clip horizontal en un reel 9:16 obliga a decidir: o se recorta el
      // centro o estaba grabado de costado y hay que girarlo. La hoja lo muestra
      // de un vistazo (DSCF7556 del Video 41: cámara de lado, mesa vertical).
      ...(orient === 'horizontal'
        ? ['', '⚠️ Horizontal: mira la hoja. Si el mundo se ve de costado, se grabó con la cámara girada y hay que rotarlo; si no, en 9:16 se recorta al centro.']
        : []),
      ...(t?.segments?.length
        ? ['', ...t.segments.map((s) => `- \`${s.start.toFixed(1)}\` ${s.text.trim()}`)]
        : []),
      '',
    );
  }

  const vocesMd = voces.map((v) => {
    const nombre = `vo__${path.basename(v.local, path.extname(v.local))}`;
    const t = leerTranscripcion(dir, nombre);
    const texto = t?.segments?.map((s) => s.text.trim()).join(' ') ?? '(sin transcribir)';
    return `| ${path.basename(v.local)} | ${v.duracion}s | ${texto} |`;
  });

  const md = [
    `# ${m.proyecto} — digest`,
    '',
    `Compuerta de ingreso: ${m.compuerta.ok ? '✅' : '⛔'} ${clips.length}/${m.enDrive.clips} clips y ${voces.length + otros.length}/${m.enDrive.sonido} sonidos verificados (\`MANIFEST.json\`).`,
    m.ignorado.length ? `No bajado (otras carpetas): ${m.ignorado.join(', ')}.` : '',
    '',
    '**Antes de escribir el plan, abre CADA hoja de la tabla.** Un clip sin mirar es material',
    'perdido: así se perdió el cuaderno de planos del Video 46. Cada hoja muestra frames parejos',
    'del clip con el instante y lo que se dice ahí. Si algo de la transcripción suena raro, puede',
    'ser jerga ("once lucas" salió "once lugar"): pregunta antes de descartarlo.',
    '',
    '| clip | dura | formato | voz | hoja |',
    '| --- | --- | --- | --- | --- |',
    ...filas,
    '',
    voces.length
      ? [
          '## Voces en off (Sonido/)',
          '',
          'Grabaciones para poner sobre clips sin audio relevante: B-roll o planos donde no se habla',
          'a cámara. En el plan van como `"voiceover": "<archivo>"` en ese clip.',
          '',
          '| archivo | dura | dice |',
          '| --- | --- | --- |',
          ...vocesMd,
          '',
        ].join('\n')
      : 'Sin voces en off en Sonido/.\n',
    otros.length ? `Música/efectos propios en Sonido/: ${otros.map((o) => path.basename(o.local)).join(', ')}\n` : '',
    '## Clip por clip',
    '',
    ...detalle,
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  fs.writeFileSync(path.join(dir, 'DIGEST.md'), `${md}\n`);

  const actualizado = {...m, digest: {generado: new Date().toISOString(), hojas: clips.length}};
  fs.writeFileSync(path.join(dir, 'MANIFEST.json'), `${JSON.stringify(actualizado, null, 2)}\n`);

  console.log(`\n✅ ${path.join(dir, 'DIGEST.md')} — ${clips.length} hojas en ${hojasDir}/`);
  if (sinTranscripcion) {
    console.log(`⚠️  ${sinTranscripcion} clip(s) sin transcripción: corre audio + transcribe y vuelve a generar con --force.`);
  }
};

const isMain = process.argv[1] ? path.basename(process.argv[1]).startsWith('digest') : false;
if (isMain) {
  try {
    const slug = arg('project');
    if (!slug) throw new Error('Falta --project <slug> (ej. video-43)');
    digest(slug);
  } catch (error: unknown) {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
