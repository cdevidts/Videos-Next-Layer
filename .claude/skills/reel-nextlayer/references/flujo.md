# El flujo real de producción (Video 44, v1 a v3, 30-oct-2026)

Esto es lo que se hizo para el primer reel armado con el pool completo de material
suelto, en el orden en que se hizo, con lo que funcionó y lo que costó. La skill
(`SKILL.md`) dice *qué* hace un buen reel; esto dice *cómo se llega* a uno, paso
a paso, y qué se verifica en cada paso. Se afina video a video: cuando un paso
cambie, se cambia acá y se anota en `docs/journal.md`.

Pedido de Cris (30-oct): "que identifique en los clips de verdad para dónde va el
video, use las skills para ver cuál es el mejor hook dentro de los videos sueltos,
qué video podría hacer, incluso mezclando videos de todas partes".

## 0. Contexto barato primero (2 min)

Memoria del proyecto → documento maestro → esta skill y `lecciones.md` → la cola
de `docs/journal.md`. No releas Drive ni el journal entero.

## 1. Bajar el POOL, no solo el siguiente video (15–25 min, en background)

```bash
npm run next -- --project "Video 44"                    # el que se va a editar
npm run next -- --project "Video 45" --solo-material    # los demás pendientes
```

El mejor gancho puede estar en otra carpeta: en el 44 el pedido concreto del
cliente ("una pieza de 10 cm por 5") y el plano que muestra la pieza entrando
estaban en el 45. `--solo-material` baja con la misma compuerta pero no marca el
video "en-curso" en `videos.json`.

Un monitor sobre el log avisa cuando cada video queda listo; mientras tanto se
miran las hojas del que ya bajó.

## 2. Mirar cada hoja y escribir UNA línea por clip

Abre `public/input/<slug>/_digest/<clip>.jpg` de **todos** los clips del pool y
escribe, para cada uno: qué se ve, quién habla, si la cámara está de costado, y
si sirve. Ese inventario (en el Video 44 fue `material.md` en el scratchpad) es lo
que después se le pasa al agente de estructura. Ejemplos de lo que solo se ve en
la hoja: el 43 grabado de costado (rotar −90), el 7515 cenital apaisado con el
soporte roto, la persecución por la casa del 45 que es otra historia.

## 3. Transcribir tramo por tramo, y desconfiar igual

```bash
npm run tramos -- --project video-44            # muestra; no escribe
npm run tramos -- --project video-44 --aplicar  # escribe, con "tramosAislados": true
```

Whisper sobre el clip entero perdió frases enteras ("yo lo arreglo" figuraba a los
18 s y se dice a los 29). Sobre el tramo recortado acierta casi siempre, pero
**dos corridas pueden discrepar** (una dio "yo lo diseño" una vez; eran dos). Para
desempatar, **cuenta las frases por energía**: RMS en ventanas de 0,1 s sobre el
tramo; cada bloque sobre −30 dB separado por un valle es una frase. Lo que
whisper inventa en silencio ("[Puerta abriéndose]", "¡Suscríbete!", "al canal!")
lo filtra el script; revísalo igual.

Corrige a mano en `_audio/<clip>.json` lo que no cuadre y deja una nota en
`_revision`. **Los bordes de palabra de whisper no sirven para cortar**: el "5"
del 7507 terminaba según whisper en 19,41 s y la energía mostraba silencio desde
19,25. Para cortar dentro de un tramo, mide la energía.

## 4. Mapear historias, no carpetas

Antes de pensar en el gancho: ¿qué clips cuentan la misma historia? En el pool del
30-oct, 44 y 45 eran la misma sesión (18-ago), el mismo bidé y la misma pieza
negra: el 44 es la versión cantada a cámara ("mándamelo a hacer"), el 45 la
actuada (cliente, persecución, "¡está perfecto!"). El 43 (Russell de *Up*) y el
41 (5 cosas sobre mí) son otras historias.

## 5. Gancho: tres candidatos, una segunda opinión sin anclar

