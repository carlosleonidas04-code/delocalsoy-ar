import React, { useEffect, useMemo, useState } from "react";


// DEMO TERRITORIAL FEDERADO — DELocalSoy.AR · v5.1 (correcciones de honestidad)
// Capital (corredor Centro–Cívico–Desamparados) · Caucete (educación, salud y comunidad) · Iglesia (producción y turismo)
// Datos 100% sintéticos: ningún registro proviene de un relevamiento real. Estados y fuentes son ilustrativos.
// Esta demo NO ejecuta inteligencia artificial: el panel ético es una plantilla fija del contrato Dato → Interpretación → Sugerencia.
// Contrato ético obligatorio: Dato → Interpretación → Sugerencia, con requiresHumanReview.


const BRAND = {
  bg: "#121212", surface: "#1C1C1C", surfaceHi: "#242424",
  text: "#F5F5F5", muted: "#A3A3A3", dim: "#737373",
  celeste: "#7BA7D9", sol: "#F5C842", border: "#2A2A2A",
};
const NODE_COLORS = { capital: "#C2410C", caucete: "#2F7D5B", iglesia: "#1D4E89" };


const STATUS_UI = {
  verified: { label: "Verificado (ejemplo)", color: "#2F9E6B" },
  pending: { label: "Pendiente (ejemplo)", color: "#E0B13A" },
  community_validated: { label: "Validación comunitaria (ejemplo)", color: "#7BA7D9" },
  synthetic_demo: { label: "Sintético (demo)", color: "#B08040" },
};
const REPORT_FLOW = ["received", "evaluating", "in_progress", "resolved"];
const REPORT_STATUS_UI = {
  received: { label: "Recibido", color: "#A3A3A3" },
  evaluating: { label: "En evaluación", color: "#E0B13A" },
  in_progress: { label: "En curso", color: "#7BA7D9" },
  resolved: { label: "Resuelto", color: "#2F9E6B" },
};


const NODES = [
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
const LAYERS = {
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
  ],
  iglesia: [
    { key: "productive_units", name: "Producción y servicios (olivícola, semillas, frutos secos, frutales, hortalizas)", domain: "production", geometry: "Point", defaultOn: true, producedBy: ["community", "businesses"] },
    { key: "rural_services", name: "Caminos rurales y senderos", domain: "problems", geometry: "LineString", defaultOn: true, producedBy: ["community"] },
    { key: "tourism_resources", name: "Turismo y patrimonio", domain: "tourism", geometry: "Point", defaultOn: true, producedBy: ["institutions"] },
  ],
};


const CATEGORIES = {
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
const SOURCE_KIND = {
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


const FEATURES = [
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


// ─── UI atómicos ───


const SyntheticFlag = () => (
  <span
    className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5"
    style={{ color: BRAND.sol, background: "rgba(245,200,66,0.10)", border: "1px solid rgba(245,200,66,0.35)" }}
  >
    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BRAND.sol }} />
    DEMO · DATOS SINTÉTICOS
  </span>
);


const StatusBadge = ({ status }) => {
  const ui = STATUS_UI[status] ?? { label: status, color: BRAND.muted };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ color: ui.color, background: "rgba(255,255,255,0.05)" }}>
      {ui.label}
    </span>
  );
};


const Logo = () => (
  <div className="flex items-center gap-2">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={BRAND.sol} strokeWidth="1.5" />
      <path d="M4 14 L10 10 L14 14 L20 9" stroke={BRAND.celeste} strokeWidth="1.5" fill="none" />
      <circle cx="10" cy="10" r="1.6" fill={NODE_COLORS.capital} />
      <circle cx="14" cy="14" r="1.6" fill={NODE_COLORS.caucete} />
      <circle cx="18" cy="10" r="1.6" fill={NODE_COLORS.iglesia} />
    </svg>
    <span className="font-bold tracking-tight" style={{ fontFamily: "Georgia, serif" }}>DELocalSoy<span style={{ color: BRAND.celeste }}>.AR</span></span>
  </div>
);


