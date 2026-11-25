# Graph Report - Videos-Next-Layer  (2026-11-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 670 nodes · 1205 edges · 30 communities (29 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.94)
- Token cost: 39,285 input · 420 output

## Graph Freshness
- Built from commit: `362b6577`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Lessons and Feedback
- Video Build Core
- Reel Skill Playbook
- Reel Pipeline Docs
- Package Dependencies
- Drive Clip Fetching
- Sound and Asset Selection
- Caption Sync
- Transcript Digest
- NPM Scripts
- Development Journal
- Clip Transcription
- TypeScript Config
- FFmpeg and Frame Tools
- Sound Design Rules
- HyperFrames Config
- Drive Setup README
- Cierre Package Config
- HyperFrames Agent Docs
- Cierre Agent Docs
- Production Workflow Guide
- Graph Build Script
- Whisper Transcription Setup
- Comedy and Timing Guide
- Context and Memory Docs
- Project Status Tracking
- Reel Quality Principles
- Font and Effect Diagnostics
- Subtitle Correction Notes
- Subtitle Verification Guide

## God Nodes (most connected - your core abstractions)
1. `scripts` - 33 edges
2. `Bitácora de decisiones` - 29 edges
3. `run()` - 21 edges
4. `main()` - 18 edges
5. `Reels de Next Layer` - 18 edges
6. `El flujo real de producción (Video 44, v1 a v3, 30-oct-2026)` - 16 edges
7. `VerticalReel()` - 14 edges
8. `syncCaptions()` - 14 edges
9. `compilerOptions` - 14 edges
10. `probe()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Gráfica: cinética, no diapositiva` --references--> `pop()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx
- `2026-10-29 · La marca de los reels pasa al Brand Book, con energía` --references--> `VerticalReel()`  [INFERRED]
  docs/journal.md → src/VerticalReel.tsx
- `5. Bancos de recursos (licencias verificadas)` --references--> `buscarLottie()`  [INFERRED]
  .claude/skills/reel-nextlayer/references/comedia-y-ritmo.md → scripts/lib/biblioteca.ts
- `2026-10-30 · Video 44, v2 y v3 — "poco cómico" y la instalación en el lugar equivocado` --references--> `buscarEfecto()`  [INFERRED]
  docs/journal.md → scripts/sfxCatalog.ts
- `La solución de fondo: transcribir el audio ya montado` --references--> `syncCaptions()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → scripts/syncCaptions.ts

## Import Cycles
- None detected.

## Communities (30 total, 1 thin omitted)

### Community 0 - "Lessons and Feedback"
Cohesion: 0.29
Nodes (6): Feedback de Cris sobre el Video 44 v3 (3-nov-2026), Gráfica, Herramientas, Lecciones ya pagadas, Plugins del proyecto, Tipografía

### Community 1 - "Video Build Core"
Cohesion: 0.05
Nodes (59): arg(), argv, flag(), loadTranscript(), main(), mergeRanges(), normalizar(), Plan (+51 more)

### Community 2 - "Reel Skill Playbook"
Cohesion: 0.14
Nodes (13): Antes que nada: mira el video, no los frames, Comandos, El cierre: HyperFrames, no React, El orden correcto de trabajo, Honestidad del contenido, Lo que hace que el cierre funcione, Música, Reels de Next Layer (+5 more)

### Community 3 - "Reel Pipeline Docs"
Cohesion: 0.05
Nodes (64): Contexto y memoria (leer `docs/contexto.md` antes de explorar), Directiva de dirección de arte y sonido, Entorno, "Haz el siguiente video", Instrucciones para el agente, Reglas del repositorio, Subtítulos y sincronía, Referencias del motor (+56 more)

### Community 4 - "Package Dependencies"
Cohesion: 0.05
Nodes (49): author, bugs, url, dependencies, dotenv@^17.4.2, googleapis@^178.0.0, lottie-web@5.13.0, react-dom@^19.2.8 (+41 more)

