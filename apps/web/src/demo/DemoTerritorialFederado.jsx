import React, { useEffect, useMemo, useState } from "react";
import { NODE_COLORS } from "./syntheticData.js";
import { SyntheticDataSource } from "./SyntheticDataSource";
import { desproyecta } from "./ApiDataSource";
import {
  cerrarSesion,
  crearActivo,
  iniciarSesion,
  registrarCiudadano,
  sesionActiva,
  usuarioActivo,
  validarAltaActivo,
} from "../activosApi";

// DEMO TERRITORIAL FEDERADO — DELocalSoy.AR · v5.1 (correcciones de honestidad)
// Capital (corredor Centro–Cívico–Desamparados) · Caucete (educación, salud y comunidad) · Iglesia (producción y turismo)
// Datos 100% sintéticos: ningún registro proviene de un relevamiento real. Estados y fuentes son ilustrativos.
// Esta demo NO ejecuta inteligencia artificial: el panel ético es una plantilla fija del contrato Dato → Interpretación → Sugerencia.
// Contrato ético obligatorio: Dato → Interpretación → Sugerencia, con requiresHumanReview.
//
// (DEMO-2, #17) Los datos del dominio (NODES/LAYERS/CATEGORIES/SOURCE_KIND/FEATURES
// y la paleta NODE_COLORS) viven en ./syntheticData.js y se consumen vía el
// contrato DataSource (./dataSource.ts). Implementación de referencia:
// SyntheticDataSource. Este componente recibe `dataSource` opcional (default:
// sintético), lo que permite #18 (DEMO-3) sin tocar la UI.

const BRAND = {
  bg: "#121212", surface: "#1C1C1C", surfaceHi: "#242424",
  text: "#F5F5F5", muted: "#A3A3A3", dim: "#737373",
  celeste: "#7BA7D9", sol: "#F5C842", border: "#2A2A2A",
};

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

