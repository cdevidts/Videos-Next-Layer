/**
 * Descarga las tipografías a public/fonts/ y genera src/fonts.generated.ts.
 *
 * Se hace en build, no en render: el Chrome headless de Remotion no siempre
 * puede salir a fonts.gstatic.com (proxies corporativos, CI sin red), y una
 * fuente que no carga cambia todo el diseño.
 *
 *   npm run fonts
 */
import fs from 'node:fs';
import path from 'node:path';

const FAMILIES = [
  {name: 'Anton', query: 'Anton'},
  {name: 'Inter', query: 'Inter:wght@600;700;800;900'},
];

// Con este User-Agent, Google Fonts responde con woff2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

type FaceMeta = {family: string; weight: string; style: string; file: string};

const main = async () => {
  const outDir = 'public/fonts';
  fs.mkdirSync(outDir, {recursive: true});
  const faces: FaceMeta[] = [];

  for (const family of FAMILIES) {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.query)}&display=swap`;
    const css = await (await fetch(url, {headers: {'User-Agent': UA}})).text();

    // Solo el subset latin: es lo que usamos y pesa mucho menos.
    const blocks = css.split('@font-face').slice(1);
    for (const block of blocks) {
      const subset = /\/\*\s*([a-z-]+)\s*\*\//.exec(block)?.[1];
      const src = /src:\s*url\(([^)]+)\)/.exec(block)?.[1];
      const weight = /font-weight:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? '400';
      const style = /font-style:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? 'normal';
      if (!src) continue;
      const previous = css.slice(0, css.indexOf(block));
      const comment = previous.match(/\/\*\s*([a-z-]+)\s*\*\/\s*$/)?.[1] ?? subset;
      if (comment && comment !== 'latin') continue;

      const file = `${family.name}-${weight.replace(/\s+/g, '')}-${style}.woff2`;
      const target = path.join(outDir, file);
      if (!fs.existsSync(target)) {
        const response = await fetch(src, {headers: {'User-Agent': UA}});
        fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
      }
      const key = `fonts/${file}`;
      if (faces.some((face) => face.file === key)) continue;
      faces.push({family: family.name, weight, style, file: key});
      console.log(`🔤 ${file}`);
    }
  }

  const generated = `// Generado por scripts/fetchFonts.ts — no editar a mano.
export type FontFace = {family: string; weight: string; style: string; file: string};

export const FONT_FACES: FontFace[] = ${JSON.stringify(faces, null, 2)};
`;
  fs.writeFileSync('src/fonts.generated.ts', generated);
  console.log(`\n✅ ${faces.length} variantes en ${outDir} → src/fonts.generated.ts`);
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
