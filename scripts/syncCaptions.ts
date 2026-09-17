/**
 * Corrige los subtítulos transcribiendo el audio YA MONTADO.
 *
 *   npm run captions -- --project video-46
 *
 * Por qué existe: los tiempos de las palabras se venían infiriendo sobre el
 * audio original y después ese audio se cortaba, aceleraba y montaba. Cada
 * transformación agregaba error, y se midió hasta 1,2 s de desfase.
 *
 * Acá se hace al revés: se arma la pista de voz exactamente como suena en el
 * reel (mismos cortes, misma velocidad, mismas posiciones), se transcribe esa
 * pista, y los tiempos que salen ya están en la línea de tiempo final. No hay
 * nada que inferir, así que no hay nada que se pueda desfasar.
 *
 * El costo es una pasada extra de whisper por render. Vale la pena: un
 * subtítulo que no calza es lo primero que se nota en un reel.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  type Language,
  type WhisperModel,
} from '@remotion/install-whisper-cpp';
import {run} from './lib/media';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

const WHISPER_PATH = path.resolve('whisper.cpp');
const WHISPER_VERSION = '1.5.5';
const FPS = 30;

type Word = {text: string; start: number; end: number};
type Shot = {
  src: string;
  wordsLocked?: boolean;
  startFromSeconds: number;
  durationInSeconds: number;
  words?: Word[];
  audioSrc?: string;
  audioStartFromSeconds?: number;
  speed?: number;
};

/** atempo solo acepta 0.5-2.0; fuera de ese rango habría que encadenarlo. */
const atempo = (speed: number) => `atempo=${Math.min(2, Math.max(0.5, speed)).toFixed(4)}`;

