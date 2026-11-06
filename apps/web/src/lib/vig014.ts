// NODO-VIG-3 VIG-014 (#380, épica #377 — cierra el módulo): frontend del
// módulo de infraestructura y movilidad del nodo iglesia. Superficie del
// nodo: vista del dashboard (VIG-013, GET /api/nodos/:key/infraestructura-
// movilidad), mapa con capas y puntos críticos (GET /api/nodos/:key/features),
// tablero de pedidos a DPV (VIG-012, GET /api/pedidos?nodo=), formulario AMC
// (VIG-011, POST /api/reportes), seguimiento del propio reporte
// (GET /api/reportes/mios, GET /api/reportes/:id/historial) y planilla de
// papel imprimible (modo offline diferido — observado_en).
//
// R15/R5: nada se inventa — null ≠ 0, 0 es un dato honesto, el error es
// error y jamás []. km_ejecucion null honesto (no hay km estructurados en
// fuente verificada); paradas de transporte VACÍAS hasta que exista padrón
// verificado; anuncio ≠ obra; la comunidad corrobora, NUNCA verifica.
//
// AMC_DOMINIOS / AMC_CATEGORIAS_POR_DOMINIO: copia citada para
// VISUALIZACIÓN del canon de la API (contracts, VIG-010 #381) — si la API
// extiende la tabla, esta copia se actualiza en el mismo PR. La coherencia
// dominio→categoría la valida SIEMPRE la API (400): el cliente solo la
// anticipa para no castigar al vecino con un envío que ya sabe que cae.

export type AmcDominioVig =
  | 'espacio_publico'
  | 'infraestructura_vial'
  | 'movilidad'
  | 'agua_saneamiento'
  | 'clima_ambiente'
  | 'conectividad'
  | 'servicios'
  | 'produccion_rural'
  | 'patrimonio'
  | (string & {});

export type AmcCanalIngreso = 'web' | 'papel' | 'whatsapp' | 'presencial';
export type AmcPrecision = 'gps' | 'referencial' | 'aproximado';
export type ReporteEstado = 'received' | 'evaluating' | 'in_progress' | 'resolved' | 'descartado' | (string & {});

// Copia citada del canon de la API (contracts AMC_CATEGORIAS_POR_DOMINIO,
// VIG-010 #381): espejo EXACTO para visualización de solo lectura.
export const AMC_DOMINIOS: AmcDominioVig[] = [
  'espacio_publico',
  'infraestructura_vial',
  'movilidad',
  'agua_saneamiento',
  'clima_ambiente',
  'conectividad',
  'servicios',
  'produccion_rural',
  'patrimonio',
];

export const AMC_CATEGORIAS_POR_DOMINIO: Record<string, string[]> = {
  espacio_publico: [
    'street_lighting', 'sidewalk_condition', 'plaza_furniture', 'waste_dumping',
    'tree_damage', 'stray_animals', 'noise_dust_nuisance',
  ],
  infraestructura_vial: [
    'road_surface', 'urban_surface', 'road_shoulder', 'road_signage',
    'road_barrier', 'bridge_culvert', 'work_zone_risk',
  ],
  movilidad: [
    'bus_stop_issue', 'service_frequency', 'school_health_transport',
    'pedestrian_crossing', 'active_mobility_risk',
  ],
  agua_saneamiento: [
    'drinking_water_issue', 'sewer_drainage', 'irrigation_conflict',
  ],
  clima_ambiente: [
    'drought_scarcity', 'snow_ice', 'zonda_dust', 'frost_hail',
    'flash_flood_risk', 'fog_visibility', 'urban_rural_pests',
  ],
  conectividad: [
    'cell_dead_zone', 'internet_gap', 'sos_coverage_gap',
  ],
  servicios: [
    'power_grid_issue', 'health_access_issue', 'school_facility_issue',
    'security_post_issue', 'public_building_issue',
  ],
  produccion_rural: [
    'productive_access', 'agro_practice_issue', 'wildlife_corridor', 'damaged_road',
  ],
  patrimonio: [
    'damaged_heritage', 'patrimonio_deterioro', 'patrimonio_perdida',
  ],
};

