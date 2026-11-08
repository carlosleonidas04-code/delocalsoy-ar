/**
 * apps/web/src/lib/montajePlataforma.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — MONTAR-2 (#445): catálogo declarativo del MONTAJE COMPLETO del
 * artefacto de la plataforma. La vista consolidadora (sección 10 de App.tsx,
 * componente MontajePlataforma) APILA todo lo acreditado en main: la superficie
 * real, los nodos federados con su montaje ratificado, los artefactos A1–A4,
 * los stages armonizados y la acreditación de compilación.
 *
 * R15 (nada se declara sin ancla): cada bloque declara su estado epistémico y
 * su FUENTE de acreditación (EV / issue / PR). Los stages quedan marcados
 * synthetic_demo (material ilustrativo de diseño, jamás acreditado) y la
 * acreditación full-stack nace pending hasta la corrida real de la DH en
 * Codespaces (EV-102 al pegar la salida en #445).
 */

export type EstadoEpistemico =
  | 'verified'
  | 'community_validated'
  | 'pending'
  | 'synthetic_demo';

export type CapaMontaje =
  | 'plataforma'
  | 'nodos'
  | 'artefactos'
  | 'stages'
  | 'acreditacion';

export interface BloqueMontaje {
  id: string;
  capa: CapaMontaje;
  titulo: string;
  detalle: string;
  estado: EstadoEpistemico;
  fuente: string;
  ancla?: string;
}

/** Vocabulario ratificado del nodo Capital (PEC 2025 · #154 — seed real EV-048). */
export const SUBNODOS_CAPITAL_RATIFICADOS = [
  'sj_capital_centro',
  'sj_capital_desamparados',
] as const;

/** Distritos ratificados del Valle de Iglesia (VIG-001 · #171 — seed real EV-040/041). */
export const SUBNODOS_IGLESIA_DISTRITOS_RATIFICADOS = [
  'sj_iglesia_angualasto',
  'sj_iglesia_bella_vista',
  'sj_iglesia_las_flores',
  'sj_iglesia_rodeo',
  'sj_iglesia_tudcum',
  'sj_iglesia_villa_iglesia',
] as const;

/** Anclas REALES de App.tsx que la vista consolidadora puede enlazar (botón ir →). */
export const ANCLAS_REALES = [
  'top',
  'tendencias-trimestrales',
  'cartografia-workspace',
  'artefactos',
  'stage-capital-215',
  'stage-valle-de-iglesia',
] as const;

export interface CapaInfo {
  capa: CapaMontaje;
  titulo: string;
  descripcion: string;
}

export const CAPAS_MONTAJE: CapaInfo[] = [
  {
    capa: 'plataforma',
    titulo: 'Capa 1 · Superficie real de la plataforma',
    descripcion: 'Los bloques de App.tsx que leen por contrato DataSource (ADR-029) o exponen el modelo federado.',
  },
  {
    capa: 'nodos',
    titulo: 'Capa 2 · Nodos federados con su montaje ratificado',
    descripcion: 'Capital, Caucete y Valle de Iglesia: los bloques que cada nodo ensambló, con su acreditación (H1–H4: el montaje cambia de nodo, las reglas no).',
  },
  {
    capa: 'artefactos',
    titulo: 'Capa 3 · Artefactos por rol (A1–A4)',
    descripcion: 'Sesión JWT real y los cuatro artefactos de la sección 9 (ArtefactosRoot, regla M0).',
  },
  {
    capa: 'stages',
    titulo: 'Capa 4 · Stages armonizados [STAGE · ILUSTRATIVO R15]',
    descripcion: 'Material de diseño de los stages 6g/6h, armonizado al vocabulario ratificado (MONTAR-2): ilustrativo, jamás acreditado.',
  },
  {
    capa: 'acreditacion',
    titulo: 'Capa 5 · Acreditación y compilación',
    descripcion: 'La cadena de acreditación de la plataforma: CI, evidencia, matriz de sellos, contrato vivo y el montaje full-stack compilado.',
  },
];

