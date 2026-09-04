/**
 * Arma el reel vertical a partir de los clips sueltos de un proyecto:
 *   proxy 1080x1920 -> corte de silencios con la transcripción -> props -> render.
 *
 *   npm run reel -- --plan plans/video-46.json
 *   npm run reel -- --plan plans/video-46.json --dry-run
 *
 * Si existe la transcripción del clip (scripts/transcribeClips.ts), cada tramo
 * con voz se convierte en un corte y los silencios quedan fuera. Los clips sin
 * voz (B-roll) usan la ventana y el texto definidos en el plan.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalize, probe, run} from './lib/media';
import {
  reelDurationInFrames,
  type ReelShot,
  type ReelWord,
  type VerticalReelProps,
} from '../src/lib/reel';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};
const flag = (name: string) => argv.includes(`--${name}`);

type PlanClip = {
  file: string;
  label?: string;
  caption?: string;
  startFromSeconds?: number;
  durationInSeconds?: number;
  /** Ignora la voz de este clip aunque exista transcripción. */
  ignoreSpeech?: boolean;
};

type Plan = {
  project?: string;
  dir: string;
  hook: string;
  cta?: string;
  ctaSub?: string;
  accentColor?: string;
  musicSrc?: string;
  musicVolume?: number;
  sfxVolume?: number;
  transitionInFrames?: number;
  /** Silencio máximo tolerado dentro de un tramo con voz. */
  clips: PlanClip[];
};

type Transcript = {
  words: ReelWord[];
  speech: Array<{start: number; end: number}>;
};

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv'];
const MIN_SHOT_SECONDS = 0.8;
/** Pausas más cortas que esto no valen un corte: se fusionan. */
const MERGE_GAP_SECONDS = 0.4;

const mergeRanges = (ranges: Array<{start: number; end: number}>) => {
  const merged: Array<{start: number; end: number}> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start - last.end < MERGE_GAP_SECONDS) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({...range});
    }
  }
  return merged;
};

const publicPath = (absolute: string) =>
  path.relative(path.resolve('public'), absolute).split(path.sep).join('/');

const loadTranscript = (audioDir: string, name: string): Transcript | null => {
  const file = path.join(audioDir, `${name}.json`);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as Transcript;
  return data.speech?.length ? data : null;
};

