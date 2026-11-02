/**
 * DELocalSoy.AR — Seeds del staging middleware del dev server — FE-DEUDA-03 #294.
 *
 * Extraído 1:1 de vite.config.ts (refactor puro, sin cambio de comportamiento):
 * datos semilla del territorio + geometrías espaciales + snapshots temporales +
 * cadena de linaje + cola offline + custodios + webhooks de telemetría + utilidades
 * de hash (REPORT_FLOW / computeHash). mkFeature queda privado: solo lo usa
 * initialFeatures dentro de este módulo.
 */
import { createHash } from 'node:crypto';

export interface TerritorioRecord {
  id: string;
  key: string;
  nombre: string;
  subtitulo: string;
  provincia: string;
  foco: string;
  focusLong: string;
  poblacion: number;
  color: string;
  activo: boolean;
  lat?: number;
  lng?: number;
  bbox?: [number, number, number, number];
}

export const initialTerritorios: TerritorioRecord[] = [
  {
    id: 'ter-sjn-cap',
    key: 'capital',
    nombre: 'Capital',
    subtitulo: 'Distrito Centro · Distrito Desamparados',
    provincia: 'San Juan',
    foco: 'Comercio, acequias urbanas, arbolado y espacio público (Centro y Desamparados)',
    focusLong:
      'Proceso heurístico urbano en Distrito Centro y Distrito Desamparados (Departamento Capital, San Juan): iluminación, arbolado irrigado por acequias, veredas y corredores cívico-barriales. Arquitectura preparada para pronta extensión departamental y regional.',
    poblacion: 115000,
    color: '#C2410C',
    activo: true,
    lat: -31.5375,
    lng: -68.5364,
    bbox: [-68.58, -31.57, -68.49, -31.5],
  },
  {
    id: 'ter-sjn-cau',
    key: 'caucete',
    nombre: 'Caucete',
    subtitulo: 'Departamento Caucete · Valle de Tulum Oriental',
    provincia: 'San Juan',
    foco: 'Educación, salud, drenaje agrícola y resiliencia comunitaria',
    focusLong:
      'Proceso heurístico periurbano-rural en el Departamento Caucete (San Juan): acceso a salud, puntos de resiliencia aluvional al pie de la sierra Pie de Palo y red de agua comunitaria.',
    poblacion: 44000,
    color: '#2F7D5B',
    activo: true,
    lat: -31.6518,
    lng: -68.2811,
    bbox: [-68.38, -31.72, -68.18, -31.58],
  },
  {
    id: 'ter-sjn-igl',
    key: 'iglesia',
    nombre: 'Iglesia',
    subtitulo: 'Departamento Iglesia · Valle Cordillerano Andino',
    provincia: 'San Juan',
    foco: 'Alta cuenca hídrica, producción semillera y patrimonio andino',
    focusLong:
      'Proceso heurístico cordillerano en el Departamento Iglesia (San Juan): turnado de riego y canales de deshielo, producción de semillas y frutos secos, caminos rurales y patrimonio turístico.',
    poblacion: 8800,
    color: '#1D4E89',
    activo: true,
    lat: -30.3594,
    lng: -69.2164,
    bbox: [-69.45, -30.55, -69.05, -30.15],
  },
];

export const initialLayers: Record<string, any[]> = {
  capital: [
    { key: 'commerce', name: 'Comercio y servicios (Distrito Centro y Desamparados)', domain: 'assets', geometry: 'Point', defaultOn: true, producedBy: ['businesses'] },
    { key: 'public_space', name: 'Espacio público y plazas (Centro y Desamparados)', domain: 'public_space', geometry: 'Point', defaultOn: true, producedBy: ['community', 'institutions'] },
    { key: 'public_lighting', name: 'Iluminación pública', domain: 'problems', geometry: 'Point', defaultOn: true, producedBy: ['community', 'institutions'] },
    { key: 'trees', name: 'Arbolado urbano y microclima', domain: 'assets', geometry: 'Point', defaultOn: false, producedBy: ['community'] },
    { key: 'sidewalks', name: 'Veredas y rampas peatonales', domain: 'problems', geometry: 'LineString', defaultOn: false, producedBy: ['community', 'businesses'] },
    { key: 'irrigation_channels', name: 'Acequias y canales urbanos (Centro–Desamparados)', domain: 'assets', geometry: 'LineString', defaultOn: false, producedBy: ['institutions'] },
  ],
  caucete: [
    { key: 'health_facilities', name: 'Salud', domain: 'health', geometry: 'Point', defaultOn: true, producedBy: ['institutions'] },
    { key: 'education', name: 'Educación', domain: 'community', geometry: 'Point', defaultOn: true, producedBy: ['institutions'] },
    { key: 'community_spaces', name: 'Espacios y recursos comunitarios', domain: 'community', geometry: 'Point', defaultOn: true, producedBy: ['community', 'institutions'] },
    { key: 'resilience_points', name: 'Puntos de resiliencia', domain: 'health', geometry: 'Point', defaultOn: true, producedBy: ['community', 'institutions'] },
    { key: 'community_resources', name: 'Agua y recursos básicos', domain: 'community', geometry: 'Point', defaultOn: false, producedBy: ['community'] },
  ],
  iglesia: [
    { key: 'productive_units', name: 'Producción y servicios (olivícola, semillas, frutos secos, frutales, hortalizas)', domain: 'production', geometry: 'Point', defaultOn: true, producedBy: ['community', 'businesses'] },
    { key: 'rural_services', name: 'Caminos rurales y senderos', domain: 'problems', geometry: 'LineString', defaultOn: true, producedBy: ['community'] },
    { key: 'tourism_resources', name: 'Turismo y patrimonio', domain: 'tourism', geometry: 'Point', defaultOn: true, producedBy: ['institutions'] },
  ],
};

