# Graph Report - Videos-Next-Layer  (2026-10-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 603 nodes · 1119 edges · 22 communities (21 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.93)
- Token cost: 46,924 input · 327 output

## Graph Freshness
- Built from commit: `163c3086`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Plan and reel building
- Whisper transcription and audio alignment
- Audio extraction and font checks
- Remotion composition and fonts
- Project dependencies and package metadata
- Google Drive clip fetching
- Asset fetching and plan checks
- Next Layer reel playbook
- Agentic pipeline and decision log
- npm pipeline scripts
- Development journal and decisions
- Clip transcription and energy ranges
- TypeScript compiler configuration
- Google Drive source access
- Reel sound design rules
- HyperFrames project configuration
- Drive setup and pipeline README
- Cierre package scripts
- HyperFrames agent instructions
- Cierre agent instructions
- Agent instructions for reels
- Graph generation script

## God Nodes (most connected - your core abstractions)
1. `scripts` - 31 edges
2. `run()` - 21 edges
3. `Bitácora de decisiones` - 21 edges
4. `VerticalReel()` - 18 edges
5. `main()` - 17 edges
6. `Reels de Next Layer` - 16 edges
7. `compilerOptions` - 14 edges
8. `probe()` - 13 edges
9. `fetchDriveClip()` - 12 edges
10. `conPlan()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Gráfica: cinética, no diapositiva` --references--> `pop()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx
- `Directiva de dirección de arte y sonido` --references--> `VerticalReel()`  [INFERRED]
  CLAUDE.md → src/VerticalReel.tsx
- `6. Un riser tiene que crecer y desembocar en algo` --references--> `VerticalReel()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx
- `Jerarquía de audio (no se negocia)` --references--> `VerticalReel()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx
- `Lo que hace que el cierre funcione` --references--> `VerticalReel()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx

## Import Cycles
- None detected.

## Communities (22 total, 1 thin omitted)

### Community 0 - "Plan and reel building"
Cohesion: 0.07
Nodes (46): fijarSfx(), arg(), argv, flag(), loadTranscript(), main(), mergeRanges(), normalizar() (+38 more)

### Community 1 - "Whisper transcription and audio alignment"
Cohesion: 0.13
Nodes (22): @remotion/install-whisper-cpp@^4.0.520, @remotion/install-whisper-cpp, hojaCandidatos(), hojaFilas(), arg(), argv, ff(), main() (+14 more)

### Community 2 - "Audio extraction and font checks"
Cohesion: 0.06
Nodes (35): main(), paginaHtml(), argv, AUDIO_EXTENSIONS, audioDir, files, hqDir, projectDir (+27 more)

### Community 3 - "Remotion composition and fonts"
Cohesion: 0.06
Nodes (56): Referencias del motor, 2026-09-05 · Se instaló la skill oficial de Remotion, con medición. De paso apareció un bug real de tipografías que llevaba varios renders., react@^19.2.8, remotion@^4.0.520, 5. Composiciones, Sistema gráfico de `VerticalReel`, react (+48 more)

### Community 4 - "Project dependencies and package metadata"
Cohesion: 0.05
Nodes (47): author, bugs, url, dependencies, dotenv@^17.4.2, googleapis@^178.0.0, lottie-web@5.13.0, react-dom@^19.2.8 (+39 more)

### Community 5 - "Google Drive clip fetching"
Cohesion: 0.07
Nodes (47): dotenv, fetchDriveClip(), FetchOptions, parseArgs(), pickMainClip(), AssetKind, AUDIO_EXTENSIONS, classifyAsset() (+39 more)

### Community 6 - "Asset fetching and plan checks"
Cohesion: 0.10
Nodes (42): arg(), argv, buscar(), Clip, conPlan(), Fila, main(), Overlay (+34 more)

### Community 7 - "Next Layer reel playbook"
Cohesion: 0.05
Nodes (40): Gráfica, Herramientas, Lecciones ya pagadas, Material y transcripción, Plugins del proyecto, Sonido, Subtítulos y sincronía, Tipografía (+32 more)

### Community 8 - "Agentic pipeline and decision log"
Cohesion: 0.08
Nodes (39): 2026-09-24 · El pipeline pasa a ser agéntico: "haz el siguiente video", Descartado, con razón, Drive: el bloqueo de semanas no existía, Gráfica y sonido desde APIs, elegidos por video, La regla de ingreso, en código, Pendiente, Tokens, Verificado (+31 more)

