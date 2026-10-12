// Datos sintéticos del demo territorial (DEMO-2, #17).
// Extraídos 1:1 de DemoTerritorialFederado.jsx v5.1. Archivo .js deliberado:
// allowJs + checkJs=false en apps/web/tsconfig.json lo excluye del typecheck
// estricto. Se consume vía SyntheticDataSource (contrato DataSource), nunca
// directamente desde la UI.

export const NODE_COLORS = { capital: "#C2410C", caucete: "#2F7D5B", iglesia: "#1D4E89" };

export const NODES = [
  {
    id: "capital-centro",
    key: "capital",
    name: "Capital",
    subtitle: "Centro–Cívico–Desamparados",
    population: 115000,
    focus: "Comercio y espacio público",
    focusLong: "Iluminación, arbolado, veredas y acequias del corredor Centro–Cívico–Desamparados, dentro del departamento Capital. El nodo prueba la lectura urbana densa del núcleo común.",
    narrative: "Comercio y espacio público",
    center: { lat: -31.537, lng: -68.522 },
  },
  {
    id: "caucete",
    key: "caucete",
    name: "Caucete",
    subtitle: "Departamento",
    population: 44000,
    focus: "Educación, salud y comunidad",
    focusLong: "Acceso a salud, puntos de resiliencia ante eventos y recursos comunitarios. El nodo prueba el vocabulario rural-periurbano.",
    narrative: "Educación, salud y comunidad",
    center: { lat: -31.383, lng: -68.281 },
  },
  {
    id: "iglesia",
    key: "iglesia",
    name: "Iglesia",
    subtitle: "Departamento",
    population: 8800,
    focus: "Producción y turismo",
    focusLong: "Producción y servicios (semillas, frutos secos, frutales, hortalizas), caminos rurales y senderos, patrimonio turístico. El nodo prueba la federación con identidad productiva.",
    narrative: "Producción y turismo rural",
    center: { lat: -31.206, lng: -68.866 },
  },
].map((n) => ({ ...n, color: NODE_COLORS[n.key] }));

// ─── Capas por nodo (catálogo explícito, no inferible en frontend) ───
export const LAYERS = {
  capital: [
    { key: "commerce", name: "Comercio y servicios", domain: "assets", geometry: "Point", defaultOn: true, producedBy: ["businesses"] },
    { key: "public_space", name: "Espacio público", domain: "public_space", geometry: "Point", defaultOn: true, producedBy: ["community", "institutions"] },
    { key: "public_lighting", name: "Iluminación pública", domain: "problems", geometry: "Point", defaultOn: false, producedBy: ["community", "institutions"] },
    { key: "trees", name: "Arbolado", domain: "assets", geometry: "Point", defaultOn: false, producedBy: ["community"] },
    { key: "sidewalks", name: "Veredas y rampas", domain: "problems", geometry: "LineString", defaultOn: false, producedBy: ["community", "businesses"] },
    { key: "irrigation_channels", name: "Acequias y canales", domain: "assets", geometry: "LineString", defaultOn: false, producedBy: ["institutions"] },
  ],
  caucete: [
    { key: "health_facilities", name: "Salud", domain: "health", geometry: "Point", defaultOn: true, producedBy: ["institutions"] },
    { key: "education", name: "Educación", domain: "community", geometry: "Point", defaultOn: true, producedBy: ["institutions"] },
    { key: "community_spaces", name: "Espacios y recursos comunitarios", domain: "community", geometry: "Point", defaultOn: true, producedBy: ["community", "institutions"] },
    { key: "resilience_points", name: "Puntos de resiliencia", domain: "health", geometry: "Point", defaultOn: false, producedBy: ["community", "institutions"] },
    { key: "community_resources", name: "Agua y recursos básicos", domain: "community", geometry: "Point", defaultOn: false, producedBy: ["community"] },
    { key: "hydrology", name: "Hidrología: canales, acequias y drenaje", domain: "assets", geometry: "LineString", defaultOn: true, producedBy: ["institutions", "community"] },
    { key: "seismic_risk", name: "Riesgo sísmico y puntos de encuentro", domain: "health", geometry: "Point", defaultOn: true, producedBy: ["institutions", "community"] },
    { key: "public_space", name: "Espacio público y mejora del común", domain: "public_space", geometry: "Point", defaultOn: true, producedBy: ["community", "institutions"] },
    { key: "accessibility", name: "Accesibilidad: veredas, rampas y transporte", domain: "problems", geometry: "Point", defaultOn: false, producedBy: ["community"] },
    { key: "sustainability", name: "Sustentabilidad: agua, arbolado, energía y residuos", domain: "community", geometry: "Point", defaultOn: false, producedBy: ["community", "institutions"] },
  ],
  iglesia: [
    { key: "productive_units", name: "Producción y servicios (olivícola, semillas, frutos secos, frutales, hortalizas)", domain: "production", geometry: "Point", defaultOn: true, producedBy: ["community", "businesses"] },
    { key: "rural_services", name: "Caminos rurales y senderos", domain: "problems", geometry: "LineString", defaultOn: true, producedBy: ["community"] },
    { key: "tourism_resources", name: "Turismo y patrimonio", domain: "tourism", geometry: "Point", defaultOn: true, producedBy: ["institutions"] },
  ],
};

