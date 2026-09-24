/**
 * La biblioteca de gráfica del pipeline: íconos, stickers animados y fotos.
 *
 * Instrucción de Veronica: la gráfica se BAJA de APIs gratuitas, no se dibuja
 * en código — hecha a mano sale peor y se come la atención que hace falta para
 * el montaje. Y lo que se baja se guarda para reusarlo en los videos que vienen.
 *
 * Todo pasa por un índice versionado (public/assets/index.json), pero el índice
 * es un CACHÉ de archivos y un registro de licencias, no una preferencia.
 * Instrucción de Veronica: "no priorices lo descargado; si el video requiere
 * algo distinto, no uses algo descargado forzadamente". Cada intención se busca
 * de nuevo para cada video; solo si la búsqueda devuelve un archivo que ya está
 * en disco, no se vuelve a bajar. Para repetir un asset a propósito, se fija
 * su id exacto en el plan.
 *
 * Fuentes, todas sin llave:
 *   icon     Iconify — un buscador sobre ~200 mil íconos. Solo sets con
 *            licencia permisiva (MIT/ISC/Apache), y uno solo por video para
 *            que no se mezclen estilos.
 *   sticker  "emoji:🔥" → Noto Animated Emoji (Google, CC BY 4.0).
 *            cualquier otra cosa → búsqueda pública de LottieFiles.
 *   photo    SourceSplash (Pexels/Unsplash) y Wikimedia Commons. OJO:
 *            SourceSplash devuelve fotos AL AZAR de Lorem Picsum cuando no
 *            encuentra nada, sin avisar; esas se descartan siempre.
 *
 * Qué va a git: los SVG (licencias que permiten redistribuir) y el índice. Los
 * Lottie y las fotos no — se rebajan desde la URL del índice.
 */
import fs from 'node:fs';
import path from 'node:path';

export const RAIZ = 'public/assets';
export const INDICE = path.join(RAIZ, 'index.json');

export type Tipo = 'icon' | 'sticker' | 'photo';

export type Asset = {
  id: string;
  tipo: Tipo;
  archivo: string; // relativo a public/
  url: string;
  licencia: string;
  atribucion?: string;
  multicolor?: boolean;
  intenciones: string[];
  usadoEn: string[];
};

/** Sets de íconos permitidos, en orden de preferencia. Todos redistribuibles sin atribución. */
/**
 * Licencias verificadas contra api.iconify.design/collections el 2026-09-24.
 * Quedan fuera a propósito los CC-BY (Solar, Streamline, Game Icons): obligan
 * a dar crédito en cada post y es fácil olvidarlo.
 */
export const SETS_ICONOS: Record<string, {nombre: string; licencia: string; multicolor?: boolean}> = {
  ph: {nombre: 'Phosphor', licencia: 'MIT'},
  tabler: {nombre: 'Tabler', licencia: 'MIT'},
  hugeicons: {nombre: 'Huge Icons', licencia: 'MIT'},
  lucide: {nombre: 'Lucide', licencia: 'ISC'},
  fluent: {nombre: 'Fluent UI System Icons', licencia: 'MIT'},
  'material-symbols': {nombre: 'Material Symbols', licencia: 'Apache-2.0'},
  mingcute: {nombre: 'MingCute', licencia: 'Apache-2.0'},
  ri: {nombre: 'Remix Icon', licencia: 'Apache-2.0'},
  carbon: {nombre: 'Carbon', licencia: 'Apache-2.0'},
  iconoir: {nombre: 'Iconoir', licencia: 'MIT'},
  heroicons: {nombre: 'HeroIcons', licencia: 'MIT'},
  bi: {nombre: 'Bootstrap Icons', licencia: 'MIT'},
  uil: {nombre: 'Unicons', licencia: 'Apache-2.0'},
  'icon-park-outline': {nombre: 'IconPark Outline', licencia: 'Apache-2.0'},
  majesticons: {nombre: 'Majesticons', licencia: 'MIT'},
  mdi: {nombre: 'Material Design Icons', licencia: 'Apache-2.0'},
  'fluent-emoji-flat': {nombre: 'Fluent Emoji Flat', licencia: 'MIT', multicolor: true},
  noto: {nombre: 'Noto Emoji', licencia: 'Apache-2.0', multicolor: true},
};

