export type ReelWord = {
  text: string;
  /** Segundos relativos al inicio del corte. */
  start: number;
  end: number;
};

export type ReelShot = {
  /** Ruta relativa a public/, ej. "input/video-46/_normalized/DSCF7528.mp4". */
  src: string;
  startFromSeconds: number;
  durationInSeconds: number;
  /** Chip superior, ej. "01 · El problema". */
  label?: string;
  /** Subtítulo fijo (para B-roll sin voz). */
  caption?: string;
  /** Subtítulos karaoke con timing por palabra (de whisper.cpp). */
  words?: ReelWord[];
  /** Audio del corte (voz), separado del proxy de video. */
  audioSrc?: string;
  audioStartFromSeconds?: number;
  /**
   * true cuando este corte viene de un clip distinto al anterior. Solo ahí se
   * justifica un whoosh: los cortes dentro del mismo clip son jump cuts del
   * corte de silencios, donde en pantalla no cambia nada y un whoosh suena
   * puesto por reloj.
   */
  isSceneChange?: boolean;
  /**
   * Efecto puntual que corresponde a lo que se ve en este corte
   * (ej. "taladro" sobre el plano del taladro).
   */
  sfx?: SfxRef;
  /**
   * Gráfica que puntúa el corte: íconos, stickers animados, fotos. Los archivos
   * los baja `npm run assets` a public/assets/; `buildReel` resuelve la ruta y
   * el instante (enganchado a una palabra si el plan la nombra).
   */
  overlays?: ReelOverlay[];
  /** Velocidad de reproducción. El tono de voz no cambia: Remotion usa atempo. */
  speed?: number;
  /**
   * true cuando el texto viene de una transcripción corregida a mano. `syncCaptions`
   * no lo vuelve a transcribir: si lo hiciera, whisper devolvería otra vez lo que
   * entendió mal y la corrección humana se perdería en cada render. Los tiempos
   * de esas palabras salen del archivo corregido, no del audio montado.
   */
  wordsLocked?: boolean;
};

/**
 * Un efecto de sonido ya elegido y medido (ver `npm run sfx-catalog`).
 * `picoSeg` es donde golpea: la composición lo hace caer sobre el evento, no el
 * inicio del archivo. `gananciaDb` lo nivela contra los demás efectos.
 */
export type SfxRef = {
  src: string;
  picoSeg: number;
  gananciaDb: number;
  rol?: string;
  id?: string;
};

export type ReelOverlay = {
  tipo: 'icon' | 'sticker' | 'photo';
  /** Relativo a public/. */
  src: string;
  /** Segundo dentro del corte en que entra. */
  atSeconds: number;
  durationSeconds?: number;
  pos?: 'left' | 'right' | 'center' | 'top';
  /** Íconos de sets de color (emoji): se muestran tal cual, sin teñir. */
  multicolor?: boolean;
  /** Pop o click que suena al entrar. */
  sfx?: SfxRef;
};

export type ReelSfx = {
  /** Varios whooshes distintos: se rotan por corte. Usar siempre el mismo
   * sonido en cada transición es lo que hace que el video suene a máquina. */
  whooshes?: SfxRef[];
  /** Crece durante el gancho y desemboca en el primer corte. */
  riserApertura?: SfxRef;
  /** Crece 1,8 s antes del reveal y su pico cae justo en el último corte. */
  riser?: SfxRef;
  /** Golpe grave con el pico sobre el reveal. */
  impact?: SfxRef;
};

export type VerticalReelProps = {
  shots: ReelShot[];
  /** Gancho de apertura. Usa *asteriscos* para resaltar palabras. */
  hook: string;
  cta?: string;
  ctaSub?: string;
  /**
   * Cierre prerenderizado con canal alfa (WebM/VP9), relativo a public/. Lo
   * produce HyperFrames desde `brand/cierre/index.html` — ver `npm run cierre`.
   * Se compone sobre el ÚLTIMO corte completo, no sobre los últimos segundos:
   * el reveal necesita empezar limpio y la gráfica entra encima cuando toca.
   * Si no está, se dibuja el cierre de texto de siempre con `cta`/`ctaSub`.
   */
  finalOverlaySrc?: string;
  /**
   * Paleta de marca. `accentColor` es el naranja de acentos y CTA: es el que
   * pinta el resaltado de los subtítulos y del gancho. `primaryColor` es el azul
   * principal y tiñe el grade, así que existe en todo el video y no solo en la
   * placa de cierre. `secondaryColor` es el azul eléctrico, para los remates.
   */
  accentColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  /** Música opcional (relativa a public/). */
  musicSrc?: string;
  musicVolume?: number;
  voiceVolume?: number;
  sfx?: ReelSfx;
  sfxVolume?: number;
  transitionInFrames?: number;
};

export const DEFAULT_TRANSITION_FRAMES = 8;

export const shotFrames = (shot: ReelShot, fps: number): number =>
  Math.max(Math.round(shot.durationInSeconds * fps), 2);

/**
 * En una TransitionSeries los cortes se solapan: la duración total es la suma
 * de los cortes menos un cross-fade por empalme.
 */
export const reelDurationInFrames = (
  shots: ReelShot[],
  fps: number,
  transitionInFrames = DEFAULT_TRANSITION_FRAMES,
): number => {
  if (!shots.length) return fps;
  const total = shots.reduce((sum, shot) => sum + shotFrames(shot, fps), 0);
  return Math.max(total - transitionInFrames * (shots.length - 1), 1);
};

/** Frame en el que arranca cada cross-fade (para sincronizar los whooshes). */
export const transitionStarts = (
  shots: ReelShot[],
  fps: number,
  transitionInFrames = DEFAULT_TRANSITION_FRAMES,
): number[] => {
  const starts: number[] = [];
  let cursor = 0;
  shots.forEach((shot, index) => {
    const frames = shotFrames(shot, fps);
    if (index < shots.length - 1) {
      starts.push(cursor + frames - transitionInFrames);
    }
    cursor += frames - transitionInFrames;
  });
  return starts;
};

/** Agrupa palabras en bloques cortos, estilo Reels (2-4 palabras por pantalla). */
export const groupWords = (
  words: ReelWord[],
  maxWords = 3,
  maxSeconds = 1.6,
): ReelWord[][] => {
  const groups: ReelWord[][] = [];
  let current: ReelWord[] = [];

  for (const word of words) {
    const wouldBeTooLong =
      current.length >= maxWords ||
      (current.length > 0 && word.end - current[0].start > maxSeconds) ||
      (current.length > 0 && word.start - current[current.length - 1].end > 0.5);

    if (wouldBeTooLong) {
      groups.push(current);
      current = [];
    }
    current.push(word);
  }
  if (current.length) groups.push(current);
  return groups;
};
