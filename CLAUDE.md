# Instrucciones para el agente

Pipeline de reels verticales (9:16) para **Next Layer**, impresión 3D. Remotion +
HyperFrames + Google Drive. Entra una carpeta de clips crudos, sale un reel listo
para publicar. **No es contenido de Cero Trade.**

Este archivo se carga en cada turno: es corto a propósito. El detalle vive en la
skill `reel-nextlayer` (el oficio) y en `.claude/skills/reel-nextlayer/references/lecciones.md`
(cada error ya pagado). El *por qué* de las decisiones, en `docs/journal.md`.

## "Haz el siguiente video"

```bash
npm install                                   # si falta node_modules
npm run next                                  # elige, baja TODO, transcribe, arma el digest
# → lee public/input/<slug>/DIGEST.md y abre CADA hoja de _digest/
# → escribe plans/<slug>.json (parte de plans/_plantilla.json)
npm run assets -- --plan plans/<slug>.json    # gráfica y sonidos para ESTE video; revisa la hoja de candidatos
npm run check  -- --plan plans/<slug>.json    # compuerta: no renderiza nada que no pase
npm run reel   -- --plan plans/<slug>.json    # proxies, cortes, subtítulos, cierre y render
npm run watch  -- renders/<slug>-reel.mp4     # lee GUION.md y mira GRAFICA.jpg
```

`npm run status` dice qué está hecho y qué sigue, deducido del disco. `videos.json`
lleva el estado de cada video de Drive: **nunca re-renderices uno `entregado`**.

## Reglas del repositorio

1. **Compuerta de ingreso** (regla de Veronica): antes de empezar un proyecto se
   enumeran los archivos en Drive, se bajan todos, se verifica que cada uno se vea o
   se escuche, y se mira cada clip en su hoja. Si falta uno, no se empieza.
   `next`/`fetch-drive` y `check` lo hacen cumplir; cada clip va al plan o a
   `descartados` con su razón.
2. **Drive**: la raíz (`videos.json` → `drive.raiz`) es pública; se baja sin
   credenciales. Los clips raw están SIEMPRE en `<Video N>/Videos/`. `Sonido/` trae
   voces en off para poner sobre clips sin audio relevante (`"voiceover"` en el plan).
3. **El estado vive en archivos**: cada decisión de edición se escribe en el plan.
4. **Todo es reanudable**: nunca borres `_normalized/`, `_audio/` ni `whisper.cpp/`.
   Para rehacer algo, `--force`.
5. **Commitea al terminar cada paso grande** y, antes de cerrar el turno, agrega una
   entrada en `docs/journal.md`: qué decidiste, qué descartaste, qué espera a una persona.
6. **Los subtítulos dicen lo que se escucha.** Si la transcripción salió rara puede
   ser jerga ("once lucas" → "once lugar"): **pregunta** antes de descartar.
   Una corrección humana lleva `"correctedByHuman": true` y sobrevive los renders.
7. **La gráfica se baja, no se dibuja, y se elige para cada video.** Iconify,
   LottieFiles, Noto, SourceSplash, Wikimedia — todo vía `npm run assets`. Lo ya
   descargado no tiene prioridad: si el video pide otra cosa, se busca otra cosa.

## Directiva de dirección de arte y sonido

Pedida por Veronica como núcleo del repositorio. Cada punto dice cómo se cumple:

| Directiva | Cómo se cumple acá |
| --- | --- |
| Entorno cloud listo: ffmpeg, Chromium, skills | Ya está: nada que instalar. Ver *Entorno* |
| Skills de Remotion y HyperFrames | `npm run skills` (incluye `remotion-dev/skills`); para movimiento, `hyperframes-animation` y `hyperframes-keyframes` antes de improvisar |
| Ingesta desde Drive, analizar ritmo y energía | `npm run next` + `DIGEST.md` (tramos de voz, niveles, hojas) |
| Guion para retención | El plan: gancho en 1,5 s, cortes de silencio, textos en pantalla |
| No dibujar formas planas; íconos por API | Iconify, sets MIT/ISC/Apache (`npm run assets`) |
| Media de apoyo | SourceSplash (sin su relleno de Picsum) y Wikimedia Commons |
| Tipografía de Google Fonts | Sí, pero **bajadas** a `public/fonts/` (`npm run fonts`): el Chrome del render no siempre sale a internet |
| SFX por API, términos exactos | Catálogo medido de Mixkit + Lots of Sounds (`npm run sfx-catalog`); `"buscar:<términos>"` para algo específico |
| Paleta: #0047AB, #00D4FF, #FF6600 | Default del código: azul en el grade y el cierre, eléctrico en íconos, naranja en acentos y CTA |
| Nada lineal: `spring()` y ease-in-out | `VerticalReel` y `Overlays.tsx` |
| Whoosh grave en cada cambio de escena | Automático, rotando, graves del catálogo, el pico cae en el corte |
| Pop o click al entrar gráfica | Automático en cada overlay, alineado por el pico |
| Riser 1–2 s antes del reveal + golpe grave | Automático, el pico sobre el último corte |
| Ducking de música al 30% con voz | `musicVolume * 0.3` mientras hay voz, vuelve en los silencios |
| Sin pedir confirmación | Todo lo anterior es automático; el plan lo anula (`"sonido"`, `"ninguno"`) si el video pide otra cosa |

## Verificar antes de entregar

- `npm run check` sin problemas y `npx tsc --noEmit` limpio.
- `npm run fonts-check` en verde (una fuente caída no da error: sale en la de respaldo).
- **`npm run watch`** — lo más importante: `GUION.md` (lo que se ESCUCHA en cada
  instante, con su frame) y `GRAFICA.jpg` (cada overlay en contexto: que no tape la
  cara ni el subtítulo).
- `npm run sync -- --render <mp4>`: desfase de audio y subtítulos.

## Entorno

- Nada que instalar en la nube: ffmpeg de Remotion (`npx remotion ffmpeg`, recortado)
  para render; ffmpeg de sistema (completo) para análisis y hojas; Chromium en
  `/opt/pw-browsers` — **nunca** `playwright install`.
- Renders largos en background; no esperes con `sleep` ni con `pgrep -f`.
- Subir a Drive (`npm run publish-drive`) sí necesita credenciales con escritura en
  `.env`, que no sobreviven al contenedor.
