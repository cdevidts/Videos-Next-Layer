/**
 * Catálogo de efectos de sonido, MEDIDOS.
 *
 *   npm run sfx-catalog              # baja y mide lo que falte (reanudable)
 *   npm run sfx-catalog -- --list    # resumen por rol
 *
 * Por qué medidos. El agente no puede escuchar. Elegía efectos por el nombre
 * ("Cinematic whoosh") y así llegaron al reel un riser que empezaba a volumen
 * pleno y whooshes que golpeaban medio segundo después del corte. Acá cada
 * efecto se decodifica y se le mide:
 *
 *   - pico: el instante de máxima energía. Es el "hit point": para que un
 *     whoosh se sienta pegado al corte, lo que tiene que caer en el corte es su
 *     PICO, no su inicio. VerticalReel lo adelanta exactamente eso.
 *   - ataque y cola: cuánto tarda en llegar al pico y en apagarse.
 *   - nivel (dBFS de la parte activa): para nivelar efectos de fuentes distintas, que vienen
 *     masterizados con hasta 15 dB de diferencia.
 *   - brillo (centroide espectral, Hz): whooshes graves para cambios de escena
 *     — la directiva pide "frecuencias bajas" — y brillantes para la UI.
 *
 * Con eso se valida que la forma corresponda al rol (un "whoosh" de 8 s no
 * sirve para un corte) y se marca `apto: false` lo que no.
 *
 * Fuentes, sin llaves:
 *   - Mixkit (licencia Mixkit: uso comercial libre, sin atribución).
 *   - Lots of Sounds, endpoint de muestra (12 por término). No declara licencia
 *     por sonido: quedan marcados así y se prefieren los de Mixkit en empate.
 *
 * Los MP3 no van a git (Mixkit no permite redistribuirlos sueltos); el catálogo
 * con las mediciones sí, y con él cualquier contenedor nuevo rebaja lo mismo.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const DIR = 'public/assets/sfx';
export const CATALOGO = path.join(DIR, 'catalog.json');
const SR = 22050;

/**
 * `foley`: un sonido específico de lo que se ve (una sierra, una caja
 * registradora). No sale del pozo: se busca para ESE plano con "buscar:".
 */
export type Rol = 'whoosh' | 'pop' | 'click' | 'impact' | 'riser' | 'foley';

export type Efecto = {
  id: string;
  fuente: 'mixkit' | 'lotsofsounds';
  rol: Rol;
  nombre: string;
  archivo: string;
  url: string;
  licencia: string;
  duracion?: number;
  picoSeg?: number;
  ataqueSeg?: number;
  colaSeg?: number;
  /** RMS de la parte activa, en dBFS. Relativo: sirve para nivelar entre efectos. */
  nivelDb?: number;
  brilloHz?: number;
  apto?: boolean;
  motivo?: string;
  usadoEn?: string[];
};

const MIXKIT: Record<string, Rol> = {
  whoosh: 'whoosh',
  swoosh: 'whoosh',
  transition: 'whoosh',
  pop: 'pop',
  click: 'click',
  impact: 'impact',
  riser: 'riser',
};
const LOTS: Record<string, Rol> = {
  whoosh: 'whoosh',
  swish: 'whoosh',
  pop: 'pop',
  click: 'click',
  impact: 'impact',
  boom: 'impact',
  riser: 'riser',
};

/** Rango de forma aceptable por rol. Fuera de esto no se elige solo. */
const FORMA: Record<Rol, (e: Efecto) => string | null> = {
  whoosh: (e) =>
    (e.duracion ?? 0) < 0.25 ? 'muy corto para un corte'
    : (e.duracion ?? 0) > 2.5 ? 'muy largo para un corte'
    : null,
  pop: (e) => ((e.duracion ?? 0) > 0.8 ? 'muy largo para un pop' : null),
  click: (e) => ((e.duracion ?? 0) > 0.6 ? 'muy largo para un click' : null),
  impact: (e) =>
    (e.ataqueSeg ?? 1) > 0.08 ? 'ataque lento: no golpea'
    : (e.duracion ?? 0) > 5 ? 'demasiado largo'
    : null,
  riser: (e) =>
    (e.duracion ?? 0) < 1 ? 'muy corto para crecer'
    : (e.picoSeg ?? 0) / (e.duracion ?? 1) < 0.55 ? 'el pico no está al final: no sube'
    : null,
  foley: (e) => ((e.duracion ?? 0) < 0.2 ? 'casi no dura' : null),
};

