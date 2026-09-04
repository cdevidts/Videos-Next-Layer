/**
 * Un subtítulo se define en segundos respecto al inicio del clip, para que
 * pueda venir de un JSON externo (Whisper, manifest de Drive, etc.) sin tener
 * que conocer los fps de la composición.
 */
export type SubtitleCue = {
  text: string;
  fromSeconds: number;
  toSeconds: number;
};

export type VerticalClipProps = {
  /** Ruta del video fuente: relativa a public/ (ej. "input/video-41/clip.mp4") o URL absoluta. */
  src: string;
  /** Texto de gancho / título superior. */
  hook: string;
  /** Subtítulos opcionales. */
  subtitles?: SubtitleCue[];
  /** Pista de audio opcional (música o voz en off), relativa a public/ o URL. */
  audioSrc?: string;
  /** Volumen del audio del video fuente (0 = mudo). */
  videoVolume?: number;
  /** Volumen de la pista de audio externa. */
  audioVolume?: number;
  /**
   * Duración real del clip en segundos. Cuando processClip.ts la calcula con
   * ffprobe, la composición ajusta su duración automáticamente.
   */
  durationInSeconds?: number;
  /** Segundo del video fuente donde empieza el recorte. */
  startFromSeconds?: number;
  /** Color de acento para la barra de progreso y el gancho. */
  accentColor?: string;
};