export const ETIQUETA_DOMINIO: Record<string, string> = {
  espacio_publico: 'Espacio público',
  infraestructura_vial: 'Infraestructura vial',
  movilidad: 'Movilidad',
  agua_saneamiento: 'Agua y saneamiento',
  clima_ambiente: 'Clima y ambiente',
  conectividad: 'Conectividad',
  servicios: 'Servicios',
  produccion_rural: 'Producción rural',
  patrimonio: 'Patrimonio',
};

export const ETIQUETA_CANAL: Record<string, string> = {
  web: 'Web (cuenta propia)',
  papel: 'Planilla de papel (mediador)',
  whatsapp: 'WhatsApp (mediador)',
  presencial: 'Presencial (asamblea)',
};

export const ETIQUETA_PRECISION: Record<string, string> = {
  gps: 'Punto GPS',
  referencial: 'Referencial (frente a un referente)',
  aproximado: 'Aproximado (zona general)',
};

export const ETIQUETA_ESTADO_REPORTE: Record<string, string> = {
  received: 'Recibido',
  evaluating: 'En evaluación',
  in_progress: 'En curso',
  resolved: 'Resuelto',
  descartado: 'Descartado (visible solo para su autor)',
};

export const ETIQUETA_ESTADO_FEATURE: Record<string, string> = {
  declared: 'Declarado (anuncio — R15)',
  in_execution: 'En ejecución declarada',
  completed: 'Obra completada (declarada)',
  verified: 'Verificado',
  community_validated: 'Corroborado por la comunidad',
  pending: 'Pendiente de revisión',
  disputed: 'En disputa',
  synthetic_demo: 'Demo sintética',
};

// ─── Tipos del dashboard (VIG-013, GET /:key/infraestructura-movilidad) ───

export interface ConteoPorEstadoVig {
  estado: string;
  total: number;
}

export interface ObraVialResumen {
  total: number;
  por_estado: Record<string, number>;
  por_fuente: Array<{ fuente: string; total: number }>;
  km_ejecucion: number | null; // null honesto (R15): km sin fuente estructurada
  km_nota: string;
  fecha_corte: string | null;
  cautela: string;
}

export interface PuntoCriticoItem {
  id: string;
  titulo: string; // «N reportes de M vecinos» — nunca un puntaje
  estado: string;
  observado_at: string; // YYYY-MM-DD
}

export interface PuntosCriticosResumen {
  total: number;
  por_estado: Record<string, number>;
  criticos: PuntoCriticoItem[];
  fecha_corte: string | null;
  cautela: string;
}

export interface ParadasResumen {
  total: number; // 0 honesto: la capa nace VACÍA (R15)
  por_estado: Record<string, number>;
  cobertura: string;
  fuente: string;
  cautela: string;
}

export interface BrechaSosDeclarada {
  tramo: string;
  estado: string;
  fuente: string;
}

export interface CoberturaSosResumen {
  red_por_estado: Record<string, number>;
  brechas_declaradas: BrechaSosDeclarada[];
  fecha_corte: string | null;
  cautela: string;
}

export interface PedidosDpvResumen {
  esperados_documento: number;
  presentados: number;
  respondidos: number;
  cobertura: string;
  fecha_corte: string | null;
}

export interface KpiSnapshotVig {
  kpi_key: string;
  valor: number | null; // null honesto (R15)
  detalles: Record<string, number>;
  computed_at: string;
}

export interface KpisResumen {
  total: number;
  snapshots: KpiSnapshotVig[];
  fecha_corte: string | null;
  nota: string;
}

export interface InfraestructuraMovilidad {
  nodo_key: string;
  generado_en: string;
  regla: string;
  obras: ObraVialResumen;
  puntos_criticos: PuntosCriticosResumen;
  paradas_transporte: ParadasResumen;
  cobertura_sos: CoberturaSosResumen;
  pedidos_dpv: PedidosDpvResumen;
  kpis: KpisResumen;
}

// ─── Tipos del tablero de pedidos (VIG-012, GET /api/pedidos?nodo=) ───