export const leerIndice = (): Asset[] =>
  fs.existsSync(INDICE) ? (JSON.parse(fs.readFileSync(INDICE, 'utf8')) as Asset[]) : [];

export const guardarIndice = (a: Asset[]) => {
  fs.mkdirSync(RAIZ, {recursive: true});
  fs.writeFileSync(INDICE, `${JSON.stringify(a, null, 1)}\n`);
};

const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');
const seguro = (t: string) => t.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);

/** Un id exacto ya fijado en el plan, en vez de una intención a buscar. */
export const esId = (valor: string) =>
  /^(emoji|lottiefiles|wikimedia|sourcesplash):/.test(valor) ||
  /^[a-z0-9-]+:[a-z0-9-]+$/.test(valor);

const bajar = async (url: string, destino: string) => {
  const r = await fetch(url, {headers: {'User-Agent': 'NextLayerReels/1.0 (pipeline de video)'}});
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
  fs.mkdirSync(path.dirname(destino), {recursive: true});
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
};

// --- Íconos --------------------------------------------------------------------

const VARIANTE_PH = (n: string) => (n.endsWith('-fill') ? 0 : n.endsWith('-bold') ? 1 : /-(duotone|thin|light)$/.test(n) ? 9 : 2);

export const buscarIcono = async (intencion: string, set = 'ph'): Promise<string[]> => {
  const orden = [set, ...Object.keys(SETS_ICONOS).filter((s) => s !== set)];
  const r = await fetch(
    `https://api.iconify.design/search?query=${encodeURIComponent(intencion)}&limit=96&prefixes=${orden.join(',')}`,
  );
  if (!r.ok) throw new Error(`Iconify HTTP ${r.status}`);
  const {icons = []} = (await r.json()) as {icons?: string[]};
  // Cercanía del NOMBRE a la intención, antes que la preferencia de set. Sin
  // esto, "drill" devolvía primero "hammer-drill" (un martillo neumático) y
  // "drill-down" (un ícono de datos): contienen la palabra, pero no son eso.
  const q = intencion.toLowerCase().trim().replace(/\s+/g, '-');
  const base = (n: string) => n.replace(/-(fill|bold|outline|sharp|rounded|line|solid|regular|filled|duotone|thin|light|twotone)$/g, '');
  const cercania = (n: string) => {
    const b = base(n);
    if (b === q) return 0; // "drill"
    if (b.endsWith(`-${q}`)) return 1; // "power-drill": una clase de eso
    if (b.startsWith(`${q}-`)) return 3; // "drill-down": la palabra, pero como otra cosa
    return 2;
  };
  return icons
    .filter((id) => SETS_ICONOS[id.split(':')[0]])
    .sort((a, b) => {
      const [pa, na] = a.split(':');
      const [pb, nb] = b.split(':');
      return (
        cercania(na) - cercania(nb) ||
        orden.indexOf(pa) - orden.indexOf(pb) ||
        (pa === 'ph' ? VARIANTE_PH(na) - VARIANTE_PH(nb) : 0)
      );
    });
};

/** Deja un asset elegido en disco y en el índice, anotando la intención y el video. */
export const fijar = async (asset: Asset, intencion: string | null, proyecto?: string): Promise<Asset> => {
  const indice = leerIndice();
  const existente = indice.find((a) => a.id === asset.id);
  const final = existente ?? asset;
  await asegurar(final);
  if (intencion && !final.intenciones.includes(norm(intencion))) final.intenciones.push(norm(intencion));
  if (proyecto && !final.usadoEn.includes(proyecto)) final.usadoEn.push(proyecto);
  guardarIndice([...indice.filter((a) => a.id !== final.id), final].sort((a, b) => a.id.localeCompare(b.id)));
  return final;
};

