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
};

export type ReelSfx = {
  /** Varios whooshes distintos: se rotan por corte. Usar siempre el mismo
   * sonido en cada transición es lo que hace que el video suene a máquina. */
  whooshes?: string[];
  pop?: string;
  riser?: string;
  impact?: string;
};

export type VerticalReelProps = {
  shots: ReelShot[];
  /** Gancho de apertura. Usa *asteriscos* para resaltar palabras. */
  hook: string;
  cta?: string;
  ctaSub?: string;
  accentColor?: string;
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