export interface PedidoDpvItem {
  key: string;
  bloque: string;
  tema: string;
  destinatario: string;
  fecha_presentacion: string;
  plazo_dias: number;
  estado: string;
  estado_efectivo: string; // 'sin_respuesta' se DERIVA en lectura (R15)
  respondido_en: string | null;
  nota_respuesta: string | null;
  evidencia: Array<{ cluster_key: string; titulo: string | null; estado: string | null }>;
}

export interface PedidosTablero {
  esperados_documento: number;
  presentados: number;
  respondidos: number;
  respondidos_en_plazo: number;
  respondidos_tardio: number;
  sin_respuesta: number;
  en_espera: number;
  fecha_corte: string | null;
  cobertura: string;
  fuente: string;
  pedidos: PedidoDpvItem[];
}

// ─── Tipos de subnodos (VIG-001, GET /:key/subnodos) ───

export interface SubnodoVig {
  key: string;
  label: string;
  type: string; // district | paraje | subparaje | locality
  parent_key: string | null;
  lat: number | null; // null honesto: sin punto público verificado (R15)
  lng: number | null;
}

// ─── Tipos de reportes AMC (VIG-011, POST /api/reportes + /mios + /historial) ───

export interface ReporteTransicion {
  estado_anterior: string;
  estado_nuevo: string;
  justificacion: string;
  moderador_hash: string; // pseudónimo sha256 — sin PII (ADR-027)
  occurred_at: string;
}

export interface MiReporte {
  id: string;
  nodo_key: string | null;
  categoria: string;
  descripcion: string;
  estado: ReporteEstado;
  lat: number;
  lng: number;
  created_at: string;
  transiciones: ReporteTransicion[];
}

export interface ReporteHistorial {
  reporte_id: string;
  transiciones: ReporteTransicion[];
}

export interface ReporteAmcForm {
  nodo_key: string;
  categoria: string;
  descripcion: string;
  lat: number;
  lng: number;
  subnodo_key: string;
  dominio: string;
  tipo?: string;
  canal_ingreso: AmcCanalIngreso;
  precision: AmcPrecision;
  riesgo_inmediato: boolean;
  mediador_ref?: string;
  reportado_por?: string; // alias comunitario — NUNCA el nombre de la planilla
  consentimiento?: { acepta_devolucion_contacto: boolean; guarda_alias: boolean };
  observado_en?: string; // YYYY-MM-DD — carga diferida de planilla (papel)
}

export interface ReporteAmcResultado {
  id: string;
  categoria: string;
  estado: string;
  creado: boolean; // false = reintento idempotente (200, una escritura, un evento)
  duplicados_sugeridos: Array<{ id: string; categoria: string; estado: string }>;
  duplicados_verificados: boolean; // false = el cómputo falló (R15 honesto)
  cluster: { cluster_key: string | null } | null;
  cluster_verificado: boolean;
  devolucion: string; // devolución visible por el canal de origen
}

// ─── Helpers de forma (R5: sin fallbacks silenciosos) ───

function comoTexto(v: unknown): string {
  return typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v);
}

function comoTextoNulo(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return typeof v === 'string' ? v : String(v);
}

function comoNumero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0;
}

function comoConteos(v: unknown): Record<string, number> {
  if (typeof v !== 'object' || v === null) return {};
  const salida: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    salida[k] = comoNumero(val);
  }
  return salida;
}