// ─── Pantalla de entrada (A1) ───
const EntryScreen = ({ onEnter, onCompare }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: BRAND.bg }}>
    <div className="w-full max-w-4xl text-center">
      <Logo />
      <div className="flex justify-center mt-4"><SyntheticFlag /></div>
      <h1 className="text-2xl md:text-3xl font-bold mt-6 mb-3" style={{ fontFamily: "Georgia, serif" }}>
        Una infraestructura común para territorios con identidad.
      </h1>
      <p className="text-sm mb-10" style={{ color: BRAND.muted }}>
        Tres nodos federados, un mismo núcleo. Cada territorio conserva su vocabulario, sus capas y su custodia.
      </p>
      <div className="grid md:grid-cols-3 gap-4">
        {NODES.map((n) => (
          <button
            key={n.id}
            onClick={() => onEnter(n.key)}
            className="text-left rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full" style={{ background: NODE_COLORS[n.key] }} />
              <span className="font-bold">{n.name}</span>
              <span className="text-xs" style={{ color: BRAND.dim }}>· {n.subtitle}</span>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: BRAND.celeste }}>{n.focus}</p>
            <p className="text-xs leading-relaxed" style={{ color: BRAND.dim }}>{n.focusLong}</p>
            <p className="text-[10px] mt-3" style={{ color: BRAND.dim }}>
              Población aprox.: {n.population.toLocaleString("es-AR")} hab (INDEC 2022, redondeado) · {LAYERS[n.key].length} capas
            </p>
          </button>
        ))}
      </div>
      <button
        onClick={onCompare}
        className="mt-6 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
        style={{ background: BRAND.surfaceHi, color: BRAND.celeste, border: "1px solid " + BRAND.celeste + "44" }}
      >
        ⇄ Comparar territorios (misma lectura, dos nodos)
      </button>
      <p className="text-xs mt-8" style={{ color: BRAND.dim }}>
        Contrato ético activo: Dato → Interpretación → Sugerencia. El sistema nunca sugiere sin revisión humana.
      </p>
    </div>
  </div>
);


// ─── Mapa SVG (placeholder sin MapLibre, mismo contrato visual) ───
const TerritoryMap = ({ node, features, onSelect, selectedId, onReportClick, reportMarkers = [] }) => {
  const gridLines = [20, 40, 60, 80];
  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 100" className="w-full h-full" style={{ background: "#161616" }}>
        {gridLines.map((g) => (
          <g key={g} stroke={BRAND.border} strokeWidth="0.2">
            <line x1={g} y1="0" x2={g} y2="100" />
            <line x1="0" y1={g} x2="100" y2={g} />
          </g>
        ))}
        {/* Perímetro simbólico del nodo */}
        <ellipse cx="50" cy="50" rx="42" ry="40" fill="none" stroke={NODE_COLORS[node.key]} strokeWidth="0.4" strokeDasharray="2 1.5" opacity="0.6" />
        <text x="50" y="7" textAnchor="middle" fontSize="2.4" fill={BRAND.dim}>
          {node.center.lat.toFixed(3)}, {node.center.lng.toFixed(3)} · {node.name}, San Juan
        </text>
        {features.map((f) => {
          const isSel = f.id === selectedId;
          const color = f.type === "asset" ? "#2F9E6B" : "#E0703A";
          return (
            <g key={f.id} onClick={() => onSelect(f)} style={{ cursor: "pointer" }}>
              <circle cx={f.x} cy={f.y} r={isSel ? 2.6 : 1.6} fill={color} opacity={isSel ? 1 : 0.85}
                stroke={isSel ? BRAND.sol : "none"} strokeWidth="0.5" />
              {isSel && <circle cx={f.x} cy={f.y} r="4.2" fill="none" stroke={BRAND.sol} strokeWidth="0.3" opacity="0.7" />}
            </g>
          );
        })}
        {reportMarkers.map((r) => (
          <g key={r.id}>
            <circle cx={r.x} cy={r.y} r="3" fill="none" stroke={BRAND.sol} strokeWidth="0.6" />
            <circle cx={r.x} cy={r.y} r="1" fill={BRAND.sol} />
          </g>
        ))}
      </svg>
      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px]" style={{ color: BRAND.dim }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#E0703A" }} /> Problemática</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#2F9E6B" }} /> Activo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ border: "1px solid " + BRAND.sol }} /> Reporte creado (demo)</span>
        <span>· Visor sin tiles (contrato MapLibre pendiente)</span>
      </div>
      <button
        onClick={onReportClick}
        className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
        style={{ background: node.color, color: "#fff" }}
      >
        + Reportar problemática
      </button>
    </div>
  );
};


// ─── Ficha de feature (A3) ───
const FeatureCard = ({ feature, node, onClose }) => (
  <div className="p-4 rounded-xl" style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}>
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-bold text-sm leading-snug">{feature.title}</h3>
      <button onClick={onClose} className="text-xs cursor-pointer shrink-0" style={{ color: BRAND.dim }}>Cerrar</button>
    </div>
    <div className="mt-3 space-y-1.5 text-xs">
      <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Tipo</span><span>{feature.type === "asset" ? "Activo territorial" : "Problemática"}</span></div>
      <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Capa</span><span>{LAYERS[feature.nodeKey].find((l) => l.key === feature.layer)?.name}</span></div>
      <div className="flex justify-between items-center"><span style={{ color: BRAND.dim }}>Estado</span><StatusBadge status={feature.status} /></div>
      <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Fuente</span><span>{feature.sourceLabel}</span></div>
      <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Fecha</span><span>{new Date(feature.observedAt).toLocaleDateString("es-AR")}</span></div>
      <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Nodo</span><span>{node.name} · {node.subtitle}</span></div>
      <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Sintético</span><span style={{ color: BRAND.sol }}>Sí (demo)</span></div>
    </div>
    <p className="text-[10px] mt-3 leading-relaxed" style={{ color: BRAND.dim }}>
      Registro de ejemplo: no proviene de un relevamiento real. Los estados y las fuentes ilustran cómo se mostrarían.
    </p>
  </div>
);


