# Backups — D3 (PostgreSQL)

Estado: v1 propuesta (issue #286, rama `feat/d3-backups-postgres`). Decisiones D1-D4 ratificadas por la DH el 2026-10-30. Politica objetivo del RUNBOOK seccion 7 (PR #260, paquete M0): backup diario de Postgres + simulacro de restauracion documentado. `events_raw` es la unica fuente de verdad — **el backup de Postgres ES el backup de la plataforma**.

## Politica (ratificada D1-D4, 2026-10-30)

| Decision | Ratificado |
| --- | --- |
| D1 formato | custom comprimido `-Fc` — verificado con `pg_restore --list` |
| D2 ubicacion | `backups/` gitignored (override `BACKUP_DIR`) — los dumps NUNCA al repo |
| D3 retencion | 7 backups (rotacion automatica) |
| D4 restauracion | simulacro a DB scratch por defecto (siempre seguro); `--aplicar` opt-in con confirmacion |

## Comandos (terminal de la DH, contenedor `delocalsoy-db` levantado)

- **Backup**: `bash scripts/backup-postgres.sh` — genera `backups/delocalsoy-backup-<fecha>.dump`, verifica el TOC (`TABLE DATA public events_raw`), registra fecha + bytes + sha256 en `backups/MANIFEST.log` y rota los backups mas viejos de 7.
- **Simulacro (seguro, no toca la DB real)**: `bash scripts/restore-postgres.sh backups/<archivo>.dump` — recrea la DB scratch `delocalsoy_simulacro`, restaura con `--exit-on-error`, imprime counts de verificacion (`events_raw`, `event_projections`, `activos`, `reportes`, `oportunidades`, `kpi_snapshots`, `rag_index`) contra la DB real y elimina la scratch al final (`KEEP_SIMULACRO=1` la conserva).
- **Restaurar la DB real (opt-in)**: `bash scripts/restore-postgres.sh backups/<archivo>.dump --aplicar` — exige escribir RESTAURAR. Detener API y worker antes. Tras restaurar, las proyecciones quedan como estaban en el backup; el reconciliador AUD-08 (#103) re-publica al stream `events:raw` las referencias que falten y los 3 consumer groups se reparan solos por idempotencia (ADR-032).

## Variables (todas con default)

`CONTAINER` (delocalsoy-db) · `POSTGRES_USER` (delocalsoy) · `POSTGRES_DB` (delocalsoy) · `BACKUP_DIR` (backups) · `RETENTION` (7) · `SIMULACRO_DB` (delocalsoy_simulacro) · `KEEP_SIMULACRO` (0).

## Que NO cubre (honesto, R15)

- **Redis**: fuera del alcance. El stream `events:raw` es transporte (ADR-032), no fuente de verdad; un stream vacio se re-llena con el reconciliador AUD-08 (#103).
- **Copia remota / offsite**: NO implementado — los dumps viven en la maquina de la DH. Subirlos a almacenamiento cifrado queda como decision de la DH (deuda declarada).
- **Cron / systemd timer**: NO implementado — sugerencia `cron: 0 3 * * * bash scripts/backup-postgres.sh`; la automatizacion es decision de la DH (deuda declarada).

## Acreditacion (criterio de evidencia)

Cuando la DH lo ejecute (EV por F0-C1 #260): salida de `scripts/backup-postgres.sh` con dump verificado + linea de `MANIFEST.log` + salida del simulacro con counts identicos de `events_raw` contra la DB real.

## Relacion con RUNBOOK seccion 7

El RUNBOOK (PR #260 en cola) declara esta mejora como NO IMPLEMENTADA; al mergear #260, la seccion 7 se actualiza apuntando a este documento (deuda documental trivial, sin stack).
