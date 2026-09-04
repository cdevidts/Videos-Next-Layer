import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {FONT_FACES} from '../fonts.generated';

/**
 * Carga las tipografías desde public/fonts/ (las baja `npm run fonts`).
 * No se usa el CDN de Google: el Chrome headless del render no siempre tiene
 * salida a internet, y una fuente que no carga cambia todo el diseño.
 */
const handle = delayRender('Cargando tipografías');

const loadAll = async () => {
  if (typeof FontFace === 'undefined') {
    continueRender(handle);
    return;
  }
  await Promise.all(
    FONT_FACES.map(async (face) => {
      const font = new FontFace(
        face.family,
        `url(${staticFile(face.file)}) format('woff2')`,
        {weight: face.weight, style: face.style},
      );
      await font.load();
      document.fonts.add(font);
    }),
  );
};

loadAll()
  .then(() => continueRender(handle))
  .catch((error) => cancelRender(error));

export const DISPLAY_FONT = 'Anton, "Arial Black", Impact, system-ui, sans-serif';
export const TEXT_FONT =
  'Inter, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif';
