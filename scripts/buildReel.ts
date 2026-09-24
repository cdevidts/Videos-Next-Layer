/**
 * Arma el reel vertical a partir de los clips sueltos de un proyecto:
 *   proxy 1080x1920 -> corte de silencios con la transcripción -> props -> render.
 *
 *   npm run reel -- --plan plans/video-46.json
 *   npm run reel -- --plan plans/video-46.json --dry-run
 *
 * Si existe la transcripción del clip (scripts/transcribeClips.ts), cada tramo
 * con voz se convierte en un corte y los silencios quedan fuera. Los clips sin
 * voz (B-roll) usan la ventana y el texto definidos en el plan.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalize, probe, run} from './lib/media';
import {syncCaptions} from './syncCaptions';
import {
  reelDurationInFrames,
  type ReelOverlay,
  type ReelShot,
  type ReelWord,
  type SfxRef,
  type VerticalReelProps,
} from '../src/lib/reel';
import {asegurar, esId, leerIndice} from './lib/biblioteca';
import {elegir, registrarUso, resolverSfx} from './lib/sonido';
import {asegurarCierre} from './cierre';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};
const flag = (name: string) => argv.includes(`--${name}`);

type PlanClip = {
  file: string;
  label?: string;
  caption?: string;
  startFromSeconds?: number;
  durationInSeconds?: number;
  /** Ignora la voz de este clip aunque exista transcripción. */
  ignoreSpeech?: boolean;
  /** Gráfica que puntúa el corte (íconos, stickers, fotos). Ver PlanOverlay. */
  overlays?: PlanOverlay[];
  /**
   * Voz en off de Sonido/ que suena sobre este clip, relativa a la carpeta del
   * proyecto (ej. "Sonido/Audios/VO1.wav"). Para B-roll o planos donde no se
   * habla a cámara. Los subtítulos salen de su transcripción.
   */
  voiceover?: string;
  /**
   * Efecto de este corte: "taladro.mp3" (public/sfx), "sfx:<id>" (catálogo),
   * "@impact" (el mejor del rol) o "buscar:<términos>" — este último lo
   * resuelve `npm run assets` buscando algo específico para ESTE plano.
   */
  sfx?: string;
  /**
   * Acelera el corte. Sirve para tomas habladas donde en pantalla no pasa nada
   * (una pantalla de computador quieta). El tono de voz no cambia: Remotion
   * usa atempo, que estira el tiempo sin resamplear.
   */
  speed?: number;
};

type PlanOverlay = {
  /** UNO de estos tres. Intención ("drill") o id fijado por `npm run assets`. */
  icon?: string;
  sticker?: string;
  photo?: string;
  /**
   * Palabra a la que se engancha. Con esto entra justo cuando se dice, que es lo
   * que hace que se sienta parte del montaje y no una calcomanía pegada encima.
   */
  word?: string;
  /** Sin `word`: segundo dentro del corte en que entra. */
  at?: number;
  duration?: number;
  pos?: 'left' | 'right' | 'lower' | 'center' | 'top';
  /** Sonido de entrada: pop/click del catálogo por defecto; "ninguno" lo quita. */
  sfx?: string;
};

type Plan = {
  project?: string;
  /**
   * Anula los sonidos automáticos. Cada uno acepta "@rol", "sfx:<id>",
   * "archivo.mp3" o "ninguno". Si el video pide otra cosa, se pide acá: el
   * catálogo es el default, no una obligación.
   */
  sonido?: {transiciones?: string; apertura?: string; riser?: string; impacto?: string; ui?: string};
  dir: string;
  hook: string;
  cta?: string;
  ctaSub?: string;
  /** Cierre con alfa hecho en HyperFrames, relativo a public/. */
  finalOverlaySrc?: string;
  /**
   * Textos del cierre de ESTE video (ver scripts/cierre.ts). Con esto el reel
   * renderiza su propio cierre a public/cierres/<proyecto>.webm.
   */
  cierre?: {precio?: string; bajadaPrecio?: string; tagIzq?: string; tagDer?: string; marca?: string; bajadaMarca?: string};
  accentColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  musicSrc?: string;
  musicVolume?: number;
  sfxVolume?: number;
  transitionInFrames?: number;
  /** Silencio máximo tolerado dentro de un tramo con voz. */
  clips: PlanClip[];
};