export const initialCategories: Record<string, any[]> = {
  capital: [
    { code: 'insufficient_lighting', label: 'Iluminación insuficiente', layer: 'public_lighting' },
    { code: 'broken_lamp', label: 'Luminaria averiada', layer: 'public_lighting' },
    { code: 'dark_corridor', label: 'Corredor oscuro', layer: 'public_lighting' },
    { code: 'damaged_sidewalk', label: 'Vereda dañada', layer: 'sidewalks' },
    { code: 'at_risk_tree', label: 'Árbol en riesgo', layer: 'trees' },
    { code: 'obstructed_channel', label: 'Acequia obstruida (Distrito Centro / Desamparados)', layer: 'irrigation_channels' },
    { code: 'inactive_business', label: 'Comercio sin actividad', layer: 'commerce' },
    { code: 'damaged_public_furniture', label: 'Mobiliario público dañado', layer: 'public_space' },
  ],
  caucete: [
    { code: 'no_transport', label: 'Sin transporte al centro de salud', layer: 'health_facilities' },
    { code: 'long_distance', label: 'Distancia excesiva', layer: 'health_facilities' },
    { code: 'blocked_road', label: 'Camino bloqueado', layer: 'resilience_points' },
    { code: 'missing_meeting_point', label: 'Falta punto de encuentro', layer: 'resilience_points' },
    { code: 'water_quality_issue', label: 'Problema de calidad de agua', layer: 'community_resources' },
    { code: 'school_access_issue', label: 'Problema de acceso a escuela', layer: 'education' },
    { code: 'closed_community_space', label: 'Espacio comunitario cerrado', layer: 'community_spaces' },
  ],
  iglesia: [
    { code: 'damaged_road', label: 'Camino rural dañado', layer: 'rural_services' },
    { code: 'blocked_trail', label: 'Sendero obstruido o dañado', layer: 'rural_services' },
    { code: 'water_shortage', label: 'Escasez de agua para producción', layer: 'productive_units' },
    { code: 'pest_outbreak', label: 'Plaga en cultivo', layer: 'productive_units' },
    { code: 'prod_semillas', label: 'Producción: Semillas (ajo/cebolla)', layer: 'productive_units' },
    { code: 'prod_frutos_secos', label: 'Producción: Frutos secos (nogales)', layer: 'productive_units' },
    { code: 'prod_frutales', label: 'Producción: Frutales', layer: 'productive_units' },
    { code: 'prod_hortalizas', label: 'Producción: Hortalizas', layer: 'productive_units' },
    { code: 'missing_signal', label: 'Señalización turística faltante', layer: 'tourism_resources' },
    { code: 'damaged_heritage', label: 'Patrimonio en riesgo', layer: 'tourism_resources' },
  ],
};

const mkFeature = (
  id: string,
  nodeKey: string,
  layer: string,
  x: number,
  y: number,
  title: string,
  status: string,
  sourceKind: string,
  observedAt: string,
  type: 'asset' | 'problem',
  domain: string,
) => ({
  id,
  nodeKey,
  layer,
  x,
  y,
  title,
  status,
  observedAt,
  sourceLabel: `Ilustrativa · ${sourceKind}`,
  isSynthetic: true,
  type,
  domain,
});

export const initialFeatures = [
  // Capital
  mkFeature('f-cap-101', 'capital', 'commerce', 42, 36, 'Galería comercial céntrica — 12 locales activos', 'verified', 'registro sectorial', '2026-09-08', 'asset', 'assets'),
  mkFeature('f-cap-102', 'capital', 'commerce', 33, 52, 'Comercio de barrio con actividad reducida', 'community_validated', 'relevamiento', '2026-09-21', 'asset', 'assets'),
  mkFeature('f-cap-104', 'capital', 'commerce', 25, 30, 'Local en desuso con cartel caído', 'pending', 'reporte vecinal', '2026-09-25', 'problem', 'assets'),
  mkFeature('f-cap-105', 'capital', 'public_space', 50, 44, 'Plaza 25 de Mayo — mobiliario en buen estado', 'verified', 'inventario institucional', '2026-09-10', 'asset', 'public_space'),
  mkFeature('f-cap-106', 'capital', 'public_space', 68, 36, 'Plaza de barrio sin juegos infantiles operativos', 'community_validated', 'relevamiento comunitario', '2026-09-17', 'problem', 'public_space'),
  mkFeature('f-cap-001', 'capital', 'public_lighting', 22, 30, 'Iluminación insuficiente en Av. San Martín', 'community_validated', 'relevamiento comunitario', '2026-09-18', 'problem', 'problems'),
  mkFeature('f-cap-002', 'capital', 'public_lighting', 48, 55, 'Luminarias averiadas (3) — corredor peatonal', 'pending', 'relevamiento comunitario', '2026-09-24', 'problem', 'problems'),
  mkFeature('f-cap-005', 'capital', 'trees', 30, 42, 'Árbol en riesgo — ramas sobre cableado', 'pending', 'reporte vecinal', '2026-09-22', 'asset', 'assets'),
  mkFeature('f-cap-008', 'capital', 'sidewalks', 26, 58, 'Vereda dañada — baldosas rotas', 'community_validated', 'relevamiento', '2026-09-19', 'problem', 'problems'),
  mkFeature('f-cap-010', 'capital', 'irrigation_channels', 70, 60, 'Acequia obstruida — sector norte', 'synthetic_demo', 'institución local', '2026-10-01', 'asset', 'assets'),
  // Caucete
  mkFeature('f-cau-101', 'caucete', 'education', 42, 30, 'Escuela primaria con matrícula estable', 'verified', 'inventario institucional', '2026-09-09', 'asset', 'community'),
  mkFeature('f-cau-102', 'caucete', 'education', 55, 44, 'Escuela rural — acceso con camino dañado', 'community_validated', 'relevamiento comunitario', '2026-09-19', 'problem', 'community'),
  mkFeature('f-cau-105', 'caucete', 'community_spaces', 48, 38, 'Biblioteca popular municipal — horario reducido', 'community_validated', 'relevamiento comunitario', '2026-09-18', 'asset', 'community'),
  mkFeature('f-cau-106', 'caucete', 'community_spaces', 58, 58, 'Centro comunitario operativo (ejemplo)', 'verified', 'inventario institucional', '2026-09-08', 'asset', 'community'),
  mkFeature('f-cau-001', 'caucete', 'health_facilities', 40, 35, 'Sin transporte al centro de salud (sector oeste)', 'community_validated', 'relevamiento comunitario', '2026-09-16', 'problem', 'health'),
  mkFeature('f-cau-002', 'caucete', 'health_facilities', 62, 50, 'Distancia excesiva al primer nivel de atención', 'pending', 'relevamiento comunitario', '2026-09-23', 'problem', 'health'),
  mkFeature('f-cau-004', 'caucete', 'resilience_points', 50, 25, 'Camino bloqueado tras tormenta', 'community_validated', 'reporte vecinal', '2026-09-21', 'problem', 'health'),
  mkFeature('f-cau-007', 'caucete', 'community_resources', 58, 70, 'Acceso a agua comunitaria irregular', 'community_validated', 'relevamiento comunitario', '2026-09-17', 'problem', 'community'),
  // Iglesia
  mkFeature('f-igl-101', 'iglesia', 'productive_units', 30, 40, 'Finca olivícola familiar — producción activa', 'community_validated', 'productor', '2026-09-14', 'asset', 'production'),
  mkFeature('f-igl-102', 'iglesia', 'productive_units', 45, 60, 'Producción de semillas — ajo y cebolla', 'verified', 'productor', '2026-09-15', 'asset', 'production'),
  mkFeature('f-igl-115', 'iglesia', 'productive_units', 20, 46, 'Finca de frutos secos — nogales en producción', 'community_validated', 'productor', '2026-09-14', 'asset', 'production'),
  mkFeature('f-igl-117', 'iglesia', 'productive_units', 38, 52, 'Plaga en cultivo de vid — sector sur', 'pending', 'productor', '2026-09-22', 'problem', 'production'),
  mkFeature('f-igl-106', 'iglesia', 'rural_services', 72, 70, 'Camino rural con erosión hídrica — tramo crítico', 'community_validated', 'productor', '2026-09-20', 'problem', 'problems'),
  mkFeature('f-igl-118', 'iglesia', 'rural_services', 65, 80, 'Sendero de arrieros obstruido', 'pending', 'guía local', '2026-09-22', 'problem', 'problems'),
  mkFeature('f-igl-110', 'iglesia', 'tourism_resources', 66, 45, 'Señalización turística faltante', 'community_validated', 'relevamiento comunitario', '2026-09-18', 'problem', 'tourism'),
  mkFeature('f-igl-113', 'iglesia', 'tourism_resources', 34, 34, 'Capilla histórica con visitas guiadas', 'verified', 'inventario institucional', '2026-09-09', 'asset', 'tourism'),
  // Capital — Distrito Desamparados (refuerzo explícito del proceso heurístico en los dos distritos de Capital)
  mkFeature('f-cap-107', 'capital', 'public_space', 28, 46, 'Distrito Desamparados — Plaza Desamparados y entorno patrimonial', 'verified', 'inventario institucional', '2026-09-12', 'asset', 'public_space'),
  mkFeature('f-cap-108', 'capital', 'irrigation_channels', 35, 48, 'Distrito Desamparados — Red de acequias de riego para arbolado sobre Av. Libertador', 'community_validated', 'relevamiento vecinal Desamparados', '2026-09-19', 'asset', 'assets'),
];