### Community 5 - "Drive Clip Fetching"
Cohesion: 0.07
Nodes (42): dotenv, fetchDriveClip(), FetchOptions, parseArgs(), pickMainClip(), cubreLatinBasico(), FaceMeta, FAMILIES (+34 more)

### Community 6 - "Sound and Asset Selection"
Cohesion: 0.06
Nodes (70): Sonido, arg(), argv, buscar(), Clip, conPlan(), fijarSfx(), Fila (+62 more)

### Community 7 - "Caption Sync"
Cohesion: 0.18
Nodes (13): 10. Render (background) y revisión de verdad, Material y transcripción, Jerga: lo que whisper no entiende suele ser lo mejor del video, Ojo: `npm run captions` suelto no es idempotente, 2026-10-30 · Video 44 "Mándamelo a hacer" — primer reel armado con el pool completo, alinearPorTexto(), argv, atempo() (+5 more)

### Community 8 - "Transcript Digest"
Cohesion: 0.08
Nodes (44): argv, dichoEn(), digest(), FUENTE, hoja(), leerTranscripcion(), mmss(), Palabra (+36 more)

### Community 9 - "NPM Scripts"
Cohesion: 0.06
Nodes (33): scripts, assets, audio, captions, check, cierre, color, dev (+25 more)

