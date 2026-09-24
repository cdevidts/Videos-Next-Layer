/**
 * Resuelve la gráfica y los sonidos que pide un plan, para ESE video.
 *
 *   npm run assets -- --plan plans/video-41.json
 *   npm run assets -- --buscar icon "measuring tape" [--preview]
 *   npm run assets -- --buscar photo "ikea store" --preview
 *   npm run assets -- --buscar sticker "fire"
 *   npm run assets -- --buscar sfx "circular saw"
 *   npm run assets -- --list
 *
 * Con --plan: cada intención del plan ("drill", "emoji:🔥", "ikea store",
 * "buscar:circular saw", "@impact") se busca en ese momento y se FIJA en el
 * plan como id exacto. Dos razones: el render no decide nada —la elección
 * queda escrita donde se puede revisar— y re-renderizar da exactamente lo mismo.
 *
 * No prioriza lo ya descargado (instrucción de Veronica): cada intención se
 * busca para el video que la pide. Lo que ya está en disco solo no se rebaja.
 *
 * Con --buscar: lista candidatos para elegir a conciencia. Con --preview arma
 * una hoja con todos en una imagen (íconos y fotos), que cuesta una sola
 * lectura en vez de abrir uno por uno.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  asegurar,
  buscarFotos,
  buscarIcono,
  buscarLottie,
  emojiPorId,
  esId,
  fijar,
  iconoPorId,
  leerIndice,
  SETS_ICONOS,
  type Asset,
  type Tipo,
} from './lib/biblioteca';
import {elegir} from './lib/sonido';
import {buscarEfecto, leerCatalogo, type Rol} from './sfxCatalog';
import {ffmpeg} from './lib/ffmpegFull';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

type Overlay = {icon?: string; sticker?: string; photo?: string; sfx?: string; [k: string]: unknown};
type Clip = {file: string; overlays?: Overlay[]; sfx?: string; durationInSeconds?: number; [k: string]: unknown};
type Plan = {project?: string; dir: string; iconSet?: string; clips: Clip[]; sonido?: Record<string, string>; [k: string]: unknown};

/** "buscar:x" busca algo específico; "@rol" toma el mejor del catálogo. Los dos se fijan. */
const fijarSfx = async (valor: string | undefined, proyecto: string, duracion?: number): Promise<string | undefined> => {
  if (!valor || valor === 'ninguno' || valor.startsWith('sfx:') || /\.(mp3|wav)$/.test(valor)) return valor;
  if (valor.startsWith('buscar:')) {
    const terminos = valor.slice('buscar:'.length).trim();
    const [mejor] = await buscarEfecto(terminos, duracion);
    if (!mejor) throw new Error(`No encontré un sonido para "${terminos}". Prueba otros términos en inglés.`);
    console.log(`   🔊 "${terminos}" → ${mejor.id}  ${mejor.nombre} (${mejor.duracion}s)`);
    return `sfx:${mejor.id}`;
  }
  if (valor.startsWith('@')) {
    const [ref] = elegir(valor.slice(1) as Rol, 1, {proyecto});
    if (!ref?.id) throw new Error(`No hay efectos aptos para ${valor}. Corre npm run sfx-catalog.`);
    console.log(`   🔊 ${valor} → ${ref.id}`);
    return `sfx:${ref.id}`;
  }
  return valor;
};

type Fila = {intencion: string; archivos: Array<string | null>; ids: string[]};

/** Un id ya fijado: se busca en el índice o se reconstruye (íconos y emoji). */
const porId = async (tipo: Tipo, id: string): Promise<Asset> => {
  const enIndice = leerIndice().find((a) => a.id === id);
  if (enIndice) return enIndice;
  if (id.startsWith('emoji:')) return emojiPorId(id);
  if (tipo === 'icon') return iconoPorId(id);
  throw new Error(`${id} no está en el índice. Vuelve a poner la intención en el plan y corre assets de nuevo.`);
};