export interface EvidenciaMockRecord {
  id: string;
  code: string;
  title: string;
  status: string;
  result: Record<string, unknown> | null;
  verified_at: string | null;
}

export const initialEvidencias: EvidenciaMockRecord[] = [
  {
    id: 'ev-id-001',
    code: 'EV-001',
    title: 'docker compose up -d levanta PostGIS sano',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_issue_13',
      pr_branch: 'agent-google/health-mode',
      staging_ready: true,
    },
    verified_at: null,
  },
  {
    id: 'ev-id-002',
    code: 'EV-002',
    title: 'prisma migrate dev aplica el schema sin errores (16 modelos)',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_issue_13',
      pr_branch: 'agent-google/geo-bbox',
      staging_ready: true,
    },
    verified_at: null,
  },
  {
    id: 'ev-id-003',
    code: 'EV-003',
    title: 'prisma generate genera cliente tipado',
    status: 'ok',
    result: {
      upstream_main: 'ok_in_main_68a8872',
      ci_run: '37098706368',
      pr: '#7',
    },
    verified_at: '2026-10-03T18:00:00.000Z',
  },
  {
    id: 'ev-id-004',
    code: 'EV-004',
    title: 'API /health responde 200 con mode: real|synthetic|degraded (Mock acotado a NODE_ENV=test)',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/health-mode',
      staging_ready: true,
    },
    verified_at: null,
  },
  {
    id: 'ev-id-005',
    code: 'EV-005',
    title: 'Insert de events_raw con hash duplicado es rechazado (HTTP 409 Conflict)',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_pr_19_issue_13',
      pr_branch: 'agent-google/docs-ev',
      staging_ready: true,
    },
    verified_at: null,
  },
  {
    id: 'ev-id-006',
    code: 'EV-006',
    title: 'turbo run build compila todo el monorepo',
    status: 'ok',
    result: {
      upstream_main: 'ok_in_main_68a8872',
      ci_run: '37098706368',
      pr: '#7',
    },
    verified_at: '2026-10-03T18:00:00.000Z',
  },
  {
    id: 'ev-id-007',
    code: 'EV-007',
    title: 'Horizonte 2: Geometrías PostGIS SRID=4326 (ST_LineString y ST_Polygon) validadas en WKT',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/geo-bbox',
      srid: 4326,
      geometries_seeded: 7,
    },
    verified_at: null,
  },
  {
    id: 'ev-id-008',
    code: 'EV-008',
    title: 'Horizonte 2: Protocolo de custodia cruzada inter-nodos (InterNodeSyncPack) verificado',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/docs-ev',
    },
    verified_at: null,
  },
  {
    id: 'ev-id-009',
    code: 'EV-009',
    title: 'Horizonte 2: Serie multitemporal por trimestre (2026-Q1 a 2026-Q4) consistente',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/docs-ev',
      quarters: ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'],
    },
    verified_at: null,
  },
  {
    id: 'ev-id-010',
    code: 'EV-010',
    title: 'Horizonte 2: Filtro espacial GET /api/territorios?bbox= con índice GiST + Control multicapa',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/geo-bbox',
      index: 'idx_territorios_geom_gist',
    },
    verified_at: null,
  },
  {
    id: 'ev-id-011',
    code: 'EV-011',
    title: 'Horizonte 3: Síntesis multi-escala bajo plantilla Dato -> Interpretación -> Sugerencia ratificada',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/docs-ev',
    },
    verified_at: null,
  },
  {
    id: 'ev-id-012',
    code: 'EV-012',
    title: 'Horizonte 3: Auditoría criptográfica de linaje completo (cadena SHA-256 H1 -> H2 -> H3 -> H4)',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/gobernanza-r14',
    },
    verified_at: null,
  },
  {
    id: 'ev-id-013',
    code: 'EV-013',
    title: 'Horizonte 3: Invariante requiresHumanReview === true verificado en síntesis inter-nodos',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/gobernanza-r14',
      invariant: 'requiresHumanReview === true',
    },
    verified_at: null,
  },
  {
    id: 'ev-id-014',
    code: 'EV-014',
    title: 'Horizonte 3: Capa de servicio Google Drive/Docs (firebase-applet-config.json) + Soberanía Federal',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/docs-ev',
    },
    verified_at: null,
  },
  {
    id: 'ev-id-015',
    code: 'EV-015',
    title: 'Horizonte 4: Motor espacial PostGIS ST_Intersects + ST_DWithin(SRID=4326) con buffer en metros',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/geo-bbox',
      operator: 'ST_Intersects + ST_DWithin(SRID=4326)',
    },
    verified_at: null,
  },
  {
    id: 'ev-id-016',
    code: 'EV-016',
    title: 'Horizonte 4: Sincronización de campo Offline-First por lotes idempotentes (occurred_at vs ingested_at)',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/docs-ev',
    },
    verified_at: null,
  },
  {
    id: 'ev-id-017',
    code: 'EV-017',
    title: 'Horizonte 4: Identidad criptográfica y firma digital Ed25519-SHA256 por custodio acreditado',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/docs-ev',
    },
    verified_at: null,
  },
  {
    id: 'ev-id-018',
    code: 'EV-018',
    title: 'Horizonte 4: Webhook de telemetría hídrica/climática bajo Contrato Ético (requiresHumanReview === true)',
    status: 'pendiente',
    result: {
      upstream_main: 'pendiente_aterrizaje_pr',
      pr_branch: 'agent-google/docs-ev',
    },
    verified_at: null,
  },
];

