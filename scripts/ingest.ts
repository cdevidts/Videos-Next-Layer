/**
 * Ingreso de un video desde Drive, con la compuerta de conteo.
 *
 *   npm run fetch-drive -- --list                 # proyectos en Drive, cuántos clips y en qué estado
 *   npm run fetch-drive -- --project "Video 41"   # baja TODO y verifica
 *
 * REGLA DEL REPOSITORIO (Veronica, 2026-09-24): antes de empezar cualquier
 * proyecto se enumera cuántos archivos hay en Drive, se bajan todos, y se
 * verifica que cada uno se pueda ver o escuchar. Si falta uno, NO se empieza.
 * En el Video 46 quedaron tres clips sin mirar hasta que el video ya estaba
 * hecho, y eran el mejor material: el cuaderno de planos. Esto existe para que
 * no dependa de que alguien se acuerde.
 *
 * Qué se baja, según la estructura que usa Next Layer en cada proyecto:
 *   Videos/   los clips raw — la única carpeta con clips
 *   Sonido/   voces en off (Audios/), música (Musica/) y efectos (SFX/)
 * Lo demás (Proyecto/, Archivos/, Export/) se enumera pero no se baja.
 *
 * El resultado queda en public/input/<slug>/MANIFEST.json con la compuerta
 * explícita. `npm run check` se niega a validar un plan si la compuerta no pasó.
 */
import fs from 'node:fs';
import path from 'node:path';
import {abrirFuente, type Entrada, type Fuente} from './lib/driveFuente';
import {formatBytes, slugify} from './lib/drive';
import {probe} from './lib/media';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

export const REGISTRO = 'videos.json';
const INPUT = 'public/input';
const CARPETA_CLIPS = 'Videos';
const CARPETA_SONIDO = 'Sonido';

const VIDEO = ['.mov', '.mp4', '.m4v', '.mkv', '.avi', '.mts', '.webm'];
const AUDIO = ['.wav', '.mp3', '.m4a', '.aac', '.aif', '.aiff', '.flac', '.ogg'];

export type Registro = {
  drive: {raiz: string; [k: string]: unknown};
  videos: Record<string, {slug: string; estado: string; nota?: string; clipsEnDrive?: number; [k: string]: unknown}>;
};

export type ArchivoManifiesto = {
  tipo: 'clip' | 'voz' | 'musica' | 'sfx';
  drive: string;
  local: string;
  bytes: number;
  duracion?: number;
  ancho?: number;
  alto?: number;
  ok: boolean;
  problema?: string;
};

export type Manifiesto = {
  proyecto: string;
  slug: string;
  driveId: string;
  fuente: string;
  generado: string;
  enDrive: {clips: number; sonido: number};
  archivos: ArchivoManifiesto[];
  ignorado: string[];
  compuerta: {ok: boolean; problemas: string[]};
};

export const leerRegistro = (): Registro => JSON.parse(fs.readFileSync(REGISTRO, 'utf8')) as Registro;

export const manifiestoDe = (slug: string): Manifiesto | null => {
  const p = path.join(INPUT, slug, 'MANIFEST.json');
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf8')) as Manifiesto) : null;
};

/** "Video 9" antes que "Video 41": orden natural, no alfabético. */
const numero = (nombre: string) => Number(/(\d+)/.exec(nombre)?.[1] ?? Number.MAX_SAFE_INTEGER);

const recorrer = async (
  fuente: Fuente,
  folderId: string,
  prefijo: string,
): Promise<Array<Entrada & {ruta: string}>> => {
  const salida: Array<Entrada & {ruta: string}> = [];
  for (const e of await fuente.listar(folderId)) {
    const ruta = prefijo ? `${prefijo}/${e.name}` : e.name;
    if (e.isFolder) salida.push(...(await recorrer(fuente, e.id, ruta)));
    else salida.push({...e, ruta});
  }
  return salida;
};

const tipoSonido = (ruta: string): ArchivoManifiesto['tipo'] => {
  const r = ruta.toLowerCase();
  if (r.includes('/musica/') || r.includes('/music')) return 'musica';
  if (r.includes('/sfx/')) return 'sfx';
  return 'voz';
};

