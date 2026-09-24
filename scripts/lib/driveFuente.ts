/**
 * Acceso a la carpeta de Drive del pipeline, con o sin credenciales.
 *
 * La carpeta raíz de Next Layer está compartida "cualquiera con el link", así
 * que se puede listar y bajar SIN `.env`. Eso importa porque los contenedores
 * en la nube se reciclan y el `.env` no sobrevive: durante semanas el pipeline
 * no pudo bajar nada por buscar credenciales que no hacían falta.
 *
 *   - Público: lista con `drive.google.com/embeddedfolderview` y baja con
 *     `drive.usercontent.google.com/download?...&confirm=t` (el `confirm=t`
 *     salta el aviso de "no se pudo escanear por virus" de archivos grandes).
 *     El tamaño sale del `Content-Range` de un pedido de 1 byte.
 *   - Autenticado: si hay credenciales en el entorno, googleapis. Se usa solo
 *     si la carpeta deja de ser pública.
 *
 * Las dos devuelven lo mismo, así que el resto del pipeline no sabe cuál corrió.
 */
import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {FOLDER_MIME, getDriveClient} from './drive';

export type Entrada = {id: string; name: string; isFolder: boolean; size?: number};

export type Fuente = {
  tipo: 'publica' | 'autenticada';
  listar: (folderId: string) => Promise<Entrada[]>;
  tamano: (fileId: string) => Promise<number>;
  bajar: (fileId: string, destino: string, esperado: number) => Promise<'bajado' | 'cache'>;
};

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reintenta con espera exponencial: Drive corta descargas largas sin aviso. */
const conReintentos = async <T>(que: string, fn: () => Promise<T>, intentos = 4): Promise<T> => {
  let ultimo: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (error) {
      ultimo = error;
      if (i < intentos - 1) {
        const ms = 2000 * 2 ** i;
        console.warn(`   ↻ ${que}: ${(error as Error).message} — reintento en ${ms / 1000}s`);
        await esperar(ms);
      }
    }
  }
  throw ultimo;
};

// --- Pública ---------------------------------------------------------------

const decodificar = (t: string) =>
  t
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const listarPublica = async (folderId: string): Promise<Entrada[]> => {
  const html = await conReintentos(`listar ${folderId}`, async () => {
    const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  });
  // Si la carpeta no es pública, Drive devuelve la página de login con 200.
  if (!html.includes('flip-entry')) {
    if (/ServiceLogin|accounts\.google\.com/.test(html) && !html.includes('flip-list')) {
      throw new Error(`La carpeta ${folderId} no es pública (Drive pide login).`);
    }
    return [];
  }
  const entradas: Entrada[] = [];
  const patron = /<a href="(https:\/\/drive\.google\.com\/[^"]+)"[^>]*>[\s\S]*?flip-entry-title">([^<]+)<\/div>/g;
  for (const m of html.matchAll(patron)) {
    const url = m[1];
    const id = /(?:folders\/|\/d\/|id=)([A-Za-z0-9_-]{20,})/.exec(url)?.[1];
    if (!id) continue;
    entradas.push({id, name: decodificar(m[2]).trim(), isFolder: url.includes('/folders/')});
  }
  return entradas;
};