// ─── Formulario de reporte (B1) ───
const ReportForm = ({ node, onSubmit, onClose }) => {
  const [category, setCategory] = useState(CATEGORIES[node.key][0].code);
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState({ x: 50, y: 50 });
  const cats = CATEGORIES[node.key];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-md rounded-2xl p-5" style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Nuevo reporte · {node.name}</h3>
          <button onClick={onClose} className="text-xs cursor-pointer" style={{ color: BRAND.dim }}>Cancelar</button>
        </div>
        <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND.dim }}>Categoría</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg text-sm cursor-pointer"
          style={{ background: BRAND.surfaceHi, color: BRAND.text, border: `1px solid ${BRAND.border}` }}>
          {cats.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND.dim }}>Descripción</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3"
          className="w-full mb-3 px-3 py-2 rounded-lg text-sm" placeholder="Describí la observación…"
          style={{ background: BRAND.surfaceHi, color: BRAND.text, border: `1px solid ${BRAND.border}` }} />
        <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND.dim }}>
          Ubicación — clic en el mini-mapa
        </label>
        <div className="relative mb-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
          <svg viewBox="0 0 100 60" className="w-full cursor-crosshair"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setPicked({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}>
            <rect width="100" height="60" fill="#161616" />
            {[20, 40, 60, 80].map((g) => (
              <g key={g} stroke={BRAND.border} strokeWidth="0.2">
                <line x1={g} y1="0" x2={g} y2="60" /><line x1="0" y1={g * 0.6} x2="100" y2={g * 0.6} />
              </g>
            ))}
            <circle cx={picked.x} cy={picked.y * 0.6} r="2" fill={node.color} stroke={BRAND.sol} strokeWidth="0.4" />
          </svg>
        </div>
        <div className="flex gap-2 text-xs mb-3" style={{ color: BRAND.dim }}>
          <span className="px-2 py-0.5 rounded-full" style={{ background: BRAND.surfaceHi }}>Fuente: sintética (demo)</span>
          <span className="px-2 py-0.5 rounded-full" style={{ background: BRAND.surfaceHi }}>isSynthetic: true</span>
        </div>
        <p className="text-[11px] mb-4 p-2.5 rounded-lg" style={{ color: BRAND.sol, background: "rgba(245,200,66,0.08)" }}>
          ⚠ Este reporte se registrará como DATO SINTÉTICO y emitirá el evento TerritorialReportCreated en memoria.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ background: BRAND.surfaceHi, color: BRAND.muted }}>Cancelar</button>
          <button
            onClick={() => onSubmit({ category, description, picked })}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer"
            style={{ background: node.color, color: "#fff" }}>Crear reporte</button>
        </div>
      </div>
    </div>
  );
};


// ─── Panel ético (C1) — Dato → Interpretación → Sugerencia ───
const EthicalPanel = ({ node, reports, features, onClose }) => {
  const openProblems = features.filter((f) => f.type === "problem").length;
  const datoText = `Se registraron ${reports.length} reporte(s) en estado "recibido" y ${openProblems} problemáticas cartografiadas en ${node.name}.`;
  const interpText = `Lectura de ejemplo para ${node.name}: no se calculó ninguna concentración ni patrón. Este texto es una plantilla que muestra dónde iría la interpretación, separada del dato.`;
  const sugText = `Revisar con una persona responsable los registros de ${node.name} antes de definir cualquier intervención.`;
  const eventIds = reports.map((r) => r.eventId);
  return (
    <div className="p-4 rounded-xl" style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">Contrato ético (plantilla) · {node.name}</h3>
        <button onClick={onClose} className="text-xs cursor-pointer" style={{ color: BRAND.dim }}>Cerrar</button>
      </div>
      <div className="rounded-xl p-3.5" style={{ background: BRAND.surfaceHi }}>
        <div className="text-[10px] font-bold tracking-widest" style={{ color: BRAND.celeste }}>DATO</div>
        <p className="text-sm mt-1.5">{datoText}</p>
        <div className="text-[10px] mt-2" style={{ color: BRAND.dim }}>
          Evidencia: {reports.length > 0 ? reports.map((r) => r.id).join(" · ") : "features " + features.slice(0, 3).map((f) => f.id).join(" · ")}
        </div>
      </div>
      <div className="mt-3 rounded-xl p-3.5" style={{ background: BRAND.surfaceHi }}>
        <div className="text-[10px] font-bold tracking-widest" style={{ color: BRAND.sol }}>INTERPRETACIÓN</div>
        <p className="text-sm mt-1.5">{interpText}</p>
        <div className="text-[10px] mt-2" style={{ color: BRAND.dim }}>
          Método: plantilla fija (sin cálculo) · Confianza: no calculada · Interpretación provisional
        </div>
      </div>
      <div className="mt-3 rounded-xl p-3.5" style={{ background: BRAND.surfaceHi }}>
        <div className="text-[10px] font-bold tracking-widest" style={{ color: "#E0703A" }}>SUGERENCIA</div>
        <p className="text-sm mt-1.5">{sugText}</p>
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ color: BRAND.sol, background: "rgba(245,200,66,0.12)" }}>⚠ Requiere revisión humana</span>
          <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ color: BRAND.muted, background: BRAND.surface }}>Estado: borrador</span>
        </div>
      </div>
      <p className="text-[10px] mt-3 leading-relaxed" style={{ color: BRAND.dim }}>
        Trazabilidad: node {node.id} · proveedor: plantilla fija, sin modelo de IA en ejecución ·
        El sistema no puede emitir una sugerencia sin revisión humana.
      </p>
    </div>
  );
};


