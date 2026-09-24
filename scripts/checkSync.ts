/**
 * Mide si el render quedó sincronizado. Tres cosas, sobre el archivo final:
 *
 *   1. Audio por corte: ¿el sonido sale del instante de la fuente que el plan
 *      pide, y el plan pide el mismo instante para imagen y sonido?
 *   2. Subtítulos: ¿cada palabra aparece cuando se escucha?
 *   3. Contenedor: ¿las dos pistas arrancan en 0?
 *
 *   npm run sync -- --render renders/video-46-reel.mp4
 *   npm run sync -- --render renders/video-46-reel.mp4 --skip-subs   (rápido, sin whisper)
 *
 * Por qué existe: se entregaron ediciones sin verificar esto. Mirar frames
 * sueltos y un gráfico de niveles NO puede detectar un desfase de audio — son
 * justo las dos cosas que se ven bien cuando el video está desincronizado. Y
 * "lo miré y se ve bien" no es una medición.
 *
 * Ojo con el punto 1: mide el AUDIO, no el video. Ver el comentario largo más
 * abajo — medir el video correlacionando movimiento contra el proxy da falsos
 * positivos de hasta 0,6 s y hace perder horas persiguiendo un bug que no
 * existe.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {hasSystemFfmpeg} from './lib/media';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

const FPS = 30;
/** El golpe de entrada de cada corte dura 9 cuadros; se mide después. */
const TRAS_EL_GOLPE = 0.6;
/** Sobre esto el desfase se nota mirando la boca. */
const TOPE_AV = 0.08;
/** Sobre esto el subtítulo se lee "corrido" respecto a la voz. */
const TOPE_SUBS = 0.15;

type Word = {text: string; start: number; end: number};
type Shot = {
  src: string;
  startFromSeconds: number;
  durationInSeconds: number;
  audioStartFromSeconds?: number;
  audioSrc?: string;
  words?: Word[];
  speed?: number;
  /** La voz suena pero el subtítulo no se dibuja: no hay nada que medir. */
  hideCaptions?: boolean;
};

