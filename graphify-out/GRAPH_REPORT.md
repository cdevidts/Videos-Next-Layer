# Graph Report - Videos-Next-Layer  (2026-11-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 654 nodes · 1200 edges · 32 communities (31 shown, 1 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.94)
- Token cost: 50,308 input · 465 output

## Graph Freshness
- Built from commit: `859ec474`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Lessons and Video 44 feedback
- Color matching and analysis
- Font and sound fetching
- Remotion reel rendering and captions
- Package dependencies and metadata
- Google Drive clip fetching
- Asset and plan helpers
- Reel production playbook
- Pipeline status and clip checks
- npm script commands
- Project decision journal
- Clip transcription and energy
- TypeScript compiler configuration
- Frame and transcript tooling
- Sound design rules
- HyperFrames configuration
- Drive setup and workflow README
- Closing package scripts
- AGENTS.md HyperFrames guidance
- Closing CLAUDE.md HyperFrames guidance
- Production workflow for reels
- Graph regeneration script
- Audio sync checking
- Audio extraction from video
- Context map and closing protocol
- Project status reporting
- Watch and review reel output
- Repo CLAUDE.md agent instructions
- Subtitle processing
- Reel review tooling
- Media normalization and ffmpeg
- Closing HTML generation

## God Nodes (most connected - your core abstractions)
1. `scripts` - 33 edges
2. `Bitácora de decisiones` - 27 edges
3. `run()` - 21 edges
4. `VerticalReel()` - 19 edges
5. `main()` - 18 edges
6. `Reels de Next Layer` - 17 edges
7. `El flujo real de producción (Video 44, v1 a v3, 30-oct-2026)` - 16 edges
8. `syncCaptions()` - 14 edges
9. `compilerOptions` - 14 edges
10. `probe()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Directiva de dirección de arte y sonido` --references--> `VerticalReel()`  [INFERRED]
  CLAUDE.md → src/VerticalReel.tsx