const main = () => {
  const planPath = arg('plan');
  if (!planPath) throw new Error('Falta --plan <archivo.json>');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as Plan;

  const fps = Number(arg('fps') ?? 30);
  const project = plan.project ?? path.basename(path.dirname(plan.dir));
  const projectDir = path.dirname(plan.dir);
  const normalizedDir = path.join(projectDir, '_normalized');
  const audioDir = path.join(projectDir, '_audio');

  if (!fs.existsSync(plan.dir)) throw new Error(`No existe la carpeta de clips: ${plan.dir}`);

  const items: PlanClip[] = plan.clips?.length
    ? plan.clips
    : fs
        .readdirSync(plan.dir)
        .filter((f) => VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
        .sort()
        .map((file) => ({file}));

  const shots: ReelShot[] = [];

  for (const item of items) {
    const source = path.resolve(plan.dir, item.file);
    if (!fs.existsSync(source)) throw new Error(`No existe el clip del plan: ${source}`);

    const name = path.basename(item.file, path.extname(item.file));
    const proxy = normalize(source, normalizedDir, fps);
    const info = probe(proxy);
    const src = publicPath(proxy);

    const windowStart = Math.max(item.startFromSeconds ?? 0, 0);
    const windowEnd = item.durationInSeconds
      ? Math.min(windowStart + item.durationInSeconds, info.durationInSeconds)
      : info.durationInSeconds;

    const transcript = item.ignoreSpeech ? null : loadTranscript(audioDir, name);
    const audioFile = path.join(audioDir, `${name}.wav`);
    const audioSrc = fs.existsSync(audioFile) ? publicPath(path.resolve(audioFile)) : undefined;

    if (transcript) {
      // Corte de silencios: un corte por cada tramo con voz.
      const ranges = mergeRanges(transcript.speech)
        .map((range) => ({
          start: Math.max(range.start, windowStart),
          end: Math.min(range.end, windowEnd),
        }))
        .filter((range) => range.end - range.start >= MIN_SHOT_SECONDS);

      if (ranges.length) {
        ranges.forEach((range, index) => {
          const words = transcript.words
            .filter((word) => {
              const middle = (word.start + word.end) / 2;
              return middle >= range.start && middle < range.end;
            })
            .map((word) => ({
              text: word.text,
              start: Math.min(Math.max(word.start - range.start, 0), range.end - range.start),
              end: Math.min(Math.max(word.end - range.start, 0.05), range.end - range.start),
            }));

          shots.push({
            src,
            startFromSeconds: Number(range.start.toFixed(3)),
            durationInSeconds: Number((range.end - range.start).toFixed(3)),
            label: index === 0 ? item.label : undefined,
            words,
            audioSrc,
            audioStartFromSeconds: Number(range.start.toFixed(3)),
          });
        });
        const cut = (windowEnd - windowStart) - ranges.reduce((s, r) => s + (r.end - r.start), 0);
        console.log(
          `🗣️  ${item.file} · ${ranges.length} tramos con voz · ${cut.toFixed(1)}s de silencio cortados`,
        );
        continue;
      }
    }

    // B-roll: ventana fija del plan con su bajada de texto.
    const duration = Math.max(
      Math.min(item.durationInSeconds ?? 3.4, info.durationInSeconds - windowStart),
      MIN_SHOT_SECONDS,
    );
    shots.push({
      src,
      startFromSeconds: Number(windowStart.toFixed(3)),
      durationInSeconds: Number(duration.toFixed(3)),
      label: item.label,
      caption: item.caption,
    });
    console.log(`🎞️  ${item.file} · B-roll ${windowStart}s +${duration.toFixed(2)}s`);
  }

  if (!shots.length) throw new Error('El plan no produjo ningún corte.');

  const transitionInFrames = plan.transitionInFrames ?? 8;
  const totalFrames = reelDurationInFrames(shots, fps, transitionInFrames);

  const sfxDir = 'sfx';
  const sfx = fs.existsSync('public/sfx')
    ? {
        whoosh: `${sfxDir}/whoosh.wav`,
        tick: `${sfxDir}/tick.wav`,
        riser: `${sfxDir}/riser.wav`,
        impact: `${sfxDir}/impact.wav`,
      }
    : undefined;

  const props: VerticalReelProps = {
    shots,
    hook: plan.hook,
    cta: plan.cta,
    ctaSub: plan.ctaSub,
    accentColor: plan.accentColor ?? '#FF8A3D',
    musicSrc: arg('music') ?? plan.musicSrc,
    musicVolume: plan.musicVolume ?? 0.32,
    voiceVolume: 1,
    sfx,
    sfxVolume: plan.sfxVolume ?? 0.3,
    transitionInFrames,
  };

  fs.mkdirSync('out', {recursive: true});
  const propsFile = path.join('out', `${project}.reel.props.json`);
  const propsJson = `${JSON.stringify(props, null, 2)}\n`;
  const previousProps = fs.existsSync(propsFile)
    ? fs.readFileSync(propsFile, 'utf8')
    : null;
  fs.writeFileSync(propsFile, propsJson);

  console.log(
    `\n📐 ${shots.length} cortes · ${totalFrames} frames · ${(totalFrames / fps).toFixed(1)}s → ${propsFile}`,
  );

  if (flag('dry-run')) return;

  const output = arg('out-file') ?? `renders/${project}-reel.mp4`;
  fs.mkdirSync(path.dirname(output), {recursive: true});

  // Reanudable: si el plan y los props no cambiaron y el render es posterior,
  // no se vuelve a renderizar (son varios minutos de CPU).
  const upToDate =
    previousProps === propsJson &&
    fs.existsSync(output) &&
    fs.statSync(output).mtimeMs >= fs.statSync(planPath).mtimeMs;

  if (upToDate && !flag('force')) {
    console.log(`\n✅ ${output} ya está al día (--force para rehacer)`);
    return;
  }

  console.log(`\n🚀 remotion render VerticalReel ${output}`);
  run('npx', [
    'remotion',
    'render',
    'VerticalReel',
    output,
    `--props=${propsFile}`,
    ...(arg('concurrency') ? [`--concurrency=${arg('concurrency')}`] : []),
  ]);
  console.log(`\n✅ Listo: ${output}`);
};

const isMain = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isMain) {
  try {
    main();
  } catch (error: unknown) {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
