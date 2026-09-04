/**
 * Orquesta el pipeline completo:
 *   Drive -> public/input -> metadata (ffprobe) -> remotion render -> out/final.mp4
 *
 * Uso:
 *   npm run process -- --project "Video 41" --hook "Tu gancho aquí"
 *   npm run process -- --skip-fetch                # reutiliza lo ya descargado
 *   npm run process -- --transcode                 # normaliza .MOV a .mp4 antes de renderizar
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fetchDriveClip, parseArgs as parseFetchArgs} from './fetchDriveClip';
import {normalize, probe, run} from './lib/media';
import {LATEST_MANIFEST, type ClipManifest} from './lib/manifest';

type SubtitleCue = {text: string; fromSeconds: number; toSeconds: number};

const argv = process.argv.slice(2);

const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) {
    return argv[index + 1];
  }
  return undefined;
};
const flag = (name: string) => argv.includes(`--${name}`);

const loadSubtitles = (manifest: ClipManifest): SubtitleCue[] => {
  const explicit = arg('subtitles');
  const candidates = [
    explicit,
    path.join('public', manifest.inputDir, 'subtitles.json'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`💬 Subtítulos: ${candidate}`);
      return JSON.parse(fs.readFileSync(candidate, 'utf8')) as SubtitleCue[];
    }
    if (explicit && candidate === explicit) {
      throw new Error(`No existe el archivo de subtítulos: ${explicit}`);
    }
  }
  return [];
};

const main = async () => {
  const composition = arg('composition') ?? process.env.REMOTION_COMPOSITION ?? 'VerticalClip';
  const output = arg('out-file') ?? process.env.OUTPUT_FILE ?? 'out/final.mp4';

  // 1) Descargar el proyecto desde Drive (o reutilizar la última descarga).
  let manifest: ClipManifest;
  if (flag('skip-fetch')) {
    if (!fs.existsSync(LATEST_MANIFEST)) {
      throw new Error(
        `No hay descarga previa (${LATEST_MANIFEST}). Ejecuta sin --skip-fetch.`,
      );
    }
    manifest = JSON.parse(fs.readFileSync(LATEST_MANIFEST, 'utf8')) as ClipManifest;
    console.log(`♻️  Reutilizando: ${manifest.project.name}`);
  } else {
    const fetched = await fetchDriveClip(parseFetchArgs(argv));
    if (!fetched) return; // --list
    manifest = fetched;
  }

  if (!manifest.mainClip) {
    throw new Error(
      `El proyecto "${manifest.project.name}" no tiene ningún video descargado.`,
    );
  }

  // 2) Metadata del clip principal.
  let absoluteClip = path.resolve('public', manifest.mainClip);
  if (flag('transcode') && path.extname(absoluteClip).toLowerCase() !== '.mp4') {
    absoluteClip = normalize(absoluteClip, path.join(path.dirname(absoluteClip), '_normalized'));
  }

  const info = probe(absoluteClip);
  const publicRelativeClip = path
    .relative(path.resolve('public'), absoluteClip)
    .split(path.sep)
    .join('/');

  console.log(
    `📊 ${path.basename(absoluteClip)} · ${info.width}x${info.height} · ${info.fps.toFixed(2)}fps · ${info.durationInSeconds.toFixed(2)}s`,
  );

  // 3) Props de la composición.
  const startFromSeconds = Number(arg('start') ?? 0);
  const maxSeconds = Number(arg('max-seconds') ?? process.env.MAX_CLIP_SECONDS ?? 0);
  const usableSeconds = Math.max(info.durationInSeconds - startFromSeconds, 0.1);

  const props = {
    src: publicRelativeClip,
    hook: arg('hook') ?? process.env.HOOK_TEXT ?? manifest.project.name,
    subtitles: loadSubtitles(manifest),
    audioSrc: arg('audio') ?? manifest.mainAudio ?? undefined,
    videoVolume: Number(arg('video-volume') ?? 1),
    audioVolume: Number(arg('audio-volume') ?? 0.6),
    startFromSeconds,
    durationInSeconds:
      maxSeconds > 0 ? Math.min(usableSeconds, maxSeconds) + startFromSeconds : info.durationInSeconds,
    accentColor: arg('accent') ?? process.env.ACCENT_COLOR ?? '#22D3EE',
  };

  fs.mkdirSync(path.dirname(output), {recursive: true});
  const propsFile = path.join('out', 'props.json');
  fs.writeFileSync(propsFile, `${JSON.stringify(props, null, 2)}\n`);

  if (flag('dry-run')) {
    console.log(`\n🧪 dry-run. Props escritos en ${propsFile}:\n`, props);
    return;
  }

  // 4) Render.
  console.log(`\n🚀 remotion render ${composition} ${output}`);
  run('npx', [
    'remotion',
    'render',
    composition,
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
  main().catch((error: unknown) => {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
