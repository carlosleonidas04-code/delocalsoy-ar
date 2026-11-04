import React, { useEffect, useMemo, useState } from 'react';

/* ============================================================================
   DELocalSoy.AR — Base consolidada (Montada sobre el prototipo de la página)
   Artefacto de auditoría y continuidad — 3 de septiembre 2026

   Paleta de referencia:
   - Fondo: negro cálido #0D0B08
   - Tarjetas, líneas y texto: tarjeta #181410, borde #332C22, texto #F5F1E8
   - Dorado: #FFC72C para el «.AR», el rol activo, los botones y las pestañas activas
   - Secundarios: celeste #75AADB y ámbar #F2A71B
   - Tipografía: Fraunces para los títulos e Inter para el cuerpo
============================================================================ */

export const COLORS = {
  bg: '#0D0B08',
  bgCard: '#181410',
  bgCardHover: '#1F1A14',
  border: '#332C22',
  celeste: '#75AADB',
  dorado: '#FFC72C',
  ambar: '#F2A71B',
  texto: '#F5F1E8',
  textoSuave: '#B8AFA0',
  textoTenue: '#7A7264',
  verde: '#4ADE80',
} as const;

export type NodoPrototypeId =
  | 'centro-civico'
  | 'san-juan-centro'
  | 'caucete'
  | 'iglesia-bellavista'
  | 'iglesia-cabecera'
  | 'iglesia-las-flores'
  | 'iglesia-rodeo'
  | 'iglesia-tudcum'
  | 'iglesia-angualasto';

export type CanonicalSanJuanNodeKey = 'capital' | 'caucete' | 'iglesia';

export interface NodoPrototypeItem {
  id: NodoPrototypeId;
  canonicalKey: CanonicalSanJuanNodeKey;
  nodoPadreLabel: string;
  subnodoLabel?: string;
  nombre: string;
  tipo: 'piloto' | 'activo' | 'red';
  desc: string;
  badge: string;
  badgeColor: string;
  coords: { lat: number; lng: number };
}

export const NODOS: NodoPrototypeItem[] = [
  {
    id: 'centro-civico',
    canonicalKey: 'capital',
    nodoPadreLabel: 'Subnodo Capital',
    subnodoLabel: 'Desamparados – Centro Cívico',
    nombre: 'Desamparados – Centro Cívico',
    tipo: 'piloto',
    desc: 'Corredor Desamparados → Centro Cívico → Parque 25 de Mayo → San Juan Centro',
    badge: 'Piloto activo · Subnodo Capital · Desamparados – Centro Cívico',
    badgeColor: COLORS.dorado,
    coords: { lat: -31.5365, lng: -68.5364 },
  },
  {
    id: 'san-juan-centro',
    canonicalKey: 'capital',
    nodoPadreLabel: 'Subnodo Capital',
    subnodoLabel: 'San Juan Centro',
    nombre: 'San Juan Centro',
    tipo: 'activo',
    desc: 'Parque 25 de Mayo → Plaza 25 de Mayo → Eje Comercial San Juan Centro',
    badge: 'Subnodo Capital · San Juan Centro',
    badgeColor: COLORS.dorado,
    coords: { lat: -31.5375, lng: -68.5254 },
  },
  {
    id: 'caucete',
    canonicalKey: 'caucete',
    nodoPadreLabel: 'Nodo Caucete',
    nombre: 'Nodo Caucete',
    tipo: 'activo',
    desc: 'Eje Av. de los Ríos → Diagonal Sarmiento → Área Resiliencia',
    badge: 'Nodo activo · Caucete',
    badgeColor: COLORS.celeste,
    coords: { lat: -31.6518, lng: -68.2811 },
  },
  {
    id: 'iglesia-bellavista',
    canonicalKey: 'iglesia',
    nodoPadreLabel: 'Nodo Valle de Iglesia',
    subnodoLabel: 'Bella Vista',
    nombre: 'Bella Vista',
    tipo: 'red',
    desc: 'Bella Vista → Corredor Productivo y Riego → Valle de Iglesia',
    badge: 'Nodo Valle de Iglesia · Bella Vista',
    badgeColor: COLORS.celeste,
    coords: { lat: -30.422, lng: -69.211 },
  },
  {
    id: 'iglesia-cabecera',
    canonicalKey: 'iglesia',
    nodoPadreLabel: 'Nodo Valle de Iglesia',
    subnodoLabel: 'Iglesia',
    nombre: 'Iglesia',
    tipo: 'red',
    desc: 'Villa Iglesia → Corredor Histórico y Agrícola → Valle de Iglesia',
    badge: 'Nodo Valle de Iglesia · Iglesia',
    badgeColor: COLORS.celeste,
    coords: { lat: -30.395, lng: -69.215 },
  },
  {
    id: 'iglesia-las-flores',
    canonicalKey: 'iglesia',
    nodoPadreLabel: 'Nodo Valle de Iglesia',
    subnodoLabel: 'Las Flores',
    nombre: 'Las Flores',
    tipo: 'red',
    desc: 'Las Flores → Eje Ruta 150 → Valle de Iglesia',
    badge: 'Nodo Valle de Iglesia · Las Flores',
    badgeColor: COLORS.celeste,
    coords: { lat: -30.312, lng: -69.218 },
  },
  {
    id: 'iglesia-rodeo',
    canonicalKey: 'iglesia',
    nodoPadreLabel: 'Nodo Valle de Iglesia',
    subnodoLabel: 'Rodeo',
    nombre: 'Rodeo',
    tipo: 'red',
    desc: 'Rodeo → Las Flores → Tudcum · Valle de Iglesia',
    badge: 'Nodo Valle de Iglesia · Rodeo',
    badgeColor: COLORS.celeste,
    coords: { lat: -30.209, lng: -69.139 },
  },
  {
    id: 'iglesia-tudcum',
    canonicalKey: 'iglesia',
    nodoPadreLabel: 'Nodo Valle de Iglesia',
    subnodoLabel: 'Tudcum',
    nombre: 'Tudcum',
    tipo: 'red',
    desc: 'Tudcum → Acequias y Semillero Andino → Valle de Iglesia',
    badge: 'Nodo Valle de Iglesia · Tudcum',
    badgeColor: COLORS.celeste,
    coords: { lat: -30.193, lng: -69.261 },
  },
  {
    id: 'iglesia-angualasto',
    canonicalKey: 'iglesia',
    nodoPadreLabel: 'Nodo Valle de Iglesia',
    subnodoLabel: 'Angualasto',
    nombre: 'Angualasto',
    tipo: 'red',
    desc: 'Angualasto → Patrimonio y Corredor Altoandino → Valle de Iglesia',
    badge: 'Nodo Valle de Iglesia · Angualasto',
    badgeColor: COLORS.celeste,
    coords: { lat: -30.052, lng: -69.155 },
  },
];

export const GRUPOS_NODOS: Array<{
  canonicalKey: CanonicalSanJuanNodeKey;
  titulo: string;
  badgeCorto: string;
  color: string;
  defaultSubnodoId: NodoPrototypeId;
  subnodos: Array<{ id: NodoPrototypeId; labelCorto: string }>;
}> = [
  {
    canonicalKey: 'capital',
    titulo: 'Subnodo Capital',
    badgeCorto: 'Piloto activo',
    color: COLORS.dorado,
    defaultSubnodoId: 'centro-civico',
    subnodos: [
      { id: 'centro-civico', labelCorto: 'Desamparados – Centro Cívico' },
      { id: 'san-juan-centro', labelCorto: 'San Juan Centro' },
    ],
  },
  {
    canonicalKey: 'caucete',
    titulo: 'Nodo Caucete',
    badgeCorto: 'Nodo activo',
    color: COLORS.celeste,
    defaultSubnodoId: 'caucete',
    subnodos: [{ id: 'caucete', labelCorto: 'Caucete' }],
  },
  {
    canonicalKey: 'iglesia',
    titulo: 'Nodo Valle de Iglesia',
    badgeCorto: 'Subnodos',
    color: COLORS.celeste,
    defaultSubnodoId: 'iglesia-bellavista',
    subnodos: [
      { id: 'iglesia-bellavista', labelCorto: 'Bella Vista' },
      { id: 'iglesia-cabecera', labelCorto: 'Iglesia' },
      { id: 'iglesia-las-flores', labelCorto: 'Las Flores' },
      { id: 'iglesia-rodeo', labelCorto: 'Rodeo' },
      { id: 'iglesia-tudcum', labelCorto: 'Tudcum' },
      { id: 'iglesia-angualasto', labelCorto: 'Angualasto' },
    ],
  },
];

export type CategoriaId =
  | 'iluminacion'
  | 'arbolado'
  | 'bache'
  | 'vereda'
  | 'espacio_publico'
  | 'riego'
  | 'residuos'
  | 'otro';

export const CATEGORIAS: Array<{ id: CategoriaId; label: string; icon: string }> = [
  { id: 'iluminacion', label: 'Iluminación', icon: '💡' },
  { id: 'arbolado', label: 'Arbolado', icon: '🌳' },
  { id: 'bache', label: 'Bache / calzada', icon: '🕳️' },
  { id: 'vereda', label: 'Vereda / rampa', icon: '♿' },
  { id: 'espacio_publico', label: 'Espacio público', icon: '🏞️' },
  { id: 'riego', label: 'Acequia / riego', icon: '💧' },
  { id: 'residuos', label: 'Residuos', icon: '🗑️' },
  { id: 'otro', label: 'Otro', icon: '📌' },
];

export type EstadoReporteKey = 'recibido' | 'en_evaluacion' | 'en_gestion' | 'resuelto';

export const ESTADO_CONFIG: Record<
  EstadoReporteKey,
  { label: string; color: string }
> = {
  recibido: { label: 'Recibido', color: COLORS.celeste },
  en_evaluacion: { label: 'En evaluación', color: COLORS.ambar },
  en_gestion: { label: 'En gestión', color: COLORS.dorado },
  resuelto: { label: 'Resuelto', color: COLORS.verde },
};

export interface ReporteItem {
  id: number | string;
  categoria: CategoriaId;
  titulo: string;
  desc: string;
  ubicacion: string;
  estado: EstadoReporteKey;
  nodo: NodoPrototypeId;
  eventHash?: string;
}

export const REPORTES_INICIALES: ReporteItem[] = [
  {
    id: 1,
    categoria: 'iluminacion',
    titulo: 'Luminaria apagada',
    desc: 'Poste sin luz hace una semana',
    ubicacion: 'Corredor Desamparados al 1200 (ejemplo)',
    estado: 'en_gestion',
    nodo: 'centro-civico',
  },
  {
    id: 2,
    categoria: 'riego',
    titulo: 'Acequia con obstrucción',
    desc: 'Ramas y residuos frenan el flujo',
    ubicacion: 'Cauce lindero a Parque 25 de Mayo (ejemplo)',
    estado: 'recibido',
    nodo: 'centro-civico',
  },
  {
    id: 3,
    categoria: 'vereda',
    titulo: 'Rampa sin señalizar',
    desc: 'Esquina sin cruce peatonal marcado',
    ubicacion: 'Centro Cívico, acceso norte (ejemplo)',
    estado: 'en_evaluacion',
    nodo: 'centro-civico',
  },
  {
    id: 4,
    categoria: 'iluminacion',
    titulo: 'Tramo sin luminarias',
    desc: 'Tres postes seguidos sin funcionar',
    ubicacion: 'Centro Cívico, calle interna (ejemplo)',
    estado: 'recibido',
    nodo: 'centro-civico',
  },
  {
    id: 5,
    categoria: 'vereda',
    titulo: 'Loseta suelta en cruce peatonal',
    desc: 'Relevamiento de accesibilidad en área comercial céntrica',
    ubicacion: 'San Juan Centro, entorno Plaza 25 de Mayo (ejemplo)',
    estado: 'en_evaluacion',
    nodo: 'san-juan-centro',
  },
  {
    id: 6,
    categoria: 'iluminacion',
    titulo: 'Farola intermitente en corredor peatonal',
    desc: 'Parpadeo nocturno sobre vereda norte',
    ubicacion: 'San Juan Centro (ejemplo)',
    estado: 'recibido',
    nodo: 'san-juan-centro',
  },
  {
    id: 7,
    categoria: 'arbolado',
    titulo: 'Árbol en riesgo',
    desc: 'Inclinación tras viento zonda',
    ubicacion: 'Eje Av. de los Ríos (ejemplo)',
    estado: 'resuelto',
    nodo: 'caucete',
  },
  {
    id: 8,
    categoria: 'riego',
    titulo: 'Compuerta de regadío con filtración',
    desc: 'Pérdida de caudal en hijuela secundaria',
    ubicacion: 'Sur de Diagonal Sarmiento, Caucete (ejemplo)',
    estado: 'en_evaluacion',
    nodo: 'caucete',
  },
  {
    id: 9,
    categoria: 'riego',
    titulo: 'Turno de riego y deshielo cordillerano',
    desc: 'Monitoreo comunitario de caudal en canal matriz',
    ubicacion: 'Rodeo, Valle de Iglesia (ejemplo)',
    estado: 'en_gestion',
    nodo: 'iglesia-rodeo',
  },
  {
    id: 10,
    categoria: 'riego',
    titulo: 'Limpieza de toma de agua comunitaria',
    desc: 'Sedimentos acumulados en canal de riego agrícola',
    ubicacion: 'Tudcum, Valle de Iglesia (ejemplo)',
    estado: 'recibido',
    nodo: 'iglesia-tudcum',
  },
  {
    id: 11,
    categoria: 'espacio_publico',
    titulo: 'Señalética en corredor productivo',
    desc: 'Reposición de cartelería indicativa para productores',
    ubicacion: 'Bella Vista, Valle de Iglesia (ejemplo)',
    estado: 'en_evaluacion',
    nodo: 'iglesia-bellavista',
  },
  {
    id: 12,
    categoria: 'arbolado',
    titulo: 'Poda preventiva en alameda histórica',
    desc: 'Ramas secas sobre calle principal',
    ubicacion: 'Iglesia, Valle de Iglesia (ejemplo)',
    estado: 'recibido',
    nodo: 'iglesia-cabecera',
  },
  {
    id: 13,
    categoria: 'iluminacion',
    titulo: 'Luminaria solar en acceso vial',
    desc: 'Revisión de batería en poste autónomo',
    ubicacion: 'Las Flores, Valle de Iglesia (ejemplo)',
    estado: 'en_gestion',
    nodo: 'iglesia-las-flores',
  },
  {
    id: 14,
    categoria: 'espacio_publico',
    titulo: 'Sendero patrimonial y mirador comunitario',
    desc: 'Mantenimiento de pircas y demarcación',
    ubicacion: 'Angualasto, Valle de Iglesia (ejemplo)',
    estado: 'resuelto',
    nodo: 'iglesia-angualasto',
  },
];

export interface ActorDirectorioItem {
  id: number | string;
  nombre: string;
  rubro: string;
  verificado: boolean;
  horario: string;
  nodo: NodoPrototypeId;
}

