# Comedia, storytelling y timing en reels

Léelo **antes de ordenar los cortes** de un reel con humor o con historia (Video 44, 45,
43, 41). Nació del hilo "Mejorar storytelling y timing cómico" (oct 2026), después de
que Cris encontrara el Video 44 poco cómico, con mal timing y un orden ilógico.

Qué es hallazgo y qué es oficio: *(fuente)* salió de una búsqueda y se abrió la página;
*(oficio)* es criterio de edición establecido que se anota acá para que sea checklist.
**Ninguna fuente trata de reels comerciales ni de impresión 3D**: son heurísticas de TV, cine
y stand-up. Úsalas como hipótesis y pruébalas con un render parcial (§7), no como ley.

## 1. Primero la historia, después los cortes

Antes de tocar el plan, escribe la historia en una línea y los beats en una lista:

`Quién quiere qué → qué se lo impide → el giro → la resolución → (el remate)`

Para el 44/45: *cliente necesita una pieza que no existe → no la encuentra en ningún lado →
Cristóbal la diseña e imprime → "¡está perfecto!"*. Si el orden de los clips no sigue esa
línea, el video se siente ilógico aunque cada plano sea bueno. Regla: **la causa se ve
antes que el efecto** (la pieza rota antes de la pieza nueva; el pedido antes de la entrega).

## 2. Estructura del chiste

- **Regla de tres** *(fuente)*: beat, beat, remate. El 1º planta, el 2º deja ver el
  patrón, el 3º lo rompe. En reel: dos intentos que fallan, el tercero es el giro.
- **Llega tarde, sal temprano** *(fuente)*: pasa por el setup lo más rápido que se
  entienda y deja el tiempo para el remate. Todo lo que está entre setup y remate sobra.
- **El remate cae junto a la pausa natural** *(fuente)*: la palabra graciosa va al final
  de la frase, no en el medio. Prueba el remate con y sin pausa antes (a menudo no hace falta).
- **Corte a la reacción** *(oficio)*: la risa está en la cara que recibe la noticia, no en
  quien la dice. Después del remate, aguanta 0,3–0,8 s en la reacción.
- **Smash cut** *(fuente)*: alguien dice "no" y corte directo a que ya cedió. Sirve para
  el pedido imposible → pieza hecha.
- **Revelación en plano ancho** *(fuente/oficio)*: lo gracioso suele vivir en el plano
  ancho; si nada más funciona, corta a ancho.
- **Callback** *(oficio)*: la frase del inicio vuelve al final con otro sentido. Es el
  cierre más barato y más efectivo: el gancho se contesta con el remate.

## 2b. Matices verificados (segunda pasada)

- **Sin aire muerto en el setup, un solo beat deliberado antes del remate.** Las fuentes
  parecen contradecirse (Elwyn: quitar pausas; el paper y los editores de *Hacks*: dar aire)
  y se reconcilian así *(fuente)*. En stand-up, la pausa previa a un par de frases de alta
  sorpresa medía 1,37 s contra 1,01 s (Ma et al., 828 sets de stand-up chino): son silencios
  del cómico en vivo, no cortes de edición; en un reel pesan menos. Pruébalo con 3 valores
  (0,3 / 0,6 / 1,0 s) en `pausaDespues` y decide de oído.
- **Limpia lo que estorba entre setup y remate**: tangentes, muletillas, trabas
  *(fuente: Elwyn sobre Nygard)*. El remate va al final de la frase.
- **Deja formar la expectativa** *(fuente: Friedman, *Palm Springs*)*: sin ella no hay risa;
  un corte muy largo delata el chiste y uno muy corto lo pierde. Inferencia para nosotros:
  un plano limpio, sin overlays ni SFX, justo antes del remate.
- **Corte sobre cara hablando** *(fuente: Murch)*: 1–2 cuadros antes del parpadeo si el
  actor sigue en personaje; justo después del parpadeo para una reacción sorpresiva.
  Es de cine dramático, no una regla de comedia.
- **Una pasada de "air" y de "word baggage"** antes de cortar *(fuente: Elwyn)*. El repo ya
  corta silencios con la transcripción; lo que falta es decidir *cuál* silencio es chiste.

## 2c. Referente real: Humbe 3D (verificado)

Existe, pero no con los handles obvios: TikTok **@3d.humbe** (≈220 mil) y YouTube
**@3DHumbe** (≈1,04 M, Argentina). `@humbe3d` da 404. Es argentino (voseo: **no copiar**).
Su fórmula, vista en títulos/captions y TikToks analizados *(cifras de cortes y LUFS sin
verificar: no se pudieron bajar los videos)*:

