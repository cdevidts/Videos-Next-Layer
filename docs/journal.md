# Bitácora de decisiones

Lo que **no** se puede deducir mirando los archivos: por qué se hizo así, qué se
descartó y qué está esperando una decisión humana.

Regla para cualquier agente: antes de terminar tu turno, agrega una entrada aquí
con lo que decidiste. El código cuenta el *qué*; esta bitácora cuenta el *por qué*.
Entradas nuevas abajo, con fecha.

---

## 2026-09-04 · Video 46: elección de material y guion

- El material es de **Next Layer (impresión 3D)**, no de Cero Trade. El copy va en
  esa voz: taller, filamento, hacerlo uno mismo.
- De las 5 carpetas de Drive se eligió **Video 46** por ser la de más material
  (10 clips). Se bajaron los 6 más livianos: 4K HEVC 10 bits, 24 fps, verticales
  con rotación en el contenedor.
- Narrativa elegida: problema (carretes sin lugar) → plano en cuaderno → diseño →
  construcción → resultado → placa de marca.

## 2026-09-04 · Qué se descartó y por qué

- **DSCF7524 hablado**: la transcripción salió ininteligible ("o muerle así por
  once lugar"). Se marcó `ignoreSpeech: true` y se usa mudo como cierre. Si alguien
  entiende el audio, se puede escribir el texto a mano en el plan.
- **Música**: el único track en las carpetas de Sonido de Drive es *Baba O'Riley*
  de The Who. Content ID lo marca en Instagram y YouTube, así que el reel quedó sin
  música y con ~6 s de silencio en los B-roll. **Pendiente de decisión humana**:
  conseguir un track licenciado y pasarlo con `--music`.
- **Fuentes desde el CDN de Google**: el Chrome del render no confía en el CA del
  proxy y fallaba con `ERR_CERT_AUTHORITY_INVALID`. Ahora Anton e Inter viven en
  `public/fonts/` (`npm run fonts`). No volver a usar `@remotion/google-fonts`.

## 2026-09-04 · Detalles técnicos que costaron encontrar

- Whisper estira el primer token hasta t=0 aunque la voz empiece después. Los
  tramos con voz se miden por **energía del audio** y los tiempos de whisper se
  reescalan a ese tramo (`alignWords` en `scripts/transcribeClips.ts`).
- Los clips B-roll mudos hay que detectarlos por nivel y **no** transcribirlos: si
  se transcriben, el modelo alucina `[BLANK_AUDIO]`, `(música)`, `[silbando]`.
- Los `.MOV` traen rotación en el contenedor: `ffprobe` reporta 3840x2160 pero el
  video es vertical. `normalize()` en `scripts/lib/media.ts` la aplica al generar
  el proxy.
- Subtítulo del corte 01 dice "hueá", tal cual se escucha. **Pendiente de decisión
  humana**: dejarlo o suavizarlo editando
  `public/input/video-46/_audio/DSCF7528.json`.

## 2026-09-05 · Diseño sonoro: dos errores que la usuaria detectó de oído

**1. El audio sonaba opaco porque iba a 16 kHz mono.** `extractAudio.ts` generaba una sola
pista, mono 16 kHz, porque es lo que exige whisper — y `buildReel.ts` usaba *esa misma pista*
como audio del reel. A 16 kHz se pierde todo sobre los 8 kHz: es calidad de teléfono. El
original de la cámara es 48 kHz estéreo 24 bits. Ahora se extraen dos pistas: la de 16 kHz
para whisper y `_audio/hq/` a 48 kHz estéreo para el reel. `buildReel` prefiere la HQ y avisa
si falta.

**2. Los whooshes sonaban "a arena" y todos iguales.** Estaban sintetizados en
`makeSfx.ts` con ruido blanco filtrado por un pasa-bajos de un polo. Sin resonancia y con
barrido simétrico eso no es un whoosh, es ruido con envolvente. Se midió contra sonidos
reales: uno de verdad barre de ~2.9 kHz a ~4.9 kHz en 1,3 s; el sintetizado no tenía esa
curva. Además se usaba **el mismo archivo en las 12 transiciones**, lo que suena a máquina.

Se reemplazó por descarga real (`scripts/fetchSfx.ts` → `npm run sfx`) desde Mixkit, con tres
whooshes distintos que se rotan por corte más variación de volumen. Se eligieron midiendo el
barrido de frecuencia de cada candidato, no por el nombre.

Licencia: Mixkit permite uso comercial sin atribución pero **no redistribuir los archivos**,
así que `public/sfx/` está en `.gitignore` y bajarlos es un paso de setup, igual que las
fuentes. Los créditos quedan en `public/sfx/CREDITOS.txt`.

## 2026-09-05 · Se instaló la skill oficial de Remotion

`npx skills add remotion-dev/skills` deja 12 skills en `.agents/skills/`, entre ellas
`remotion-captions` (incluye `createTikTokStyleCaptions()` de `@remotion/captions`, la vía
oficial para subtítulos estilo TikTok) y `remotion-multimedia`. **Pendiente de evaluar**:
migrar el `groupWords()` hecho a mano en `src/lib/reel.ts` a `@remotion/captions`.

Nota de licencia a tener presente: Remotion es gratis para individuos y empresas de menos de
3 empleados; con 3 o más se necesita licencia comercial.

## 2026-09-05 · Video 46 v2: se rehizo entero. El v1 estaba mal por omisión.

La usuaria rechazó el primer render con tres críticas, las tres correctas:

1. **Faltaban 4 de 10 clips.** El v1 se armó bajando a mano los 6 clips *más livianos* por
   `curl`, saltándose el propio `npm run fetch-drive` del repo. Elegir material por peso de
   archivo en vez de por contenido es lo que causó todo lo demás. **Regla nueva: nunca elegir
   clips sin mirarlos.** Extraer frames de todos los clips antes de escribir el plan.
2. **Se perdió la historia.** DSCF7537 (48 s, 1,2 GB — el más pesado, por eso quedó fuera) es
   el corazón del video: muestra el diseño en CAD y explica que *diseñó conectores impresos en
   3D con superficies protuberantes que encajan en agujeros hechos con taladro, para armar
   cualquier forma de mueble*. Eso es literalmente la propuesta de Next Layer y no estaba.
   El v1 saltaba del cuaderno al resultado sin el "cómo".
3. **La gráfica parecía PowerPoint.** Chips numerados `01 · El problema`, pastillas con barra
   lateral, subrayado bajo el gancho y barra de progreso segmentada: todos elementos de
   presentación, no de reel. Se eliminaron todos.

## 2026-09-05 · El gancho real lo dijo la usuaria, no el modelo

DSCF7524 dice **"¿Un mueble por once lucas?"** — whisper devolvió *"o muerle así por once
lugar"* porque no conoce "lucas" (jerga chilena: mil pesos). El v1 marcó ese clip como
ininteligible y lo usó mudo al final. Era el gancho de precio del video, y el precio se
repite hablado en DSCF7532 ("son 11 lucas").

Se corrigió la transcripción a mano y ahora abre el reel. Para que no se pierda: los archivos
de transcripción aceptan `"correctedByHuman": true` y `transcribeClips.ts` **no los pisa ni
con `--force`**. Si whisper devuelve algo raro en jerga chilena, se corrige a mano y se marca
con esa bandera.

## 2026-09-04 · Se evaluaron 3 herramientas externas de video (heygen-com/hyperframes,
bradautomates/claude-video, browser-use/video-use). Veredicto: una se adoptó, dos no.

