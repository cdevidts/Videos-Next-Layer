import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {FONT_FACES} from '../fonts.generated';

/**
 * Carga las tipografías desde public/fonts/ (las baja `npm run fonts`).
 * No se usa el CDN de Google: el Chrome headless del render no siempre tiene
 * salida a internet, y una fuente que no carga cambia todo el diseño.
 *
 * Las fuentes se declaran con `@font-face` en una hoja de estilo, NO con la API
 * `new FontFace()` + `document.fonts.add()`. Eso último parece funcionar —
 * `document.fonts.check()` devuelve `true` y el estado queda en `loaded` — pero
 * en `remotion render` (no en `remotion still`, que es lo engañoso) Chrome
 * igual pinta parte del texto con la fuente de respaldo. Se entregó un render
 * con el gancho en Anton y la placa de cierre en la de respaldo, en el mismo
 * video, por esto. Con una regla `@font-face` de verdad la tipografía es parte
 * de la hoja de estilo desde el primer layout y el problema desaparece.
 */
const handle = delayRender('Cargando tipografías');

const CSS = FONT_FACES.map(
  (face) => `@font-face{font-family:"${face.family}";src:url("${staticFile(
    face.file,
  )}") format("woff2");font-weight:${face.weight};font-style:${face.style};font-display:block;}`,
).join('\n');

const loadAll = async () => {
  if (typeof document === 'undefined') {
    continueRender(handle);
    return;
  }

  const style = document.createElement('style');
  style.setAttribute('data-fuentes-next-layer', 'true');
  style.textContent = CSS;
  document.head.appendChild(style);

  // Un `@font-face` se descarga recién cuando algo lo usa. Se pide cada familia
  // explícitamente para que la descarga arranque ahora y no a mitad del render.
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