1. Gancho con el **resultado dicho de entrada** y el objeto ya en el frame 0.
2. "El problema…" a los 4–5 s, con un cliente real.
3. Una o dos fallas que **escalan**.
4. Giro con muletilla fija ("y ahí fue cuando, investigando…").
5. Solución y resultado en los últimos 5–8 s; el video termina ~3–4 s después del resultado.

No es un humorista: su motor es la **historia de problema que escala**, con humor suave.
Eso es lo que le faltó al 44 (el orden), más que "ser gracioso". Otros referentes
verificados: **Vitu / EREXIT3D** (AR; gancho de provocación, plazo como stakes, aparte seco,
cierra con consecuencia humana, talking head con cutaways literales: calza con Cristóbal a
cámara), **ImpresoEn3D** (MX; títulos de confesión/antes-después y trabajos por encargo B2B),
**skp3d** (EC; gancho-pregunta + comparativa + "comenta PALABRA"). En español no apareció
nadie haciendo *sketch* de impresión 3D: ese hueco es de Next Layer. Todo es contenido con
copyright: se mira el estilo, no se reutiliza nada.

Qué sí aplicar: gancho-resultado en ≤3,5 s; UN intento fallido antes del giro; giro
hablado en chileno ("y ahí me di cuenta…"); cortar ~3 s después del resultado; flechas/X
rojas sobre el detalle. Qué no: promesas absolutas ("cualquier impresión"), voseo, ni su
mezcla a −7 LUFS (el repo normaliza a −14).

## 3. Timing: dónde está el silencio

- El silencio **antes** del remate crea tensión; **después**, deja reír. El corte de
  silencios del pipeline, tal cual, mata las dos. Para un chiste usa
  `"pausaDespues"` en el clip del remate (ya existe en el plan) y no aceleres (`speed`
  1.0) la frase del remate.
- Setup rápido (`speed` 1.1–1.15 y cortes secos), remate a velocidad natural.
- Un mismo sonido o gráfica **no** debe pisar el remate: el sonido va en el setup o
  después de la pausa. Un whoosh encima de la palabra graciosa la entierra.
- Música: la cama baja en el remate o se corta un instante. El silencio de música es
  un recurso, a diferencia del silencio digital de la sección Sonido (ahí sigue habiendo
  ambiente).
- Mide, no adivines: `npm run watch` → `GUION.md` muestra en qué segundo cae cada palabra
  y cuánto silencio hay alrededor del remate. Objetivo: remate dentro de la primera
  mitad del video para humor de 20–30 s, o en el último tercio si es de historia.

## 4. Checklist de orden (corre esto antes de `npm run reel`)

1. ¿La historia cabe en una línea y los clips la siguen en orden causal?
2. ¿El gancho plantea una pregunta o un conflicto que el final contesta?
3. ¿Hay un solo remate? Si hay dos, el segundo es un callback del primero.
4. ¿Qué plano va justo después del remate? Debe ser una reacción o el resultado, no más explicación.
5. ¿Cada corte de más de 4 s tiene algo que cambie (gesto, giro, gráfica)?
6. ¿El producto/servicio aparece como **solución dentro de la historia**, no como aviso?
7. ¿Se entiende el reel solo, sin pronombres que apunten a algo que no se ve? ¿Hay un rehook (nueva pregunta o giro) entre los 3 y 10 s?
8. `GUION.md` leído de corrido: ¿se entiende sin ver imagen? ¿el remate se oye limpio?

## 5. Bancos de recursos (licencias verificadas)

| Qué | Dónde | Licencia | Nota |
| --- | --- | --- | --- |
| SFX | **Mixkit** (Funny 65, Cartoon 136, y categorías `record-scratch`, `cricket`, `suspense`) | Mixkit License: comercial, sin atribución, **prohibido redistribuir sueltos y registrarlos en un servicio de derechos** | Ya integrado; `public/sfx/` está en `.gitignore`, que es lo correcto. |
| SFX | **OpenGameArt filtrado a CC0** (BOING!, Boings, Silly Sound Effects, Squeak toy, Group giggling, Thwack, wet towel hits, cricket) | CC0 | Bajar a mano, respetando `Crawl-delay` de 10 s; los *previews* pueden tener otra licencia que el archivo. |
| SFX | **Kenney Audio** (Impact 130, Interface 100, Voiceover 90) | CC0 | Golpe seco bajo un boing y clicks. No tiene boing, risas ni record scratch. |
| SFX | **Freesound** | CC0 / CC BY / CC BY-NC por sonido | **La API es gratis solo para uso no comercial**; Next Layer es comercial → no integrar la API sin permiso escrito de UPF. A mano, solo CC0, desde el sitio. |
| SFX | **Lots of Sounds** (lo que trae `buscar:`) | **Sin licencia declarada** | `buscar:` también consulta esta fuente: para un reel comercial, descartar esos candidatos (ahora `assets` avisa). |
| Gráfica | **LottieFiles** | Lottie Simple License: comercial gratis, crédito recomendado | Ya integrado (`buscarLottie`). Revisar cada animación. |
| Gráfica | **Noto animado** (`emoji:🔥`) | **CC BY 4.0: exige crédito** | Ya integrado. `@remotion/animated-emoji` es redundante. Poner el crédito en la descripción del post. |
| Motor | **Remotion** | **Gratis hasta 3 personas**; desde 4, de pago | Decisión de Cris: confirmar cuánta gente cuenta Next Layer (contratistas incluidos). |

