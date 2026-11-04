import { useState } from 'react';

interface PillarSpec {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  modelInnovation: string;
  softwareProduct: string;
  recursiveLoop: string;
  invariants: string[];
}

const HORIZON_1_PILLARS: PillarSpec[] = [
  {
    id: 'ontologia',
    index: '01',
    title: 'Soberanía Semántica y Custodia Tripartita',
    subtitle: 'Ontología Territorial Federada',
    modelInnovation:
      'El territorio no es un contenedor pasivo de coordenadas: cada nodo departamental o local define su propio vocabulario vernáculo, sus capas explícitas y quién custodia cada capa (Comunidad, Instituciones, Comercios/Productores).',
    softwareProduct:
      'Motor de nodos federados (/api/modelo-federado y /api/territorios) que renderiza capas explícitas declaradas por cada nodo sin inferir ni forzar esquemas homogéneos en el cliente.',
    recursiveLoop:
      'Cada nuevo nodo registrado incorpora su propio diccionario de capas y categorías al núcleo común sin alterar la semántica de los nodos preexistentes.',
    invariants: [
      'Capas explícitas por nodo (Point, LineString, Polygon)',
      'Custodia declarada por capa (community, institutions, businesses)',
      'Comparabilidad transversal en 7 dominios sin homogeneización forzada',
    ],
  },
  {
    id: 'epistemologia',
    index: '02',
    title: 'Estatuto Epistémico Graduado del Registro',
    subtitle: 'Epistemología de Activos y Problemáticas',
    modelInnovation:
      'Un relevamiento vecinal, un inventario institucional y un dato sintético de prueba tienen distinto valor epistémico pero igual derecho de trazabilidad. El modelo separa Activos Territoriales de Problemáticas.',
    softwareProduct:
      'Visor cartográfico simbólico y geocodificador real en Google Maps Platform con fichas de inspección que exponen fuente, fecha de observación y estado epistémico.',
    recursiveLoop:
      'Un reporte ciudadano nace como observación recibida (TerritorialReportCreated) y evoluciona trazablemente por estados (received → evaluating → in_progress → resolved).',
    invariants: [
      'Cuatro estados epistémicos explícitos: verified, community_validated, pending, synthetic_demo',
      'Separación estructural entre Activo (asset) y Problemática (problem)',
      'Prohibición de mezclar datos sintéticos con operativos sin etiqueta explícita',
    ],
  },
  {
    id: 'contrato-etico',
    index: '03',
    title: 'Contrato Ético Tripartito',
    subtitle: 'Dato → Interpretación → Sugerencia',
    modelInnovation:
      'Toda lectura sobre el territorio separa rigurosamente el Dato crudo inmutable, la Interpretación situada provisional y la Sugerencia de intervención sujeta a validación humana.',
    softwareProduct:
      'Módulo de Gobernanza Algorítmica integrado en cada nodo con invariante requiresHumanReview: true y firma de actas humanas (POST /api/ethical-review).',
    recursiveLoop:
      'Cada firma humana emite un evento EthicalContractHumanReviewed en events_raw, realimentando la memoria auditable del nodo antes de cualquier acción en terreno.',
    invariants: [
      'Nivel 1 (Dato): respaldado exclusivamente por IDs de reportes, features y eventos',
      'Nivel 2 (Interpretación): explícita, situada en el foco del nodo y provisional',
      'Nivel 3 (Sugerencia): bloqueada para ejecución automática (requiresHumanReview: true)',
    ],
  },
  {
    id: 'hitub-core',
    index: '04',
    title: 'Verdad Técnica e Idempotencia Append-Only',
    subtitle: 'Metodología HITUB · Sprint CORE-001',
    modelInnovation:
      'La gobernanza metodológica exige que ninguna afirmación territorial o técnica exista sin evidencia verificable: observar → obtener evidencia → transformar → verificar → registrar.',
    softwareProduct:
      'Libro mayor append-only events_raw con hash SHA-256 único (rechazo HTTP 409 ante duplicados) y panel interactivo de verificación de evidencias EV-001 a EV-006.',
    recursiveLoop:
      'Cada mutación en el software genera un evento con hash determinista cuya integridad alimenta el registro de evidencias y los reportes exportables a Google Docs.',
    invariants: [
      'Constraint único sobre hash en events_raw (idempotencia demostrable en EV-005)',
      'Registro inmutable de eventos (append-only, sin borrado ni sobrescritura)',
      'Sincronización documental hacia Google Drive y Google Docs con confirmación explícita',
    ],
  },
];