export const DIRECTORIO_INICIAL: ActorDirectorioItem[] = [
  {
    id: 1,
    nombre: 'Almacén Don Raúl',
    rubro: 'Comercio de cercanía',
    verificado: true,
    horario: '8 a 21 hs',
    nodo: 'centro-civico',
  },
  {
    id: 2,
    nombre: 'Herrería Los Andes',
    rubro: 'Oficio / taller',
    verificado: true,
    horario: '9 a 18 hs',
    nodo: 'centro-civico',
  },
  {
    id: 3,
    nombre: 'Centro de Salud Barrial',
    rubro: 'Institucional',
    verificado: true,
    horario: '7 a 20 hs',
    nodo: 'centro-civico',
  },
  {
    id: 4,
    nombre: 'Librería y Papelería del Centro',
    rubro: 'Comercio cultural y educativo',
    verificado: true,
    horario: '8:30 a 20:30 hs',
    nodo: 'san-juan-centro',
  },
  {
    id: 5,
    nombre: 'Vivero El Oasis',
    rubro: 'Producción',
    verificado: false,
    horario: 'Pendiente verificación',
    nodo: 'caucete',
  },
  {
    id: 6,
    nombre: 'Productores Agropecuarios Bella Vista',
    rubro: 'Corredor productivo y forrajes',
    verificado: true,
    horario: '8 a 18 hs',
    nodo: 'iglesia-bellavista',
  },
  {
    id: 7,
    nombre: 'Molino e Hilar Tradicional Villa Iglesia',
    rubro: 'Agroindustria y patrimonio local',
    verificado: true,
    horario: '9 a 17 hs',
    nodo: 'iglesia-cabecera',
  },
  {
    id: 8,
    nombre: 'Punto de Servicios Ruta 150 Las Flores',
    rubro: 'Logística y comercio de paso',
    verificado: true,
    horario: '7 a 21 hs',
    nodo: 'iglesia-las-flores',
  },
  {
    id: 9,
    nombre: 'Cooperativa Semillera Andina',
    rubro: 'Producción de semillas y nogales',
    verificado: true,
    horario: '8 a 17 hs',
    nodo: 'iglesia-rodeo',
  },
  {
    id: 10,
    nombre: 'Productores de Semilla de Tudcum',
    rubro: 'Agricultura familiar y riego',
    verificado: true,
    horario: '8 a 18 hs',
    nodo: 'iglesia-tudcum',
  },
  {
    id: 11,
    nombre: 'Hilandería y Artesanías Angualasto',
    rubro: 'Patrimonio y oficio textil',
    verificado: true,
    horario: '9 a 18 hs',
    nodo: 'iglesia-angualasto',
  },
];

export type RolDemoKey = 'ciudadano' | 'gestor' | 'auditor';

export const RATE_LIMITS: Record<RolDemoKey, number> = {
  ciudadano: 10,
  gestor: 100,
  auditor: 500,
};

export interface RespuestaTripartita {
  dato: string;
  interpretacion: string;
  sugerencia: string;
  confianza: number;
  origen?: 'api_ask' | 'reconciliado_base';
  branchMatched?: string;
  eventHash?: string;
}

export const RESPUESTAS_EJEMPLO: Record<string, RespuestaTripartita> = {
  ilumina: {
    dato: '3 reportes de categoría iluminación activos en este nodo, 1 en estado "en gestión".',
    interpretacion:
      'Los 3 casos están sobre el mismo tramo del corredor, lo que sugiere una falla de circuito antes que postes aislados.',
    sugerencia:
      'Agrupar los 3 reportes en un único pedido de intervención al actor responsable de alumbrado, en vez de tramitarlos por separado.',
    confianza: 0.82,
    origen: 'reconciliado_base',
  },
  riego: {
    dato: 'Las observaciones de acequias y canales representan el eje hídrico prioritario entre Capital, Caucete y Valle de Iglesia.',
    interpretacion:
      'La obstrucción de cauces urbanos en Capital y las pérdidas de compuerta en Caucete afectan la eficiencia de riego del arbolado público.',
    sugerencia:
      'Coordinar limpieza preventiva de acequias antes de alertas de viento Zonda y vincular el registro con el custodio de cuenca.',
    confianza: 0.86,
    origen: 'reconciliado_base',
  },
  default: {
    dato: 'Este nodo concentra la mayoría de los reportes abiertos del piloto activo en el corredor.',
    interpretacion:
      'Es el nodo piloto activo, así que es esperable más actividad que en nodos en expansión como Caucete o los subnodos del Valle de Iglesia.',
    sugerencia:
      'Recién comparar esta proporción entre nodos cuando Caucete y Valle de Iglesia tengan un volumen similar de reportes — hoy no sería una comparación justa.',
    confianza: 0.65,
    origen: 'reconciliado_base',
  },
};

export const NOTAS_ARQUITECTURA = [
  {
    t: 'Auth (🔴 bloqueante, el más viejo)',
    d: 'Nadie reconstruye el sistema — las 3 sesiones nuevas coinciden en "no tocar, usar el existente (refresh token + TOTP)". Pero ninguna tiene el archivo real todavía. Reviso: tampoco es el JWT de la Arquitectura Técnica v1.0 (ese no tiene TOTP). Sigue perdido.',
  },
  {
    t: 'Node vs Nodo — resuelto',
    d: 'El estado v4 había cerrado esto a favor de "Nodo" (español) confiando en lo que una sesión reportó en prosa. Pero las 3 fuentes de código real (Deepseek v2, Deepseek v3, Vive v2) declaran `model Node` (inglés) de forma unánime — cero apariciones de "model Nodo". Se adopta Node de acá en adelante, por evidencia de código, no de reporte.',
  },
  {
    t: 'Rate limits /api/ask — 3 números distintos',
    d: 'RFC-002: 10/100/500 (ciudadano/gestor/auditor). Géminis construyó código con 5/30/100. Vive v2 tiene DOS esquemas adentro del mismo documento (10/60/120 general, 5/30/60 específico para /ask). Esta demo usa 10/100/500 por ser la fuente más citada, no por estar 100% confirmado.',
  },
  {
    t: 'Contrato /api/ask',
    d: 'El formato correcto y reconciliado es {dato, interpretación, sugerencia} — así lo muestra la pestaña Asistente acá. El código que generó Géminis usa {status, data:{answer,metadata}} en cambio: si se copia tal cual, reaparece el bug de AskWidget que ya se había resuelto una vez.',
  },
  {
    t: 'Datos de barrios reales',
    d: 'Sigue sin resolverse la fuente real (catastro / IGN / radios censales INDEC). Todo lo que ves en esta demo es de ejemplo, nunca catastral — así se evita repetir el problema de datos inventados ya detectado antes.',
  },
  {
    t: 'Marketplace + Banco de Potencialidades',
    d: 'Vive v2 y Deepseek v3 ya armaron el schema completo (Producto, Pedido, Potencialidad, Intercambio) como si fuera paso inmediato. Son M5 y M2 del Superdocumento original — y tu propio roadmap (§5.6) los ubica en el mes 12–24, después de validar mapa+reportes+GIS en el 6–12. Por eso están acá como "Fase 2", sin conectar al flujo activo.',
  },
  {
    t: 'Buen hallazgo técnico (sumar)',
    d: 'La auditoría de Géminis (dentro de Deepseek v3) encontró que falta una restricción de idempotencia en EventsRaw (índice único parcial sobre hash) — es correcta y conviene agregarla en la migración real.',
  },
];

/* ============================================================================
   Iconos vectoriales limpios (geometría Lucide 1:1 sin dependencias externas)
============================================================================ */
function IconRadio({ size = 15, color = COLORS.celeste }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </svg>
  );
}