// ─── Trazabilidad (C3, panel opt-in) ───
const TraceabilityPanel = ({ events, node }) => (
  <div className="p-4 rounded-xl" style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}>
    <h3 className="font-bold text-sm mb-3">Trazabilidad · events_raw (en memoria)</h3>
    {events.length === 0 && (
      <p className="text-xs" style={{ color: BRAND.dim }}>Sin eventos aún. Creá un reporte para emitir TerritorialReportCreated.</p>
    )}
    <div className="space-y-2">
      {events.map((ev) => (
        <div key={ev.eventId} className="p-2.5 rounded-lg text-[11px]" style={{ background: BRAND.surfaceHi }}>
          <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Evento</span><span style={{ color: BRAND.celeste }}>{ev.type}</span></div>
          <div className="flex justify-between"><span style={{ color: BRAND.dim }}>event_id</span><span>{ev.eventId}</span></div>
          <div className="flex justify-between"><span style={{ color: BRAND.dim }}>node_id</span><span>{ev.nodeId}</span></div>
          <div className="flex justify-between"><span style={{ color: BRAND.dim }}>occurred_at</span><span>{ev.occurredAt}</span></div>
          <div className="flex justify-between"><span style={{ color: BRAND.dim }}>stream</span><span>territorial.events (in-memory)</span></div>
          <div className="flex justify-between"><span style={{ color: BRAND.dim }}>is_synthetic</span><span style={{ color: BRAND.sol }}>true</span></div>
        </div>
      ))}
    </div>
  </div>
);


