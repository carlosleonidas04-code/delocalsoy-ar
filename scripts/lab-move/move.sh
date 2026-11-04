#!/usr/bin/env bash
# DELocalSoy.AR — PR-1 /lab: mover los 27 módulos de laboratorio + canvas-maestro
# de components/ a lab/ (misma profundidad => los imports ../ de los movidos no
# cambian), con marca extraída a lib/ y gate R15 de typecheck antes de cualquier push.
set -euo pipefail
cd "$(dirname "$0")/../.."
WEB=apps/web/src

echo "== [1/4] Transform determinista (App lazy + TopBarHeader + marca)"
node scripts/lab-move/transform.mjs

echo "== [2/4] git mv: 27 módulos lab + canvas-maestro"
mkdir -p "$WEB/lab"
LAB_MODULES=(
  BaseConsolidadaPrototype
  RecursiveProspectiveContractPanel
  EthicalAiCopilotPanel
  Station05EpistemicContractsWorkbench
  InspectionStationsConsole
  HorizonTwoSpatialFederationPanel
  HorizonFourFieldAndTelemetryPanel
  LensFourEpistemicContractsWorkbench
  HorizonThreeObservatoryPanel
  LensThreeSovereigntyWorkbench
  VibeAgentExportHandoffCenter
  Station03VerticalFlowWorkbench
  Station04SovereigntyWorkbench
  QuarterlyTrendsSection
  HorizonOneArchitecturePanel
  Station02CockpitWorkbench
  Station01TokenWorkbench
  DemoDataSourceAuditSection
  LensOneAtlasWorkbench
  LensTwoVerticalFlowWorkbench
  MasterRegistrySection
  RecursiveDesignChainSection
  HeuristicsAwardMatrix
  TokenEvolutionStrip
  CognitiveLensSelector
  OperationalOriginStrip
  DesignStudioHeader
)
for f in "${LAB_MODULES[@]}"; do
  git mv "$WEB/components/$f.tsx" "$WEB/lab/$f.tsx"
done
git mv "$WEB/components/canvas-maestro" "$WEB/lab/canvas-maestro"
echo "movidos: ${#LAB_MODULES[@]} módulos + canvas-maestro"

echo "== [3/4] delete del duplicado muerto (design/, sin importadores — #352)"
git rm -q "$WEB/design/BaseConsolidadaPrototype.tsx"

echo "== [4/4] Gate R15: typecheck del workspace web"
pnpm --filter @delocalsoy/web typecheck
echo "MOVE OK: refactor aplicado y typecheck verde."