export const syncCaptions = async (propsFile: string, model: WhisperModel, language: Language) => {
  const props = JSON.parse(fs.readFileSync(propsFile, 'utf8')) as {
    shots: Shot[];
    transitionInFrames?: number;
  };
  const T = (props.transitionInFrames ?? 3) / FPS;

  // Posición de cada corte en la línea de tiempo final. Es la misma cuenta que
  // hace TransitionSeries: los cortes se solapan por la duración de la transición.
  const starts: number[] = [];
  let cursor = 0;
  for (const shot of props.shots) {
    starts.push(cursor);
    cursor += shot.durationInSeconds - T;
  }
  const totalDuration = cursor + T;

  const conVoz = props.shots
    .map((shot, index) => ({shot, index}))
    .filter(({shot}) => shot.audioSrc && shot.words?.length);

  if (!conVoz.length) {
    console.log('No hay cortes con voz: nada que sincronizar.');
    return;
  }

  const tmpDir = path.join('out', 'captions-tmp');
  fs.rmSync(tmpDir, {recursive: true, force: true});
  fs.mkdirSync(tmpDir, {recursive: true});

  // Cada corte se extrae con su velocidad aplicada y se coloca en su posición
  // exacta con adelay; después se mezclan todos. Así la pista queda igual a la
  // del reel, no parecida.
  const inputs: string[] = [];
  const filtros: string[] = [];
  conVoz.forEach(({shot, index}, i) => {
    const speed = shot.speed ?? 1;
    const audioPath = path.join('public', shot.audioSrc as string);
    const from = shot.audioStartFromSeconds ?? shot.startFromSeconds;
    const sourceDuration = shot.durationInSeconds * speed;
    const delayMs = Math.round(starts[index] * 1000);

    inputs.push('-ss', from.toFixed(3), '-t', sourceDuration.toFixed(3), '-i', audioPath);
    filtros.push(
      `[${i}:a]${speed === 1 ? 'acopy' : atempo(speed)},aformat=sample_fmts=s16:sample_rates=16000:channel_layouts=mono,adelay=${delayMs}:all=1[a${i}]`,
    );
  });

  const mezcla = `${conVoz.map((_, i) => `[a${i}]`).join('')}amix=inputs=${conVoz.length}:normalize=0[out]`;
  const assembled = path.join(tmpDir, 'voz-montada.wav');

  console.log(`🎚️  Montando la pista de voz (${conVoz.length} cortes, ${totalDuration.toFixed(1)}s)...`);
  run('npx', [
    'remotion', 'ffmpeg', '-y',
    ...inputs,
    '-filter_complex', [...filtros, mezcla].join(';'),
    '-map', '[out]',
    '-t', totalDuration.toFixed(3),
    '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le',
    assembled,
  ]);

  await installWhisperCpp({to: WHISPER_PATH, version: WHISPER_VERSION});
  await downloadWhisperModel({model, folder: WHISPER_PATH});

  console.log('🎙️  Transcribiendo la pista montada...');
  const {transcription} = await transcribe({
    inputPath: path.resolve(assembled),
    whisperPath: WHISPER_PATH,
    model,
    language,
    tokenLevelTimestamps: true,
    whisperCppVersion: WHISPER_VERSION,
    printOutput: false,
  });

  // Tokens -> palabras, en tiempos de la línea de tiempo final.
  const globales: Word[] = [];
  for (const item of transcription) {
    const raw = item.text ?? '';
    if (!raw.trim()) continue;
    const last = globales[globales.length - 1];
    if (!last || raw.startsWith(' ')) {
      globales.push({text: raw.trim(), start: item.offsets.from / 1000, end: item.offsets.to / 1000});
    } else {
      last.text += raw;
      last.end = item.offsets.to / 1000;
    }
  }

  const limpias = globales.filter(
    (w) => w.text.trim() && !/[[(\]]/.test(w.text) && !/^[.,;:!?¡¿"'*-]+$/.test(w.text.trim()),
  );

  // Cada palabra vuelve al corte donde cae, con tiempos relativos a ese corte.
  let reasignadas = 0;
  let bloqueados = 0;
  props.shots.forEach((shot, index) => {
    if (!shot.words?.length) return;
    const desde = starts[index];
    const hasta = desde + shot.durationInSeconds;
    const suyas = limpias
      .filter((w) => {
        const medio = (w.start + w.end) / 2;
        return medio >= desde && medio < hasta;
      })
      .map((w) => ({
        text: w.text.trim(),
        start: Math.max(w.start - desde, 0),
        end: Math.min(Math.max(w.end - desde, 0.05), shot.durationInSeconds),
      }));
    if (!suyas.length) return;

    if (shot.wordsLocked) {
      // Texto humano, tiempos medidos. Las dos mitades importan:
      //
      // El TEXTO no se puede retranscribir — whisper vuelve a oír "y que" donde
      // dice "IKEA?" y la corrección se perdería en cada render, sin aviso.
      // Pero los TIEMPOS escritos a mano tampoco sirven: se midieron 1,2 s de
      // desfase en la línea corregida, exactamente el problema que la corrección
      // venía a arreglar.
      //
      // Así que se conserva el texto de la persona y se le pegan los tiempos que
      // whisper midió sobre el audio montado, repartiendo por índice. Eso
      // preserva las pausas reales (una pausa dramática entre "IKEA?" y "NADA"
      // sobrevive, cosa que un reparto proporcional aplastaría) y aguanta que la
      // cantidad de palabras no coincida: "IKEA?" es una palabra y whisper la
      // oye como dos.
      const humanas = shot.words;
      const h0 = humanas[0].start;
      const h1 = humanas[humanas.length - 1].end;
      const s0 = suyas[0].start;
      const s1 = suyas[suyas.length - 1].end;
      const largoH = h1 - h0;
      const largoS = s1 - s0;
      // El ritmo interno del texto humano se respeta tal cual — ahí va la pausa
      // dramática entre "IKEA?" y "NADA", que cualquier reparto parejo aplasta.
      // Solo se ancla el arranque al inicio de voz medido, y se reescala si los
      // dos largos se parecen. Si whisper devolvió muy poco en este corte
      // (pasa cuando el tramo es corto o hay música encima) no se reescala:
      // estirar contra una medición pobre es peor que no tocar nada.
      const escala =
        largoH > 0.2 && largoS / largoH > 0.6 && largoS / largoH < 1.6 ? largoS / largoH : 1;
      shot.words = humanas.map((palabra) => ({
        text: palabra.text,
        start: Math.max(s0 + (palabra.start - h0) * escala, 0),
        end: Math.min(s0 + (palabra.end - h0) * escala, shot.durationInSeconds),
      }));
      bloqueados += humanas.length;
      return;
    }

    shot.words = suyas;
    reasignadas += suyas.length;
  });

  fs.writeFileSync(propsFile, `${JSON.stringify(props, null, 2)}\n`);
  fs.rmSync(tmpDir, {recursive: true, force: true});
  console.log(
    `✅ ${reasignadas} palabras resincronizadas contra el audio real → ${propsFile}` +
      (bloqueados ? ` (${bloqueados} con texto corregido a mano, retimadas)` : ''),
  );
};

const isMain = process.argv[1]
  ? path.basename(process.argv[1]).startsWith('syncCaptions')
  : false;

if (isMain) {
  const project = arg('project') ?? 'video-46';
  const propsFile = arg('props') ?? path.join('out', `${project}.reel.props.json`);
  syncCaptions(
    propsFile,
    (arg('model') ?? 'medium') as WhisperModel,
    (arg('language') ?? 'es') as Language,
  ).catch((error: unknown) => {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
