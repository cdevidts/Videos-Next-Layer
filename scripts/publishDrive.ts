/**
 * Sube un render terminado a Google Drive.
 *
 *   npm run publish-drive -- --render renders/video-46-reel.mp4
 *   npm run publish-drive -- --render <mp4> --folder <URL o ID> --name "Video 46 final.mp4"
 *
 * Por qué existe: el render se pierde con el contenedor, y hasta ahora la única
 * forma de dejarlo en Drive era bajarlo de git y subirlo a mano. El conector de
 * Drive del agente no sirve para esto: sube el archivo como base64 dentro de la
 * llamada, así que 43 MB se vuelven ~58 MB de texto.
 *
 * Sube con `drive.file`, el scope mínimo, y en streaming: googleapis hace upload
 * resumable solo cuando el cuerpo es un stream, que es lo que aguanta un video.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {
  getDriveClient,
  parseDriveId,
  formatBytes,
  FOLDER_MIME,
  DRIVE_WRITE_SCOPES,
} from './lib/drive';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};
const has = (name: string) => argv.includes(`--${name}`);

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
};

export const publishDrive = async () => {
  const render = arg('render');
  if (!render) throw new Error('Falta --render <archivo.mp4>');
  if (!fs.existsSync(render)) throw new Error(`No existe el render: ${render}`);

  const folderRaw = arg('folder') ?? process.env.DRIVE_PUBLISH_FOLDER_ID ?? process.env.DRIVE_FOLDER_ID;
  if (!folderRaw) {
    throw new Error(
      'Falta la carpeta de destino: pasa --folder <URL o ID> o define ' +
        'DRIVE_PUBLISH_FOLDER_ID en .env (ver .env.example).',
    );
  }
  const folderId = parseDriveId(folderRaw);

  const stats = fs.statSync(render);
  const name = arg('name') ?? path.basename(render);
  const ext = path.extname(render).toLowerCase();
  const mimeType = MIME[ext] ?? 'application/octet-stream';

  const drive = await getDriveClient(DRIVE_WRITE_SCOPES);

  // Que la carpeta exista y sea carpeta se verifica antes de empezar a subir:
  // descubrirlo después de mandar 43 MB sería tonto.
  const folder = await drive.files.get({
    fileId: folderId,
    fields: 'id,name,mimeType',
    supportsAllDrives: true,
  });
  if (folder.data.mimeType !== FOLDER_MIME) {
    throw new Error(`El destino ${folderId} no es una carpeta (${folder.data.mimeType}).`);
  }

  // Si ya hay un archivo con ese nombre se sube una versión nueva en vez de
  // dejar dos archivos iguales — el link que alguien ya compartió sigue sirviendo.
  const escapado = name.replace(/'/g, "\\'");
  const previos = await drive.files.list({
    q: `name = '${escapado}' and '${folderId}' in parents and trashed = false`,
    fields: 'files(id,name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const existente = previos.data.files?.[0];

  console.log(
    `⬆️  Subiendo ${name} (${formatBytes(stats.size)}) a "${folder.data.name}"` +
      (existente ? ' — reemplaza la versión anterior' : ''),
  );
  if (has('dry-run')) {
    console.log('   (--dry-run: no se subió nada)');
    return;
  }

  const media = {mimeType, body: fs.createReadStream(render)};
  const campos = 'id,name,size,webViewLink';
  const subido = existente
    ? await drive.files.update({fileId: existente.id as string, media, fields: campos, supportsAllDrives: true})
    : await drive.files.create({
        requestBody: {name, parents: [folderId]},
        media,
        fields: campos,
        supportsAllDrives: true,
      });

  console.log(`✅ ${subido.data.name} → ${subido.data.webViewLink}`);
};

const isMain = process.argv[1] ? path.basename(process.argv[1]).startsWith('publishDrive') : false;

if (isMain) {
  publishDrive().catch((error: unknown) => {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ ${mensaje}`);
    if (/insufficient|403|permission/i.test(mensaje)) {
      console.error(
        '   Las credenciales no tienen permiso de escritura sobre esa carpeta.\n' +
          '   Con Service Account: compártele la carpeta a su email con rol Editor.\n' +
          '   Si igual falla, el scope `drive.file` no alcanza porque la carpeta no la creó\n' +
          '   esta app: hay que pedir `https://www.googleapis.com/auth/drive`.',
      );
    }
    process.exit(1);
  });
}
