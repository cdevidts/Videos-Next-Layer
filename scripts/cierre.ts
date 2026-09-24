/**
 * Renderiza el cierre de HyperFrames para UN video, con sus textos.
 *
 *   npm run cierre -- --plan plans/video-41.json
 *
 * Antes el cierre tenía los textos del Video 46 escritos a mano en el HTML
 * ("$11.000", "SIN SER CARPINTERO"): el próximo video habría salido con el
 * precio de otro mueble. Ahora `brand/cierre/index.html` declara variables y
 * cada plan trae las suyas en `cierre`:
 *
 *   "cierre": {"precio": "$11.000", "bajadaPrecio": "TABLAS + CONECTORES",
 *              "tagIzq": "SIN SER CARPINTERO", "tagDer": "UN TALADRO Y LISTO"}
 *
 * Lo que se omita o venga vacío no aparece. Como todo texto en pantalla, tiene
 * que corresponder a lo que se dice y se ve en el video: no se inventa.
 *
 * Sale a public/cierres/<proyecto>.webm (VP9 con alfa). `npm run reel` lo
 * llama solo si falta o quedó viejo, así que normalmente no hace falta correrlo.
 */
import fs from 'node:fs';
import path from 'node:path';
import {run} from './lib/media';

// npm corre los scripts desde la raíz del repo.
const RAIZ = process.cwd();
const HTML = path.join(RAIZ, 'brand', 'cierre', 'index.html');

type Plan = {
  project?: string;
  dir: string;
  accentColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  cierre?: {precio?: string; bajadaPrecio?: string; tagIzq?: string; tagDer?: string; marca?: string; bajadaMarca?: string};
};

export const archivoCierre = (proyecto: string) => `cierres/${proyecto}.webm`;

/** Renderiza si falta o si el HTML o el plan son más nuevos. Devuelve la ruta relativa a public/. */
export const asegurarCierre = (planPath: string, forzar = false): string | undefined => {
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as Plan;
  if (!plan.cierre) return undefined;
  const proyecto = plan.project ?? path.basename(path.dirname(plan.dir));
  const relativo = archivoCierre(proyecto);
  const salida = path.join(RAIZ, 'public', relativo);

  const alDia =
    fs.existsSync(salida) &&
    fs.statSync(salida).mtimeMs >= fs.statSync(HTML).mtimeMs &&
    fs.statSync(salida).mtimeMs >= fs.statSync(planPath).mtimeMs;
  if (alDia && !forzar) return relativo;

  const vars = {
    // Vacío explícito para lo que el plan no trae: si no, entra el default
    // del HTML, que es el texto del Video 46.
    precio: plan.cierre.precio ?? '',
    bajadaPrecio: plan.cierre.bajadaPrecio ?? '',
    tagIzq: plan.cierre.tagIzq ?? '',
    tagDer: plan.cierre.tagDer ?? '',
    marca: plan.cierre.marca ?? 'Next Layer',
    bajadaMarca: plan.cierre.bajadaMarca ?? 'IMPRESIÓN 3D',
    primario: plan.primaryColor ?? '#0047AB',
    secundario: plan.secondaryColor ?? '#00D4FF',
    acento: plan.accentColor ?? '#FF6600',
  };
  const varsFile = path.join(RAIZ, 'out', `cierre-${proyecto}.vars.json`);
  fs.mkdirSync(path.dirname(varsFile), {recursive: true});
  fs.writeFileSync(varsFile, `${JSON.stringify(vars, null, 2)}\n`);
  fs.mkdirSync(path.dirname(salida), {recursive: true});

  console.log(`🎬 Cierre de ${proyecto} (HyperFrames): ${[vars.tagIzq, vars.precio, vars.tagDer].filter(Boolean).join(' · ') || 'solo marca'}`);
  run('npm', ['--prefix', path.join(RAIZ, 'brand', 'cierre'), 'run', 'check']);
  run('npm', [
    '--prefix', path.join(RAIZ, 'brand', 'cierre'), 'run', 'render', '--',
    '--variables-file', varsFile, '--strict-variables',
    '--format', 'webm', '-q', 'high', '-o', salida,
  ]);
  return relativo;
};

const isMain = process.argv[1] ? path.basename(process.argv[1]).startsWith('cierre') : false;
if (isMain) {
  try {
    const argv = process.argv.slice(2);
    const i = argv.indexOf('--plan');
    const plan = i !== -1 ? argv[i + 1] : undefined;
    if (!plan) throw new Error('Falta --plan <plan>. El cierre sale de los textos del plan (campo "cierre").');
    const r = asegurarCierre(plan, argv.includes('--force'));
    console.log(r ? `✅ public/${r}` : 'ℹ️  El plan no tiene "cierre": el reel usa el cierre de texto.');
  } catch (error: unknown) {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
