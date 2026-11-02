#!/usr/bin/env bash
# DELocalSoy.AR — D3 backups (#286): backup de PostgreSQL (custom comprimido, D1).
# Politica objetivo RUNBOOK seccion 7 (M0, PR #260): backup diario + simulacro de restauracion.
# Corre en la terminal de la DH con el contenedor delocalsoy-db levantado (docker-compose.yml).
# Los dumps viven en backups/ (gitignored, D2) — NUNCA entran al repo. Retencion: 7 (D3).
# Verificacion: TOC con pg_restore --list + sha256 + comparacion de bytes host vs contenedor.

set -eu
set -o pipefail

CONTAINER="${CONTAINER:-delocalsoy-db}"
PGUSER="${POSTGRES_USER:-delocalsoy}"
PGDB="${POSTGRES_DB:-delocalsoy}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION="${RETENTION:-7}"

fail() { echo "FAIL: $1" >&2; exit 1; }

case "${RETENTION}" in (*[!0-9]*|"") fail "RETENTION debe ser un entero >= 1";; esac
[ "${RETENTION}" -ge 1 ] || fail "RETENTION debe ser >= 1"

timestamp="$(date +%Y%m%d-%H%M%S)"
target="${BACKUP_DIR}/delocalsoy-backup-${timestamp}.dump"
manifest="${BACKUP_DIR}/MANIFEST.log"

docker info >/dev/null 2>&1 || fail "docker no responde — ¿esta levantado el demonio?"
docker exec "${CONTAINER}" pg_isready -U "${PGUSER}" >/dev/null 2>&1 \
  || fail "el contenedor ${CONTAINER} no responde (pg_isready) — ¿docker compose up?"

mkdir -p "${BACKUP_DIR}"

echo "[1/6] pg_dump -Fc -> ${target}"
docker exec "${CONTAINER}" pg_dump -U "${PGUSER}" --format=custom "${PGDB}" > "${target}"

size_host="$(stat -c%s "${target}")"
[ "${size_host}" -ge 1024 ] || fail "el dump tiene ${size_host} bytes — sospechosamente chico"

verify_path="/tmp/dls-backup-verify-$$.dump"
echo "[2/6] copia al contenedor para verificar: ${verify_path}"
docker cp "${target}" "${CONTAINER}:${verify_path}"

echo "[3/6] verificacion del TOC (pg_restore --list)"
toc="$(docker exec "${CONTAINER}" pg_restore --list "${verify_path}")" || {
  docker exec "${CONTAINER}" rm -f "${verify_path}"
  fail "pg_restore --list fallo — dump corrupto"
}
printf '%s\n' "${toc}" | grep -q "TABLE DATA public events_raw" || {
  docker exec "${CONTAINER}" rm -f "${verify_path}"
  fail "el TOC no contiene TABLE DATA public events_raw"
}
tablas="$(printf '%s\n' "${toc}" | grep -cE '^[0-9]+; *[0-9]+ [0-9]+ TABLE ')"
echo "    entradas TABLE en el TOC: ${tablas}"

echo "[4/6] sha256 + comparacion de bytes host <-> contenedor"
checksum="$(docker exec "${CONTAINER}" sha256sum "${verify_path}" | awk '{print $1}')"
size_ctr="$(docker exec "${CONTAINER}" stat -c%s "${verify_path}")"
[ "${size_host}" = "${size_ctr}" ] || {
  docker exec "${CONTAINER}" rm -f "${verify_path}"
  fail "bytes del host (${size_host}) != contenedor (${size_ctr})"
}
docker exec "${CONTAINER}" rm -f "${verify_path}"

echo "[5/6] manifiesto: ${manifest}"
fecha="$(date -Iseconds)"
printf '%s | %s | %s B | sha256 %s | pg_restore --list OK | TABLE %s\n' \
  "${fecha}" "${target}" "${size_host}" "${checksum}" "${tablas}" >> "${manifest}"

echo "[6/6] retencion: conservar ${RETENTION}"
viejos="$(ls -1t "${BACKUP_DIR}"/delocalsoy-backup-*.dump 2>/dev/null | tail -n +$((RETENTION + 1)) || true)"
if [ -n "${viejos}" ]; then
  printf '%s\n' "${viejos}" | while IFS= read -r viejo; do
    echo "    rotando: ${viejo}"
    rm -f "${viejo}"
  done
fi

echo "OK: ${target} (${size_host} B)"
echo "sha256: ${checksum}"
echo "Simulacro de restauracion: scripts/restore-postgres.sh ${target}"