export const CATEGORIES = {
  capital: [
    { code: "insufficient_lighting", label: "Iluminación insuficiente", layer: "public_lighting" },
    { code: "broken_lamp", label: "Luminaria averiada", layer: "public_lighting" },
    { code: "dark_corridor", label: "Corredor oscuro", layer: "public_lighting" },
    { code: "damaged_sidewalk", label: "Vereda dañada", layer: "sidewalks" },
    { code: "at_risk_tree", label: "Árbol en riesgo", layer: "trees" },
    { code: "obstructed_channel", label: "Acequia obstruida", layer: "irrigation_channels" },
    { code: "inactive_business", label: "Comercio sin actividad", layer: "commerce" },
    { code: "damaged_public_furniture", label: "Mobiliario público dañado", layer: "public_space" },
  ],
  caucete: [
    { code: "no_transport", label: "Sin transporte al centro de salud", layer: "health_facilities" },
    { code: "long_distance", label: "Distancia excesiva", layer: "health_facilities" },
    { code: "blocked_road", label: "Camino bloqueado", layer: "resilience_points" },
    { code: "missing_meeting_point", label: "Falta punto de encuentro", layer: "resilience_points" },
    { code: "water_quality_issue", label: "Problema de calidad de agua", layer: "community_resources" },
    { code: "school_access_issue", label: "Problema de acceso a escuela", layer: "education" },
    { code: "closed_community_space", label: "Espacio comunitario cerrado", layer: "community_spaces" },
    { code: "obstructed_channel", label: "Acequia o canal obstruido", layer: "hydrology" },
    { code: "flood_risk", label: "Riesgo hídrico o anegamiento", layer: "hydrology" },
    { code: "unsafe_building", label: "Edificación no sismorresistente", layer: "seismic_risk" },
    { code: "blocked_evacuation_route", label: "Ruta de evacuación obstruida", layer: "seismic_risk" },
    { code: "damaged_public_space", label: "Espacio público dañado", layer: "public_space" },
    { code: "abandoned_public_space", label: "Espacio público en desuso", layer: "public_space" },
    { code: "missing_ramp", label: "Falta rampa de accesibilidad", layer: "accessibility" },
    { code: "damaged_sidewalk", label: "Vereda dañada", layer: "accessibility" },
    { code: "water_waste", label: "Pérdida o desperdicio de agua", layer: "sustainability" },
    { code: "missing_shade_trees", label: "Falta de arbolado y sombra", layer: "sustainability" },
  ],
  iglesia: [
    { code: "damaged_road", label: "Camino rural dañado", layer: "rural_services" },
    { code: "blocked_trail", label: "Sendero obstruido o dañado", layer: "rural_services" },
    { code: "water_shortage", label: "Escasez de agua para producción", layer: "productive_units" },
    { code: "pest_outbreak", label: "Plaga en cultivo", layer: "productive_units" },
    { code: "prod_semillas", label: "Producción: Semillas (ajo/cebolla)", layer: "productive_units" },
    { code: "prod_frutos_secos", label: "Producción: Frutos secos (nogales)", layer: "productive_units" },
    { code: "prod_frutales", label: "Producción: Frutales", layer: "productive_units" },
    { code: "prod_hortalizas", label: "Producción: Hortalizas", layer: "productive_units" },
    { code: "missing_signal", label: "Señalización turística faltante", layer: "tourism_resources" },
    { code: "damaged_heritage", label: "Patrimonio en riesgo", layer: "tourism_resources" },
  ],
};