export const iconoPorId = (id: string): Asset => assetIcono(id);
export const emojiPorId = (id: string): Promise<Asset> => assetEmoji(id);

const assetIcono = (id: string): Asset => {
  const [prefijo, nombre] = id.split(':');
  const set = SETS_ICONOS[prefijo];
  if (!set) throw new Error(`El set "${prefijo}" no está en la lista de licencias permitidas.`);
  return {
    id,
    tipo: 'icon',
    archivo: `assets/icons/${prefijo}__${nombre}.svg`,
    url: `https://api.iconify.design/${prefijo}/${nombre}.svg`,
    licencia: `${set.licencia} (${set.nombre})`,
    multicolor: set.multicolor,
    intenciones: [],
    usadoEn: [],
  };
};

// --- Stickers ------------------------------------------------------------------

const codepoints = (emoji: string, conFe0f: boolean) =>
  [...emoji]
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((cp) => conFe0f || cp !== 'fe0f')
    .join('_');

const assetEmoji = async (id: string): Promise<Asset> => {
  const emoji = id.slice('emoji:'.length);
  for (const conFe0f of [false, true]) {
    const cp = codepoints(emoji, conFe0f);
    const url = `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/lottie.json`;
    const r = await fetch(url, {method: 'HEAD'});
    if (r.ok) {
      return {
        id,
        tipo: 'sticker',
        archivo: `assets/lottie/noto_${cp}.json`,
        url,
        licencia: 'CC BY 4.0',
        atribucion: 'Noto Emoji Animation, Google (CC BY 4.0)',
        intenciones: [],
        usadoEn: [],
      };
    }
  }
  throw new Error(`Noto no tiene versión animada de ${emoji}.`);
};

export const buscarLottie = async (intencion: string, n = 6): Promise<Asset[]> => {
  const query = `{ searchPublicAnimations(query: ${JSON.stringify(intencion)}, first: ${n}) { edges { node { name jsonUrl } } } }`;
  const r = await fetch('https://graphql.lottiefiles.com/2022-08', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({query}),
  });
  if (!r.ok) throw new Error(`LottieFiles HTTP ${r.status}`);
  const d = (await r.json()) as {
    data?: {searchPublicAnimations?: {edges: Array<{node: {name: string; jsonUrl: string}}>}};
  };
  return (d.data?.searchPublicAnimations?.edges ?? [])
    .filter((e) => e.node.jsonUrl)
    .map((e) => {
      const clave = /\/a\/([0-9a-f-]{20,})\//.exec(e.node.jsonUrl)?.[1] ?? seguro(e.node.name);
      return {
        id: `lottiefiles:${clave}`,
        tipo: 'sticker' as const,
        archivo: `assets/lottie/lf_${clave}.json`,
        url: e.node.jsonUrl,
        licencia: 'Lottie Simple License (LottieFiles)',
        intenciones: [],
        usadoEn: [],
      };
    });
};

// --- Fotos ---------------------------------------------------------------------