export const MONTAJE_PLATAFORMA: BloqueMontaje[] = [
  // ── Capa 1 · Superficie real de la plataforma ──────────────────────────────
  {
    id: 'plataforma-hub',
    capa: 'plataforma',
    titulo: 'Plataforma territorial real — 13 módulos de dominio',
    detalle: 'TerritorialPlatformHub: primer flujo vertical acreditado de punta a punta (CORE-004 6/6).',
    estado: 'verified',
    fuente: 'EV-031..EV-035 (#87)',
    ancla: 'top',
  },
  {
    id: 'plataforma-trazabilidad',
    capa: 'plataforma',
    titulo: 'Trazabilidad append-only (events_raw)',
    detalle: 'El libro contable del monorepo: events_raw es la única fuente de verdad (ADR-032).',
    estado: 'verified',
    fuente: 'ADR-032 · EV-001..EV-018',
  },
  {
    id: 'plataforma-explorador',
    capa: 'plataforma',
    titulo: 'Explorador federado + comparación transversal',
    detalle: 'Nodos federados sin homogeneización (H1–H4: el montaje cambia de nodo, las reglas no).',
    estado: 'verified',
    fuente: 'ADR-021 (modelo federado)',
  },
  {
    id: 'plataforma-showcase',
    capa: 'plataforma',
    titulo: 'Recorrido del showcase (6b) — demo final VIG-007',
    detalle: 'Caucete → Capital → Valle de Iglesia leyendo el estado REAL de la API: 0 honesto (R15).',
    estado: 'verified',
    fuente: 'EV-047 (#193)',
  },
  {
    id: 'plataforma-servicio',
    capa: 'plataforma',
    titulo: 'Servicio informativo ciudadano (6c) — Caucete',
    detalle: 'Capas v6 + catálogo de fuentes (ADR-035) + ingestas publicadas (NC-EV-09).',
    estado: 'verified',
    fuente: 'EV-050 (#142)',
  },
  {
    id: 'plataforma-mercado',
    capa: 'plataforma',
    titulo: 'Mercado de Proximidad (6d)',
    detalle: 'Directorio de comercios federado (MK-1/MK-2), ofertas (MK-3) y relay (MK-4a).',
    estado: 'verified',
    fuente: 'MK-1 #243 · MK-2 #254 · EV-094..EV-096 · EV-098',
  },
  {
    id: 'plataforma-capital-dashboard',
    capa: 'plataforma',
    titulo: 'Vista del nodo Capital (6e)',
    detalle: 'Banco de Potencialidades + corredores v0.1 + accesibilidad peatonal.',
    estado: 'verified',
    fuente: 'NCAP-FE #163 · EV-077..EV-081',
  },
  {
    id: 'plataforma-vialidad',
    capa: 'plataforma',
    titulo: 'Vialidad y movilidad del nodo Iglesia (6f)',
    detalle: 'Módulo NODO-VIG-3: dashboard VIG-013, tablero DPV, AMC y planilla papel.',
    estado: 'verified',
    fuente: 'VIG-010..VIG-014 (#377)',
  },
  {
    id: 'plataforma-cartografia',
    capa: 'plataforma',
    titulo: 'Cartografía real + workspace (7/8)',
    detalle: 'Registro maestro y cartografía con exportación verificada.',
    estado: 'verified',
    fuente: 'main (R15: las capas declaran su origen)',
    ancla: 'cartografia-workspace',
  },
  {
    id: 'plataforma-tendencias',
    capa: 'plataforma',
    titulo: 'Tendencias trimestrales',
    detalle: 'Serie multitemporal del modelo federado.',
    estado: 'verified',
    fuente: 'main',
    ancla: 'tendencias-trimestrales',
  },

  // ── Capa 2 · Nodos federados con su montaje ratificado ──────────────────────
  {
    id: 'capital-subnodos',
    capa: 'nodos',
    titulo: 'Capital — subnodos provisionales (PEC 2025)',
    detalle: 'sj_capital_centro + sj_capital_desamparados, boundary provisional; lat/lng null (R15).',
    estado: 'verified',
    fuente: 'EV-048 (#198) · #154',
  },
  {
    id: 'capital-bloque9',
    capa: 'nodos',
    titulo: 'Capital — Bloque 9: Banco de Potencialidades',
    detalle: 'Dominio de oportunidades con evidencia obligatoria y ciclo sellado.',
    estado: 'verified',
    fuente: 'EV-039 (#160) · ext #165',
  },
  {
    id: 'capital-corredores',
    capa: 'nodos',
    titulo: 'Capital — corredores v0.1',
    detalle: 'Red MODELADA sin geometría; status candidate = hipótesis de diseño, no traza oficial.',
    estado: 'pending',
    fuente: '#156 (EV-077)',
  },
  {
    id: 'caucete-capas',
    capa: 'nodos',
    titulo: 'Caucete — capas v6 ratificadas',
    detalle: 'hydrology, seismic_risk, public_space, accessibility, sustainability (ADR-035).',
    estado: 'verified',
    fuente: 'EV-037 (#143)',
  },
  {
    id: 'caucete-fichas',
    capa: 'nodos',
    titulo: 'Caucete — ficha de valoración del espacio público',
    detalle: 'Instrumento de 7 dimensiones; fase «Valorar» del Ciclo de Cuidado.',
    estado: 'community_validated',
    fuente: 'EV-038 (#149)',
  },
  {
    id: 'caucete-fuentes',
    capa: 'nodos',
    titulo: 'Caucete — catálogo de fuentes y procedencia',
    detalle: 'ADR-035 aterrizado: fuentes + ingestas con pipeline de administración.',
    estado: 'verified',
    fuente: 'EV-049 (#200)',
  },
  {
    id: 'caucete-subnodos',
    capa: 'nodos',
    titulo: 'Caucete — activación territorial',
    detalle: '10 subnodos Georef/INDEC provisionales del departamento.',
    estado: 'verified',
    fuente: 'NC-R6 #145 (2026-10-20)',
  },
  {
    id: 'iglesia-subnodos',
    capa: 'nodos',
    titulo: 'Iglesia — 52 subnodos territoriales',
    detalle: '6 distritos + localidad + parajes/pasos con punto público BAHRA/Georef; lat/lng null (R15).',
    estado: 'verified',
    fuente: 'EV-040 (#171) · EV-041 (#177)',
  },
  {
    id: 'iglesia-activos',
    capa: 'nodos',
    titulo: 'Iglesia — activos multimodales (VIG-002)',
    detalle: 'Tipos local | prestador | experiencia | observacion con visibilidad (ADR-036).',
    estado: 'verified',
    fuente: 'EV-042 (#169)',
  },
  {
    id: 'iglesia-patrimonio',
    capa: 'nodos',
    titulo: 'Iglesia — patrimonio protegido (VIG-004)',
    detalle: 'Angualasto, Achango y molinos; geometría sensible JAMÁS publicada (VIG-009).',
    estado: 'verified',
    fuente: 'EV-044 (#173) · #241',
  },
  {
    id: 'iglesia-kpis',
    capa: 'nodos',
    titulo: 'Iglesia — KPIs + RAG territorial ético',
    detalle: 'kpi_snapshots + rag_index re-derivados del dominio; consulta SIN LLM.',
    estado: 'verified',
    fuente: 'EV-043 (#182) · EV-046 (#188)',
  },
  {
    id: 'iglesia-produccion',
    capa: 'nodos',
    titulo: 'Iglesia — producción, turismo y vialidad',
    detalle: 'VIG-005 productos/operativa, VIG-008 cooperativas y módulo vial VIG-010..014.',
    estado: 'verified',
    fuente: 'EV-045 (#174) · #240 · #377',
  },

  // ── Capa 3 · Artefactos por rol (A1–A4) ────────────────────────────────────
  {
    id: 'artefacto-sesion',
    capa: 'artefactos',
    titulo: 'Sesión JWT real + degradación honesta (ART-R0)',
    detalle: 'El gate por rol: sin sesión nadie asume el rol que la API exige.',
    estado: 'verified',
    fuente: '#269 (ADR-031) · PR #267',
    ancla: 'artefactos',
  },
  {
    id: 'artefacto-micuenta',
    capa: 'artefactos',
    titulo: 'Mi cuenta — residencia y visitante (AR1)',
    detalle: 'Vecino = atributo con sello residencia.declarada; visitante = rol real de solo lectura (v0.2).',
    estado: 'verified',
    fuente: 'EV-089 (#400)',
    ancla: 'artefactos',
  },
  {
    id: 'artefacto-a1',
    capa: 'artefactos',
    titulo: 'A1 Vecino/Ciudadano — 9 vistas + 3 detalles',
    detalle: 'Escritura ciudadana y lectura pública; mini-router interno (PROT-A1 R3).',
    estado: 'verified',
    fuente: 'EV-099 (#270 · #420)',
    ancla: 'artefactos',
  },
  {
    id: 'artefacto-a2',
    capa: 'artefactos',
    titulo: 'A2 Comerciante — 7 vistas + ficha',
    detalle: 'Mercado de Proximidad: alta, titularidad solo-hash, habilitación SIIC, historial F-3.',
    estado: 'verified',
    fuente: 'EV-090 (#273) · EV-100 (#401 · #425)',
    ancla: 'artefactos',
  },
  {
    id: 'artefacto-a3',
    capa: 'artefactos',
    titulo: 'A3 Gestor — bandeja unificada de pendientes',
    detalle: 'Reportes, fichas, oportunidades y activos con sello esperado ANTES de confirmar (ADR-038).',
    estado: 'verified',
    fuente: 'EV-091 (#402)',
    ancla: 'artefactos',
  },
  {
    id: 'artefacto-a4',
    capa: 'artefactos',
    titulo: 'A4 Auditor — libro contable de sellos',
    detalle: 'GET /api/sellos con cobertura contra la matriz (40 filas, regla 5).',
    estado: 'verified',
    fuente: 'EV-092 (#403)',
    ancla: 'artefactos',
  },

  // ── Capa 4 · Stages armonizados [STAGE · ILUSTRATIVO R15] ───────────────────
  {
    id: 'stage-capital-215',
    capa: 'stages',
    titulo: 'Stage Capital #215 (6g) — armonizado',
    detalle: 'Filtro y fixtures SOLO sobre sj_capital_centro + sj_capital_desamparados (#154); dataset ilustrativo.',
    estado: 'synthetic_demo',
    fuente: 'MONTAR-1 #442 · MONTAR-2 #445',
    ancla: 'stage-capital-215',
  },
  {
    id: 'stage-valle-de-iglesia',
    capa: 'stages',
    titulo: 'Stage Valle de Iglesia (6h) — armonizado',
    detalle: 'Distritos exponen su clave sj_iglesia_* del seed VIG-001; el monitor de cuencas es fixture sin procedencia.',
    estado: 'synthetic_demo',
    fuente: 'MONTAR-1 #442 · MONTAR-2 #445',
    ancla: 'stage-valle-de-iglesia',
  },

  // ── Capa 5 · Acreditación y compilación ─────────────────────────────────────
  {
    id: 'acreditacion-ci',
    capa: 'acreditacion',
    titulo: 'CI del monorepo',
    detalle: 'build + test (PostGIS/Redis reales) + vertical + scope + compuerta r9 en cada PR.',
    estado: 'verified',
    fuente: 'ci.yml v19 (auto-report)',
  },
  {
    id: 'acreditacion-evidencia',
    capa: 'acreditacion',
    titulo: 'Matriz de evidencia',
    detalle: 'docs/EVIDENCIA.md: EV-001..EV-101 ancladas a SHA de main.',
    estado: 'verified',
    fuente: 'R4/R15 · patrón C5',
  },
  {
    id: 'acreditacion-sellos',
    capa: 'acreditacion',
    titulo: 'Matriz de sellos (40 filas)',
    detalle: 'docs/MATRIZ_SELLOS.md con diente en CI (regla 5, C5 #412).',
    estado: 'verified',
    fuente: 'C5 #412 · AR4 #403',
  },
  {
    id: 'acreditacion-openapi',
    capa: 'acreditacion',
    titulo: 'Contrato vivo OpenAPI v7.43.0 (67 paths)',
    detalle: 'docs/api/openapi.json valida 1:1 contra las rutas montadas.',
    estado: 'verified',
    fuente: 'regla documental R9',
  },
  {
    id: 'acreditacion-fullstack',
    capa: 'acreditacion',
    titulo: 'Montaje full-stack compilado (Codespaces)',
    detalle: 'docker compose + seed (18 SQL en 1 lote con advisory lock) + api :3001 + worker (3 consumer groups) + web VITE_REAL_API=1. Corre la DH con el checklist del README; EV-102 al pegar la salida en #445.',
    estado: 'pending',
    fuente: 'MONTAR-2 #445',
  },
];

export interface CapaAgrupada extends CapaInfo {
  bloques: BloqueMontaje[];
}

/** Agrupa el catálogo en las 5 capas del apilado, en el orden declarado. */
export function agruparPorCapa(bloques: BloqueMontaje[]): CapaAgrupada[] {
  return CAPAS_MONTAJE.map((c) => ({
    ...c,
    bloques: bloques.filter((b) => b.capa === c.capa),
  }));
}

export const ETIQUETA_ESTADO: Record<EstadoEpistemico, string> = {
  verified: '● verified — acreditado con procedencia',
  community_validated: '● community_validated — respaldo comunitario',
  pending: '◐ pending — sin materializar aún (R15)',
  synthetic_demo: '◈ synthetic_demo — ilustrativo, no acreditado (R15)',
};