/**
 * Busca un sonido específico para un plano ("circular saw", "cash register"):
 * la muestra de Lots of Sounds y la categoría de Mixkit con ese nombre, si
 * existe. Todo lo encontrado se baja, se mide y queda en el catálogo; devuelve
 * los aptos ordenados por cercanía a la duración pedida.
 */
export const buscarEfecto = async (terminos: string, duracionDeseada?: number): Promise<Efecto[]> => {
  const encontrados: Efecto[] = [];
  const lots = await fetch(`https://api.lotsofsounds.com/api/v1/sounds/sample?q=${encodeURIComponent(terminos)}`).catch(() => null);
  if (lots?.ok) {
    const d = (await lots.json()) as {data?: Array<{id: string; name: string}>};
    for (const x of d.data ?? []) {
      encontrados.push({
        id: `lots-${x.id}`, fuente: 'lotsofsounds', rol: 'foley', nombre: x.name,
        archivo: `assets/sfx/lots-${x.id}.mp3`,
        url: `https://api.lotsofsounds.com/api/v1/sounds/sample/${x.id}/stream`,
        licencia: 'Lots of Sounds (muestra gratuita, sin licencia declarada por sonido)',
      });
    }
  }
  const slug = terminos.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const mk = await fetch(`https://mixkit.co/free-sound-effects/${slug}/`).catch(() => null);
  if (mk?.ok) {
    const html = await mk.text();
    const patron = /data-audio-player-item-id-value="(\d+)"[\s\S]*?item-grid-card__title">\s*([^<]+?)\s*<\/h2>/g;
    for (const m of html.matchAll(patron)) {
      encontrados.push({
        id: `mixkit-${m[1]}`, fuente: 'mixkit', rol: 'foley', nombre: m[2].trim(),
        archivo: `assets/sfx/mixkit-${m[1]}.mp3`,
        url: `https://assets.mixkit.co/active_storage/sfx/${m[1]}/${m[1]}-preview.mp3`,
        licencia: 'Mixkit Free License',
      });
    }
  }
  const catalogo = leerCatalogo();
  const porId = new Map(catalogo.map((e) => [e.id, e]));
  const resultado: Efecto[] = [];
  for (const e of encontrados.slice(0, 16)) {
    const ya = porId.get(e.id);
    const efecto = ya ?? e;
    try {
      if (efecto.duracion === undefined) {
        await bajarEfecto(efecto);
        Object.assign(efecto, medir(path.join('public', efecto.archivo)));
        const motivo = FORMA[efecto.rol](efecto);
        efecto.apto = !motivo;
        efecto.motivo = motivo ?? undefined;
      } else {
        await bajarEfecto(efecto);
      }
      porId.set(efecto.id, efecto);
      if (efecto.apto) resultado.push(efecto);
    } catch {
      // uno que no baja no frena la búsqueda
    }
  }
  guardar([...porId.values()]);
  const d = duracionDeseada;
  return resultado.sort(
    (a, b) =>
      (d ? Math.abs((a.duracion ?? 0) - d) - Math.abs((b.duracion ?? 0) - d) : 0) ||
      Number(b.fuente === 'mixkit') - Number(a.fuente === 'mixkit'),
  );
};

export const leerCatalogo = (): Efecto[] =>
  fs.existsSync(CATALOGO) ? (JSON.parse(fs.readFileSync(CATALOGO, 'utf8')) as Efecto[]) : [];

const guardar = (c: Efecto[]) => {
  fs.mkdirSync(DIR, {recursive: true});
  fs.writeFileSync(CATALOGO, `${JSON.stringify(c, null, 1)}\n`);
};

