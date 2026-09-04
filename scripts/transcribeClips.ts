/**
 * Transcribe con whisper.cpp los clips que tienen voz y guarda, por clip:
 *   - segments: frases con inicio/fin (para subtítulos)
 *   - words: palabras con timestamp (para subtítulos karaoke)
 *   - speech: tramos con voz (para cortar silencios)
 *
 *   npm run transcribe -- --dir public/input/video-46/_audio
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
export type ClipTranscript = {
  file: string;
  language: string;
  segments: Segment[];
  words: Word[];
  /** Tramos con voz, ya fusionados: sirven para cortar silencios. */
  speech: Array<{start: number; end: number}>;
};

/** Une tramos de voz separados por menos de `gap` segundos. */
const mergeSpeech = (
  segments: Array<{start: number; end: number}>,
  gap = 0.45,
  pad = 0.12,
): Array<{start: number; end: number}> => {
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const out: Array<{start: number; end: number}> = [];
  for (const segment of sorted) {
    const start = Math.max(segment.start - pad, 0);
    const end = segment.end + pad;
    const last = out[out.length - 1];
    if (last && start - last.end <= gap) {
      last.end = Math.max(last.end, end);
    } else {
      out.push({start, end});
    }
  }
  return out;
};

/** Detecta voz midiendo el nivel del WAV: evita transcribir B-roll mudo. */
const hasSpeech = (file: string, thresholdDb = -38, minRatio = 0.04): boolean => {
  const buffer = fs.readFileSync(file);
  const dataIndex = buffer.indexOf('data', 12, 'ascii');
  if (dataIndex === -1) return false;
  const sampleRate = buffer.readUInt32LE(24);
  const samples = buffer.subarray(dataIndex + 8);
  const window = Math.floor(sampleRate * 0.25) * 2;
  let loud = 0;
  let total = 0;

  for (let offset = 0; offset + window <= samples.length; offset += window) {
    let sum = 0;
    for (let i = offset; i < offset + window; i += 2) {
      const value = samples.readInt16LE(i) / 32768;
      sum += value * value;
    }
    const db = 20 * Math.log10(Math.sqrt(sum / (window / 2)) + 1e-9);
    if (db > thresholdDb) loud++;
    total++;
  }
  return total > 0 && loud / total >= minRatio;
};

const main = async () => {
  const dir = arg('dir') ?? 'public/input/video-46/_audio';
  const model = (arg('model') ?? 'small') as WhisperModel;
  const language = arg('language') ?? 'es';

  await installWhisperCpp({to: WHISPER_PATH, version: WHISPER_VERSION});
  await downloadWhisperModel({model, folder: WHISPER_PATH});

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.wav')).sort();

  for (const file of files) {
    const inputPath = path.resolve(dir, file);
    const target = path.join(dir, `${file.replace(/\.wav$/, '')}.json`);

    if (!hasSpeech(inputPath)) {
      // B-roll sin voz: sin transcripción (si no, whisper alucina marcas).
      if (fs.existsSync(target)) fs.unlinkSync(target);
      console.log(`🔇 ${file} sin voz, se omite`);
      continue;
    }

    console.log(`🎙️  ${file}`);

    const {transcription} = await transcribe({
      inputPath,
      whisperPath: WHISPER_PATH,
      model,
      language: language as Language,
      tokenLevelTimestamps: true,
      whisperCppVersion: WHISPER_VERSION,
      printOutput: false,
    });

    // whisper.cpp devuelve tokens (trozos de palabra). Los que empiezan con
    // espacio abren palabra nueva; el resto continúa la anterior.
    const rawWords: Word[] = [];
    for (const item of transcription) {
      const raw = item.text ?? '';
      if (!raw.trim()) continue;
      const start = item.offsets.from / 1000;
      const end = item.offsets.to / 1000;
      const last = rawWords[rawWords.length - 1];
      if (!last || raw.startsWith(' ')) {
        rawWords.push({text: raw.trim(), start, end});
      } else {
        last.text += raw;
        last.end = end;
      }
    }

    // Filtra las marcas que whisper inventa en los silencios:
    // [BLANK_AUDIO], (música), *suspiro*, [silbando]...
    const words: Word[] = [];
    let inMarker = false;
    for (const word of rawWords) {
      const text = word.text.trim();
      if (!text) continue;
      if (/[[(*]/.test(text)) inMarker = true;
      const closes = /[\])*]/.test(text);
      if (inMarker) {
        if (closes) inMarker = false;
        continue;
      }
      if (closes && /^[\])*.,;:!?¡¿-]+$/.test(text)) continue;
      if (/^[.,;:!?¡¿"'()\[\]*-]+$/.test(text)) continue;
      words.push({text, start: word.start, end: word.end});
    }

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

    const result: ClipTranscript = {
      file: file.replace(/\.wav$/, ''),
      language,
      segments: segments.map((s) => ({...s, text: s.text.trim()})),
      words,
      speech: mergeSpeech(words),
    };

    fs.writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
    console.log(
      `   ${result.segments.length} frases · ${result.speech.length} tramos con voz → ${path.basename(target)}`,
    );
    for (const s of result.segments) {
      console.log(`   [${s.start.toFixed(2)}-${s.end.toFixed(2)}] ${s.text}`);
    }
  }
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
