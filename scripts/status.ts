/**
 * Radiografía del proyecto: qué está hecho, qué falta y cuál es el comando que sigue.
 *
 *   npm run status
 *
 * El estado NO se guarda en ningún archivo que haya que mantener al día: se
 * deduce de lo que existe en disco. Así nunca miente, aunque el agente anterior
 * se haya cortado a mitad de camino.
 */
import fs from 'node:fs';
import path from 'node:path';

type PlanClip = {file: string};
type Plan = {project?: string; dir: string; hook?: string; clips?: PlanClip[]};

type ProjectState = {
  project: string;
  planFile: string;
  plan: Plan;
  sources: string[];
  proxies: string[];
  audios: string[];
  transcripts: string[];
  propsFile: string | null;
  render: string | null;
  renderIsStale: boolean;
};

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv'];
const JOURNAL = 'docs/journal.md';

const listFiles = (dir: string, filter: (f: string) => boolean): string[] => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(filter).sort();
};

const mtime = (file: string): number =>
  fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0;

const readProjects = (): ProjectState[] => {
  if (!fs.existsSync('plans')) return [];

  return fs
    .readdirSync('plans')
    // plans/_plantilla.json y cualquier _*.json son notas, no proyectos.
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort()
    .map((planFile) => {
      const full = path.join('plans', planFile);
      const plan = JSON.parse(fs.readFileSync(full, 'utf8')) as Plan;
      const project = plan.project ?? path.basename(planFile, '.json');
      const projectDir = path.dirname(plan.dir);

      const sources = listFiles(plan.dir, (f) =>
        VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase()),
      );
      const proxies = listFiles(path.join(projectDir, '_normalized'), (f) => f.endsWith('.mp4'));
      const audios = listFiles(path.join(projectDir, '_audio'), (f) => f.endsWith('.wav'));
      const transcripts = listFiles(path.join(projectDir, '_audio'), (f) => f.endsWith('.json'));

      const propsFile = path.join('out', `${project}.reel.props.json`);
      const render = path.join('renders', `${project}-reel.mp4`);
      const hasRender = fs.existsSync(render);

      return {
        project,
        planFile: full,
        plan,
        sources,
        proxies,
        audios,
        transcripts,
        propsFile: fs.existsSync(propsFile) ? propsFile : null,
        render: hasRender ? render : null,
        // El render sirve solo si es más nuevo que el plan que lo generó.
        renderIsStale: hasRender && mtime(render) < mtime(full),
      };
    });
};

const nextStep = (state: ProjectState): string => {
  if (!state.sources.length) {
    return `npm run fetch-drive -- --project "${state.project}"   (no hay clips en ${state.plan.dir})`;
  }
  if (!state.audios.length) {
    return `npm run audio -- --dir ${path.dirname(state.plan.dir)}`;
  }
  if (!state.transcripts.length) {
    return `npm run transcribe -- --dir ${path.dirname(state.plan.dir)}/_audio --model medium --language es`;
  }
  if (!state.render) {
    return `npm run reel -- --plan ${state.planFile}`;
  }
  if (state.renderIsStale) {
    return `npm run reel -- --plan ${state.planFile}   (el plan cambió después del último render)`;
  }
  return 'nada pendiente — el render está al día con su plan';
};

