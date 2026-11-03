#!/usr/bin/env bash
# Regenera el grafo de conocimiento del repo (graphify). Código + encabezados de
# los .md, sin LLM. Si hay `claude` en el PATH, nombra las comunidades con una
# llamada corta a Haiku; si no, quedan con el nombre de su archivo más conectado.
# Uso: npm run grafo            → incremental (solo archivos cambiados)
#      npm run grafo -- --force → desde cero (tras borrar o mover mucho código)
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v graphify >/dev/null 2>&1; then
  if command -v uv >/dev/null 2>&1; then uv tool install graphifyy >/dev/null
  else pip install --quiet graphifyy; fi
fi
if [ "${1:-}" = "--force" ]; then
  GRAPHIFY_FORCE=1 graphify extract . --code-only --no-cluster --force >/dev/null
fi
graphify update . 2>&1 | grep -E 'Rebuilt|warning|error' || true
if command -v claude >/dev/null 2>&1 && [ -z "${GRAFO_SIN_LLM:-}" ]; then
  GRAPHIFY_CLAUDE_CLI_MODEL=haiku timeout 240 graphify label . --backend claude-cli --batch-size 40 2>&1 | tail -1 || echo "etiquetas: no se pudo (sigue con nombres de archivo)"
fi
rm -rf graphify-out/20*/
python3 -I -c 'import json;g=json.load(open("graphify-out/graph.json"));print("grafo:",len(g["nodes"]),"nodos",len(g["links"]),"aristas",len({n.get("community") for n in g["nodes"]}),"comunidades")'
echo "commit: $(git rev-parse --short HEAD)  → revisa graphify-out/GRAPH_REPORT.md"