### Community 10 - "Development Journal"
Cohesion: 0.05
Nodes (40): 2026-09-04 · Qué se descartó y por qué, 2026-09-04 · Se evaluaron 3 herramientas externas de video (heygen-com/hyperframes,, 2026-09-04 · Video 46: elección de material y guion, 2026-09-05 · Diseño sonoro: dos errores que la usuaria detectó de oído, 2026-09-05 · El gancho real lo dijo la usuaria, no el modelo, 2026-09-05 · Se probó HyperFrames a fondo (la usuaria pidió meterlo "sí o sí") y se descartó, 2026-09-05 (tarde) · Se rehizo el tercio final. Y se corrigió el veredicto sobre, 2026-09-05 · Video 46 v2: se rehizo entero. El v1 estaba mal por omisión. (+32 more)

### Community 11 - "Clip Transcription"
Cohesion: 0.18
Nodes (16): 2026-09-04 · Detalles técnicos que costaron encontrar, alignWords(), arg(), argv, ClipTranscript, dropMarkers(), energyRanges(), main() (+8 more)

### Community 12 - "TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution (+7 more)

### Community 13 - "FFmpeg and Frame Tools"
Cohesion: 0.16
Nodes (14): arg(), argv, GIRO, main(), ffmpegCompleto(), tieneFiltros(), arg(), argv (+6 more)

### Community 14 - "Sound Design Rules"
Cohesion: 0.15
Nodes (13): 1. El sonido tiene que corresponder a lo que se ve, 2. El whoosh va en cada cambio de escena, y solo ahí, 3. Audio opaco, 4. Efectos sintetizados, 5. El mismo sonido repetido, 6. Un riser tiene que crecer y desembocar en algo, 7. El cross-fade encima las dos voces, 8. La velocidad no puede saltar dentro de una misma idea (+5 more)

### Community 15 - "HyperFrames Config"
Cohesion: 0.20
Nodes (9): authoringSkill, media, autoProxy, paths, assets, blocks, components, registry (+1 more)

### Community 16 - "Drive Setup README"
Cohesion: 0.20
Nodes (9): 1. Estructura esperada en Drive, 2. Credenciales de Google Cloud, 3. El flujo completo, 4. El plan de edición, 6. Retomar una sesión cortada, 7. Notas, Opción A — Service Account (recomendada para automatizar), Opción B — OAuth2 con tu cuenta (+1 more)

### Community 17 - "Cierre Package Config"
Cohesion: 0.22
Nodes (8): name, private, scripts, check, dev, publish, render, type

### Community 18 - "HyperFrames Agent Docs"
Cohesion: 0.25
Nodes (7): Commands, Documentation, HyperFrames Composition Project, Key Rules, Linting — ALWAYS RUN AFTER CHANGES, Project Structure, Skills — USE THESE FIRST

### Community 19 - "Cierre Agent Docs"
Cohesion: 0.25
Nodes (7): Commands, Documentation, HyperFrames Composition Project, Key Rules, Linting — ALWAYS RUN AFTER CHANGES, Project Structure, Skills — USE THESE FIRST

### Community 20 - "Production Workflow Guide"
Cohesion: 0.12
Nodes (15): 0. Contexto barato primero (2 min), 11. Panel de críticos sobre el render (la v2 → v3 del 44), 1. Bajar el POOL, no solo el siguiente video (15–25 min, en background), 2. Mirar cada hoja y escribir UNA línea por clip, 3. Transcribir tramo por tramo, y desconfiar igual, 4. Mapear historias, no carpetas, 5. Gancho: tres candidatos, una segunda opinión sin anclar, 6. Ventanas exactas con frames de verdad (+7 more)

### Community 22 - "Whisper Transcription Setup"
Cohesion: 0.29
Nodes (9): arg(), argv, ff(), framesDe(), main(), mejorLag(), muestras(), Shot (+1 more)

### Community 23 - "Comedy and Timing Guide"
Cohesion: 0.17
Nodes (11): 1. Primero la historia, después los cortes, 2. Estructura del chiste, 2b. Matices verificados (segunda pasada), 2c. Referente real: Humbe 3D (verificado), 3. Timing: dónde está el silencio, 4. Checklist de orden (corre esto antes de `npm run reel`), 5. Bancos de recursos (licencias verificadas), 6. Skills y repos revisados (abiertos uno por uno) (+3 more)

### Community 24 - "Context and Memory Docs"
Cohesion: 0.40
Nodes (4): El grafo (graphify), Fuentes y dónde están, Mapa de contexto de Next Layer, Protocolo de cierre (lo que mantiene todo al día)

### Community 25 - "Project Status Tracking"
Cohesion: 0.29
Nodes (9): listFiles(), main(), mtime(), nextStep(), Plan, PlanClip, ProjectState, readProjects() (+1 more)

### Community 26 - "Reel Quality Principles"
Cohesion: 0.29
Nodes (7): El gancho vive en los primeros 1,5 segundos, Gráfica: cinética, no diapositiva, La capa gráfica: se baja, y se elige para este video, La curva de energía, Marca en los reels: el Brand Book, con energía, Qué hace que un reel funcione, Ritmo

### Community 27 - "Font and Effect Diagnostics"
Cohesion: 0.50
Nodes (4): Cómo diagnosticar algo así, Efecto en la gráfica, Por qué existe ese comando, Tipografía: cargarla no es aplicarla

### Community 28 - "Subtitle Correction Notes"
Cohesion: 0.50
Nodes (4): 2026-09-17 · Versión final. El clip que estaba marcado `ignoreSpeech` tenía el mejor remate., Dos trampas nuevas, las dos ya con guardia, La cadena para que una corrección humana sobreviva, Verificado antes de entregar

### Community 29 - "Subtitle Verification Guide"
Cohesion: 0.67
Nodes (3): La solución de fondo: transcribir el audio ya montado, Por qué no alcanza con alinear sobre el audio original, Subtítulos: cómo verificar que calzan (y por qué se rompen)

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `syncCaptions()` connect `Caption Sync` to `Video Build Core`, `Reel Pipeline Docs`, `Subtitle Correction Notes`, `Subtitle Verification Guide`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Should `Video Build Core` be split into smaller, more focused modules?**
  _Cohesion score 0.054274084124830396 - nodes in this community are weakly interconnected._
- **Why does `Bitácora de decisiones` connect `Development Journal` to `Reel Pipeline Docs`, `Clip Transcription`, `Subtitle Correction Notes`, `Caption Sync`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `Reel Skill Playbook` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `Reels de Next Layer` connect `Reel Skill Playbook` to `Reel Pipeline Docs`, `Caption Sync`, `Sound Design Rules`, `Reel Quality Principles`, `Font and Effect Diagnostics`, `Subtitle Verification Guide`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Should `Reel Pipeline Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05254901960784314 - nodes in this community are weakly interconnected._