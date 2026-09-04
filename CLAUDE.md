# Instrucciones para el agente

Pipeline de reels verticales (9:16) para **Next Layer**, empresa de impresión 3D.
Remotion + Google Drive. El material crudo son clips de cámara; la salida son
reels listos para publicar en `renders/`.

> Ojo: la marca es Next Layer (impresión 3D). No es contenido de Cero Trade.

## Empieza siempre por acá

```bash
npm install          # si node_modules no existe
npm run status       # qué está hecho, qué falta y el comando que sigue
```

Si la tarea es sobre un **video** (armar, corregir, revisar, cambiar gráfica o
sonido), la skill `reel-nextlayer` tiene el playbook completo: qué hace que un
reel funcione, los errores de sonido y gráfica ya cometidos, y el orden de
trabajo. Este archivo solo enruta; el detalle vive ahí.

Ese conocimiento de referencia no está en git (son skills de terceros). Se
instala una vez con `npm run skills`, que deja en `.agents/skills/`:
`remotion-*` (motor: animación, subtítulos, render) y `ultimate-video-editor`
(diseño sonoro, loudness por plataforma, ganchos y ritmo viral). Léelas cuando
necesites el detalle, no de entrada.

`npm run status` deduce todo del disco, así que no miente aunque la sesión
anterior se haya cortado a la mitad. Después lee `docs/journal.md`: ahí está el
*por qué* de las decisiones, que es lo único que no se puede deducir mirando
archivos.

## Reglas de continuidad

Este proyecto está pensado para que una sesión se corte en cualquier punto y otra
retome sin perder nada. Para que eso siga siendo cierto:

1. **El estado vive en archivos, no en la conversación.** El guion completo de un
   video está en `plans/<proyecto>.json`. Si tomas una decisión de edición,
   escríbela ahí, no solo la apliques.
2. **Todo paso es reanudable.** Descargas, proxies, transcripciones y renders se
   saltan si el resultado ya existe y está al día. Nunca borres `_normalized/`,
   `_audio/` ni `whisper.cpp/` para "empezar limpio": son horas de CPU.
   Para rehacer algo a propósito existe `--force`.
3. **Commitea al terminar cada paso grande**, no al final de todo. Un render que
   quedó sin commitear se pierde con el contenedor.
4. **Antes de cerrar tu turno, agrega una entrada en `docs/journal.md`** con lo
   que decidiste, lo que descartaste y lo que quedó esperando una decisión humana.
   Esa entrada es lo que lee el agente siguiente.
5. **No inventes contenido.** Los textos en pantalla tienen que corresponder a lo
   que se ve y se escucha. Si la transcripción salió ininteligible, se marca
   `ignoreSpeech` y se usa el clip mudo; no se rellena con texto inventado.
6. **Mira todos los clips antes de escribir el plan.** No elijas material por peso
   de archivo ni por duración: saca frames de cada clip y míralos con `Read`. El
   primer render de Video 46 salió mal justamente por esto — el clip más pesado
   (48 s) era el que explicaba todo y quedó fuera por descartarlo sin abrirlo.
7. **Si whisper devuelve algo raro, puede ser jerga, no ruido.** "once lucas"
   (chileno: once mil pesos) salió como "once lugar". Antes de descartar un clip
   por ininteligible, pregunta. Una transcripción corregida a mano se marca con
   `"correctedByHuman": true` y ya no se vuelve a pisar, ni con `--force`.

## Flujo

```bash
npm run fetch-drive -- --list                    # proyectos disponibles en Drive
npm run fetch-drive -- --project "Video 46"      # descarga a public/input/video-46/
npm run audio -- --dir public/input/video-46     # audio a WAV 16 kHz
npm run transcribe -- --dir public/input/video-46/_audio --model medium --language es
npm run fonts                                    # una sola vez
npm run sfx                                      # una sola vez (descarga los efectos)
npm run check -- --plan plans/video-46.json      # valida el plan antes de renderizar
npm run reel -- --plan plans/video-46.json       # proxies + corte de silencios + render
```

Para un video nuevo: copia `plans/video-46.json`, cambia `project`, `dir`, `hook`,
`cta` y los `clips`. El resto del pipeline no cambia.