const main = () => {
  const projects = readProjects();
  const entregados = new Set<string>(
    fs.existsSync('videos.json')
      ? Object.values(
          (JSON.parse(fs.readFileSync('videos.json', 'utf8')) as {videos: Record<string, {slug: string; estado: string}>}).videos,
        )
          .filter((v) => v.estado === 'entregado')
          .map((v) => v.slug)
      : [],
  );

  console.log('\n════ ESTADO DEL PIPELINE ════\n');

  // Que exista fonts.generated.ts no basta: ya pasó que apuntara a archivos
  // .woff2 sin las letras del alfabeto y todo el reel saliera con la fuente de
  // respaldo, sin un solo error. Acá se comprueba que los archivos existan;
  // que además se apliquen lo dice `npm run fonts-check`.
  const fuentesOk = (() => {
    if (!fs.existsSync('src/fonts.generated.ts')) return false;
    const generado = fs.readFileSync('src/fonts.generated.ts', 'utf8');
    const archivos = [...generado.matchAll(/"file":\s*"([^"]+)"/g)].map((m) => m[1]);
    return archivos.length > 0 && archivos.every((f) => fs.existsSync(path.join('public', f)));
  })();

  // Los MP3 del catálogo no van a git: en un contenedor nuevo el catálogo está
  // (con sus mediciones) pero los archivos no, y hay que rebajarlos.
  const catalogoListo = (() => {
    const f = 'public/assets/sfx/catalog.json';
    if (!fs.existsSync(f)) return false;
    const c = JSON.parse(fs.readFileSync(f, 'utf8')) as Array<{archivo: string; apto?: boolean}>;
    const aptos = c.filter((e) => e.apto);
    return aptos.length > 0 && aptos.every((e) => fs.existsSync(path.join('public', e.archivo)));
  })();

  const globals = [
    ['tipografías', fuentesOk, 'npm run fonts (después: npm run fonts-check)'],
    ['efectos de sonido', catalogoListo, 'npm run sfx-catalog (rebaja lo que falte, ya medido)'],
    ['efectos legados', fs.existsSync('public/sfx/whoosh-1.mp3'), 'npm run sfx (solo para planes anteriores)'],
    ['whisper.cpp', fs.existsSync('whisper.cpp'), 'se instala solo en el primer npm run transcribe'],
  ] as const;

  for (const [label, ready, fix] of globals) {
    console.log(`  ${ready ? '✓' : '·'} ${label.padEnd(20)} ${ready ? '' : `→ ${fix}`}`);
  }

  // Los videos de Drive y en qué estado están. Drive es público: no hacen falta
  // credenciales para bajar (sí para subir).
  if (fs.existsSync('videos.json')) {
    const registro = JSON.parse(fs.readFileSync('videos.json', 'utf8')) as {
      videos: Record<string, {slug: string; estado: string; nota?: string; clipsEnDrive?: number}>;
    };
    console.log('\n════ VIDEOS (videos.json) ════\n');
    const orden = Object.entries(registro.videos).sort(
      ([a], [b]) => Number(/\d+/.exec(a)?.[0] ?? 0) - Number(/\d+/.exec(b)?.[0] ?? 0),
    );
    for (const [nombre, v] of orden) {
      const m = path.join('public', 'input', v.slug, 'MANIFEST.json');
      const bajado = fs.existsSync(m) ? ' · bajado' : '';
      console.log(`  ${nombre.padEnd(10)} ${v.estado.padEnd(10)} ${v.clipsEnDrive ?? '?'} clips${bajado}${v.nota ? `\n             ↳ ${v.nota}` : ''}`);
    }
    const siguiente = orden.find(([, v]) => v.estado === 'en-curso') ?? orden.find(([, v]) => v.estado !== 'entregado');
    console.log(siguiente ? `\n  👉 npm run next   (${siguiente[0]})` : '\n  ✅ Todo entregado.');
  }

  if (!projects.length) {
    console.log('\nNo hay planes en plans/. Parte de plans/_plantilla.json.\n');
    return;
  }

  for (const state of projects) {
    const planned = state.plan.clips?.length ?? 0;
    console.log(`\n── ${state.project} ── ${state.planFile}`);
    console.log(`   gancho     : ${state.plan.hook ?? '(sin gancho)'}`);
    console.log(
      `   clips      : ${state.sources.length} en disco` +
        (planned ? ` · ${planned} en el plan` : ''),
    );
    console.log(
      `   proxies    : ${state.proxies.length}   audio: ${state.audios.length}   transcripciones: ${state.transcripts.length}`,
    );
    // Un video entregado no tiene "siguiente paso", aunque las fechas digan que
    // el plan es más nuevo que el render: basta un `git checkout` para que lo
    // parezca. Sugerir `npm run reel` ahí es invitar a pisar lo que ya se subió.
    const entregado = entregados.has(state.project);
    console.log(
      `   render     : ${
        state.render
          ? `${state.render}${entregado ? '  ✓ entregado' : state.renderIsStale ? '  ⚠️ desactualizado' : '  ✓ al día'}`
          : 'todavía no'
      }`,
    );
    console.log(`   👉 sigue   : ${entregado ? 'nada — entregado; no se re-renderiza (videos.json)' : nextStep(state)}`);
  }

  if (fs.existsSync(JOURNAL)) {
    const entries = fs
      .readFileSync(JOURNAL, 'utf8')
      .split(/^## /m)
      .slice(1)
      .slice(-3)
      .map((entry) => `## ${entry.trim()}`);
    if (entries.length) {
      console.log(`\n════ ÚLTIMAS DECISIONES (${JOURNAL}) ════\n`);
      for (const entry of entries) {
        console.log(
          entry
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n'),
        );
        console.log('');
      }
    }
  }

  console.log('Contexto completo para retomar: CLAUDE.md\n');
};

main();