export const NODE_BASE_COORDS: Record<string, { lat: number; lng: number }> = {
  capital: { lat: -31.5375, lng: -68.5364 },
  caucete: { lat: -31.6518, lng: -68.2811 },
  iglesia: { lat: -30.3594, lng: -69.2169 },
};

export const initialSpatialGeometries: any[] = [
  {
    id: 'geom-cap-line-01',
    nodeKey: 'capital',
    layerKey: 'irrigation_channels',
    domain: 'assets',
    title: 'Corredor Hídrico Canal Benavidez – Acequia Cívica',
    geometryType: 'LineString',
    srid: 4326,
    wkt: 'SRID=4326;LINESTRING(-68.5620 -31.5240, -68.5450 -31.5310, -68.5290 -31.5365, -68.5140 -31.5410)',
    metricLabel: '4.8 km (ST_Length)',
    custodians: ['institutions', 'community'],
    status: 'verified',
    quarter: '2026-Q2',
    schematicPath: [
      { x: 16, y: 24 },
      { x: 38, y: 31 },
      { x: 62, y: 39 },
      { x: 84, y: 45 },
    ],
    realCoords: [
      { lat: -31.524, lng: -68.562 },
      { lat: -31.531, lng: -68.545 },
      { lat: -31.5365, lng: -68.529 },
      { lat: -31.541, lng: -68.514 },
    ],
    color: '#38bdf8',
  },
  {
    id: 'geom-cap-poly-01',
    nodeKey: 'capital',
    layerKey: 'public_space',
    domain: 'public_space',
    title: 'Polígono Microcuenca Urbana Centro–Cívico–Desamparados',
    geometryType: 'Polygon',
    srid: 4326,
    wkt: 'SRID=4326;POLYGON((-68.5580 -31.5280, -68.5210 -31.5280, -68.5210 -31.5480, -68.5580 -31.5480, -68.5580 -31.5280))',
    metricLabel: '640 ha (ST_Area)',
    custodians: ['community', 'institutions', 'businesses'],
    status: 'verified',
    quarter: '2026-Q1',
    schematicPath: [
      { x: 22, y: 20 },
      { x: 76, y: 20 },
      { x: 78, y: 52 },
      { x: 20, y: 52 },
    ],
    realCoords: [
      { lat: -31.528, lng: -68.558 },
      { lat: -31.528, lng: -68.521 },
      { lat: -31.548, lng: -68.521 },
      { lat: -31.548, lng: -68.558 },
    ],
    color: '#C2410C',
  },
  {
    id: 'geom-cau-line-01',
    nodeKey: 'caucete',
    layerKey: 'health_facilities',
    domain: 'health',
    title: 'Corredor Sanitario Pie de Palo – Villa Independencia – Bermejo',
    geometryType: 'LineString',
    srid: 4326,
    wkt: 'SRID=4326;LINESTRING(-68.3150 -31.6620, -68.2811 -31.6518, -68.2340 -31.6390, -68.1820 -31.6210)',
    metricLabel: '14.2 km (ST_Length)',
    custodians: ['institutions', 'community'],
    status: 'community_validated',
    quarter: '2026-Q2',
    schematicPath: [
      { x: 18, y: 48 },
      { x: 44, y: 38 },
      { x: 68, y: 30 },
      { x: 86, y: 22 },
    ],
    realCoords: [
      { lat: -31.662, lng: -68.315 },
      { lat: -31.6518, lng: -68.2811 },
      { lat: -31.639, lng: -68.234 },
      { lat: -31.621, lng: -68.182 },
    ],
    color: '#2F7D5B',
  },
  {
    id: 'geom-cau-poly-01',
    nodeKey: 'caucete',
    layerKey: 'resilience_points',
    domain: 'health',
    title: 'Polígono de Resiliencia Aluvional Sierra Pie de Palo',
    geometryType: 'Polygon',
    srid: 4326,
    wkt: 'SRID=4326;POLYGON((-68.3080 -31.6320, -68.2480 -31.6320, -68.2480 -31.6740, -68.3080 -31.6740, -68.3080 -31.6320))',
    metricLabel: '1,850 ha (ST_Area)',
    custodians: ['community', 'institutions'],
    status: 'verified',
    quarter: '2026-Q3',
    schematicPath: [
      { x: 26, y: 18 },
      { x: 74, y: 18 },
      { x: 70, y: 54 },
      { x: 24, y: 54 },
    ],
    realCoords: [
      { lat: -31.632, lng: -68.308 },
      { lat: -31.632, lng: -68.248 },
      { lat: -31.674, lng: -68.248 },
      { lat: -31.674, lng: -68.308 },
    ],
    color: '#10b981',
  },
  {
    id: 'geom-igl-line-01',
    nodeKey: 'iglesia',
    layerKey: 'rural_services',
    domain: 'problems',
    title: 'Corredor Productivo y Sendero Andino Rodeo – Las Flores – Tudcum',
    geometryType: 'LineString',
    srid: 4326,
    wkt: 'SRID=4326;LINESTRING(-69.1520 -30.2120, -69.2169 -30.3594, -69.2640 -30.4210)',
    metricLabel: '26.5 km (ST_Length)',
    custodians: ['community', 'businesses'],
    status: 'community_validated',
    quarter: '2026-Q3',
    schematicPath: [
      { x: 24, y: 16 },
      { x: 52, y: 36 },
      { x: 78, y: 52 },
    ],
    realCoords: [
      { lat: -30.212, lng: -69.152 },
      { lat: -30.3594, lng: -69.2169 },
      { lat: -30.421, lng: -69.264 },
    ],
    color: '#f59e0b',
  },
  {
    id: 'geom-igl-poly-01',
    nodeKey: 'iglesia',
    layerKey: 'productive_units',
    domain: 'production',
    title: 'Cuenca Semillera y Frutícola del Valle de Iglesia',
    geometryType: 'Polygon',
    srid: 4326,
    wkt: 'SRID=4326;POLYGON((-69.2580 -30.3150, -69.1750 -30.3150, -69.1750 -30.4020, -69.2580 -30.4020, -69.2580 -30.3150))',
    metricLabel: '3,420 ha (ST_Area)',
    custodians: ['businesses', 'community'],
    status: 'verified',
    quarter: '2026-Q4',
    schematicPath: [
      { x: 20, y: 22 },
      { x: 78, y: 24 },
      { x: 74, y: 55 },
      { x: 22, y: 53 },
    ],
    realCoords: [
      { lat: -30.315, lng: -69.258 },
      { lat: -30.315, lng: -69.175 },
      { lat: -30.402, lng: -69.175 },
      { lat: -30.402, lng: -69.258 },
    ],
    color: '#1D4E89',
  },
  {
    id: 'geom-cap-poly-02',
    nodeKey: 'capital',
    layerKey: 'trees',
    domain: 'assets',
    title: 'Polígono Hidrológico y Arbolado Urbano Distrito Desamparados (Capital)',
    geometryType: 'Polygon',
    srid: 4326,
    wkt: 'SRID=4326;POLYGON((-68.5680 -31.5290, -68.5410 -31.5290, -68.5410 -31.5450, -68.5680 -31.5450, -68.5680 -31.5290))',
    metricLabel: '410 ha (ST_Area)',
    custodians: ['community', 'institutions'],
    status: 'community_validated',
    quarter: '2026-Q4',
    schematicPath: [
      { x: 18, y: 24 },
      { x: 48, y: 24 },
      { x: 48, y: 50 },
      { x: 18, y: 50 },
    ],
    realCoords: [
      { lat: -31.529, lng: -68.568 },
      { lat: -31.529, lng: -68.541 },
      { lat: -31.545, lng: -68.541 },
      { lat: -31.545, lng: -68.568 },
    ],
    color: '#ea580c',
  },
];