Lista tres ganchos **dichos en el material** (clip, tramo, texto en pantalla de
máx. 8 palabras) y por qué cada uno funciona o no en 1,5 s. Después lanza un
agente (Sonnet basta) con el inventario y las rutas de las hojas, **sin tu
conclusión**, y pídele lo mismo más una estructura corte por corte. Compara. En el
44 los dos llegaron al mismo gancho por separado ("Tengo un repuesto que no puedo
encontrar o que no existe" → **¿Tu repuesto no existe?**); el agente además
detectó que el "Perfecto" del 7508 era dudoso, y lo era (cae sobre un plano
negro).

Criterios que decidieron:
- Un **problema** que el espectador tiene (repuesto que no existe) gana a un
  resultado sin contexto ("¡está perfecto!") y a una orden ("¡mándalo a hacer!").
- El payoff es entender el servicio: se diseña e imprime la pieza que no existe.
- Ojo con dos frases de problema seguidas: el 44 tiene "no existe" y "no pude
  arreglarlo con pegamento"; funcionan juntas solo porque la segunda es concreta
  (y graciosa).

## 6. Ventanas exactas con frames de verdad

```bash
npm run frames -- --project video-45 --clip DSCF7515 --at 1,3,4.5,6,8,9.5 --rotate 90
```

La hoja del digest sirve para conocer el clip; esta tira sirve para cortar. Así se
encontró el plano del 7515 (soporte roto → entra la pieza → panel firme) y que el
"Perfecto" del 7508 cae sobre negro.

## 7. El plan: cada corte con su razón

`plans/<slug>.json`, con un `_toma` por corte que diga qué se oye, qué se ve y por
qué está. Clips de otra carpeta con `"proyecto": "video-45"`. El último corte es
el **producto** y dura lo que el cierre (3,2 s): el cierre arranca en el último
corte y, si ese corte es una persona hablando, la tapa (primer render del 44: el
cierre tapó "esto lo hice yo").

## 8. Gráfica y sonido para ESTE video

`npm run assets` y abrir `out/assets/<slug>-candidatos.jpg`. Un efecto que no
corresponde a la imagen se saca aunque el buscador lo haya encontrado ("plastic
click" devolvió un click de lápiz de 3,5 s que sonaba sobre el soporte roto, no
cuando entra la pieza). Noto no tiene todos los emoji animados (🤦 no): assets lo
dice y se elige otro.

## 9. Compuertas antes de renderizar

`npm run check`, `npx tsc --noEmit`, `npm run fonts-check`. Avisos de `check`
("4 s mudos") se resuelven acortando, no rellenando.

## 10. Render (background) y revisión de verdad

El primer render de un video con clips 4K tarda ~20 min (proxies); los siguientes
~6 min. Después, en este orden:

1. `npm run watch` → `GUION.md` de corrido y `GRAFICA.jpg`.
2. `npm run sync` → audio por corte (tope 0,08 s) y subtítulos (tope 0,15 s).
3. Si `sync` falla, mide palabra por palabra (whisper `-ml 1` sobre el render
   contra `out/<slug>.reel.props.json`) para saber **qué corte** falla, no solo el
   mediano. En el 44 era un solo corte con 0,7 s de adelanto al inicio y 0,9 s de
   atraso al final: los tiempos internos venían de whisper `-ml 1`. Desde ahí
   `syncCaptions` empareja palabra por palabra contra el audio montado.
4. Mirar los frames del gancho: en el 44 el "?" del gancho quedaba suelto
   ("EXISTE ?") por ir fuera de los asteriscos.

## 11. Panel de críticos sobre el render (la v2 → v3 del 44)

Cris vio la v1 y dijo "bueno, pero poco cómico; mejora el timing, las gráficas, las
referencias; el video instalando entre el pedido y cuando lo traigo no hace
sentido". Lo que funcionó para pasar de eso a la v3:

1. **Contar la historia en voz alta sin mirar la pantalla**: pedido → acepto →
   busco → traigo → instalo. Si un plano cambia de lugar la causa, está mal
   aunque se vea bien. Es lo primero que se arregla (v2).
2. **Tres críticos independientes (Sonnet) sobre el render**, cada uno con una
   mirada: timing cómico, historia/referencias, gráfica y sonido. Cada uno recibe el
   render, `GUION.md`, `GRAFICA.jpg` y la guía de comedia, **no** mi opinión, y
   devuelve hallazgos con instante exacto y el cambio exacto en el plan. Se
   verifica cada hallazgo contra la fuente (frames, energía) antes de aplicarlo:
   en el 44 uno pedía mover un sticker a un plano donde lo que parecía la pieza en
   la mano era el celular.
3. **Lo que casi siempre sale**: remates sin aire (la ventana no alcanza para
   `pausaDespues`), una línea clave inaudible o sin subtítulo, gráficas sobre la
   palabra graciosa, efectos con licencia dudosa, y planos de transición que
   duran más que lo que cuentan.
4. **Medir, no suponer**: el aire real de cada remate (nivel del audio del render
   cerca del corte), el nivel de cada línea, y los ids de los efectos
   (`lots-*` = licencia sin declarar).
5. Un render por vuelta; mirar los frames de los remates y de los cortes que
   cambiaron antes de volver a llamar a los críticos.

## Checklist de calidad (todo en verde antes de mostrarlo)

- [ ] Cada clip del pool mirado en su hoja; los que no entran, con razón en el plan.
- [ ] Transcripción tramo por tramo revisada contra la energía; nada inventado.
- [ ] Gancho dicho en el video, ≤ 8 palabras, puntuación dentro del resaltado.
- [ ] Un corte cada 3–5 s; ningún plano mudo > 3,5 s sin acción.
- [ ] La historia se cuenta en orden de causa y efecto (pedido → busco → traigo → instalo).
- [ ] Cada remate: velocidad natural, 0,3–0,8 s de aire REAL medido en el render, sin gráfica ni sonido sobre la palabra graciosa.
- [ ] Toda línea que mueve la historia se oye y se lee (nivel, subtítulo).
- [ ] Ningún efecto `lots-*` en `out/<slug>.reel.props.json`.
- [ ] Último corte = producto, ≥ duración del cierre.
- [ ] Overlays enganchados a la palabra, ≥ 0,6 s en pantalla, sin tapar cara ni subtítulo (`GRAFICA.jpg`).
- [ ] Cada efecto corresponde a lo que se ve; whoosh solo en cambio de escena.
- [ ] `check`, `tsc`, `fonts-check` y `sync` en verde.
- [ ] `GUION.md` leído de corrido: lo que se oye calza con lo que se ve.
- [ ] Journal, `videos.json` y PR; Veronica aprueba antes de "entregado".

## Pendiente de afinar

- `transcribeClips` podría transcribir por tramos desde el principio y ahorrar el
  paso 3 (hoy whisper corre dos veces).
- Un `npm run energia -- --clip X --desde a --hasta b` que imprima el RMS haría
  el paso 3 sin código suelto.
- Preguntar a Veronica si las frases cantadas del 44 son una canción conocida
  (parodia) o propia: cambia si conviene subtitularlas como letra.