interface HorizonRoadmapItem {
  key: 'h1' | 'h2' | 'h3' | 'h4';
  label: string;
  status: string;
  thesis: string;
  deliverables: string[];
}

const HORIZONS_PROJECTIVE: HorizonRoadmapItem[] = [
  {
    key: 'h1',
    label: 'Horizonte 1 · Núcleo Federado & Verdad Técnica',
    status: 'Consolidado y Ejecutable (Activo)',
    thesis:
      'Consolidar el Modelo Territorial Federado en la Provincia de San Juan — Capital (Distrito Centro y Distrito Desamparados), Caucete e Iglesia — como arquitectura heurística viva y lista para su pronta extensión futura: capas explícitas, custodia tripartita, comparador transversal, contrato ético e idempotencia events_raw.',
    deliverables: [
      'Explorador interactivo de Nodos Federados con cartografía simbólica local y filtro de capas explícitas',
      'Emisión de reportes en vocabulario local + flujo de estados + Contrato Ético con firma humana',
      'Comparador transversal de 7 dominios con respeto de soberanía semántica por nodo',
      'Verificador en vivo de idempotencia SHA-256 (EV-005) sobre events_raw + Google Maps + Drive/Docs',
    ],
  },
  {
    key: 'h2',
    label: 'Horizonte 2 · Geometrías PostGIS & Sincronización Inter-Nodos',
    status: 'Consolidado y Ejecutable (Activo)',
    thesis:
      'Expandir la representación espacial hacia geometrías PostGIS completas (corredores LineString y polígonos departamentales SRID=4326), protocolos de custodia cruzada inter-nodos y evolución trimestral 2026-Q1..Q4.',
    deliverables: [
      'Catálogo y trazador de geometrías PostGIS SRID=4326 (ST_LineString y ST_Polygon) con EWKT y métricas espaciales (EV-007)',
      'Protocolo de custodia cruzada inter-nodos (InterNodeSyncPack) con traducción de vocabulario sin homogeneización (EV-008)',
      'Serie multitemporal por trimestre (2026-Q1 a 2026-Q4) y proyección directa de polígonos/corredores sobre Google Maps (EV-009, EV-010)',
    ],
  },
  {
    key: 'h3',
    label: 'Horizonte 3 · Inteligencia Territorial Bajo Contrato Ético',
    status: 'Consolidado y Ejecutable (Activo)',
    thesis:
      'Síntesis determinista multi-escala que cruza observaciones (H1) y morfologías PostGIS (H2) en los 3 departamentos de San Juan subordinada al Contrato Ético Tripartito (requiresHumanReview: true), con auditoría criptográfica de linaje SHA-256 y Observatorio Provincial Federado.',
    deliverables: [
      'Motor de síntesis multi-nodo gobernado por plantilla auditable Dato → Interpretación → Sugerencia con ratificación humana colegiada (EV-011, EV-013)',
      'Auditoría criptográfica de linaje completo en eslabones SHA-256 desde events_raw hasta el acta sellada (EV-012)',
      'Observatorio Federado de San Juan con Merkle Root por departamento y soberanía de datos revocable en vivo, preparado para pronta extensión territorial (EV-014)',
    ],
  },
  {
    key: 'h4',
    label: 'Horizonte 4 · Operación en Terreno, Firmas Ed25519 & Telemetría',
    status: 'Consolidado y Ejecutable (Ciclo H1–H2–H3–H4 Completo)',
    thesis:
      'Despliegue operativo en terreno: consultas espaciales PostGIS ST_Intersects/ST_DWithin con buffer en metros, cola de campo offline-first con reconciliación batch idempotente, firmas criptográficas Ed25519 por custodio acreditado e ingesta de webhooks hídricos bajo Contrato Ético.',
    deliverables: [
      'Motor de intersección espacial PostGIS ST_Intersects + ST_DWithin(SRID=4326) con radio de amortiguación configurable (EV-015)',
      'Cola local de relevamiento offline-first para brigadas sin señal y reconciliación batch idempotente preservando occurred_at vs ingested_at (EV-016)',
      'Padrón de custodios tripartitos acreditados con clave pública y emisión de firma digital Ed25519-SHA256 anclada al linaje (EV-017)',
      'Conectores de telemetría hídrica/climática por webhook con detección de umbral y bloqueo requiresHumanReview: true (EV-018)',
    ],
  },
];

