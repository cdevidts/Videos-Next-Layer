#!/usr/bin/env bash
# Doble clic para prender OmniRoute en Mac. Deja esta ventana abierta.
# Si Mac dice que no se puede abrir: clic derecho sobre el archivo → Abrir → Abrir.
cd "$(dirname "$0")" || exit 1

echo "Prendiendo OmniRoute..."
echo "Panel de control: http://localhost:${OMNIROUTE_PORT:-20128}"
echo "NO CIERRES ESTA VENTANA mientras lo estés usando."
echo

if ! command -v omniroute >/dev/null 2>&1; then
  echo "✗ OmniRoute no está instalado."
  echo "  Abre la Terminal y corre:  npm install -g omniroute"
  echo "  (guía completa en docs/omniroute-paso-a-paso.md)"
  read -r -p "Aprieta Enter para cerrar."
  exit 1
fi

omniroute
