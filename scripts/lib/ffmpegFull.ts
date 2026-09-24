/**
 * El ffmpeg COMPLETO del sistema, para lo que el de Remotion no trae.
 *
 * `npx remotion ffmpeg` es una build recortada: sirve para decodificar y
 * encodear, pero no tiene `tile`, `drawtext`, `pad`, `hstack` ni `ebur128`, y
 * falla con un mensaje engañoso ("No option name near..."). Las herramientas de
 * análisis y de hojas de contacto usan el de sistema (`/usr/bin/ffmpeg`, que en
 * la imagen de Claude Code en la nube viene completo, con librsvg incluso).
 *
 * El render del reel NO depende de esto: solo el análisis. Si falta, se dice qué
 * instalar en vez de caer a medias.
 */
import {execFileSync} from 'node:child_process';

let cache: string | null | undefined;

const tieneFiltros = (bin: string, filtros: string[]): boolean => {
  try {
    const salida = execFileSync(bin, ['-hide_banner', '-filters'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return filtros.every((f) => new RegExp(`^\\s*\\S+\\s+${f}\\s`, 'm').test(salida));
  } catch {
    return false;
  }
};

export const ffmpegCompleto = (): string => {
  if (cache) return cache;
  const candidatos = [process.env.FFMPEG_FULL, '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', 'ffmpeg'];
  for (const bin of candidatos) {
    if (bin && tieneFiltros(bin, ['tile', 'drawtext', 'pad'])) {
      cache = bin;
      return bin;
    }
  }
  cache = null;
  throw new Error(
    'No hay un ffmpeg completo (con tile/drawtext/pad). El de Remotion es recortado a propósito.\n' +
      '   Instálalo con: sudo apt-get install -y ffmpeg   (o define FFMPEG_FULL=/ruta/a/ffmpeg)',
  );
};

export const ffmpeg = (args: string[]) =>
  execFileSync(ffmpegCompleto(), ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