export function HorizonOneArchitecturePanel() {
  const [activePillarId, setActivePillarId] = useState<string>(HORIZON_1_PILLARS[0].id);
  const [activeHorizonKey, setActiveHorizonKey] = useState<'h1' | 'h2' | 'h3' | 'h4'>('h4');

  const activePillar =
    HORIZON_1_PILLARS.find((p) => p.id === activePillarId) ?? HORIZON_1_PILLARS[0];
  const activeHorizon =
    HORIZONS_PROJECTIVE.find((h) => h.key === activeHorizonKey) ?? HORIZONS_PROJECTIVE[0];

  return (
    <section id="modelo-territorial" className="card" data-state="ok">
      <div className="section-header">
        <div>
          <span className="kicker-text">
            Arquitectura Conceptual y Ejecutable · Tesis de Diseño
          </span>
          <h2>
            El Modelo Territorial como Innovación · La Plataforma como Producto
          </h2>
          <p className="section-caption">
            Análisis exhaustivo iterativo, recursivo y proyectivo desarrollado en el Horizonte 1: cada regla del territorio se traduce en un mecanismo verificable de software.
          </p>
        </div>
      </div>

      {/* Selector de los 4 Pilares del Horizonte 1 */}
      <div className="pillar-tabs-grid" role="tablist" aria-label="Pilares del Horizonte 1">
        {HORIZON_1_PILLARS.map((p) => {
          const isSelected = p.id === activePillar.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={isSelected ? 'pillar-tab active' : 'pillar-tab'}
              onClick={() => setActivePillarId(p.id)}
            >
              <div className="pillar-tab-top">
                <span className="pillar-index tabular-nums">{p.index}.</span>
                <strong>{p.title}</strong>
              </div>
              <span className="territory-meta">{p.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* Detalle del Pilar Seleccionado: Cadena Innovación -> Producto -> Recursividad */}
      <div className="pillar-detail-box">
        <div className="pillar-chain-grid">
          <div className="pillar-chain-col">
            <div className="tiny-label">1. Innovación en el Modelo Territorial</div>
            <p>{activePillar.modelInnovation}</p>
          </div>
          <div className="pillar-chain-col">
            <div className="tiny-label">2. Producto en la Plataforma y Software</div>
            <p>{activePillar.softwareProduct}</p>
          </div>
          <div className="pillar-chain-col">
            <div className="tiny-label">3. Dinámica Iterativa y Recursiva</div>
            <p>{activePillar.recursiveLoop}</p>
          </div>
        </div>

        <div className="pillar-invariants-row">
          <span className="tiny-label">Invariantes verificables en este horizonte:</span>
          <div className="territory-meta">
            {activePillar.invariants.map((inv, idx) => (
              <span key={inv}>
                {idx > 0 ? ' · ' : ''}
                {inv}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Proyección de Horizontes (H1 -> H2 -> H3) */}
      <div className="horizon-projection-bar">
        <div className="pane-header">
          <span className="tiny-label">Matriz Proyectiva de Horizontes (H1 → H2 → H3)</span>
          <div className="filter-group" role="group" aria-label="Horizontes evolutivos">
            {HORIZONS_PROJECTIVE.map((h) => (
              <button
                key={h.key}
                type="button"
                className={activeHorizonKey === h.key ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setActiveHorizonKey(h.key)}
              >
                {h.label.split(' · ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="horizon-detail-row">
          <div>
            <strong>{activeHorizon.label}</strong>
            <span className="territory-meta"> · Estado: {activeHorizon.status}</span>
            <p className="report-desc">{activeHorizon.thesis}</p>
          </div>
          <ul className="horizon-deliverables-list">
            {activeHorizon.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