type Transcript = {
  words: ReelWord[];
  speech: Array<{start: number; end: number}>;
  /** Transcripción arreglada por una persona: no se vuelve a transcribir nunca. */
  correctedByHuman?: boolean;
};

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv'];
/**
 * Resuelve la gráfica de un corte: archivo en disco, instante y sonido de entrada.
 *
 * El instante sale de la palabra, buscada sobre los `words` YA convertidos a
 * tiempo del corte (con la velocidad aplicada): buscarla en la transcripción
 * original daría el instante del clip crudo, que no es donde cae en el reel.
 *
 * Solo acepta ids fijados. Buscar en internet es trabajo de `npm run assets`,
 * que además deja la elección escrita en el plan: el render no decide nada.
 */
const resolverOverlays = async (
  pedidos: PlanOverlay[],
  words: ReelWord[] | undefined,
  siguienteUi: () => SfxRef | undefined,
  proyecto: string,
  duracionCorte: number,
): Promise<ReelOverlay[]> => {
  const indice = leerIndice();
  const salida: ReelOverlay[] = [];
  for (const o of pedidos) {
    const tipo = o.icon ? 'icon' : o.sticker ? 'sticker' : o.photo ? 'photo' : null;
    const valor = o.icon ?? o.sticker ?? o.photo;
    if (!tipo || !valor) continue;
    const asset = esId(valor) ? indice.find((a) => a.id === valor) : undefined;
    if (!asset) {
      throw new Error(`El ${tipo} "${valor}" no está fijado. Corre: npm run assets -- --plan <plan>`);
    }
    await asegurar(asset);

    let at = o.at ?? 0.3;
    if (o.word && words?.length) {
      const buscada = normalizar(o.word);
      const w = words.find((x) => normalizar(x.text).includes(buscada));
      if (w) at = Math.max(w.start - 0.12, 0);
      else console.warn(`⚠️  "${o.word}" no aparece en los subtítulos de este corte: ${valor} entra a los ${at}s.`);
    }
    // Un overlay cuya palabra cae al final de un corte corto vive fracciones de
    // segundo: en la primera prueba un sticker quedó 0,2 s en pantalla, imposible
    // de leer. Se avisa acá, antes del render.
    const visible = Math.min(o.duration ?? 1.4, duracionCorte - 0.2 - at);
    if (visible < 0.6) {
      console.warn(
        `⚠️  ${valor} se vería ${Math.max(visible, 0).toFixed(1)}s: entra a los ${at.toFixed(1)}s de un corte de ${duracionCorte.toFixed(1)}s. ` +
          'Engánchalo a una palabra anterior o ponlo en un corte más largo.',
      );
    }
    const sfx = o.sfx === 'ninguno' ? undefined : o.sfx ? resolverSfx(o.sfx, proyecto) : siguienteUi();
    salida.push({
      tipo,
      src: asset.archivo,
      atSeconds: Number(at.toFixed(3)),
      durationSeconds: o.duration,
      pos: o.pos,
      multicolor: asset.multicolor,
      sfx,
    });
  }
  return salida;
};

/** ¿Este overlay va en este corte? Si nombra una palabra, en el corte donde se dice. */
const vaEn = (o: PlanOverlay, words: ReelWord[]) =>
  !o.word || words.some((w) => normalizar(w.text).includes(normalizar(o.word as string)));

/** Sin tildes ni puntuación: "armé," y "arme" tienen que calzar. */
const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const MIN_SHOT_SECONDS = 0.8;
/** Pausas más cortas que esto no valen un corte: se fusionan. */
const MERGE_GAP_SECONDS = 0.4;

const mergeRanges = (ranges: Array<{start: number; end: number}>) => {
  const merged: Array<{start: number; end: number}> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start - last.end < MERGE_GAP_SECONDS) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({...range});
    }
  }
  return merged;
};