const urlDescarga = (fileId: string) =>
  `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

const tamanoPublico = async (fileId: string): Promise<number> =>
  conReintentos(`tamaño ${fileId}`, async () => {
    const r = await fetch(urlDescarga(fileId), {headers: {Range: 'bytes=0-0'}});
    await r.body?.cancel();
    const total = /\/(\d+)$/.exec(r.headers.get('content-range') ?? '')?.[1];
    if (!total) throw new Error(`Drive no informó el tamaño (HTTP ${r.status})`);
    return Number(total);
  });

/**
 * Baja a `<destino>.part` y recién al final renombra, así un archivo a medias
 * nunca se confunde con uno completo. Si ya hay un `.part`, sigue desde ahí.
 */
const bajarPublica = async (fileId: string, destino: string, esperado: number) => {
  if (fs.existsSync(destino) && fs.statSync(destino).size === esperado) return 'cache' as const;
  fs.mkdirSync(path.dirname(destino), {recursive: true});
  const parcial = `${destino}.part`;

  await conReintentos(`bajar ${path.basename(destino)}`, async () => {
    const desde = fs.existsSync(parcial) ? fs.statSync(parcial).size : 0;
    if (desde >= esperado) return;
    const r = await fetch(urlDescarga(fileId), {headers: {Range: `bytes=${desde}-`}});
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
    // Si el servidor ignoró el Range, hay que empezar de cero.
    const agrega = r.status === 206 && desde > 0;
    await pipeline(
      Readable.fromWeb(r.body as never),
      fs.createWriteStream(parcial, {flags: agrega ? 'a' : 'w'}),
    );
    const obtenido = fs.statSync(parcial).size;
    if (obtenido !== esperado) throw new Error(`quedó en ${obtenido} de ${esperado} bytes`);
  });

  fs.renameSync(parcial, destino);
  return 'bajado' as const;
};

export const fuentePublica: Fuente = {
  tipo: 'publica',
  listar: listarPublica,
  tamano: tamanoPublico,
  bajar: bajarPublica,
};

// --- Autenticada ------------------------------------------------------------

const hayCredenciales = () =>
  Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_REFRESH_TOKEN) ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );

const fuenteAutenticada = async (): Promise<Fuente> => {
  const drive = await getDriveClient();
  return {
    tipo: 'autenticada',
    listar: async (folderId) => {
      const salida: Entrada[] = [];
      let pageToken: string | undefined;
      do {
        const r = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id,name,mimeType,size)',
          pageSize: 1000,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        for (const f of r.data.files ?? []) {
          salida.push({
            id: f.id as string,
            name: f.name as string,
            isFolder: f.mimeType === FOLDER_MIME,
            size: f.size ? Number(f.size) : undefined,
          });
        }
        pageToken = r.data.nextPageToken ?? undefined;
      } while (pageToken);
      return salida;
    },
    tamano: async (fileId) => {
      const r = await drive.files.get({fileId, fields: 'size', supportsAllDrives: true});
      return Number(r.data.size ?? 0);
    },
    bajar: async (fileId, destino, esperado) => {
      if (fs.existsSync(destino) && fs.statSync(destino).size === esperado) return 'cache';
      fs.mkdirSync(path.dirname(destino), {recursive: true});
      const parcial = `${destino}.part`;
      await conReintentos(`bajar ${path.basename(destino)}`, async () => {
        const r = await drive.files.get(
          {fileId, alt: 'media', supportsAllDrives: true},
          {responseType: 'stream'},
        );
        await pipeline(r.data as NodeJS.ReadableStream, fs.createWriteStream(parcial));
        const obtenido = fs.statSync(parcial).size;
        if (obtenido !== esperado) throw new Error(`quedó en ${obtenido} de ${esperado} bytes`);
      });
      fs.renameSync(parcial, destino);
      return 'bajado';
    },
  };
};

/**
 * Pública primero, siempre: es la que no depende de nada que se pierda con el
 * contenedor. La autenticada solo entra si la pública no puede leer la carpeta.
 */
export const abrirFuente = async (rootId: string): Promise<Fuente> => {
  try {
    const raiz = await listarPublica(rootId);
    if (raiz.length) return fuentePublica;
  } catch (error) {
    if (!hayCredenciales()) throw error;
  }
  if (hayCredenciales()) return fuenteAutenticada();
  throw new Error(
    `No pude leer la carpeta ${rootId}: no es pública y no hay credenciales.\n` +
      '   Compártela como "cualquiera con el link puede ver", o define credenciales (ver .env.example).',
  );
};
