# Mapa de contexto de Next Layer

Cómo un agente (o una persona) llega a saber lo que necesita gastando lo mínimo.
Sigue los principios de *Context Engineering* (davidkimai/Context-Engineering, MIT):
**cada token tiene costo, se agrega solo lo que falta demostrablemente, se comprime
el historial en un estado compacto en vez de acumularlo, y se borra agresivamente.**

Los hilos del proyecto parten de un contenedor vacío. Todo lo persistente vive en
una de estas cuatro capas, de la más barata a la más cara. **Se lee en este orden
y se para en cuanto alcanza.**

| Capa | Qué contiene | Dónde | Costo |
| --- | --- | --- | --- |
| 1. Memoria del proyecto | Hechos que no están en el código: quién es quién, cuentas, decisiones, estado de los videos, enlaces | Carpeta de memoria del proyecto (un archivo por tema, `MEMORY.md` como índice) | ~1k tokens |
| 2. Documento maestro | Resumen de la empresa: oferta, equipo, canales, marca, precios, repos | Claude Doc enlazado desde la memoria (`nextlayer-master-context`) | ~3k tokens |
| 3. Grafo del repo | Qué llama a qué; qué sección del journal o de la skill habla de qué función | `graphify-out/graph.json` + `GRAPH_REPORT.md` (este repo) | 200–800 tokens por consulta |
| 4. Fuentes crudas | Código, `docs/journal.md`, Drive, hojas de clips | Repo, Drive `videos.json → drive.raiz` | lo que pese el archivo |

## Fuentes y dónde están

- **Repos** (GitHub, cuenta `cdevidts`): `Videos-Next-Layer` es el único activo
  (pipeline de reels). `COTINL` es el cotizador HTML antiguo, referencia de costos.
  `NLPAGE` y `archivospaginaNL` están vacíos.
- **Drive**: carpeta raíz pública en `videos.json → drive.raiz`; clips en
  `<Video N>/Videos/`, voces en `Sonido/`. La carpeta del proyecto en claude.ai
  apunta a la misma raíz. El grafo **no** indexa Drive: lo que se aprende de un
  video va a `videos.json`, al plan y al journal.
- **Memoria del proyecto**: la lee el coordinador y cada hilo al empezar.
- **Instagram**: vía Metricool; ver memoria `nextlayer-instagram`.

## El grafo (graphify)

`npm run grafo` regenera `graphify-out/` sin LLM (código y encabezados de los
`.md`; si hay `claude` en el PATH nombra las comunidades con una llamada corta a
Haiku). Está commiteado para que un hilo nuevo lo use sin reconstruir.

```bash
graphify query "<pregunta>"            # subgrafo acotado, antes de grep
graphify explain "syncCaptions()"       # un símbolo y sus vecinos
graphify path "buildReel.ts" "cierre.ts"
graphify god-nodes --top 10
```

El grafo está **viejo** si `built_at_commit` en `graph.json` no es `git rev-parse
HEAD`: correr `npm run grafo` y commitearlo con el cambio de código. Un diff
grande en `graph.json` es normal; no es churn.

Límites honestos: el grafo cubre un repo chico (54 archivos de código) y los
encabezados de los `.md`; no lee PDFs ni Drive sin un backend LLM, y no
reemplaza la memoria. Su valor es evitar leer `journal.md` entero (600+ líneas)
para encontrar la decisión que importa.

## Protocolo de cierre (lo que mantiene todo al día)

Al terminar un paso grande, antes de cerrar el turno:

1. `docs/journal.md`: qué se decidió, qué se descartó, qué espera a una persona.
2. `videos.json`: estado del video (`en-curso`, `entregado`), nunca re-renderizar
   un `entregado`.
3. Memoria del proyecto: solo hechos que un hilo nuevo tendría que volver a
   preguntar. Se actualiza el archivo del tema; no se crea uno nuevo por hecho.
4. `npm run grafo` si cambió código, y commit.

Lo que NO se guarda: lo que ya está en el código, en git o en CLAUDE.md; logs;
pasos intermedios de un render.
