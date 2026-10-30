# Comedia, storytelling y timing en reels

Léelo **antes de ordenar los cortes** de un reel con humor o con historia (Video 44, 45,
43, 41). Nació del hilo "Mejorar storytelling y timing cómico" (oct 2026), después de
que Cris encontrara el Video 44 poco cómico, con mal timing y un orden ilógico.

Qué es hallazgo y qué es oficio: lo marcado *(fuente)* salió de una búsqueda; lo marcado
*(oficio)* es criterio de edición establecido que se anota acá para que sea checklist.
Ninguna fuente web fue verificada a fondo: son blogs y guías, no autoridades.

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
7. `GUION.md` leído de corrido: ¿se entiende sin ver imagen? ¿el remate se oye limpio?

## 5. Bancos de recursos (licencias)

| Qué | Dónde | Licencia | Nota |
| --- | --- | --- | --- |
| SFX | **Mixkit** | Mixkit License: comercial, sin atribución *(fuente)* | Ya en `npm run sfx-catalog`. Solo los SFX; la música/video de Mixkit tiene otra licencia. |
| SFX | **Pixabay** | Pixabay License: comercial, sin atribución, no se revende *(fuente)* | Buena fuente de sonidos "cómicos" (boing, error, risas de fondo). Candidato a agregar al catálogo; falta verificar API y términos. |
| SFX | **Freesound** | Mezcla CC0 / CC BY / CC BY-NC *(fuente)* | Solo filtrando **CC0**; CC BY exige crédito, NC está prohibido en una marca. |
| SFX retro | OpenGameArt, pack de SubspaceAudio | CC0 *(fuente)* | Bips, golpes y "coin" estilo 8-bit para momentos de broma. |
| Gráfica | Iconify, Noto animado, LottieFiles, SourceSplash, Wikimedia | ver `npm run assets` | No se encontró un banco nuevo mejor; las 5 fuentes actuales cubren icono/sticker/foto. |
| Skills | `remotion-dev/skills` | open source | Ya instalada vía `npm run skills`. |

## 6. Lo que NO se encontró (para no volver a buscar igual)

- **Humbe 3D**: una búsqueda web con ese nombre no devolvió nada. Hay que pedirle a Cris
  el enlace de su canal/Instagram para poder estudiar sus videos; sin eso no se inventa
  qué hace.
- **Skills de comedia para reels**: los registros (claudskills, skills.sh, aimcp)
  listan skills genéricas de guion/ganchos/ritmo (`script-writer`, `video-editing-pro`,
  `video-storyboarding` de orchestkit, `claude-shorts`), ninguna enfocada en timing cómico.
  Aportan ganchos y retención, lo que este repo ya cubre. No se instalaron.
- **Video "editar con Claude Code gratis"**: hay varios tutoriales de Remotion + Claude Code
  (Brendan, Sabrina Ramonov, RoboNugg, etc.) y todos hacen lo mismo que este pipeline.
  "Gratis" es parcial: Remotion es gratis (salvo Lambda), Claude Code no.
  Aporte útil de esos tutoriales: probar barato con `--scale=0.5` y `--frame-range=a-b`
  antes del render completo, y parametrizar con `--props`.

## 7. Prueba barata antes del render completo

`npx remotion render ... --scale=0.5 --frame-range=<inicio>-<fin>` renderiza solo el
remate (y 2 s antes) a media resolución: así se afina el timing del chiste sin pagar
15 minutos de render.