// ─── Modo comparación (A4) — misma lectura, dos territorios ───
const CompareScreen = ({ onBack, onEnterNode }) => {
  const [pair, setPair] = useState(["capital", "caucete"]);
  const [domain, setDomain] = useState("problems");
  const DOMAINS = [
    { key: "problems", label: "Problemáticas" },
    { key: "assets", label: "Activos" },
    { key: "public_space", label: "Espacio público" },
    { key: "health", label: "Salud" },
    { key: "community", label: "Comunidad" },
    { key: "production", label: "Producción" },
    { key: "tourism", label: "Turismo" },
  ];
  const nodeA = NODES.find((n) => n.key === pair[0]);
  const nodeB = NODES.find((n) => n.key === pair[1]);
  const setSide = (side, key) => {
    setPair((p) => {
      const other = side === 0 ? p[1] : p[0];
      if (other === key) return p;
      const np = [...p];
      np[side] = key;
      return np;
    });
  };
  return (
    <div className="min-h-screen flex flex-col" style={{ background: BRAND.bg, color: BRAND.text }}>
      <header className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid " + BRAND.border, background: BRAND.surface }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-sm hover:underline cursor-pointer" style={{ color: BRAND.dim }}>← Nodos</button>
          <Logo />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: BRAND.celeste }}>⇄ Comparación federada</span>
          <SyntheticFlag />
        </div>
      </header>
      <div className="px-5 py-3 flex flex-wrap items-center gap-2" style={{ borderBottom: "1px solid " + BRAND.border, background: BRAND.surface }}>
        <span className="text-[10px] uppercase tracking-widest mr-1" style={{ color: BRAND.dim }}>Lectura común</span>
        {DOMAINS.map((d) => (
          <button key={d.key} onClick={() => setDomain(d.key)}
            className="px-3 py-1 rounded-full text-[11px] font-medium cursor-pointer"
            style={{
              background: domain === d.key ? BRAND.celeste + "22" : BRAND.surfaceHi,
              color: domain === d.key ? BRAND.celeste : BRAND.muted,
              border: "1px solid " + (domain === d.key ? BRAND.celeste + "55" : BRAND.border),
            }}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-0">
        {[nodeA, nodeB].map((node, side) => {
          const feats = FEATURES.filter((f) => f.nodeKey === node.key && f.domain === domain);
          const layersHere = LAYERS[node.key].filter((l) => l.domain === domain);
          return (
            <div key={node.key} className="flex flex-col" style={{ borderRight: side === 0 ? "1px solid " + BRAND.border : "none" }}>
              <div className="flex items-center justify-between px-4 py-2" style={{ background: BRAND.surface }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS[node.key] }} />
                  <span className="font-bold text-sm">{node.name}</span>
                  <span className="text-xs" style={{ color: BRAND.dim }}>{node.focus}</span>
                </div>
                <select value={node.key} onChange={(e) => setSide(side, e.target.value)}
                  className="px-2 py-1 rounded-lg text-[11px] cursor-pointer"
                  style={{ background: BRAND.surfaceHi, color: BRAND.text, border: "1px solid " + BRAND.border }}>
                  {NODES.filter((n) => n.key !== pair[side === 0 ? 1 : 0]).map((n) => (
                    <option key={n.key} value={n.key}>{n.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-h-[300px]">
                <TerritoryMap node={node} features={feats} selectedId={null} onSelect={() => {}} onReportClick={() => onEnterNode(node.key)} />
              </div>
              <div className="p-3" style={{ background: BRAND.surface, borderTop: "1px solid " + BRAND.border }}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span style={{ color: BRAND.dim }}>Capas del dominio en este nodo</span>
                  <span><b>{feats.length}</b> <span style={{ color: BRAND.dim }}>features</span></span>
                </div>
                {layersHere.length === 0 ? (
                  <p className="text-[11px]" style={{ color: BRAND.dim }}>
                    Este nodo no activa el dominio “{DOMAINS.find((d) => d.key === domain)?.label}”. La federación respeta el vocabulario local: no se fuerza la capa.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {layersHere.map((l) => (
                      <span key={l.key} className="px-2 py-0.5 rounded-full text-[10px]"
                        style={{ background: BRAND.surfaceHi, color: BRAND.muted }}>{l.name}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <footer className="py-3 text-center text-xs" style={{ borderTop: "1px solid " + BRAND.border, color: BRAND.dim }}>
        Misma infraestructura, distinta lectura · Los dominios comunes permiten comparar sin uniformar el territorio
      </footer>
    </div>
  );
};


// ─── Guía de presentación ───
// Dos modos: Pitch Day en vivo (≈4:55) y clip de pantalla para el video (0:30, el video completo admite 4:00 en total).
const PITCH_STEPS = [
  { at: "0:00", dur: 45, label: "Entrada · tesis federada", hint: "Tres territorios, un núcleo. Mostrá el cartel DEMO · DATOS SINTÉTICOS y leé el contrato ético del pie." },
  { at: "0:45", dur: 30, label: "Capital · mapa y capas", hint: "Corredor Centro–Cívico–Desamparados. Activá y desactivá una capa para mostrar el cambio sin recargar." },
  { at: "1:15", dur: 20, label: "Capital · ficha territorial", hint: "Abrí un punto: se ven fuente ilustrativa, estado de ejemplo, fecha y el aviso de dato sintético." },
  { at: "1:35", dur: 30, label: "Capital · reporte en vivo", hint: "Creá un reporte: aparece en el mapa, nace como recibido y emite TerritorialReportCreated en memoria. Avanzá el estado (simulado)." },
  { at: "2:05", dur: 30, label: "Capital · contrato ético", hint: "Dato → Interpretación → Sugerencia. Aclarar: es una plantilla del contrato, no una IA en ejecución. Nunca sugiere sin revisión humana." },
  { at: "2:35", dur: 30, label: "Caucete · identidad propia", hint: "Educación, salud y espacios comunitarios (registros de ejemplo). El vocabulario cambió; la app, no." },
  { at: "3:05", dur: 35, label: "Iglesia · subcapas productivas", hint: "Producción con subcapas (olivícola, semillas, nogales, frutales, hortalizas), caminos rurales y senderos, patrimonio. Mismo núcleo, lectura rural." },
  { at: "3:40", dur: 30, label: "Comparación federada", hint: "Misma lectura en dos nodos. Si un dominio no existe, se declara — no se fuerza." },
  { at: "4:10", dur: 45, label: "Trazabilidad + cierre", hint: "Mostrá la trazabilidad (events_raw en memoria) y cerrá: infraestructura común, soberanía territorial." },
];
const CLIP_STEPS = [
  { at: "0:00", dur: 6, label: "Entrada", hint: "Dejá visible el cartel DEMO · DATOS SINTÉTICOS y los tres nodos." },
  { at: "0:06", dur: 8, label: "Capital · mapa y ficha", hint: "Abrí un punto: se lee que el estado y la fuente son de ejemplo." },
  { at: "0:14", dur: 8, label: "Reporte", hint: "Creá un reporte: aparece en el mapa y en la trazabilidad." },
  { at: "0:22", dur: 8, label: "Contrato ético", hint: "Decí: es una plantilla del contrato, no una IA en ejecución." },
];


const PresenterGuide = ({ steps, mode, onMode, step, onStep, onClose }) => {
  const current = steps[step];
  const pct = Math.round(((step + 1) / steps.length) * 100);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const stepStart = steps.slice(0, step).reduce((a, s) => a + s.dur, 0);
  const stepDrift = elapsed - stepStart;
  return (
    <div className="absolute bottom-3 left-3 w-72 rounded-xl p-3 z-20"
      style={{ background: "rgba(28,28,28,0.95)", border: "1px solid " + BRAND.celeste + "55", backdropFilter: "blur(4px)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: BRAND.celeste }}>
          Guía · paso {step + 1}/{steps.length}
        </span>
        <button onClick={onClose} className="text-[10px] cursor-pointer" style={{ color: BRAND.dim }}>Ocultar</button>
      </div>
      <div className="flex gap-1.5 mb-2">
        {[["clip", "Clip de video (0:30)"], ["pitch", "Pitch Day (≈4:55)"]].map(([k, l]) => (
          <button key={k} onClick={() => onMode(k)}
            className="flex-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer"
            style={{ background: mode === k ? BRAND.celeste + "22" : BRAND.surfaceHi, color: mode === k ? BRAND.celeste : BRAND.muted }}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xl font-bold font-mono tabular-nums">{mm}:{ss}</div>
        <div className="flex gap-1.5">
          <button onClick={() => { setElapsed(0); setRunning(false); }}
            className="px-2 py-0.5 rounded-lg text-[10px] cursor-pointer"
            style={{ background: BRAND.surfaceHi, color: BRAND.muted }}>Reset</button>
          <button onClick={() => setRunning(!running)}
            className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer"
            style={{ background: running ? "#E0703A33" : BRAND.celeste + "22", color: running ? "#E08050" : BRAND.celeste }}>
            {running ? "Pausa" : "▶ Iniciar"}
          </button>
        </div>
      </div>
      <div className="text-xs font-bold mb-1">{current.label}</div>
      <p className="text-[11px] leading-relaxed mb-2" style={{ color: BRAND.muted }}>{current.hint}</p>
      {running && (
        <div className="text-[10px] mb-1.5 font-mono"
          style={{ color: Math.abs(stepDrift) > 10 ? (stepDrift > 0 ? "#E0703A" : BRAND.muted) : "#2F9E6B" }}>
          Paso en {current.at} · {stepDrift > 0 ? `+${stepDrift}s de demora` : stepDrift < 0 ? `${-stepDrift}s adelantado` : "en tiempo"} · objetivo {current.dur}s
        </div>
      )}
      <div className="h-1 rounded-full mb-2" style={{ background: BRAND.surfaceHi }}>
        <div className="h-1 rounded-full" style={{ width: pct + "%", background: BRAND.celeste }} />
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => onStep(Math.max(0, step - 1))} disabled={step === 0}
          className="px-2.5 py-1 rounded-lg text-[11px] cursor-pointer disabled:opacity-30"
          style={{ background: BRAND.surfaceHi, color: BRAND.muted }}>← Anterior</button>
        <span className="text-[10px]" style={{ color: BRAND.dim }}>{current.dur}s objetivo</span>
        <button onClick={() => onStep(Math.min(steps.length - 1, step + 1))}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer"
          style={{ background: BRAND.celeste + "22", color: BRAND.celeste }}>Siguiente →</button>
      </div>
    </div>
  );
};


// ─── App principal ───
// [agent: vibe] Aterrizaje DEMO-1 (#16): export nombrado + inyección del CDN de Tailwind
// SOLO para esta ruta — el jsx v5.1 se diseñó con clases estilo Tailwind y apps/web no lo
// incluye. Referencia visual, datos 100% sintéticos. Sin red: render degradado (inline styles).
export function DemoTerritorialFederado() {
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById("tailwind-cdn")) return;
    const s = document.createElement("script");
    s.src = "https://cdn.tailwindcss.com";
    s.id = "tailwind-cdn";
    s.async = true;
    document.head.appendChild(s);
  }, []);
  const [nodeKey, setNodeKey] = useState(null);          // pantalla de entrada primero
  const [compareMode, setCompareMode] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guideMode, setGuideMode] = useState("clip");
  const [activeLayers, setActiveLayers] = useState({});
  const [selected, setSelected] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showEthical, setShowEthical] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);


  const node = nodeKey ? NODES.find((n) => n.key === nodeKey) : null;
  const nodeLayers = nodeKey ? LAYERS[nodeKey] : [];
  const layerState = activeLayers[nodeKey] ?? Object.fromEntries(nodeLayers.filter((l) => l.defaultOn).map((l) => [l.key, true]));
  const visibleFeatures = nodeKey
    ? FEATURES.filter((f) => f.nodeKey === nodeKey && layerState[f.layer])
    : [];


  const stats = useMemo(() => {
    const all = FEATURES.filter((f) => f.nodeKey === nodeKey);
    return [
      { label: "Activos", value: all.filter((f) => f.type === "asset").length },
      { label: "Problemáticas", value: all.filter((f) => f.type === "problem").length },
      { label: "Capas", value: LAYERS[nodeKey]?.length ?? 0 },
    ];
  }, [nodeKey]);


  const openNode = (key) => {
    setNodeKey(key);
    setSelected(null);
    setShowEthical(false);
  };


  // Acción simulada: en la plataforma real solo un actor verificado cambia el estado de un reporte.
  const advanceReport = (repId) => {
    const target = reports.find((r) => r.id === repId);
    if (!target) return;
    const idx = REPORT_FLOW.indexOf(target.status);
    if (idx < 0 || idx >= REPORT_FLOW.length - 1) return;
    const next = REPORT_FLOW[idx + 1];
    const now = new Date().toISOString();
    setReports((prev) => prev.map((r) => (r.id === repId
      ? { ...r, status: next, history: [...(r.history ?? []), { status: next, at: now }] }
      : r)));
    setEvents((prev) => [
      { eventId: "ev-" + Math.random().toString(16).slice(2, 8), type: "TerritorialReportStatusChanged", nodeId: node.id, occurredAt: now },
      ...prev,
    ]);
  };

  const toggleLayer = (layerKey) => {
    setActiveLayers((prev) => {
      const cur = { ...(prev[nodeKey] ?? {}), [layerKey]: !((prev[nodeKey] ?? {})[layerKey]) };
      return { ...prev, [nodeKey]: cur };
    });
  };


  const submitReport = ({ category, description, picked }) => {
    const evId = "ev-" + Math.random().toString(16).slice(2, 8);
    const repId = "rep-" + Math.random().toString(16).slice(2, 8);
    const now = new Date().toISOString();
    const newEvent = {
      eventId: evId, type: "TerritorialReportCreated", nodeId: node.id, occurredAt: now,
    };
    setEvents((prev) => [newEvent, ...prev]);
    setReports((prev) => [
      {
        id: repId, eventId: evId, nodeKey, category, description,
        status: "received", createdAt: now, isSynthetic: true,
        picked, history: [{ status: "received", at: now }],
      },
      ...prev,
    ]);
    setShowReportForm(false);
    setShowEthical(true); // el reporte alimenta inmediatamente el ciclo Productor → Intérprete
  };


  if (compareMode) return <CompareScreen onBack={() => setCompareMode(false)} onEnterNode={(k) => { setCompareMode(false); openNode(k); }} />;
  if (!node) return <EntryScreen onEnter={openNode} onCompare={() => setCompareMode(true)} />;


  const nodeReports = reports.filter((r) => r.nodeKey === nodeKey);
  const nodeEvents = events.filter((e) => e.nodeId === node.id);


  return (
    <div className="min-h-screen flex flex-col" style={{ background: BRAND.bg, color: BRAND.text }}>
      <header className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid " + BRAND.border, background: BRAND.surface }}>
        <div className="flex items-center gap-4">
          <button className="text-sm hover:underline cursor-pointer" style={{ color: BRAND.dim }}
            onClick={() => { setNodeKey(null); setSelected(null); }}>← Nodos</button>
          <Logo />
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: node.color }} />{node.name}
          </span>
          <SyntheticFlag />
          <button onClick={() => setShowGuide(!showGuide)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer"
            style={{ background: showGuide ? BRAND.celeste + "22" : BRAND.surfaceHi, color: showGuide ? BRAND.celeste : BRAND.muted }}>
            Guía de presentación
          </button>
        </div>
      </header>


      <div className="flex flex-1" style={{ minHeight: "calc(100vh - 53px)" }}>
        <aside className="w-72 shrink-0 p-4 overflow-y-auto" style={{ borderRight: "1px solid " + BRAND.border, background: BRAND.surface }}>
          <div className="p-3 rounded-xl mb-4" style={{ background: BRAND.surfaceHi }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: BRAND.dim }}>Nodo actual</div>
            <div className="font-bold mt-1">{node.name} <span className="text-xs font-normal" style={{ color: BRAND.muted }}>{node.subtitle}</span></div>
            <div className="text-xs mt-2" style={{ color: BRAND.dim }}>{node.focusLong}</div>
          </div>


          <div className="grid grid-cols-3 gap-2 mb-4">
            {stats.map((s) => (
              <div key={s.label} className="p-2 rounded-lg text-center" style={{ background: BRAND.surfaceHi }}>
                <div className="text-base font-bold">{s.value}</div>
                <div className="text-[10px]" style={{ color: BRAND.dim }}>{s.label}</div>
              </div>
            ))}
          </div>


          <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: BRAND.dim }}>Capas</div>
          <div className="space-y-1.5 mb-4">
            {nodeLayers.map((l) => (
              <button key={l.key} onClick={() => toggleLayer(l.key)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors"
                style={{ background: layerState[l.key] ? BRAND.surfaceHi : BRAND.surface, border: `1px solid ${layerState[l.key] ? node.color : BRAND.border}` }}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ background: layerState[l.key] ? node.color : BRAND.border }} />
                  {l.name}
                </span>
                <span style={{ color: BRAND.dim }}>{l.geometry}</span>
              </button>
            ))}
          </div>


          <button onClick={() => setShowEthical(true)}
            className="w-full px-3 py-2 rounded-lg text-xs font-bold cursor-pointer mb-2"
            style={{ background: BRAND.celeste + "22", color: BRAND.celeste, border: "1px solid " + BRAND.celeste + "55" }}>
            Ver contrato ético (plantilla)
          </button>
          <button onClick={() => setShowTrace(!showTrace)}
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ background: BRAND.surfaceHi, color: BRAND.muted }}>
            {showTrace ? "Ocultar" : "Ver"} trazabilidad ({nodeEvents.length})
          </button>


          {nodeReports.length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-widest mt-4 mb-2" style={{ color: BRAND.dim }}>Mis reportes</div>
              <div className="space-y-1.5">
                {nodeReports.map((r) => (
                  <div key={r.id} className="p-2 rounded-lg text-[11px]" style={{ background: BRAND.surfaceHi }}>
                    <div className="font-medium">{CATEGORIES[nodeKey].find((c) => c.code === r.category)?.label ?? r.category}</div>
                    <div className="flex items-center justify-between mt-1" style={{ color: BRAND.dim }}>
                      <span>{REPORT_STATUS_UI[r.status].label}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString("es-AR")}</span>
                    </div>
                    {r.status !== "resolved" && (
                      <button onClick={() => advanceReport(r.id)}
                        className="mt-1.5 w-full px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer"
                        style={{ background: BRAND.celeste + "22", color: BRAND.celeste }}>
                        Avanzar estado (simulado)
                      </button>
                    )}
                    <div className="mt-1 text-[10px]" style={{ color: BRAND.dim }}>
                      Historial: {(r.history ?? []).map((h) => REPORT_STATUS_UI[h.status].label).join(" → ")}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>


        <main className="flex-1 relative">
          <TerritoryMap
            node={node}
            features={visibleFeatures}
            selectedId={selected?.id}
            onSelect={setSelected}
            onReportClick={() => setShowReportForm(true)}
            reportMarkers={nodeReports.map((r) => ({ id: r.id, x: r.picked.x, y: r.picked.y }))}
          />
          <div className="absolute top-3 left-3 w-80 space-y-3">
            {selected && <FeatureCard feature={selected} node={node} onClose={() => setSelected(null)} />}
            {showEthical && <EthicalPanel node={node} reports={nodeReports} features={visibleFeatures} onClose={() => setShowEthical(false)} />}
            {showTrace && <TraceabilityPanel events={nodeEvents} node={node} />}
          </div>
          {showGuide && (
            <PresenterGuide
              steps={guideMode === "clip" ? CLIP_STEPS : PITCH_STEPS}
              mode={guideMode}
              onMode={(m) => { setGuideMode(m); setGuideStep(0); }}
              step={guideStep}
              onStep={setGuideStep}
              onClose={() => setShowGuide(false)}
            />
          )}
        </main>
      </div>


      {showReportForm && (
        <ReportForm node={node} onSubmit={submitReport} onClose={() => setShowReportForm(false)} />
      )}


      <footer className="py-3 text-center text-xs" style={{ borderTop: "1px solid " + BRAND.border, color: BRAND.dim }}>
        DELocalSoy.AR · DEMO · DATOS SINTÉTICOS · Ilustración de diseño, no es la plataforma en producción · Infraestructura común, soberanía territorial
      </footer>
    </div>
  );
}

export default DemoTerritorialFederado;