const decodificador = (): {bin: string; pre: string[]} => {
  for (const bin of ['/usr/bin/ffmpeg', 'ffmpeg']) {
    if (spawnSync(bin, ['-version'], {stdio: 'ignore'}).status === 0) return {bin, pre: []};
  }
  return {bin: 'npx', pre: ['remotion', 'ffmpeg']};
};

// --- Descubrimiento --------------------------------------------------------

const descubrirMixkit = async (): Promise<Efecto[]> => {
  const salida: Efecto[] = [];
  for (const [categoria, rol] of Object.entries(MIXKIT)) {
    const r = await fetch(`https://mixkit.co/free-sound-effects/${categoria}/`);
    if (!r.ok) {
      console.warn(`   ⚠️  mixkit/${categoria}: HTTP ${r.status}`);
      continue;
    }
    const html = await r.text();
    const patron = /data-audio-player-item-id-value="(\d+)"[\s\S]*?item-grid-card__title">\s*([^<]+?)\s*<\/h2>/g;
    for (const m of html.matchAll(patron)) {
      salida.push({
        id: `mixkit-${m[1]}`,
        fuente: 'mixkit',
        rol,
        nombre: m[2].trim(),
        archivo: `assets/sfx/mixkit-${m[1]}.mp3`,
        url: `https://assets.mixkit.co/active_storage/sfx/${m[1]}/${m[1]}-preview.mp3`,
        licencia: 'Mixkit Free License',
      });
    }
  }
  return salida;
};

const descubrirLots = async (): Promise<Efecto[]> => {
  const salida: Efecto[] = [];
  for (const [termino, rol] of Object.entries(LOTS)) {
    const r = await fetch(`https://api.lotsofsounds.com/api/v1/sounds/sample?q=${encodeURIComponent(termino)}`);
    if (!r.ok) continue;
    const d = (await r.json()) as {data?: Array<{id: string; name: string}>};
    for (const s of d.data ?? []) {
      salida.push({
        id: `lots-${s.id}`,
        fuente: 'lotsofsounds',
        rol,
        nombre: s.name,
        archivo: `assets/sfx/lots-${s.id}.mp3`,
        url: `https://api.lotsofsounds.com/api/v1/sounds/sample/${s.id}/stream`,
        licencia: 'Lots of Sounds (muestra gratuita, sin licencia declarada por sonido)',
      });
    }
  }
  return salida;
};

/** Lots of Sounds entrega una URL firmada que vence en 1 h: se pide al bajar. */
export const bajarEfecto = async (e: Efecto): Promise<void> => {
  const destino = path.join('public', e.archivo);
  if (fs.existsSync(destino) && fs.statSync(destino).size > 500) return;
  let url = e.url;
  if (e.fuente === 'lotsofsounds') {
    const r = await fetch(e.url);
    const d = (await r.json()) as {data?: {stream_url?: string}};
    if (!d.data?.stream_url) throw new Error('sin stream_url');
    url = d.data.stream_url;
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  fs.mkdirSync(path.dirname(destino), {recursive: true});
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
};

// --- Medición ----------------------------------------------------------------

const fft = (re: Float64Array, im: Float64Array) => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
      }
    }
  }
};

const dB = (x: number) => 20 * Math.log10(x + 1e-12);

