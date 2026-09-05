/**
 * Verifica que las tipografías de public/fonts/ se apliquen de verdad.
 *
 *   npm run fonts-check
 *
 * Por qué existe: una fuente puede cargar sin errores y aun así no usarse.
 * Pasó acá — `fetchFonts.ts` guardó el subconjunto latin-ext de Anton, que no
 * trae A-Z — y el síntoma es invisible desde el código: `document.fonts.check()`
 * devuelve `true`, el estado queda en `loaded`, el render termina sin una sola
 * advertencia, y toda la gráfica sale en la tipografía de respaldo. Se
 * entregaron varios videos así.
 *
 * La única prueba que no se puede engañar es medir texto: si "HANDGLOVES" mide
 * exactamente lo mismo con la familia que sin ella, la familia no se está
 * usando. Se mide en el mismo Chrome que usa Remotion para renderizar, así que
 * lo que dice acá es lo que va a pasar en el render.
 */
import fs from 'node:fs';
import path from 'node:path';
import {openBrowser} from '@remotion/renderer';
import {FONT_FACES} from '../src/fonts.generated';

const MUESTRA = 'HANDGLOVES abcdefg 0123';

const paginaHtml = (): string => {
  const caras = FONT_FACES.map((face) => {
    const archivo = path.join('public', face.file);
    if (!fs.existsSync(archivo)) throw new Error(`Falta ${archivo}. Corre \`npm run fonts\`.`);
    const uri = `data:font/woff2;base64,${fs.readFileSync(archivo).toString('base64')}`;
    return `@font-face{font-family:"${face.family}";src:url("${uri}") format("woff2");font-weight:${face.weight};font-style:${face.style};font-display:block;}`;
  }).join('\n');
  return `<!doctype html><meta charset="utf-8"><style>${caras}</style><body></body>`;
};

const main = async () => {
  if (!FONT_FACES.length) throw new Error('src/fonts.generated.ts está vacío. Corre `npm run fonts`.');

  const familias = [...new Set(FONT_FACES.map((face) => face.family))];
  const html = paginaHtml();

  console.log(`\n🔤 Verificando ${familias.length} familias en el Chrome de Remotion...\n`);
  const browser = await openBrowser('chrome');
  try {
    const page = await browser.newPage({
      context: null,
      logLevel: 'error',
      indent: false,
      pageIndex: 0,
    } as unknown as Parameters<typeof browser.newPage>[0]);
    await page.goto({
      url: `data:text/html;base64,${Buffer.from(html).toString('base64')}`,
      timeout: 30000,
    });

    const resultados = (await page.evaluate(
      `(async () => {
        const familias = ${JSON.stringify(familias)};
        const muestra = ${JSON.stringify(MUESTRA)};
        await Promise.all(familias.map((f) => document.fonts.load('400 100px "' + f + '"').catch(() => undefined)));
        await document.fonts.ready;
        const ctx = document.createElement('canvas').getContext('2d');
        const ancho = (font) => { ctx.font = font; return ctx.measureText(muestra).width; };
        return familias.map((familia) => {
          // Se compara contra DOS respaldos distintos: si la familia no se
          // aplica, el ancho cae exactamente sobre uno de ellos.
          const base = {mono: ancho('100px monospace'), serif: ancho('100px serif')};
          const conMono = ancho('100px "' + familia + '", monospace');
          const conSerif = ancho('100px "' + familia + '", serif');
          return {
            familia,
            cargada: document.fonts.check('100px "' + familia + '"'),
            // Se aplica de verdad solo si los dos stacks miden lo mismo (o sea
            // resolvieron a la MISMA fuente, la nuestra) y ese ancho no es el
            // de ninguno de los dos respaldos.
            aplicada:
              Math.abs(conMono - conSerif) < 0.5 &&
              Math.abs(conMono - base.mono) > 0.5 &&
              Math.abs(conSerif - base.serif) > 0.5,
            ancho: conMono,
            anchoRespaldo: base.serif,
          };
        });
      })()`,
      {timeoutInMilliseconds: 30000},
    )) as unknown as Array<{
      familia: string;
      cargada: boolean;
      aplicada: boolean;
      ancho: number;
      anchoRespaldo: number;
    }>;

    let fallo = false;
    for (const r of resultados) {
      console.log(
        `   ${r.aplicada ? '✅' : '❌'} ${r.familia.padEnd(10)} cargada=${r.cargada}  aplicada=${r.aplicada}  ancho=${r.ancho.toFixed(1)}px`,
      );
      if (!r.aplicada) {
        fallo = true;
        console.log(
          `      "${MUESTRA}" no se dibuja con ${r.familia}: cae al respaldo (${r.anchoRespaldo.toFixed(1)}px con serif).`,
        );
        console.log(
          '      Ojo: `cargada=true` no contradice esto — la fuente puede cargar sin traer las letras.',
        );
        console.log(
          '      Casi siempre es un subconjunto equivocado (latin-ext no trae A-Z). Corre `npm run fonts -- --force`.',
        );
      }
    }

    if (fallo) {
      console.error('\n❌ Hay tipografías que no se aplican. El render saldría con la de respaldo.');
      process.exit(1);
    }
    console.log('\n✅ Todas las tipografías se aplican de verdad.');
  } finally {
    await browser.close({silent: true});
  }
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
