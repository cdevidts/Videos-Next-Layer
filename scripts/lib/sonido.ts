/**
 * Elegir efectos del catálogo medido (`npm run sfx-catalog`).
 *
 * Tres cosas que antes se hacían a ojo y ahora salen de la medición:
 *   1. QUÉ efecto: por rol, solo los aptos (forma correcta para el rol), y
 *      rotando para que dos videos seguidos no suenen igual.
 *   2. CUÁNDO: se devuelve el pico, y la composición lo hace caer justo en el
 *      evento (el corte, la entrada del ícono, el reveal).
 *   3. CUÁNTO: una ganancia que lleva cada efecto a un nivel objetivo por rol.
 *      Sin esto, un whoosh de Mixkit y uno de Lots of Sounds salen con 10 dB
 *      de diferencia y el montaje suena hecho con retazos.
 */
import fs from 'node:fs';
import path from 'node:path';
import type {SfxRef} from '../../src/lib/reel';
import {CATALOGO, leerCatalogo, type Efecto, type Rol} from '../sfxCatalog';

/** Nivel objetivo por rol, en el mismo dBFS relativo que mide el catálogo. */
const OBJETIVO: Record<Rol, number> = {whoosh: -22, pop: -24, click: -26, impact: -17, riser: -22, foley: -20};

const hash = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const refDe = (e: Efecto): SfxRef => ({
  id: e.id,
  src: e.archivo,
  rol: e.rol,
  picoSeg: e.picoSeg ?? 0,
  gananciaDb: Math.max(-12, Math.min(12, OBJETIVO[e.rol] - (e.nivelDb ?? OBJETIVO[e.rol]))),
});

/**
 * `n` efectos distintos de un rol. Determinista por proyecto —el mismo plan da
 * el mismo sonido en cada render— y corrido para no repetir lo que usó el
 * video anterior.
 *
 * `grave`: para los cambios de escena la directiva pide whooshes de
 * frecuencias bajas; se toma la mitad más grave del catálogo.
 */
export const elegir = (
  rol: Rol,
  n: number,
  opciones: {proyecto: string; grave?: boolean; excluir?: string[]},
): SfxRef[] => {
  let aptos = leerCatalogo().filter(
    (e) => e.rol === rol && e.apto && fs.existsSync(path.join('public', e.archivo)) && !opciones.excluir?.includes(e.id),
  );
  if (!aptos.length) return [];
  if (opciones.grave) {
    aptos = aptos.sort((a, b) => (a.brilloHz ?? 0) - (b.brilloHz ?? 0)).slice(0, Math.max(n, Math.ceil(aptos.length / 2)));
  }
  // Primero los que este proyecto no usó y que no usaron otros hace poco.
  const usoAjeno = (e: Efecto) => (e.usadoEn ?? []).filter((p) => p !== opciones.proyecto).length;
  aptos.sort((a, b) => usoAjeno(a) - usoAjeno(b) || a.id.localeCompare(b.id));
  const inicio = hash(opciones.proyecto) % Math.max(1, Math.min(aptos.length, 8));
  const rotado = [...aptos.slice(inicio), ...aptos.slice(0, inicio)];
  return rotado.slice(0, n).map(refDe);
};

/**
 * Un efecto pedido por un clip del plan:
 *   "sfx:mixkit-2903"  fijado a un efecto del catálogo
 *   "@impact"          el mejor del rol (conviene fijarlo con `npm run assets`)
 *   "teclado.mp3"      los de public/sfx de siempre (`npm run sfx`)
 */
export const resolverSfx = (valor: string | undefined, proyecto: string): SfxRef | undefined => {
  if (!valor) return undefined;
  if (valor.startsWith('sfx:')) {
    const e = leerCatalogo().find((x) => x.id === valor.slice(4));
    if (!e) throw new Error(`${valor} no está en ${CATALOGO}.`);
    return refDe(e);
  }
  if (valor.startsWith('@')) {
    const [ref] = elegir(valor.slice(1) as Rol, 1, {proyecto});
    if (!ref) throw new Error(`No hay efectos aptos para ${valor}. Corre \`npm run sfx-catalog\`.`);
    return ref;
  }
  return {src: `sfx/${valor}`, picoSeg: 0, gananciaDb: 0, rol: /riser|swell/.test(valor) ? 'riser' : undefined};
};

/** Deja registrado qué efectos usó cada video, para no repetirlos en el siguiente. */
export const registrarUso = (refs: SfxRef[], proyecto: string) => {
  const ids = new Set(refs.map((r) => r.id).filter(Boolean));
  if (!ids.size) return;
  const catalogo = leerCatalogo();
  for (const e of catalogo) {
    if (!ids.has(e.id)) continue;
    e.usadoEn = [...new Set([...(e.usadoEn ?? []), proyecto])];
  }
  fs.writeFileSync(CATALOGO, `${JSON.stringify(catalogo, null, 1)}\n`);
};
