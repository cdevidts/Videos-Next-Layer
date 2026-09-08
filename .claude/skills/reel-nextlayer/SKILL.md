---
name: reel-nextlayer
description: Playbook para armar, revisar y corregir los reels verticales (9:16) de Next Layer con el pipeline de Remotion de este repo. Úsalo siempre que la tarea toque un video de este proyecto — armar un reel nuevo, cambiar el guion de uno existente, ajustar gráfica, subtítulos, ritmo o sonido, revisar un render, o decidir qué clips usar. También cuando alguien diga "el video quedó malo", "no se ve viral", "el audio suena raro" o pida cualquier cosa sobre plans/*.json, VerticalReel.tsx o renders/. No lo uses para trabajo de infraestructura del repo que no sea de video.
---

# Reels de Next Layer

Next Layer es una empresa de **impresión 3D**. Los reels son verticales 9:16, para
Instagram/TikTok, y salen de clips crudos de cámara que viven en Google Drive.

No es contenido de Cero Trade. Si el copy empieza a hablar de energía o trading,
te equivocaste de marca.

## Antes que nada: mira el video, no los frames

**`npm run watch -- <render.mp4>`** deja en `out/watch/<nombre>/GUION.md` una fila
por instante con el tiempo, **lo que se escucha ahí**, el nivel en dBFS y el
frame. Léelo de corrido como un guion y abre con `Read` los frames que te llamen
la atención.

Esto no es opcional ni un extra: es la diferencia entre revisar un video y
adivinarlo. Sacar frames sueltos y un gráfico de niveles deja pasar todo lo que
importa — si el sonido corresponde a la imagen, si el subtítulo corresponde a la
voz, si el ritmo se cae. Ya se entregaron ediciones con un taladro sonando sobre
un plano sin taladro y con subtítulos que nadie dice; las dos las pescó la
usuaria en un segundo y ninguna era visible con el método viejo.

La primera vez que se corrió sobre este proyecto, el guion mostró en dos
renglones dos cosas que ninguna revisión anterior había visto:

- a los 0,2 s solo se ha dicho *"¿Un mueble"* — el gancho se come la ventana de
  decisión completa;
- **9 segundos seguidos sin una sola palabra** al final, y las tres tomas
  finales eran el mismo rincón con el mismo dinosaurio.

Y **`npm run sync`** mide el desfase de audio y de subtítulos. Un desfase no se
ve en un frame ni en un gráfico de niveles: hay que medirlo.

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
5. **Renderiza y revísalo con `npm run watch` + `npm run sync`.** No con frames
   sueltos: eso ya dejó pasar sonidos sin sentido y subtítulos inventados.

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

Ocho errores ya cometidos acá, todos detectados de oído por la usuaria.
Ninguno se puede repetir.

### 1. El sonido tiene que corresponder a lo que se ve
Este es el error de fondo, del que salen los demás. Poner un whoosh en cada
corte porque toca un corte es editar con reloj, no con criterio. Un sonido que
no tiene que ver con la imagen se percibe como error aunque el espectador no
sepa explicar por qué.

El método: **mira el frame y escucha el audio de ese corte, y recién ahí decide
qué sonido va.** Taladro en pantalla → sonido de taladro. Pantalla de
computador → teclado o click. Revelación del producto → un reveal. Si nada
justifica un sonido, no va ninguno. El plan acepta `"sfx": "taladro.mp3"` por
clip justamente para esto.

### 2. El whoosh va solo donde cambia la escena
El corte de silencios genera muchos jump cuts *dentro del mismo clip*. Ahí en
pantalla no cambia nada y un whoosh se oye pegado con scotch. `buildReel` marca
`isSceneChange` cuando el corte viene de otro clip, y `VerticalReel` solo suena
whoosh ahí. La skill de edición lo dice sin rodeos: **90% de los cortes deben
ser secos; las transiciones vistosas son condimento, no el plato.**

### 3. Audio opaco
Nunca uses `_audio/<clip>.wav` como pista del reel: es mono 16 kHz porque lo
exige whisper y suena a teléfono. La pista buena es `_audio/hq/<clip>.wav`
(48 kHz estéreo). `buildReel.ts` ya la prefiere y avisa si falta.

### 4. Efectos sintetizados
Ruido filtrado no suena a whoosh, suena a arena: le falta el barrido de
frecuencia resonante. Se midió: uno real barre de ~2,9 kHz a ~4,9 kHz en 1,3 s.
Los efectos se bajan con `npm run sfx`. Para elegir uno nuevo, mide el barrido;
no te fíes del nombre.

### 5. El mismo sonido repetido
Suena a máquina. Hay tres whooshes que se rotan variando el volumen.

### 6. Un riser tiene que crecer y desembocar en algo
Un riser a volumen constante es un ruido que aparece. Tiene que subir hacia el
corte que viene: eso es lo que hace que el corte se sienta ganado. Si termina
en medio de un plano, sin nada que lo reciba, sobra. `VerticalReel` le pone la
rampa solo, pero el corte tiene que estar donde el riser termina.

### 7. El cross-fade encima las dos voces
En una `TransitionSeries` los dos cortes están montados durante la transición,
así que sin fundido suenan **las dos pistas a la vez** ~100 ms en cada empalme.
Con 11 empalmes es un eco constante que se percibe como "el audio está
desfasado" aunque la sincronía esté perfecta. Cada corte entra y sale con un
fundido del largo de la transición.

### 8. La velocidad no puede saltar dentro de una misma idea
Los cortes de una frase iban a 1,1 / 1,15 / 1,2 / 1,25 según el clip de origen.
El tempo de la voz sube y baja dentro de la misma frase y suena procesada. Una
sola velocidad para todo lo hablado.

### Jerarquía de audio (no se negocia)
Diálogo > música > efectos > ambiente. La música va de cama a volumen bajo y
**baja sola cuando alguien habla** (ducking, implementado en `VerticalReel`).
Si la música compite con la voz, pierde la música, siempre.

El render normaliza a **-14 LUFS / -1 dBTP**, el estándar de Reels, TikTok y
Shorts. Más bajo, la plataforma lo sube y sube también el ruido de fondo.

### El silencio digital es un error, no una pausa
Un tramo sin ninguna señal se oye como si el video se hubiera roto. Los cortes
de B-roll no traen voz, así que necesitan sonido propio: el efecto que
corresponde a la imagen, o la música de cama sonando debajo. Verifícalo con
`npm run review`, que lista los tramos bajo -40 dBFS.

## Texto en pantalla: si nadie lo dice, no es un subtítulo

Un clip de B-roll mudo con texto en el mismo estilo que los subtítulos hablados
se lee como si alguien lo estuviera diciendo. Ya pasó: sobre un plano de bobinas
de filamento decía "Un taladro y nada más" — nadie lo dice, y encima no había
taladro en cuadro. Verónica lo pescó de inmediato.

Las opciones honestas para B-roll son tres, en este orden:

1. **Nada.** La música y el ritmo sostienen 2-3 s sin problema.
2. **Una gráfica que se vea como gráfica** — el cierre de HyperFrames, un sello,
   un número. Distinta del subtítulo, para que nadie la confunda con voz.
3. **Cortarlo más corto.** Si el plano no aguanta sin texto, sobra plano.

Lo que no es opción es escribirle un subtítulo a algo que nadie dijo.
`checkPlan` avisa de huecos largos, pero ese aviso no es permiso para inventar:
el mensaje mismo lo dice.

## Subtítulos: cómo verificar que calzan (y por qué se rompen)

**Nunca declares que los subtítulos están bien mirándolos.** Un desfase de 0,3 s
se ve raro pero no se sabe por qué. Se mide así:

1. Extrae el audio del render terminado a WAV 16 kHz.
2. Transcríbelo con whisper (`tokenLevelTimestamps: true`).
3. Arma la línea de tiempo global de los subtítulos desde
   `out/<proyecto>.reel.props.json`: el inicio de cada corte es
   `suma(duraciones anteriores) - n × transitionInFrames/fps`, y cada palabra va
   en `inicioDelCorte + word.start`.
4. Empareja cada palabra con la del audio real y mide la diferencia.

Un desfase medio bajo 0,15 s es aceptable. Si crece dentro de una frase, el
problema es la alineación, no whisper.

### La solución de fondo: transcribir el audio ya montado

Los tiempos de las palabras se infieren sobre el audio *original*, pero después
ese audio se corta, se acelera y se monta. Cada transformación agrega error, y
se midió hasta 1,2 s de desfase acumulado.

Por eso `buildReel` corre `syncCaptions` antes de renderizar: arma la pista de
voz exactamente como suena en el reel (mismos cortes, misma velocidad, mismas
posiciones, con `adelay` + `amix`), la transcribe, y usa esos tiempos. Salen ya
en la línea de tiempo final, así que no hay nada que inferir ni nada que se
pueda desfasar. Cuesta una pasada extra de whisper por render y vale la pena.

Se puede saltar con `--skip-captions` si solo estás probando la gráfica.

### Por qué no alcanza con alinear sobre el audio original

Se intentaron tres formas antes de llegar a lo anterior, todas medidas:

| Método | Desfase medio | Peor |
| --- | --- | --- |
| Estirar la frase sobre el tramo de voz | 0,45 s | 1,21 s |
| Repartir sobre la suma de tramos | peor aún | 1,2 s |
| Según el número de tramos | 0,22 s | 1,07 s |
| **Transcribir el audio montado** | **lo que mide whisper** | — |

El motivo de fondo: whisper se equivoca **mucho en la primera palabra** (la
estira hasta t=0 aunque la voz empiece 1,8 s después) y **poco en el resto**
(0,2-0,3 s). Ninguna transformación lineal arregla las dos cosas a la vez.

## Tipografía: cargarla no es aplicarla

La marca es **Anton** para display y **Inter** para texto, ambas locales en
`public/fonts/`. Antes de dar por bueno cualquier render:

```bash
npm run fonts-check
```

Abre el mismo Chrome que usa Remotion, mide una muestra con cada familia y con
dos fuentes de respaldo distintas, y falla si los anchos coinciden. Es la única
prueba que no se puede engañar.

### Por qué existe ese comando

Se entregaron varios reels con **toda** la gráfica en la fuente de respaldo del
sistema. Ni el gancho, ni los subtítulos, ni la placa de cierre estaban en Anton
o Inter. Ningún render falló ni advirtió nada.

La causa: `fetchFonts.ts` emparejaba mal el comentario `/* latin */` del CSS de
Google con su bloque `@font-face` y guardó el subconjunto **latin-ext** de Anton
— acentos y letras raras, ni una A-Z. Y el síntoma es traicionero, porque la
fuente **carga perfecto**:

- `document.fonts.check('124px Anton')` → `true`
- `document.fonts.status` → `loaded`
- `document.fonts.size` → cuenta todas las variantes

Solo que sin las letras, Chrome cae al respaldo carácter por carácter.

### Cómo diagnosticar algo así

1. **No confíes en `document.fonts.check()`.** Miente en este caso exacto.
2. **No compares grosores de trazo a ojo entre frames.** Se pierde una hora y se
   llega a conclusiones equivocadas: dos recortes del mismo render, tomados a
   distinta altura sobre fondos distintos, parecen tipografías distintas.
3. **Sácalo de Remotion.** Renderiza el `.woff2` suelto en un Chromium con una
   línea de referencia al lado (`--headless --screenshot`). Si sale igual que
   `serif`, el archivo es el problema, no el código.
4. **Mide, no mires.** Un ancho de texto idéntico al del respaldo es prueba
   concluyente de que la familia no se está usando.

### Efecto en la gráfica

Anton es condensada: las palabras quedan bastante más juntas que con cualquier
respaldo. Si cambias la tipografía, revisa los resaltadores naranjos — con el
espaciado viejo las cajas de dos palabras contiguas se tocaban y se leían como
una sola.

## El cierre: HyperFrames, no React

La placa de cierre se autorea en HTML (`brand/cierre/index.html`), se renderiza
a un WebM/VP9 **con canal alfa** (`npm run cierre`) y Remotion la compone encima
del último corte con `<OffthreadVideo transparent>`. La ventaja no es técnica:
es que la pieza de marca se diseña una vez, se previsualiza en el Studio de
HyperFrames sin tocar React, y se reusa igual en todos los videos.

Sí carga Anton. Si lees en algún lado que HyperFrames no puede con nuestras
tipografías, está desactualizado: esa conclusión salió de probar con el archivo
de fuente roto (ver la sección de tipografía).

### Lo que hace que el cierre funcione

**Va desde el inicio del último corte, no desde el final de la línea de tiempo.**
Este es el error que hacía que el reveal no existiera: el cierre entraba a 1 s de
empezada la toma del producto terminado, con velo oscuro encima. El mueble se
veía un segundo. En `VerticalReel` el cierre arranca en `ultimoCorte`, y la
gráfica dentro del propio HTML espera ~0,45 s antes de aparecer.

**El velo entra solo para la marca.** Durante el sello de precio el producto se
ve limpio. Oscurecer el reveal justo en el reveal es matarlo.

**El vector de salida define el de entrada.** El precio se va hacia arriba y la
marca entra desde abajo: se lee como un solo movimiento continuo en vez de dos
placas pegadas una tras otra.

**El texto sale de lo que se dice.** El gancho pregunta un precio; el reveal lo
contesta con ese mismo precio. Nada de copy inventado (ver más abajo).

### Trampas ya pisadas

- `top:980` **sin unidades** es CSS inválido: el bloque se va al borde superior.
  El `check` lo reporta como `canvas_overflow`. Saca siempre snapshots
  (`npx hyperframes snapshot --at ...`) y mira el contact sheet antes de
  renderizar — cuesta segundos y pesca esto de inmediato.
- Encadenar varios tweens de GSAP sobre la misma propiedad para hacer un rebote
  se pisa en los bordes (`overlapping_gsap_tweens`). Un solo tween con
  `back.out(1.5)` da el mismo asentamiento.
- GSAP va **local** en el proyecto, no por CDN: un CDN inalcanzable no da error,
  deja la composición en timeout de navegación.
- Las fuentes van embebidas como `data:` URI con `font-display: block`.

## Ritmo: acelerar lo que no se mueve

Una toma hablada sobre una imagen quieta (una pantalla de computador) se hace
larga aunque lo que diga sea bueno. El plan acepta `"speed": 1.15` por clip.
El tono de voz no cambia porque Remotion usa `atempo`, que estira el tiempo sin
resamplear. Entre 1.1 y 1.2 no se nota como "acelerado", solo se siente más
ágil; sobre 1.25 empieza a sonar raro.

## Música

`npm run sfx` baja una cama musical libre de derechos (`sfx/musica-cama.mp3`) y
`buildReel` la usa por defecto, a volumen bajo y con ducking bajo la voz.

Se eligió midiendo, no de oído a ciegas: varía solo 6 dB a lo largo del tema, así
que no salta por encima del diálogo. Las alternativas variaban 21 y 35 dB y
peleaban con la voz. **Si cambias la música, mide la variación de nivel primero.**

Para usar otra: `npm run reel -- --plan plans/<proyecto>.json --music <ruta>`.
Nunca uses música comercial: Content ID la marca en Instagram y YouTube. El único
tema en las carpetas de Drive (Baba O'Riley) está descartado por eso.

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
npm run fonts-check                              # ¿las fuentes se aplican de verdad?
npm run cierre                                   # placa de cierre (HyperFrames -> webm con alfa)
npm run color -- --dir public/input/video-46     # iguala el color entre tomas
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
