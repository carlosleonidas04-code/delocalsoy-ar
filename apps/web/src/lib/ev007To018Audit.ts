/**
 * DELocalSoy.AR — Auditoría EV-007..EV-018 y mecanismos de aislamiento /demo
 * (Issues #16, #17, #18) consumidos por la sección `demo-datasource-audit` de App.tsx.
 *
 * PROCEDENCIA (R4/R12 — reconstrucción derivada, divulgada):
 * Este módulo NO proviene verbatim de un lote de staging. Fue derivado por [agent: vibe]
 * a partir de dos fuentes acreditadas:
 *   1. `EV_007_TO_018_AUDIT_MATRIX`: una fila por evidencia EV-007..EV-018, con títulos
 *      textuales y ramas recuperables (`pr_branch`) tomados de `initialEvidencias`
 *      en el middleware del staging (`vite.config.ts`, M29). `codeInMain: false`
 *      refleja el corte documental del propio App.tsx (Paso 8: «13/13 main» para
 *      EV-001..006 + EV-019..025; EV-007..018 en staging).
 *   2. `DEMO_ISOLATION_ISSUES`: contenido compuesto a partir de los mecanismos de
 *      aislamiento efectivamente implementados en App.tsx (gate de ruta `/demo`,
 *      banner sintético obligatorio y barra de transparencia operativa R5).
 * Si un lote autoritativo posterior de [agent: google] trae el módulo original,
 * ese lote prevalece y debe reemplazar este archivo (Staging propone, GitHub acredita — R1).
 */

/**
 * Issue de aislamiento demo (tabla de Issues #16, #17, #18 en App.tsx).
 */
export interface DemoIsolationIssue {
  issue: number;
  status: string;
  title: string;
  isolationMechanism: string;
}

/**
 * Issues #16–#18: mecanismos que encapsulan las capacidades demo/sintéticas sin
 * alterar ni simular evidencia de producción (sección `demo-datasource-audit`).
 */
export const DEMO_ISOLATION_ISSUES: DemoIsolationIssue[] = [
  {
    issue: 16,
    status: 'Aislado',
    title: 'Ruta /demo para capacidades demo sin evidencia de producción',
    isolationMechanism:
      'La sección demo-datasource-audit queda encapsulada bajo window.location /demo (#16): fuera de esa ruta no se renderiza, y nunca altera ni simula evidencia del núcleo real /api/*.',
  },
  {
    issue: 17,
    status: 'Aislado',
    title: 'Fuente sintética acotada a VITE_MOCK_API=1 con banner obligatorio',
    isolationMechanism:
      'SyntheticDataSource solo se activa con el opt-in VITE_MOCK_API=1 (o el toggle de prueba del panel); cuando opera, el alerta synthetic-mode-warning-banner permanece siempre visible (Paso 6 · #17).',
  },
  {
    issue: 18,
    status: 'Aislado',
    title: 'Barra de transparencia operativa: 4 orígenes y 6 estados sin [] silencioso',
    isolationMechanism:
      'La barra origin-transparency-strip distingue API real · API degradada · API sintética · Demo local, con el estado UI resuelto por resolveUiOperationalState (R5: los errores HTTP se propagan, jamás [] · #18).',
  },
];

/**
 * Fila de la auditoría individual EV-007..EV-018 (Paso 8, corte `main @ e3616b5`).
 */
export interface Ev007To018AuditRow {
  code: string;
  horizon: 'H2' | 'H3' | 'H4';
  /** `true` solo si la evidencia está acreditada en main; hoy refleja el corte del Paso 8. */
  codeInMain: boolean;
  /** PR que la aterrizó en main, cuando exista. */
  mergedPr?: string;
  /** Rama de staging desde la que puede recuperarse el trabajo (pr_branch del seed). */
  recoverableBranch?: string;
  /** Clasificación canónica del estado de aterrizaje. */
  classification: string;
  /** Objetivo de verificación y notas del diagnóstico. */
  verificationTargetAndNotes: string;
}

/**
 * Auditoría 1 por 1 de EV-007 a EV-018 (12 evidencias).
 * Derivada de `initialEvidencias` (M29): títulos verbatim de cada evidencia;
 * rama recuperable = `result.pr_branch` del seed correspondiente.
 */
