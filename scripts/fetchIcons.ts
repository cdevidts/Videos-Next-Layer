/**
 * Descarga los íconos del reel a public/icons/.
 *
 *   npm run icons
 *   npm run icons -- --add drill,ruler --force
 *
 * Por qué descargados y no dibujados en React: instrucción directa de Veronica.
 * Un ícono hecho a mano con divs y border-radius sale peor que uno de una
 * librería, y sobre todo se come el presupuesto de atención que hace falta para
 * el montaje, que es lo que de verdad decide si el video sirve. La gráfica se
 * baja; el criterio se gasta en el corte.
 *
 * Los SVG de Lucide vienen con `stroke="currentColor"`, así que el color lo pone
 * la composición (`color:` en el contenedor) y un mismo archivo sirve para la
 * paleta que sea. Por eso no se tocan acá.
 *
 * Licencia: Lucide es ISC — uso libre, incluso comercial. Se pueden versionar,
 * pero igual van por `.gitignore` como el resto de assets bajados, para que el
 * repo no cargue binarios que un comando reconstruye.
 * https://lucide.dev/license
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'public/icons';
const BASE = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return undefined;
};

/**
 * Cada ícono está acá porque una palabra concreta del guion lo pide. Un ícono
 * que no corresponde a nada de lo que se dice es ruido visual, igual que un
 * sonido que no corresponde a la imagen.
 */
const ICONS: Array<{name: string; porque: string}> = [
  {name: 'drill', porque: '"solo tengo un taladro"'},
  {name: 'ruler', porque: 'las medidas del cuaderno (74 cm, 42 cm, 35 cm)'},
  {name: 'notebook-pen', porque: '"tuve que anotar todo lo que tenía"'},
  {name: 'box', porque: '"cualquier forma de mueble hechizo"'},
  {name: 'puzzle', porque: '"los conectores que diseñé"'},
  {name: 'layers', porque: 'impresión 3D / capas — es el nombre de la marca'},
  {name: 'banknote', porque: '"¿un mueble por once lucas?"'},
  {name: 'check-check', porque: 'el remate: "IKEA? NADA"'},
];

const main = async () => {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  const extra = (arg('add') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({name, porque: 'pedido por --add'}));
  const todos = [...ICONS, ...extra];
  const force = argv.includes('--force');

  let bajados = 0;
  for (const icono of todos) {
    const target = path.join(OUT_DIR, `${icono.name}.svg`);
    if (!force && fs.existsSync(target) && fs.statSync(target).size > 100) {
      console.log(`♻️  ${icono.name}.svg`);
      continue;
    }
    const response = await fetch(`${BASE}/${icono.name}.svg`);
    if (!response.ok) {
      throw new Error(
        `No existe el ícono "${icono.name}" en Lucide (${response.status}). ` +
          'Busca el nombre exacto en https://lucide.dev/icons.',
      );
    }
    const svg = await response.text();
    // Un 404 del CDN puede volver como HTML con 200 en algunos mirrors. No se
    // puede exigir que empiece en "<svg": Lucide antepone su comentario de
    // licencia. Se pide la etiqueta y que no sea una página.
    if (!/<svg[\s>]/.test(svg) || /<html[\s>]/i.test(svg)) {
      throw new Error(`Lo que volvió para "${icono.name}" no es un SVG.`);
    }
    fs.writeFileSync(target, svg);
    console.log(`🎨 ${icono.name}.svg  ← ${icono.porque}`);
    bajados++;
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'CREDITOS.txt'),
    [
      'Íconos de Lucide (https://lucide.dev) — licencia ISC, uso libre incluso comercial.',
      'Los baja scripts/fetchIcons.ts con `npm run icons`.',
      'Vienen con stroke="currentColor": el color lo pone la composición.',
      '',
      ...todos.map((i) => `${`${i.name}.svg`.padEnd(20)} ${i.porque}`),
    ].join('\n') + '\n',
  );

  console.log(`\n✅ ${todos.length} íconos en ${OUT_DIR}/ (${bajados} nuevos)`);
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
