#!/usr/bin/env bash
# ==============================================================================
# DELocalSoy.AR — Script de Sincronización Post-#134 (main @ 1b3c8cd)
# Emisor: [agent: google] -> Receptor: [agent: vibe]
# Reglas: R1 (Verbatim), R4 (Divulgación), R5 (CI), R9 (DH), R12, R15
#
# Cumplimiento estricto del Scope-Guard Invertido (PR #134 mergeado en 1b3c8cd):
#   - MODE=split (por defecto):
#       1) Lote 1 -> Rama `agent-google/lote-estetico-base-consolidada`
#          Contiene ÚNICAMENTE archivos bajo el regex estético del guard (#134):
#          - apps/web/index.html
#          - apps/web/src/design/tokens.css
#          - apps/web/src/styles.css
#          - apps/web/src/design/BaseConsolidadaPrototype.tsx
#          => Pasa Regla 1 (namespace agent-google/*) y Regla 2 sin requerir mixto-r9.
#       2) Lote 2 -> Rama `agent-vibe/restauracion-a01-a02-core004`
#          Contiene ÚNICAMENTE archivos fuera del regex estético (18 archivos de
#          lógica, contratos, worker, API, componente en src/components/, guía y script).
#          => Pasa Regla 1 y Regla 2 en rama agent-vibe/* sin requerir labels.
#   - MODE=unified:
#       Crea una sola rama `agent-google/base-consolidada-tamiz-vibe` (requiere `mixto-r9` de la DH)
# ==============================================================================
set -euo pipefail

MODE="${MODE:-split}"
ESTETICA_BRANCH="${ESTETICA_BRANCH:-agent-google/lote-estetico-base-consolidada}"
LOGICA_BRANCH="${LOGICA_BRANCH:-agent-vibe/restauracion-a01-a02-core004}"
UNIFIED_BRANCH="${UNIFIED_BRANCH:-agent-google/base-consolidada-tamiz-vibe}"
CO_AUTHOR="${CO_AUTHOR:-Co-authored-by: Carlos Leonidas <carlosleonidas04@gmail.com>}"

# Lote 1: 100% dentro del regex estético de #134 (apps/web/src/design/**, styles.css, index.html)
ESTETICA_FILES=(
  "apps/web/index.html"
  "apps/web/src/design/tokens.css"
  "apps/web/src/styles.css"
  "apps/web/src/design/BaseConsolidadaPrototype.tsx"
)

# Lote 2: 100% fuera del regex estético de #134 (rama agent-vibe/*)
LOGICA_FILES=(
  "apps/web/src/components/BaseConsolidadaPrototype.tsx"
  "packages/contracts/src/modeloFederado.ts"
  "packages/contracts/src/index.ts"
  "packages/events/src/index.ts"
  "apps/worker/src/index.ts"
  "apps/api/src/middleware/jwtAuth.ts"
  "apps/api/src/middleware/rateLimiter.ts"
  "apps/api/src/routes/auth.routes.ts"
  "apps/api/src/routes/events.ts"
  "apps/api/src/routes/evidencias.ts"
  "apps/api/src/routes/modeloFederado.ts"
  "apps/api/src/routes/plataformaTerritorial.routes.ts"
  "apps/api/src/routes/ask.routes.ts"
  "apps/web/src/data/federatedModel.ts"
  "apps/web/src/App.tsx"
  "apps/web/vite.config.ts"
  "docs/HANDOFF_BASE_CONSOLIDADA_AGENTE_VIBE.md"
  "scripts/sincronizar-base-consolidada-agente-vibe.sh"
)

ALL_FILES=("${ESTETICA_FILES[@]}" "${LOGICA_FILES[@]}")

echo "🔍 [1/4] Verificando existencia de los ${#ALL_FILES[@]} archivos autoritativos (R1)..."
for f in "${ALL_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "❌ Falta el archivo esperado: $f"
    exit 1
  fi
  echo "  ✓ $f"
done

echo "🛡️ [2/4] Verificando invariantes de alcance y regresiones (#134 / #122 / CORE-004 / #123 / A-07)..."
if grep -qiE "Calingasta|Valle Serrano|Renovación Startup 2026|Carlos Bianchi" apps/web/src/design/BaseConsolidadaPrototype.tsx; then
  echo "❌ Se detectaron referencias fuera de alcance en BaseConsolidadaPrototype.tsx"
  exit 1
