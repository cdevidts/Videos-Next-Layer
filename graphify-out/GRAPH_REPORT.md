# Graph Report - Videos-Next-Layer  (2026-11-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 611 nodes · 1128 edges · 27 communities (26 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.93)
- Token cost: 49,634 input · 365 output

## Graph Freshness
- Built from commit: `0d761607`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Plan build and transcript loading
- Audio sync and probing
- Font and audio extraction
- Reel pipeline instructions
- Package dependencies
- Drive clip fetching
- Asset and overlay selection
- Reels skill playbook
- Transcript digest builder
- npm script commands
- Project decision journal
- Transcription and energy analysis
- TypeScript configuration
- Lessons learned and tooling
- Audio design rules
- HyperFrames configuration
- Drive setup README
- Cierre package scripts
- AGENTS.md HyperFrames guide
- Cierre CLAUDE.md guide
- Pace and speed adjustment
- Graph build script
- Caption sync and timing
- Reel hook and graphics craft
- Project context map
- Font and effect diagnostics
- Video verification notes

## God Nodes (most connected - your core abstractions)
1. `scripts` - 31 edges
2. `Bitácora de decisiones` - 23 edges
3. `run()` - 21 edges
4. `VerticalReel()` - 19 edges
5. `main()` - 17 edges
6. `Reels de Next Layer` - 16 edges
7. `compilerOptions` - 14 edges
8. `probe()` - 13 edges
9. `fetchDriveClip()` - 12 edges
10. `conPlan()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `La cadena para que una corrección humana sobreviva` --references--> `syncCaptions()`  [INFERRED]
  docs/journal.md → scripts/syncCaptions.ts
- `Gráfica: cinética, no diapositiva` --references--> `pop()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx
- `6. Un riser tiene que crecer y desembocar en algo` --references--> `VerticalReel()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx
- `Jerarquía de audio (no se negocia)` --references--> `VerticalReel()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx
- `Lo que hace que el cierre funcione` --references--> `VerticalReel()`  [INFERRED]
  .claude/skills/reel-nextlayer/SKILL.md → src/VerticalReel.tsx

## Import Cycles
- None detected.

## Communities (27 total, 1 thin omitted)

### Community 0 - "Plan build and transcript loading"
Cohesion: 0.11
Nodes (28): arg(), argv, flag(), loadTranscript(), main(), mergeRanges(), normalizar(), Plan (+20 more)

### Community 1 - "Audio sync and probing"
Cohesion: 0.08
Nodes (40): arg(), argv, ff(), main(), mejorLag(), muestras(), Shot, Word (+32 more)

### Community 2 - "Font and audio extraction"
Cohesion: 0.08
Nodes (26): main(), paginaHtml(), argv, AUDIO_EXTENSIONS, audioDir, files, hqDir, projectDir (+18 more)

### Community 3 - "Reel pipeline instructions"
Cohesion: 0.05
Nodes (65): Contexto y memoria (leer `docs/contexto.md` antes de explorar), Directiva de dirección de arte y sonido, Entorno, "Haz el siguiente video", Instrucciones para el agente, Reglas del repositorio, Referencias del motor, Verificar antes de entregar (+57 more)

### Community 4 - "Package dependencies"
Cohesion: 0.05
Nodes (48): author, bugs, url, dependencies, googleapis@^178.0.0, lottie-web@5.13.0, react-dom@^19.2.8, @remotion/cli@^4.0.520 (+40 more)

### Community 5 - "Drive clip fetching"
Cohesion: 0.07
Nodes (50): dotenv@^17.4.2, dotenv, fetchDriveClip(), FetchOptions, parseArgs(), pickMainClip(), AssetKind, AUDIO_EXTENSIONS (+42 more)

### Community 6 - "Asset and overlay selection"
Cohesion: 0.07
Nodes (61): arg(), argv, buscar(), Clip, conPlan(), fijarSfx(), Fila, hojaCandidatos() (+53 more)

### Community 7 - "Reels skill playbook"
Cohesion: 0.18
Nodes (10): Antes que nada: mira el video, no los frames, Comandos, El cierre: HyperFrames, no React, El orden correcto de trabajo, Honestidad del contenido, Lo que hace que el cierre funcione, Música, Reels de Next Layer (+2 more)

### Community 8 - "Transcript digest builder"
Cohesion: 0.11
Nodes (30): argv, dichoEn(), digest(), FUENTE, hoja(), leerTranscripcion(), mmss(), Palabra (+22 more)

### Community 9 - "npm script commands"
Cohesion: 0.06
Nodes (31): scripts, assets, audio, captions, check, cierre, color, dev (+23 more)

