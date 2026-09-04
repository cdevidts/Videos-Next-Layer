/**
 * Transcribe con whisper.cpp los clips que tienen voz y guarda, por clip:
 *   - segments: frases con inicio/fin
 *   - words: palabras con timestamp (subtítulos karaoke)
 *   - speech: tramos con voz medidos por energía (corte de silencios)
 *
 *   npm run transcribe -- --dir public/input/video-46/_audio --model medium --language es
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

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

const WHISPER_PATH = path.resolve(arg('whisper') ?? 'whisper.cpp');
const WHISPER_VERSION = '1.5.5';

export type Word = {text: string; start: number; end: number};
export type Segment = {text: string; start: number; end: number};
export type Range = {start: number; end: number};
export type ClipTranscript = {
  file: string;
  language: string;
  segments: Segment[];
  words: Word[];
  speech: Range[];
};

/** Niveles RMS del WAV en ventanas de `window` segundos. */
const rmsWindows = (file: string, window = 0.1): {levels: number[]; window: number} => {
  const buffer = fs.readFileSync(file);
  const dataIndex = buffer.indexOf('data', 12, 'ascii');
  if (dataIndex === -1) return {levels: [], window};
  const sampleRate = buffer.readUInt32LE(24);
  const samples = buffer.subarray(dataIndex + 8);
  const size = Math.floor(sampleRate * window) * 2;
  const levels: number[] = [];

  for (let offset = 0; offset + size <= samples.length; offset += size) {
    let sum = 0;
    for (let i = offset; i < offset + size; i += 2) {
      const value = samples.readInt16LE(i) / 32768;
      sum += value * value;
    }
    levels.push(20 * Math.log10(Math.sqrt(sum / (size / 2)) + 1e-9));
  }
  return {levels, window};
};

/**
 * Tramos con voz según la energía del audio. Es lo que manda para cortar los
 * silencios: whisper suele estirar el primer token hasta t=0.
 */
const energyRanges = (
  file: string,
  thresholdDb = -38,
  maxGap = 0.4,
  pad = 0.12,
): Range[] => {
  const {levels, window} = rmsWindows(file);
  const ranges: Range[] = [];
  let open: Range | null = null;

  levels.forEach((level, index) => {
    const t = index * window;
    if (level > thresholdDb) {
      if (open && t - open.end <= maxGap) {
        open.end = t + window;
      } else {
        if (open) ranges.push(open);
        open = {start: t, end: t + window};
      }
    }
  });
  if (open) ranges.push(open);

  return ranges
    .map((range) => ({
      start: Math.max(range.start - pad, 0),
      end: range.end + pad,
    }))
    .filter((range) => range.end - range.start >= 0.35);
};

const totalSeconds = (ranges: Range[]) =>
  ranges.reduce((sum, range) => sum + (range.end - range.start), 0);

/**
 * Ajusta los tiempos de whisper a los tramos con voz reales.
 *
 * La versión anterior estiraba linealmente toda la frase entre el primer y el
 * último tramo, ignorando los silencios intermedios. Como el habla tiene huecos,
 * las palabras caían dentro de esos huecos y el subtítulo se iba atrasando: se
 * midió un desfase de 0,2 s al principio de una frase y 0,55 s al final.
 *
 * Ahora las palabras se reparten sobre la *suma* de los tramos con voz, saltando
 * los silencios. Así ninguna palabra puede caer en un hueco.
 */
const alignWords = (words: Word[], ranges: Range[]): Word[] => {
  if (!words.length || !ranges.length) return words;

  const from = {start: words[0].start, end: words[words.length - 1].end};
  const fromLength = from.end - from.start;
  const speechLength = totalSeconds(ranges);
  if (fromLength <= 0 || speechLength <= 0) return words;

  /** Convierte una posición 0-1 de la frase en un tiempo real, saltando huecos. */
  const toAbsolute = (progress: number): number => {
    let remaining = Math.max(0, Math.min(1, progress)) * speechLength;
    for (const range of ranges) {
      const length = range.end - range.start;
      if (remaining <= length) return range.start + remaining;
      remaining -= length;
    }
    return ranges[ranges.length - 1].end;
  };

  return words.map((word) => ({
    text: word.text,
    start: toAbsolute((word.start - from.start) / fromLength),
    end: toAbsolute((word.end - from.start) / fromLength),
  }));
};

