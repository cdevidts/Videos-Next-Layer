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
    .filter((f) => f.endsWith('.json'))
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

  const globals = [
    ['tipografías', fuentesOk, 'npm run fonts (después: npm run fonts-check)'],
    ['efectos de sonido', fs.existsSync('public/sfx/whoosh-1.mp3'), 'npm run sfx'],
    ['credenciales Drive', fs.existsSync('.env'), 'copiar .env.example a .env (ver README §2)'],
    ['whisper.cpp', fs.existsSync('whisper.cpp'), 'se instala solo en el primer npm run transcribe'],
  ] as const;

  for (const [label, ready, fix] of globals) {
    console.log(`  ${ready ? '✓' : '·'} ${label.padEnd(20)} ${ready ? '' : `→ ${fix}`}`);
  }

  if (!projects.length) {
    console.log('\nNo hay planes en plans/. Copia plans/video-46.json y ajústalo.\n');
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
    console.log(
      `   render     : ${
        state.render
          ? `${state.render}${state.renderIsStale ? '  ⚠️ desactualizado' : '  ✓ al día'}`
          : 'todavía no'
      }`,
    );
    console.log(`   👉 sigue   : ${nextStep(state)}`);
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
