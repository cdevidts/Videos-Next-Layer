#!/usr/bin/env bash
#
# Deja OmniRoute (gateway local, MIT) listo como alternativa a Claude Code,
# SIN tocar tu comando `claude` de siempre.
#
#   bash scripts/setup-omniroute.sh install          # instala y levanta el gateway
#   bash scripts/setup-omniroute.sh link --key XXX   # crea el comando `claude-omni`
#   bash scripts/setup-omniroute.sh status           # ¿está arriba? ¿está enlazado?
#   bash scripts/setup-omniroute.sh revert           # borra todo lo que dejó este script
#
# Por qué un comando aparte y no una variable global: si el gateway está apagado
# y `claude` apunta a él, Claude Code deja de responder sin explicar por qué.
# Con `claude-omni` eso no puede pasar: `claude` nunca cambia.
#
# Con --global sí se enlaza de forma global (no recomendado, pero está).
set -euo pipefail

HOME_DIR="${HOME}"
CONF_DIR="${HOME_DIR}/.omniroute"
ENV_FILE="${CONF_DIR}/env"
LOG_FILE="${CONF_DIR}/gateway.log"
BIN_DIR="${HOME_DIR}/.local/bin"
WRAPPER="${BIN_DIR}/claude-omni"
SETTINGS="${HOME_DIR}/.claude/settings.json"

PORT="${OMNIROUTE_PORT:-20128}"
KEY=""
GLOBAL=0
COMMAND="${1:-status}"
[ $# -gt 0 ] && shift || true

while [ $# -gt 0 ]; do
  case "$1" in
    --key) KEY="${2:-}"; shift 2 ;;
    --port) PORT="${2:-20128}"; shift 2 ;;
    --global) GLOBAL=1; shift ;;
    *) echo "Opción desconocida: $1" >&2; exit 1 ;;
  esac
done

BASE_URL="http://localhost:${PORT}/v1"

say() { printf '%s\n' "$*"; }

gateway_up() {
  curl -sf --max-time 3 "http://localhost:${PORT}/" >/dev/null 2>&1
}

wait_for_gateway() {
  local i
  for i in $(seq 1 40); do
    gateway_up && return 0
    sleep 1
  done
  return 1
}

start_gateway() {
  gateway_up && { say "✅ El gateway ya estaba arriba en el puerto ${PORT}"; return 0; }
  mkdir -p "${CONF_DIR}"
  say "🚀 Levantando el gateway en el puerto ${PORT}..."
  (PORT="${PORT}" nohup omniroute >>"${LOG_FILE}" 2>&1 &) >/dev/null 2>&1
  if wait_for_gateway; then
    say "✅ Gateway arriba: http://localhost:${PORT}"
  else
    say "❌ No respondió en 40s. Log: ${LOG_FILE}"
    return 1
  fi
}

# Escribe el bloque env de ~/.claude/settings.json con node, respaldando antes.
patch_settings() {
  local mode="$1"
  [ -f "${SETTINGS}" ] || { mkdir -p "$(dirname "${SETTINGS}")"; printf '{}\n' >"${SETTINGS}"; }
  cp "${SETTINGS}" "${SETTINGS}.bak.$(date +%Y%m%d%H%M%S)"
  MODE="${mode}" BASE_URL="${BASE_URL}" KEY="${KEY}" SETTINGS="${SETTINGS}" node -e '
    const fs = require("fs");
    const file = process.env.SETTINGS;
    let settings = {};
    try {
      settings = JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    } catch (error) {
      console.error("El settings.json no es JSON válido; no se tocó nada.");
      process.exit(1);
    }
    settings.env = settings.env || {};
    if (process.env.MODE === "set") {
      settings.env.ANTHROPIC_BASE_URL = process.env.BASE_URL;
      settings.env.ANTHROPIC_AUTH_TOKEN = process.env.KEY;
    } else {
      delete settings.env.ANTHROPIC_BASE_URL;
      delete settings.env.ANTHROPIC_AUTH_TOKEN;
      if (Object.keys(settings.env).length === 0) delete settings.env;
    }
    fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
  '
}