## Cosas que ya se probaron y no hay que repetir

- **No uses `@remotion/google-fonts`**: el Chrome del render no siempre puede salir
  a fonts.gstatic.com. Las tipografías viven en `public/fonts/` (`npm run fonts`).
- **No transcribas B-roll mudo**: el modelo alucina `[BLANK_AUDIO]`, `(música)`.
  `transcribeClips.ts` ya detecta por nivel qué clips tienen voz.
- **No confíes en los tiempos crudos de whisper**: estira el primer token hasta
  t=0. Ya se corrigen contra la energía real del audio.
- **No asumas la orientación por `ffprobe`**: los `.MOV` reportan 3840x2160 pero
  son verticales por metadato de rotación.
- **No metas música comercial.** Ver la entrada de la bitácora sobre Content ID.
- **Nunca uses `_audio/<clip>.wav` como pista del reel.** Ese archivo es mono
  16 kHz porque es lo que exige whisper, y a 16 kHz el audio pierde todo sobre
  los 8 kHz: suena opaco, como teléfono. La pista del reel sale de
  `_audio/hq/<clip>.wav` (48 kHz estéreo). `buildReel.ts` ya la prefiere y
  avisa si falta.
- **No sintetices los efectos de sonido.** Se probó: ruido filtrado con un
  pasa-bajos de un polo no suena a whoosh, suena a arena, porque le falta el
  barrido de frecuencia resonante que tiene uno real. Los efectos se descargan
  con `npm run sfx`.
- **No uses el mismo whoosh en todos los cortes.** Suena a máquina. Hay tres
  variantes y `VerticalReel` las rota, variando también el volumen.

## Verificar antes de dar algo por terminado

- `npm run check -- --plan <plan>` sin problemas. Son 2 segundos y evita
  descubrir a los 15 minutos que faltaba un archivo.
- `npx tsc --noEmit` limpio.
- `npm run review -- <render.mp4>` — saca 8 frames parejos a `out/review/<nombre>/`
  y un resumen del nivel de audio en dBFS por ventana. Léelos con `Read`. Un
  render que termina sin error igual puede tener el texto cortado, la fuente
  caída o el audio mudo; esto lo pesca sin sacar cada frame a mano.
  Para mirar un instante puntual con más detalle: `npx remotion ffmpeg -ss <s>
  -i <mp4> -frames:v 1 out.jpg`.
- Si el plugin `watch@claude-video` está instalado (`/plugin marketplace add
  bradautomates/claude-video`), `/watch <archivo o URL>` es otra forma de revisar
  el resultado. No es parte del pipeline (hay que instalarlo aparte con `/plugin`
  dentro de una sesión interactiva) y no reemplaza `npm run review`, que no
  depende de nada externo.
- Revisar que el audio tenga contenido, no solo que exista la pista.

## El ffmpeg de Remotion es una build recortada

`npx remotion ffmpeg` **no** es un ffmpeg completo: viene compilado solo con los
filtros que Remotion necesita para su propio encode/decode. Confirmado por
prueba directa: `fps`, `tile`, `showwavespic` y `drawtext` no existen ahí y
fallan con `No option name near '...'` (mensaje engañoso, no dice "unknown
filter"). Sí están disponibles `scale`, `volume`, `concat`, `loudnorm`, `pan`,
`aformat` y los que ya usa `scripts/lib/media.ts`. Antes de usar un filtro
nuevo, probarlo suelto primero; si falla así, hay que resolverlo sin ffmpeg
(ver `rmsWindows` en `scripts/reviewReel.ts` y `transcribeClips.ts` — análisis
de audio hecho a mano en Node leyendo el WAV, en vez de con un filtro).

## Entorno

- FFmpeg y ffprobe vienen con Remotion: `npx remotion ffmpeg`, `npx remotion ffprobe`.
- Los renders largos van en background; nunca esperes con `sleep` en primer plano.
- Si esperas a que termine un proceso, **no uses `pgrep -f <patrón>`**: el propio
  shell que espera contiene el patrón en su línea de comando, se encuentra a sí
  mismo y el bucle nunca termina. Espera por el archivo de salida.
