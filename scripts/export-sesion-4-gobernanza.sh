#!/usr/bin/env bash
# ==============================================================================
# DELocalSoy.AR — Exportador Directo: Sesión 4 (Especificación y Gobernanza)
# Archivo: scripts/export-sesion-4-gobernanza.sh
# Formato: Scripts y archivos directos (100% SIN ARCHIVOS TAR)
# ==============================================================================
set -euo pipefail

DEST_DIR="exports/nodo-capital/sesion-4"
mkdir -p "${DEST_DIR}"

echo "=== Exportando Sesión 4: Especificación Canónica y Gobernanza R9/R15 (Sin TAR) ==="

FILES=(
  "docs/NODO_CAPITAL_ESPECIFICACION_v0.1.md"
  "metadata.json"
  "package.json"
)

for file in "${FILES[@]}"; do
  if [ -f "${file}" ]; then
    flat_name=$(echo "${file}" | tr '/' '_')
    cp "${file}" "${DEST_DIR}/${flat_name}"
    sha=$(sha256sum "${file}" | awk '{print $1}')
    lines=$(wc -l < "${file}")
    echo "  [OK] ${file} -> ${DEST_DIR}/${flat_name} (SHA: ${sha:0:10} · ${lines} líneas)"
  else
    echo "  [WARN] No existe: ${file}"
  fi
done

echo "✓ Sesión 4 exportada directamente en ${DEST_DIR}/"