// R5-UI (#109): dominio `activos` (R5b) — vocabulario y estados del flujo
// ciudadano 'propuesto → moderación'. Mismos enums que @delocalsoy/contracts.
const ACTIVO_TIPO_UI = {
  inmueble: "Inmueble",
  infraestructura: "Infraestructura",
  servicio: "Servicio comunitario",
  patrimonio: "Patrimonio",
  otro: "Otro",
};
const ACTIVO_ESTADO_UI = {
  propuesto: { label: "Propuesto", color: BRAND.sol },
  aprobado: { label: "Aprobado", color: "#2F9E6B" },
  rechazado: { label: "Rechazado", color: "#E0703A" },
};

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
const EntryScreen = ({ nodes, layerCount, onEnter, onCompare }) => (
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
        {nodes.map((n) => (
          <button
            key={n.id}
            onClick={() => onEnter(n.key)}
            className="text-left rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full" style={{ background: n.color }} />
              <span className="font-bold">{n.name}</span>
              <span className="text-xs" style={{ color: BRAND.dim }}>· {n.subtitle}</span>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: BRAND.celeste }}>{n.focus}</p>
            <p className="text-xs leading-relaxed" style={{ color: BRAND.dim }}>{n.focusLong}</p>
            <p className="text-[10px] mt-3" style={{ color: BRAND.dim }}>
              Población aprox.: {n.population.toLocaleString("es-AR")} hab (INDEC 2022, redondeado) · {layerCount(n.key)} capas
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
const TerritoryMap = ({ node, features, onSelect, selectedId, onReportClick, reportMarkers = [], activoMarkers = [], onActivoClick, selectedActivoId = null, onActivoPropose }) => {
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
        <ellipse cx="50" cy="50" rx="42" ry="40" fill="none" stroke={node.color} strokeWidth="0.4" strokeDasharray="2 1.5" opacity="0.6" />
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
        {/* R5-UI (#109): activos ciudadanos — rombo según estado del flujo */}
        {activoMarkers.map((a) => {
          const isSel = a.id === selectedActivoId;
          const color = (ACTIVO_ESTADO_UI[a.estado] ?? ACTIVO_ESTADO_UI.propuesto).color;
          return (
            <g key={"act-" + a.id} onClick={() => onActivoClick && onActivoClick(a)} style={{ cursor: "pointer" }}>
              <rect x={a.x - 1.5} y={a.y - 1.5} width="3" height="3" fill={color}
                opacity={isSel ? 1 : 0.9} transform={`rotate(45 ${a.x} ${a.y})`}
                stroke={isSel ? BRAND.sol : "none"} strokeWidth="0.5" />
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px]" style={{ color: BRAND.dim }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#E0703A" }} /> Problemática</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#2F9E6B" }} /> Activo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ border: "1px solid " + BRAND.sol }} /> Reporte creado (demo)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2" style={{ background: BRAND.sol, transform: "rotate(45deg)" }} /> Activo propuesto</span>
        <span>· Visor sin tiles (contrato MapLibre pendiente)</span>
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
        <button
          onClick={onReportClick}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          style={{ background: node.color, color: "#fff" }}
        >
          + Reportar problemática
        </button>
        <button
          onClick={onActivoPropose}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          style={{ background: BRAND.sol, color: "#121212" }}
        >
          + Proponer activo
        </button>
      </div>
    </div>
  );
};

// ─── Ficha de feature (A3) ───
const FeatureCard = ({ feature, node, layers, onClose }) => (
  <div className="p-4 rounded-xl" style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}>
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-bold text-sm leading-snug">{feature.title}</h3>
      <button onClick={onClose} className="text-xs cursor-pointer shrink-0" style={{ color: BRAND.dim }}>Cerrar</button>
    </div>
    <div className="mt-3 space-y-1.5 text-xs">
      <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Tipo</span><span>{feature.type === "asset" ? "Activo territorial" : "Problemática"}</span></div>
      <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Capa</span><span>{layers.find((l) => l.key === feature.layer)?.name}</span></div>
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
const ReportForm = ({ node, cats, onSubmit, onClose }) => {
  const [category, setCategory] = useState(cats[0]?.code ?? "");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState({ x: 50, y: 50 });
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

// ─── Ficha de activo ciudadano (R5-UI, A3 bis — dominio `activos`, R5b) ───
const ActivoCard = ({ activo, node, onClose }) => {
  const estadoUi = ACTIVO_ESTADO_UI[activo.estado] ?? { label: activo.estado, color: BRAND.muted };
  return (
    <div className="p-4 rounded-xl" style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm leading-snug">{activo.titulo}</h3>
        <button onClick={onClose} className="text-xs cursor-pointer shrink-0" style={{ color: BRAND.dim }}>Cerrar</button>
      </div>
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Tipo</span><span>{ACTIVO_TIPO_UI[activo.tipo] ?? activo.tipo}</span></div>
        <div className="flex justify-between items-center">
          <span style={{ color: BRAND.dim }}>Estado</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ color: estadoUi.color, background: "rgba(255,255,255,0.05)" }}>{estadoUi.label}</span>
        </div>
        {activo.descripcion && (
          <div className="flex justify-between gap-3">
            <span className="shrink-0" style={{ color: BRAND.dim }}>Descripción</span>
            <span className="text-right">{activo.descripcion}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span style={{ color: BRAND.dim }}>Autor</span>
          <span style={{ fontFamily: "monospace" }}>{activo.createdByHash.slice(0, 12)}…</span>
        </div>
        <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Nodo</span><span>{node.name} · {node.subtitle}</span></div>
        <div className="flex justify-between"><span style={{ color: BRAND.dim }}>Fecha</span><span>{new Date(activo.createdAt).toLocaleDateString("es-AR")}</span></div>
        <div className="flex justify-between">
          <span style={{ color: BRAND.dim }}>Origen</span>
          <span style={{ color: activo.isSynthetic ? BRAND.sol : BRAND.text }}>
            {activo.isSynthetic ? "Sintético (demo)" : "API real (R5b)"}
          </span>
        </div>
      </div>
      <p className="text-[10px] mt-3 leading-relaxed" style={{ color: BRAND.dim }}>
        Flujo R5b: el activo nace “propuesto” y solo la moderación (moderador|admin) lo aprueba o rechaza.
        El autor queda identificado únicamente por su pseudónimo — sin datos personales (Ley 25.326, ADR-027).
      </p>
    </div>
  );
};

// ─── Formulario de activo ciudadano (R5-UI, B1 bis — #109) ───
// Modo synthetic: alta EN MEMORIA (no persiste — honestidad R15, igual que el
// reporte del demo). Modo api: exige sesión (login/registro inline, token en
// memoria) y valida con el MISMO schema del backend (@delocalsoy/contracts)
// antes de salir a la red; el backend re-valida (nunca se confía en el cliente).
const ActivoForm = ({ node, modoApi, onSubmit, onClose }) => {
  const [tipo, setTipo] = useState("patrimonio");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [picked, setPicked] = useState({ x: 50, y: 50 });
  const [authMode, setAuthMode] = useState("login"); // login | registro
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const intentar = async () => {
    if (enviando) return;
    setError(null);
    // Validación local con el schema compartido: mismo criterio que el backend.
    const { lat, lng } = desproyecta(picked.x, picked.y, node.center);
    const validacion = validarAltaActivo({ tipo, titulo, descripcion, nodo_key: node.key, lat, lng });
    if (!validacion.ok) {
      setError(validacion.errores.join(" · "));
      return;
    }
    if (!modoApi) {
      // Demo sintético: el alta vive solo en la memoria de la sesión.
      onSubmit({
        tipo, titulo, descripcion, lat, lng, picked,
        id: "act-demo-" + Math.random().toString(16).slice(2, 8),
        createdByHash: "demo-" + Math.random().toString(16).slice(2, 8),
        createdAt: new Date().toISOString(),
        isSynthetic: true,
      });
      return;
    }
    setEnviando(true);
    try {
      if (!sesionActiva()) {
        if (authMode === "registro") await registrarCiudadano(email, password);
        else await iniciarSesion(email, password);
      }
      const creado = await crearActivo({ tipo, titulo, descripcion, nodo_key: node.key, lat, lng });
      onSubmit({
        tipo, titulo, descripcion, lat, lng, picked,
        id: creado.id,
        createdByHash: creado.created_by_hash,
        createdAt: creado.created_at,
        isSynthetic: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  };

  const inputStyle = { background: BRAND.surfaceHi, color: BRAND.text, border: `1px solid ${BRAND.border}` };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-md rounded-2xl p-5" style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Proponer activo · {node.name}</h3>
          <button onClick={onClose} className="text-xs cursor-pointer" style={{ color: BRAND.dim }}>Cancelar</button>
        </div>
        <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND.dim }}>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg text-sm cursor-pointer" style={inputStyle}>
          {Object.entries(ACTIVO_TIPO_UI).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND.dim }}>Título (3–120)</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg text-sm" placeholder="Nombre del activo territorial…" style={inputStyle} />
        <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: BRAND.dim }}>Descripción (opcional)</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows="3"
          className="w-full mb-3 px-3 py-2 rounded-lg text-sm" placeholder="Contanos por qué es un activo del territorio…" style={inputStyle} />
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
            <circle cx={picked.x} cy={picked.y * 0.6} r="2" fill={BRAND.sol} stroke={node.color} strokeWidth="0.4" />
          </svg>
        </div>
        {modoApi && !sesionActiva() && (
          <div className="mb-3 p-3 rounded-lg" style={{ background: BRAND.surfaceHi }}>
            <div className="flex gap-1.5 mb-2">
              {[["login", "Ya tengo cuenta"], ["registro", "Quiero registrarme"]].map(([k, l]) => (
                <button key={k} onClick={() => setAuthMode(k)}
                  className="flex-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer"
                  style={{ background: authMode === k ? BRAND.celeste + "22" : BRAND.surface, color: authMode === k ? BRAND.celeste : BRAND.muted }}>
                  {l}
                </button>
              ))}
            </div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email"
              className="w-full mb-2 px-3 py-1.5 rounded-lg text-xs" style={inputStyle} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="contraseña"
              className="w-full px-3 py-1.5 rounded-lg text-xs" style={inputStyle} />
            <p className="text-[10px] mt-2 leading-relaxed" style={{ color: BRAND.dim }}>
              Registro ciudadano (rol “ciudadano”, ADR-031). El alta sella la sesión en events_raw sin PII
              y el login tiene límite de intentos (429, R5a #101).
            </p>
          </div>
        )}
        {modoApi && sesionActiva() && (
          <div className="mb-3 p-2.5 rounded-lg text-[11px] flex items-center justify-between" style={{ background: BRAND.surfaceHi }}>
            <span>Sesión: {usuarioActivo()?.email} <span style={{ color: BRAND.dim }}>({usuarioActivo()?.rol})</span></span>
            <button onClick={cerrarSesion} className="cursor-pointer" style={{ color: BRAND.celeste }}>Cerrar sesión</button>
          </div>
        )}
        <p className="text-[11px] mb-4 p-2.5 rounded-lg" style={{ color: BRAND.sol, background: "rgba(245,200,66,0.08)" }}>
          ⚠ No incluyas datos personales ni de contacto — el backend rechaza PII (ADR-020, Ley 25.326).
          {modoApi ? " El activo se crea en estado “propuesto” y la moderación decide." : " En el demo sintético el alta NO persiste: vive en memoria."}
        </p>
        {error && (
          <p className="text-[11px] mb-3 p-2.5 rounded-lg" style={{ color: "#E0703A", background: "rgba(224,112,58,0.08)" }}>{error}</p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ background: BRAND.surfaceHi, color: BRAND.muted }}>Cancelar</button>
          <button
            onClick={intentar}
            disabled={enviando}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
            style={{ background: BRAND.sol, color: "#121212" }}>
            {enviando ? "Enviando…" : modoApi ? "Proponer activo" : "Proponer activo (demo)"}
          </button>
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
const CompareScreen = ({ nodes, capasByNode, featuresByNode, onBack, onEnterNode }) => {
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
  const nodeA = nodes.find((n) => n.key === pair[0]);
  const nodeB = nodes.find((n) => n.key === pair[1]);
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
          const feats = (featuresByNode[node.key] ?? []).filter((f) => f.domain === domain);
          const layersHere = (capasByNode[node.key] ?? []).filter((l) => l.domain === domain);
          return (
            <div key={node.key} className="flex flex-col" style={{ borderRight: side === 0 ? "1px solid " + BRAND.border : "none" }}>
              <div className="flex items-center justify-between px-4 py-2" style={{ background: BRAND.surface }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: node.color }} />
                  <span className="font-bold text-sm">{node.name}</span>
                  <span className="text-xs" style={{ color: BRAND.dim }}>{node.focus}</span>
                </div>
                <select value={node.key} onChange={(e) => setSide(side, e.target.value)}
                  className="px-2 py-1 rounded-lg text-[11px] cursor-pointer"
                  style={{ background: BRAND.surfaceHi, color: BRAND.text, border: "1px solid " + BRAND.border }}>
                  {nodes.filter((n) => n.key !== pair[side === 0 ? 1 : 0]).map((n) => (
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
export function DemoTerritorialFederado({ dataSource = new SyntheticDataSource() } = {}) {
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById("tailwind-cdn")) return;
    const s = document.createElement("script");
    s.src = "https://cdn.tailwindcss.com";
    s.id = "tailwind-cdn";
    s.async = true;
    document.head.appendChild(s);
  }, []);
  // ─── Datos del dominio vía contrato DataSource (DEMO-2, #17) ───
  // Al montar se precargan territorios y, por territorio, capas, features
  // y categorías de reporte. Los reportes/eventos de la sesión siguen
  // siendo estado runtime del componente (no vienen del DataSource).
  const [territorios, setTerritorios] = useState([]);
  const [capasByNode, setCapasByNode] = useState({});
  const [featuresByNode, setFeaturesByNode] = useState({});
  const [catsByNode, setCatsByNode] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const ts = await dataSource.getTerritorios();
      if (!alive) return;
      setTerritorios(ts);
      const entries = await Promise.all(
        ts.map(async (t) => [t.key, await Promise.all([
          dataSource.getCapas(t.key),
          dataSource.getFeatures(t.key),
          dataSource.getCategoriasReporte(t.key),
        ])]),
      );
      if (!alive) return;
      setCapasByNode(Object.fromEntries(entries.map(([k, v]) => [k, v[0]])));
      setFeaturesByNode(Object.fromEntries(entries.map(([k, v]) => [k, v[1]])));
      setCatsByNode(Object.fromEntries(entries.map(([k, v]) => [k, v[2]])));
    })();
    return () => { alive = false; };
  }, [dataSource]);

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
  // R5-UI (#109): capa ciudadana de activos (dominio `activos`, R5b)
  const [activosByNode, setActivosByNode] = useState({});
  const [activosError, setActivosError] = useState(null);
  const [showActivoForm, setShowActivoForm] = useState(false);
  const [selectedActivo, setSelectedActivo] = useState(null);
  const [showActivos, setShowActivos] = useState(true);

  // R5-UI (#109): activos ciudadanos por nodo (contrato DataSource.getActivos).
  // En modo api son datos reales del backend (R5b); en synthetic, ilustrativos.
  // Fallo honesto (R15): se declara el error, no se inventan activos.
  useEffect(() => {
    if (!nodeKey) return;
    let alive = true;
    setActivosError(null);
    dataSource
      .getActivos(nodeKey)
      .then((acts) => { if (alive) setActivosByNode((prev) => ({ ...prev, [nodeKey]: acts })); })
      .catch((err) => { if (alive) setActivosError(err instanceof Error ? err.message : String(err)); });
    return () => { alive = false; };
  }, [nodeKey, dataSource]);

  const node = nodeKey ? territorios.find((n) => n.key === nodeKey) : null;
  const nodeLayers = nodeKey ? (capasByNode[nodeKey] ?? []) : [];
  const layerState = activeLayers[nodeKey] ?? Object.fromEntries(nodeLayers.filter((l) => l.defaultOn).map((l) => [l.key, true]));
  const nodeFeatures = nodeKey ? (featuresByNode[nodeKey] ?? []) : [];
  const visibleFeatures = nodeFeatures.filter((f) => layerState[f.layer]);

  const stats = useMemo(() => {
    const all = nodeFeatures;
    return [
      { label: "Activos", value: all.filter((f) => f.type === "asset").length },
      { label: "Problemáticas", value: all.filter((f) => f.type === "problem").length },
      { label: "Capas", value: nodeLayers.length },
    ];
  }, [nodeFeatures, nodeLayers]);

  const openNode = (key) => {
    setNodeKey(key);
    setSelected(null);
    setSelectedActivo(null);
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

  // R5-UI (#109): alta ciudadana de activo. En synthetic vive en memoria (no
  // persiste, R15); en modo api el backend ya creó el registro sellado (R5b).
  const submitActivo = ({ tipo, titulo, descripcion, lat, lng, picked, id, createdByHash, createdAt, isSynthetic }) => {
    setActivosByNode((prev) => ({
      ...prev,
      [nodeKey]: [
        {
          id, nodeKey, tipo, titulo, descripcion, estado: "propuesto",
          lat, lng, x: picked.x, y: picked.y, createdByHash, createdAt, isSynthetic,
        },
        ...(prev[nodeKey] ?? []),
      ],
    }));
    if (dataSource.esSintetico()) {
      // Trazabilidad de sesión (en memoria), como el reporte del demo.
      setEvents((prev) => [
        { eventId: "ev-" + Math.random().toString(16).slice(2, 8), type: "ActivoPropuesto (demo, en memoria)", nodeId: node.id, occurredAt: new Date().toISOString() },
        ...prev,
      ]);
    }
    setShowActivoForm(false);
    setSelectedActivo(null);
  };

  if (compareMode) return <CompareScreen nodes={territorios} capasByNode={capasByNode} featuresByNode={featuresByNode} onBack={() => setCompareMode(false)} onEnterNode={(k) => { setCompareMode(false); openNode(k); }} />;
  if (!node) return <EntryScreen nodes={territorios} layerCount={(k) => (capasByNode[k] ?? []).length} onEnter={openNode} onCompare={() => setCompareMode(true)} />;

  const nodeReports = reports.filter((r) => r.nodeKey === nodeKey);
  const nodeEvents = events.filter((e) => e.nodeId === node.id);
  // R5-UI (#109): capa ciudadana de activos del nodo visible
  const nodeActivos = activosByNode[nodeKey] ?? [];
  const visibleActivos = showActivos ? nodeActivos : [];

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
          {dataSource.esSintetico() && <SyntheticFlag />}
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

          <button onClick={() => setShowActivos(!showActivos)}
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer mb-2"
            style={{ background: showActivos ? BRAND.sol + "22" : BRAND.surfaceHi, color: showActivos ? BRAND.sol : BRAND.muted, border: "1px solid " + (showActivos ? BRAND.sol + "55" : BRAND.border) }}>
            {showActivos ? "Ocultar" : "Ver"} activos ciudadanos ({nodeActivos.length})
          </button>
          {activosError && (
            <p className="text-[11px] mb-3 p-2.5 rounded-lg" style={{ color: "#E0703A", background: "rgba(224,112,58,0.08)" }}>
              No se pudieron cargar los activos: {activosError}
            </p>
          )}

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
                    <div className="font-medium">{(catsByNode[nodeKey] ?? []).find((c) => c.code === r.category)?.label ?? r.category}</div>
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
            activoMarkers={visibleActivos}
            onActivoClick={setSelectedActivo}
            selectedActivoId={selectedActivo?.id ?? null}
            onActivoPropose={() => setShowActivoForm(true)}
          />
          <div className="absolute top-3 left-3 w-80 space-y-3">
            {selected && <FeatureCard feature={selected} node={node} layers={capasByNode[selected.nodeKey] ?? []} onClose={() => setSelected(null)} />}
            {selectedActivo && <ActivoCard activo={selectedActivo} node={node} onClose={() => setSelectedActivo(null)} />}
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
        <ReportForm node={node} cats={catsByNode[nodeKey] ?? []} onSubmit={submitReport} onClose={() => setShowReportForm(false)} />
      )}

      {showActivoForm && (
        <ActivoForm
          node={node}
          modoApi={!dataSource.esSintetico()}
          onSubmit={submitActivo}
          onClose={() => setShowActivoForm(false)}
        />
      )}

      <footer className="py-3 text-center text-xs" style={{ borderTop: "1px solid " + BRAND.border, color: BRAND.dim }}>
        DELocalSoy.AR · DEMO · DATOS SINTÉTICOS · Ilustración de diseño, no es la plataforma en producción · Infraestructura común, soberanía territorial
      </footer>
    </div>
  );
}

export default DemoTerritorialFederado;