export const buscarFotos = async (intencion: string): Promise<Asset[]> => {
  const salida: Asset[] = [];

  const ss = await fetch(`https://www.sourcesplash.com/api/search?q=${encodeURIComponent(intencion)}`).catch(() => null);
  if (ss?.ok) {
    const d = (await ss.json()) as {
      photos?: Array<{id: string; url: string; source?: string; author?: string; description?: string}>;
    };
    for (const p of d.photos ?? []) {
      // Picsum es relleno aleatorio: SourceSplash lo devuelve cuando NO encontró
      // nada. Una foto al azar en el reel es peor que ninguna.
      if (!p.source || p.source === 'picsum') continue;
      salida.push({
        id: `sourcesplash:${p.id}`,
        tipo: 'photo',
        archivo: `assets/photos/ss_${seguro(p.id)}.jpg`,
        url: p.url,
        licencia: `${p.source} (vía SourceSplash)`,
        atribucion: p.author ? `Foto: ${p.author} / ${p.source}` : undefined,
        intenciones: [],
        usadoEn: [],
      });
    }
  }

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${intencion} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: '1080',
  });
  const wm = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: {'User-Agent': 'NextLayerReels/1.0 (pipeline de video)'},
  }).catch(() => null);
  if (wm?.ok) {
    const d = (await wm.json()) as {
      query?: {
        pages?: Record<string, {title: string; imageinfo?: Array<{thumburl?: string; mime?: string; extmetadata?: Record<string, {value?: string}>}>}>;
      };
    };
    for (const p of Object.values(d.query?.pages ?? {})) {
      const info = p.imageinfo?.[0];
      const lic = info?.extmetadata?.LicenseShortName?.value ?? '';
      // Solo licencias que permiten uso comercial.
      if (!info?.thumburl || !/^(cc0|public domain|cc by(-sa)? [0-9.]+|cc-by)/i.test(lic)) continue;
      const autor = (info.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim();
      salida.push({
        id: `wikimedia:${p.title}`,
        tipo: 'photo',
        archivo: `assets/photos/wm_${seguro(p.title.replace(/^File:/, ''))}.jpg`,
        url: info.thumburl,
        licencia: lic,
        atribucion: /^(cc0|public domain)/i.test(lic) ? undefined : `${autor || 'Wikimedia Commons'} (${lic})`,
        intenciones: [],
        usadoEn: [],
      });
    }
  }
  return salida;
};

// --- Resolver ------------------------------------------------------------------

/**
 * De una intención ("drill", "emoji:💸", "ikea store") o un id ya fijado a un
 * asset con archivo en disco. Reusa lo del índice antes de salir a internet.
 */
export const resolver = async (
  tipo: Tipo,
  valor: string,
  opciones: {proyecto?: string; set?: string} = {},
): Promise<Asset> => {
  const indice = leerIndice();
  let asset: Asset | undefined;

  if (esId(valor)) {
    asset = indice.find((a) => a.id === valor);
    if (!asset) {
      if (valor.startsWith('emoji:')) asset = await assetEmoji(valor);
      else if (tipo === 'icon') asset = assetIcono(valor);
      else throw new Error(`${valor} no está en el índice: fíjalo con una búsqueda primero.`);
    }
  } else {
    const intencion = norm(valor);
    {
      if (tipo === 'icon') {
        const [primero] = await buscarIcono(intencion, opciones.set);
        if (!primero) throw new Error(`Iconify no encontró "${valor}". Prueba en inglés o con otra palabra.`);
        asset = indice.find((a) => a.id === primero) ?? assetIcono(primero);
      } else if (tipo === 'sticker') {
        const [primero] = await buscarLottie(intencion, 1);
        if (!primero) throw new Error(`LottieFiles no encontró "${valor}".`);
        asset = indice.find((a) => a.id === primero.id) ?? primero;
      } else {
        const [primera] = await buscarFotos(intencion);
        if (!primera) throw new Error(`No hay foto real para "${valor}" (SourceSplash sin relleno + Wikimedia).`);
        asset = indice.find((a) => a.id === primera.id) ?? primera;
      }
      if (!asset.intenciones.includes(intencion)) asset.intenciones.push(intencion);
    }
  }

  await asegurar(asset);
  if (opciones.proyecto && !asset.usadoEn.includes(opciones.proyecto)) asset.usadoEn.push(opciones.proyecto);

  const actualizado = leerIndice().filter((a) => a.id !== asset!.id);
  actualizado.push(asset);
  guardarIndice(actualizado.sort((a, b) => a.id.localeCompare(b.id)));
  return asset;
};

/** Que el archivo esté en disco; si no (contenedor nuevo), se rebaja del índice. */
export const asegurar = async (a: Asset) => {
  const destino = path.join('public', a.archivo);
  if (fs.existsSync(destino) && fs.statSync(destino).size > 50) return;
  await bajar(a.url, destino);
  if (a.tipo === 'icon') {
    const svg = fs.readFileSync(destino, 'utf8');
    if (!/<svg[\s>]/.test(svg)) throw new Error(`${a.id}: lo que bajó no es un SVG.`);
  }
};
