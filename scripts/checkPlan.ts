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
  /** Escape para cortar a propósito por la mitad de una palabra. */
  allowMidWordCut?: boolean;
};

type Palabra = {text: string; start: number; end: number};
type Transcripcion = {words?: Palabra[]; speech?: {start: number; end: number}[]};
type Plan = {
  project?: string;
  dir: string;
  hook: string;
  cta?: string;
  /** Cierre con alfa hecho en HyperFrames, relativo a public/. */
  finalOverlaySrc?: string;
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
    const esUltimo = i === (plan.clips ?? []).length - 1;
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

    // Un clip mudo y largo sin nada encima es tiempo muerto. Pero ojo: este
    // aviso ya empujó una vez a rellenar B-roll con texto inventado ("Un
    // taladro y nada más" sobre un plano sin taladro), que es peor que el
    // silencio y va contra la regla de no inventar contenido. Así que solo
    // avisa cuando el hueco es largo de verdad, y nunca sobre el último corte
    // si el cierre de HyperFrames ya va montado encima.
    const nombre = path.basename(clip.file, path.extname(clip.file));
    const transcripcionPath = path.join(audioDir, `${nombre}.json`);
    const tieneTranscripcion = fs.existsSync(transcripcionPath);
    const usaVoz = tieneTranscripcion && !clip.ignoreSpeech;
    const loCubreElCierre = esUltimo && Boolean(plan.finalOverlaySrc);
    if (!usaVoz && !clip.caption && !loCubreElCierre && dur > 3.5) {
      avisos.push(
        `${etiqueta}: ${dur}s mudos y sin texto. Si no hay nada que decir de verdad, córtalo más corto; no le inventes un subtítulo.`,
      );
    }

    // El audio del reel tiene que salir de la pista HQ, no de la de whisper.
    if (usaVoz && !fs.existsSync(path.join(audioDir, 'hq', `${nombre}.wav`))) {
      problemas.push(
        `${etiqueta}: falta \`_audio/hq/${nombre}.wav\`. Sin eso el reel usa la pista de 16 kHz y suena opaco. Corre \`npm run audio\`.`,
      );
    }

    // --- La ventana no puede partir una palabra por la mitad ----------------
    // Se entregó un render donde "mueblecito" sonaba "muebleci": la frase
    // terminaba en 6,56s y la ventana cerraba en 6,08s. Mirando frames no se
    // nota; escuchando sí, y era lo último que se oía del video.
    //
    // La comparación NO es contra los bordes de la ventana. `buildReel` corta
    // silencios: el corte real cae en el borde del tramo con voz, y ese borde
    // lo puso el detector de energía, que por construcción está en silencio.
    // Solo es peligroso el borde que puso la ventana, o sea cuando la ventana
    // recorta un tramo de voz por dentro. Comparar contra la ventana cruda da
    // falsos positivos en cadena, porque whisper estira la última palabra de
    // cada segmento hasta el borde del segmento ("conectores" dura 3,86s, con
    // medio segundo de silencio adentro).
    if (tieneTranscripcion) {
      let transcripcion: Transcripcion = {};
      try {
        transcripcion = JSON.parse(fs.readFileSync(transcripcionPath, 'utf8')) as Transcripcion;
      } catch {
        problemas.push(`${etiqueta}: \`${transcripcionPath}\` no es JSON válido.`);
      }
      const fin = inicio + dur;
      const palabras = transcripcion.words ?? [];

      if (usaVoz && !clip.allowMidWordCut) {
        // 50 ms de tolerancia: whisper no clava el borde de la palabra al
        // milisegundo y un roce no se escucha.
        const MARGEN = 0.05;
        const parte = (t: number) => palabras.find((p) => p.start + MARGEN < t && t < p.end - MARGEN);

        for (const tramo of transcripcion.speech ?? []) {
          // Mismo filtro que buildReel: un tramo demasiado corto no llega a ser
          // un corte, así que no hay nada que partir.
          if (Math.min(tramo.end, fin) - Math.max(tramo.start, inicio) < 0.8) continue;

          // Cortar el final de una frase siempre está mal: la palabra se
          // escucha a medias y no hay ninguna lectura en que eso sume.
          if (tramo.end > fin) {
            const palabra = parte(fin);
            if (palabra) {
              problemas.push(
                `${etiqueta}: la ventana cierra en ${fin.toFixed(2)}s, por la mitad de "${palabra.text}" (${palabra.start}–${palabra.end}s). ` +
                  `Así se escucha cortada. Llega hasta ${(palabra.end + 0.15).toFixed(2)}s o marca \`"allowMidWordCut": true\`.`,
              );
            }
          }
          // Entrar por la mitad de una palabra a veces es un corte rápido
          // buscado, así que avisa en vez de bloquear.
          if (tramo.start < inicio) {
            const palabra = parte(inicio);
            if (palabra) {
              avisos.push(
                `${etiqueta}: la ventana abre en ${inicio}s, por la mitad de "${palabra.text}" (${palabra.start}–${palabra.end}s). ` +
                  `Si no es un corte rápido a propósito, empieza en ${palabra.start}s.`,
              );
            }
          }
        }
      }

      // Un clip marcado como mudo que en realidad tapa voz: así casi se pierde
      // el remate de Video 46, descartado por una transcripción mala.
      if (clip.ignoreSpeech) {
        const tapada = (transcripcion.speech ?? [])
          .map((r) => Math.min(r.end, fin) - Math.max(r.start, inicio))
          .reduce((max, s) => Math.max(max, s), 0);
        if (tapada > 0.6) {
          avisos.push(
            `${etiqueta}: está marcado \`ignoreSpeech\` pero la ventana tapa ${tapada.toFixed(1)}s de voz. ` +
              'Escúchala antes de darla por muda: puede ser jerga mal transcrita, no ruido.',
          );
        }
      }
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
