/**
 * "Mira" un render: deja los frames y lo que se ESCUCHA en cada uno, juntos.
 *
 *   npm run watch -- renders/video-46-reel.mp4
 *   npm run watch -- renders/video-46-reel.mp4 --hook     # solo los primeros 15s, denso
 *
 * Por qué existe: `npm run review` saca 8 frames parejos y un gráfico de dBFS.
 * Con eso se puede revisar la gráfica, pero **no** se puede juzgar el video: no
 * dice qué se está diciendo en ese frame, ni si el subtítulo de la pantalla
 * coincide con la voz, ni si el sonido que suena tiene que ver con lo que se ve.
 * Revisando así se entregaron ediciones con subtítulos inventados y sonidos
 * puestos sobre planos que no los justificaban — errores obvios para cualquiera
 * que MIRE el video, invisibles para quien solo mira frames sueltos.
 *
 * Lo que deja en `out/watch/<render>/`:
 *   - `GUION.md`: una línea por instante, con el tiempo, lo que se oye, el nivel
 *     de audio y el archivo del frame. Se lee de corrido como un guion.
 *   - los frames, nombrados por su tiempo.
 *
 * El muestreo es denso en los primeros 15 s (ahí se gana o se pierde al
 * espectador) y más espaciado después.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {hasSystemFfmpeg, run} from './lib/media';
import {ffmpeg as ffmpegCompleto} from './lib/ffmpegFull';
import {shotFrames, type VerticalReelProps} from '../src/lib/reel';

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const render = argv.find((a) => !a.startsWith('--')) ?? 'renders/video-46-reel.mp4';

/** Los primeros segundos deciden la retención: ahí se mira más seguido. */
const PASO_GANCHO = 0.75;
const PASO_RESTO = 2.0;
const FIN_GANCHO = 15;

type Palabra = {text: string; from: number; to: number};

const ffmpeg = (args: string[]) => {
  const cmd = hasSystemFfmpeg() ? ['ffmpeg'] : ['npx', 'remotion', 'ffmpeg'];
  spawnSync(cmd[0], [...cmd.slice(1), ...args], {stdio: 'ignore'});
};

/** Nivel RMS en dBFS por ventana, leyendo el WAV a mano (el ffmpeg de Remotion
 * no trae los filtros de análisis). */
const niveles = (wav: string, ventana = 0.25): number[] => {
  const buf = fs.readFileSync(wav);
  const dataIndex = buf.indexOf('data', 12, 'ascii');
  if (dataIndex === -1) return [];
  const sr = buf.readUInt32LE(24);
  const muestras = buf.subarray(dataIndex + 8);
  const size = Math.floor(sr * ventana) * 2;
  const out: number[] = [];
  for (let off = 0; off + size <= muestras.length; off += size) {
    let suma = 0;
    for (let i = off; i < off + size; i += 2) {
      const v = muestras.readInt16LE(i) / 32768;
      suma += v * v;
    }
    out.push(20 * Math.log10(Math.sqrt(suma / (size / 2)) + 1e-9));
  }
  return out;
};

