/**
 * Descarga las tipografías a public/fonts/ y genera src/fonts.generated.ts.
 *
 * Se hace en build, no en render: el Chrome headless de Remotion no siempre
 * puede salir a fonts.gstatic.com (proxies corporativos, CI sin red), y una
 * fuente que no carga cambia todo el diseño.
 *
 *   npm run fonts
 *   npm run fonts -- --force   # vuelve a bajar aunque el archivo ya exista
 *
 * ## El error que hay que no repetir
 *
 * La versión anterior emparejaba mal el comentario `/* latin *\/` con su bloque
 * `@font-face` (el comentario va ANTES del bloque, y el código lo buscaba
 * dentro) y terminó guardando el subconjunto **latin-ext** de Anton, que cubre
 * U+0100-02BA: acentos y letras raras, ni una sola A-Z. El resultado es
 * traicionero, porque la fuente carga perfecto — `document.fonts.check()`
 * devuelve `true` y el estado queda en `loaded` — pero como no tiene las
 * letras, Chrome cae a la fuente de respaldo carácter por carácter. Se
 * entregaron varios renders así, con toda la gráfica en la tipografía
 * equivocada, sin un solo error en ninguna parte.
 *
 * Por eso acá no se confía en el comentario del subconjunto: se elige el bloque
 * por su `unicode-range`, quedándose con el que cubre el latín básico (U+0041,
 * la "A"). Y al final se verifica que cada familia haya quedado con al menos
 * una variante; si no, el comando falla en vez de dejar el proyecto con
 * tipografías mudas.
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

/**
 * ¿Este `unicode-range` cubre el latín básico? Es la pregunta que importa: un
 * subconjunto que no cubre la "A" no sirve para nada de lo que escribimos.
 */
const cubreLatinBasico = (range: string | undefined): boolean => {
  if (!range) return true; // sin unicode-range, la fuente cubre todo
  for (const tramo of range.split(',')) {
    const m = /U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?/.exec(tramo.trim());
    if (!m) continue;
    const desde = parseInt(m[1], 16);
    const hasta = m[2] ? parseInt(m[2], 16) : desde;
    if (desde <= 0x41 && 0x41 <= hasta) return true;
  }
  return false;
};

/** Bloques `/* subset *\/ @font-face { ... }` del CSS de Google Fonts. */
const parseBlocks = (css: string) =>
  [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => {
    const cuerpo = match[1];
    const anterior = css.slice(0, match.index ?? 0);
    return {
      subset: /\/\*\s*([\w-]+)\s*\*\/\s*$/.exec(anterior.trimEnd())?.[1],
      src: /src:\s*url\(([^)]+)\)/.exec(cuerpo)?.[1],
      weight: /font-weight:\s*([^;]+);/.exec(cuerpo)?.[1]?.trim() ?? '400',
      style: /font-style:\s*([^;]+);/.exec(cuerpo)?.[1]?.trim() ?? 'normal',
      unicodeRange: /unicode-range:\s*([^;]+);/.exec(cuerpo)?.[1]?.trim(),
    };
  });

const main = async () => {
  const force = process.argv.slice(2).includes('--force');
  const outDir = 'public/fonts';
  fs.mkdirSync(outDir, {recursive: true});
  const faces: FaceMeta[] = [];
  const porUrl = new Map<string, string>();

  for (const family of FAMILIES) {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.query)}&display=swap`;
    const css = await (await fetch(url, {headers: {'User-Agent': UA}})).text();

    const utiles = parseBlocks(css).filter(
      (block) => block.src && cubreLatinBasico(block.unicodeRange),
    );
    if (!utiles.length) {
      throw new Error(
        `${family.name}: ningún @font-face cubre el latín básico. Subconjuntos vistos: ${[
          ...new Set(parseBlocks(css).map((b) => b.subset ?? '?')),
        ].join(', ')}`,
      );
    }

    // Google sirve una sola woff2 variable para varios pesos. Si varios bloques
    // apuntan a la misma URL es el mismo archivo: se baja una vez y el nombre
    // dice "var" en vez de mentir con un peso.
    const pesosPorUrl = new Map<string, number>();
    for (const block of utiles) {
      pesosPorUrl.set(block.src as string, (pesosPorUrl.get(block.src as string) ?? 0) + 1);
    }

    for (const block of utiles) {
      const src = block.src as string;
      const compartido = (pesosPorUrl.get(src) ?? 1) > 1;
      const etiqueta = compartido ? 'var' : block.weight.replace(/\s+/g, '');
      const file = `${family.name}-${etiqueta}-${block.style}.woff2`;
      const key = `fonts/${file}`;

      if (porUrl.has(src)) {
        faces.push({family: family.name, weight: block.weight, style: block.style, file: key});
        continue;
      }

      const target = path.join(outDir, file);
      if (force || !fs.existsSync(target)) {
        const response = await fetch(src, {headers: {'User-Agent': UA}});
        if (!response.ok) throw new Error(`${file}: HTTP ${response.status} al bajar ${src}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.subarray(0, 4).toString('ascii') !== 'wOF2') {
          throw new Error(`${file}: lo descargado no es un woff2 (¿respondió el proxy?)`);
        }
        fs.writeFileSync(target, bytes);
        console.log(`🔤 ${file} (${(bytes.length / 1024).toFixed(0)} kB, ${block.subset ?? 'sin subset'})`);
      } else {
        console.log(`♻️  ${file} ya está (--force para rebajarlo)`);
      }

      porUrl.set(src, key);
      if (!faces.some((face) => face.file === key && face.weight === block.weight)) {
        faces.push({family: family.name, weight: block.weight, style: block.style, file: key});
      }
    }
  }

  for (const family of FAMILIES) {
    if (!faces.some((face) => face.family === family.name)) {
      throw new Error(`${family.name} quedó sin ninguna variante utilizable.`);
    }
  }

  const generated = `// Generado por scripts/fetchFonts.ts — no editar a mano.
export type FontFace = {family: string; weight: string; style: string; file: string};

export const FONT_FACES: FontFace[] = ${JSON.stringify(faces, null, 2)};
`;
  fs.writeFileSync('src/fonts.generated.ts', generated);
  console.log(`\n✅ ${faces.length} variantes en ${outDir} → src/fonts.generated.ts`);
  console.log('   Verifica el resultado con `npm run fonts-check`.');
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
