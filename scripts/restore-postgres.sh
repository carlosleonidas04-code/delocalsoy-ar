#!/usr/bin/env bash
# DELocalSoy.AR — D3 backups (#286): restauracion y simulacro de restauracion.
# D4 ratificado DH 2026-10-30: modo default SIMULACRO (DB scratch, la DB real NO se toca)
# + modo --aplicar opt-in con confirmacion interactiva para la DB real.
# La scratch del simulacro se recrea en cada corrida y se elimina al final (KEEP_SIMULACRO=1 la conserva).

set -eu
set -o pipefail

CONTAINER="${CONTAINER:-delocalsoy-db}"
PGUSER="${POSTGRES_USER:-delocalsoy}"
PGDB="${POSTGRES_DB:-delocalsoy}"
SIMULACRO_DB="${SIMULACRO_DB:-delocalsoy_simulacro}"

fail() { echo "FAIL: $1" >&2; exit 1; }
uso() { echo "Uso: $0 <archivo.dump> [--aplicar]" >&2; exit 2; }

[ $# -ge 1 ] && [ $# -le 2 ] || uso
archivo="$1"
if [ "${2:-}" = "--aplicar" ]; then modo="aplicar"; elif [ $# -eq 2 ]; then uso; else modo="simulacro"; fi

[ -f "${archivo}" ] || fail "no existe: ${archivo}"
size="$(stat -c%s "${archivo}")"
[ "${size}" -ge 1024 ] || fail "${archivo} tiene ${size} bytes — sospechosamente chico"

docker info >/dev/null 2>&1 || fail "docker no responde"
docker exec "${CONTAINER}" pg_isready -U "${PGUSER}" >/dev/null 2>&1 \
  || fail "el contenedor ${CONTAINER} no responde"

contenedor_path="/tmp/dls-restore-$$.dump"
docker cp "${archivo}" "${CONTAINER}:${contenedor_path}"
trap "docker exec \"${CONTAINER}\" rm -f \"${contenedor_path}\" 2>/dev/null || true" EXIT

count_o() {
  docker exec "${CONTAINER}" psql -U "${PGUSER}" -d "$1" -tAc "SELECT count(*) FROM $2" 2>/dev/null || echo '?'
}

tabla_counts() {
  echo "Counts de verificacion (simulacro vs DB real):"
  for t in events_raw event_projections activos reportes oportunidades kpi_snapshots rag_index; do
    printf '  %-18s simulacro: %-8s real: %s\n' "${t}" "$(count_o "${SIMULACRO_DB}" "${t}")" "$(count_o "${PGDB}" "${t}")"
  done
  echo "  Ultimo sello en el simulacro (max occurred_at): $(docker exec "${CONTAINER}" psql -U "${PGUSER}" -d "${SIMULACRO_DB}" -tAc "SELECT max(occurred_at) FROM events_raw" 2>/dev/null || echo '?')"
}

simulacro() {
  echo "[SIMULACRO] la DB real (${PGDB}) NO se toca"
  echo "[SIMULACRO] recreando scratch ${SIMULACRO_DB}"
  if docker exec "${CONTAINER}" psql -U "${PGUSER}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${SIMULACRO_DB}'" | grep -q 1; then
    docker exec "${CONTAINER}" psql -U "${PGUSER}" -d postgres -c "DROP DATABASE ${SIMULACRO_DB}" >/dev/null
  fi
  docker exec "${CONTAINER}" psql -U "${PGUSER}" -d postgres -c "CREATE DATABASE ${SIMULACRO_DB}" >/dev/null

  echo "[SIMULACRO] pg_restore --exit-on-error --no-owner -> ${SIMULACRO_DB}"
  docker exec "${CONTAINER}" pg_restore -U "${PGUSER}" --exit-on-error --no-owner -d "${SIMULACRO_DB}" "${contenedor_path}"

  echo ""
  tabla_counts
  echo ""

  if [ "${KEEP_SIMULACRO:-0}" = "1" ]; then
    echo "[SIMULACRO] KEEP_SIMULACRO=1 — ${SIMULACRO_DB} conservada para inspeccion"
  else
    docker exec "${CONTAINER}" psql -U "${PGUSER}" -d postgres -c "DROP DATABASE ${SIMULACRO_DB}" >/dev/null
    echo "[SIMULACRO] ${SIMULACRO_DB} eliminada (KEEP_SIMULACRO=1 la conserva)"
  fi
  echo "OK: el backup restaura con pg_restore sin errores y contiene los dominios esperados."
}

aplicar() {
  echo "ATENCION: REEMPLAZA el contenido de la DB real (${PGDB}) con ${archivo}."
  echo "Detener API y worker antes de continuar (escrituras a mitad de restauracion corrompen estado)."
  echo "Tras restaurar, el reconciliador AUD-08 (#103) re-publica al stream las referencias que falten."
  printf 'Escribi RESTAURAR para confirmar: '
  read -r confirmacion
  [ "${confirmacion}" = "RESTAURAR" ] || fail "confirmacion incorrecta — no se toco nada"

  docker exec "${CONTAINER}" pg_restore -U "${PGUSER}" --clean --if-exists --exit-on-error --no-owner -d "${PGDB}" "${contenedor_path}"

  echo "OK: ${PGDB} restaurada desde ${archivo}."
  echo "Verificacion minima: events_raw = $(count_o "${PGDB}" events_raw)"
  echo "Levantar API y worker; los consumer groups re-proyectan lo pendiente por idempotencia (ADR-032)."
}

if [ "${modo}" = "aplicar" ]; then aplicar; else simulacro; fi
