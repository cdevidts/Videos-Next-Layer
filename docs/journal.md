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