### Community 10 - "Project decision journal"
Cohesion: 0.06
Nodes (32): 2026-09-04 · Qué se descartó y por qué, 2026-09-04 · Se evaluaron 3 herramientas externas de video (heygen-com/hyperframes,, 2026-09-04 · Video 46: elección de material y guion, 2026-09-05 · Diseño sonoro: dos errores que la usuaria detectó de oído, 2026-09-05 · El gancho real lo dijo la usuaria, no el modelo, 2026-09-05 · Se probó HyperFrames a fondo (la usuaria pidió meterlo "sí o sí") y se descartó, 2026-09-05 (tarde) · Se rehizo el tercio final. Y se corrigió el veredicto sobre, 2026-09-05 · Video 46 v2: se rehizo entero. El v1 estaba mal por omisión. (+24 more)

### Community 11 - "Transcription and energy analysis"
Cohesion: 0.18
Nodes (16): 2026-09-04 · Detalles técnicos que costaron encontrar, alignWords(), arg(), argv, ClipTranscript, dropMarkers(), energyRanges(), main() (+8 more)

### Community 12 - "TypeScript configuration"
Cohesion: 0.12
Nodes (15): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution (+7 more)

### Community 13 - "Lessons learned and tooling"
Cohesion: 0.25
Nodes (7): Gráfica, Herramientas, Lecciones ya pagadas, Material y transcripción, Plugins del proyecto, Sonido, Tipografía

### Community 14 - "Audio design rules"
Cohesion: 0.17
Nodes (12): 1. El sonido tiene que corresponder a lo que se ve, 2. El whoosh va en cada cambio de escena, y solo ahí, 3. Audio opaco, 4. Efectos sintetizados, 5. El mismo sonido repetido, 6. Un riser tiene que crecer y desembocar en algo, 7. El cross-fade encima las dos voces, 8. La velocidad no puede saltar dentro de una misma idea (+4 more)

### Community 15 - "HyperFrames configuration"
Cohesion: 0.20
Nodes (9): authoringSkill, media, autoProxy, paths, assets, blocks, components, registry (+1 more)

### Community 16 - "Drive setup README"
Cohesion: 0.20
Nodes (9): 1. Estructura esperada en Drive, 2. Credenciales de Google Cloud, 3. El flujo completo, 4. El plan de edición, 6. Retomar una sesión cortada, 7. Notas, Opción A — Service Account (recomendada para automatizar), Opción B — OAuth2 con tu cuenta (+1 more)

### Community 17 - "Cierre package scripts"
Cohesion: 0.22
Nodes (8): name, private, scripts, check, dev, publish, render, type

### Community 18 - "AGENTS.md HyperFrames guide"
Cohesion: 0.25
Nodes (7): Commands, Documentation, HyperFrames Composition Project, Key Rules, Linting — ALWAYS RUN AFTER CHANGES, Project Structure, Skills — USE THESE FIRST

### Community 19 - "Cierre CLAUDE.md guide"
Cohesion: 0.25
Nodes (7): Commands, Documentation, HyperFrames Composition Project, Key Rules, Linting — ALWAYS RUN AFTER CHANGES, Project Structure, Skills — USE THESE FIRST

### Community 20 - "Pace and speed adjustment"
Cohesion: 0.25
Nodes (6): Ritmo: acelerar lo que no se mueve, argv, atempo(), Shot, WHISPER_PATH, Word

### Community 22 - "Caption sync and timing"
Cohesion: 0.29
Nodes (7): Subtítulos y sincronía, Jerga: lo que whisper no entiende suele ser lo mejor del video, La solución de fondo: transcribir el audio ya montado, Ojo: `npm run captions` suelto no es idempotente, Por qué no alcanza con alinear sobre el audio original, Subtítulos: cómo verificar que calzan (y por qué se rompen), syncCaptions()

### Community 23 - "Reel hook and graphics craft"
Cohesion: 0.29
Nodes (7): El gancho vive en los primeros 1,5 segundos, Gráfica: cinética, no diapositiva, La capa gráfica: se baja, y se elige para este video, La curva de energía, Marca en los reels: el Brand Book, con energía, Qué hace que un reel funcione, Ritmo

### Community 24 - "Project context map"
Cohesion: 0.40
Nodes (4): El grafo (graphify), Fuentes y dónde están, Mapa de contexto de Next Layer, Protocolo de cierre (lo que mantiene todo al día)

### Community 25 - "Font and effect diagnostics"
Cohesion: 0.50
Nodes (4): Cómo diagnosticar algo así, Efecto en la gráfica, Por qué existe ese comando, Tipografía: cargarla no es aplicarla

### Community 26 - "Video verification notes"
Cohesion: 0.50
Nodes (4): 2026-09-17 · Versión final. El clip que estaba marcado `ignoreSpeech` tenía el mejor remate., Dos trampas nuevas, las dos ya con guardia, La cadena para que una corrección humana sobreviva, Verificado antes de entregar

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VerticalReel()` connect `Reel pipeline instructions` to `Project decision journal`, `Audio design rules`, `Reels skill playbook`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `Plan build and transcript loading` be split into smaller, more focused modules?**
  _Cohesion score 0.10685483870967742 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `npm script commands` to `Package dependencies`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Should `Audio sync and probing` be split into smaller, more focused modules?**
  _Cohesion score 0.08067375886524823 - nodes in this community are weakly interconnected._
- **Why does `Bitácora de decisiones` connect `Project decision journal` to `Reel pipeline instructions`, `Video verification notes`, `Transcription and energy analysis`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Should `Font and audio extraction` be split into smaller, more focused modules?**
  _Cohesion score 0.07563025210084033 - nodes in this community are weakly interconnected._
- **Should `Reel pipeline instructions` be split into smaller, more focused modules?**
  _Cohesion score 0.05228105228105228 - nodes in this community are weakly interconnected._