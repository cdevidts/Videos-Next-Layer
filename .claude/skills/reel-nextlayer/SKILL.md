---
name: reel-nextlayer
description: Playbook para armar, revisar y corregir los reels verticales (9:16) de Next Layer con el pipeline de Remotion de este repo. Úsalo siempre que la tarea toque un video de este proyecto — armar un reel nuevo, cambiar el guion de uno existente, ajustar gráfica, subtítulos, ritmo o sonido, revisar un render, o decidir qué clips usar. También cuando alguien diga "el video quedó malo", "no se ve viral", "el audio suena raro" o pida cualquier cosa sobre plans/*.json, VerticalReel.tsx o renders/. No lo uses para trabajo de infraestructura del repo que no sea de video.
---

# Reels de Next Layer

Next Layer es una empresa de **impresión 3D**. Los reels son verticales 9:16, para
Instagram/TikTok, y salen de clips crudos de cámara que viven en Google Drive.

No es contenido de Cero Trade. Si el copy empieza a hablar de energía o trading,
te equivocaste de marca.

## El orden correcto de trabajo

Saltarse el paso 1 es el error más caro que se ha cometido en este repo.

1. **Mira todo el material antes de decidir nada.** Saca frames de *todos* los
   clips y léelos con `Read`. Nunca elijas por peso de archivo ni por duración.
   El clip más pesado de Video 46 (48 s) era el que explicaba el producto entero
   y quedó fuera de la primera versión por descartarlo sin abrirlo.
2. **Lee las transcripciones antes de escribir textos.** El gancho puede estar
   ya dicho en cámara. Si whisper devolvió algo sin sentido, sospecha de jerga
   chilena antes de declarar el clip inservible ("once lucas" salió como "once
   lugar"). Ante la duda, pregunta.
3. **Escribe el guion en `plans/<proyecto>.json`**, no en la conversación.
4. **Valida antes de renderizar**: `npm run check -- --plan plans/<proyecto>.json`.
   Un render son ~15 minutos; la validación son 2 segundos.
5. **Renderiza, revisa con `npm run review` y mira los frames.** Un render que
   termina sin error igual puede tener texto cortado o audio mudo.

## Qué hace que un reel funcione

Referencias completas en `.agents/skills/ultimate-video-editor/`:
`social-media/viral-editing.md` (ganchos, ritmo, curva de energía),
`sound-design/audio-mixing.md` (loudness por plataforma) y
`sound-design/sfx-guide.md` (capas de sonido). Léelas cuando necesites el detalle.
Lo esencial:

### El gancho vive en los primeros 1,5 segundos
Ese es el tiempo real antes del scroll. Tres segundos para enganchar.
El mejor gancho casi siempre ya está en el audio original — una pregunta, un
precio, una queja. Búscalo en las transcripciones antes de inventar uno.
Un gancho de precio ("¿Un mueble por once lucas?") rinde más que uno descriptivo.

### Ritmo
Contenido narrativo: un corte cada 3-6 s. La sección de demostración aguanta
cortes de 4-8 s. El corte de silencios ya hace la mitad del trabajo.

### La curva de energía
`Gancho (0-3s) → Setup → Desarrollo → Payoff → Cierre de marca`. El payoff es
el momento en que se entiende *el producto*, no el resultado bonito. En Video 46
el payoff es "puedo hacer cualquier forma de mueble con los conectores que
diseñé", no el mueble terminado.

### Gráfica: cinética, no diapositiva
Lo que hace que un reel parezca PowerPoint, y por qué se sacó de este repo:
chips numerados (`01 · El problema`), cajas con barra lateral, subrayados bajo
el título, barras de progreso segmentadas y cross-fades largos. Todo eso es
lenguaje de presentación.

Lo que sí funciona, ya implementado en `src/VerticalReel.tsx`:
- Texto con contorno negro directo sobre la imagen, sin caja
- Cada palabra entra con rebote y sobrepaso (`pop()`, spring con damping ~11)
- Resaltador de color que **barre** la palabra mientras se escucha
- Zoom que alterna de dirección por corte, más un golpe de escala al entrar
- Cortes secos de ~3 frames en vez de disolvencias

## Sonido: donde más se nota lo amateur

Tres errores ya cometidos acá, los tres detectados de oído por la usuaria:

1. **Audio opaco.** Nunca uses `_audio/<clip>.wav` como pista del reel: es mono
   16 kHz porque lo exige whisper, y suena a teléfono. La pista buena es
   `_audio/hq/<clip>.wav` (48 kHz estéreo). `buildReel.ts` ya la prefiere.
2. **Whooshes sintetizados.** Ruido filtrado no suena a whoosh, suena a arena:
   le falta el barrido de frecuencia resonante. Los efectos se bajan con
   `npm run sfx`.
3. **El mismo sonido en cada corte.** Suena a máquina. Hay tres whooshes y
   `VerticalReel` los rota variando el volumen.

El render termina normalizando a **-14 LUFS / -1 dBTP**, que es el estándar de
Reels, TikTok y Shorts. Si sale más bajo, la plataforma lo sube y sube también
el ruido de fondo.

## Música

Ninguna de las carpetas de Drive trae música utilizable: lo único que hay es un
tema comercial que Content ID marca. Un reel sin música se entrega igual, pero
avísale a la usuaria. Cuando tenga un track licenciado:
`npm run reel -- --plan plans/<proyecto>.json --music <ruta>`.

## Honestidad del contenido

Los textos en pantalla tienen que corresponder a lo que se ve y se escucha.
Si un clip quedó ininteligible se marca `ignoreSpeech` y se usa mudo; no se
rellena con texto inventado. Una transcripción corregida a mano se marca
`"correctedByHuman": true` y ya no se vuelve a pisar, ni con `--force`.

## Comandos

```bash
npm run status                                   # dónde quedó todo
npm run fetch-drive -- --project "Video 46"      # baja el proyecto de Drive
npm run audio -- --dir public/input/video-46     # 16 kHz (whisper) + hq/ 48 kHz (reel)
npm run transcribe -- --dir public/input/video-46/_audio --model medium --language es
npm run fonts && npm run sfx                     # una sola vez cada uno
npm run check -- --plan plans/video-46.json      # valida el plan (rápido)
npm run reel -- --plan plans/video-46.json       # proxies + corte de silencios + render
npm run review -- renders/video-46-reel.mp4      # frames + niveles de audio
```

## Referencias del motor

Para dudas de Remotion (animación, subtítulos, render), las skills oficiales
están en `.agents/skills/remotion-*`. `remotion-captions` incluye
`createTikTokStyleCaptions()` de `@remotion/captions`, que es la vía oficial
para subtítulos estilo TikTok — hoy este repo usa un `groupWords()` propio en
`src/lib/reel.ts` que hace lo mismo; migrar está pendiente de evaluar.
