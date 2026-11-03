/**
 * Cadena Recursiva de 5 Eslabones: Del Modelo Base del Monorepo al Píxel (Interactiva).
 * Extraída 1:1 de App.tsx (FE-DEUDA-02 #293, corte 19). Refactor puro sin cambios de
 * comportamiento: el estado compartido `selectedRecursiveLinkIdx` vive en App y se acopla
 * por props; `RECURSIVE_DESIGN_CHAIN` es dato local del componente.
 */

interface RecursiveDesignChainSectionProps {
  selectedRecursiveLinkIdx: number;
  onSelectRecursiveLink: (idx: number) => void;
}

export function RecursiveDesignChainSection({
  selectedRecursiveLinkIdx,
  onSelectRecursiveLink,
}: RecursiveDesignChainSectionProps) {
  return (
    <>
    <div className="pane-header">
      <div>
        <span className="tiny-label">
          Proceso Recursivo Previo al Diseño · Alineación 1:1 con el Monorepo Actual
        </span>
        <strong>
          5 Eslabones de Coherencia: Modelo Base → Contrato → Máquina R5-UI → Token CSS → Componente
        </strong>
      </div>
      <div className="filter-group" role="tablist" aria-label="Eslabones recursivos del diseño">
        {[
          '01. Ontología San Juan',
          '02. Contratos & R5',
          '03. Estados R5-UI',
          '04. Soberanía & FCM',
          '05. Tríada Ética IA',
        ].map((label, idx) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={selectedRecursiveLinkIdx === idx}
            className={
              selectedRecursiveLinkIdx === idx
                ? 'btn-filter active'
                : 'btn-filter'
            }
            onClick={() => onSelectRecursiveLink(idx)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    {(() => {
      const RECURSIVE_DESIGN_CHAIN = [
        {
          step: 'Eslabón 01 · Ontología Territorial Base (ADR-021 / ADR-027 R-Scope)',
          baseModel:
            'packages/db/prisma/schema.prisma (territorios, capas_territoriales, features_territoriales) · 3 nodos: Capital (Centro/Desamparados), Caucete e Iglesia.',
          heuristicRule:
            'H-TER-01 (Materialidad Geológica 60-30-10): prohibido uniformar el vocabulario local; cada departamento tiene su firma cromática mineral y sus celdas de Soberanía Semántica.',
          uiMaterialization:
            'Tokens --node-capital-* (#C2410C Terracota), --node-caucete-* (#15803D Verde Oasis), --node-iglesia-* (#1D4ED8 Azul Andino) + Matriz 7×3 en FederatedNodeExplorer.tsx.',
        },
        {
          step: 'Eslabón 02 · Contratos Simétricos e IDataSource Honesto (Regla R5 / C1–C5)',
          baseModel:
            'packages/contracts (Zod + OpenAPI 3.1.0) + apps/web/src/lib/ApiDataSource.ts y SyntheticDataSource.ts.',
          heuristicRule:
            'H-TER-05 (Honestidad Epistémica Visible): cero fallbacks silenciosos a [] ante errores HTTP 503/401/404/422/500; separación explícita de los 4 orígenes operativos.',
          uiMaterialization:
            'Franja operational-origin-strip, banner obligatorio de modo sintético y panel interactivo de prueba de idempotencia EV-005 y error 503.',
        },
        {
          step: 'Eslabón 03 · Máquina de Estados Editorial R5-UI (Issue #109 / ADR-034)',
          baseModel:
            'packages/domain (13 módulos) + apps/worker (11 eslabones Fase 0) + rutas /api/plataforma/activos.',
          heuristicRule:
            'H-TER-02 & H-TER-05: todo activo o reporte territorial exhibe su etapa de validación sin ambigüedad cromática ni barras laterales decorativas.',
          uiMaterialization:
            'Badges semánticos --state-pendiente, --state-en-revision, --state-verificado, --state-publicado y --state-rechazado en TerritorialPlatformHub y Cockpit «Coco-Baba».',
        },
        {
          step: 'Eslabón 04 · Soberanía Criptográfica y Custodia Tripartita (ADR-020 + Push FCM)',
          baseModel:
            'events_raw (@unique hash), custodios_acreditados_ed25519 (EV-017) y firestore.rules (territorial_nodes_sovereignty).',
          heuristicRule:
            'H-TER-06 (Soberanía Accionable en 1 Clic): cuando cambia el régimen de un nodo o ingresa un reporte crítico, el custodio recibe alerta trazable con hash SHA-256.',
          uiMaterialization:
            'Centro de Alertas de Soberanía en AdminSovereigntyDashboard.tsx y despacho Push FCM / Firestore en FederatedNodeExplorer.tsx.',
        },
        {
          step: 'Eslabón 05 · Gobernanza Algorítmica y Dualidad Cartográfica (ADR-004 + PostGIS)',
          baseModel:
            '/api/ask (4 ramas deterministas + Anti-PII Ley 25.326 EV-023) + PostGIS SRID=4326 con índice GiST idx_territorios_geom_gist.',
          heuristicRule:
            'H-TER-04 & Tríada Ética: articulación directa entre lienzo esquemático (x, y) y Google Maps SRID=4326; separación visual Dato → Interpretación → Sugerencia (requiresHumanReview: true).',
          uiMaterialization:
            'EthicalAiCopilotPanel.tsx, TerritoriosMap.tsx y sub-vista de Panel del Nodo con firma de acta humana colegiada.',
        },
      ];
      const currentLink =
        RECURSIVE_DESIGN_CHAIN[selectedRecursiveLinkIdx] ??
        RECURSIVE_DESIGN_CHAIN[0];

      return (
        <div className="coco-baba-triage-grid">
          <div className="coco-baba-triage-card">
            <span className="tiny-label">1. Modelo Base y Contrato en Monorepo</span>
            <strong style={{ display: 'block', marginTop: '0.25rem' }}>
              {currentLink.step}
            </strong>
            <p className="territory-meta" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
              {currentLink.baseModel}
            </p>
          </div>
          <div className="coco-baba-triage-card">
            <span className="tiny-label">2. Heurística de Diseño Internacional</span>
            <p className="territory-meta" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
              {currentLink.heuristicRule}
            </p>
          </div>
          <div className="coco-baba-triage-card">
            <span className="tiny-label">3. Materialización en tokens.css y UI React</span>
            <p className="territory-meta" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
              {currentLink.uiMaterialization}
            </p>
          </div>
        </div>
      );
    })()}
    </>
  );
}
