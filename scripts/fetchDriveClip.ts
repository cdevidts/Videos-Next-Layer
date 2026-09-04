/**
 * Descarga los assets de un proyecto de Google Drive a public/input/.
 *
 * Uso:
 *   npm run fetch-drive -- --list
 *   npm run fetch-drive -- --project "Video 41"
 *   npm run fetch-drive -- --folder <URL o ID> --project <ID> --kinds video,audio
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  downloadFile,
  formatBytes,
  getFolder,
  listChildren,
  parseDriveId,
  slugify,
  walkFolder,
  FOLDER_MIME,
  getDriveClient,
  type AssetKind,
  type DriveFile,
} from './lib/drive';
import {LATEST_MANIFEST, type ClipManifest} from './lib/manifest';

export type FetchOptions = {
  rootFolderId: string;
  project?: string;
  kinds: AssetKind[];
  outDir: string;
  maxSizeMb: number;
  clipHint?: string;
  list: boolean;
  dryRun: boolean;
};

const parseArgs = (argv: string[]): FetchOptions => {
  const get = (name: string): string | undefined => {
    const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
    if (withEquals) return withEquals.split('=').slice(1).join('=');
    const index = argv.indexOf(`--${name}`);
    if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      return argv[index + 1];
    }
    return undefined;
  };
  const has = (name: string) => argv.includes(`--${name}`);

  const rootRaw = get('folder') ?? process.env.DRIVE_FOLDER_ID;
  if (!rootRaw) {
    throw new Error('Falta DRIVE_FOLDER_ID en .env (o pasa --folder <URL o ID>).');
  }

  const kinds = (get('kinds') ?? process.env.DRIVE_ASSET_KINDS ?? 'video,audio,image')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean) as AssetKind[];

  return {
    rootFolderId: parseDriveId(rootRaw),
    project: get('project') ?? process.env.DRIVE_PROJECT_FOLDER,
    kinds,
    outDir: get('out') ?? process.env.INPUT_DIR ?? 'public/input',
    maxSizeMb: Number(get('max-size') ?? process.env.MAX_FILE_SIZE_MB ?? 4096),
    clipHint: get('clip') ?? process.env.DRIVE_MAIN_CLIP,
    list: has('list') || has('l'),
    dryRun: has('dry-run'),
  };
};

/** Elige el clip principal: coincidencia con --clip, si no el video más pesado. */
const pickMainClip = (videos: DriveFile[], hint?: string): DriveFile | null => {
  if (!videos.length) return null;
  if (hint) {
    const needle = hint.toLowerCase();
    const match = videos.find(
      (v) => v.name.toLowerCase().includes(needle) || v.id === hint,
    );
    if (match) return match;
    console.warn(`⚠️  Ningún video coincide con "${hint}"; se usa el más pesado.`);
  }
  return [...videos].sort((a, b) => b.size - a.size)[0];
};

export const fetchDriveClip = async (
  options: FetchOptions,
): Promise<ClipManifest | null> => {
  const drive = await getDriveClient();
  const root = await getFolder(drive, options.rootFolderId);
  console.log(`📁 Carpeta raíz: ${root.name ?? options.rootFolderId}`);

  const children = await listChildren(drive, options.rootFolderId);
  const projectFolders = children.filter((c) => c.mimeType === FOLDER_MIME);

  if (options.list) {
    console.log(`\nProyectos disponibles (${projectFolders.length}):`);
    for (const folder of projectFolders) {
      console.log(`  • ${folder.name}  (id: ${folder.id})`);
    }
    return null;
  }

  // Resolver la carpeta del proyecto a descargar.
  let projectId = options.rootFolderId;
  let projectName = root.name ?? 'proyecto';

  if (projectFolders.length > 0) {
    const wanted = options.project?.trim();
    const match = wanted
      ? projectFolders.find(
          (f) =>
            f.id === parseDriveId(wanted) ||
            f.name?.toLowerCase() === wanted.toLowerCase() ||
            f.name?.toLowerCase().includes(wanted.toLowerCase()),
        )
      : projectFolders.length === 1
        ? projectFolders[0]
        : undefined;

    if (!match) {
      const names = projectFolders.map((f) => `  • ${f.name} (id: ${f.id})`).join('\n');
      throw new Error(
        (wanted
          ? `No encontré el proyecto "${wanted}" dentro de la carpeta raíz.`
          : 'La carpeta raíz tiene varios proyectos; indica cuál usar con --project o DRIVE_PROJECT_FOLDER.') +
          `\nOpciones:\n${names}`,
      );
    }
    projectId = match.id as string;
    projectName = match.name as string;
  }

  const slug = slugify(projectName);
  console.log(`🎬 Proyecto: ${projectName} (id: ${projectId})`);

  const all = await walkFolder(drive, projectId);
  const wantedKinds = new Set(options.kinds);
  const skipped: string[] = [];

  const selected = all.filter((file) => {
    if (!wantedKinds.has(file.kind)) {
      skipped.push(`${file.relativePath} (tipo ${file.kind})`);
      return false;
    }
    if (file.size > options.maxSizeMb * 1024 * 1024) {
      skipped.push(`${file.relativePath} (${formatBytes(file.size)} > límite)`);
      return false;
    }
    return true;
  });

  if (!selected.length) {
    throw new Error(
      `La carpeta "${projectName}" no tiene archivos de tipo ${options.kinds.join(', ')}.`,
    );
  }

  const totalBytes = selected.reduce((sum, f) => sum + f.size, 0);
  console.log(`⬇️  ${selected.length} archivos (${formatBytes(totalBytes)})`);

  const projectDir = path.join(options.outDir, slug);
  const publicRelative = (absolute: string) =>
    path.relative('public', absolute).split(path.sep).join('/');

  const assets: ClipManifest['assets'] = {video: [], audio: [], image: [], other: []};

  for (const file of selected) {
    const destination = path.join(projectDir, file.relativePath);
    if (options.dryRun) {
      console.log(`   [dry-run] ${file.relativePath} (${formatBytes(file.size)})`);
    } else {
      const result = await downloadFile(drive, file, destination);
      console.log(
        `   ${result === 'cached' ? '✓ cache' : '✓ ok   '} ${file.relativePath} (${formatBytes(file.size)})`,
      );
    }
    assets[file.kind].push(publicRelative(destination));
  }

  const videos = selected.filter((f) => f.kind === 'video');
  const mainClipFile = pickMainClip(videos, options.clipHint);
  const mainClip = mainClipFile
    ? publicRelative(path.join(projectDir, mainClipFile.relativePath))
    : null;

  const manifest: ClipManifest = {
    generatedAt: new Date().toISOString(),
    rootFolderId: options.rootFolderId,
    project: {id: projectId, name: projectName, slug},
    inputDir: publicRelative(projectDir),
    mainClip,
    mainAudio: assets.audio[0] ?? null,
    assets,
    skipped,
  };

  if (!options.dryRun) {
    const manifestPath = path.join(projectDir, 'manifest.json');
    fs.mkdirSync(projectDir, {recursive: true});
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.mkdirSync(path.dirname(LATEST_MANIFEST), {recursive: true});
    fs.writeFileSync(LATEST_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`📝 Manifest: ${manifestPath}`);
  }

  console.log(`🎥 Clip principal: ${mainClip ?? '(ninguno)'}`);
  return manifest;
};

const isMain = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isMain) {
  Promise.resolve()
    .then(() => fetchDriveClip(parseArgs(process.argv.slice(2))))
    .catch((error: unknown) => {
      console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
}

export {parseArgs};