// ─── Features sintéticos (isSynthetic: true, source y status visibles) ───
export const SOURCE_KIND = {
  "Cámara de comercio": "registro sectorial",
  "Relevamiento comercial": "relevamiento",
  "Relevamiento comunitario": "relevamiento comunitario",
  "Inventario institucional": "inventario institucional",
  "Reporte vecinal": "reporte vecinal",
  "Generación sintética (demo)": "generación sintética",
  "Institución local": "institución local",
  "Institución local (demo)": "institución local",
  "Productor local": "productor",
  "Productor hortícola": "productor",
  "Cooperativa Agrícola": "productor",
  "Cooperativa local": "productor",
  "Guía local": "guía local",
  "Registro social": "registro comunitario",
};
// Regla de la demo: ninguna fuente nombra a una organización real. Se muestra solo el tipo de fuente, como ilustración.
const mk = (id, nodeKey, layer, x, y, title, status, sourceLabel, observedAt, extra) => ({
  id, nodeKey, layer, x, y, title, status, observedAt,
  sourceLabel: "Ilustrativa · " + (SOURCE_KIND[sourceLabel] ?? "tipo de fuente de ejemplo"),
  isSynthetic: true, domain: extra?.domain ?? "assets",
  type: extra?.type ?? "problem", props: extra?.props ?? {},
});

