import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

/**
 * El ffmpeg de Remotion viene recortado: no trae `eq`, `signalstats`, `fps`,
 * `tile` ni `drawtext`. Si hay un ffmpeg completo en el sistema se usa ese,
 * porque desbloquea la corrección de color y el análisis. Si no, el pipeline
 * sigue funcionando: solo se salta lo que necesita esos filtros.
 */
export const hasSystemFfmpeg = (): boolean =>
  spawnSync('ffmpeg', ['-version'], {stdio: 'ignore'}).status === 0;

const ffmpegCommand = (needsFullBuild: boolean): {cmd: string; prefix: string[]} =>
  needsFullBuild && hasSystemFfmpeg()
    ? {cmd: 'ffmpeg', prefix: []}
    : {cmd: 'npx', prefix: ['remotion', 'ffmpeg']};

export type MediaInfo = {
  durationInSeconds: number;
  width: number;
  height: number;
  fps: number;
  rotation: number;
};

export const run = (command: string, args: string[], capture = false): string => {
  const result = spawnSync(command, args, {
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`Falló "${command} ${args.join(' ')}"\n${result.stderr ?? ''}`.trim());
  }
  return result.stdout ?? '';
};

/** ffprobe viene incluido con Remotion: no hay que instalar FFmpeg aparte. */
export const probe = (file: string): MediaInfo => {
  const raw = run(
    'npx',
    ['remotion', 'ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', file],
    true,
  );
  const json = JSON.parse(raw.slice(raw.indexOf('{')));
  const video = (json.streams ?? []).find(
    (s: {codec_type: string}) => s.codec_type === 'video',
  );
  const [num, den] = String(video?.avg_frame_rate ?? '30/1').split('/').map(Number);
  const rotation = Math.abs(
    Number(
      (video?.side_data_list ?? []).find(
        (s: {rotation?: number}) => s.rotation !== undefined,
      )?.rotation ?? 0,
    ),
  );
  const swap = rotation === 90 || rotation === 270;
  const width = Number(video?.width ?? 0);
  const height = Number(video?.height ?? 0);

  return {
    durationInSeconds: Number(json.format?.duration ?? video?.duration ?? 0),
    width: swap ? height : width,
    height: swap ? width : height,
    fps: den ? num / den : 30,
    rotation,
  };
};

/**
 * Genera un proxy H.264 8 bits: aplica la rotación del contenedor (las cámaras
 * graban 4K horizontal + metadato de giro), limita el lado corto a 1080 px y
 * normaliza los fps. Sin esto, renderizar HEVC 4K de 10 bits es lentísimo.
 */
export const normalize = (
  source: string,
  targetDir: string,
  fps = 30,
  keepAudio = false,
): string => {
  const target = path.join(
    targetDir,
    `${path.basename(source, path.extname(source))}.mp4`,
  );

  // Corrección de color para igualar las tomas entre sí, si `npm run color`
  // ya midió el proyecto. Sin esto el reel salta de oscuro a claro en cada
  // corte: se midió 82% de dispersión de brillo en Video 46.
  const colorFile = path.join(targetDir, 'color.json');
  let colorFilter = '';
  if (fs.existsSync(colorFile)) {
    if (hasSystemFfmpeg()) {
      const {filtros} = JSON.parse(fs.readFileSync(colorFile, 'utf8')) as {
        filtros: Record<string, string>;
      };
      colorFilter = filtros[path.basename(target)] ?? '';
    } else {
      console.warn(
        '⚠️  Hay corrección de color pero falta un ffmpeg completo en el sistema (el de Remotion no trae `eq`). Se genera el proxy sin igualar color.',
      );
    }
  }

  // El proxy se rehace si la corrección de color es posterior a él.
  const alDia =
    fs.existsSync(target) &&
    (!fs.existsSync(colorFile) ||
      fs.statSync(target).mtimeMs >= fs.statSync(colorFile).mtimeMs);
  if (alDia) return target;

  fs.mkdirSync(targetDir, {recursive: true});
  const {cmd, prefix} = ffmpegCommand(colorFilter !== '');
  run(cmd, [
    ...prefix,
    '-y',
    '-i',
    source,
    '-vf',
    [
      "scale='if(gt(iw,ih),-2,1080)':'if(gt(iw,ih),1080,-2)'",
      ...(colorFilter ? [colorFilter] : []),
    ].join(','),
    '-r',
    String(fps),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '21',
    '-pix_fmt',
    'yuv420p',
    ...(keepAudio ? ['-c:a', 'aac', '-b:a', '160k'] : ['-an']),
    '-movflags',
    '+faststart',
    target,
  ]);
  return target;
};