const conPlan = async (planPath: string) => {
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as Plan;
  const proyecto = plan.project ?? path.basename(path.dirname(plan.dir));
  const creditos = new Set<string>();
  const set = plan.iconSet ?? 'ph';
  if (!SETS_ICONOS[set]) throw new Error(`iconSet "${set}" no está entre los permitidos: ${Object.keys(SETS_ICONOS).join(', ')}`);
  const filas: Fila[] = [];

  console.log(`\n🎨 ${planPath} · íconos preferentemente de ${SETS_ICONOS[set].nombre} (estilos mezclados se notan)\n`);

  for (const clip of plan.clips) {
    for (const o of clip.overlays ?? []) {
      const tipo: Tipo | null = o.icon ? 'icon' : o.sticker ? 'sticker' : o.photo ? 'photo' : null;
      if (!tipo) continue;
      const valor = o[tipo] as string;
      let asset: Asset;

      if (esId(valor)) {
        asset = await fijar(await porId(tipo, valor), null, proyecto);
      } else if (tipo === 'icon') {
        const ids = (await buscarIcono(valor, set)).slice(0, 6);
        if (!ids.length) throw new Error(`Iconify no encontró "${valor}". Prueba en inglés o con otra palabra.`);
        if (!ids[0].startsWith(`${set}:`)) console.log(`   ⚠️  "${valor}" no existe en ${SETS_ICONOS[set].nombre}: se usa otro set.`);
        asset = await fijar(iconoPorId(ids[0]), valor, proyecto);
        const archivos: string[] = [];
        for (const id of ids) {
          const [p, n] = id.split(':');
          const f = path.join('out', 'assets', 'tmp', `${p}__${n}.svg`);
          fs.mkdirSync(path.dirname(f), {recursive: true});
          const r = await fetch(`https://api.iconify.design/${p}/${n}.svg?height=256&color=%2307080c`);
          fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
          archivos.push(f);
        }
        filas.push({intencion: valor, archivos, ids});
      } else if (tipo === 'photo') {
        const fotos = (await buscarFotos(valor)).slice(0, 6);
        if (!fotos.length) throw new Error(`No hay foto real para "${valor}" (SourceSplash sin relleno + Wikimedia).`);
        for (const f of fotos) await asegurar(f);
        asset = await fijar(fotos[0], valor, proyecto);
        filas.push({intencion: valor, archivos: fotos.map((f) => path.join('public', f.archivo)), ids: fotos.map((f) => f.id)});
      } else {
        const lotties = await buscarLottie(valor, 6);
        if (!lotties.length) throw new Error(`LottieFiles no encontró "${valor}".`);
        asset = await fijar(lotties[0], valor, proyecto);
        console.log(`   ⚠️  sticker "${valor}": los Lottie varían mucho de estilo y no se previsualizan acá.`);
        console.log(`      Alternativas: ${lotties.slice(1).map((l) => l.id).join(', ')}`);
      }

      if (asset.atribucion) creditos.add(asset.atribucion);
      if (!esId(valor)) console.log(`   ${tipo.padEnd(7)} "${valor}" → ${asset.id}`);
      o[tipo] = asset.id;
      o.sfx = await fijarSfx(o.sfx, proyecto);
    }
    clip.sfx = await fijarSfx(clip.sfx, proyecto, clip.durationInSeconds);
  }
  if (plan.sonido) {
    for (const k of Object.keys(plan.sonido)) {
      plan.sonido[k] = (await fijarSfx(plan.sonido[k], proyecto)) as string;
    }
  }

  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`\n✅ Todo fijado en ${planPath}.`);

  if (filas.length) {
    const salida = path.join('out', 'assets', `${proyecto}-candidatos.jpg`);
    await hojaFilas(filas, salida);
    console.log(`\n👀 REVISA ${salida}: una fila por intención, la casilla 1 es la que quedó.`);
    console.log('   Si otra calza mejor con lo que se ve, cambia el id en el plan:');
    for (const f of filas) console.log(`   "${f.intencion}": ${f.ids.map((id, i) => `${i + 1}=${id}`).join('  ')}`);
  }
  if (creditos.size) {
    console.log('\n📝 Créditos que van en la descripción del post (licencias CC BY):');
    for (const c of creditos) console.log(`   • ${c}`);
  }
};

/** Una fila por intención, todas del mismo ancho para poder apilarlas. */
const hojaFilas = async (filas: Fila[], salida: string) => {
  const tmp = `${salida}.filas`;
  fs.rmSync(tmp, {recursive: true, force: true});
  fs.mkdirSync(tmp, {recursive: true});
  for (const [i, f] of filas.entries()) {
    const archivos = [...f.archivos, ...Array(6).fill(null)].slice(0, 6);
    await hojaCandidatos(archivos, path.join(tmp, `r${String(i).padStart(2, '0')}.png`), 160, f.intencion);
  }
  ffmpeg([
    '-i', path.join(tmp, 'r%02d.png'),
    '-vf', `tile=1x${filas.length}:padding=4:color=0x07080c`,
    '-frames:v', '1', salida,
  ]);
  fs.rmSync(tmp, {recursive: true, force: true});
};