const ff = (args: string[], capture = true): Buffer => {
  const cmd = hasSystemFfmpeg() ? ['ffmpeg'] : ['npx', 'remotion', 'ffmpeg'];
  const r = spawnSync(cmd[0], [...cmd.slice(1), ...args], {
    maxBuffer: 1024 * 1024 * 512,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  return r.stdout ?? Buffer.alloc(0);
};

/** Muestras de un WAV mono 16 kHz, centradas. */
const muestras = (file: string): number[] => {
  const raw = ff([
    '-v', 'error', '-i', file, '-ac', '1', '-ar', '16000', '-f', 's16le', '-',
  ]);
  const n = Math.floor(raw.length / 2);
  const out = new Array<number>(n);
  let suma = 0;
  for (let i = 0; i < n; i++) {
    out[i] = raw.readInt16LE(i * 2);
    suma += out[i];
  }
  const media = suma / (n || 1);
  for (let i = 0; i < n; i++) out[i] -= media;
  return out;
};

/** Desplazamiento (en muestras) que mejor alinea `patron` dentro de `donde`. */
const mejorLag = (donde: number[], patron: number[], paso = 1): number => {
  let mejor = 0;
  let mejorValor = -Infinity;
  const limite = donde.length - patron.length;
  for (let lag = 0; lag <= limite; lag += paso) {
    let acc = 0;
    for (let i = 0; i < patron.length; i += 4) acc += donde[lag + i] * patron[i];
    if (acc > mejorValor) {
      mejorValor = acc;
      mejor = lag;
    }
  }
  return mejor;
};

const main = async () => {
  const render = arg('render') ?? 'renders/video-46-reel.mp4';
  const project = arg('project') ?? path.basename(render).replace(/-reel\.mp4$/, '');
  const propsFile = arg('props') ?? path.join('out', `${project}.reel.props.json`);
  if (!fs.existsSync(render)) throw new Error(`No existe el render: ${render}`);
  if (!fs.existsSync(propsFile)) throw new Error(`No existen los props: ${propsFile}`);

  const props = JSON.parse(fs.readFileSync(propsFile, 'utf8')) as {
    shots: Shot[];
    transitionInFrames?: number;
  };
  const T = (props.transitionInFrames ?? 3) / FPS;
  let fallos = 0;

  // --- 3. Contenedor -------------------------------------------------------
  const info = spawnSync(
    'npx',
    ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,start_time',
     '-of', 'default=nw=1', render],
    {encoding: 'utf8'},
  ).stdout ?? '';
  const arranques = [...info.matchAll(/start_time=([\d.-]+)/g)].map((m) => Number(m[1]));
  const desalineado = arranques.some((t) => Math.abs(t) > 0.01);
  console.log(`\n📦 Contenedor: pistas arrancan en ${arranques.map((t) => t.toFixed(3)).join(' / ')}${desalineado ? '  ⚠️' : '  ✓'}`);
  if (desalineado) fallos++;

  // --- 1. A/V por corte ----------------------------------------------------
  //
  // Acá NO se mide el video contra el proxy correlacionando movimiento. Se
  // probó y da falsos positivos grandes: hay que remuestrear el proxy a
  // 30/velocidad fps para comparar en el mismo reloj, y ese remuestreo mete
  // ±40 ms de jitter; además el render trae zoom, grade y un golpe de escala de
  // 9 cuadros al empezar cada corte, que es movimiento que el proxy no tiene.
  // Con ese método salieron desfases de +0,2 a +0,6 s en los cortes acelerados
  // que NO existen: una prueba controlada (composición sin efectos, comparando
  // el frame exacto) mostró que `trimBefore` + `playbackRate` de Remotion
  // aciertan el cuadro dentro de ±1 frame. Medir mal es peor que no medir.
  //
  // Lo que sí se verifica, que es lo que puede romperse de verdad:
  //   a) el plan pide el mismo instante para imagen y sonido, y
  //   b) el audio del render sale del instante que el plan pide.
  // Con esas dos, la sincronía A/V queda garantizada por construcción, porque
  // imagen y sonido usan el mismo `trimBefore` y el mismo `playbackRate`.
  console.log('\n🎬 Audio de cada corte contra su fuente:\n');
  const renderWav = path.join('out', 'sync-render.wav');
  fs.mkdirSync('out', {recursive: true});
  ff(['-v', 'error', '-y', '-i', render, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', renderWav], false);
  const ren = muestras(renderWav);

  let cursor = 0;
  const desfases: number[] = [];
  for (const [i, shot] of props.shots.entries()) {
    const inicio = cursor;
    cursor += shot.durationInSeconds - T;
    if (!shot.words?.length || !shot.audioSrc) continue;

    // (a) invariante del plan: imagen y sonido tienen que pedir el mismo instante.
    const vs = shot.startFromSeconds;
    const as = shot.audioStartFromSeconds ?? vs;
    if (Math.abs(vs - as) > 0.001) {
      console.log(`   ❌ corte ${i}: el plan pide video en ${vs}s y audio en ${as}s. Eso desincroniza la boca.`);
      fallos++;
    }

    const speed = shot.speed ?? 1;
    if (shot.durationInSeconds < 1.2) continue;
    const nombre = path.basename(shot.src).replace(/\.mp4$/, '');

    // (b) el audio del render sale de donde el plan dice.
    const fuenteWav = path.join('public', shot.audioSrc);
    const estirado = path.join('out', `sync-${nombre}-${speed}.wav`);
    if (!fs.existsSync(estirado)) {
      ff(['-v', 'error', '-y', '-i', fuenteWav, '-af', speed === 1 ? 'acopy' : `atempo=${speed}`,
          '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', estirado], false);
    }
    const fuente = muestras(estirado);
    const a = inicio + TRAS_EL_GOLPE;
    const seg = ren.slice(Math.round(a * 16000), Math.round((a + 1.3) * 16000));
    const audioEn = mejorLag(fuente, seg) / 16000 - TRAS_EL_GOLPE;
    const d = audioEn - as / speed;
    desfases.push(d);
    const mal = Math.abs(d) > TOPE_AV;
    if (mal) fallos++;
    console.log(
      `   ${mal ? '❌' : '✅'} corte ${String(i).padStart(2)} ${nombre.padEnd(9)} vel ${String(speed).padEnd(5)}` +
      ` desfase ${d >= 0 ? '+' : ''}${d.toFixed(3)}s`,
    );
  }
  if (desfases.length) {
    console.log(`\n   peor ${Math.max(...desfases.map(Math.abs)).toFixed(3)}s · tope ${TOPE_AV}s`);
  }

  // --- 1b. Subtítulos apelmazados ---------------------------------------
  // Un corte donde todas las palabras arrancan en el mismo instante se ve como
  // un bloque de texto que aparece de golpe y se ilumina entero. No es un
  // desfase, así que ninguna medición de sincronía lo pesca; hay que buscarlo
  // aparte. Pasó al retimar un texto corregido a mano contra una medición
  // pobre: las 9 palabras quedaron en el mismo tiempo.
  for (const [i, shot] of props.shots.entries()) {
    const w = shot.hideCaptions ? [] : (shot.words ?? []);
    if (w.length < 3) continue;
    const distintos = new Set(w.map((x) => x.start.toFixed(2))).size;
    if (distintos <= Math.max(1, Math.floor(w.length / 4))) {
      console.log(
        `   ❌ corte ${i}: ${w.length} palabras pero solo ${distintos} instante(s) distinto(s). El subtítulo aparece de golpe.`,
      );
      fallos++;
    }
  }

  // --- 2. Subtítulos -------------------------------------------------------
  // Solo los que se dibujan: medir los de un corte con `subtitulos: false` daba
  // un ❌ por texto que nadie ve (Video 41).
  const dibujados = props.shots.some((s) => !s.hideCaptions && s.words?.length);
  if (!dibujados && !argv.includes('--skip-subs')) {
    console.log('\n💬 El reel no dibuja subtítulos: no hay sincronía de subtítulos que medir.');
  } else if (!argv.includes('--skip-subs')) {
    const {downloadWhisperModel, installWhisperCpp, transcribe} = await import(
      '@remotion/install-whisper-cpp'
    );
    const W = path.resolve('whisper.cpp');
    const V = '1.5.5';
    await installWhisperCpp({to: W, version: V});
    await downloadWhisperModel({model: 'medium' as never, folder: W});
    console.log('\n💬 Transcribiendo el render para medir los subtítulos...');
    const {transcription} = await transcribe({
      inputPath: path.resolve(renderWav),
      whisperPath: W,
      model: 'medium' as never,
      language: 'es' as never,
      tokenLevelTimestamps: true,
      whisperCppVersion: V,
      printOutput: false,
    });

    const limpiar = (s: string) => s.toLowerCase().replace(/[^a-záéíóúñü0-9]/gi, '');
    const reales: Array<{text: string; t: number}> = [];
    for (const it of transcription as Array<{text?: string; offsets: {from: number; to: number}}>) {
      const raw = it.text ?? '';
      if (!raw.trim()) continue;
      const last = reales[reales.length - 1];
      const t = (it.offsets.from + it.offsets.to) / 2000;
      if (!last || raw.startsWith(' ')) reales.push({text: limpiar(raw), t});
      else {
        last.text += limpiar(raw);
        last.t = (last.t + t) / 2;
      }
    }

    const esperadas: Array<{text: string; t: number}> = [];
    let c2 = 0;
    for (const shot of props.shots) {
      for (const w of shot.hideCaptions ? [] : (shot.words ?? [])) {
        esperadas.push({text: limpiar(w.text), t: c2 + (w.start + w.end) / 2});
      }
      c2 += shot.durationInSeconds - T;
    }

    const dif: number[] = [];
    for (const e of esperadas) {
      if (e.text.length < 3) continue;
      const cand = reales.filter((r) => r.text === e.text && Math.abs(r.t - e.t) < 2.5);
      if (!cand.length) continue;
      const best = cand.reduce((x, y) => (Math.abs(y.t - e.t) < Math.abs(x.t - e.t) ? y : x));
      dif.push(best.t - e.t);
    }
    if (dif.length) {
      const abs = dif.map(Math.abs).sort((x, y) => x - y);
      const orden = [...dif].sort((x, y) => x - y);
      const medErr = abs[Math.floor(abs.length / 2)];
      const mal = medErr > TOPE_SUBS;
      if (mal) fallos++;
      console.log(
        `   ${mal ? '❌' : '✅'} ${dif.length} palabras · desfase mediano ${orden[Math.floor(orden.length / 2)].toFixed(3)}s · |error| mediano ${medErr.toFixed(3)}s · peor ${abs[abs.length - 1].toFixed(3)}s (tope ${TOPE_SUBS}s)`,
      );
      console.log('   (positivo = la voz llega DESPUÉS que el subtítulo)');
    } else {
      console.log('   ⚠️  No se pudo emparejar ninguna palabra.');
      fallos++;
    }
  }

  console.log(
    fallos ? `\n❌ ${fallos} problema(s) de sincronía.\n` : '\n✅ El render está sincronizado.\n',
  );
  if (fallos) process.exit(1);
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