export const medir = (archivo: string) => {
  const {bin, pre} = decodificador();
  const r = spawnSync(bin, [...pre, '-v', 'quiet', '-i', archivo, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], {
    maxBuffer: 256 * 1024 * 1024,
  });
  if (r.status !== 0 || !r.stdout?.length) throw new Error('no decodifica');
  const buf = r.stdout as Buffer;
  const x = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
  const duracion = x.length / SR;

  // Envolvente RMS en ventanas de 10 ms.
  const w = Math.round(SR * 0.01);
  const env: number[] = [];
  for (let i = 0; i + w <= x.length; i += w) {
    let s = 0;
    for (let j = i; j < i + w; j++) s += x[j] * x[j];
    env.push(Math.sqrt(s / w));
  }
  if (!env.length) throw new Error('vacío');
  let ip = 0;
  for (let i = 1; i < env.length; i++) if (env[i] > env[ip]) ip = i;
  const pico = env[ip];
  const umbralAtaque = pico * 0.1; // -20 dB bajo el pico
  let ia = ip;
  while (ia > 0 && env[ia - 1] > umbralAtaque) ia--;
  const umbralCola = pico * 0.0316; // -30 dB bajo el pico
  let ic = ip;
  while (ic < env.length - 1 && env[ic + 1] > umbralCola) ic++;

  // Loudness aproximado sobre la parte activa (lo que supera -30 dB del pico).
  // No es LUFS de norma, pero sirve para lo que se usa: nivelar entre efectos.
  const activos = env.filter((v) => v > umbralCola);
  const rms = Math.sqrt(activos.reduce((s, v) => s + v * v, 0) / Math.max(activos.length, 1));

  // Brillo: centroide espectral de 4096 muestras alrededor del pico.
  const N = 4096;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const centro = ip * w;
  for (let i = 0; i < N; i++) {
    const k = centro - N / 2 + i;
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
    re[i] = (k >= 0 && k < x.length ? x[k] : 0) * hann;
  }
  fft(re, im);
  let num = 0;
  let den = 0;
  for (let i = 1; i < N / 2; i++) {
    const mag = Math.hypot(re[i], im[i]);
    num += ((i * SR) / N) * mag;
    den += mag;
  }

  return {
    duracion: Number(duracion.toFixed(3)),
    picoSeg: Number(((ip * w) / SR).toFixed(3)),
    ataqueSeg: Number((((ip - ia) * w) / SR).toFixed(3)),
    colaSeg: Number((((ic - ip) * w) / SR).toFixed(3)),
    nivelDb: Number(dB(rms).toFixed(1)),
    brilloHz: Math.round(den ? num / den : 0),
  };
};

// --- Programa ------------------------------------------------------------------

const resumen = (c: Efecto[]) => {
  const roles: Rol[] = ['whoosh', 'pop', 'click', 'impact', 'riser', 'foley'];
  for (const rol of roles) {
    const todos = c.filter((e) => e.rol === rol);
    const aptos = todos.filter((e) => e.apto);
    const brillo = aptos.map((e) => e.brilloHz ?? 0).sort((a, b) => a - b);
    console.log(
      `  ${rol.padEnd(7)} ${String(aptos.length).padStart(3)} aptos de ${String(todos.length).padStart(3)}` +
        (brillo.length ? `   brillo ${brillo[0]}–${brillo[brillo.length - 1]} Hz` : ''),
    );
  }
};

const main = async () => {
  let catalogo = leerCatalogo();
  if (process.argv.includes('--list')) {
    resumen(catalogo);
    return;
  }

  console.log('🔎 Descubriendo efectos...');
  const nuevos = [...(await descubrirMixkit()), ...(await descubrirLots())];
  const porId = new Map(catalogo.map((e) => [e.id, e]));
  for (const e of nuevos) if (!porId.has(e.id)) porId.set(e.id, e);
  catalogo = [...porId.values()];
  console.log(`   ${catalogo.length} efectos en el catálogo`);

  let medidos = 0;
  for (const [i, e] of catalogo.entries()) {
    if (e.duracion !== undefined && fs.existsSync(path.join('public', e.archivo))) continue;
    try {
      await bajarEfecto(e);
      Object.assign(e, medir(path.join('public', e.archivo)));
      const motivo = FORMA[e.rol](e);
      e.apto = !motivo;
      e.motivo = motivo ?? undefined;
      medidos++;
      if (medidos % 20 === 0) {
        console.log(`   … ${i + 1}/${catalogo.length}`);
        guardar(catalogo);
      }
    } catch (error) {
      e.apto = false;
      e.motivo = `no se pudo medir: ${(error as Error).message}`;
    }
  }
  guardar(catalogo);
  console.log(`\n✅ ${medidos} medidos ahora → ${CATALOGO}\n`);
  resumen(catalogo);
};

const isMain = process.argv[1] ? path.basename(process.argv[1]).startsWith('sfxCatalog') : false;
if (isMain) {
  main().catch((error: unknown) => {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