export const EV_007_TO_018_AUDIT_MATRIX: Ev007To018AuditRow[] = [
  {
    code: 'EV-007',
    horizon: 'H2',
    codeInMain: false,
    recoverableBranch: 'agent-google/geo-bbox',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Geometrías PostGIS SRID=4326 (ST_LineString y ST_Polygon) validadas en WKT — 7 geometrías sembradas en el middleware; verificar contra el schema Prisma real de main antes de aterrizar.',
  },
  {
    code: 'EV-008',
    horizon: 'H2',
    codeInMain: false,
    recoverableBranch: 'agent-google/docs-ev',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Protocolo de custodia cruzada inter-nodos (InterNodeSyncPack) — verificar co-firmas de custodios y mapeo de vocabularios sin homogeneización.',
  },
  {
    code: 'EV-009',
    horizon: 'H2',
    codeInMain: false,
    recoverableBranch: 'agent-google/docs-ev',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Serie multitemporal por trimestre (2026-Q1 a 2026-Q4) consistente — 12 snapshots (3 nodos × 4 trimestres) en el middleware de staging.',
  },
  {
    code: 'EV-010',
    horizon: 'H2',
    codeInMain: false,
    recoverableBranch: 'agent-google/geo-bbox',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Filtro espacial GET /api/territorios?bbox= con índice GiST (idx_territorios_geom_gist) + control multicapa — requiere la capa PostGIS real de main.',
  },
  {
    code: 'EV-011',
    horizon: 'H3',
    codeInMain: false,
    recoverableBranch: 'agent-google/docs-ev',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Síntesis multi-escala bajo plantilla Dato → Interpretación → Sugerencia ratificada — verificar referencias inmutables y bloqueo requiresHumanReview.',
  },
  {
    code: 'EV-012',
    horizon: 'H3',
    codeInMain: false,
    recoverableBranch: 'agent-google/gobernanza-r14',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Auditoría criptográfica de linaje completo (cadena SHA-256 H1 → H2 → H3 → H4) — verificar continuidad parentHash/currentHash de los 6 eslabones.',
  },
  {
    code: 'EV-013',
    horizon: 'H3',
    codeInMain: false,
    recoverableBranch: 'agent-google/gobernanza-r14',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Invariante requiresHumanReview === true verificada en síntesis inter-nodos — la invariante es parte del contrato de datos (ADR-004), no un decorado.',
  },
  {
    code: 'EV-014',
    horizon: 'H3',
    codeInMain: false,
    recoverableBranch: 'agent-google/docs-ev',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Capa de servicio Google Drive/Docs (firebase-applet-config.json) + Soberanía Federal — verificar contra firestoreEthicalStore.ts (espejo offline-first ADR-020) ya aterrizado.',
  },
  {
    code: 'EV-015',
    horizon: 'H4',
    codeInMain: false,
    recoverableBranch: 'agent-google/geo-bbox',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Motor espacial PostGIS ST_Intersects + ST_DWithin(SRID=4326) con buffer en metros — verificar las 3 intersecciones sembradas (350/500/1000 m) contra PostGIS real.',
  },
  {
    code: 'EV-016',
    horizon: 'H4',
    codeInMain: false,
    recoverableBranch: 'agent-google/docs-ev',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Sincronización de campo Offline-First por lotes idempotentes (occurred_at vs ingested_at) — verificar cola de brigadas y hash cliente idempotente.',
  },
  {
    code: 'EV-017',
    horizon: 'H4',
    codeInMain: false,
    recoverableBranch: 'agent-google/docs-ev',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Identidad criptográfica y firma digital Ed25519-SHA256 por custodio acreditado — verificar los 3 custodios sembrados (Capital · Caucete · Iglesia).',
  },
  {
    code: 'EV-018',
    horizon: 'H4',
    codeInMain: false,
    recoverableBranch: 'agent-google/docs-ev',
    classification: 'staging_pendiente_aterrizaje',
    verificationTargetAndNotes:
      'Webhook de telemetría hídrica/climática bajo Contrato Ético (requiresHumanReview === true) — verificar estaciones de aforo, presión y nivel con umbral de alerta.',
  },
];