export const listarProyectos = async () => {
  const registro = leerRegistro();
  const fuente = await abrirFuente(registro.drive.raiz);
  const proyectos = (await fuente.listar(registro.drive.raiz))
    .filter((e) => e.isFolder)
    .sort((a, b) => numero(a.name) - numero(b.name));
  return {registro, fuente, proyectos};
};

export const ingresar = async (nombre: string): Promise<Manifiesto> => {
  const {registro, fuente, proyectos} = await listarProyectos();
  const buscado = nombre.trim().toLowerCase();
  const carpeta =
    proyectos.find((p) => p.name.toLowerCase() === buscado) ??
    proyectos.find((p) => slugify(p.name) === slugify(nombre)) ??
    proyectos.find((p) => p.name.toLowerCase().includes(buscado));
  if (!carpeta) {
    throw new Error(
      `No hay un proyecto "${nombre}" en Drive. Hay: ${proyectos.map((p) => p.name).join(', ')}`,
    );
  }

  const slug = registro.videos[carpeta.name]?.slug ?? slugify(carpeta.name);
  const dir = path.join(INPUT, slug);
  console.log(`\n🎬 ${carpeta.name} → ${dir}  (Drive ${fuente.tipo === 'publica' ? 'público, sin credenciales' : 'con credenciales'})`);

  const subcarpetas = await fuente.listar(carpeta.id);
  const clipsDir = subcarpetas.find((s) => s.isFolder && s.name === CARPETA_CLIPS);
  const sonidoDir = subcarpetas.find((s) => s.isFolder && s.name === CARPETA_SONIDO);

  const problemas: string[] = [];
  if (!clipsDir) problemas.push(`No existe la carpeta "${CARPETA_CLIPS}/" dentro de ${carpeta.name}.`);

  const clips = clipsDir
    ? (await recorrer(fuente, clipsDir.id, CARPETA_CLIPS)).filter((f) =>
        VIDEO.includes(path.extname(f.name).toLowerCase()),
      )
    : [];
  const sonidos = sonidoDir
    ? (await recorrer(fuente, sonidoDir.id, CARPETA_SONIDO)).filter((f) =>
        AUDIO.includes(path.extname(f.name).toLowerCase()) || VIDEO.includes(path.extname(f.name).toLowerCase()),
      )
    : [];

  // Lo que no se baja igual se enumera: un .prproj en Proyecto/ dice que alguien
  // ya editó este video a mano, y eso hay que saberlo antes de empezar.
  const ignorado: string[] = [];
  for (const s of subcarpetas) {
    if (!s.isFolder || s.name === CARPETA_CLIPS || s.name === CARPETA_SONIDO) continue;
    for (const f of await recorrer(fuente, s.id, s.name)) ignorado.push(f.ruta);
  }

  console.log(
    `🔢 En Drive: ${clips.length} clips en ${CARPETA_CLIPS}/, ${sonidos.length} archivos en ${CARPETA_SONIDO}/` +
      (ignorado.length ? `, ${ignorado.length} en otras carpetas (no se bajan)` : ''),
  );
  if (!clips.length) problemas.push(`${CARPETA_CLIPS}/ está vacía: el proyecto no tiene material.`);

  const archivos: ArchivoManifiesto[] = [];
  const todos = [
    ...clips.map((f) => ({...f, tipo: 'clip' as const})),
    ...sonidos.map((f) => ({...f, tipo: tipoSonido(f.ruta)})),
  ];

  for (const [i, f] of todos.entries()) {
    const local = path.join(dir, f.ruta);
    const registroArchivo: ArchivoManifiesto = {tipo: f.tipo, drive: f.ruta, local, bytes: 0, ok: false};
    try {
      const bytes = f.size ?? (await fuente.tamano(f.id));
      registroArchivo.bytes = bytes;
      const r = await fuente.bajar(f.id, local, bytes);

      // Que el archivo exista no dice que sirva: se abre y se mide.
      const info = probe(local);
      registroArchivo.duracion = Number(info.durationInSeconds.toFixed(2));
      if (f.tipo === 'clip') {
        registroArchivo.ancho = info.width;
        registroArchivo.alto = info.height;
        if (!info.width || !info.height) throw new Error('no tiene pista de video legible');
      }
      if (!info.durationInSeconds) throw new Error('dura 0 s: no decodifica');
      registroArchivo.ok = true;
      console.log(
        `   ${r === 'cache' ? '✓ cache' : '✓ bajado'} [${i + 1}/${todos.length}] ${f.ruta}  ${formatBytes(bytes)} · ${registroArchivo.duracion}s`,
      );
    } catch (error) {
      registroArchivo.problema = (error as Error).message;
      problemas.push(`${f.ruta}: ${registroArchivo.problema}`);
      console.log(`   ❌ [${i + 1}/${todos.length}] ${f.ruta}: ${registroArchivo.problema}`);
    }
    archivos.push(registroArchivo);
  }

  // La compuerta: tantos archivos verificados como hay en Drive.
  const verificados = archivos.filter((a) => a.ok);
  if (verificados.length !== todos.length) {
    problemas.push(`Se verificaron ${verificados.length} de ${todos.length} archivos que hay en Drive.`);
  }
  const extra = fs.existsSync(path.join(dir, CARPETA_CLIPS))
    ? fs
        .readdirSync(path.join(dir, CARPETA_CLIPS))
        .filter((f) => VIDEO.includes(path.extname(f).toLowerCase()))
        .filter((f) => !clips.some((c) => c.name === f))
    : [];
  if (extra.length) {
    console.log(`   ⚠️  En disco hay clips que ya no están en Drive: ${extra.join(', ')}`);
  }

  const manifiesto: Manifiesto = {
    proyecto: carpeta.name,
    slug,
    driveId: carpeta.id,
    fuente: fuente.tipo,
    generado: new Date().toISOString(),
    enDrive: {clips: clips.length, sonido: sonidos.length},
    archivos,
    ignorado,
    compuerta: {ok: problemas.length === 0, problemas},
  };
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'MANIFEST.json'), `${JSON.stringify(manifiesto, null, 2)}\n`);

  if (!registro.videos[carpeta.name]) {
    registro.videos[carpeta.name] = {slug, estado: 'pendiente'};
  }
  registro.videos[carpeta.name].clipsEnDrive = clips.length;
  fs.writeFileSync(REGISTRO, `${JSON.stringify(registro, null, 2)}\n`);

  if (manifiesto.compuerta.ok) {
    console.log(`\n✅ Compuerta OK: ${clips.length} clips y ${sonidos.length} sonidos, todos bajados y legibles.`);
  } else {
    console.log(`\n⛔ Compuerta NO pasó. No se empieza el proyecto hasta resolver:`);
    for (const p of problemas) console.log(`   • ${p}`);
  }
  if (ignorado.length) console.log(`ℹ️  No bajado (otras carpetas): ${ignorado.join(', ')}`);
  return manifiesto;
};

const main = async () => {
  if (argv.includes('--list') || argv.includes('-l')) {
    const {registro, fuente, proyectos} = await listarProyectos();
    console.log(`\n📁 Drive ${registro.drive.raiz} (${fuente.tipo})\n`);
    for (const p of proyectos) {
      const r = registro.videos[p.name];
      const m = r ? manifiestoDe(r.slug) : null;
      const local = m ? (m.compuerta.ok ? `bajado ✓ ${m.enDrive.clips} clips` : 'bajado con problemas') : 'sin bajar';
      console.log(`  ${p.name.padEnd(10)} ${String(r?.estado ?? 'nuevo').padEnd(10)} ${local}${r?.nota ? `\n             ↳ ${r.nota}` : ''}`);
    }
    return;
  }
  const proyecto = arg('project');
  if (!proyecto) throw new Error('Falta --project "Video N" (o --list para ver los proyectos).');
  const m = await ingresar(proyecto);
  if (!m.compuerta.ok) process.exit(2);
};

const isMain = process.argv[1] ? path.basename(process.argv[1]).startsWith('ingest') : false;
if (isMain) {
  main().catch((error: unknown) => {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
