/**
 * Valida un plan de edición ANTES de renderizar.
 *
 *   npm run check -- --plan plans/video-46.json
 *
 * Existe porque un render son ~15 minutos y los errores que lo arruinan son
 * casi siempre detectables en 2 segundos: un clip que no está, una ventana que
 * se pasa del largo del clip, el audio de 16 kHz en vez del HQ, los efectos sin
 * descargar. Todo lo que se pueda verificar acá no debería descubrirse mirando
 * el resultado.
 */
import fs from 'node:fs';
import path from 'node:path';
import {probe} from './lib/media';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

type PlanClip = {
  file: string;
  caption?: string;
  startFromSeconds?: number;
  durationInSeconds?: number;
  ignoreSpeech?: boolean;
};
type Plan = {
  project?: string;
  dir: string;
  hook: string;
  cta?: string;
  clips: PlanClip[];
};

const problemas: string[] = [];
const avisos: string[] = [];

const main = () => {
  const planPath = arg('plan');
  if (!planPath) throw new Error('Falta --plan <archivo.json>');
  if (!fs.existsSync(planPath)) throw new Error(`No existe el plan: ${planPath}`);

  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as Plan;
  const projectDir = path.dirname(plan.dir);
  const audioDir = path.join(projectDir, '_audio');

  console.log(`\n🔍 ${planPath}\n`);

  // --- Gancho -------------------------------------------------------------
  if (!plan.hook?.trim()) {
    problemas.push('El plan no tiene gancho. Los primeros 1,5s deciden si alguien sigue viendo.');
  } else {
    const palabras = plan.hook.replace(/\*/g, '').split(/\s+/).length;
    if (palabras > 8) {
      avisos.push(`El gancho tiene ${palabras} palabras. Sobre 8 no alcanza a leerse antes del scroll.`);
    }
    if (!plan.hook.includes('*')) {
      avisos.push('El gancho no marca ninguna palabra con *asteriscos*: se pierde el resaltado de color.');
    }
  }

  // --- Clips --------------------------------------------------------------
  let totalSegundos = 0;
  const usados = new Set<string>();

  for (const [i, clip] of (plan.clips ?? []).entries()) {
    const etiqueta = `clip ${i + 1} (${clip.file})`;
    const source = path.resolve(plan.dir, clip.file);
    usados.add(clip.file);

    if (!fs.existsSync(source)) {
      problemas.push(`${etiqueta}: no existe el archivo. Corre \`npm run fetch-drive\`.`);
      continue;
    }

    const info = probe(source);
    const inicio = clip.startFromSeconds ?? 0;
    const dur = clip.durationInSeconds ?? 3.4;
    totalSegundos += dur;

    if (inicio >= info.durationInSeconds) {
      problemas.push(
        `${etiqueta}: empieza en ${inicio}s pero el clip dura ${info.durationInSeconds.toFixed(1)}s.`,
      );
    } else if (inicio + dur > info.durationInSeconds + 0.5) {
      avisos.push(
        `${etiqueta}: la ventana (${inicio}s +${dur}s) se pasa del largo del clip (${info.durationInSeconds.toFixed(1)}s); se va a recortar.`,
      );
    }

    // Un clip mudo sin texto es tiempo muerto en pantalla.
    const nombre = path.basename(clip.file, path.extname(clip.file));
    const tieneTranscripcion = fs.existsSync(path.join(audioDir, `${nombre}.json`));
    const usaVoz = tieneTranscripcion && !clip.ignoreSpeech;
    if (!usaVoz && !clip.caption) {
      avisos.push(`${etiqueta}: sin voz y sin \`caption\`. Van ${dur}s de pantalla sin texto.`);
    }

    // El audio del reel tiene que salir de la pista HQ, no de la de whisper.
    if (usaVoz && !fs.existsSync(path.join(audioDir, 'hq', `${nombre}.wav`))) {
      problemas.push(
        `${etiqueta}: falta \`_audio/hq/${nombre}.wav\`. Sin eso el reel usa la pista de 16 kHz y suena opaco. Corre \`npm run audio\`.`,
      );
    }
  }

  // --- Material sin usar --------------------------------------------------
  if (fs.existsSync(plan.dir)) {
    const disponibles = fs
      .readdirSync(plan.dir)
      .filter((f) => ['.mov', '.mp4', '.m4v'].includes(path.extname(f).toLowerCase()));
    const sinUsar = disponibles.filter((f) => !usados.has(f));
    if (sinUsar.length) {
      avisos.push(
        `${sinUsar.length} clips descargados no están en el plan: ${sinUsar.join(', ')}. ` +
          'Míralos antes de descartarlos — así se perdió la historia la primera vez.',
      );
    }
  }

  // --- Duración total -----------------------------------------------------
  if (totalSegundos > 0) {
    if (totalSegundos < 12) {
      avisos.push(`El reel dura ~${totalSegundos.toFixed(0)}s. Bajo 12s no alcanza a contar una historia.`);
    } else if (totalSegundos > 75) {
      avisos.push(`El reel dura ~${totalSegundos.toFixed(0)}s antes de cortar silencios. Sobre 60-75s la retención cae fuerte.`);
    }
  }

  // --- Assets del render --------------------------------------------------
  if (!fs.existsSync('public/sfx/whoosh-1.mp3')) {
    problemas.push('Faltan los efectos de sonido. Corre `npm run sfx`.');
  }
  if (!fs.existsSync('src/fonts.generated.ts')) {
    problemas.push('Faltan las tipografías. Corre `npm run fonts`.');
  }

  // --- Resultado ----------------------------------------------------------
  for (const a of avisos) console.log(`⚠️  ${a}`);
  for (const p of problemas) console.log(`❌ ${p}`);

  if (!problemas.length && !avisos.length) {
    console.log('✅ El plan está listo para renderizar.');
  } else if (!problemas.length) {
    console.log(`\n✅ Se puede renderizar (${avisos.length} avisos, revísalos).`);
  } else {
    console.log(`\n❌ ${problemas.length} problemas que hay que arreglar antes de renderizar.`);
    process.exit(1);
  }
};

try {
  main();
} catch (error: unknown) {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