La usuaria las vio en TikTok y pidió meterlas al pipeline asumiendo que eran mejores que lo que ya
había. Se investigó cada una en su repo real antes de tocar nada; el resultado no fue "sí a las
tres":

- **heygen-com/hyperframes** (HTML → video vía Chrome headless + ffmpeg, 42.6k★): hace lo mismo que
  ya hace Remotion en este repo — de hecho es el mismo concepto con menos años de maduración. No se
  adoptó: cambiar el motor de render botaría `VerticalReel.tsx` y toda la identidad visual de Next
  Layer ya construida y probada, a cambio de nada nuevo. No hay caso de uso acá que Remotion no
  cubra.
- **browser-use/video-use** (edición conversacional completa: recorte de silencios, color, subs,
  overlays — usa Remotion como uno de sus motores de overlay, 21.3k★): es, en la práctica, una
  reimplementación genérica de este mismo pipeline. No se adoptó reemplazando nuestro código porque
  (a) usa ElevenLabs Scribe para transcribir, que es una API paga por minuto — justo lo contrario
  del objetivo de esta sesión de no gastar de más — mientras que este repo transcribe gratis con
  whisper.cpp local; y (b) reemplazarlo tiraría trabajo ya validado (alineación de timestamps por
  energía, detección de B-roll mudo, el sistema gráfico de marca). Sí se rescató su idea central de
  revisar un render con una composición de imágenes en vez de frame por frame — implementada nativa
  en `scripts/reviewReel.ts`, sin la API paga.
- **bradautomates/claude-video** (plugin `/watch`, deja que un agente "vea" un video vía frames +
  transcripción, 16.1k★): **sí se adoptó**, como capacidad de QA, no de render. No compite con nada
  del pipeline — mejora cómo un agente revisa el resultado. Documentado en CLAUDE.md como opcional
  (necesita `/plugin marketplace add bradautomates/claude-video` dentro de una sesión interactiva,
  algo que un agente no puede hacer por Bash) con `npm run review` como alternativa que no depende
  de instalar nada.

Al construir `reviewReel.ts` se encontró que el ffmpeg que trae Remotion es una build recortada:
`fps`, `tile`, `showwavespic` y `drawtext` no existen ahí y fallan con un mensaje engañoso
(`No option name near '...'`, no "unknown filter"). Quedó documentado en CLAUDE.md para no volver a
perder tiempo con esto. El script terminado extrae 8 frames por `-ss` (ya probado en el resto del
repo) y mide el nivel de audio en Node leyendo el WAV directo, igual que `transcribeClips.ts`.