export const initialSyncPacks: any[] = [
  {
    id: 'sync-pack-01',
    eventId: 'ev-sync-01',
    hash: '9a4f81c2e019b37d',
    sourceNodeKey: 'iglesia',
    targetNodeKey: 'caucete',
    domain: 'community',
    title: 'Protocolo Hídrico y Resiliencia de Cuencas en San Juan (Iglesia ↔ Caucete)',
    sharedSummary:
      'Intercambio de umbrales de escorrentía cordillerana, estado de caminos rurales y reservas de agua comunitaria entre la alta cuenca de Iglesia y el valle de Caucete.',
    sourceVocabularyTerm: 'water_shortage / productive_units (Iglesia)',
    targetVocabularyMapping: 'water_quality_issue / community_resources (Caucete)',
    geometryIds: ['geom-igl-poly-01', 'geom-cau-poly-01'],
    sourceCustodian: 'Junta de Riego y Productores de Iglesia',
    targetCustodianAck: 'Red Comunitaria de Agua y Salud de Caucete',
    status: 'federated_active',
    quarter: '2026-Q3',
    createdAt: '2026-10-01T14:20:00.000Z',
    verifiedAt: '2026-10-02T09:15:00.000Z',
  },
  {
    id: 'sync-pack-02',
    eventId: 'ev-sync-02',
    hash: '3c7e12d4b801f62a',
    sourceNodeKey: 'iglesia',
    targetNodeKey: 'capital',
    domain: 'assets',
    title: 'Articulación Hídrica y Abastecimiento: Cuenca Alta a Acequias Urbanas (Iglesia ↔ Capital)',
    sharedSummary:
      'Sincronización de aforos de alta cuenca y dotación hídrica para la red de acequias y arbolado público de Distrito Centro y Distrito Desamparados en Capital.',
    sourceVocabularyTerm: 'productive_units · Caudal y turnado de riego (Iglesia)',
    targetVocabularyMapping: 'irrigation_channels · Acequias y arbolado urbano (Capital)',
    geometryIds: ['geom-igl-poly-01', 'geom-cap-line-01'],
    sourceCustodian: 'Junta de Riego y Cooperativas de Iglesia',
    targetCustodianAck: 'Mesa de Articulación Distrito Centro y Desamparados (Capital)',
    status: 'custodian_verified',
    quarter: '2026-Q4',
    createdAt: '2026-10-03T11:00:00.000Z',
    verifiedAt: '2026-10-03T16:40:00.000Z',
  },
  {
    id: 'sync-pack-03',
    eventId: 'ev-sync-03',
    hash: '7f19b5e04d28a11c',
    sourceNodeKey: 'capital',
    targetNodeKey: 'caucete',
    domain: 'health',
    title: 'Corredor de Derivación Sanitaria y Movilidad Este (Capital [Centro–Desamparados] ↔ Caucete)',
    sharedSummary:
      'Vinculación de puntos de derivación primaria y transporte sanitario entre los distritos Centro y Desamparados (Capital) y la cabecera departamental de Caucete.',
    sourceVocabularyTerm: 'public_space / sidewalks (Capital · Centro y Desamparados)',
    targetVocabularyMapping: 'no_transport / health_facilities (Caucete)',
    geometryIds: ['geom-cap-poly-01', 'geom-cau-line-01'],
    sourceCustodian: 'Mesa de Articulación Urbana Capital (Centro–Desamparados)',
    targetCustodianAck: null,
    status: 'proposed',
    quarter: '2026-Q4',
    createdAt: '2026-10-04T08:15:00.000Z',
    verifiedAt: null,
  },
];