const publicPath = (absolute: string) =>
  path.relative(path.resolve('public'), absolute).split(path.sep).join('/');

const loadTranscript = (audioDir: string, name: string): Transcript | null => {
  const file = path.join(audioDir, `${name}.json`);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as Transcript;
  return data.speech?.length ? data : null;
};

const main = async () => {
  const planPath = arg('plan');
  if (!planPath) throw new Error('Falta --plan <archivo.json>');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as Plan;

  const fps = Number(arg('fps') ?? 30);
  const project = plan.project ?? path.basename(path.dirname(plan.dir));
  const projectDir = path.dirname(plan.dir);
  const normalizedDir = path.join(projectDir, '_normalized');
  const audioDir = path.join(projectDir, '_audio');

  if (!fs.existsSync(plan.dir)) throw new Error(`No existe la carpeta de clips: ${plan.dir}`);

  const items: PlanClip[] = plan.clips?.length
    ? plan.clips
    : fs
        .readdirSync(plan.dir)
        .filter((f) => VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
        .sort()
        .map((file) => ({file}));

  const shots: ReelShot[] = [];
  const son = plan.sonido ?? {};

  // Sonidos de entrada de la gráfica: pops y clicks medidos, rotando. La
  // directiva pide un pop o click cada vez que un elemento entra con spring().
  const ui: SfxRef[] =
    son.ui === 'ninguno'
      ? []
      : son.ui
        ? [resolverSfx(son.ui, project)].filter((x): x is SfxRef => Boolean(x))
        : [...elegir('pop', 3, {proyecto: project}), ...elegir('click', 3, {proyecto: project})];
  let turnoUi = 0;
  const siguienteUi = () => (ui.length ? ui[turnoUi++ % ui.length] : undefined);

  for (const item of items) {
    const source = path.resolve(plan.dir, item.file);
    if (!fs.existsSync(source)) throw new Error(`No existe el clip del plan: ${source}`);

    const name = path.basename(item.file, path.extname(item.file));
    const proxy = normalize(source, normalizedDir, fps);
    const info = probe(proxy);
    const src = publicPath(proxy);

    const windowStart = Math.max(item.startFromSeconds ?? 0, 0);
    const windowEnd = item.durationInSeconds
      ? Math.min(windowStart + item.durationInSeconds, info.durationInSeconds)
      : info.durationInSeconds;

    const transcript = item.ignoreSpeech ? null : loadTranscript(audioDir, name);
    // La pista del reel sale de _audio/hq (48 kHz estéreo). La de la raíz de
    // _audio es mono 16 kHz y existe solo para whisper: usarla acá deja el
    // audio opaco.
    const hqFile = path.join(audioDir, 'hq', `${name}.wav`);
    const legacyFile = path.join(audioDir, `${name}.wav`);
    const audioFile = fs.existsSync(hqFile) ? hqFile : legacyFile;
    if (!fs.existsSync(hqFile) && fs.existsSync(legacyFile)) {
      console.warn(
        `⚠️  ${name}: usando audio de 16 kHz (calidad teléfono). Corre \`npm run audio\` para generar _audio/hq/.`,
      );
    }
    const audioSrc = fs.existsSync(audioFile) ? publicPath(path.resolve(audioFile)) : undefined;

    if (transcript) {
      // Corte de silencios: un corte por cada tramo con voz.
      const ranges = mergeRanges(transcript.speech)
        .map((range) => ({
          start: Math.max(range.start, windowStart),
          end: Math.min(range.end, windowEnd),
        }))
        .filter((range) => range.end - range.start >= MIN_SHOT_SECONDS);

      if (ranges.length) {
        const pendientes = [...(item.overlays ?? [])];
        for (const [index, range] of ranges.entries()) {
          const words = transcript.words
            .filter((word) => {
              const middle = (word.start + word.end) / 2;
              return middle >= range.start && middle < range.end;
            })
            .map((word) => ({
              text: word.text,
              start: Math.min(Math.max(word.start - range.start, 0), range.end - range.start),
              end: Math.min(Math.max(word.end - range.start, 0.05), range.end - range.start),
            }));

          const speed = item.speed && item.speed > 0 ? item.speed : 1;
          const palabras =
            speed === 1
              ? words
              : words.map((w) => ({text: w.text, start: w.start / speed, end: w.end / speed}));
          // Lo que no nombra palabra va al primer corte; lo que la nombra, al corte
          // donde se dice. Lo que quede sin corte al final va al primero, con aviso.
          const aca = pendientes.filter((o) => vaEn(o, palabras));
          const sobras = index === ranges.length - 1 ? pendientes.filter((o) => !aca.includes(o)) : [];
          for (const o of [...aca, ...sobras]) pendientes.splice(pendientes.indexOf(o), 1);
          const overlays = await resolverOverlays(
            [...aca, ...sobras],
            palabras,
            siguienteUi,
            project,
            (range.end - range.start) / speed,
          );
          shots.push({
            src,
            overlays: overlays.length ? overlays : undefined,
            startFromSeconds: Number(range.start.toFixed(3)),
            // Al acelerar, el corte dura menos en pantalla.
            durationInSeconds: Number(((range.end - range.start) / speed).toFixed(3)),
            label: index === 0 ? item.label : undefined,
            // Los tiempos de las palabras también se comprimen, si no el
            // karaoke se desincroniza del audio acelerado.
            words: palabras,
            audioSrc,
            audioStartFromSeconds: Number(range.start.toFixed(3)),
            speed: speed === 1 ? undefined : speed,
            sfx: index === 0 ? resolverSfx(item.sfx, project) : undefined,
            wordsLocked: transcript.correctedByHuman || undefined,
          });
        }
        const cut = (windowEnd - windowStart) - ranges.reduce((s, r) => s + (r.end - r.start), 0);
        console.log(
          `🗣️  ${item.file} · ${ranges.length} tramos con voz · ${cut.toFixed(1)}s de silencio cortados`,
        );
        continue;
      }
    }

    // B-roll: ventana fija del plan con su bajada de texto.
    let duration = Math.max(
      Math.min(item.durationInSeconds ?? 3.4, info.durationInSeconds - windowStart),
      MIN_SHOT_SECONDS,
    );

    // Voz en off sobre el B-roll: la grabación de Sonido/ pone el audio y los
    // subtítulos; el clip pone la imagen. El corte dura lo que dura la lectura
    // (sin los silencios de los bordes), hasta donde alcance el clip.
    let vo: Pick<ReelShot, 'audioSrc' | 'audioStartFromSeconds' | 'words' | 'wordsLocked'> = {};
    if (item.voiceover) {
      const voName = `vo__${path.basename(item.voiceover, path.extname(item.voiceover))}`;
      const voTranscript = loadTranscript(audioDir, voName);
      const voHq = path.join(audioDir, 'hq', `${voName}.wav`);
      if (!voTranscript || !fs.existsSync(voHq)) {
        throw new Error(`Falta el audio o la transcripción de ${item.voiceover}. Corre npm run next (o audio + transcribe).`);
      }
      const desde = voTranscript.speech[0].start;
      const hasta = voTranscript.speech[voTranscript.speech.length - 1].end;
      const lectura = hasta - desde;
      const disponible = info.durationInSeconds - windowStart;
      if (lectura > disponible) {
        console.warn(`⚠️  La voz en off ${item.voiceover} (${lectura.toFixed(1)}s) es más larga que ${item.file} desde ${windowStart}s (${disponible.toFixed(1)}s): se corta.`);
      }
      duration = Math.min(lectura, disponible);
      vo = {
        audioSrc: publicPath(path.resolve(voHq)),
        audioStartFromSeconds: Number(desde.toFixed(3)),
        words: voTranscript.words
          .filter((w) => w.start >= desde - 0.05 && w.end <= desde + duration + 0.05)
          .map((w) => ({text: w.text, start: Math.max(w.start - desde, 0), end: Math.min(w.end - desde, duration)})),
        wordsLocked: voTranscript.correctedByHuman || undefined,
      };
    }

    const overlays = await resolverOverlays(item.overlays ?? [], vo.words, siguienteUi, project, duration);
    shots.push({
      src,
      overlays: overlays.length ? overlays : undefined,
      startFromSeconds: Number(windowStart.toFixed(3)),
      durationInSeconds: Number(duration.toFixed(3)),
      label: item.label,
      caption: vo.words?.length ? undefined : item.caption,
      sfx: resolverSfx(item.sfx, project),
      speed: item.speed && item.speed !== 1 && !item.voiceover ? item.speed : undefined,
      ...vo,
    });
    console.log(
      `🎞️  ${item.file} · B-roll ${windowStart}s +${duration.toFixed(2)}s` +
        (item.voiceover ? ` · voz en off ${path.basename(item.voiceover)}` : ''),
    );
  }

  if (!shots.length) throw new Error('El plan no produjo ningún corte.');

  // Un corte es cambio de escena solo si viene de otro clip. Los cortes dentro
  // del mismo clip son jump cuts del corte de silencios: en pantalla no cambia
  // nada y no aguantan un whoosh.
  shots.forEach((shot, i) => {
    shot.isSceneChange = i === 0 || shot.src !== shots[i - 1].src;
  });
  const cambios = shots.filter((s) => s.isSceneChange).length - 1;
  console.log(`\n🎬 ${shots.length} cortes · ${cambios} cambios de escena (ahí van los whooshes)`);

  const transitionInFrames = plan.transitionInFrames ?? 8;
  const totalFrames = reelDurationInFrames(shots, fps, transitionInFrames);

  // Sonido por eventos (directiva): whoosh grave en cada cambio de escena,
  // riser de apertura sobre el gancho, y riser + golpe grave con el PICO sobre
  // el reveal. Todo sale del catálogo medido salvo que el plan pida otra cosa.
  const tomar = (valor: string | undefined, rol: Parameters<typeof elegir>[0], n: number, grave = false): SfxRef[] =>
    valor === 'ninguno'
      ? []
      : valor
        ? [resolverSfx(valor, project)].filter((x): x is SfxRef => Boolean(x))
        : elegir(rol, n, {proyecto: project, grave});

  const whooshes = tomar(son.transiciones, 'whoosh', 6, true);
  const [riserApertura] = tomar(son.apertura, 'riser', 1);
  // Si el plan ya puso sonido propio sobre el reveal, no se le suma otro: dos
  // efectos peleando por el mismo instante suenan "de más".
  const revealManual = Boolean(shots[shots.length - 1]?.sfx) || shots[shots.length - 2]?.sfx?.rol === 'riser';
  const [riser] = revealManual ? [] : tomar(son.riser, 'riser', 2).filter((r) => r.id !== riserApertura?.id);
  const [impact] = revealManual ? [] : tomar(son.impacto, 'impact', 1, true);

  const sfx = whooshes.length || riserApertura || riser || impact
    ? {whooshes, riserApertura, riser, impact}
    : undefined;
  if (!whooshes.length && son.transiciones !== 'ninguno') {
    console.warn('⚠️  No hay whooshes en el catálogo. Corre `npm run sfx-catalog`.');
  }
  const sonidosUsados = [
    ...whooshes,
    riserApertura,
    riser,
    impact,
    ...shots.flatMap((s) => [s.sfx, ...(s.overlays ?? []).map((o) => o.sfx)]),
  ].filter((x): x is SfxRef => Boolean(x));

  // El cierre lo dibuja HyperFrames si el asset existe; si no, Remotion cae al
  // cierre de texto y el pipeline sigue funcionando sin HyperFrames instalado.
  // Un plan con "cierre" trae sus propios textos: se renderiza (si falta o
  // quedó viejo) a public/cierres/<proyecto>.webm. Los planes anteriores
  // siguen usando el `finalOverlaySrc` que tenían.
  const cierrePropio = plan.cierre && !flag('dry-run') ? asegurarCierre(planPath) : undefined;
  const pedido = cierrePropio ?? plan.finalOverlaySrc;
  const finalOverlaySrc = pedido && fs.existsSync(path.join('public', pedido)) ? pedido : undefined;
  if (plan.finalOverlaySrc && !finalOverlaySrc) {
    console.warn(`⚠️  Falta public/${plan.finalOverlaySrc}. Corre \`npm run cierre\`. Se usa el cierre de texto.`);
  }

  const props: VerticalReelProps = {
    shots,
    hook: plan.hook,
    cta: plan.cta,
    ctaSub: plan.ctaSub,
    finalOverlaySrc,
    accentColor: plan.accentColor ?? '#FF6600',
    primaryColor: plan.primaryColor ?? '#0047AB',
    secondaryColor: plan.secondaryColor ?? '#00D4FF',
    musicSrc:
      arg('music') ??
      plan.musicSrc ??
      (fs.existsSync('public/sfx/musica-cama.mp3') ? 'sfx/musica-cama.mp3' : undefined),
    musicVolume: plan.musicVolume ?? 0.32,
    voiceVolume: 1,
    sfx,
    sfxVolume: plan.sfxVolume ?? 0.3,
    transitionInFrames,
  };

  fs.mkdirSync('out', {recursive: true});
  const propsFile = path.join('out', `${project}.reel.props.json`);
  const propsJson = `${JSON.stringify(props, null, 2)}\n`;
  const previousProps = fs.existsSync(propsFile)
    ? fs.readFileSync(propsFile, 'utf8')
    : null;
  fs.writeFileSync(propsFile, propsJson);

  console.log(
    `\n📐 ${shots.length} cortes · ${totalFrames} frames · ${(totalFrames / fps).toFixed(1)}s → ${propsFile}`,
  );

  if (flag('dry-run')) return;
  // Queda anotado qué sonidos usó este video, para que el próximo no los repita.
  registrarUso(sonidosUsados, project);

  const output = arg('out-file') ?? `renders/${project}-reel.mp4`;
  fs.mkdirSync(path.dirname(output), {recursive: true});

  // Reanudable: si el plan y los props no cambiaron y el render es posterior,
  // no se vuelve a renderizar (son varios minutos de CPU).
  const upToDate =
    previousProps === propsJson &&
    fs.existsSync(output) &&
    fs.statSync(output).mtimeMs >= fs.statSync(planPath).mtimeMs;

  if (upToDate && !flag('force')) {
    console.log(`\n✅ ${output} ya está al día (--force para rehacer)`);
    return;
  }

  const rawOutput = output.replace(/\.mp4$/, '.raw.mp4');
  // Los subtítulos se resincronizan contra el audio ya montado. Inferir los
  // tiempos sobre el audio original y después cortarlo y acelerarlo acumula
  // error: se midió hasta 1,2s de desfase. Acá salen del audio real.
  if (!flag('skip-captions')) {
    await syncCaptions(propsFile, 'medium' as never, 'es' as never);
  }

  console.log(`\n🚀 remotion render VerticalReel ${output}`);
  run('npx', [
    'remotion',
    'render',
    'VerticalReel',
    rawOutput,
    `--props=${propsFile}`,
    ...(arg('concurrency') ? [`--concurrency=${arg('concurrency')}`] : []),
  ]);

  // Instagram, TikTok y YouTube Shorts normalizan a -14 LUFS. Si el video sale
  // más bajo, la plataforma lo sube y de paso sube el ruido de fondo; si sale
  // más alto, lo comprime. Dejarlo en el estándar es lo que hace que suene
  // "fuerte y limpio" al lado de otros reels. El video se copia sin recodificar.
  console.log('\n🔊 Normalizando a -14 LUFS (estándar de Reels/TikTok)...');
  run('npx', [
    'remotion', 'ffmpeg', '-y',
    '-i', rawOutput,
    '-af', 'loudnorm=I=-14:TP=-1:LRA=9',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-movflags', '+faststart',
    output,
  ]);
  fs.unlinkSync(rawOutput);

  console.log(`\n✅ Listo: ${output}`);
};

const isMain = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isMain) {
  main().catch((error: unknown) => {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