/** Une los tokens de whisper en palabras: los que abren palabra traen espacio. */
const tokensToWords = (
  transcription: Array<{text?: string; offsets: {from: number; to: number}}>,
): Word[] => {
  const words: Word[] = [];
  for (const item of transcription) {
    const raw = item.text ?? '';
    if (!raw.trim()) continue;
    const last = words[words.length - 1];
    if (!last || raw.startsWith(' ')) {
      words.push({text: raw.trim(), start: item.offsets.from / 1000, end: item.offsets.to / 1000});
    } else {
      last.text += raw;
      last.end = item.offsets.to / 1000;
    }
  }
  return words;
};

/** Descarta lo que whisper inventa en los silencios: [BLANK_AUDIO], (música)... */
const dropMarkers = (words: Word[]): Word[] => {
  const out: Word[] = [];
  let inMarker = false;
  for (const word of words) {
    const text = word.text.trim();
    if (!text) continue;
    if (/[[(*]/.test(text)) inMarker = true;
    const closes = /[\])*]/.test(text);
    if (inMarker) {
      if (closes) inMarker = false;
      continue;
    }
    if (/^[.,;:!?¡¿"'()[\]*-]+$/.test(text)) continue;
    out.push({...word, text});
  }
  return out;
};

const toSegments = (words: Word[]): Segment[] => {
  const segments: Segment[] = [];
  let current: Segment | null = null;
  for (const word of words) {
    if (!current) {
      current = {text: word.text, start: word.start, end: word.end};
      continue;
    }
    if (word.end - current.start > 3.2 || word.start - current.end > 0.6) {
      segments.push(current);
      current = {text: word.text, start: word.start, end: word.end};
    } else {
      current.text = `${current.text} ${word.text}`.replace(/\s+/g, ' ');
      current.end = word.end;
    }
  }
  if (current) segments.push(current);
  return segments;
};

const main = async () => {
  const dir = arg('dir') ?? 'public/input/video-46/_audio';
  const model = (arg('model') ?? 'medium') as WhisperModel;
  const language = (arg('language') ?? 'es') as Language;
  const force = argv.includes('--force');

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.wav')).sort();

  // Primero se decide qué hay que transcribir: si no hay nada pendiente, no se
  // baja el modelo (son 1,5 GB) ni se compila whisper.
  const pending: Array<{file: string; inputPath: string; target: string; ranges: Range[]}> = [];

  for (const file of files) {
    const inputPath = path.resolve(dir, file);
    const name = file.replace(/\.wav$/, '');
    const target = path.join(dir, `${name}.json`);
    const ranges = energyRanges(inputPath);

    // B-roll mudo: sin transcripción (si no, el modelo alucina marcas).
    if (totalSeconds(ranges) < 0.6) {
      if (fs.existsSync(target)) fs.unlinkSync(target);
      console.log(`🔇 ${file} sin voz, se omite`);
      continue;
    }

    // Una transcripción corregida a mano nunca se pisa, ni con --force: el
    // modelo no puede recuperar lo que un humano ya arregló (jerga, nombres).
    if (fs.existsSync(target)) {
      const existing = JSON.parse(fs.readFileSync(target, 'utf8')) as {
        correctedByHuman?: boolean;
      };
      if (existing.correctedByHuman) {
        console.log(`🔒 ${file} corregido a mano, no se toca`);
        continue;
      }
    }

    // Reanudable: lo ya transcrito no se repite salvo --force.
    if (
      !force &&
      fs.existsSync(target) &&
      fs.statSync(target).mtimeMs >= fs.statSync(inputPath).mtimeMs
    ) {
      console.log(`♻️  ${file} ya transcrito (--force para rehacer)`);
      continue;
    }

    pending.push({file, inputPath, target, ranges});
  }

  if (!pending.length) {
    console.log('\n✅ Nada pendiente de transcribir.');
    return;
  }

  await installWhisperCpp({to: WHISPER_PATH, version: WHISPER_VERSION});
  await downloadWhisperModel({model, folder: WHISPER_PATH});

  for (const {file, inputPath, target, ranges} of pending) {
    console.log(`🎙️  ${file}`);
    const {transcription} = await transcribe({
      inputPath,
      whisperPath: WHISPER_PATH,
      model,
      language,
      tokenLevelTimestamps: true,
      whisperCppVersion: WHISPER_VERSION,
      printOutput: false,
    });

    const words = alignWords(dropMarkers(tokensToWords(transcription)), ranges);
    const result: ClipTranscript = {
      file: file.replace(/\.wav$/, ''),
      language,
      segments: toSegments(words),
      words,
      speech: ranges,
    };

    fs.writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
    console.log(
      `   ${result.segments.length} frases · ${ranges.length} tramos con voz (${totalSeconds(ranges).toFixed(1)}s)`,
    );
    for (const segment of result.segments) {
      console.log(`   [${segment.start.toFixed(2)}-${segment.end.toFixed(2)}] ${segment.text}`);
    }
  }
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
