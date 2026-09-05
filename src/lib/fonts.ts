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

  // Que la fuente esté cargada no basta: `document.fonts.add()` deja el set de
  // fuentes del documento en estado "loading", y Chrome no vuelve a resolver la
  // tipografía del contenido que ya calculó hasta que ese set se asienta. Sin
  // esta espera, parte del reel salía con Anton y parte con la fuente de
  // respaldo — el gancho quedaba bien y la placa de cierre no, en el mismo
  // render. Se pide cada familia explícitamente y después se espera a `ready`.
  await Promise.all(
    [...new Set(FONT_FACES.map((face) => face.family))].map((family) =>
      document.fonts.load(`400 100px "${family}"`).catch(() => undefined),
    ),
  );
  await document.fonts.ready;
};

loadAll()
  .then(() => continueRender(handle))
  .catch((error) => cancelRender(error));

export const DISPLAY_FONT = 'Anton, "Arial Black", Impact, system-ui, sans-serif';
export const TEXT_FONT =
  'Inter, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif';