function comoArreglo(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function comoRegistro(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

// ─── Normalizadores (formas reales de la API — R15: sin inventar) ───

export function normalizarInfraestructuraMovilidad(data: unknown): InfraestructuraMovilidad {
  const d = comoRegistro(data);
  const obras = comoRegistro(d.obras);
  const criticos = comoRegistro(d.puntos_criticos);
  const paradas = comoRegistro(d.paradas_transporte);
  const sos = comoRegistro(d.cobertura_sos);
  const pedidos = comoRegistro(d.pedidos_dpv);
  const kpis = comoRegistro(d.kpis);
  return {
    nodo_key: comoTexto(d.nodo_key),
    generado_en: comoTexto(d.generado_en),
    regla: comoTexto(d.regla),
    obras: {
      total: comoNumero(obras.total),
      por_estado: comoConteos(obras.por_estado),
      por_fuente: comoArreglo(obras.por_fuente).map((f) => {
        const r = comoRegistro(f);
        return { fuente: comoTexto(r.fuente), total: comoNumero(r.total) };
      }),
      km_ejecucion: typeof obras.km_ejecucion === 'number' ? obras.km_ejecucion : null,
      km_nota: comoTexto(obras.km_nota),
      fecha_corte: comoTextoNulo(obras.fecha_corte),
      cautela: comoTexto(obras.cautela),
    },
    puntos_criticos: {
      total: comoNumero(criticos.total),
      por_estado: comoConteos(criticos.por_estado),
      criticos: comoArreglo(criticos.criticos).map((c) => {
        const r = comoRegistro(c);
        return {
          id: comoTexto(r.id),
          titulo: comoTexto(r.titulo),
          estado: comoTexto(r.estado),
          observado_at: comoTexto(r.observado_at),
        };
      }),
      fecha_corte: comoTextoNulo(criticos.fecha_corte),
      cautela: comoTexto(criticos.cautela),
    },
    paradas_transporte: {
      total: comoNumero(paradas.total),
      por_estado: comoConteos(paradas.por_estado),
      cobertura: comoTexto(paradas.cobertura),
      fuente: comoTexto(paradas.fuente),
      cautela: comoTexto(paradas.cautela),
    },
    cobertura_sos: {
      red_por_estado: comoConteos(sos.red_por_estado),
      brechas_declaradas: comoArreglo(sos.brechas_declaradas).map((b) => {
        const r = comoRegistro(b);
        return {
          tramo: comoTexto(r.tramo),
          estado: comoTexto(r.estado),
          fuente: comoTexto(r.fuente),
        };
      }),
      fecha_corte: comoTextoNulo(sos.fecha_corte),
      cautela: comoTexto(sos.cautela),
    },
    pedidos_dpv: {
      esperados_documento: comoNumero(pedidos.esperados_documento),
      presentados: comoNumero(pedidos.presentados),
      respondidos: comoNumero(pedidos.respondidos),
      cobertura: comoTexto(pedidos.cobertura),
      fecha_corte: comoTextoNulo(pedidos.fecha_corte),
    },
    kpis: {
      total: comoNumero(kpis.total),
      snapshots: comoArreglo(kpis.snapshots).map((s) => {
        const r = comoRegistro(s);
        return {
          kpi_key: comoTexto(r.kpi_key),
          valor: typeof r.valor === 'number' ? r.valor : null,
          detalles: comoConteos(r.detalles),
          computed_at: comoTexto(r.computed_at),
        };
      }),
      fecha_corte: comoTextoNulo(kpis.fecha_corte),
      nota: comoTexto(kpis.nota),
    },
  };
}

export function normalizarPedidosTablero(data: unknown): PedidosTablero {
  const d = comoRegistro(data);
  return {
    esperados_documento: comoNumero(d.esperados_documento),
    presentados: comoNumero(d.presentados),
    respondidos: comoNumero(d.respondidos),
    respondidos_en_plazo: comoNumero(d.respondidos_en_plazo),
    respondidos_tardio: comoNumero(d.respondidos_tardio),
    sin_respuesta: comoNumero(d.sin_respuesta),
    en_espera: comoNumero(d.en_espera),
    fecha_corte: comoTextoNulo(d.fecha_corte),
    cobertura: comoTexto(d.cobertura),
    fuente: comoTexto(d.fuente),
    pedidos: comoArreglo(d.pedidos).map((p) => {
      const r = comoRegistro(p);
      return {
        key: comoTexto(r.key),
        bloque: comoTexto(r.bloque),
        tema: comoTexto(r.tema),
        destinatario: comoTexto(r.destinatario),
        fecha_presentacion: comoTexto(r.fecha_presentacion),
        plazo_dias: comoNumero(r.plazo_dias),
        estado: comoTexto(r.estado),
        estado_efectivo: comoTexto(r.estado_efectivo),
        respondido_en: comoTextoNulo(r.respondido_en),
        nota_respuesta: comoTextoNulo(r.nota_respuesta),
        evidencia: comoArreglo(r.evidencia).map((e) => {
          const er = comoRegistro(e);
          return {
            cluster_key: comoTexto(er.cluster_key),
            titulo: comoTextoNulo(er.titulo),
            estado: comoTextoNulo(er.estado),
          };
        }),
      };
    }),
  };
}

export function normalizarSubnodos(data: unknown): SubnodoVig[] {
  return comoArreglo(data).map((s) => {
    const r = comoRegistro(s);
    return {
      key: comoTexto(r.key),
      label: comoTexto(r.label),
      type: comoTexto(r.type),
      parent_key: comoTextoNulo(r.parent_key),
      lat: typeof r.lat === 'number' ? r.lat : null,
      lng: typeof r.lng === 'number' ? r.lng : null,
    };
  });
}

function normalizarTransiciones(v: unknown): ReporteTransicion[] {
  return comoArreglo(v).map((t) => {
    const r = comoRegistro(t);
    return {
      estado_anterior: comoTexto(r.estado_anterior),
      estado_nuevo: comoTexto(r.estado_nuevo),
      justificacion: comoTexto(r.justificacion),
      moderador_hash: comoTexto(r.moderador_hash),
      occurred_at: comoTexto(r.occurred_at),
    };
  });
}

export function normalizarMisReportes(data: unknown): MiReporte[] {
  return comoArreglo(data).map((m) => {
    const r = comoRegistro(m);
    return {
      id: comoTexto(r.id),
      nodo_key: comoTextoNulo(r.nodo_key),
      categoria: comoTexto(r.categoria),
      descripcion: comoTexto(r.descripcion),
      estado: comoTexto(r.estado),
      lat: comoNumero(r.lat),
      lng: comoNumero(r.lng),
      created_at: comoTexto(r.created_at),
      transiciones: normalizarTransiciones(r.transiciones),
    };
  });
}

export function normalizarReporteHistorial(data: unknown): ReporteHistorial {
  const d = comoRegistro(data);
  return {
    reporte_id: comoTexto(d.reporte_id),
    transiciones: normalizarTransiciones(d.transiciones),
  };
}

export function normalizarReporteAmcRespuesta(payload: unknown): ReporteAmcResultado {
  const p = comoRegistro(payload);
  const data = comoRegistro(p.data);
  const id = comoTexto(data.id);
  return {
    id,
    categoria: comoTexto(data.categoria),
    estado: comoTexto(data.estado),
    // 201 = creación acreditada; 200 = reintento idempotente del mismo
    // ciudadano (una escritura, un evento — R4/R15).
    creado: p.idempotente !== true,
    duplicados_sugeridos: comoArreglo(p.duplicados_sugeridos).map((s) => {
      const r = comoRegistro(s);
      return {
        id: comoTexto(r.id),
        categoria: comoTexto(r.categoria),
        estado: comoTexto(r.estado),
      };
    }),
    duplicados_verificados: p.duplicados_verificados === true,
    cluster: p.cluster === null || p.cluster === undefined ? null : { cluster_key: comoTextoNulo(comoRegistro(p.cluster).cluster_key) },
    cluster_verificado: p.cluster_verificado !== false,
    devolucion: comoTexto(p.devolucion),
  };
}

// Payload de creación: el formulario + el token JWT de la sesión (la
// escritura AMC exige sesión real — en synthetic es demo declarada, R15).
export interface ReporteAmcCreatePayload extends ReporteAmcForm {
  token: string;
}

// ─── Validación cliente del alta AMC (espejo del Zod de la API) ───
// La API valida SIEMPRE (contrato ReporteAmcAltaSchema, contracts); este
// espejo solo anticipa los rechazos obvios para no castigar al vecino con
// un envío que ya sabe que cae (400). NUNCA sustituye la validación real.

export interface ValidacionAmc {
  ok: boolean;
  errores: string[]; // mensajes en español, uno por regla rota
}

export function validarReporteAmc(form: ReporteAmcForm): ValidacionAmc {
  const errores: string[] = [];
  if (form.nodo_key !== 'iglesia') errores.push('el módulo AMC vive en el nodo iglesia');
  if (form.categoria.length < 2 || form.categoria.length > 60 || !/^[a-z0-9_]+$/.test(form.categoria)) {
    errores.push('categoría: slug de 2 a 60 caracteres (minúsculas y guiones bajos)');
  }
  if (AMC_CATEGORIAS_POR_DOMINIO[form.dominio]?.includes(form.categoria) !== true) {
    errores.push('la categoría no pertenece al dominio declarado (canon VIG-010)');
  }
  if (form.descripcion.trim().length < 10 || form.descripcion.length > 2000) {
    errores.push('descripción: entre 10 y 2000 caracteres');
  }
  if (form.lat < -90 || form.lat > 90) errores.push('latitud fuera de rango (-90..90)');
  if (form.lng < -180 || form.lng > 180) errores.push('longitud fuera de rango (-180..180)');
  if (form.subnodo_key.length < 4 || form.subnodo_key.length > 60 || !/^[a-z0-9_]+$/.test(form.subnodo_key)) {
    errores.push('distrito/paraje: elegí una de las opciones del Valle (VIG-001)');
  }
  if (form.tipo !== undefined && (form.tipo.length > 40 || !/^[a-z0-9_]+$/.test(form.tipo))) {
    errores.push('tipo N3: slug de hasta 40 caracteres');
  }
  if (form.observado_en !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(form.observado_en)) {
    errores.push('fecha del testimonio: formato YYYY-MM-DD');
  }
  // Refine (a): alias declarado ⇒ consentimiento guarda_alias explícito.
  if (form.reportado_por !== undefined) {
    if (form.reportado_por.trim().length < 2 || form.reportado_por.length > 80) {
      errores.push('alias comunitario: entre 2 y 80 caracteres');
    }
    if (form.consentimiento?.guarda_alias !== true) {
      errores.push('guardar el alias exige consentimiento granular guarda_alias (ADR-027, Ley 25.326)');
    }
  }
  // Refine (b) y (c): canal mediado ⇒ mediador con aval y alias del vecino.
  if (form.canal_ingreso === 'papel' || form.canal_ingreso === 'whatsapp') {
    if (form.mediador_ref === undefined || form.mediador_ref.length === 0) {
      errores.push('el canal papel/WhatsApp exige el mediador con aval (ingesta humana sin bot — R15)');
    }
    if (form.reportado_por === undefined || form.reportado_por.length === 0) {
      errores.push('el canal papel/WhatsApp exige el alias comunitario del vecino (sin PII)');
    }
  }
  return { ok: errores.length === 0, errores };
}

// ─── Helpers de mapa (capas del módulo — features con is_synthetic) ───

export interface FeatureMapaVig {
  id: string;
  capa: string; // obra_vial | punto_critico | parada_transporte | cobertura_sos
  titulo: string;
  estado: string;
  fuente_label: string;
  lat: number;
  lng: number;
  is_synthetic: boolean;
}

export function normalizarFeaturesMapa(data: unknown): FeatureMapaVig[] {
  return comoArreglo(data).map((f) => {
    const r = comoRegistro(f);
    return {
      id: comoTexto(r.id),
      capa: comoTexto(r.layer),
      titulo: comoTexto(r.titulo),
      estado: comoTexto(r.estado),
      fuente_label: comoTexto(r.fuente_label),
      lat: comoNumero(r.lat),
      lng: comoNumero(r.lng),
      is_synthetic: r.is_synthetic === true,
    };
  });
}

// Bbox de proyección del scatter SVG: si no hay features, un bbox de
// referencia del Valle de Iglesia (declarado — jamás un mapa vacío
// presentado como «sin datos»).
export function calcularBboxVig(
  features: FeatureMapaVig[],
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const bbox = { minLat: -30.6, maxLat: -29.9, minLng: -69.6, maxLng: -68.9 };
  if (features.length === 0) return bbox;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  for (const f of features) {
    if (f.lat < minLat) minLat = f.lat;
    if (f.lat > maxLat) maxLat = f.lat;
    if (f.lng < minLng) minLng = f.lng;
    if (f.lng > maxLng) maxLng = f.lng;
  }
  // Padding mínimo para que un punto aislado no colapse la escala.
  const padLat = Math.max((maxLat - minLat) * 0.08, 0.02);
  const padLng = Math.max((maxLng - minLng) * 0.08, 0.02);
  return { minLat: minLat - padLat, maxLat: maxLat + padLat, minLng: minLng - padLng, maxLng: maxLng + padLng };
}