- `6. Un riser tiene que crecer y desembocar en algo` --references--> `VerticalReel()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx
- `Jerarquía de audio (no se negocia)` --references--> `VerticalReel()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx
- `Lo que hace que el cierre funcione` --references--> `VerticalReel()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx
- `La cadena para que una corrección humana sobreviva` --references--> `syncCaptions()`  [INFERRED]
  docs/journal.md → scripts/syncCaptions.ts

## Import Cycles
- None detected.

## Communities (32 total, 1 thin omitted)

### Community 0 - "Lessons and Video 44 feedback"
Cohesion: 0.07
Nodes (40): Feedback de Cris sobre el Video 44 v3 (3-nov-2026), Gráfica, Herramientas, Lecciones ya pagadas, Plugins del proyecto, Sonido, Tipografía, fijarSfx() (+32 more)

### Community 1 - "Color matching and analysis"
Cohesion: 0.33
Nodes (10): run(), acotar(), analyze(), arg(), argv, ColorStats, escalaDe(), filterFor() (+2 more)

### Community 2 - "Font and sound fetching"
Cohesion: 0.18
Nodes (9): main(), paginaHtml(), cubreLatinBasico(), FaceMeta, FAMILIES, main(), parseBlocks(), MUSIC (+1 more)

### Community 3 - "Remotion reel rendering and captions"
Cohesion: 0.06
Nodes (63): Subtítulos y sincronía, Gráfica: cinética, no diapositiva, Referencias del motor, 2026-09-05 · Se instaló la skill oficial de Remotion, 2026-10-29 · La marca de los reels pasa al Brand Book, con energía, 2026-10-30 · Video 44, v2 y v3 — "poco cómico" y la instalación en el lugar equivocado, con medición. De paso apareció un bug real de tipografías que llevaba varios renders., El desfase de audio: no existía, y perseguirlo enseñó algo (+55 more)

### Community 4 - "Package dependencies and metadata"
Cohesion: 0.05
Nodes (50): author, bugs, url, dependencies, dotenv@^17.4.2, googleapis@^178.0.0, lottie-web@5.13.0, react-dom@^19.2.8 (+42 more)

### Community 5 - "Google Drive clip fetching"
Cohesion: 0.08
Nodes (41): fetchDriveClip(), FetchOptions, pickMainClip(), AssetKind, AUDIO_EXTENSIONS, classifyAsset(), downloadFile(), DRIVE_SCOPES (+33 more)

### Community 6 - "Asset and plan helpers"
Cohesion: 0.09
Nodes (51): arg(), argv, buscar(), Clip, conPlan(), Fila, hojaCandidatos(), hojaFilas() (+43 more)

### Community 7 - "Reel production playbook"
Cohesion: 0.06
Nodes (38): 10. Render (background) y revisión de verdad, Material y transcripción, Antes que nada: mira el video, no los frames, Comandos, Cómo diagnosticar algo así, Efecto en la gráfica, El cierre: HyperFrames, no React, El gancho vive en los primeros 1,5 segundos (+30 more)

### Community 8 - "Pipeline status and clip checks"
Cohesion: 0.08
Nodes (38): 2026-09-24 · El pipeline pasa a ser agéntico: "haz el siguiente video", Descartado, con razón, Drive: el bloqueo de semanas no existía, Gráfica y sonido desde APIs, elegidos por video, La regla de ingreso, en código, Pendiente, Tokens, Verificado (+30 more)

### Community 9 - "npm script commands"
Cohesion: 0.06
Nodes (33): scripts, assets, audio, captions, check, cierre, color, dev (+25 more)

### Community 10 - "Project decision journal"
Cohesion: 0.07
Nodes (28): 2026-09-04 · Qué se descartó y por qué, 2026-09-04 · Se evaluaron 3 herramientas externas de video (heygen-com/hyperframes,, 2026-09-04 · Video 46: elección de material y guion, 2026-09-05 · Diseño sonoro: dos errores que la usuaria detectó de oído, 2026-09-05 · El gancho real lo dijo la usuaria, no el modelo, 2026-09-05 · Se probó HyperFrames a fondo (la usuaria pidió meterlo "sí o sí") y se descartó, 2026-09-05 (tarde) · Se rehizo el tercio final. Y se corrigió el veredicto sobre, 2026-09-05 · Video 46 v2: se rehizo entero. El v1 estaba mal por omisión. (+20 more)

### Community 11 - "Clip transcription and energy"
Cohesion: 0.18
Nodes (16): 2026-09-04 · Detalles técnicos que costaron encontrar, alignWords(), arg(), argv, ClipTranscript, dropMarkers(), energyRanges(), main() (+8 more)

### Community 12 - "TypeScript compiler configuration"
Cohesion: 0.12
Nodes (15): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution (+7 more)

### Community 13 - "Frame and transcript tooling"
Cohesion: 0.16
Nodes (14): arg(), argv, GIRO, main(), ffmpegCompleto(), tieneFiltros(), arg(), argv (+6 more)

### Community 14 - "Sound design rules"
Cohesion: 0.17
Nodes (12): 1. El sonido tiene que corresponder a lo que se ve, 2. El whoosh va en cada cambio de escena, y solo ahí, 3. Audio opaco, 4. Efectos sintetizados, 5. El mismo sonido repetido, 6. Un riser tiene que crecer y desembocar en algo, 7. El cross-fade encima las dos voces, 8. La velocidad no puede saltar dentro de una misma idea (+4 more)

### Community 15 - "HyperFrames configuration"
Cohesion: 0.20
Nodes (9): authoringSkill, media, autoProxy, paths, assets, blocks, components, registry (+1 more)

### Community 16 - "Drive setup and workflow README"
Cohesion: 0.20
Nodes (9): 1. Estructura esperada en Drive, 2. Credenciales de Google Cloud, 3. El flujo completo, 4. El plan de edición, 6. Retomar una sesión cortada, 7. Notas, Opción A — Service Account (recomendada para automatizar), Opción B — OAuth2 con tu cuenta (+1 more)

### Community 17 - "Closing package scripts"
Cohesion: 0.22
Nodes (8): name, private, scripts, check, dev, publish, render, type

### Community 18 - "AGENTS.md HyperFrames guidance"
Cohesion: 0.25
Nodes (7): Commands, Documentation, HyperFrames Composition Project, Key Rules, Linting — ALWAYS RUN AFTER CHANGES, Project Structure, Skills — USE THESE FIRST

### Community 19 - "Closing CLAUDE.md HyperFrames guidance"
Cohesion: 0.25
Nodes (7): Commands, Documentation, HyperFrames Composition Project, Key Rules, Linting — ALWAYS RUN AFTER CHANGES, Project Structure, Skills — USE THESE FIRST

### Community 20 - "Production workflow for reels"
Cohesion: 0.12
Nodes (15): 0. Contexto barato primero (2 min), 11. Panel de críticos sobre el render (la v2 → v3 del 44), 1. Bajar el POOL, no solo el siguiente video (15–25 min, en background), 2. Mirar cada hoja y escribir UNA línea por clip, 3. Transcribir tramo por tramo, y desconfiar igual, 4. Mapear historias, no carpetas, 5. Gancho: tres candidatos, una segunda opinión sin anclar, 6. Ventanas exactas con frames de verdad (+7 more)

### Community 22 - "Audio sync checking"
Cohesion: 0.33
Nodes (9): arg(), argv, ff(), framesDe(), main(), mejorLag(), muestras(), Shot (+1 more)

### Community 23 - "Audio extraction from video"
Cohesion: 0.20
Nodes (8): argv, AUDIO_EXTENSIONS, audioDir, files, hqDir, projectDir, VIDEO_EXTENSIONS, vocesEnOff()

### Community 24 - "Context map and closing protocol"
Cohesion: 0.40
Nodes (4): El grafo (graphify), Fuentes y dónde están, Mapa de contexto de Next Layer, Protocolo de cierre (lo que mantiene todo al día)

### Community 25 - "Project status reporting"
Cohesion: 0.29
Nodes (9): listFiles(), main(), mtime(), nextStep(), Plan, PlanClip, ProjectState, readProjects() (+1 more)

### Community 26 - "Watch and review reel output"
Cohesion: 0.33
Nodes (7): argv, ffmpeg(), flag(), main(), mmss(), niveles(), Palabra

### Community 27 - "Repo CLAUDE.md agent instructions"
Cohesion: 0.25
Nodes (7): Contexto y memoria (leer `docs/contexto.md` antes de explorar), Directiva de dirección de arte y sonido, Entorno, "Haz el siguiente video", Instrucciones para el agente, Reglas del repositorio, Verificar antes de entregar

### Community 28 - "Subtitle processing"
Cohesion: 0.43
Nodes (7): parseArgs(), arg(), argv, flag(), loadSubtitles(), main(), SubtitleCue

### Community 29 - "Reel review tooling"
Cohesion: 0.43
Nodes (7): probe(), arg(), argv, levelBar(), main(), resolveInput(), rmsWindows()

### Community 30 - "Media normalization and ffmpeg"
Cohesion: 0.48
Nodes (6): ffmpegCommand(), filtroGiro(), Giro, hasSystemFfmpeg(), MediaInfo, normalize()

### Community 31 - "Closing HTML generation"
Cohesion: 0.40
Nodes (5): archivoCierre(), asegurarCierre(), HTML, Plan, RAIZ

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `syncCaptions()` connect `Reel production playbook` to `Color matching and analysis`, `Project decision journal`, `Remotion reel rendering and captions`, `Asset and plan helpers`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Should `Lessons and Video 44 feedback` be split into smaller, more focused modules?**
  _Cohesion score 0.07373737373737374 - nodes in this community are weakly interconnected._
- **Why does `Bitácora de decisiones` connect `Project decision journal` to `Remotion reel rendering and captions`, `Pipeline status and clip checks`, `Clip transcription and energy`, `Reel production playbook`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `Remotion reel rendering and captions` be split into smaller, more focused modules?**
  _Cohesion score 0.05621621621621622 - nodes in this community are weakly interconnected._
- **Why does `VerticalReel()` connect `Remotion reel rendering and captions` to `Repo CLAUDE.md agent instructions`, `Sound design rules`, `Reel production playbook`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `Package dependencies and metadata` be split into smaller, more focused modules?**
  _Cohesion score 0.05203619909502263 - nodes in this community are weakly interconnected._
- **Should `Google Drive clip fetching` be split into smaller, more focused modules?**
  _Cohesion score 0.08163265306122448 - nodes in this community are weakly interconnected._