export const initialTemporalSnapshots: any[] = [
  // Capital (Distrito Centro y Distrito Desamparados)
  { quarter: '2026-Q1', label: 'T1 · Línea Base', nodeKey: 'capital', activeAssets: 4, openProblems: 6, resolvedProblems: 1, postgisGeometries: 1, interNodePacksActive: 0, highlight: 'Relevamiento fundacional en Distrito Centro y Distrito Desamparados' },
  { quarter: '2026-Q2', label: 'T2 · Consolidación', nodeKey: 'capital', activeAssets: 5, openProblems: 5, resolvedProblems: 2, postgisGeometries: 2, interNodePacksActive: 0, highlight: 'Trazado PostGIS del Canal Benavidez y acequias Centro–Desamparados' },
  { quarter: '2026-Q3', label: 'T3 · Articulación', nodeKey: 'capital', activeAssets: 6, openProblems: 4, resolvedProblems: 4, postgisGeometries: 2, interNodePacksActive: 1, highlight: 'Validación comunitaria de luminarias y arbolado en ambos distritos' },
  { quarter: '2026-Q4', label: 'T4 · Horizonte 2 Activo', nodeKey: 'capital', activeAssets: 7, openProblems: 3, resolvedProblems: 6, postgisGeometries: 3, interNodePacksActive: 2, highlight: 'Polígono Desamparados y articulación inter-departamental con Caucete e Iglesia' },
  // Caucete
  { quarter: '2026-Q1', label: 'T1 · Línea Base', nodeKey: 'caucete', activeAssets: 2, openProblems: 5, resolvedProblems: 0, postgisGeometries: 0, interNodePacksActive: 0, highlight: 'Identificación de barreras de distancia en salud rural' },
  { quarter: '2026-Q2', label: 'T2 · Consolidación', nodeKey: 'caucete', activeAssets: 3, openProblems: 5, resolvedProblems: 1, postgisGeometries: 1, interNodePacksActive: 0, highlight: 'Cartografía LineString del Corredor Sanitario Pie de Palo' },
  { quarter: '2026-Q3', label: 'T3 · Articulación', nodeKey: 'caucete', activeAssets: 3, openProblems: 4, resolvedProblems: 3, postgisGeometries: 2, interNodePacksActive: 1, highlight: 'Firma del protocolo hídrico federado con Iglesia' },
  { quarter: '2026-Q4', label: 'T4 · Horizonte 2 Activo', nodeKey: 'caucete', activeAssets: 4, openProblems: 3, resolvedProblems: 5, postgisGeometries: 2, interNodePacksActive: 2, highlight: 'Consolidación del corredor sanitario y aluvional con Capital e Iglesia' },
  // Iglesia
  { quarter: '2026-Q1', label: 'T1 · Línea Base', nodeKey: 'iglesia', activeAssets: 3, openProblems: 4, resolvedProblems: 0, postgisGeometries: 0, interNodePacksActive: 0, highlight: 'Padrón inicial de unidades productivas y capillas históricas' },
  { quarter: '2026-Q2', label: 'T2 · Consolidación', nodeKey: 'iglesia', activeAssets: 4, openProblems: 4, resolvedProblems: 1, postgisGeometries: 1, interNodePacksActive: 0, highlight: 'Relevamiento comunitario de caminos rurales y senderos andinos' },
  { quarter: '2026-Q3', label: 'T3 · Articulación', nodeKey: 'iglesia', activeAssets: 4, openProblems: 3, resolvedProblems: 2, postgisGeometries: 1, interNodePacksActive: 1, highlight: 'Sincronización activa de cuenca hídrica con Caucete' },
  { quarter: '2026-Q4', label: 'T4 · Horizonte 2 Activo', nodeKey: 'iglesia', activeAssets: 5, openProblems: 2, resolvedProblems: 4, postgisGeometries: 2, interNodePacksActive: 2, highlight: 'Delimitación PostGIS de la cuenca semillera (3,420 ha) y enlace con Capital' },
];

export const initialMultiScaleSyntheses: any[] = [
  {
    id: 'syn-h3-01',
    code: 'SYN-SJN-001',
    title: 'Síntesis Hidrológica, Productiva y Urbana de San Juan (Iglesia – Capital – Caucete)',
    involvedNodes: ['iglesia', 'capital', 'caucete'],
    involvedDomains: ['production', 'community', 'health'],
    datoImmutableRefs: {
      featureIds: ['f-igl-102', 'f-igl-106', 'f-cap-108', 'f-cau-001', 'f-cau-007'],
      reportIds: ['rep-seed-01'],
      geometryIds: ['geom-igl-poly-01', 'geom-cap-poly-02', 'geom-cau-poly-01'],
      syncPackIds: ['sync-pack-01', 'sync-pack-02'],
    },
    datoSummary:
      '5 observaciones primarias (H1), 3 polígonos de cuencas PostGIS en la Provincia de San Juan (H2) y 2 paquetes inter-departamentales firmados entre Iglesia, Capital (Distrito Centro y Desamparados) y Caucete.',
    interpretacionRule:
      'Regla determinista R-H3-01: Articulación hidro-territorial entre la alta cuenca cordillerana (Iglesia), el sistema de acequias y arbolado urbano de Distrito Centro y Desamparados (Capital) y la resiliencia aluvional/sanitaria del valle oriental (Caucete).',
    interpretacionProvisional:
      'El proceso heurístico en los tres departamentos de San Juan demuestra cómo la gestión de agua en altura, el microclima urbano por acequias y el drenaje rural forman un continuo territorial federado, dejando lista la arquitectura para su pronta extensión futura.',
    sugerenciaAccion:
      'Convocar mesa tripartita provincial (Junta de Riego Iglesia + Vecinales Centro y Desamparados en Capital + Red Comunitaria Caucete) para priorizar obras de conducción y monitoreo estacional.',
    requiresHumanReview: true,
    status: 'human_ratified',
    ratifiedBy: 'Mesa Colegiada Provincial San Juan (Acta #01)',
    ratifiedNote: 'Ratificado tras contraste con custodios de Capital (Centro y Desamparados), Caucete e Iglesia.',
    ratifiedAt: '2026-10-04T09:40:00.000Z',
    lineageRootHash: 'e4b8910a7c32d5f1',
    createdAt: '2026-10-04T09:10:00.000Z',
  },
  {
    id: 'syn-h3-02',
    code: 'SYN-MET-002',
    title: 'Síntesis Corredor Urbano-Periurbano: Distrito Centro, Distrito Desamparados y Caucete',
    involvedNodes: ['capital', 'caucete'],
    involvedDomains: ['public_space', 'problems', 'health'],
    datoImmutableRefs: {
      featureIds: ['f-cap-001', 'f-cap-008', 'f-cap-107', 'f-cau-002'],
      reportIds: ['rep-seed-01'],
      geometryIds: ['geom-cap-poly-01', 'geom-cap-line-01', 'geom-cau-line-01'],
      syncPackIds: ['sync-pack-03'],
    },
    datoSummary:
      '4 registros urbanos/periurbanos en Distrito Centro, Distrito Desamparados y Caucete (H1), 2 corredores LineString (19.0 km) + 1 microcuenca urbana (640 ha) en PostGIS (H2).',
    interpretacionRule:
      'Regla determinista R-H3-02: Intersección de déficits de caminabilidad/iluminación en los distritos Centro y Desamparados (Capital) con tiempos de traslado hacia centros de atención primaria en Caucete.',
    interpretacionProvisional:
      'La mejora del corredor peatonal y de acequias urbanas en Capital (Centro y Desamparados) y la frecuencia de transporte sanitario en Caucete responden a una misma matriz de articulación departamental.',
    sugerenciaAccion:
      'Validar con vecinales de Distrito Centro y Desamparados y centros de salud de Caucete el cronograma conjunto de mantenimiento lumínico y puntos seguros de parada.',
    requiresHumanReview: true,
    status: 'draft_requires_human',
    ratifiedBy: null,
    ratifiedNote: null,
    ratifiedAt: null,
    lineageRootHash: '8a19c402f7b13e9d',
    createdAt: '2026-10-04T10:15:00.000Z',
  },
];