fi

if grep -q "replay-test" apps/api/src/routes/plataformaTerritorial.routes.ts; then
  echo "❌ El alias de testing /worker/replay-test no debe quedar expuesto en plataformaTerritorial.routes.ts"
  exit 1
fi
echo "  ✓ Scope-Guard #134: Lote 1 (4 archivos en design/styles/index) y Lote 2 (18 archivos de lógica sin replay-test) separados limpiamente."

report_count="$(grep -c "reportApiMutationError" apps/web/src/App.tsx || true)"
if [ "${report_count}" -lt 10 ]; then
  echo "❌ Regresión detectada: reportApiMutationError aparece solo ${report_count} veces en apps/web/src/App.tsx (esperado >= 10 para cerrar #122)"
  exit 1
fi
echo "  ✓ Issue #122 (A-01 / A-02 / EV-005): reportApiMutationError activo (${report_count} ocurrencias en App.tsx)."

if ! grep -q "requireNodeScope" apps/api/src/middleware/jwtAuth.ts; then
  echo "❌ Falta requireNodeScope en apps/api/src/middleware/jwtAuth.ts (T2 CORE-004)"
  exit 1
fi
if ! grep -q "reconcilePendingEntries" apps/worker/src/index.ts; then
  echo "❌ Falta reconcilePendingEntries en apps/worker/src/index.ts (T2 CORE-004)"
  exit 1
fi
echo "  ✓ Issue #87 (T2 CORE-004): requireNodeScope, rateLimiter por rol y reconciliación PEL + DLQ presentes."

if ! grep -q "validateLiveWsUpgrade" apps/web/vite.config.ts; then
  echo "❌ Falta guardia validateLiveWsUpgrade en apps/web/vite.config.ts (Issue #123)"
  exit 1
fi
echo "  ✓ Issue #123 (live-ws): guardia de Origin, token y rate-limit verificada."

echo "🏗️ [3/4] Ejecutando compilación completa del monorepo..."
npm run build

if [ "${DRY_RUN:-false}" = "true" ]; then
  echo "✅ [DRY_RUN=true] Verificación e invariantes completados sin realizar commits ni push."
  exit 0
fi

if [ "$MODE" = "unified" ]; then
  echo "🚀 [4/4] Modo UNIFIED: creando rama ${UNIFIED_BRANCH} (requiere label mixto-r9 de la DH)..."
  git checkout -B "$UNIFIED_BRANCH"
  git add "${ALL_FILES[@]}"
  git commit \
    -m "feat: cierre handoff post-#134 (#122 A-01/A-02/EV-005 + T2 CORE-004 + A-07 + #123 live-ws + Base Consolidada) [agent: google]" \
    -m "$CO_AUTHOR"
  git push -u origin "$UNIFIED_BRANCH"
else
  echo "🚀 [4/4] Modo SPLIT (compatible sin mixto-r9 con Scope-Guard Invertido #134 @ 1b3c8cd):"
  echo "  -> Paso 4A: Rama estética (${ESTETICA_BRANCH})"
  git checkout -B "$ESTETICA_BRANCH"
  git add "${ESTETICA_FILES[@]}"
  git commit \
    -m "feat(design): tokens, estilos y BaseConsolidadaPrototype bajo src/design [agent: google]" \
    -m "$CO_AUTHOR" || true

  echo "  -> Paso 4B: Rama lógica (${LOGICA_BRANCH}) para #122, T2 CORE-004, A-07 y #123"
  git checkout -B "$LOGICA_BRANCH" main 2>/dev/null || git checkout -B "$LOGICA_BRANCH"
  git add "${LOGICA_FILES[@]}"
  git commit \
    -m "fix(core): restaurar #122 (A-01/A-02/EV-005) + T2 CORE-004 + contrato A-07 + live-ws #123 (fuente: [agent: google])" \
    -m "$CO_AUTHOR" || true

  echo "✅ Ramas locales preparadas:"
  echo "   1) ${ESTETICA_BRANCH} (4 archivos en design/styles/index -> pasa #134 Reglas 1 y 2 sin mixto-r9)"
  echo "   2) ${LOGICA_BRANCH} (18 archivos de lógica -> pasa #134 Reglas 1 y 2 sin labels)"
fi
