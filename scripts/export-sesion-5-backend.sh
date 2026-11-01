#!/usr/bin/env bash
# ==============================================================================
# DELocalSoy.AR — Exportador Directo: Sesión 5 (Backend API y Persistencia Bloque 9)
# Archivo: scripts/export-sesion-5-backend.sh
# Formato: Scripts y archivos directos (100% SIN ARCHIVOS TAR)
# ==============================================================================
set -euo pipefail

DEST_DIR="exports/nodo-capital/sesion-5"
mkdir -p "${DEST_DIR}"

echo "=== Exportando Sesión 5: Backend API y Persistencia de Oportunidades (Sin TAR) ==="

FILES=(
  "apps/api/src/routes/oportunidades.routes.ts"
  "apps/api/src/app.ts"
  "packages/db/prisma/schema.prisma"
  "packages/contracts/package.json"
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

echo "✓ Sesión 5 exportada directamente en ${DEST_DIR}/"