export const FEATURES = [
  // Capital — comercio
  mk("f-cap-101", "capital", "commerce", 42, 36, "Galería comercial céntrica — 12 locales activos", "verified", "Cámara de comercio", "2026-09-08", { type: "asset", domain: "assets" }),
  mk("f-cap-102", "capital", "commerce", 33, 52, "Comercio de barrio con actividad reducida", "community_validated", "Relevamiento comercial", "2026-09-21", { type: "asset", domain: "assets" }),
  mk("f-cap-103", "capital", "commerce", 60, 62, "Ferias y mercado municipal (demo)", "synthetic_demo", "Generación sintética (demo)", "2026-09-30", { type: "asset", domain: "assets" }),
  mk("f-cap-104", "capital", "commerce", 25, 30, "Local en desuso con cartel caído", "pending", "Reporte vecinal", "2026-09-25", { type: "problem", domain: "assets" }),
  // Capital — espacio público
  mk("f-cap-105", "capital", "public_space", 50, 44, "Plaza 25 de Mayo — mobiliario en buen estado", "verified", "Inventario institucional", "2026-09-10", { type: "asset", domain: "public_space" }),
  mk("f-cap-106", "capital", "public_space", 68, 36, "Plaza de barrio sin juegos infantiles operativos", "community_validated", "Relevamiento comunitario", "2026-09-17", { type: "problem", domain: "public_space" }),
  mk("f-cap-107", "capital", "public_space", 38, 66, "Paseo peatonal con bancos dañados", "pending", "Relevamiento comunitario", "2026-09-23", { type: "problem", domain: "public_space" }),
  mk("f-cap-108", "capital", "public_space", 72, 52, "Espacio verde sin mantenimiento (demo)", "synthetic_demo", "Generación sintética (demo)", "2026-10-01", { type: "problem", domain: "public_space" }),
  // Capital
  mk("f-cap-001", "capital", "public_lighting", 22, 30, "Iluminación insuficiente en Av. San Martín", "community_validated", "Relevamiento comunitario", "2026-09-18", { type: "problem", domain: "problems" }),
  mk("f-cap-002", "capital", "public_lighting", 48, 55, "Luminarias averiadas (3) — corredor peatonal", "pending", "Relevamiento comunitario", "2026-09-24", { type: "problem", domain: "problems" }),
  mk("f-cap-003", "capital", "public_lighting", 64, 24, "Corredor oscuro frente a plaza", "synthetic_demo", "Generación sintética (demo)", "2026-09-28", { type: "problem", domain: "problems" }),
  mk("f-cap-004", "capital", "public_lighting", 35, 68, "Iluminación insuficiente en calle Rivadavia", "community_validated", "Relevamiento comunitario", "2026-09-20", { type: "problem", domain: "problems" }),
  mk("f-cap-005", "capital", "trees", 30, 42, "Árbol en riesgo — ramas sobre cableado", "pending", "Reporte vecinal", "2026-09-22", { type: "asset", domain: "assets" }),
  mk("f-cap-006", "capital", "trees", 58, 33, "Árbol caído (sintético demo)", "synthetic_demo", "Generación sintética (demo)", "2026-09-30", { type: "asset", domain: "assets" }),
  mk("f-cap-007", "capital", "trees", 44, 72, "Falta de forestación en cuadra", "community_validated", "Relevamiento comunitario", "2026-09-15", { type: "asset", domain: "assets" }),
  mk("f-cap-008", "capital", "sidewalks", 26, 58, "Vereda dañada — baldosas rotas", "community_validated", "Relevamiento comercial", "2026-09-19", { type: "problem", domain: "problems" }),
  mk("f-cap-009", "capital", "sidewalks", 52, 78, "Vereda obstructida — postes sin rampa", "pending", "Reporte vecinal", "2026-09-26", { type: "problem", domain: "problems" }),
  mk("f-cap-010", "capital", "irrigation_channels", 70, 60, "Acequia obstruida — sector norte", "synthetic_demo", "Institución local (demo)", "2026-10-01", { type: "asset", domain: "assets" }),
  mk("f-cap-011", "capital", "public_lighting", 80, 44, "Luminaria averiada en Galería céntrica", "verified", "Inventario institucional", "2026-09-10", { type: "problem", domain: "problems" }),
  mk("f-cap-012", "capital", "sidewalks", 15, 75, "Falta rampa de accesibilidad", "community_validated", "Relevamiento comercial", "2026-09-12", { type: "problem", domain: "problems" }),
  // Caucete — educación
  mk("f-cau-101", "caucete", "education", 42, 30, "Escuela primaria con matrícula estable", "verified", "Inventario institucional", "2026-09-09", { type: "asset", domain: "community" }),
  mk("f-cau-102", "caucete", "education", 55, 44, "Escuela rural — acceso con camino dañado", "community_validated", "Relevamiento comunitario", "2026-09-19", { type: "problem", domain: "community" }),
  mk("f-cau-103", "caucete", "education", 30, 55, "Escuela secundaria sin conectividad estable", "pending", "Reporte vecinal", "2026-09-24", { type: "problem", domain: "community" }),
  mk("f-cau-104", "caucete", "education", 64, 28, "Jardín de infantes (demo)", "synthetic_demo", "Generación sintética (demo)", "2026-09-28", { type: "asset", domain: "community" }),
  // Caucete — espacios comunitarios
  mk("f-cau-105", "caucete", "community_spaces", 48, 38, "Biblioteca popular municipal — horario reducido", "community_validated", "Relevamiento comunitario", "2026-09-18", { type: "asset", domain: "community" }),
  mk("f-cau-106", "caucete", "community_spaces", 58, 58, "Centro comunitario operativo (ejemplo)", "verified", "Inventario institucional", "2026-09-08", { type: "asset", domain: "community" }),
  mk("f-cau-107", "caucete", "community_spaces", 35, 68, "Museo histórico local — señalética faltante", "pending", "Institución local", "2026-09-22", { type: "problem", domain: "community" }),
  mk("f-cau-108", "caucete", "community_spaces", 68, 48, "Salón comunitario sin uso activo (demo)", "synthetic_demo", "Generación sintética (demo)", "2026-09-30", { type: "asset", domain: "community" }),
  mk("f-cau-110", "caucete", "community_spaces", 60, 45, "Organización vecinal (ejemplo)", "verified", "Registro social", "2026-09-25", { type: "asset", domain: "community" }),
  mk("f-cau-004b", "caucete", "resilience_points", 50, 25, "Punto crítico por anegamiento temporal", "community_validated", "Reporte vecinal", "2026-09-21", { type: "problem", domain: "health" }),
  // Caucete
  mk("f-cau-001", "caucete", "health_facilities", 40, 35, "Sin transporte al centro de salud (sector oeste)", "community_validated", "Relevamiento comunitario", "2026-09-16", { type: "problem", domain: "health" }),
  mk("f-cau-002", "caucete", "health_facilities", 62, 50, "Distancia excesiva al primer nivel de atención", "pending", "Relevamiento comunitario", "2026-09-23", { type: "problem", domain: "health" }),
  mk("f-cau-003", "caucete", "health_facilities", 28, 62, "Centro de salud con atención reducida", "synthetic_demo", "Generación sintética (demo)", "2026-09-29", { type: "problem", domain: "health" }),
  mk("f-cau-004", "caucete", "resilience_points", 50, 25, "Camino bloqueado tras tormenta", "community_validated", "Reporte vecinal", "2026-09-21", { type: "problem", domain: "health" }),
  mk("f-cau-005", "caucete", "resilience_points", 74, 66, "Zona de riesgo — cauce sin señalizar", "pending", "Institución local", "2026-09-25", { type: "problem", domain: "health" }),
  mk("f-cau-006", "caucete", "resilience_points", 34, 48, "Falta punto de encuentro comunitario", "synthetic_demo", "Generación sintética (demo)", "2026-09-27", { type: "asset", domain: "health" }),
  mk("f-cau-007", "caucete", "community_resources", 58, 70, "Acceso a agua comunitaria irregular", "community_validated", "Relevamiento comunitario", "2026-09-17", { type: "problem", domain: "community" }),
  mk("f-cau-008", "caucete", "community_resources", 20, 40, "Punto de agua sin mantenimiento", "pending", "Reporte vecinal", "2026-09-28", { type: "problem", domain: "community" }),
  mk("f-cau-009", "caucete", "health_facilities", 70, 33, "Posta sanitaria operativa (demo)", "synthetic_demo", "Institución local (demo)", "2026-10-01", { type: "asset", domain: "health" }),
  // Caucete — vocabulario v6 (NODO-CAU R1, #141)
  mk("f-cau-201", "caucete", "hydrology", 46, 62, "Acequia obstruida — tramo crítico", "community_validated", "Relevamiento comunitario", "2026-10-05", { type: "problem", domain: "assets" }),
  mk("f-cau-202", "caucete", "hydrology", 32, 26, "Desagüe insuficiente — punto de riesgo hídrico", "pending", "Reporte vecinal", "2026-10-06", { type: "problem", domain: "assets" }),
  mk("f-cau-203", "caucete", "seismic_risk", 54, 36, "Punto de encuentro comunitario señalado", "verified", "Inventario institucional", "2026-10-04", { type: "asset", domain: "health" }),
  mk("f-cau-204", "caucete", "public_space", 40, 50, "Plaza con mobiliario a mejorar", "community_validated", "Relevamiento comunitario", "2026-10-05", { type: "problem", domain: "public_space" }),
  mk("f-cau-205", "caucete", "sustainability", 66, 55, "Arbolado faltante en corredor cívico", "pending", "Reporte vecinal", "2026-10-06", { type: "problem", domain: "community" }),
  mk("f-cau-206", "caucete", "accessibility", 24, 34, "Falta rampa de accesibilidad en acceso escolar", "community_validated", "Relevamiento comunitario", "2026-10-05", { type: "problem", domain: "problems" }),
  // Iglesia — producción: subcapas (olivícola, semillas, frutos secos, frutales, hortalizas)
  mk("f-igl-101", "iglesia", "productive_units", 30, 40, "Finca olivícola familiar — producción activa", "community_validated", "Productor local", "2026-09-14", { type: "asset", domain: "production" }),
  mk("f-igl-102", "iglesia", "productive_units", 45, 60, "Producción de semillas — ajo y cebolla", "verified", "Cooperativa Agrícola", "2026-09-15", { type: "asset", domain: "production" }),
  mk("f-igl-103", "iglesia", "productive_units", 58, 38, "Cultivo de hortalizas bajo cubierta", "verified", "Productor hortícola", "2026-09-16", { type: "asset", domain: "production" }),
  mk("f-igl-115", "iglesia", "productive_units", 20, 46, "Finca de frutos secos — nogales en producción", "community_validated", "Productor local", "2026-09-14", { type: "asset", domain: "production" }),
  mk("f-igl-116", "iglesia", "productive_units", 50, 30, "Monte frutal — variedades de carozo", "verified", "Cooperativa Agrícola", "2026-09-12", { type: "asset", domain: "production" }),
  mk("f-igl-117", "iglesia", "productive_units", 38, 52, "Plaga en cultivo de vid — sector sur", "pending", "Productor local", "2026-09-22", { type: "problem", domain: "production" }),
  mk("f-igl-104", "iglesia", "productive_units", 20, 60, "Viñal en producción — variedad autóctona", "verified", "Cooperativa local", "2026-09-11", { type: "asset", domain: "production" }),
  mk("f-igl-105", "iglesia", "productive_units", 62, 66, "Almazara sin procesamiento local", "community_validated", "Productor local", "2026-09-19", { type: "problem", domain: "production" }),
  // Iglesia — caminos rurales y senderos
  mk("f-igl-106", "iglesia", "rural_services", 72, 70, "Camino rural con erosión hídrica — tramo crítico", "community_validated", "Productor local", "2026-09-20", { type: "problem", domain: "problems" }),
  mk("f-igl-107", "iglesia", "rural_services", 48, 76, "Camino sin mantenimiento estacional", "pending", "Reporte vecinal", "2026-09-26", { type: "problem", domain: "problems" }),
  mk("f-igl-108", "iglesia", "rural_services", 26, 68, "Badén erosionado en acceso a finca", "community_validated", "Productor local", "2026-09-16", { type: "problem", domain: "problems" }),
  mk("f-igl-118", "iglesia", "rural_services", 65, 80, "Sendero de arrieros obstruido", "pending", "Guía local", "2026-09-22", { type: "problem", domain: "problems" }),
  mk("f-igl-109", "iglesia", "rural_services", 58, 82, "Camino consolidado en buen estado (demo)", "synthetic_demo", "Generación sintética (demo)", "2026-10-01", { type: "asset", domain: "problems" }),
  // Iglesia — turismo y patrimonio
  mk("f-igl-110", "iglesia", "tourism_resources", 66, 45, "Señalización turística faltante", "community_validated", "Relevamiento comunitario", "2026-09-18", { type: "problem", domain: "tourism" }),
  mk("f-igl-111", "iglesia", "tourism_resources", 38, 66, "Patrimonio dañado — muro histórico", "pending", "Institución local", "2026-09-24", { type: "problem", domain: "tourism" }),
  mk("f-igl-112", "iglesia", "tourism_resources", 24, 22, "Mirador sin servicios básicos", "synthetic_demo", "Generación sintética (demo)", "2026-09-27", { type: "problem", domain: "tourism" }),
  mk("f-igl-113", "iglesia", "tourism_resources", 34, 34, "Capilla histórica con visitas guiadas", "verified", "Inventario institucional", "2026-09-09", { type: "asset", domain: "tourism" }),
  mk("f-igl-114", "iglesia", "tourism_resources", 52, 48, "Bodega con venta directa al visitante", "community_validated", "Relevamiento comunitario", "2026-09-17", { type: "asset", domain: "tourism" }),
  // Iglesia (compatibilidad con reportes previos)
  mk("f-igl-001", "iglesia", "productive_units", 30, 40, "Escasez de agua para riego en finca", "community_validated", "Productor local", "2026-09-14", { type: "problem", domain: "production" }),
];