No existe rimshot en Mixkit ni en OpenGameArt-CC0 (los "joke drums" de Mixkit lo reemplazan);
tampoco trombón triste, record scratch ni slide whistle con licencia CC0.

## 6. Skills y repos revisados (abiertos uno por uno)

Ninguno se instaló; se **copian reglas, no herramientas**. Todos son en inglés.

| Repo | Licencia | Qué vale la pena |
| --- | --- | --- |
| `arhamhi/hooksmith` (inmaduro: 2★, v0.2.0) | MIT | Quality gate de 7 chequeos del gancho y el *rehook* entre 3 y 10 s. |
| `AgriciDaniel/claude-shorts` (256★) | MIT | Banda de payoff para filtrar clips; chequeo "sin pronombres sin referente" (cada reel se entiende solo); regla del overlay de gancho (4–8 palabras). |
| `heygen-com/hyperframes` (`references/story.md`, `motion.md`) | Apache-2.0 | Esbozar 5 ideas y quedarse con las 3 más distintas antes de ordenar; sostener 0,3–0,75 s antes del payoff. |
| `S3YED/appie-kit` · `video-editing-pro` | MIT | Tope de ~8 s sin cambio visual; quietud corta antes del reveal. Sus cifras son heurísticas de blogs, no estudios. |
| `jtydhr88/screenwriting-skills` · `sw-sitcom-comedy` | MIT | Mecánica del chiste de sitcom (cuerpo en chino). Utilidad baja. |
| `browser-use/video-use` | MIT | Reglas de corte: silencio ≥400 ms es corte limpio, 150–400 ms revisar, <150 ms no cortar; fade de audio de ~30 ms por borde. **Necesita ElevenLabs Scribe (de pago)**: no usar la herramienta. |
| `hassancs91/claude-youtube-editor` | MIT | `verify_cut`: detecta palabras cortadas a la mitad y desfase tras cada render. Idea para `check`/`sync`. |

Aviso: `CLAUDE.md` nombra las skills `hyperframes-animation` y `hyperframes-keyframes`; en el
`main` actual de HyperFrames ya no existen como carpetas aparte (quedaron en `references/`).
Las copias locales en `.claude/skills/` siguen sirviendo.

## 7. Tutoriales de "editar con Claude Code gratis" (qué aportan)

Todos hacen lo mismo que este pipeline (el plan JSON como fuente de verdad, transcripción
con tiempos por palabra, render). "Gratis" es parcial: Remotion/HyperFrames/whisper sí;
Claude Code no. Aportes que el repo **no** tenía: un **modo borrador** (render a media
resolución de un tramo: `remotion render --scale=0.5 --frame-range=a-b`), un verificador
de "palabra cortada a la mitad", y probar el umbral de pausa de oído con 3 valores. Que
una skill pida "confirmar la estrategia antes de cortar" choca con la directiva de este
repo ("sin pedir confirmación"): no se adopta.

Fuentes: Hasan Aboul Hasan (learnwithhasan.com/guide/claude-code-video-editing),
Enrique Rocha (tododeia.com/community/editar-videos-con-claude, tras formulario),
Engr Mejba Ahmed (mejba.me), LaoZhang AI (blog.laozhang.ai/es/posts/claude-code-video-editing).

## 8. Lo que sigue sin respuesta

- Si la mayoría de estas cifras sirve para voz en español chileno sobre planos de impresión 3D:
  nadie lo probó. Se prueba con el 44 y se anota en `lecciones.md`.
- Los shorts de YouTube de Humbe no se pudieron bajar (bloqueo anti-bot): su estructura se
  infiere de títulos y de TikToks.
- Cuántas personas cuenta Next Layer para la licencia de Remotion.
