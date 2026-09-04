import fs from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {google, type drive_v3} from 'googleapis';
import {GoogleAuth, OAuth2Client} from 'google-auth-library';

export const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi'];
export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.aiff', '.flac', '.ogg'];
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

export type AssetKind = 'video' | 'audio' | 'image' | 'other';

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime?: string;
  /** Ruta relativa dentro de la carpeta del proyecto, ej. "Videos/DSCF7555.MOV". */
  relativePath: string;
  kind: AssetKind;
};

/**
 * Acepta un ID pelado o cualquier URL de Drive
 * (https://drive.google.com/drive/folders/<id>, .../file/d/<id>/view, ?id=<id>).
 */
export const parseDriveId = (input: string): string => {
  const value = input.trim();
  const patterns = [/\/folders\/([a-zA-Z0-9_-]+)/, /\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return value.replace(/\/+$/, '');
};

const readServiceAccountKey = (raw: string): Record<string, unknown> => {
  const value = raw.trim();
  if (value.startsWith('{')) {
    return JSON.parse(value);
  }
  if (fs.existsSync(value)) {
    return JSON.parse(fs.readFileSync(value, 'utf8'));
  }
  // Última opción: la clave viene en base64 (útil en CI / secrets).
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
  } catch {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_KEY no es un JSON válido, ni una ruta existente, ni base64: ${value.slice(0, 40)}...`,
    );
  }
};

/**
 * Soporta Service Account (recomendado para automatización) u OAuth2 con
 * refresh token (útil cuando la carpeta está compartida con tu cuenta personal
 * y no puedes compartirla con la Service Account).
 */
export const getDriveClient = async (): Promise<drive_v3.Drive> => {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (serviceAccountKey) {
    const credentials = readServiceAccountKey(serviceAccountKey);
    const auth = new GoogleAuth({
      credentials: credentials as never,
      scopes: DRIVE_SCOPES,
      clientOptions: process.env.GOOGLE_IMPERSONATE_USER
        ? {subject: process.env.GOOGLE_IMPERSONATE_USER}
        : undefined,
    });
    return google.drive({version: 'v3', auth: await auth.getClient() as never});
  }

  if (clientId && clientSecret && refreshToken) {
    const oauth = new OAuth2Client({clientId, clientSecret});
    oauth.setCredentials({refresh_token: refreshToken});
    return google.drive({version: 'v3', auth: oauth});
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const auth = new GoogleAuth({scopes: DRIVE_SCOPES});
    return google.drive({version: 'v3', auth: await auth.getClient() as never});
  }

  throw new Error(
    'Faltan credenciales de Google. Define GOOGLE_SERVICE_ACCOUNT_KEY o el trío ' +
      'GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN (ver .env.example).',
  );
};

export const classifyAsset = (name: string, mimeType: string): AssetKind => {
  const ext = path.extname(name).toLowerCase();
  if (mimeType.startsWith('video/') || VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (mimeType.startsWith('audio/') || AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (mimeType.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) return 'image';
  return 'other';
};

export const listChildren = async (
  drive: drive_v3.Drive,
  folderId: string,
): Promise<drive_v3.Schema$File[]> => {
  const files: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        'nextPageToken, files(id, name, mimeType, size, modifiedTime, shortcutDetails(targetId, targetMimeType))',
      pageSize: 1000,
      orderBy: 'name',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken,
    });
    files.push(...(res.data.files ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
};

export const getFolder = async (drive: drive_v3.Drive, folderId: string) => {
  const res = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, mimeType',
    supportsAllDrives: true,
  });
  return res.data;
};

/** Recorre recursivamente una carpeta y devuelve todos los archivos (no carpetas). */
export const walkFolder = async (
  drive: drive_v3.Drive,
  folderId: string,
  prefix = '',
  depth = 0,
): Promise<DriveFile[]> => {
  if (depth > 6) {
    return [];
  }

  const children = await listChildren(drive, folderId);
  const out: DriveFile[] = [];

  for (const child of children) {
    if (!child.id || !child.name) continue;

    if (child.mimeType === FOLDER_MIME) {
      out.push(...(await walkFolder(drive, child.id, path.posix.join(prefix, child.name), depth + 1)));
      continue;
    }

    // Los accesos directos apuntan al archivo real.
    const isShortcut = child.mimeType === SHORTCUT_MIME;
    const targetId = isShortcut ? child.shortcutDetails?.targetId : child.id;
    const targetMime = isShortcut ? child.shortcutDetails?.targetMimeType : child.mimeType;
    if (!targetId || !targetMime) continue;

    if (targetMime === FOLDER_MIME) {
      out.push(...(await walkFolder(drive, targetId, path.posix.join(prefix, child.name), depth + 1)));
      continue;
    }

    // Los archivos nativos de Google (Docs, Sheets...) no se pueden descargar tal cual.
    if (targetMime.startsWith('application/vnd.google-apps')) continue;

    out.push({
      id: targetId,
      name: child.name,
      mimeType: targetMime,
      size: Number(child.size ?? 0),
      modifiedTime: child.modifiedTime ?? undefined,
      relativePath: path.posix.join(prefix, child.name),
      kind: classifyAsset(child.name, targetMime),
    });
  }

  return out;
};

export const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Descarga con streaming; omite el archivo si ya existe con el mismo tamaño. */
export const downloadFile = async (
  drive: drive_v3.Drive,
  file: DriveFile,
  destination: string,
): Promise<'downloaded' | 'cached'> => {
  if (fs.existsSync(destination)) {
    const stat = fs.statSync(destination);
    if (file.size > 0 && stat.size === file.size) {
      return 'cached';
    }
  }

  fs.mkdirSync(path.dirname(destination), {recursive: true});
  const temp = `${destination}.part`;

  const res = await drive.files.get(
    {fileId: file.id, alt: 'media', supportsAllDrives: true},
    {responseType: 'stream'},
  );

  await pipeline(res.data as NodeJS.ReadableStream, fs.createWriteStream(temp));
  fs.renameSync(temp, destination);
  return 'downloaded';
};

export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'proyecto';
