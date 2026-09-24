# Lecciones ya pagadas

Cada punto costó al menos un render malo o una entrega con errores. Están acá y no
en CLAUDE.md porque CLAUDE.md se carga en cada turno: esto se lee cuando el tema
aparece. Si vas a tocar lo que dice un título, lee el párrafo entero.

## Material y transcripción

- **Mira todos los clips antes de escribir el plan.** No elijas por peso ni por
  duración. En el Video 46 el clip más pesado (48 s) era el que explicaba todo y
  quedó fuera por descartarlo sin abrirlo; después tres clips (el cuaderno de planos,
  las bobinas) quedaron sin mirar hasta que el video estaba terminado. Hoy lo
  impiden `npm run digest` (una hoja por clip) y `npm run check` (cada clip se usa
  o se descarta con razón).
- **Si whisper devuelve algo raro, puede ser jerga, no ruido.** "once lucas" salió
  "once lugar"; "IKEA" salió "y que". Las dos veces parecía inservible y era lo
  mejor del video. Antes de descartar por ininteligible, **pregunta**.
- **`correctedByHuman` no garantiza que esté bien, solo que alguien lo tocó.** En
  DSCF7534 el archivo corregido ponía una frase dentro de un silencio medido e
  inventaba "Y eso es todo". Cuando los tiempos no cuadran con la energía,
  transcribe el tramo limpio AISLADO; volver a correr whisper sobre el clip entero
  reproduce el mismo error.
- **La cadena de una corrección humana**: `correctedByHuman: true` →
  `buildReel` marca `wordsLocked` → `syncCaptions` conserva el TEXTO y toma los
  TIEMPOS medidos. Sin esa cadena cada render pisaba la corrección en silencio.
- **Whisper estira la última palabra de cada segmento hasta el borde del
  segmento** ("conectores" figuró durando 3,86 s con medio segundo de silencio
  adentro). No uses los bordes de palabra de whisper para decidir cortes; usa los
  tramos de energía (`speech`).
- **No transcribas B-roll mudo**: alucina `[BLANK_AUDIO]`, `(música)`.
  `transcribeClips.ts` detecta voz por nivel. Tampoco música ni efectos de
  `Sonido/`: `extractAudio` solo extrae las voces en off (`vo__*`).
- **Una ventana no puede cerrar en medio de una palabra.** "mueblecito" sonó
  "muebleci" porque la ventana cerraba en 6,08 s y la palabra iba hasta 6,28. El
  borde peligroso es solo el que pone la ventana (el de los tramos de energía está
  en silencio por construcción). `npm run check` lo frena; `allowMidWordCut` lo
  permite a propósito.
- **Orientación**: los `.MOV` reportan 3840x2160 y son verticales por metadato de
  rotación; `probe` ya lo resuelve. Un clip que queda horizontal se recorta al
  centro en 9:16 — salvo que sea una **toma cenital**: con la cámara apuntando al
  suelo el sensor no sabe dónde es arriba y graba apaisado SIN metadato. En el
  Video 41 una persona acostada quedaba de costado y el recorte le cortaba la
  cabeza y los pies, o sea el chiste. Va `"rotate"` en el plan.
- **Una línea dicha dos veces** es común: en el Video 41 la toma A decía "cuatro
  cosas" y la B "cinco". Transcribe cada tramo con voz AISLADO antes de elegir;
  whisper sobre el clip entero había puesto "Cinco" en un silencio y el subtítulo
  lo habría perdido.

## Subtítulos y sincronía

- **No infieras tiempos de subtítulos sobre el audio original**: tres métodos
  dejaron hasta 1,2 s de desfase porque después el audio se corta, se acelera y se
  monta. `syncCaptions` transcribe la pista YA montada.
- **`npm run captions` suelto no es idempotente**: la segunda corrida toma como
  ritmo humano lo que la primera ya retimó. Para rehacer subtítulos, ciclo
  completo con `npm run reel`.
- **Un subtítulo apelmazado no es un desfase**: `npm run sync` falla si un corte
  tiene muchas palabras y pocos instantes distintos.
- El instrumento de sincronía de VIDEO por correlación de movimiento daba falsos
  positivos de hasta 0,6 s; se retiró. `trimBefore` + `playbackRate` son exactos a
  ±1 frame (probado con una composición controlada).

## Tipografía

- **Las fuentes vienen de Google Fonts pero se BAJAN** a `public/fonts/`
  (`npm run fonts`). No `@remotion/google-fonts` ni `@import` en render: el Chrome
  del render no siempre sale a `fonts.gstatic.com`.
- **Cargar una fuente no es tenerla aplicada**, y `document.fonts.check()` no sirve
  para saberlo. `fetchFonts.ts` guardó el subconjunto latin-ext de Anton (sin A-Z)
  y varios renders salieron en la fuente de respaldo sin un solo error. Lo único
  que no miente es medir: `npm run fonts-check`.

## Gráfica

- **Se baja, no se dibuja** (instrucción de Veronica), y **se elige para cada
  video** — la biblioteca es caché y registro de licencias, no una preferencia.
- **El primer resultado de una búsqueda no es confiable.** "drill" devolvía primero
  un martillo neumático y un ícono de "drill down" de datos. El ranking ahora
  prefiere el nombre exacto, y `npm run assets` deja una hoja de candidatos por
  video para revisar con una sola lectura.