// ─── NODO-CAU R4 (#149): fichas de valoración comunitaria (testimonios demo) ───
// Paridad con packages/contracts (FichaRespuestasV1 — snake_case, forma del
// contrato) y con la API real /api/fichas-valoracion. Ancladas al feature
// f-cau-204 de la capa public_space de caucete: la ficha NO tiene geometría
// propia — el espacio acredita la ubicación. Estados ADR-036: testimonio →
// corroborada | descartada; el estado público derivado es validado|testimonio.
// Datos de diseño (R15): isSynthetic true, fuente ilustrativa sin
// organizaciones reales; observables del ESPACIO, nunca personas (#149).

export const FICHAS_VALORACION = [
  {
    id: "ficha-cau-demo-001",
    nodeKey: "caucete",
    featureId: "f-cau-204",
    version: "v1",
    estado: "corroborada",
    corroboracion: "taller_comunitario",
    estadoPublico: "validado",
    isSynthetic: true,
    sourceLabel: "Ilustrativa · ficha comunitaria",
    observedAt: "2026-10-11",
    respuestas: {
      usos_vitalidad: { usos_detectados: ["recreo", "deporte", "reunion"], nivel_actividad: "media", observaciones: "Uso familiar a la tarde; ferias los fines de semana" },
      accesibilidad: { rampa_acceso: "parcial", estado_vereda: "regular", obstaculos: false },
      sombra_arbolado: { arbolado_presente: true, sombra_horario_central: "parcial", lectura_3_30_300: "Se observan 4 árboles maduros en el perímetro" },
      agua_xerojardin: { riego: "no", perdidas_visibles: false, especies_apto_clima: "desconocido" },
      seguridad_disenio: { iluminacion: "regular", visibilidad: "buena", mantenimiento: "regular", destinos_activos_cercanos: true },
      equipamiento: { bancos: true, juegos_infantiles: false, canchas: true, basureros: true, bebedero: false, otro: "Pérgola de sombra" },
      custodia: { custodia_presente: true, tipo_acuerdo: "vecinal" },
      notas: "Plaza con potencial de mejora del mobiliario y los juegos",
    },
  },
  {
    id: "ficha-cau-demo-002",
    nodeKey: "caucete",
    featureId: "f-cau-204",
    version: "v1",
    estado: "testimonio",
    corroboracion: null,
    estadoPublico: "testimonio",
    isSynthetic: true,
    sourceLabel: "Ilustrativa · ficha comunitaria",
    observedAt: "2026-10-12",
    respuestas: {
      usos_vitalidad: { usos_detectados: ["descanso", "transito"], nivel_actividad: "baja", observaciones: "Cruce de caminatas escolares por la mañana" },
      accesibilidad: { rampa_acceso: "no", estado_vereda: "malo", obstaculos: true },
      sombra_arbolado: { arbolado_presente: false, sombra_horario_central: "nula" },
      agua_xerojardin: { riego: "desconocido", perdidas_visibles: false, especies_apto_clima: "no" },
      seguridad_disenio: { iluminacion: "mala", visibilidad: "regular", mantenimiento: "malo", destinos_activos_cercanos: false },
      equipamiento: { bancos: false, juegos_infantiles: false, canchas: false, basureros: false, bebedero: false },
      custodia: { custodia_presente: false, tipo_acuerdo: "ninguno" },
      notas: "Sector perimetral sin uso: veredas rotas y sin iluminación",
    },
  },
];