/** Hoja de candidatos numerados, en una sola imagen. */
const hojaCandidatos = async (archivos: Array<string | null>, salida: string, ancho: number, fila?: string) => {
  const tmp = `${salida}.tmp`;
  fs.rmSync(tmp, {recursive: true, force: true});
  fs.mkdirSync(tmp, {recursive: true});
  archivos.forEach((a, i) => {
    const txt = path.join(tmp, `t${i}.txt`);
    fs.writeFileSync(txt, i === 0 && fila ? `1 · ${fila}` : String(i + 1));
    if (!a) {
      ffmpeg(['-f', 'lavfi', '-i', `color=c=0x07080c:s=${ancho}x${ancho}`, '-frames:v', '1', path.join(tmp, `f${String(i).padStart(2, '0')}.png`)]);
      return;
    }
    // Sobre un fondo blanco explícito: los SVG de íconos son trazo sobre
    // transparente, y el transparente se aplana a negro — negro sobre negro.
    ffmpeg([
      '-f', 'lavfi', '-i', `color=c=white:s=${ancho}x${ancho}`,
      '-i', a,
      '-filter_complex',
      `[1]scale=${ancho - 24}:${ancho - 24}:force_original_aspect_ratio=decrease[p];[0][p]overlay=(W-w)/2:(H-h)/2,` +
        `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile=${txt}:fontsize=22:fontcolor=white:box=1:boxcolor=0x0047ABEE:boxborderw=6:x=6:y=6`,
      '-frames:v', '1', path.join(tmp, `f${String(i).padStart(2, '0')}.png`),
    ]);
  });
  const cols = Math.min(archivos.length, 6);
  ffmpeg([
    '-i', path.join(tmp, 'f%02d.png'),
    '-vf', `tile=${cols}x${Math.ceil(archivos.length / cols)}:padding=6:margin=6:color=0x07080c`,
    '-frames:v', '1', salida,
  ]);
  fs.rmSync(tmp, {recursive: true, force: true});
};

const buscar = async (tipo: string, intencion: string) => {
  const preview = argv.includes('--preview');
  const salida = path.join('out', 'assets', `${tipo}-${intencion.replace(/[^a-z0-9]+/gi, '_')}.jpg`);
  fs.mkdirSync(path.dirname(salida), {recursive: true});

  if (tipo === 'icon') {
    const ids = (await buscarIcono(intencion, arg('set') ?? 'ph')).slice(0, 12);
    ids.forEach((id, i) => console.log(`  ${String(i + 1).padStart(2)}. ${id}`));
    if (preview && ids.length) {
      const archivos: string[] = [];
      for (const id of ids) {
        const [p, n] = id.split(':');
        const f = path.join('out', 'assets', 'tmp', `${p}__${n}.svg`);
        fs.mkdirSync(path.dirname(f), {recursive: true});
        const r = await fetch(`https://api.iconify.design/${p}/${n}.svg?height=256&color=%2307080c`);
        fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
        archivos.push(f);
      }
      await hojaCandidatos(archivos, salida, 160);
      console.log(`\n🖼️  ${salida}  (el número de cada casilla es el de la lista)`);
    }
  } else if (tipo === 'photo') {
    const fotos = (await buscarFotos(intencion)).slice(0, 8);
    fotos.forEach((f, i) => console.log(`  ${String(i + 1).padStart(2)}. ${f.id}  [${f.licencia}]`));
    if (preview && fotos.length) {
      for (const f of fotos) await asegurar(f);
      await hojaCandidatos(fotos.map((f) => path.join('public', f.archivo)), salida, 300);
      console.log(`\n🖼️  ${salida}`);
    }
  } else if (tipo === 'sticker') {
    if (/^emoji:/.test(intencion)) {
      console.log('  Los emoji de Noto se ven como el emoji: no hace falta previsualizar.');
      return;
    }
    const lotties = await buscarLottie(intencion, 8);
    lotties.forEach((l, i) => console.log(`  ${String(i + 1).padStart(2)}. ${l.id}  ${l.url}`));
    console.log('\n  Los Lottie de LottieFiles son de autores distintos y su estilo varía mucho: si el');
    console.log('  primero no calza, fija otro id en el plan. Un emoji de Noto ("emoji:🔥") es más parejo.');
  } else if (tipo === 'sfx') {
    const efectos = (await buscarEfecto(intencion)).slice(0, 10);
    efectos.forEach((e, i) =>
      console.log(`  ${String(i + 1).padStart(2)}. sfx:${e.id.padEnd(20)} ${String(e.duracion).padStart(5)}s  pico ${e.picoSeg}s  ${e.brilloHz}Hz  ${e.nombre}`),
    );
  } else {
    throw new Error('Tipo: icon | sticker | photo | sfx');
  }
};

const main = async () => {
  const plan = arg('plan');
  if (plan) return conPlan(plan);
  const i = argv.indexOf('--buscar');
  if (i !== -1) return buscar(argv[i + 1], argv[i + 2] ?? '');
  if (argv.includes('--list')) {
    const indice = leerIndice();
    for (const t of ['icon', 'sticker', 'photo']) {
      const de = indice.filter((a) => a.tipo === t);
      console.log(`  ${t.padEnd(8)} ${de.length}   ${de.slice(0, 6).map((a) => a.id).join(', ')}${de.length > 6 ? '…' : ''}`);
    }
    const c = leerCatalogo();
    console.log(`  sfx      ${c.filter((e) => e.apto).length} aptos de ${c.length} medidos`);
    return;
  }
  throw new Error('Usa --plan <plan>, --buscar <tipo> "<intención>" o --list');
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
