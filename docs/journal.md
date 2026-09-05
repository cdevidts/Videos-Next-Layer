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

## 2026-09-05 · Se probó HyperFrames a fondo (la usuaria pidió meterlo "sí o sí") y se descartó
## con medición. De paso apareció un bug real de tipografías que llevaba varios renders.

La usuaria pidió explícitamente descargar HyperFrames y video-use y "encontrar dónde encajan bien
en el sistema". video-use encajó (ver la entrada de corrección de color). HyperFrames no, y esta
vez el descarte no es de lectura del repo sino de haberlo construido y medido.

**Qué se construyó.** Un proyecto HyperFrames real (`npx hyperframes init`) con la placa de marca
de cierre: 1080x1920, 2,4 s, fondo transparente, GSAP, para componerla sobre el video en Remotion
con `<OffthreadVideo transparent>`. Llegó a funcionar de punta a punta: `check` limpio, render a
WebM/VP9 con alfa (93,4% de píxeles transparentes, verificado decodificando con `libvpx-vp9`), y
Remotion compositándola bien encima de la última toma.

**Por qué se botó igual.** HyperFrames normaliza las tipografías a su propio set de 18 familias
para que el render sea determinista. Nuestro `@font-face` local con Anton **nunca se aplica**, y
no es un problema de rutas: se verificó extrayendo el HTML compilado (`render --debug`) que la
regla llega intacta, con la woff2 embebida como `data:` URI y byte-a-byte idéntica al archivo de
`public/fonts/` (mismo SHA-256, 31.356 bytes). Chrome igual cae a la fuente de respaldo. Con el
stack `"Anton", "Arial Black", sans-serif` caía a Montserrat (HyperFrames mapea `arial black` →
`montserrat`); dejando solo `"Anton"` cae a DejaVu Serif. Con una familia canónica suya (Archivo
Black) renderiza perfecto — o sea el mecanismo funciona, simplemente Anton no está disponible.
`font-display: block` no cambia nada.

Anton es pesada y **condensada**; lo más pesado que trae HyperFrames (Archivo Black) es pesado
pero **ancho**. La placa de marca no pegaría con el gancho, que es Anton. Una placa de marca que
no está en la tipografía de la marca no sirve, así que se eliminó `brand/endcard/` y el cableado
`endcardSrc`. El cierre lo sigue dibujando Remotion, que sí tiene Anton.

**Queda una decisión humana:** si alguna vez conviene autorear las piezas de marca en HTML (para
poder editarlas en el Studio de HyperFrames sin tocar React), hay que cambiar la tipografía de
display de todo el reel a una de las que HyperFrames trae — Oswald y League Gothic son las
condensadas, Archivo Black la pesada. Es una decisión de marca, no técnica.

**El hallazgo que sí valió la pena, y es grande.** Comparando la placa de HyperFrames contra la
de Remotion apareció algo peor que lo que se estaba buscando: **ninguna de las tipografías del
proyecto se estaba aplicando**. Ni Anton ni Inter. Todo el reel — gancho, subtítulos, placa de
cierre — llevaba varios renders saliendo en la fuente de respaldo del sistema, y ningún render
había fallado ni advertido nada.

La causa está en `scripts/fetchFonts.ts`. El CSS de Google Fonts trae un bloque `@font-face` por
subconjunto, precedido de un comentario (`/* latin */`). El código emparejaba mal ese comentario
con su bloque — lo buscaba *dentro* del bloque en vez de antes — y quedaba corrido en uno: para
Anton guardó el subconjunto **latin-ext**, que cubre U+0100-02BA (acentos y letras raras) y **no
tiene ni una A-Z**. De Inter guardó cuatro archivos con nombres distintos que eran el mismo
archivo (mismo MD5).

Lo traicionero es el síntoma: la fuente carga perfecto. `document.fonts.check('124px Anton')`
devuelve `true`, el estado queda en `loaded`, `document.fonts.size` cuenta las 5 variantes. Solo
que al no tener las letras, Chrome cae a la de respaldo carácter por carácter. Se perdió bastante
rato persiguiendo esto como si fuera una carrera de carga (se probó `document.fonts.ready`, se
probó cambiar la API `FontFace` por reglas `@font-face` de verdad — ninguna de las dos era el
problema, aunque la segunda quedó porque igual es más robusta). Lo que lo destrabó fue salirse de
Remotion: renderizar el `.woff2` del repo en un Chromium suelto, al lado del que sirve gstatic en
ese momento. El del repo salía serif; el de gstatic salía Anton.

Ahora `fetchFonts.ts` elige el bloque por su `unicode-range` — se queda con el que cubre U+0041,
la "A" — en vez de confiar en el comentario, detecta cuándo Google sirve una sola woff2 variable
para varios pesos (la nombra `-var-`, no miente con un peso), y falla si una familia queda sin
variante utilizable.

Y como este bug sobrevivió tantos renders justamente porque nada lo verificaba, se agregó
`npm run fonts-check` (`scripts/checkFonts.ts`): abre **el mismo Chrome que usa Remotion**, mide
"HANDGLOVES abcdefg 0123" con la familia y con dos respaldos distintos, y falla si los anchos
coinciden. Una fuente que no se aplica mide exactamente igual que su respaldo; no hay forma de
que eso pase inadvertido. Medido después de arreglar: Anton 1021,5 px contra 1307,1 px de antes
— o sea antes se estaba dibujando algo 28% más ancho, que es exactamente lo que uno esperaría de
una grotesca cualquiera en vez de una condensada.

Efecto secundario en la gráfica: con Anton de verdad las palabras quedan bastante más juntas, y
los resaltadores naranjos de dos palabras contiguas se tocaban y se leían como una sola caja. Se
subió la separación (`gap-x-8` en el gancho, `gap-x-7` en los subtítulos) y se achicó cuánto
sobresale el resaltador a los lados.

Moraleja para el próximo agente: **cargar una fuente no es lo mismo que tenerla aplicada, y
`document.fonts.check()` no sirve para distinguirlo** — devuelve `true` con una fuente que no
tiene ni una letra de las que necesitas. Lo único que no miente es medir texto: corre
`npm run fonts-check`. Y si algo se ve raro dentro de Remotion, sácalo de Remotion: media hora
comparando grosores de trazo en frames no vale un minuto de renderizar el archivo suelto en un
Chromium y mirarlo al lado del original.