export const initialLineageChain: any[] = [
  {
    stepIndex: 1,
    horizon: 'H1',
    stageLabel: 'Eslabón 1 · Observación Primaria Inmutable (events_raw)',
    eventType: 'TerritorialReportCreated',
    entityId: 'rep-seed-01 / f-igl-102',
    nodeKey: 'capital / iglesia',
    parentHash: '0000000000000000',
    currentHash: 'a17f902c4d81e311',
    verified: true,
    summary: 'Captura en terreno con vocabulario local del departamento y restricción de idempotencia SHA-256.',
  },
  {
    stepIndex: 2,
    horizon: 'H2',
    stageLabel: 'Eslabón 2 · Morfología Espacial PostGIS SRID=4326',
    eventType: 'SpatialGeometryCommitted',
    entityId: 'geom-igl-poly-01 / geom-cap-poly-02 / geom-cau-poly-01',
    nodeKey: 'iglesia / capital / caucete',
    parentHash: 'a17f902c4d81e311',
    currentHash: 'b58c219e7f04a623',
    verified: true,
    summary: 'Delimitación WKT de cuencas (ST_Polygon) y corredores (ST_LineString) en los 3 departamentos de San Juan.',
  },
  {
    stepIndex: 3,
    horizon: 'H2',
    stageLabel: 'Eslabón 3 · Custodia Cruzada Inter-Departamental',
    eventType: 'InterNodeSyncPackVerified',
    entityId: 'sync-pack-01 / sync-pack-02',
    nodeKey: 'iglesia ↔ capital ↔ caucete',
    parentHash: 'b58c219e7f04a623',
    currentHash: '9a4f81c2e019b37d',
    verified: true,
    summary: 'Co-firma entre custodios locales de San Juan con mapeo explícito de vocabularios sin homogeneización.',
  },
  {
    stepIndex: 4,
    horizon: 'H3',
    stageLabel: 'Eslabón 4 · Síntesis Multi-Escala Bajo Contrato Ético',
    eventType: 'MultiScaleSynthesisRatified',
    entityId: 'syn-h3-01 (SYN-SJN-001)',
    nodeKey: 'san-juan-federado',
    parentHash: '9a4f81c2e019b37d',
    currentHash: 'e4b8910a7c32d5f1',
    verified: true,
    summary: 'Articulación Dato -> Interpretación -> Sugerencia con bloqueo requiresHumanReview: true ratificado.',
  },
  {
    stepIndex: 5,
    horizon: 'H3',
    stageLabel: 'Eslabón 5 · Sello en Observatorio Federal y Memoria Documental',
    eventType: 'PublicTerritorialActSealed',
    entityId: 'ACTA-HITUB-H3-2026',
    nodeKey: 'observatorio-federal',
    parentHash: 'e4b8910a7c32d5f1',
    currentHash: 'f902d714c6a8e504',
    verified: true,
    summary: 'Raíz criptográfica consolidada lista para auditoría pública, persistencia Firestore y extensión futura.',
  },
  {
    stepIndex: 6,
    horizon: 'H4',
    stageLabel: 'Eslabón 6 · Operación en Terreno: Intersección PostGIS, Firma Ed25519 y Telemetría H4',
    eventType: 'HorizonFourFieldOperationAnchored',
    entityId: 'isect-h4-01 / cust-ed25519-01 / tel-st-01',
    nodeKey: 'federacion-sanjuan-h4',
    parentHash: 'f902d714c6a8e504',
    currentHash: 'c841a039d27e6b15',
    verified: true,
    summary: 'Anclaje operativo de consultas ST_Intersects, cola offline-first de brigadas, llaves Ed25519 y webhooks hídricos.',
  },
];

export const initialSpatialIntersections: any[] = [
  {
    id: 'isect-h4-01',
    geometryId: 'geom-cap-line-01',
    geometryTitle: 'Corredor Hídrico Canal Benavidez – Acequia Cívica',
    geometryType: 'LineString',
    nodeKey: 'capital',
    bufferMeters: 350,
    spatialOperator: 'ST_Intersects + ST_DWithin(SRID=4326)',
    impactedFeatureIds: ['f-cap-001', 'f-cap-005', 'f-cap-008', 'f-cap-010'],
    impactedFeatureTitles: [
      'Plaza 25 de Mayo y entorno cívico',
      'Canal matriz tramo urbano norte',
      'Falta de rampa y vereda deteriorada en corredor comercial',
      'Obstrucción de acequia de riego de arbolado urbano',
    ],
    impactedReportIds: ['rep-seed-01'],
    computedHash: '4d91a82f0c37e519',
    executedAt: '2026-10-04T11:15:00.000Z',
  },
  {
    id: 'isect-h4-02',
    geometryId: 'geom-cau-poly-01',
    geometryTitle: 'Polígono de Vulnerabilidad Aluvional y Agrícola Este',
    geometryType: 'Polygon',
    nodeKey: 'caucete',
    bufferMeters: 500,
    spatialOperator: 'ST_Intersects + ST_DWithin(SRID=4326)',
    impactedFeatureIds: ['f-cau-001', 'f-cau-002', 'f-cau-007'],
    impactedFeatureTitles: [
      'Hospital Dr. César Aguilar (Cabecera)',
      'Centro de Atención Primaria Villa Independencia',
      'Baja presión estacional en red de agua vecinal',
    ],
    impactedReportIds: [],
    computedHash: '7b02e6419a83c12f',
    executedAt: '2026-10-04T11:18:00.000Z',
  },
  {
    id: 'isect-h4-03',
    geometryId: 'geom-igl-poly-01',
    geometryTitle: 'Cuenca Productiva Semillera y Red de Riego Rodeo – Las Flores',
    geometryType: 'Polygon',
    nodeKey: 'iglesia',
    bufferMeters: 1000,
    spatialOperator: 'ST_Intersects + ST_DWithin(SRID=4326)',
    impactedFeatureIds: ['f-igl-101', 'f-igl-102', 'f-igl-106'],
    impactedFeatureTitles: [
      'Cooperativa Agropecuaria y Semillera Rodeo',
      'Toma y compuerta comunitaria Río Iglesia',
      'Filtración y pérdida de caudal en canal secundario',
    ],
    impactedReportIds: [],
    computedHash: '9e34f108c52a7d60',
    executedAt: '2026-10-04T11:22:00.000Z',
  },
];