const mmss = (t: number) =>
  `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;

const main = async () => {
  if (!fs.existsSync(render)) throw new Error(`No existe el render: ${render}`);
  const nombre = path.basename(render, path.extname(render));
  const dir = path.join('out', 'watch', nombre);
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});

  const dur = Number(
    run('npx', ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', render], true).trim(),
  );
  const hasta = flag('hook') ? Math.min(FIN_GANCHO, dur) : dur;

  // --- audio: qué se escucha, palabra por palabra --------------------------
  const wav = path.join(dir, 'audio.wav');
  ffmpeg(['-v', 'error', '-y', '-i', render, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav]);

  const {downloadWhisperModel, installWhisperCpp, transcribe} = await import(
    '@remotion/install-whisper-cpp'
  );
  const W = path.resolve('whisper.cpp');
  const V = '1.5.5';
  await installWhisperCpp({to: W, version: V});
  await downloadWhisperModel({model: 'medium' as never, folder: W});
  console.log('🎧 Escuchando el render...');
  const {transcription} = await transcribe({
    inputPath: path.resolve(wav),
    whisperPath: W,
    model: 'medium' as never,
    language: 'es' as never,
    tokenLevelTimestamps: true,
    whisperCppVersion: V,
    printOutput: false,
  });

  const palabras: Palabra[] = [];
  for (const it of transcription as Array<{text?: string; offsets: {from: number; to: number}}>) {
    const raw = it.text ?? '';
    if (!raw.trim() || /[[\]]/.test(raw)) continue;
    const last = palabras[palabras.length - 1];
    if (!last || raw.startsWith(' ')) {
      palabras.push({text: raw.trim(), from: it.offsets.from / 1000, to: it.offsets.to / 1000});
    } else {
      last.text += raw;
      last.to = it.offsets.to / 1000;
    }
  }

  const db = niveles(wav);

  // --- frames --------------------------------------------------------------
  const tiempos: number[] = [];
  for (let t = 0.2; t < hasta; t += t < FIN_GANCHO ? PASO_GANCHO : PASO_RESTO) {
    tiempos.push(Number(t.toFixed(2)));
  }
  console.log(`🖼️  ${tiempos.length} frames (cada ${PASO_GANCHO}s hasta ${FIN_GANCHO}s, ${PASO_RESTO}s después)`);

  const lineas: string[] = [
    `# ${nombre} — ${dur.toFixed(1)}s`,
    '',
    'Cada fila es un instante: lo que se **oye** ahí y el frame que se **ve**.',
    'Ábrelos con `Read` mientras lees la columna de audio; si lo que se oye no',
    'corresponde a lo que se ve, ahí está el problema.',
    '',
    '| tiempo | se escucha | dBFS | frame |',
    '| --- | --- | --- | --- |',
  ];

  for (const t of tiempos) {
    const file = `f-${mmss(t).replace(':', 'm')}.jpg`;
    ffmpeg(['-v', 'error', '-y', '-ss', String(t), '-i', render, '-frames:v', '1',
      '-vf', 'scale=360:-1', '-q:v', '4', path.join(dir, file)]);
    const dichas = palabras
      .filter((w) => w.to > t - 0.5 && w.from < t + 0.5)
      .map((w) => w.text)
      .join(' ')
      .trim();
    const nivel = db[Math.floor(t / 0.25)];
    lineas.push(
      `| ${mmss(t)} | ${dichas || '—'} | ${nivel === undefined ? '—' : nivel.toFixed(0)} | \`${file}\` |`,
    );
  }

  // Tramos sin ninguna señal: se oyen como si el video se hubiera roto.
  const mudos: string[] = [];
  let inicio: number | null = null;
  db.forEach((v, i) => {
    const t = i * 0.25;
    if (v < -45) inicio = inicio ?? t;
    else if (inicio !== null) {
      if (t - inicio >= 0.5) mudos.push(`${mmss(inicio)}–${mmss(t)}`);
      inicio = null;
    }
  });
  if (mudos.length) lineas.push('', `> ⚠️ Silencio digital en: ${mudos.join(', ')}`);

  fs.writeFileSync(path.join(dir, 'GUION.md'), `${lineas.join('\n')}\n`);
  fs.unlinkSync(wav);

  // --- La gráfica, en contexto -----------------------------------------------
  // Cada ícono, sticker y foto en el instante en que está entero, sacado del
  // render real. Es la única forma de saber si tapa la cara o choca con el
  // subtítulo: en el primer render de prueba la foto tapaba la cara entera y
  // nada en los props lo decía. Una imagen para toda la gráfica del video.
  const propsFile = path.join('out', `${nombre.replace(/-reel$/, '')}.reel.props.json`);
  if (fs.existsSync(propsFile)) {
    const props = JSON.parse(fs.readFileSync(propsFile, 'utf8')) as VerticalReelProps;
    const fps = 30;
    const T = props.transitionInFrames ?? 8;
    const momentos: Array<{t: number; etiqueta: string}> = [];
    let cursor = 0;
    for (const shot of props.shots) {
      for (const o of shot.overlays ?? []) {
        // Medio segundo después de entrar, o la mitad de su ventana si es más corta:
        // si no, un overlay breve se muestrea cuando ya se fue.
        const ventana = Math.max(Math.min(o.durationSeconds ?? 1.4, shot.durationInSeconds - 0.2 - o.atSeconds), 0.1);
        const t = (cursor + o.atSeconds * fps) / fps + Math.min(0.5, ventana / 2);
        momentos.push({t, etiqueta: `${mmss(t)} ${o.tipo} ${path.basename(o.src, path.extname(o.src))}`.slice(0, 40)});
      }
      cursor += shotFrames(shot, fps) - T;
    }
    if (momentos.length) {
      try {
        const tmp = path.join(dir, '_grafica');
        fs.mkdirSync(tmp, {recursive: true});
        momentos.forEach((m, i) => {
          const txt = path.join(tmp, `t${i}.txt`);
          fs.writeFileSync(txt, m.etiqueta);
          ffmpegCompleto([
            '-ss', m.t.toFixed(2), '-i', render, '-frames:v', '1',
            '-vf', `scale=270:-2,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile=${txt}:fontsize=13:fontcolor=white:box=1:boxcolor=0x07080cDD:boxborderw=5:x=5:y=5`,
            path.join(tmp, `f${String(i).padStart(2, '0')}.jpg`),
          ]);
        });
        const cols = Math.min(momentos.length, 4);
        ffmpegCompleto([
          '-i', path.join(tmp, 'f%02d.jpg'),
          '-vf', `tile=${cols}x${Math.ceil(momentos.length / cols)}:padding=6:margin=6:color=0x07080c`,
          '-frames:v', '1', path.join(dir, 'GRAFICA.jpg'),
        ]);
        fs.rmSync(tmp, {recursive: true, force: true});
        console.log(`🎨 ${dir}/GRAFICA.jpg — ${momentos.length} overlays en contexto. Revisa que ninguno tape la cara ni el subtítulo.`);
      } catch (error) {
        console.warn(`⚠️  No se pudo armar la hoja de gráfica: ${(error as Error).message}`);
      }
    }
  }
  console.log(`\n✅ ${dir}/GUION.md — léelo y abre los frames que te llamen la atención.`);
  if (mudos.length) console.log(`⚠️  Silencio digital: ${mudos.join(', ')}`);
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
