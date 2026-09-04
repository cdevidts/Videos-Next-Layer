export type ClipManifest = {
  generatedAt: string;
  rootFolderId: string;
  project: {
    id: string;
    name: string;
    slug: string;
  };
  /** Carpeta local relativa a public/, ej. "input/video-41". */
  inputDir: string;
  /** Clip principal, relativo a public/. Null si la carpeta no traía video. */
  mainClip: string | null;
  /** Pista de audio sugerida (primer archivo de Sonido), relativo a public/. */
  mainAudio: string | null;
  assets: {
    video: string[];
    audio: string[];
    image: string[];
    other: string[];
  };
  skipped: string[];
};

export const LATEST_MANIFEST = 'public/input/latest.json';