### Community 9 - "npm pipeline scripts"
Cohesion: 0.06
Nodes (31): scripts, assets, audio, captions, check, cierre, color, dev (+23 more)

### Community 10 - "Development journal and decisions"
Cohesion: 0.07
Nodes (28): 2026-09-04 · Detalles técnicos que costaron encontrar, 2026-09-04 · Qué se descartó y por qué, 2026-09-04 · Se evaluaron 3 herramientas externas de video (heygen-com/hyperframes,, 2026-09-04 · Video 46: elección de material y guion, 2026-09-05 · Diseño sonoro: dos errores que la usuaria detectó de oído, 2026-09-05 · El gancho real lo dijo la usuaria, no el modelo, 2026-09-05 · Se probó HyperFrames a fondo (la usuaria pidió meterlo "sí o sí") y se descartó, 2026-09-05 (tarde) · Se rehizo el tercio final. Y se corrigió el veredicto sobre (+20 more)

### Community 11 - "Clip transcription and energy ranges"
Cohesion: 0.19
Nodes (15): alignWords(), arg(), argv, ClipTranscript, dropMarkers(), energyRanges(), main(), Range (+7 more)

### Community 12 - "TypeScript compiler configuration"
Cohesion: 0.12
Nodes (15): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution (+7 more)

### Community 13 - "Google Drive source access"
Cohesion: 0.25
Nodes (14): getDriveClient(), abrirFuente(), bajarPublica(), conReintentos(), decodificar(), Entrada, esperar(), Fuente (+6 more)

### Community 14 - "Reel sound design rules"
Cohesion: 0.17
Nodes (12): 1. El sonido tiene que corresponder a lo que se ve, 2. El whoosh va en cada cambio de escena, y solo ahí, 3. Audio opaco, 4. Efectos sintetizados, 5. El mismo sonido repetido, 6. Un riser tiene que crecer y desembocar en algo, 7. El cross-fade encima las dos voces, 8. La velocidad no puede saltar dentro de una misma idea (+4 more)

### Community 15 - "HyperFrames project configuration"
Cohesion: 0.20
Nodes (9): authoringSkill, media, autoProxy, paths, assets, blocks, components, registry (+1 more)

### Community 16 - "Drive setup and pipeline README"
Cohesion: 0.20
Nodes (9): 1. Estructura esperada en Drive, 2. Credenciales de Google Cloud, 3. El flujo completo, 4. El plan de edición, 6. Retomar una sesión cortada, 7. Notas, Opción A — Service Account (recomendada para automatizar), Opción B — OAuth2 con tu cuenta (+1 more)

### Community 17 - "Cierre package scripts"
Cohesion: 0.22
Nodes (8): name, private, scripts, check, dev, publish, render, type

### Community 18 - "HyperFrames agent instructions"
Cohesion: 0.25
Nodes (7): Commands, Documentation, HyperFrames Composition Project, Key Rules, Linting — ALWAYS RUN AFTER CHANGES, Project Structure, Skills — USE THESE FIRST

### Community 19 - "Cierre agent instructions"
Cohesion: 0.25
Nodes (7): Commands, Documentation, HyperFrames Composition Project, Key Rules, Linting — ALWAYS RUN AFTER CHANGES, Project Structure, Skills — USE THESE FIRST

### Community 20 - "Agent instructions for reels"
Cohesion: 0.25
Nodes (7): Contexto y memoria (leer `docs/contexto.md` antes de explorar), Directiva de dirección de arte y sonido, Entorno, "Haz el siguiente video", Instrucciones para el agente, Reglas del repositorio, Verificar antes de entregar

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VerticalReel()` connect `Remotion composition and fonts` to `Development journal and decisions`, `Agent instructions for reels`, `Reel sound design rules`, `Next Layer reel playbook`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `Plan and reel building` be split into smaller, more focused modules?**
  _Cohesion score 0.07450980392156863 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `npm pipeline scripts` to `Project dependencies and package metadata`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `Whisper transcription and audio alignment` be split into smaller, more focused modules?**
  _Cohesion score 0.12535612535612536 - nodes in this community are weakly interconnected._
- **Why does `Bitácora de decisiones` connect `Development journal and decisions` to `Agentic pipeline and decision log`, `Remotion composition and fonts`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `Audio extraction and font checks` be split into smaller, more focused modules?**
  _Cohesion score 0.06262626262626263 - nodes in this community are weakly interconnected._
- **Should `Remotion composition and fonts` be split into smaller, more focused modules?**
  _Cohesion score 0.06277436347673397 - nodes in this community are weakly interconnected._