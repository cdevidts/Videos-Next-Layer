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

## Flujo

```bash
npm run fetch-drive -- --list                    # proyectos disponibles en Drive
npm run fetch-drive -- --project "Video 46"      # descarga a public/input/video-46/
npm run audio -- --dir public/input/video-46     # audio a WAV 16 kHz
npm run transcribe -- --dir public/input/video-46/_audio --model medium --language es
npm run fonts                                    # una sola vez
npm run sfx                                      # una sola vez
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

## Verificar antes de dar algo por terminado

- `npx tsc --noEmit` limpio.
- Extraer frames del render y **mirarlos** (`npx remotion ffmpeg -ss <s> -i <mp4>
  -frames:v 1 out.jpg`). Un render que termina sin error igual puede tener el texto
  cortado o la fuente caída.
- Revisar que el audio tenga contenido, no solo que exista la pista.

## Entorno

- FFmpeg y ffprobe vienen con Remotion: `npx remotion ffmpeg`, `npx remotion ffprobe`.
- Los renders largos van en background; nunca esperes con `sleep` en primer plano.
- Si esperas a que termine un proceso, **no uses `pgrep -f <patrón>`**: el propio
  shell que espera contiene el patrón en su línea de comando, se encuentra a sí
  mismo y el bucle nunca termina. Espera por el archivo de salida.