write_wrapper() {
  mkdir -p "${BIN_DIR}" "${CONF_DIR}"
  umask 077
  cat >"${ENV_FILE}" <<EOF
# Generado por scripts/setup-omniroute.sh — contiene una credencial, no lo compartas.
OMNIROUTE_PORT=${PORT}
OMNIROUTE_KEY=${KEY}
EOF
  chmod 600 "${ENV_FILE}"

  cat >"${WRAPPER}" <<'WRAP'
#!/usr/bin/env bash
# Claude Code enrutado por OmniRoute. Levanta el gateway si está apagado.
# Generado por scripts/setup-omniroute.sh — se borra con `setup-omniroute.sh revert`.
set -euo pipefail

CONF_DIR="${HOME}/.omniroute"
# shellcheck source=/dev/null
. "${CONF_DIR}/env"

up() { curl -sf --max-time 3 "http://localhost:${OMNIROUTE_PORT}/" >/dev/null 2>&1; }

if ! up; then
  echo "· Levantando OmniRoute en el puerto ${OMNIROUTE_PORT}..." >&2
  (PORT="${OMNIROUTE_PORT}" nohup omniroute >>"${CONF_DIR}/gateway.log" 2>&1 &) >/dev/null 2>&1
  for _ in $(seq 1 40); do up && break; sleep 1; done
fi

if ! up; then
  echo "✗ OmniRoute no levantó. Revisa ${CONF_DIR}/gateway.log" >&2
  echo "  Mientras tanto usa 'claude' normal, que no depende del gateway." >&2
  exit 1
fi

export ANTHROPIC_BASE_URL="http://localhost:${OMNIROUTE_PORT}/v1"
export ANTHROPIC_AUTH_TOKEN="${OMNIROUTE_KEY}"
exec claude "$@"
WRAP
  chmod +x "${WRAPPER}"
}

case "${COMMAND}" in
  install)
    command -v node >/dev/null || { say "❌ Falta Node.js 18+"; exit 1; }
    say "📦 Instalando omniroute..."
    npm install -g omniroute
    start_gateway
    cat <<EOF

Siguiente paso, una sola vez:
  1. Abre http://localhost:${PORT} → Endpoints → genera una API key.
  2. Corre: bash scripts/setup-omniroute.sh link --key <TU_KEY>
  3. En Dashboard → Providers conecta los proveedores que vayas a usar.
EOF
    ;;

  link)
    [ -n "${KEY}" ] || { say "❌ Falta --key <API_KEY> (la sacas de http://localhost:${PORT} → Endpoints)"; exit 1; }
    write_wrapper
    say "✅ Comando creado: ${WRAPPER}"
    case ":${PATH}:" in
      *":${BIN_DIR}:"*) : ;;
      *) say "⚠️  ${BIN_DIR} no está en tu PATH. Agrega esta línea a ~/.zshrc o ~/.bashrc:"
         say "    export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
    esac
    if [ "${GLOBAL}" -eq 1 ]; then
      patch_settings set
      say "⚠️  Enlace global activado en ${SETTINGS} (respaldo .bak.*)."
      say "    Ahora TODO 'claude' pasa por el gateway: si se apaga, Claude Code falla."
    fi
    cat <<EOF

Cómo se usa:
  claude        → Claude de siempre, sin cambios
  claude-omni   → mismo Claude Code, pero enrutado por OmniRoute
Para deshacer todo: bash scripts/setup-omniroute.sh revert
EOF
    ;;

  status)
    if gateway_up; then
      say "gateway   : arriba en http://localhost:${PORT}"
    else
      say "gateway   : apagado (se levanta solo al usar claude-omni)"
    fi
    [ -x "${WRAPPER}" ] && say "claude-omni: instalado en ${WRAPPER}" || say "claude-omni: no instalado"
    if [ -f "${SETTINGS}" ] && grep -q "ANTHROPIC_BASE_URL" "${SETTINGS}" 2>/dev/null; then
      say "enlace     : GLOBAL activo en ${SETTINGS} (todo 'claude' pasa por el gateway)"
    else
      say "enlace     : solo por comando (claude queda intacto) ← lo recomendado"
    fi
    ;;

  revert)
    [ -e "${WRAPPER}" ] && rm -f "${WRAPPER}" && say "· ${WRAPPER} borrado"
    if [ -f "${SETTINGS}" ] && grep -q "ANTHROPIC_BASE_URL" "${SETTINGS}" 2>/dev/null; then
      patch_settings unset
      say "· enlace global quitado de ${SETTINGS} (respaldo .bak.*)"
    fi
    pkill -f "omniroute" >/dev/null 2>&1 && say "· gateway detenido" || true
    say "✅ Todo revertido. Tu credencial sigue en ${ENV_FILE} (bórrala si no la vas a usar)."
    ;;

  *)
    say "Uso: bash scripts/setup-omniroute.sh {install|link --key XXX|status|revert}"
    exit 1
    ;;
esac
