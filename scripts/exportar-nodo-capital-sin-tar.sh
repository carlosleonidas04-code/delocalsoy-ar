#!/usr/bin/env bash
# scripts/exportar-nodo-capital-sin-tar.sh
# -----------------------------------------------------------------------------
# DELocalSoy.AR — Exportación Lote 4 Serie Contracts NCAP-R2 (SIN TAR)
# -----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== [DELocalSoy.AR] Iniciando Exportación Lote 4 Contracts NCAP-R2 (SIN TAR) ==="
cd "${ROOT_DIR}"

# 1. Asegurar directorios
mkdir -p exports packages/contracts/src docs

# 2. Ejecutar script Node ESM de exportación directa sin .tar
node scripts/exportar-nodo-capital-sin-tar.mjs

# 3. Validar que ningún archivo supere el límite de subida (1.024.000 Bytes)
echo ""
echo "[Verificación de Límites de Subida en exports/ (< 1.024.000 B)]"
EXCEEDS=0
for f in exports/*; do
  if [ -f "$f" ]; then
    SIZE=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null)
    if [ "$SIZE" -gt 1024000 ]; then
      echo "  [ERROR] $f supera el límite con ${SIZE} Bytes"
      EXCEEDS=1
    else
      echo "  [OK] $f (${SIZE} Bytes)"
    fi
  fi
done

if [ "$EXCEEDS" -ne 0 ]; then
  echo "Fallo de validación de límites de subida."
  exit 1
fi

# 4. Validar checksums con sha256sum y md5sum
echo ""
echo "[Verificación de Integridad Criptográfica]"
(
  cd exports
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c lote-4-ncap-r2-checksums.sha256
  fi
  if command -v md5sum >/dev/null 2>&1; then
    md5sum -c lote-4-ncap-r2-checksums.md5
  fi
)

echo ""
echo "=== [OK] Lote 4 Contracts NCAP-R2 exportado y verificado sin tar al 100% ==="
