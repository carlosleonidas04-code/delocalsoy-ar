// DELocalSoy.AR — MVP-1 «Atlas Territorial» S4 (RFC-021, #532, épica
// OBJE-CAMPUS #531): frontend del Atlas por nodo — composición de
// SOLO-LECTURA de superficies ya acreditadas (ADR-084 RATIFICADA DH
// 2026-11-15), consumida por contrato DataSource (ADR-040).
//
// Reglas vivas:
//  - R5: ningún error HTTP se convierte en []; la divergencia del contrato
//    se propaga (DataSourceHttpError) — jamás un bloque fabricado.
//  - R15: los estados honestos (publicado | sin_fuente_ingestada |
//    en_custodia) se declaran con TEXTO visible, jamás solo color (WCAG
//    2.2 AA, ADR-061); un bloque sin datos se declara, no se estima.
//  - R5/ADR-036 (anti-ranking): el atlas compone conteos y estados con
//    procedencia, jamás puntajes ni comparaciones entre nodos.
//  - Patrón Iglesia (geo sensible): estados y conteos, jamás geometrías.

export type NodoAtlasKey = 'capital' | 'caucete' | 'iglesia';

export type EstadoBloqueAtlasUI = 'publicado' | 'sin_fuente_ingestada' | 'en_custodia';

export const NODOS_ATLAS: ReadonlyArray<{ key: NodoAtlasKey; nombre: string }> = [
  { key: 'capital', nombre: 'Capital' },
  { key: 'caucete', nombre: 'Caucete' },
  { key: 'iglesia', nombre: 'Valle de Iglesia' },
];

export const ORDEN_BLOQUES_ATLAS = [
  'vocabulario',
  'kpis',
  'amenazas',
  'convenios',
  'curricular',
] as const;

export type BloqueAtlasId = (typeof ORDEN_BLOQUES_ATLAS)[number];

export const ETIQUETAS_ESTADO_BLOQUE: Record<EstadoBloqueAtlasUI, string> = {
  publicado: 'Publicado',
  sin_fuente_ingestada: 'Sin fuente ingerida',
  en_custodia: 'En custodia del pipeline',
};

// WCAG 2.2 AA (ADR-061): cada bloque lleva título y descripción accesible —
// el significado nunca depende solo del color ni de la posición.
export const METADATOS_BLOQUE: Record<BloqueAtlasId, { titulo: string; descripcion: string }> = {
  vocabulario: {
    titulo: 'Vocabulario territorial (CORE-002)',
    descripcion: 'Nodo, capas, categorías y features declaradas en el catálogo federado.',
  },
  kpis: {
    titulo: 'KPIs del observatorio (LIC-R1)',
    descripcion: 'Indicadores materializados del nodo con fórmula, fuente y cobertura declarada.',
  },
  amenazas: {
    titulo: 'Amenaza sísmica (LIC-R4)',
    descripcion: 'Capa de referencia INPRES: metadatos y procedencia, jamás evaluación de vulnerabilidad ni alerta operativa.',
  },
  convenios: {
    titulo: 'Convenios (LIC-R9)',
    descripcion: 'Declaraciones con fuente oficial y fecha de corte por nodo.',
  },
  curricular: {
    titulo: 'Matriz curricular (MVP-1)',
    descripcion: 'Catálogo con procedencia por ingesta (ADR-082): cursos, competencias y rutas declaradas.',
  },
};

// OBJE-RFC-021-IMPL (#604, épica #531): F2 — superficie acreditada que emite
// cada bloque del detalle (enlazar, no crear rutas: diseño EV-125). Los 5
// endpoints son GET públicos REALES del openapi v7.54.0 (83 paths) — nada
// fabricado; anti-ranking R5/ADR-036: navegación, jamás comparación.
export const SUPERFICIES_BLOQUE: Record<BloqueAtlasId, { superficie: string; endpoint: string }> = {
  vocabulario: {
    superficie: 'Vocabulario público (CORE-002) · GET /api/nodos',
    endpoint: '/api/nodos',
  },
  kpis: {
    superficie: 'Observatorio de indicadores (LIC-R1) · GET /api/nodos/{key}/observatorio',
    endpoint: '/api/nodos/{key}/observatorio',
  },
  amenazas: {
    superficie: 'Capa de amenaza sísmica (LIC-R4) · GET /api/amenazas',
    endpoint: '/api/amenazas',
  },
  convenios: {
    superficie: 'Convenios declarados (LIC-R9) · GET /api/convenios',
    endpoint: '/api/convenios',
  },
  curricular: {
    superficie: 'Matriz curricular declarada (MVP-1 S2) · GET /api/curricular/rutas',
    endpoint: '/api/curricular/rutas',
  },
};

/** URL pública real de la superficie emisora del bloque (openapi v7.54.0, 0 rutas nuevas). */
export function enlaceSuperficie(bloque: BloqueAtlasId, nodoKey: NodoAtlasKey): string {
  return SUPERFICIES_BLOQUE[bloque].endpoint.replace('{key}', nodoKey);
}

export interface BloqueAtlasUI {
  bloque: BloqueAtlasId;
  estado: EstadoBloqueAtlasUI;
  detalle: string | null;
}

export interface AtlasNodoUI {
  nodo_key: NodoAtlasKey;
  bloques: BloqueAtlasUI[];
}

function esEstadoBloque(valor: unknown): valor is EstadoBloqueAtlasUI {
  return valor === 'publicado' || valor === 'sin_fuente_ingestada' || valor === 'en_custodia';
}