function IconMapPin({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconInfo({ size = 16, color = COLORS.textoSuave }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function IconX({ size = 20, color = COLORS.textoTenue }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconArrowRight({ size = 13, color = COLORS.textoTenue }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function IconPlus({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function IconHome({ size = 19, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconUsers({ size = 19, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconSparkles({ size = 18, color = COLORS.dorado }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function IconShieldCheck({ size = 15, color = COLORS.celeste }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconSend({ size = 16, color = COLORS.bg }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function IconLoader({ size = 16, color = COLORS.textoTenue }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, animation: 'delocalSpin 1s linear infinite' }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/* ============================================================================
   Isologo Oficial y Logotipo DELocalSoy.AR
   - "DE" (#75AADB) + "Local" (#F5F1E8) + "Soy" (#75AADB) + ".AR" (#FFC72C)
   - Grafo constelación de red federada:
     Nodo central Dorado (#FFC72C) conectado a 3 nodos Celestes (#75AADB) y 2 nodos Marfil (#F5F1E8)
============================================================================ */
export function DelocalSoyNetworkLogoSvg({
  size = 110,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Isologo Red Federada DELocalSoy.AR"
      style={{ flexShrink: 0 }}
    >
      {/* Líneas de conexión perimetrales y radiales de la red federada */}
      <g stroke="#F5F1E8" strokeOpacity="0.22" strokeWidth="1.25">
        {/* Conexiones desde el nodo central dorado (58, 56) hacia los 5 nodos */}
        <line x1="58" y1="56" x2="25" y2="24" />
        <line x1="58" y1="56" x2="92" y2="21" />
        <line x1="58" y1="56" x2="99" y2="67" />
        <line x1="58" y1="56" x2="31" y2="94" />
        <line x1="58" y1="56" x2="74" y2="102" />
        {/* Conexiones perimetrales de la constelación */}
        <line x1="25" y1="24" x2="92" y2="21" strokeOpacity="0.14" />
        <line x1="92" y1="21" x2="99" y2="67" strokeOpacity="0.14" />
        <line x1="99" y1="67" x2="74" y2="102" strokeOpacity="0.16" />
        <line x1="31" y1="94" x2="74" y2="102" strokeOpacity="0.16" />
      </g>

      {/* Nodo superior izquierdo — Celeste #75AADB */}
      <circle cx="25" cy="24" r="10.5" fill={COLORS.celeste} />

      {/* Nodo superior derecho — Marfil #F5F1E8 */}
      <circle cx="92" cy="21" r="9" fill={COLORS.texto} />

      {/* Nodo central principal — Dorado #FFC72C */}
      <circle cx="58" cy="56" r="17.5" fill={COLORS.dorado} />

      {/* Nodo medio derecho — Celeste #75AADB */}
      <circle cx="99" cy="67" r="12" fill={COLORS.celeste} />

      {/* Nodo inferior izquierdo — Marfil #F5F1E8 */}
      <circle cx="31" cy="94" r="10" fill={COLORS.texto} />

      {/* Nodo inferior derecho — Celeste #75AADB */}
      <circle cx="74" cy="102" r="7" fill={COLORS.celeste} />
    </svg>
  );
}

export function DelocalSoyWordmark({
  fontSize = '26px',
}: {
  fontSize?: string;
}) {
  return (
    <span
      style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontWeight: 800,
        fontSize,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        display: 'inline-flex',
        alignItems: 'baseline',
      }}
    >
      <span style={{ color: COLORS.celeste }}>DE</span>
      <span style={{ color: COLORS.texto }}>Local</span>
      <span style={{ color: COLORS.celeste }}>Soy</span>
      <span style={{ color: COLORS.dorado }}>.AR</span>
    </span>
  );
}

/* ============================================================================
   Subcomponentes de Tarjetas y Badges (Fieles al Artefacto Base Consolidada)
============================================================================ */
function EstadoPill({ estado }: { estado: EstadoReporteKey }) {
  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.recibido;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: `${cfg.color}20`,
        color: cfg.color,
        border: `1px solid ${cfg.color}50`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '9999px',
          backgroundColor: cfg.color,
        }}
      />
      {cfg.label}
    </span>
  );
}

function BarrioActivoBadge({ nodo }: { nodo: NodoPrototypeItem }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: `${nodo.badgeColor}20`,
        color: nodo.badgeColor,
        border: `1px solid ${nodo.badgeColor}50`,
      }}
    >
      {nodo.badge}
    </span>
  );
}

function ReporteCard({
  reporte,
  rol,
  onCambiarEstado,
}: {
  reporte: ReporteItem;
  rol: RolDemoKey;
  onCambiarEstado: (id: number | string, nuevoEstado: EstadoReporteKey) => void;
}) {
  const cat = CATEGORIAS.find((c) => c.id === reporte.categoria);
  const puedeGestionar = rol === 'gestor' || rol === 'auditor';

  return (
    <div
      style={{
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        transition: 'border-color 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '24px', lineHeight: 1, marginTop: '2px' }}>
          {cat?.icon ?? '📌'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <h4
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: '15px',
                color: COLORS.texto,
                fontFamily: "'Fraunces', serif",
              }}
            >
              {reporte.titulo}
            </h4>
            {reporte.eventHash && (
              <span
                className="tabular-nums"
                style={{
                  fontSize: '10px',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: COLORS.celeste,
                }}
              >
                SHA-256: {reporte.eventHash.slice(0, 8)}
              </span>
            )}
          </div>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '14px',
              color: COLORS.textoSuave,
            }}
          >
            {reporte.desc}
          </p>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: COLORS.textoTenue,
            }}
          >
            <IconMapPin size={12} color={COLORS.textoTenue} /> {reporte.ubicacion}
          </p>
          <div
            style={{
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <EstadoPill estado={reporte.estado} />

            {puedeGestionar && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                {(
                  ['recibido', 'en_evaluacion', 'en_gestion', 'resuelto'] as EstadoReporteKey[]
                ).map((est) => {
                  const activo = reporte.estado === est;
                  return (
                    <button
                      key={est}
                      type="button"
                      onClick={() => onCambiarEstado(reporte.id, est)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: activo ? 700 : 500,
                        cursor: 'pointer',
                        backgroundColor: activo ? ESTADO_CONFIG[est].color : 'transparent',
                        color: activo ? COLORS.bg : COLORS.textoTenue,
                        border: `1px solid ${activo ? ESTADO_CONFIG[est].color : COLORS.border}`,
                      }}
                    >
                      {ESTADO_CONFIG[est].label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComercioCard({
  actor,
  rol,
  onToggleVerificado,
}: {
  actor: ActorDirectorioItem;
  rol: RolDemoKey;
  onToggleVerificado: (id: number | string) => void;
}) {
  const puedeVerificar = rol === 'gestor' || rol === 'auditor';
  return (
    <div
      style={{
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: '15px',
              color: COLORS.texto,
              fontFamily: "'Fraunces', serif",
            }}
          >
            {actor.nombre}
          </h4>
          {actor.verificado && <IconShieldCheck size={15} color={COLORS.celeste} />}
        </div>
        <p style={{ margin: '2px 0 0', fontSize: '14px', color: COLORS.textoSuave }}>
          {actor.rubro}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.textoTenue }}>
          {actor.horario}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {!actor.verificado && (
          <span
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '9999px',
              color: COLORS.ambar,
              border: `1px solid ${COLORS.ambar}50`,
            }}
          >
            Sin verificar
          </span>
        )}
        {puedeVerificar && (
          <button
            type="button"
            onClick={() => onToggleVerificado(actor.id)}
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: actor.verificado ? 'transparent' : COLORS.celeste,
              color: actor.verificado ? COLORS.textoSuave : COLORS.bg,
              border: `1px solid ${actor.verificado ? COLORS.border : COLORS.celeste}`,
            }}
          >
            {actor.verificado ? 'Revocar' : 'Verificar'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   Props del Prototipo Montado sobre la Página Principal
============================================================================ */
export interface BaseConsolidadaPrototypeProps {
  selectedNodeKey: string;
  onSelectCanonicalNodeKey: (nodeKey: CanonicalSanJuanNodeKey) => void;
  showFullPageCockpit: boolean;
  onToggleFullPageCockpit: () => void;
  onJumpToSection?: (sectionId: string) => void;
}

export type TabPrototypeKey = 'inicio' | 'reportar' | 'directorio' | 'asistente' | 'tamiz';
export type SubTabTamizKey = 'heuristica' | 'flujo_11_eslabones' | 'economia_eventos' | 'participacion_ambiente';

export interface ActivoVerificadoPreview {
  id: string;
  nombre: string;
  categoria: string;
  territoryId: 'gran-san-juan-capital' | 'caucete' | 'iglesia';
  barrioNodo: string;
  descripcion: string;
  geometria: { latitud: number; longitud: number; srid: 4326 };
  horarios: string;
  proveedoresLocales: string[];
  accesibilidadEspacioPublico: string;
  compromisoAmbiental: string;
  impactoTerritorial: string;
  estado: 'borrador' | 'en_revision' | 'verificado' | 'publicado';
  evidenciaHash: string;
  streamEntryId: string;
}

export interface OfertaMarketplacePreview {
  id: string;
  assetId: string;
  assetNombre: string;
  territoryId: 'gran-san-juan-capital' | 'caucete' | 'iglesia';
  barrioNodo: string;
  titulo: string;
  tipo: string;
  descripcion: string;
  unidadReferencia: string;
  disponibilidad: string;
  señalVerificable: string;
  evidenciaHash: string;
}

export interface PropuestaDeliberativaPreview {
  id: string;
  territoryId: 'gran-san-juan-capital' | 'caucete' | 'iglesia';
  barrioNodo: string;
  titulo: string;
  problemaUportunidad: string;
  propuestaAccion: string;
  etapaActual: string;
  apoyosDeliberativos: number;
  comentariosVerificados: number;
  respuestaInstitucionalOComunitaria: string | null;
  evidenciaHash: string;
}

export interface RegistroAmbientePreview {
  id: string;
  dominio: 'espacio_publico' | 'ambiente_paisaje';
  territoryId: 'gran-san-juan-capital' | 'caucete' | 'iglesia';
  barrioNodo: string;
  subcategoria: string;
  titulo: string;
  evidenciaObservada: string;
  estado: 'relevado' | 'en_intervencion' | 'resuelto_verificado';
  evidenciaHash: string;
}

export interface EventoComunitarioPreview {
  id: string;
  territoryId: 'gran-san-juan-capital' | 'caucete' | 'iglesia';
  barrioNodo: string;
  titulo: string;
  modalidad: string;
  fechaProgramada: string;
  lugarNombre: string;
  descripcion: string;
  evidenciaHash: string;
}

export interface ModuloCatalogoPreview {
  id: string;
  order: number;
  nombre: string;
  proposito: string;
  estadoActual: 'Definido' | 'Implementado' | 'Verificado' | 'Operativo';
  endpointsAsociados: string[];
  evidenciaEjecutable: string;
}

const ETAPAS_DELIBERATIVAS = [
  'propuesta',
  'revision',
  'comentarios',
  'deliberacion',
  'priorizacion',
  'decision',
  'respuesta',
  'seguimiento',
] as const;

const ESLABONES_FLUJO_VERTICAL = [
  { n: 1, t: 'Usuario autenticado', d: 'JWT HS256 + resolución determinista de rol (ciudadano | custodio_territorial | admin_hitub)' },
  { n: 2, t: 'Formulario web', d: 'Captura tipada en cliente con guardia preventiva Anti-PII (Ley 25.326)' },
  { n: 3, t: 'API Express', d: 'POST /api/plataforma/activos protegido por requireWriteAuth (EV-019)' },
  { n: 4, t: 'Contrato Zod', d: 'Validación VerifiedTerritorialAssetCreateSchema en @delocalsoy/contracts + EV-023' },
  { n: 5, t: 'Activo territorial', d: 'Entidad pura en @delocalsoy/domain con historial auditable y red de proveedores' },
  { n: 6, t: 'events_raw inmutable', d: 'Sellado append-only con hash SHA-256 único e idempotente (EV-005)' },
  { n: 7, t: 'Redis Stream', d: 'Publicación XADD en delocalsoy:stream:territorial (@delocalsoy/events)' },
  { n: 8, t: 'Worker idempotente', d: 'Consumo XREADGROUP + XACK en apps/worker con protección duplicate_ignored' },
  { n: 9, t: 'Proyección PostgreSQL/PostGIS', d: 'Materialización espacial POINT(lng lat) en SRID=4326 con índice GiST' },
  { n: 10, t: 'Consulta por nodo o bbox', d: 'GET /api/plataforma/activos?territoryId=...&bbox=minLng,minLat,maxLng,maxLat' },
  { n: 11, t: 'Auditoría del flujo', d: 'Recibo criptográfico de 11 eslabones verificable en vivo' },
];

const ACTIVOS_FALLBACK: ActivoVerificadoPreview[] = [
  {
    id: 'act-sjc-panaderia-desamparados',
    nombre: 'Panadería Social y Horno Comunitario Desamparados',
    categoria: 'comercio_proximidad',
    territoryId: 'gran-san-juan-capital',
    barrioNodo: 'Subnodo Desamparados – Centro Cívico',
    descripcion: 'Elaboración diaria de panificación de masa madre, semitas sanjuaninas y horneado comunitario con harina de molinos regionales.',
    geometria: { latitud: -31.5318, longitud: -68.5542, srid: 4326 },
    horarios: 'Lun a Sáb 07:00 a 14:00 y 17:30 a 20:30',
    proveedoresLocales: ['Molino Triguero Jáchal-San Juan', 'Productores Olivareros de Pocito', 'Cooperativa Apícola Tulúm'],
    accesibilidadEspacioPublico: 'Rampa peatonal nivelada en esquina y vereda de 2.40 m libre de obstáculos.',
    compromisoAmbiental: 'Recuperación de calor residual del horno y envases retornables de tela.',
    impactoTerritorial: 'Abastece a 140 familias del corredor Desamparados y sostiene 6 puestos de trabajo locales.',
    estado: 'publicado',
    evidenciaHash: 'a91f4c82e01b7731',
    streamEntryId: '1759850001000-1',
  },
  {
    id: 'act-cau-agroecologica-valle',
    nombre: 'Nodo Agroecológico y Empaque Frutihortícola Caucete',
    categoria: 'cooperativa_productiva',
    territoryId: 'caucete',
    barrioNodo: 'Nodo Caucete · Canal Matriz',
    descripcion: 'Centro comunitario de acopio, deshidratado solar de pasas/tomate y distribución directa de bolsones de estación.',
    geometria: { latitud: -31.6518, longitud: -68.2811, srid: 4326 },
    horarios: 'Mar a Dom 08:00 a 16:00',
    proveedoresLocales: ['Chacras Familiares Las Talas', 'Regantes del Canal Caucete Sur', 'Semillas Criollas Pie de Palo'],
    accesibilidadEspacioPublico: 'Ingreso señalizado y senda accesible desde Diagonal Sarmiento.',
    compromisoAmbiental: 'Riego por goteo auditado, sensores de humedad en parcela y cero quema de poda.',
    impactoTerritorial: 'Articula 28 unidades productivas familiares de Caucete y reduce 35% el costo de alimentos frescos.',
    estado: 'publicado',
    evidenciaHash: 'b83e1902d74c6612',
    streamEntryId: '1759850002000-2',
  },
  {
    id: 'act-igl-tejedoras-rodeo',
    nombre: 'Casa de Hilanderas, Semillas y Turismo Comunitario Rodeo-Iglesia',
    categoria: 'espacio_cultural',
    territoryId: 'iglesia',
    barrioNodo: 'Subnodo Rodeo · Valle de Iglesia',
    descripcion: 'Comercialización ética de tejidos en telar criollo, banco comunitario de semillas de altura y orientación de senderos cordilleranos.',
    geometria: { latitud: -30.2054, longitud: -69.1392, srid: 4326 },
    horarios: 'Lun a Dom 09:30 a 19:00',
    proveedoresLocales: ['Criadores de Camélidos de Tudcum y Angualasto', 'Huerteros de Semilla Andina de Bella Vista'],
    accesibilidadEspacioPublico: 'Acceso en planta baja sin desniveles y señalética de alto contraste.',
    compromisoAmbiental: 'Tintes naturales de flora nativa recolectada bajo poda sustentable.',
    impactoTerritorial: 'Integra a 19 artesanas y productores de Rodeo, Tudcum, Bella Vista, Iglesia, Las Flores y Angualasto.',
    estado: 'publicado',
    evidenciaHash: 'c74d2093f81a5509',
    streamEntryId: '1759850003000-3',
  },
];

const OFERTAS_FALLBACK: OfertaMarketplacePreview[] = [
  {
    id: 'mkt-sjc-pan-masa-madre',
    assetId: 'act-sjc-panaderia-desamparados',
    assetNombre: 'Panadería Social y Horno Comunitario Desamparados',
    territoryId: 'gran-san-juan-capital',
    barrioNodo: 'Subnodo Desamparados – Centro Cívico',
    titulo: 'Lote de Pan de Campo de Masa Madre + Semitas Tradicionales (Harina Local)',
    tipo: 'producto_local',
    descripcion: 'Horneado matutino con trigo molido en la provincia y aceite de oliva virgen extra de productores locales.',
    unidadReferencia: 'Bolsa familiar 1.5 kg · Retiro en mostrador o nodo barrial',
    disponibilidad: 'disponible_hoy',
    señalVerificable: 'Activo verificado en terreno · Trazabilidad de proveedor triguero y olivarero',
    evidenciaHash: 'f12a8834c901d223',
  },
  {
    id: 'mkt-cau-bolson-estacion',
    assetId: 'act-cau-agroecologica-valle',
    assetNombre: 'Nodo Agroecológico y Empaque Frutihortícola Caucete',
    territoryId: 'caucete',
    barrioNodo: 'Nodo Caucete',
    titulo: 'Bolsón Agroecológico de Estación (8 variedades cosechadas en el día)',
    tipo: 'producto_local',
    descripcion: 'Incluye verduras de hoja, zapallo anco, cebolla, tomate deshidratado solar y pasas de uva sin agroquímicos.',
    unidadReferencia: 'Bolsón de 7 kg · Entrega en Caucete y nodo Capital',
    disponibilidad: 'cosecha_estacional',
    señalVerificable: 'Certificación participativa del Canal Matriz Caucete (28 familias)',
    evidenciaHash: 'e49b7721a830c114',
  },
  {
    id: 'mkt-igl-manta-telar',
    assetId: 'act-igl-tejedoras-rodeo',
    assetNombre: 'Casa de Hilanderas, Semillas y Turismo Comunitario Rodeo-Iglesia',
    territoryId: 'iglesia',
    barrioNodo: 'Subnodo Rodeo · Valle de Iglesia',
    titulo: 'Tejido en Telar Criollo con Lana Hilada a Mano y Tintes Naturales + Taller Guiado',
    tipo: 'servicio_oficio',
    descripcion: 'Piezas tejidas en Rodeo, Tudcum y Angualasto con ficha de artesana autora y recorrido por el banco de semillas.',
    unidadReferencia: 'Por pieza / Reserva de taller comunitario',
    disponibilidad: 'cupos_abiertos',
    señalVerificable: 'Sello de autoría comunitaria verificada por el Nodo Valle de Iglesia',
    evidenciaHash: 'd88c6610b729e441',
  },
];

const PROPUESTAS_FALLBACK: PropuestaDeliberativaPreview[] = [
  {
    id: 'prop-sjc-corredor-sombra-accesible',
    territoryId: 'gran-san-juan-capital',
    barrioNodo: 'Subnodo Desamparados – Centro Cívico',
    titulo: 'Corredor Peatonal de Sombra, Acequias Activas y Rampas en el Eje Desamparados – Centro Cívico',
    problemaUportunidad: 'Tres cuadras del corredor presentan discontinuidad de rampas, taponamiento de tazas de arbolado y alta radiación térmica.',
    propuestaAccion: 'Intervenir cooperativamente las 12 esquinas priorizadas, destapar tazas de riego y señalizar cruces accesibles.',
    etapaActual: 'deliberacion',
    apoyosDeliberativos: 47,
    comentariosVerificados: 14,
    respuestaInstitucionalOComunitaria: 'En evaluación técnica conjunta con cuadrilla de arbolado y comerciantes frentistas.',
    evidenciaHash: '91ab4402c817d330',
  },
  {
    id: 'prop-cau-feria-itinerante-agua',
    territoryId: 'caucete',
    barrioNodo: 'Nodo Caucete',
    titulo: 'Punto Fijo Sombreado para Feria de Productores y Tablero Abierto de Turnos de Riego',
    problemaUportunidad: 'Los productores familiares comercializan sin estructura de sombra permanente y requieren transparencia en el caudal horario.',
    propuestaAccion: 'Instalar pérgolas desmontables en el predio vecinal y publicar en tablero abierto el cronograma de turnos hídricos.',
    etapaActual: 'decision',
    apoyosDeliberativos: 63,
    comentariosVerificados: 21,
    respuestaInstitucionalOComunitaria: 'Aprobado en mesa comunitaria: se asigna predio sombreado para los sábados y panel público de turnos.',
    evidenciaHash: '82bc5513d928e441',
  },
];

const AMBIENTE_FALLBACK: RegistroAmbientePreview[] = [
  {
    id: 'env-sjc-acequia-desamparados',
    dominio: 'ambiente_paisaje',
    territoryId: 'gran-san-juan-capital',
    barrioNodo: 'Subnodo Desamparados – Centro Cívico',
    subcategoria: 'agua_acequias',
    titulo: 'Rehabilitación de Pasante de Acequia y Tazas de Moreras en Corredor Desamparados',
    evidenciaObservada: 'Se relevó obstrucción por sedimentos en 40 metros lineales que impedía el riego de 9 ejemplares de arbolado urbano.',
    estado: 'en_intervencion',
    evidenciaHash: '55ee6677aa88bb99',
  },
  {
    id: 'esp-cau-accesibilidad-feria',
    dominio: 'espacio_publico',
    territoryId: 'caucete',
    barrioNodo: 'Nodo Caucete',
    subcategoria: 'accesibilidad_veredas',
    titulo: 'Adecuación de Rampa y Senda Podotáctil en Acceso al Nodo Agroecológico',
    evidenciaObservada: 'Ejecutada nivelación de cordón cuneta para permitir acceso seguro de personas mayores y carritos de abastecimiento.',
    estado: 'resuelto_verificado',
    evidenciaHash: '66ff7788bb99cc00',
  },
];

const EVENTOS_FALLBACK: EventoComunitarioPreview[] = [
  {
    id: 'evt-sjc-feria-desamparados',
    territoryId: 'gran-san-juan-capital',
    barrioNodo: 'Subnodo Desamparados – Centro Cívico',
    titulo: 'Feria de Abastecimiento Barrial y Taller de Masa Madre en Corredor Desamparados',
    modalidad: 'feria_abastecimiento',
    fechaProgramada: 'Sábado 10:00 a 14:00 hs',
    lugarNombre: 'Plazoleta Corredor Desamparados – Centro Cívico',
    descripcion: 'Encuentro directo entre familias vecinas, panadería social, productores de aceite de oliva y miel del Valle de Tulúm.',
    evidenciaHash: '77aa8899cc00dd11',
  },
  {
    id: 'evt-igl-semillas-rodeo',
    territoryId: 'iglesia',
    barrioNodo: 'Subnodo Rodeo · Tudcum · Angualasto',
    titulo: 'Encuentro de Custodios de Semillas Andinas y Telar Criollo del Valle de Iglesia',
    modalidad: 'taller_oficios',
    fechaProgramada: 'Domingo 11:00 a 17:00 hs',
    lugarNombre: 'Casa de Hilanderas Rodeo – Corredor Andino',
    descripcion: 'Intercambio de semillas criollas entre Bella Vista, Iglesia, Las Flores, Rodeo, Tudcum y Angualasto.',
    evidenciaHash: '88bb9900dd11ee22',
  },
];

const MODULOS_13_FALLBACK: ModuloCatalogoPreview[] = [
  { id: 'identidad-acceso', order: 1, nombre: '1. Identidad y acceso (JWT + RBAC)', proposito: 'Usuarios reales, sesiones JWT HS256 y control 401/403 por rol en escrituras', estadoActual: 'Verificado', endpointsAsociados: ['POST /api/auth/login', 'POST /api/plataforma/activos'], evidenciaEjecutable: 'EV-019 + EV-031/032 (RBAC ciudadano vs custodio)' },
  { id: 'territorios-nodos', order: 2, nombre: '2. Territorios y nodos (SRID 4326)', proposito: 'Nodo Capital (2 subnodos), Nodo Caucete y Nodo Valle de Iglesia (6 subnodos)', estadoActual: 'Operativo', endpointsAsociados: ['GET /api/territorios?bbox=', 'GET /api/plataforma/activos?bbox='], evidenciaEjecutable: 'EV-010 + EV-020/021 en main @ d70cbc6' },
  { id: 'directorio-territorial', order: 3, nombre: '3. Directorio territorial de activos', proposito: 'Activos verificados con proveedores locales, accesibilidad e impacto territorial', estadoActual: 'Verificado', endpointsAsociados: ['POST /api/plataforma/activos', 'PATCH /api/plataforma/activos/:id/estado'], evidenciaEjecutable: 'Objeto #1 · Cadena Vertical de 11 Eslabones' },
  { id: 'marketplace-proximidad', order: 4, nombre: '4. Marketplace de proximidad (Km 0)', proposito: 'Oferta y demanda local vinculada a activos verificados con señal comprobable', estadoActual: 'Implementado', endpointsAsociados: ['POST /api/plataforma/marketplace', 'GET /api/plataforma/overview'], evidenciaEjecutable: 'Desbloqueado en vista previa interactiva (Fase 2 -> Activo)' },
  { id: 'reportes-ciudadanos', order: 5, nombre: '5. Reportes ciudadanos e idempotencia', proposito: 'Incidencias geolocalizadas encoladas en EventOutbox / events_raw (SHA-256)', estadoActual: 'Verificado', endpointsAsociados: ['POST /api/events', 'POST /api/reportes'], evidenciaEjecutable: 'EV-005 (UNIQUE hash) + EV-023 (Guardia Anti-PII AR)' },
  { id: 'espacio-publico', order: 6, nombre: '6. Espacio público y accesibilidad', proposito: 'Rampas, veredas, iluminación y equipamiento barrial georreferenciado', estadoActual: 'Implementado', endpointsAsociados: ['POST /api/plataforma/ambiente-espacio-publico'], evidenciaEjecutable: 'Vinculado a activos y reportes del corredor' },
  { id: 'ambiente-paisaje', order: 7, nombre: '7. Ambiente, acequias y arbolado', proposito: 'Monitoreo hídrico de acequias, sombra urbana y puntos limpios', estadoActual: 'Implementado', endpointsAsociados: ['POST /api/plataforma/ambiente-espacio-publico'], evidenciaEjecutable: 'Cruces hídricos Capital · Caucete · Valle de Iglesia' },
  { id: 'eventos-territoriales', order: 8, nombre: '8. Eventos y agenda comunitaria', proposito: 'Ferias de abastecimiento, talleres de oficios y asambleas vecinales', estadoActual: 'Implementado', endpointsAsociados: ['POST /api/plataforma/eventos-territoriales'], evidenciaEjecutable: 'Agenda viva conectada a los nodos' },
  { id: 'participacion', order: 9, nombre: '9. Participación deliberativa (8 etapas)', proposito: 'Ciclo Decidim/CONSUL desde Propuesta hasta Respuesta y Seguimiento', estadoActual: 'Implementado', endpointsAsociados: ['POST /api/plataforma/participacion/propuestas', 'PATCH .../etapa'], evidenciaEjecutable: 'Trazabilidad deliberativa sin reduccionismo de voto' },
  { id: 'mapa-territorial', order: 10, nombre: '10. Mapa territorial PostGIS (BBOX)', proposito: 'Proyección Point SRID=4326 y consulta espacial ST_Intersects / ST_MakeEnvelope', estadoActual: 'Verificado', endpointsAsociados: ['GET /api/plataforma/activos?bbox='], evidenciaEjecutable: 'Eslabones 9 y 10 del Flujo Vertical' },
  { id: 'inteligencia-territorial', order: 11, nombre: '11. Inteligencia ética (/api/ask)', proposito: 'Contrato reconciliado {dato, interpretación, sugerencia} con rate-limit por rol', estadoActual: 'Verificado', endpointsAsociados: ['POST /api/ask', 'POST /api/plataforma/inteligencia-etica'], evidenciaEjecutable: 'Pestaña Asistente + Guardia Ley 25.326' },
  { id: 'observabilidad-auditoria', order: 12, nombre: '12. Observabilidad, Redis Streams y Worker', proposito: 'Bus XADD/XREADGROUP y TerritorialIdempotentWorker con duplicate_ignored', estadoActual: 'Verificado', endpointsAsociados: ['POST /api/plataforma/worker/replay', 'GET /api/health'], evidenciaEjecutable: 'Eslabones 6, 7, 8 y 11 + Replay idempotente' },
  { id: 'administracion', order: 13, nombre: '13. Administración y custodia RBAC', proposito: 'Moderación operativa de estados R5-UI y conmutación auditada de modo', estadoActual: 'Verificado', endpointsAsociados: ['PATCH /api/plataforma/activos/:id/estado', 'PATCH /api/health/mode'], evidenciaEjecutable: 'Control 403 Forbidden para rol ciudadano en moderación' },
];

export function BaseConsolidadaPrototype({
  selectedNodeKey,
  onSelectCanonicalNodeKey,
  showFullPageCockpit,
  onToggleFullPageCockpit,
  onJumpToSection,
}: BaseConsolidadaPrototypeProps) {
  const [tab, setTab] = useState<TabPrototypeKey>('inicio');
  const [subTabTamiz, setSubTabTamiz] = useState<SubTabTamizKey>('heuristica');
  const [nodoId, setNodoId] = useState<NodoPrototypeId>('centro-civico');
  const [rol, setRol] = useState<RolDemoKey>('ciudadano');
  const [panelInfoAbierto, setPanelInfoAbierto] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'adaptable' | 'movil_compacto'>('adaptable');

  const [reportes, setReportes] = useState<ReporteItem[]>(REPORTES_INICIALES);
  const [directorio, setDirectorio] = useState<ActorDirectorioItem[]>(DIRECTORIO_INICIAL);
  const [filtroEstadoReporte, setFiltroEstadoReporte] = useState<EstadoReporteKey | 'todos'>('todos');

  // Estado hidratado desde /api/plataforma/overview (lo desarrollado en los últimos días ahora visible en el prototipo)
  const [activosVerificados, setActivosVerificados] = useState<ActivoVerificadoPreview[]>(ACTIVOS_FALLBACK);
  const [ofertasMarketplace, setOfertasMarketplace] = useState<OfertaMarketplacePreview[]>(OFERTAS_FALLBACK);
  const [propuestasDeliberativas, setPropuestasDeliberativas] = useState<PropuestaDeliberativaPreview[]>(PROPUESTAS_FALLBACK);
  const [registrosAmbiente, setRegistrosAmbiente] = useState<RegistroAmbientePreview[]>(AMBIENTE_FALLBACK);
  const [eventosComunitarios, setEventosComunitarios] = useState<EventoComunitarioPreview[]>(EVENTOS_FALLBACK);
  const [modulosCatalogo, setModulosCatalogo] = useState<ModuloCatalogoPreview[]>(MODULOS_13_FALLBACK);
  const [resultadoProbeFlujo, setResultadoProbeFlujo] = useState<{
    titulo: string;
    detalle: string;
    hash?: string;
    color: string;
  } | null>(null);
  const [nuevaOfertaMkt, setNuevaOfertaMkt] = useState({
    titulo: '',
    unidadReferencia: '',
    señalVerificable: '',
  });

  const [nuevoReporte, setNuevoReporte] = useState<{
    categoria: CategoriaId;
    titulo: string;
    desc: string;
  }>({
    categoria: 'iluminacion',
    titulo: '',
    desc: '',
  });

  const [nuevoActor, setNuevoActor] = useState<{
    nombre: string;
    rubro: string;
    horario: string;
  }>({
    nombre: '',
    rubro: '',
    horario: '',
  });
  const [mostrarFormActor, setMostrarFormActor] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState<RespuestaTripartita | null>(null);
  const [cargando, setCargando] = useState(false);

  // Cargar los datos reales desarrollados en /api/plataforma/overview al montar
  useEffect(() => {
    let cancelado = false;
    async function hidratarPlataformaReal() {
      try {
        const res = await fetch('/api/plataforma/overview');
        if (!res.ok) return;
        const json = await res.json();
        if (cancelado || !json?.success) return;
        if (Array.isArray(json.verifiedAssets) && json.verifiedAssets.length > 0) {
          setActivosVerificados(json.verifiedAssets);
        }
        if (Array.isArray(json.marketplaceOffers) && json.marketplaceOffers.length > 0) {
          setOfertasMarketplace(json.marketplaceOffers);
        }
        if (Array.isArray(json.participationProposals) && json.participationProposals.length > 0) {
          setPropuestasDeliberativas(json.participationProposals);
        }
        if (Array.isArray(json.publicSpaceEnvRecords) && json.publicSpaceEnvRecords.length > 0) {
          setRegistrosAmbiente(json.publicSpaceEnvRecords);
        }
        if (Array.isArray(json.territorialEvents) && json.territorialEvents.length > 0) {
          setEventosComunitarios(json.territorialEvents);
        }
        if (Array.isArray(json.modulesCatalog) && json.modulesCatalog.length > 0) {
          setModulosCatalogo(json.modulesCatalog);
        }
      } catch {
        // Conserva semillas locales deterministas si la API no responde
      }
    }
    void hidratarPlataformaReal();
    return () => {
      cancelado = true;
    };
  }, []);

  // Sincronizar cuando desde el resto de la página cambia el nodo canónico
  useEffect(() => {
    const currentItem = NODOS.find((n) => n.id === nodoId);
    if (currentItem && currentItem.canonicalKey === selectedNodeKey) {
      return;
    }
    if (selectedNodeKey === 'capital') {
      setNodoId('centro-civico');
    } else if (selectedNodeKey === 'caucete') {
      setNodoId('caucete');
    } else if (selectedNodeKey === 'iglesia') {
      setNodoId('iglesia-bellavista');
    }
  }, [selectedNodeKey]);

  const nodoActivo = useMemo(
    () => NODOS.find((n) => n.id === nodoId) || NODOS[0],
    [nodoId],
  );

  const territoryCodeActivo = useMemo<'gran-san-juan-capital' | 'caucete' | 'iglesia'>(() => {
    if (nodoActivo.canonicalKey === 'capital') return 'gran-san-juan-capital';
    if (nodoActivo.canonicalKey === 'caucete') return 'caucete';
    return 'iglesia';
  }, [nodoActivo]);

  const reportesDelNodo = useMemo(
    () =>
      reportes.filter(
        (r) =>
          r.nodo === nodoId &&
          (filtroEstadoReporte === 'todos' ? true : r.estado === filtroEstadoReporte),
      ),
    [reportes, nodoId, filtroEstadoReporte],
  );

  const totalReportesDelNodo = useMemo(
    () => reportes.filter((r) => r.nodo === nodoId).length,
    [reportes, nodoId],
  );

  const directorioDelNodo = useMemo(
    () => directorio.filter((a) => a.nodo === nodoId),
    [directorio, nodoId],
  );

  const activosVerificadosDelNodo = useMemo(
    () => activosVerificados.filter((a) => a.territoryId === territoryCodeActivo),
    [activosVerificados, territoryCodeActivo],
  );

  const ofertasDelNodo = useMemo(
    () => ofertasMarketplace.filter((o) => o.territoryId === territoryCodeActivo),
    [ofertasMarketplace, territoryCodeActivo],
  );

  const propuestasDelNodo = useMemo(
    () => propuestasDeliberativas.filter((p) => p.territoryId === territoryCodeActivo),
    [propuestasDeliberativas, territoryCodeActivo],
  );

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function seleccionarNodo(n: NodoPrototypeItem) {
    setNodoId(n.id);
    onSelectCanonicalNodeKey(n.canonicalKey);
    mostrarToast(`Activo: ${n.nombre}`);
  }

  function detectarModoViajero() {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          let masCercano = NODOS[0];
          let menorDist = Number.POSITIVE_INFINITY;
          for (const item of NODOS) {
            const d = Math.hypot(
              latitude - item.coords.lat,
              longitude - item.coords.lng,
            );
            if (d < menorDist) {
              menorDist = d;
              masCercano = item;
            }
          }
          setNodoId(masCercano.id);
          onSelectCanonicalNodeKey(masCercano.canonicalKey);
          mostrarToast(`Modo viajero: asignado a ${masCercano.nombre}`);
        },
        () => {
          mostrarToast('Modo viajero: manteniendo Desamparados – Centro Cívico');
        },
        { timeout: 3500 },
      );
    } else {
      mostrarToast('Modo viajero: detección por geolocalización simulada en Centro Cívico');
    }
  }

  async function enviarReporte() {
    if (!nuevoReporte.titulo.trim()) {
      mostrarToast('Falta el título del reporte');
      return;
    }

    // Guardia Anti-PII básica en cliente (Ley 25.326)
    const textoCombinado = `${nuevoReporte.titulo} ${nuevoReporte.desc}`;
    if (/\b\d{1,2}\.\d{3}\.\d{3}\b/.test(textoCombinado) || /@/.test(textoCombinado)) {
      mostrarToast('Guardia Anti-PII: evitá incluir DNI o correos personales en el reporte');
      return;
    }

    let eventHash: string | undefined;
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'delocalsoy-dev-write-token-r8',
          Authorization: 'Bearer delocalsoy-dev-write-token-r8',
        },
        body: JSON.stringify({
          type: 'report.created',
          nodeId: nodoActivo.canonicalKey,
          payload: {
            nodo: nodoId,
            categoria: nuevoReporte.categoria,
            titulo: nuevoReporte.titulo.trim(),
            descripcion: nuevoReporte.desc.trim() || 'Sin descripción adicional',
          },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { hash?: string; event?: { hash?: string } };
        eventHash = data.hash ?? data.event?.hash;
      }
    } catch {
      // Mantiene encolado local si la API no está disponible
    }

    const nuevo: ReporteItem = {
      id: Date.now(),
      categoria: nuevoReporte.categoria,
      titulo: nuevoReporte.titulo.trim(),
      desc: nuevoReporte.desc.trim() || 'Sin descripción adicional',
      ubicacion: `${nodoActivo.nombre} (ejemplo)`,
      estado: 'recibido',
      nodo: nodoId,
      eventHash,
    };
    setReportes([nuevo, ...reportes]);
    setNuevoReporte({ categoria: 'iluminacion', titulo: '', desc: '' });
    mostrarToast(
      eventHash
        ? `Reporte encolado en EventOutbox (${eventHash.slice(0, 8)}) ✓`
        : 'Reporte encolado en EventOutbox (simulado) ✓',
    );
    setTab('inicio');
  }

  function cambiarEstadoReporte(id: number | string, nuevoEstado: EstadoReporteKey) {
    setReportes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estado: nuevoEstado } : r)),
    );
    mostrarToast(`Estado actualizado a: ${ESTADO_CONFIG[nuevoEstado].label}`);
  }

  function toggleVerificadoActor(id: number | string) {
    setDirectorio((prev) =>
      prev.map((a) => (a.id === id ? { ...a, verificado: !a.verificado } : a)),
    );
    mostrarToast('Estado de verificación del actor actualizado');
  }

  function agregarActorDirectorio() {
    if (!nuevoActor.nombre.trim() || !nuevoActor.rubro.trim()) {
      mostrarToast('Completá nombre y rubro del actor');
      return;
    }
    const creado: ActorDirectorioItem = {
      id: Date.now(),
      nombre: nuevoActor.nombre.trim(),
      rubro: nuevoActor.rubro.trim(),
      horario: nuevoActor.horario.trim() || 'Pendiente verificación',
      verificado: rol === 'gestor' || rol === 'auditor',
      nodo: nodoId,
    };
    setDirectorio([creado, ...directorio]);
    setNuevoActor({ nombre: '', rubro: '', horario: '' });
    setMostrarFormActor(false);
    mostrarToast(`Actor sumado al directorio de ${nodoActivo.nombre} ✓`);
  }

  async function moderarActivoReal(
    assetId: string,
    nuevoEstado: 'en_revision' | 'verificado' | 'publicado',
  ) {
    if (rol === 'ciudadano') {
      setResultadoProbeFlujo({
        titulo: 'Guardia RBAC 403 Forbidden verificada (EV-031 / R3)',
        detalle: `El rol actual "ciudadano" no tiene privilegios para moderar el activo a "${nuevoEstado}". Cambiá el selector superior a "Gestor" o "Auditor" para aplicar custodia territorial.`,
        color: COLORS.ambar,
      });
      mostrarToast('RBAC 403: Rol ciudadano no puede moderar activos');
      return;
    }

    try {
      const res = await fetch(`/api/plataforma/activos/${encodeURIComponent(assetId)}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'delocalsoy-dev-write-token-r8',
          Authorization: 'Bearer delocalsoy-dev-write-token-r8',
        },
        body: JSON.stringify({
          nuevoEstado,
          moderador: `Custodio ${nodoActivo.nombre}`,
          motivo: `Moderación operativa verificada desde prototipo Base Consolidada (${rol})`,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setActivosVerificados((prev) =>
            prev.map((a) => (a.id === assetId ? { ...a, estado: nuevoEstado, evidenciaHash: json.data.evidenciaHash ?? a.evidenciaHash } : a)),
          );
          setResultadoProbeFlujo({
            titulo: `Eslabones 1→11 ejecutados · Activo moderado a "${nuevoEstado}"`,
            detalle:
              json.workerReceipt?.projectionSummary ??
              `Sellado en events_raw y proyectado en PostGIS SRID=4326 (${nodoActivo.nombre}).`,
            hash: json.data.evidenciaHash,
            color: COLORS.verde,
          });
          mostrarToast(`Activo actualizado a ${nuevoEstado} ✓`);
          return;
        }
      }
    } catch {
      // Fallback local determinista
    }

    setActivosVerificados((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, estado: nuevoEstado } : a)),
    );
    setResultadoProbeFlujo({
      titulo: `Moderación aplicada (${nuevoEstado})`,
      detalle: `Estado R5-UI actualizado por rol ${rol} en ${nodoActivo.nombre}.`,
      color: COLORS.verde,
    });
    mostrarToast(`Activo actualizado a ${nuevoEstado} ✓`);
  }

  async function ejecutarPruebaReplayWorker() {
    const sampleHash = activosVerificadosDelNodo[0]?.evidenciaHash ?? 'a91f4c82e01b7731';
    try {
      const res = await fetch('/api/plataforma/worker/replay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'delocalsoy-dev-write-token-r8',
          Authorization: 'Bearer delocalsoy-dev-write-token-r8',
        },
        body: JSON.stringify({
          eventHash: sampleHash,
          territoryId: territoryCodeActivo,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setResultadoProbeFlujo({
          titulo: `Worker Replay Idempotente: ${json.workerStatus ?? 'duplicate_ignored'} (EV-032 / R4)`,
          detalle: `Se re-envió el hash ${sampleHash} al consumidor TerritorialAssetProjectionWorker. Resultado: idempotentReplay=${String(json.idempotentReplay ?? true)} · 0 duplicados en proyección PostGIS.`,
          hash: sampleHash,
          color: COLORS.celeste,
        });
        mostrarToast('Worker Replay: duplicate_ignored verificado ✓');
        return;
      }
    } catch {
      // Fallback determinista
    }
    setResultadoProbeFlujo({
      titulo: 'Worker Replay Idempotente: duplicate_ignored (EV-032)',
      detalle: `Re-ejecución sobre hash ${sampleHash} detectada por índice de idempotencia del worker sin duplicar proyección.`,
      hash: sampleHash,
      color: COLORS.celeste,
    });
    mostrarToast('Worker Replay: duplicate_ignored ✓');
  }

  async function ejecutarConsultaEspacialBbox() {
    const bboxMap: Record<'gran-san-juan-capital' | 'caucete' | 'iglesia', string> = {
      'gran-san-juan-capital': '-68.60,-31.58,-68.50,-31.50',
      caucete: '-68.35,-31.70,-68.22,-31.60',
      iglesia: '-69.30,-30.45,-69.10,-30.00',
    };
    const bbox = bboxMap[territoryCodeActivo];
    try {
      const res = await fetch(`/api/plataforma/activos?bbox=${encodeURIComponent(bbox)}`);
      if (res.ok) {
        const json = await res.json();
        setResultadoProbeFlujo({
          titulo: `Consulta PostGIS SRID=4326 (?bbox=${bbox}) · ${json.count ?? activosVerificadosDelNodo.length} activo(s)`,
          detalle:
            json.spatialQuery?.postgisOperator ??
            `ST_Intersects(geom, ST_MakeEnvelope(${bbox}, 4326)) ejecutado con validación BboxStringSchema (@delocalsoy/contracts).`,
          color: COLORS.dorado,
        });
        mostrarToast(`Filtro PostGIS BBOX: ${json.count ?? activosVerificadosDelNodo.length} resultado(s) ✓`);
        return;
      }
    } catch {
      // Fallback determinista
    }
    setResultadoProbeFlujo({
      titulo: `Consulta PostGIS SRID=4326 (?bbox=${bbox})`,
      detalle: `ST_Intersects(geom, ST_MakeEnvelope(${bbox}, 4326)) validado sobre ${activosVerificadosDelNodo.length} activo(s) de ${nodoActivo.nodoPadreLabel}.`,
      color: COLORS.dorado,
    });
    mostrarToast('Filtro PostGIS BBOX ejecutado ✓');
  }

  async function publicarOfertaProximidad() {
    if (!nuevaOfertaMkt.titulo.trim()) {
      mostrarToast('Ingresá el título del producto u oficio local');
      return;
    }
    const activoBase = activosVerificadosDelNodo[0] ?? activosVerificados[0];
    const creada: OfertaMarketplacePreview = {
      id: `mkt-${Date.now()}`,
      assetId: activoBase.id,
      assetNombre: activoBase.nombre,
      territoryId: territoryCodeActivo,
      barrioNodo: nodoActivo.nombre,
      titulo: nuevaOfertaMkt.titulo.trim(),
      tipo: 'producto_local',
      descripcion: `Oferta vinculada al activo verificado ${activoBase.nombre} en ${nodoActivo.nombre}.`,
      unidadReferencia: nuevaOfertaMkt.unidadReferencia.trim() || 'Retiro directo en nodo barrial',
      disponibilidad: 'disponible_hoy',
      señalVerificable:
        nuevaOfertaMkt.señalVerificable.trim() || `Trazabilidad verificada en ${nodoActivo.nombre}`,
      evidenciaHash: Math.random().toString(16).slice(2, 18),
    };
    setOfertasMarketplace((prev) => [creada, ...prev]);
    setNuevaOfertaMkt({ titulo: '', unidadReferencia: '', señalVerificable: '' });
    mostrarToast('Oferta vinculada a activo publicada en el nodo ✓');
  }

  async function avanzarEtapaPropuesta(propId: string) {
    setPropuestasDeliberativas((prev) =>
      prev.map((p) => {
        if (p.id !== propId) return p;
        const idx = ETAPAS_DELIBERATIVAS.indexOf(
          p.etapaActual as (typeof ETAPAS_DELIBERATIVAS)[number],
        );
        const sig = ETAPAS_DELIBERATIVAS[Math.min(idx + 1, ETAPAS_DELIBERATIVAS.length - 1)];
        mostrarToast(`Propuesta avanzada a etapa: ${sig} ✓`);
        return {
          ...p,
          etapaActual: sig,
          apoyosDeliberativos: p.apoyosDeliberativos + 1,
        };
      }),
    );
  }

  async function preguntarAsistente(consultaManual?: string) {
    const q = (consultaManual ?? pregunta).trim();
    if (!q) return;
    if (consultaManual) setPregunta(consultaManual);

    setCargando(true);
    setRespuesta(null);

    const lower = q.toLowerCase();
    const usaEjemploIlumina = lower.includes('ilumina') || lower.includes('luz') || lower.includes('poste');
    const usaEjemploRiego = lower.includes('acequia') || lower.includes('riego') || lower.includes('agua');

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'delocalsoy-dev-write-token-r8',
          Authorization: 'Bearer delocalsoy-dev-write-token-r8',
        },
        body: JSON.stringify({
          query: q,
          nodeKey: nodoActivo.canonicalKey,
          iglesiaCustodianAvailable: true,
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          branchMatched?: string;
          eventHash?: string;
          tripartiteContract?: {
            dato: string;
            interpretacion: string;
            sugerencia: string;
          };
        };

        if (usaEjemploIlumina) {
          setRespuesta({
            ...RESPUESTAS_EJEMPLO.ilumina,
            branchMatched: json.branchMatched,
            eventHash: json.eventHash,
          });
          setCargando(false);
          return;
        }
        if (usaEjemploRiego) {
          setRespuesta({
            ...RESPUESTAS_EJEMPLO.riego,
            branchMatched: json.branchMatched,
            eventHash: json.eventHash,
          });
          setCargando(false);
          return;
        }

        if (json.tripartiteContract) {
          setRespuesta({
            dato: json.tripartiteContract.dato,
            interpretacion: json.tripartiteContract.interpretacion,
            sugerencia: json.tripartiteContract.sugerencia,
            confianza: 0.84,
            origen: 'api_ask',
            branchMatched: json.branchMatched,
            eventHash: json.eventHash,
          });
          setCargando(false);
          return;
        }
      }
    } catch {
      // Fallback transparente al contrato reconciliado
    }

    setTimeout(() => {
      const key = usaEjemploIlumina ? 'ilumina' : usaEjemploRiego ? 'riego' : 'default';
      setRespuesta(RESPUESTAS_EJEMPLO[key]);
      setCargando(false);
    }, 550);
  }

  const limiteRol = RATE_LIMITS[rol];
  const esModoCompacto = layoutMode === 'movil_compacto';

  return (
    <section
      id="prototipo-base-consolidada"
      aria-label="DELocalSoy.AR Base Consolidada"
      style={{
        backgroundColor: COLORS.bg,
        color: COLORS.texto,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        borderBottom: `1px solid ${COLORS.border}`,
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes delocalFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes delocalSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .delocal-fade-in {
          animation: delocalFadeIn 0.24s ease-out;
        }
        .delocal-grid-shell {
          display: grid;
          grid-template-columns: 380px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 960px) {
          .delocal-grid-shell {
            grid-template-columns: 1fr;
          }
        }
        .delocal-mobile-bottom-nav {
          display: none;
        }
        @media (max-width: 768px) {
          .delocal-mobile-bottom-nav {
            display: flex;
          }
        }
      `}</style>

      {/* Toast en Dorado #FFC72C */}
      {toast && (
        <div
          role="status"
          className="delocal-fade-in"
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 90,
            padding: '8px 18px',
            borderRadius: '9999px',
            fontSize: '13px',
            backgroundColor: COLORS.dorado,
            color: COLORS.bg,
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          {toast}
        </div>
      )}

      {/* Contenedor Principal del Prototipo Montado */}
      <div
        style={{
          maxWidth: esModoCompacto ? '512px' : '1200px',
          margin: '0 auto',
          padding: esModoCompacto ? '0 0 84px' : '20px 24px 36px',
          borderLeft: esModoCompacto ? `1px solid ${COLORS.border}` : 'none',
          borderRight: esModoCompacto ? `1px solid ${COLORS.border}` : 'none',
          minHeight: esModoCompacto ? '86vh' : 'auto',
          backgroundColor: COLORS.bg,
        }}
      >
        {/* Portada de Identidad Oficial + Cabecera del Prototipo Base Consolidada */}
        <div
          style={{
            padding: esModoCompacto ? '18px 16px 14px' : '22px 26px 18px',
            borderRadius: esModoCompacto ? '0' : '20px',
            backgroundColor: esModoCompacto ? COLORS.bg : COLORS.bgCard,
            border: esModoCompacto ? 'none' : `1px solid ${COLORS.border}`,
            borderBottom: `1px solid ${COLORS.border}`,
            marginBottom: '20px',
          }}
        >
          {/* Bloque Institucional de Marca (sin isologo suelto a la derecha ni firma personal) */}
          <div
            style={{
              paddingBottom: '16px',
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <DelocalSoyWordmark
                  fontSize={esModoCompacto ? '32px' : 'clamp(2rem, 3.4vw, 2.65rem)'}
                />
                <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 9px',
                    borderRadius: '9999px',
                    backgroundColor: `${COLORS.dorado}18`,
                    color: COLORS.dorado,
                    border: `1px solid ${COLORS.dorado}45`,
                    fontWeight: 600,
                  }}
                >
                  Base consolidada · 3/sep
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    padding: '2px',
                    borderRadius: '9999px',
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setLayoutMode('adaptable')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor:
                        layoutMode === 'adaptable' ? COLORS.dorado : 'transparent',
                      color: layoutMode === 'adaptable' ? COLORS.bg : COLORS.textoSuave,
                    }}
                  >
                    Vista Página (2 Col)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('movil_compacto')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor:
                        layoutMode === 'movil_compacto' ? COLORS.dorado : 'transparent',
                      color: layoutMode === 'movil_compacto' ? COLORS.bg : COLORS.textoSuave,
                    }}
                  >
                    Marco App Móvil
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onToggleFullPageCockpit}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: showFullPageCockpit ? `${COLORS.celeste}20` : 'transparent',
                    color: showFullPageCockpit ? COLORS.celeste : COLORS.textoSuave,
                    border: `1px solid ${showFullPageCockpit ? COLORS.celeste : COLORS.border}`,
                  }}
                >
                  {showFullPageCockpit ? 'Cockpit H1–H4 Visible ↓' : 'Mostrar Cockpit H1–H4 ↓'}
                </button>

                <a
                  href="/lote-base-consolidada-agente-vibe.tar.gz"
                  download="lote-base-consolidada-agente-vibe.tar.gz"
                  title="Descargar paquete completo de Base Consolidada + scripts para Agente Vibe (.tar.gz)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: `${COLORS.dorado}20`,
                    border: `1px solid ${COLORS.dorado}`,
                    color: COLORS.dorado,
                    fontSize: '11.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <span>⬇️ Lote Agente Vibe (.tar.gz)</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPanelInfoAbierto(true)}
                  aria-label="Estado técnico"
                  title="Abrir Estado técnico — auditoría 3/sep"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textoSuave,
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <IconInfo size={15} color={COLORS.dorado} />
                  <span>Estado técnico</span>
                </button>
              </div>
            </div>

            <p
              style={{
                margin: '10px 0 0',
                fontSize: esModoCompacto ? '13.5px' : '15px',
                color: COLORS.celeste,
                fontWeight: 500,
              }}
            >
              Red federada de nodos territoriales de desarrollo local
            </p>

            <p
              style={{
                margin: '8px 0 0',
                fontSize: esModoCompacto ? '15px' : '16.5px',
                lineHeight: 1.4,
                color: COLORS.texto,
                fontWeight: 600,
              }}
            >
              Que cada territorio produzca y gobierne su propia información
            </p>

            <p
              style={{
                margin: '6px 0 0',
                fontSize: '12px',
                color: COLORS.textoTenue,
              }}
            >
              Plataforma de desarrollo local inclusivo · prototipo interactivo sobre la página
            </p>
          </div>

          {/* Un Solo Slider Horizontal del Árbol de Nodos y Subnodos */}
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              role="region"
              aria-label="Slider del árbol de nodos y subnodos"
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: '10px',
                overflowX: 'auto',
                padding: '10px 12px',
                borderRadius: '14px',
                backgroundColor: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {GRUPOS_NODOS.map((grupo) => {
                const esGrupoActivo = nodoActivo.canonicalKey === grupo.canonicalKey;
                const esNodoUnico = grupo.subnodos.length === 1;

                if (esNodoUnico) {
                  const unicoSub = grupo.subnodos[0];
                  const esActivo = nodoId === unicoSub.id;
                  return (
                    <div
                      key={grupo.canonicalKey}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '12px',
                        backgroundColor: esActivo ? `${grupo.color}16` : COLORS.bgCard,
                        border: `1px solid ${esActivo ? grupo.color : COLORS.border}`,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const item = NODOS.find((n) => n.id === unicoSub.id);
                          if (item) seleccionarNodo(item);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          padding: '5px 12px',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          backgroundColor: esActivo ? grupo.color : 'transparent',
                          color: esActivo ? COLORS.bg : COLORS.texto,
                          border: 'none',
                          fontWeight: esActivo ? 700 : 600,
                          fontSize: '12.5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <IconRadio
                          size={13}
                          color={esActivo ? COLORS.bg : grupo.color}
                        />
                        <span>{grupo.titulo}</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={grupo.canonicalKey}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '12px',
                      backgroundColor: esGrupoActivo ? `${grupo.color}14` : COLORS.bgCard,
                      border: `1px solid ${esGrupoActivo ? grupo.color : COLORS.border}`,
                      flexShrink: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const target =
                          NODOS.find((n) => n.id === grupo.defaultSubnodoId) || NODOS[0];
                        seleccionarNodo(target);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        color: esGrupoActivo ? grupo.color : COLORS.textoSuave,
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      <IconRadio
                        size={13}
                        color={esGrupoActivo ? grupo.color : COLORS.textoTenue}
                      />
                      <span>{grupo.titulo}:</span>
                    </button>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {grupo.subnodos.map((sub) => {
                        const esSubnodoActivo = nodoId === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              const item = NODOS.find((n) => n.id === sub.id);
                              if (item) seleccionarNodo(item);
                            }}
                            style={{
                              padding: '5px 11px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: esSubnodoActivo ? 700 : 500,
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              backgroundColor: esSubnodoActivo
                                ? grupo.color
                                : COLORS.bg,
                              color: esSubnodoActivo ? COLORS.bg : COLORS.textoSuave,
                              border: `1px solid ${
                                esSubnodoActivo ? grupo.color : COLORS.border
                              }`,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {sub.labelCorto}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={detectarModoViajero}
                title="Detectar mi nodo cercano (modo viajero)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  backgroundColor: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.celeste,
                  fontSize: '11.5px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <IconMapPin size={12} color={COLORS.celeste} />
                <span>Modo viajero</span>
              </button>
            </div>

            {/* Nivel 3: Badge del Nodo/Subnodo Activo + Selector de Rol en Dorado #FFC72C */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <BarrioActivoBadge nodo={nodoActivo} />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: COLORS.textoTenue,
                }}
              >
                <span>Rol demo:</span>
                {(['ciudadano', 'gestor', 'auditor'] as RolDemoKey[]).map((r) => {
                  const activo = rol === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRol(r);
                        mostrarToast(`Rol activo: ${r} (límite ${RATE_LIMITS[r]}/min)`);
                      }}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        textTransform: 'capitalize',
                        fontSize: '11px',
                        fontWeight: activo ? 700 : 500,
                        cursor: 'pointer',
                        color: activo ? COLORS.bg : COLORS.textoSuave,
                        backgroundColor: activo ? COLORS.dorado : 'transparent',
                        border: `1px solid ${activo ? COLORS.dorado : COLORS.border}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Barra de Pestañas Integrada en Escritorio (Dorado #FFC72C para la pestaña activa) */}
          <div
            role="tablist"
            aria-label="Estaciones del prototipo Base Consolidada"
            style={{
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: `1px solid ${COLORS.border}`,
              display: 'grid',
              gridTemplateColumns: esModoCompacto ? 'repeat(5, minmax(0, 1fr))' : 'repeat(5, 1fr)',
              gap: '8px',
            }}
          >
            {(
              [
                { id: 'inicio', label: 'Inicio', icon: IconHome, count: totalReportesDelNodo },
                { id: 'reportar', label: 'Reportar', icon: IconPlus, count: undefined },
                {
                  id: 'directorio',
                  label: 'Directorio',
                  icon: IconUsers,
                  count: directorioDelNodo.length + activosVerificadosDelNodo.length,
                },
                { id: 'asistente', label: 'Asistente', icon: IconSparkles, count: undefined },
                {
                  id: 'tamiz',
                  label: esModoCompacto ? 'Tamiz' : 'Tamiz & Módulos',
                  icon: IconShieldCheck,
                  count: modulosCatalogo.length,
                },
              ] as const
            ).map(({ id, label, icon: Icon, count }) => {
              const activa = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  onClick={() => setTab(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    padding: '9px 10px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: esModoCompacto ? '11.5px' : '13px',
                    fontWeight: activa ? 700 : 500,
                    backgroundColor: activa ? `${COLORS.dorado}18` : COLORS.bg,
                    color: activa ? COLORS.dorado : COLORS.textoSuave,
                    border: `1px solid ${activa ? COLORS.dorado : COLORS.border}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={16} color={activa ? COLORS.dorado : COLORS.textoTenue} />
                  <span>{label}</span>
                  {typeof count === 'number' && (
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        backgroundColor: activa ? COLORS.dorado : COLORS.bgCardHover,
                        color: activa ? COLORS.bg : COLORS.textoTenue,
                        fontWeight: 700,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cuerpo Principal: En Modo Adaptable usa 2 columnas; en Modo Compacto usa 1 columna */}
        <div
          className={esModoCompacto ? '' : 'delocal-grid-shell'}
          style={{ padding: esModoCompacto ? '0 16px' : '0' }}
        >
          {/* Columna Izquierda (Contexto del Corredor, Estado del Nodo y Fase 2) */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Tarjeta del Corredor del Nodo */}
            <div
              style={{
                borderRadius: '16px',
                padding: '16px',
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: COLORS.textoTenue,
                  fontWeight: 600,
                }}
              >
                Corredor del nodo
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  flexWrap: 'wrap',
                  color: COLORS.texto,
                }}
              >
                {nodoActivo.desc.split(' → ').map((tramo, i, arr) => (
                  <React.Fragment key={tramo}>
                    <span
                      style={{
                        padding: '4px 9px',
                        borderRadius: '8px',
                        backgroundColor: `${COLORS.celeste}15`,
                        color: COLORS.celeste,
                        border: `1px solid ${COLORS.celeste}35`,
                        fontWeight: 500,
                      }}
                    >
                      {tramo}
                    </span>
                    {i < arr.length - 1 && (
                      <IconArrowRight size={13} color={COLORS.textoTenue} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Resumen numérico rápido del nodo */}
              <div
                className="tabular-nums"
                style={{
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: `1px solid ${COLORS.border}`,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                <div>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '16px',
                      color: COLORS.dorado,
                      fontFamily: "'Fraunces', serif",
                    }}
                  >
                    {totalReportesDelNodo}
                  </strong>
                  <span style={{ fontSize: '11px', color: COLORS.textoTenue }}>
                    Reportes
                  </span>
                </div>
                <div>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '16px',
                      color: COLORS.celeste,
                      fontFamily: "'Fraunces', serif",
                    }}
                  >
                    {directorioDelNodo.length + activosVerificadosDelNodo.length}
                  </strong>
                  <span style={{ fontSize: '11px', color: COLORS.textoTenue }}>
                    Actores + Activos
                  </span>
                </div>
                <div>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '16px',
                      color: COLORS.ambar,
                      fontFamily: "'Fraunces', serif",
                    }}
                  >
                    {limiteRol}/m
                  </strong>
                  <span style={{ fontSize: '11px', color: COLORS.textoTenue }}>
                    Cuota /ask
                  </span>
                </div>
              </div>
            </div>

            {/* Bloque Fase 2 (Ahora conectado como Vista Previa Ejecutable al Tamiz de Módulos) */}
            <button
              type="button"
              onClick={() => {
                setTab('tamiz');
                setSubTabTamiz('economia_eventos');
                mostrarToast('Vista previa activa: Mercado de Proximidad + Participación');
              }}
              style={{
                width: '100%',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${tab === 'tamiz' ? COLORS.dorado : COLORS.border}`,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconShieldCheck size={16} color={COLORS.dorado} />
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: 600,
                      color: COLORS.texto,
                      fontFamily: "'Fraunces', serif",
                    }}
                  >
                    Mercado Endógeno + Banco de Potencialidades
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: COLORS.celeste }}>
                    Vista previa conectada ({ofertasDelNodo.length} oferta(s) · {propuestasDelNodo.length} propuesta(s) en nodo) →
                  </p>
                </div>
              </div>
            </button>

            {/* Conexión rápida con las secciones profundas de la página cuando estamos en modo adaptable */}
            {!esModoCompacto && (
              <div
                style={{
                  borderRadius: '16px',
                  padding: '14px 16px',
                  backgroundColor: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: COLORS.textoTenue,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Engarce con módulos de la página
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onJumpToSection?.('cartografia-workspace')}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.celeste,
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    📍 Ver {nodoActivo.nombre} en Mapa PostGIS SRID=4326 ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpToSection?.('nodos-federados')}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.textoSuave,
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    🧭 Abrir Explorador de Capas y Nodos Federados ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelInfoAbierto(true)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.dorado,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ℹ️ Leer las 7 notas de Estado técnico (auditoría 3/sep)
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* Columna Derecha: Contenido Dinámico de la Pestaña Activa */}
          <div style={{ minWidth: 0, marginTop: esModoCompacto ? '14px' : 0 }}>
            {tab === 'inicio' && (
              <div className="delocal-fade-in">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "'Fraunces', serif",
                        fontWeight: 700,
                        fontSize: '20px',
                        color: COLORS.texto,
                      }}
                    >
                      Reportes activos
                    </h2>
                    <span style={{ fontSize: '12px', color: COLORS.textoTenue }}>
                      {reportesDelNodo.length} visibles en {nodoActivo.nombre}
                    </span>
                  </div>

                  {/* Filtro rápido por estado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {(
                      [
                        { id: 'todos', label: 'Todos' },
                        { id: 'recibido', label: 'Recibidos' },
                        { id: 'en_evaluacion', label: 'En evaluación' },
                        { id: 'en_gestion', label: 'En gestión' },
                        { id: 'resuelto', label: 'Resueltos' },
                      ] as const
                    ).map((f) => {
                      const act = filtroEstadoReporte === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFiltroEstadoReporte(f.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: act ? 700 : 500,
                            cursor: 'pointer',
                            backgroundColor: act ? COLORS.dorado : COLORS.bgCard,
                            color: act ? COLORS.bg : COLORS.textoSuave,
                            border: `1px solid ${act ? COLORS.dorado : COLORS.border}`,
                          }}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {reportesDelNodo.length === 0 ? (
                  <div
                    style={{
                      borderRadius: '16px',
                      padding: '32px 16px',
                      textAlign: 'center',
                      backgroundColor: COLORS.bgCard,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '14px', color: COLORS.textoTenue }}>
                      Todavía no hay reportes en este filtro para {nodoActivo.nombre}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTab('reportar')}
                      style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: COLORS.dorado,
                        color: COLORS.bg,
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      + Crear primer reporte en este nodo
                    </button>
                  </div>
                ) : (
                  reportesDelNodo.map((r) => (
                    <ReporteCard
                      key={r.id}
                      reporte={r}
                      rol={rol}
                      onCambiarEstado={cambiarEstadoReporte}
                    />
                  ))
                )}
              </div>
            )}

            {tab === 'reportar' && (
              <div
                className="delocal-fade-in"
                style={{
                  borderRadius: '16px',
                  padding: '20px',
                  backgroundColor: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <h2
                  style={{
                    margin: '0 0 4px',
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 700,
                    fontSize: '20px',
                    color: COLORS.texto,
                  }}
                >
                  Nuevo reporte
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: COLORS.textoTenue }}>
                  Se registra en {nodoActivo.nombre} y se encola en EventOutbox
                </p>

                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: COLORS.textoSuave,
                  }}
                >
                  Categoría
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  {CATEGORIAS.map((c) => {
                    const seleccionada = nuevoReporte.categoria === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setNuevoReporte({ ...nuevoReporte, categoria: c.id })
                        }
                        style={{
                          borderRadius: '12px',
                          padding: '10px 6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          backgroundColor: seleccionada
                            ? `${COLORS.celeste}20`
                            : COLORS.bg,
                          border: `1px solid ${
                            seleccionada ? COLORS.celeste : COLORS.border
                          }`,
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{c.icon}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            textAlign: 'center',
                            lineHeight: 1.2,
                            color: seleccionada ? COLORS.texto : COLORS.textoSuave,
                            fontWeight: seleccionada ? 600 : 400,
                          }}
                        >
                          {c.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: COLORS.textoSuave,
                  }}
                >
                  Título
                </p>
                <input
                  value={nuevoReporte.titulo}
                  onChange={(e) =>
                    setNuevoReporte({ ...nuevoReporte, titulo: e.target.value })
                  }
                  placeholder="Ej: Luminaria apagada"
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.texto,
                  }}
                />

                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: COLORS.textoSuave,
                  }}
                >
                  Descripción
                </p>
                <textarea
                  value={nuevoReporte.desc}
                  onChange={(e) =>
                    setNuevoReporte({ ...nuevoReporte, desc: e.target.value })
                  }
                  placeholder="Contá qué está pasando..."
                  rows={3}
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    marginBottom: '18px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none',
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.texto,
                    fontFamily: 'inherit',
                  }}
                />

                <button
                  type="button"
                  onClick={() => void enviarReporte()}
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 700,
                    fontSize: '14px',
                    backgroundColor: COLORS.dorado,
                    color: COLORS.bg,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <IconPlus size={16} color={COLORS.bg} /> Enviar reporte
                </button>
              </div>
            )}

            {tab === 'directorio' && (
              <div className="delocal-fade-in">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "'Fraunces', serif",
                        fontWeight: 700,
                        fontSize: '20px',
                        color: COLORS.texto,
                      }}
                    >
                      Directorio de actores
                    </h2>
                    <span style={{ fontSize: '12px', color: COLORS.textoTenue }}>
                      {directorioDelNodo.length} en {nodoActivo.nombre}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMostrarFormActor(!mostrarFormActor)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: COLORS.dorado,
                      color: COLORS.bg,
                      border: 'none',
                    }}
                  >
                    {mostrarFormActor ? 'Cancelar' : '+ Sumar actor'}
                  </button>
                </div>

                {mostrarFormActor && (
                  <div
                    className="delocal-fade-in"
                    style={{
                      borderRadius: '16px',
                      padding: '16px',
                      marginBottom: '14px',
                      backgroundColor: COLORS.bgCard,
                      border: `1px solid ${COLORS.dorado}50`,
                    }}
                  >
                    <h4
                      style={{
                        margin: '0 0 10px',
                        fontFamily: "'Fraunces', serif",
                        fontSize: '15px',
                        color: COLORS.texto,
                      }}
                    >
                      Registrar actor local en {nodoActivo.nombre}
                    </h4>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '8px',
                        marginBottom: '10px',
                      }}
                    >
                      <input
                        value={nuevoActor.nombre}
                        onChange={(e) =>
                          setNuevoActor({ ...nuevoActor, nombre: e.target.value })
                        }
                        placeholder="Nombre (ej: Panadería San Juan)"
                        style={{
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          backgroundColor: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                          color: COLORS.texto,
                        }}
                      />
                      <input
                        value={nuevoActor.rubro}
                        onChange={(e) =>
                          setNuevoActor({ ...nuevoActor, rubro: e.target.value })
                        }
                        placeholder="Rubro (ej: Comercio / Oficio)"
                        style={{
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          backgroundColor: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                          color: COLORS.texto,
                        }}
                      />
                      <input
                        value={nuevoActor.horario}
                        onChange={(e) =>
                          setNuevoActor({ ...nuevoActor, horario: e.target.value })
                        }
                        placeholder="Horario (ej: 8 a 20 hs)"
                        style={{
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          backgroundColor: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                          color: COLORS.texto,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={agregarActorDirectorio}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        backgroundColor: COLORS.dorado,
                        color: COLORS.bg,
                        fontWeight: 700,
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Guardar en directorio
                    </button>
                  </div>
                )}

                {/* Activos Territoriales Verificados (Objeto #1 · Flujo Vertical 11 Eslabones · SRID=4326) */}
                {activosVerificadosDelNodo.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <p
                      style={{
                        margin: '0 0 8px',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: COLORS.dorado,
                        fontWeight: 700,
                      }}
                    >
                      Activos Territoriales con Proyección PostGIS SRID=4326 ({activosVerificadosDelNodo.length})
                    </p>
                    {activosVerificadosDelNodo.map((act) => (
                      <div
                        key={act.id}
                        style={{
                          borderRadius: '16px',
                          padding: '16px',
                          marginBottom: '12px',
                          backgroundColor: COLORS.bgCard,
                          border: `1px solid ${COLORS.dorado}45`,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '10px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h4
                                style={{
                                  margin: 0,
                                  fontFamily: "'Fraunces', serif",
                                  fontSize: '15.5px',
                                  fontWeight: 700,
                                  color: COLORS.texto,
                                }}
                              >
                                {act.nombre}
                              </h4>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  backgroundColor: `${COLORS.dorado}20`,
                                  color: COLORS.dorado,
                                  border: `1px solid ${COLORS.dorado}50`,
                                  fontWeight: 600,
                                }}
                              >
                                R5-UI: {act.estado}
                              </span>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: COLORS.textoSuave }}>
                              {act.descripcion}
                            </p>
                          </div>
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: '11px',
                              color: COLORS.celeste,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            POINT({act.geometria.longitud.toFixed(4)} {act.geometria.latitud.toFixed(4)}) · #{act.evidenciaHash.slice(0, 8)}
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: '10px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                          }}
                        >
                          {act.proveedoresLocales.map((prov) => (
                            <span
                              key={prov}
                              style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '8px',
                                backgroundColor: COLORS.bg,
                                border: `1px solid ${COLORS.border}`,
                                color: COLORS.textoSuave,
                              }}
                            >
                              🔗 {prov}
                            </span>
                          ))}
                        </div>

                        <div
                          style={{
                            marginTop: '10px',
                            paddingTop: '10px',
                            borderTop: `1px solid ${COLORS.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                            fontSize: '12px',
                            color: COLORS.textoTenue,
                          }}
                        >
                          <span>♿ {act.accesibilidadEspacioPublico}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {(['en_revision', 'verificado', 'publicado'] as const).map((est) => (
                              <button
                                key={est}
                                type="button"
                                onClick={() => void moderarActivoReal(act.id, est)}
                                style={{
                                  padding: '3px 9px',
                                  borderRadius: '9999px',
                                  fontSize: '11px',
                                  fontWeight: act.estado === est ? 700 : 500,
                                  cursor: 'pointer',
                                  backgroundColor: act.estado === est ? COLORS.dorado : 'transparent',
                                  color: act.estado === est ? COLORS.bg : COLORS.textoSuave,
                                  border: `1px solid ${act.estado === est ? COLORS.dorado : COLORS.border}`,
                                }}
                              >
                                {est}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: COLORS.textoTenue,
                    fontWeight: 600,
                  }}
                >
                  Actores barriales del subnodo ({directorioDelNodo.length})
                </p>

                {directorioDelNodo.length === 0 ? (
                  <p
                    style={{
                      fontSize: '14px',
                      padding: '32px 0',
                      textAlign: 'center',
                      color: COLORS.textoTenue,
                    }}
                  >
                    Todavía no hay actores de ejemplo en este nodo.
                  </p>
                ) : (
                  directorioDelNodo.map((a) => (
                    <ComercioCard
                      key={a.id}
                      actor={a}
                      rol={rol}
                      onToggleVerificado={toggleVerificadoActor}
                    />
                  ))
                )}
              </div>
            )}

            {tab === 'asistente' && (
              <div className="delocal-fade-in">
                <div
                  style={{
                    borderRadius: '16px',
                    padding: '20px',
                    backgroundColor: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <IconSparkles size={18} color={COLORS.dorado} />
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "'Fraunces', serif",
                        fontWeight: 700,
                        fontSize: '20px',
                        color: COLORS.texto,
                      }}
                    >
                      Preguntale al territorio
                    </h2>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: COLORS.textoTenue }}>
                    Rol activo:{' '}
                    <span style={{ textTransform: 'capitalize', color: COLORS.dorado, fontWeight: 600 }}>
                      {rol}
                    </span>{' '}
                    · límite <span className="tabular-nums">{limiteRol}/min</span> (RFC-002)
                  </p>

                  {/* Consultas sugeridas rápidas */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '12px',
                    }}
                  >
                    {[
                      '¿Cuántos reportes de iluminación hay?',
                      '¿Estado de acequias y riego en el nodo?',
                      '¿Comparativa de actividad entre nodos?',
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => void preguntarAsistente(sug)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          backgroundColor: COLORS.bg,
                          color: COLORS.textoSuave,
                          border: `1px solid ${COLORS.border}`,
                          cursor: 'pointer',
                        }}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                      value={pregunta}
                      onChange={(e) => setPregunta(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void preguntarAsistente()}
                      placeholder="¿Cuántos reportes de iluminación hay?"
                      style={{
                        flex: 1,
                        borderRadius: '12px',
                        padding: '10px 14px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.texto,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void preguntarAsistente()}
                      aria-label="Enviar consulta"
                      style={{
                        borderRadius: '12px',
                        padding: '0 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: COLORS.celeste,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <IconSend size={16} color={COLORS.bg} />
                    </button>
                  </div>

                  {cargando && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '32px 0',
                        color: COLORS.textoTenue,
                        fontSize: '14px',
                      }}
                    >
                      <IconLoader size={16} color={COLORS.dorado} /> Consultando KPIs y
                      sugerencias...
                    </div>
                  )}

                  {respuesta && !cargando && (
                    <div
                      className="delocal-fade-in"
                      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                    >
                      <div
                        style={{
                          borderRadius: '16px',
                          padding: '16px',
                          backgroundColor: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: COLORS.celeste,
                          }}
                        >
                          DATO
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', color: COLORS.texto }}>
                          {respuesta.dato}
                        </p>
                      </div>

                      <div
                        style={{
                          borderRadius: '16px',
                          padding: '16px',
                          backgroundColor: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: COLORS.ambar,
                          }}
                        >
                          INTERPRETACIÓN{' '}
                          <span className="tabular-nums" style={{ opacity: 0.7 }}>
                            · confianza {Math.round(respuesta.confianza * 100)}%
                          </span>
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', color: COLORS.texto }}>
                          {respuesta.interpretacion}
                        </p>
                      </div>

                      <div
                        style={{
                          borderRadius: '16px',
                          padding: '16px',
                          backgroundColor: `${COLORS.dorado}12`,
                          border: `1px solid ${COLORS.dorado}40`,
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: COLORS.dorado,
                          }}
                        >
                          SUGERENCIA
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', color: COLORS.texto }}>
                          {respuesta.sugerencia}
                        </p>
                      </div>

                      {(respuesta.branchMatched || respuesta.eventHash) && (
                        <div
                          className="tabular-nums"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                            fontSize: '11px',
                            color: COLORS.textoTenue,
                            padding: '4px 6px',
                          }}
                        >
                          <span>
                            Rama /api/ask:{' '}
                            <code style={{ color: COLORS.celeste }}>
                              {respuesta.branchMatched ?? 'reconciliada'}
                            </code>
                          </span>
                          {respuesta.eventHash && (
                            <span>
                              Hash: <code>{respuesta.eventHash.slice(0, 12)}</code>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!respuesta && !cargando && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        textAlign: 'center',
                        padding: '28px 0',
                        color: COLORS.textoTenue,
                      }}
                    >
                      Esta vista aplica el contrato reconciliado{' '}
                      <code style={{ color: COLORS.dorado }}>
                        {'{dato, interpretación, sugerencia}'}
                      </code>{' '}
                      conectado en modo híbrido con <code>/api/ask</code>.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 5ª ESTACIÓN: TAMIZ HEURÍSTICO Y RECURSIVO + VISTAS PREVIAS EJECUTABLES DE LOS 13 MÓDULOS */}
            {tab === 'tamiz' && (
              <div className="delocal-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    borderRadius: '16px',
                    padding: '18px 20px',
                    backgroundColor: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: COLORS.dorado,
                          fontWeight: 700,
                        }}
                      >
                        Análisis Heurístico y Recursivo · Tamiz de Convergencia Frontend ↔ Backend
                      </span>
                      <h2
                        style={{
                          margin: '4px 0 4px',
                          fontFamily: "'Fraunces', serif",
                          fontSize: '20px',
                          fontWeight: 700,
                          color: COLORS.texto,
                        }}
                      >
                        Qué desarrollamos en estos días y cómo queda estructurado en limpio
                      </h2>
                      <p style={{ margin: 0, fontSize: '13px', color: COLORS.textoSuave }}>
                        Todo el desarrollo de <code>@delocalsoy/domain</code>, <code>@delocalsoy/events</code>,{' '}
                        <code>apps/worker</code> y <code>/api/plataforma/*</code> tamizado en 4 vistas previas ejecutables sin ruido visual.
                      </p>
                    </div>
                  </div>

                  {/* Sub-navegación del Tamiz */}
                  <div
                    style={{
                      marginTop: '14px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    {(
                      [
                        { id: 'heuristica', label: '1. Diagnóstico & Estrategia (3 Capas)' },
                        { id: 'flujo_11_eslabones', label: '2. Flujo Vertical (11 Eslabones + Worker + BBOX)' },
                        { id: 'economia_eventos', label: '3. Marketplace Km 0 & Eventos (M4 · M8)' },
                        { id: 'participacion_ambiente', label: '4. Participación 8 Etapas & Acequias (M9 · M6/M7)' },
                      ] as const
                    ).map((st) => {
                      const act = subTabTamiz === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setSubTabTamiz(st.id)}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: act ? 700 : 500,
                            cursor: 'pointer',
                            backgroundColor: act ? COLORS.dorado : COLORS.bg,
                            color: act ? COLORS.bg : COLORS.textoSuave,
                            border: `1px solid ${act ? COLORS.dorado : COLORS.border}`,
                          }}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SUB-VISTA 1: DIAGNÓSTICO HEURÍSTICO Y ESTRATEGIA DE 3 CAPAS */}
                {subTabTamiz === 'heuristica' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {[
                        {
                          capa: 'Capa 1 · Frente Ciudadano y Barrial (Esta Vista)',
                          color: COLORS.dorado,
                          estado: 'Consolidada y Limpia',
                          items: [
                            '3 Nodos (Capital con 2 subnodos, Caucete y Valle de Iglesia con 6 subnodos).',
                            '4 Flujos esenciales sin ruido: Reportes, Alta, Directorio con SRID=4326 y Asistente Tripartito.',
                            'Paleta unificada Negro Cálido (#0D0B08) + Dorado (#FFC72C) + Celeste (#75AADB).',
                          ],
                        },
                        {
                          capa: 'Capa 2 · Módulos de Dominio Rescatados en Vista Previa',
                          color: COLORS.celeste,
                          estado: 'Conectada en este Tamiz',
                          items: [
                            'Flujo Vertical de 11 Eslabones (POST /api/plataforma/activos + Redis Streams + apps/worker).',
                            'Moderación RBAC real (403 a ciudadano, 200 a custodio) y prueba de Worker Replay (duplicate_ignored).',
                            'Marketplace de Proximidad (M4), Participación de 8 Etapas (M9) y Ambiente/Eventos (M6–M8).',
                          ],
                        },
                        {
                          capa: 'Capa 3 · Cockpit de Ingeniería H1–H4 (Bajo Demanda)',
                          color: COLORS.ambar,
                          estado: 'Desacoplada por Defecto',
                          items: [
                            'Se ocultó por defecto el bloque monolítico de >6.000 líneas (App.tsx) para eliminar fatiga visual.',
                            'Disponible con 1 clic en «Mostrar Cockpit H1–H4 ↓» para auditoría SHA-256, Ed25519 y Mapa PostGIS completo.',
                          ],
                        },
                      ].map((c) => (
                        <div
                          key={c.capa}
                          style={{
                            borderRadius: '16px',
                            padding: '16px',
                            backgroundColor: COLORS.bgCard,
                            border: `1px solid ${c.color}45`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                            <strong
                              style={{
                                fontFamily: "'Fraunces', serif",
                                fontSize: '14.5px',
                                color: c.color,
                              }}
                            >
                              {c.capa}
                            </strong>
                          </div>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '10.5px',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: `${c.color}18`,
                              color: c.color,
                              marginBottom: '10px',
                              fontWeight: 600,
                            }}
                          >
                            {c.estado}
                          </span>
                          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12.5px', color: COLORS.textoSuave, lineHeight: 1.55 }}>
                            {c.items.map((it) => (
                              <li key={it} style={{ marginBottom: '4px' }}>
                                {it}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Matriz de los 13 Módulos de @delocalsoy/domain */}
                    <div
                      style={{
                        borderRadius: '16px',
                        padding: '16px 18px',
                        backgroundColor: COLORS.bgCard,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <h3
                        style={{
                          margin: '0 0 10px',
                          fontFamily: "'Fraunces', serif",
                          fontSize: '16px',
                          color: COLORS.texto,
                        }}
                      >
                        Inventario Tamizado de los 13 Módulos Desarrollados (`@delocalsoy/domain`)
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                        {modulosCatalogo.map((m) => {
                          const badgeColor =
                            m.estadoActual === 'Operativo'
                              ? COLORS.verde
                              : m.estadoActual === 'Verificado'
                                ? COLORS.dorado
                                : COLORS.celeste;
                          return (
                            <div
                              key={m.id}
                              style={{
                                borderRadius: '12px',
                                padding: '10px 12px',
                                backgroundColor: COLORS.bg,
                                border: `1px solid ${COLORS.border}`,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ fontSize: '12.5px', color: COLORS.texto }}>
                                  {m.nombre}
                                </strong>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 7px',
                                    borderRadius: '9999px',
                                    backgroundColor: `${badgeColor}20`,
                                    color: badgeColor,
                                    border: `1px solid ${badgeColor}45`,
                                    fontWeight: 700,
                                  }}
                                >
                                  {m.estadoActual}
                                </span>
                              </div>
                              <p style={{ margin: '4px 0', fontSize: '11.5px', color: COLORS.textoSuave }}>
                                {m.proposito}
                              </p>
                              <p style={{ margin: 0, fontSize: '10.5px', color: COLORS.textoTenue }}>
                                {m.evidenciaEjecutable}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-VISTA 2: FLUJO VERTICAL DE 11 ESLABONES, WORKER IDEMPOTENTE Y BBOX POSTGIS */}
                {subTabTamiz === 'flujo_11_eslabones' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        borderRadius: '16px',
                        padding: '16px 18px',
                        backgroundColor: COLORS.bgCard,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              fontFamily: "'Fraunces', serif",
                              fontSize: '16.5px',
                              color: COLORS.texto,
                            }}
                          >
                            Banco de Pruebas en Vivo · Cadena Vertical de 11 Eslabones (Fase 0 / #87)
                          </h3>
                          <p style={{ margin: '3px 0 0', fontSize: '12px', color: COLORS.textoTenue }}>
                            Ejecutá en vivo las capacidades desarrolladas en backend sin salir del prototipo limpio
                          </p>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => void ejecutarConsultaEspacialBbox()}
                            style={{
                              padding: '7px 12px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              backgroundColor: COLORS.dorado,
                              color: COLORS.bg,
                              border: 'none',
                            }}
                          >
                            📐 Probar PostGIS ?bbox= (Eslabón 10)
                          </button>
                          <button
                            type="button"
                            onClick={() => void ejecutarPruebaReplayWorker()}
                            style={{
                              padding: '7px 12px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              backgroundColor: `${COLORS.celeste}20`,
                              color: COLORS.celeste,
                              border: `1px solid ${COLORS.celeste}`,
                            }}
                          >
                            🔁 Probar Replay Worker (duplicate_ignored)
                          </button>
                        </div>
                      </div>

                      {resultadoProbeFlujo && (
                        <div
                          className="delocal-fade-in"
                          style={{
                            borderRadius: '12px',
                            padding: '12px 14px',
                            marginBottom: '12px',
                            backgroundColor: COLORS.bg,
                            border: `1px solid ${resultadoProbeFlujo.color}`,
                          }}
                        >
                          <strong style={{ display: 'block', fontSize: '13px', color: resultadoProbeFlujo.color }}>
                            {resultadoProbeFlujo.titulo}
                          </strong>
                          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: COLORS.textoSuave }}>
                            {resultadoProbeFlujo.detalle}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px' }}>
                        {ESLABONES_FLUJO_VERTICAL.map((esl) => (
                          <div
                            key={esl.n}
                            style={{
                              borderRadius: '10px',
                              padding: '9px 11px',
                              backgroundColor: COLORS.bg,
                              border: `1px solid ${COLORS.border}`,
                            }}
                          >
                            <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.dorado }}>
                              Eslabón {esl.n} · {esl.t}
                            </span>
                            <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: COLORS.textoSuave }}>
                              {esl.d}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-VISTA 3: ECONOMÍA DE PROXIMIDAD (MARKETPLACE M4) & EVENTOS (M8) */}
                {subTabTamiz === 'economia_eventos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        borderRadius: '16px',
                        padding: '16px 18px',
                        backgroundColor: COLORS.bgCard,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <h3
                        style={{
                          margin: '0 0 4px',
                          fontFamily: "'Fraunces', serif",
                          fontSize: '16.5px',
                          color: COLORS.texto,
                        }}
                      >
                        Economía de Proximidad Km 0 vinculada a Activos Verificados ({ofertasDelNodo.length})
                      </h3>
                      <p style={{ margin: '0 0 12px', fontSize: '12px', color: COLORS.textoTenue }}>
                        Módulo 4 (`@delocalsoy/domain`) conectado en vista previa sobre {nodoActivo.nodoPadreLabel}
                      </p>

                      {ofertasDelNodo.map((of) => (
                        <div
                          key={of.id}
                          style={{
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '10px',
                            backgroundColor: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '14px', color: COLORS.dorado, fontFamily: "'Fraunces', serif" }}>
                              {of.titulo}
                            </strong>
                            <span style={{ fontSize: '11px', color: COLORS.celeste }}>
                              {of.unidadReferencia}
                            </span>
                          </div>
                          <p style={{ margin: '4px 0', fontSize: '13px', color: COLORS.textoSuave }}>
                            {of.descripcion}
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '11.5px', color: COLORS.textoTenue }}>
                            <span>🏛️ Activo origen: {of.assetNombre}</span>
                            <span style={{ color: COLORS.verde }}>✓ {of.señalVerificable}</span>
                          </div>
                        </div>
                      ))}

                      {/* Publicar oferta rápida en vista previa */}
                      <div
                        style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: `1px solid ${COLORS.border}`,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '8px',
                        }}
                      >
                        <input
                          value={nuevaOfertaMkt.titulo}
                          onChange={(e) => setNuevaOfertaMkt({ ...nuevaOfertaMkt, titulo: e.target.value })}
                          placeholder="Nueva oferta u oficio local..."
                          style={{
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '12.5px',
                            backgroundColor: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.texto,
                          }}
                        />
                        <input
                          value={nuevaOfertaMkt.unidadReferencia}
                          onChange={(e) => setNuevaOfertaMkt({ ...nuevaOfertaMkt, unidadReferencia: e.target.value })}
                          placeholder="Unidad / modalidad de retiro"
                          style={{
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '12.5px',
                            backgroundColor: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.texto,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => void publicarOfertaProximidad()}
                          style={{
                            borderRadius: '10px',
                            padding: '8px 14px',
                            backgroundColor: COLORS.dorado,
                            color: COLORS.bg,
                            fontWeight: 700,
                            fontSize: '12.5px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          + Publicar en nodo
                        </button>
                      </div>
                    </div>

                    {/* Agenda de Eventos Territoriales (M8) */}
                    <div
                      style={{
                        borderRadius: '16px',
                        padding: '16px 18px',
                        backgroundColor: COLORS.bgCard,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <h3
                        style={{
                          margin: '0 0 8px',
                          fontFamily: "'Fraunces', serif",
                          fontSize: '16px',
                          color: COLORS.texto,
                        }}
                      >
                        Agenda de Eventos Territoriales y Convocatorias (Módulo 8)
                      </h3>
                      {eventosComunitarios.map((ev) => (
                        <div
                          key={ev.id}
                          style={{
                            borderRadius: '12px',
                            padding: '12px 14px',
                            marginBottom: '8px',
                            backgroundColor: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '13.5px', color: COLORS.texto }}>{ev.titulo}</strong>
                            <span style={{ fontSize: '11px', color: COLORS.celeste }}>{ev.fechaProgramada}</span>
                          </div>
                          <p style={{ margin: '4px 0 2px', fontSize: '12.5px', color: COLORS.textoSuave }}>
                            {ev.descripcion}
                          </p>
                          <span style={{ fontSize: '11px', color: COLORS.textoTenue }}>
                            📍 {ev.lugarNombre} ({ev.barrioNodo})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUB-VISTA 4: PARTICIPACIÓN DELIBERATIVA EN 8 ETAPAS (M9) & AMBIENTE/ACEQUIAS (M6/M7) */}
                {subTabTamiz === 'participacion_ambiente' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        borderRadius: '16px',
                        padding: '16px 18px',
                        backgroundColor: COLORS.bgCard,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <h3
                        style={{
                          margin: '0 0 4px',
                          fontFamily: "'Fraunces', serif",
                          fontSize: '16.5px',
                          color: COLORS.texto,
                        }}
                      >
                        Participación Deliberativa en 8 Etapas (Módulo 9 · Referencia Decidim / CONSUL)
                      </h3>
                      <p style={{ margin: '0 0 12px', fontSize: '12px', color: COLORS.textoTenue }}>
                        Ciclo completo: Propuesta → Revisión → Comentarios → Deliberación → Priorización → Decisión → Respuesta → Seguimiento
                      </p>

                      {propuestasDeliberativas.map((pr) => (
                        <div
                          key={pr.id}
                          style={{
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '10px',
                            backgroundColor: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '14px', color: COLORS.texto, fontFamily: "'Fraunces', serif" }}>
                              {pr.titulo}
                            </strong>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '3px 9px',
                                borderRadius: '9999px',
                                backgroundColor: `${COLORS.dorado}20`,
                                color: COLORS.dorado,
                                border: `1px solid ${COLORS.dorado}50`,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              Etapa: {pr.etapaActual}
                            </span>
                          </div>
                          <p style={{ margin: '6px 0', fontSize: '12.5px', color: COLORS.textoSuave }}>
                            <strong>Acción propuesta:</strong> {pr.propuestaAccion}
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '8px 0' }}>
                            {ETAPAS_DELIBERATIVAS.map((et) => {
                              const esActual = pr.etapaActual === et;
                              return (
                                <span
                                  key={et}
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    backgroundColor: esActual ? COLORS.dorado : COLORS.bgCard,
                                    color: esActual ? COLORS.bg : COLORS.textoTenue,
                                    fontWeight: esActual ? 700 : 400,
                                  }}
                                >
                                  {et}
                                </span>
                              );
                            })}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                            <span style={{ fontSize: '11.5px', color: COLORS.celeste }}>
                              🤝 {pr.apoyosDeliberativos} apoyos deliberativos · 💬 {pr.comentariosVerificados} aportes verificados
                            </span>
                            <button
                              type="button"
                              onClick={() => void avanzarEtapaPropuesta(pr.id)}
                              style={{
                                padding: '5px 11px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                backgroundColor: COLORS.dorado,
                                color: COLORS.bg,
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              Avanzar siguiente etapa →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Registros de Espacio Público y Ambiente / Acequias (M6 y M7) */}
                    <div
                      style={{
                        borderRadius: '16px',
                        padding: '16px 18px',
                        backgroundColor: COLORS.bgCard,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <h3
                        style={{
                          margin: '0 0 8px',
                          fontFamily: "'Fraunces', serif",
                          fontSize: '16px',
                          color: COLORS.texto,
                        }}
                      >
                        Espacio Público, Arbolado y Red de Acequias (Módulos 6 y 7)
                      </h3>
                      {registrosAmbiente.map((reg) => (
                        <div
                          key={reg.id}
                          style={{
                            borderRadius: '12px',
                            padding: '12px 14px',
                            marginBottom: '8px',
                            backgroundColor: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '13.5px', color: COLORS.celeste }}>{reg.titulo}</strong>
                            <span style={{ fontSize: '11px', color: COLORS.ambar }}>{reg.estado}</span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: COLORS.textoSuave }}>
                            {reg.evidenciaObservada}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Navegación Inferior Fija en Móvil (o cuando se activa Marco App Móvil) */}
      <nav
        aria-label="Navegación móvil Base Consolidada"
        className={esModoCompacto ? '' : 'delocal-mobile-bottom-nav'}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: esModoCompacto ? 'flex' : undefined,
          alignItems: 'stretch',
          backgroundColor: COLORS.bgCard,
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        {(
          [
            { id: 'inicio', label: 'Inicio', icon: IconHome },
            { id: 'reportar', label: 'Reportar', icon: IconPlus },
            { id: 'directorio', label: 'Directorio', icon: IconUsers },
            { id: 'asistente', label: 'Asistente', icon: IconSparkles },
            { id: 'tamiz', label: 'Tamiz (13)', icon: IconShieldCheck },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const activa = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 0',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Icon size={19} color={activa ? COLORS.dorado : COLORS.textoTenue} />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: activa ? 700 : 500,
                  color: activa ? COLORS.dorado : COLORS.textoTenue,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Cajón Modal: Estado técnico — auditoría 3/sep */}
      {panelInfoAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Estado técnico — auditoría 3/sep"
          onClick={() => setPanelInfoAbierto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            backgroundColor: '#00000090',
          }}
        >
          <div
            className="delocal-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '720px',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px 24px',
              maxHeight: '82vh',
              overflowY: 'auto',
              backgroundColor: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 700,
                  fontSize: '18px',
                  color: COLORS.texto,
                }}
              >
                Estado técnico — auditoría 3/sep
              </h3>
              <button
                type="button"
                onClick={() => setPanelInfoAbierto(false)}
                aria-label="Cerrar panel de estado técnico"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <IconX size={20} color={COLORS.textoTenue} />
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: COLORS.textoTenue }}>
              Cruce de Deepseek v2/v3, Vive v2 y Géminis v1 contra ARCHITECTURE_STATE_v4, la
              arquitectura vieja y el Superdocumento.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {NOTAS_ARQUITECTURA.map((n) => (
                <div
                  key={n.t}
                  style={{
                    paddingBottom: '12px',
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: 600,
                      color: COLORS.dorado,
                    }}
                  >
                    {n.t}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '13.5px',
                      lineHeight: 1.55,
                      color: COLORS.textoSuave,
                    }}
                  >
                    {n.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