- **SourceSplash devuelve fotos al azar de Lorem Picsum cuando no encuentra
  nada**, sin avisar. Se descartan siempre.
- **Un ícono por set por video**: estilos mezclados se notan. `iconSet` en el plan.
- **La cara es sagrada.** En la primera prueba la foto tapaba la cara entera y el
  sticker quedaba en la mandíbula. Los defaults van al torso; verifica con
  `GRAFICA.jpg` de `npm run watch`.
- **Un overlay que vive menos de 0,6 s no existe.** `buildReel` avisa.
- **Para señalar algo que se ve (x/y), calibra sobre el RENDER con grilla**, no
  sobre el proxy: el reel aplica un zoom leve al plano. En el Video 41 los números
  de las bobinas quedaron sobre las patas del trípode y no se sabía qué numeraban.
  Y ponlos en el borde del objeto o encima si es grande, nunca entre dos objetos.
- **El cierre lo dibuja HyperFrames**, no React: `brand/cierre/index.html` con
  variables, renderizado a WebM/VP9 con alfa por video (`public/cierres/`), y
  Remotion lo compone con `<OffthreadVideo transparent>`. Sí carga Anton (una
  sesión concluyó lo contrario, pero medía con la fuente rota).

## Sonido

- **No sintetices efectos**: ruido filtrado suena a arena, no a whoosh (le falta el
  barrido resonante). Se descargan y se miden (`npm run sfx-catalog`).
- **El nombre de un efecto no dice lo que es.** La medición descartó 52 "whooshes"
  demasiado largos para un corte y 27 "impactos" con ataque lento que no golpean.
- **Lo que cae en el evento es el PICO del efecto**, no su inicio. Antes los
  whooshes arrancaban 5 frames antes del corte, fijo, y golpeaban tarde.
- **No el mismo whoosh en cada corte**: rotan varios distintos y varía el volumen.
  Y solo en cambios de escena reales: en un jump cut del mismo clip no cambia nada
  en pantalla.
- **Un riser que arranca a volumen pleno no es un riser**: tiene que crecer y
  desembocar en un corte.
- **Un efecto que no corresponde a la imagen se nota como error**: un taladro
  sonando sobre un plano sin taladro. Si el plano pide algo específico,
  `"buscar:<términos>"`; si el automático no calza, `"ninguno"`.
- **Un pop tiene que oírse.** Duran décimas de segundo y el oído los percibe
  mucho más bajos que su RMS: con el objetivo viejo quedaban 20 dB bajo la voz y
  el conteo del Video 41 no se oía. Para verificar sonidos cortos, renderiza solo
  el audio sin música (`--codec=wav` con props sin `musicSrc`) y mide cada uno.
- **Nunca `_audio/<clip>.wav` como pista del reel**: es mono 16 kHz para whisper y
  suena a teléfono. La pista sale de `_audio/hq/` (48 kHz estéreo).
- **Música sin Content ID**: nada comercial (ver bitácora).

## Herramientas

- **Un prop que falta no es un prop vacío.** Remotion mezcla los props del render
  con los `defaultProps` de `Root.tsx`: lo que `buildReel` deja `undefined` sale
  del ejemplo. En el Video 41 sin marca y con todo el sonido en `"ninguno"`, el
  cierre decía "Next Layer" (`cta`) y sonaban whooshes y un riser (`sfx`). Para
  apagar algo se manda vacío (`''`, `[]`), nunca ausente — y se verifica midiendo
  el audio por tramo, no leyendo el plan.

- **El ffmpeg de Remotion es recortado**: sin `fps`, `tile`, `drawtext`, `pad`,
  `hstack`, `showwavespic`, y falla con `No option name near '...'` (no dice
  "unknown filter"). Sí trae `scale`, `volume`, `concat`, `loudnorm`, `pan`,
  `aformat`. Para análisis y hojas de contacto se usa el ffmpeg de sistema
  (`scripts/lib/ffmpegFull.ts`), que en la imagen de la nube viene completo.
- **El Chrome headless se cuelga con `--screenshot`** en este entorno. Las hojas
  se componen con ffmpeg; lo que necesita el navegador se hace con
  `npx remotion still`.
- **`media-use` (HeyGen) no sirve de base**: su catálogo exige un login OAuth que
  muere con el contenedor. Sus 19 SFX locales sí se pueden usar.
- **Puter.js** (imágenes por IA) en Node necesita un token de login en navegador:
  el mismo problema que las credenciales. No integrado.
- **Lots of Sounds**: la muestra gratuita da 12 resultados por término y no declara
  licencia por sonido; en empate se prefiere Mixkit.
- **No esperes con `pgrep -f`**: el shell que espera contiene el patrón y se
  encuentra a sí mismo. Espera por el archivo de salida.

## Plugins del proyecto

`.claude/settings.json` (versionado) declara `codex@openai-codex`
(`/codex:review`, `/codex:adversarial-review`, `/codex:rescue`...). Necesita el
CLI (`npm install -g @openai/codex`) y `codex login`, que hace una persona; en un
contenedor remoto hay que rehacerlos cada sesión. Para agregar otro plugin:

```bash
claude plugin marketplace add <owner/repo> --scope project
claude plugin install <plugin>@<marketplace> --scope project -y
```
