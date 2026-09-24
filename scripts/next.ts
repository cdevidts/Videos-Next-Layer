/**
 * "Haz el siguiente video": todo lo mecánico, en un comando.
 *
 *   npm run next                          # el siguiente proyecto sin entregar
 *   npm run next -- --project "Video 43"  # uno en particular
 *
 * Elige el proyecto, lo baja entero con la compuerta de conteo, extrae audio,
 * transcribe y arma el digest. Se detiene justo donde empieza el criterio:
 * mirar el material y escribir el plan. Todo lo anterior no necesita a nadie, y
 * hacerlo a mano era donde se colaban los errores (un clip sin bajar, una
 * transcripción sin correr, una carpeta equivocada).
 *
 * Es reanudable como todo el pipeline: si se corta, correrlo de nuevo salta lo
 * que ya está hecho.
 */
import fs from 'node:fs';
import path from 'node:path';
import {ingresar, leerRegistro, listarProyectos, REGISTRO} from './ingest';
import {digest} from './digest';
import {run} from './lib/media';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

const numero = (nombre: string) => Number(/(\d+)/.exec(nombre)?.[1] ?? Number.MAX_SAFE_INTEGER);

const main = async () => {
  let proyecto = arg('project');

  if (!proyecto) {
    const {registro, proyectos} = await listarProyectos();
    // En curso primero: si una sesión anterior se cortó, se retoma ese antes de
    // abrir otro. Después el pendiente de número más bajo.
    const candidatos = proyectos
      .map((p) => ({nombre: p.name, estado: registro.videos[p.name]?.estado ?? 'nuevo'}))
      .filter((p) => p.estado !== 'entregado')
      .sort((a, b) => Number(b.estado === 'en-curso') - Number(a.estado === 'en-curso') || numero(a.nombre) - numero(b.nombre));
    if (!candidatos.length) {
      console.log('✅ Todos los proyectos de Drive están entregados. Sube una carpeta nueva y vuelve a correr.');
      return;
    }
    proyecto = candidatos[0].nombre;
    const nota = registro.videos[proyecto]?.nota;
    console.log(`\n👉 Siguiente: ${proyecto}${nota ? `\n   ⚠️  ${nota}` : ''}`);
    const resto = candidatos.slice(1).map((c) => c.nombre);
    if (resto.length) console.log(`   Después: ${resto.join(', ')}`);
  }

  // 1. Bajar todo, con la compuerta. Sin compuerta no se sigue: es la regla.
  const m = await ingresar(proyecto);
  if (!m.compuerta.ok) {
    console.log('\n⛔ No se empieza el proyecto: la compuerta de ingreso no pasó (ver arriba).');
    process.exit(2);
  }

  const dir = path.join('public', 'input', m.slug);

  // 2. Audio (clips + voces en off) y transcripción. Ambos saltan lo ya hecho.
  console.log('\n🔊 Audio...');
  run('npx', ['tsx', 'scripts/extractAudio.ts', '--dir', dir]);
  console.log('\n🎙️  Transcripción...');
  run('npx', ['tsx', 'scripts/transcribeClips.ts', '--dir', path.join(dir, '_audio'), '--model', 'medium', '--language', 'es']);

  // 3. Digest: con las transcripciones ya hechas, las hojas llevan lo que se dice.
  console.log('\n🖼️  Digest...');
  // Las hojas se rehacen si el digest anterior se armó sin transcripciones.
  digest(m.slug, !m.digest);

  // 4. Registro: en curso, para que la próxima sesión lo retome.
  const registro = leerRegistro();
  const entrada = registro.videos[m.proyecto];
  if (entrada && entrada.estado !== 'entregado') {
    entrada.estado = 'en-curso';
    fs.writeFileSync(REGISTRO, `${JSON.stringify(registro, null, 2)}\n`);
  }

  const plan = path.join('plans', `${m.slug}.json`);
  console.log(`
────────────────────────────────────────────────────────────────
✅ ${m.proyecto} listo para planear. Ahora, con criterio:

  1. Lee ${path.join(dir, 'DIGEST.md')} y abre CADA hoja de _digest/
     (${m.archivos.filter((a) => a.tipo === 'clip').length} clips — ninguno se descarta sin mirarlo).
  2. Escribe ${plan}${fs.existsSync(plan) ? ' (ya existe: revísalo)' : ` partiendo de plans/_plantilla.json`}.
  3. npm run assets -- --plan ${plan}     # íconos, stickers, fotos, efectos
  4. npm run check  -- --plan ${plan}
  5. npm run reel   -- --plan ${plan}
  6. npm run watch  -- renders/${m.slug}-reel.mp4   y lee GUION.md
────────────────────────────────────────────────────────────────`);
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