/**
 * Normaliza el payload real de GET /api/atlas/:nodo (envelope ya abierto:
 * `data`). R5/R15: si el nodo no coincide, falta un bloque acreditado, hay
 * un bloque desconocido o un estado fuera del vocabulario honesto, se
 * propaga el error — JAMÁS un bloque inventado o una lista vacía silenciosa.
 * Los bloques vuelven en el orden canónico declarado.
 */
export function normalizarAtlasNodo(raw: unknown, nodoKey: NodoAtlasKey): AtlasNodoUI {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Respuesta malformada del atlas: se esperaba un objeto por nodo');
  }
  const fila = raw as Record<string, unknown>;
  if (fila.nodo_key !== nodoKey) {
    throw new Error('Respuesta malformada del atlas: el nodo_key no coincide con el solicitado');
  }
  if (!Array.isArray(fila.bloques)) {
    throw new Error('Respuesta malformada del atlas: se esperaba un arreglo en bloques');
  }
  const porId = new Map<string, { estado: unknown; detalle: unknown }>();
  for (const item of fila.bloques) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Respuesta malformada del atlas: bloque no es un objeto');
    }
    const b = item as Record<string, unknown>;
    if (typeof b.bloque !== 'string' || !ORDEN_BLOQUES_ATLAS.includes(b.bloque as BloqueAtlasId)) {
      throw new Error('Respuesta malformada del atlas: bloque desconocido — ' + String(b.bloque));
    }
    if (porId.has(b.bloque)) {
      throw new Error('Respuesta malformada del atlas: bloque duplicado — ' + b.bloque);
    }
    porId.set(b.bloque, { estado: b.estado, detalle: b.detalle });
  }
  const bloques: BloqueAtlasUI[] = ORDEN_BLOQUES_ATLAS.map((id) => {
    const encontrado = porId.get(id);
    if (!encontrado) {
      throw new Error('Respuesta malformada del atlas: falta el bloque acreditado — ' + id);
    }
    if (!esEstadoBloque(encontrado.estado)) {
      throw new Error('Respuesta malformada del atlas: estado honesto inválido en ' + id);
    }
    const detalle =
      typeof encontrado.detalle === 'string' && encontrado.detalle.length > 0 ? encontrado.detalle : null;
    return { bloque: id, estado: encontrado.estado, detalle };
  });
  return { nodo_key: nodoKey, bloques };
}

/** Etiqueta textual del estado — el color nunca es el único portador (WCAG 1.4.1). */
export function etiquetaEstadoBloque(estado: EstadoBloqueAtlasUI): string {
  return ETIQUETAS_ESTADO_BLOQUE[estado];
}

/**
 * Descripción accesible del bloque según su estado (WCAG 2.2 AA, ADR-061):
 * combina los metadatos del bloque con su estado declarado en texto.
 */
export function descripcionAccesibleBloque(bloque: BloqueAtlasUI): string {
  const meta = METADATOS_BLOQUE[bloque.bloque];
  const estado = etiquetaEstadoBloque(bloque.estado);
  return meta.titulo + ' — ' + estado + '. ' + (bloque.detalle ?? meta.descripcion);
}

/**
 * F3 — Procedencia por bloque (DL-13): qué superficie pública emite el
 * bloque y en qué estado de custodia está, declarado en TEXTO (R15: ni la
 * fuente ni la fecha de corte se fabrican; cuando el servidor las trae ya
 * viajan dentro de `detalle`, que se muestra aparte).
 */
export function procedenciaBloque(bloque: BloqueAtlasUI): string {
  return 'Emitido por ' + SUPERFICIES_BLOQUE[bloque.bloque].superficie + ' · custodia: ' + etiquetaEstadoBloque(bloque.estado);
}

// INTER-TERR IT-R2 (#611, épica #607): ancla territorial por bloque — la capa
// PostGIS del mapa (TerritoriosMap) que respalda al bloque CUANDO su
// superficie emite geometría acreditada; si no, capa null + nota honesta
// (R15: ni capa vacía ni respaldo inventado; el respaldo se declara, no se
// sugiere). Anti-ranking R5/ADR-036: el ancla nunca puntúa ni compara nodos.
export type CapaTerritorialKey = 'assets' | 'problems' | 'public_space';

export interface AnclaTerritorial {
  capa: CapaTerritorialKey | null;
  nota: string;
}

export const ANCLA_TERRITORIAL_BLOQUE: Record<BloqueAtlasId, AnclaTerritorial> = {
  vocabulario: {
    capa: null,
    nota: 'el vocabulario declara capas y features del catálogo federado, sin geometría propia en el mapa',
  },
  kpis: {
    capa: 'assets',
    nota: 'substrato: la capa Assets del mapa muestra los activos verificados que los conteos del observatorio relevan; la cobertura exacta la declara el observatorio',
  },
  amenazas: {
    capa: null,
    nota: 'la capa sísmica viva por ingesta DL-9 (LIC-R4) no se traza en el mapa: estados y conteos, jamás geometrías sensibles (patrón Iglesia)',
  },
  convenios: {
    capa: null,
    nota: 'los convenios son declaraciones con fuente oficial y fecha de corte, sin geometría territorial',
  },
  curricular: {
    capa: null,
    nota: 'la matriz curricular no emite geometría territorial (ADR-082: procedencia por ingesta)',
  },
};

export function anclaTerritorial(bloque: BloqueAtlasId): AnclaTerritorial {
  return ANCLA_TERRITORIAL_BLOQUE[bloque];
}