export const initialOfflineFieldQueue: any[] = [
  {
    id: 'ofq-01',
    nodeKey: 'iglesia',
    brigadeName: 'Brigada Alta Montaña · Junta de Riego Las Flores',
    layerKey: 'rural_issues',
    categoryCode: 'irrigation_loss',
    title: 'Relevamiento offline de compuerta secundaria Pismanta (sin señal 4G)',
    notes: 'Capturado en dispositivo móvil con IndexedDB a 2,180 msnm; pendiente de reconciliación con events_raw.',
    coords: { lat: -30.2715, lng: -69.2284 },
    occurredAt: '2026-10-04T07:20:00.000Z',
    ingestedAt: null,
    clientHash: 'ofq-hash-91c4e82a0b17',
    syncStatus: 'queued_offline',
  },
  {
    id: 'ofq-02',
    nodeKey: 'capital',
    brigadeName: 'Brigada Urbana Distrito Desamparados · Acequias y Arbolado',
    layerKey: 'irrigation_channels',
    categoryCode: 'obstructed_channel',
    title: 'Relevamiento de caudal en acequia de riego de arbolado — Distrito Desamparados',
    notes: 'Medición manual registrada en terreno sobre corredor Av. Libertador (Desamparados); lista para sincronización batch idempotente.',
    coords: { lat: -31.5342, lng: -68.5548 },
    occurredAt: '2026-10-04T08:05:00.000Z',
    ingestedAt: null,
    clientHash: 'ofq-hash-3f72d109c64e',
    syncStatus: 'queued_offline',
  },
  {
    id: 'ofq-03',
    nodeKey: 'caucete',
    brigadeName: 'Mesa Vecinal Bermejo – Pie de Palo',
    layerKey: 'community_network',
    categoryCode: 'water_access',
    title: 'Verificación de reservorio comunitario en paraje Vallecito',
    notes: 'Sincronizado exitosamente al retornar a cobertura en cabecera departamental.',
    coords: { lat: -31.6642, lng: -68.2605 },
    occurredAt: '2026-10-03T15:10:00.000Z',
    ingestedAt: '2026-10-03T19:45:00.000Z',
    clientHash: 'ofq-hash-8a51b039f21c',
    syncStatus: 'synced_idempotent',
  },
];

export const initialAccreditedCustodians: any[] = [
  {
    id: 'cust-ed25519-01',
    nodeKey: 'capital',
    role: 'community',
    displayName: 'Dra. Lucía Sarmiento (Coordinadora Distrito Centro y Desamparados)',
    organization: 'Mesa de Articulación Urbana Distrito Centro y Distrito Desamparados (Capital)',
    algorithm: 'Ed25519-SHA256',
    publicKeyFingerprint: 'ed25519:8F:4A:19:C2:77:E0:3B:91',
    signaturesIssuedCount: 5,
    lastSignedTarget: 'SYN-MET-002 (Horizonte 3)',
    lastSignatureHex: 'sig_ed25519_91f0a4c82e7b13d6509a21f4',
    lastSignedAt: '2026-10-04T10:15:00.000Z',
  },
  {
    id: 'cust-ed25519-02',
    nodeKey: 'caucete',
    role: 'institutions',
    displayName: 'Ing. Martín Elizondo (Red Sanitaria e Hídrica Este)',
    organization: 'Hospital Dr. César Aguilar & Uniones Vecinales Caucete',
    algorithm: 'Ed25519-SHA256',
    publicKeyFingerprint: 'ed25519:3C:90:D4:11:5E:82:A7:04',
    signaturesIssuedCount: 6,
    lastSignedTarget: 'sync-pack-01 (Iglesia ↔ Caucete)',
    lastSignatureHex: 'sig_ed25519_4b72e109f3c8a65102d9e41b',
    lastSignedAt: '2026-10-04T09:50:00.000Z',
  },
  {
    id: 'cust-ed25519-03',
    nodeKey: 'iglesia',
    role: 'businesses',
    displayName: 'Téc. Agr. Elena Espejo (Productores Semilleros Cordilleranos)',
    organization: 'Cooperativa Agropecuaria y Junta de Riego Rodeo – Las Flores',
    algorithm: 'Ed25519-SHA256',
    publicKeyFingerprint: 'ed25519:7D:12:F8:63:9A:05:C1:E9',
    signaturesIssuedCount: 5,
    lastSignedTarget: 'SYN-SJN-001 (Cuenca San Juan)',
    lastSignatureHex: 'sig_ed25519_e083c517a94f26b018d3c72e',
    lastSignedAt: '2026-10-04T09:40:00.000Z',
  },
];

export const initialTelemetryWebhooks: any[] = [
  {
    id: 'tel-st-01',
    stationCode: 'TELEM-IGL-RIO-01',
    nodeKey: 'iglesia',
    stationName: 'Estación Nivológica y Aforo Río Iglesia – Toma Rodeo',
    parameter: 'Caudal de ingreso a canal matriz',
    unit: 'm³/s',
    lastValue: 1.42,
    thresholdWarning: 1.6,
    status: 'alerta_umbral_revision_humana',
    requiresHumanReview: true,
    lastEventHash: 'a904e21c7f38b512',
    lastReceivedAt: '2026-10-04T11:10:00.000Z',
  },
  {
    id: 'tel-st-02',
    stationCode: 'TELEM-CAU-ACU-02',
    nodeKey: 'caucete',
    stationName: 'Nodo Presión Acueducto Vecinal Villa Independencia – Pie de Palo',
    parameter: 'Presión manométrica en red troncal',
    unit: 'bar',
    lastValue: 2.35,
    thresholdWarning: 1.8,
    status: 'normal',
    requiresHumanReview: true,
    lastEventHash: 'c318f509a241d76e',
    lastReceivedAt: '2026-10-04T11:12:00.000Z',
  },
  {
    id: 'tel-st-04',
    stationCode: 'TELEM-CAP-BEN-04',
    nodeKey: 'capital',
    stationName: 'Compuerta Urbana Canal Benavidez – Derivador Acequias Distrito Centro y Desamparados',
    parameter: 'Nivel de escurrimiento superficial',
    unit: 'cm',
    lastValue: 48.5,
    thresholdWarning: 75.0,
    status: 'normal',
    requiresHumanReview: true,
    lastEventHash: 'd519a038c472e19b',
    lastReceivedAt: '2026-10-04T11:16:00.000Z',
  },
];

export const REPORT_FLOW = ['received', 'evaluating', 'in_progress', 'resolved'];

export function computeHash(type: string, nodeId: string, payload: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify({ type, nodeId, payload }))
    .digest('hex')
    .slice(0, 16);
}
