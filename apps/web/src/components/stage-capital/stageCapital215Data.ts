/**
 * apps/web/src/components/stage-capital/stageCapital215Data.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Dataset Canónico Stage Capital #215
 * Comercios de Proximidad × Espacios Públicos en los 2 subnodos ratificados
 * del nodo Capital (PEC 2025 · #154) · SRID=4326 · ADR-034 / NCAP-R2
 * -----------------------------------------------------------------------------
 * Corrección Epistémica: Las plazas del microcentro cuentan solo con respaldo de
 * fuentes secundarias, por lo que su estado honesto obligatorio es PENDIENTE (◐).
 *
 * ─── ETIQUETA R15 · SINTÉTICO/ILUSTRATIVO (decisión DH 2026-11-03) ───
 * Dataset de STAGE (diseño, no producción): comercios, espacios públicos,
 * distancias y coordenadas de este archivo son ILUSTRATIVOS para el
 * prototipo del nodo Capital. La fuente de dato real es la API; nada
 * de este dataset se persiste ni se publica.
 *
 * ─── MONTAR-2 (#445, 2026-11-08): armonización al vocabulario ratificado ───
 * El stage filtra SOLO por los subnodos ratificados del nodo Capital (#154,
 * PEC 2025): sj_capital_centro + sj_capital_desamparados. Los fixtures anclados
 * a subnodos fuera del vocabulario ratificado (Concepción, Trinidad) salieron
 * del dataset ilustrativo. El stage sigue siendo [STAGE · ILUSTRATIVO R15].
 */

export interface ComercioBarrial {
  id: string;
  nombre: string;
  subnodoId: 'sj_capital_centro' | 'sj_capital_desamparados';
  subnodoNombre: string;
  categoria: string;
  direccion: string;
  lat: number;
  lng: number;
  espacioPublicoCercano: string;
  distanciaMetrosAEspacio: number;
  especialidad: string;
  estadoHonesto: 'validado' | 'sintetico' | 'comunitario' | 'pendiente';
}

export interface EspacioPublicoCapital {
  id: string;
  nombre: string;
  subnodoId: 'sj_capital_centro' | 'sj_capital_desamparados';
  tipo: 'Plaza Central' | 'Parque Urbano' | 'Paseo Peatonal' | 'Espacio Cívico';
  lat: number;
  lng: number;
  superficieM2: number;
  equipamiento: string[];
  comerciosArticuladosCount: number;
  estadoHonesto: 'validado' | 'sintetico' | 'comunitario' | 'pendiente';
  notaEpistemica?: string;
}

/**
 * MONTAR-2 (#445): filtro del stage armonizado al vocabulario ratificado del
 * nodo Capital (#154, PEC 2025) — el stage ya no declara subnodos propios.
 */
export const SUBNODOS_CAPITAL_STAGE = [
  { id: 'todos', label: 'Todos los Subnodos' },
  { id: 'sj_capital_centro', label: 'Centro' },
  { id: 'sj_capital_desamparados', label: 'Desamparados' }
] as const;

export const ESPACIOS_PUBLICOS_CAPITAL: EspacioPublicoCapital[] = [
  {
    id: 'esp-plaza-25-de-mayo',
    nombre: 'Plaza 25 de Mayo (Centro Cívico)',
    subnodoId: 'sj_capital_centro',
    tipo: 'Plaza Central',
    lat: -31.5375,
    lng: -68.5252,
    superficieM2: 14200,
    equipamiento: ['Fuente de Aguas Danzantes', 'Wifi Público San Juan', 'Arboleda Histórica (Plátanos)', 'Puestos de Libros'],
    comerciosArticuladosCount: 24,
    estadoHonesto: 'pendiente', // ◐ OBLIGATORIO: Fuentes secundarias
    notaEpistemica: 'Estado honesto ◐ obligatorio por ADR-034: relevo sustentado en cartografía secundaria sin auditoría presencial T1 directa.'
  },
  {
    id: 'esp-peatonal-tucuman',
    nombre: 'Paseo Peatonal Tucumán & Rivadavia',
    subnodoId: 'sj_capital_centro',
    tipo: 'Paseo Peatonal',
    lat: -31.5360,
    lng: -68.5240,
    superficieM2: 8500,
    equipamiento: ['Bancos Cívicos', 'Farolas Coloniales', 'Cámaras de Seguridad', 'Puntos Limpios'],
    comerciosArticuladosCount: 48,
    estadoHonesto: 'pendiente', // ◐ OBLIGATORIO: Fuentes secundarias
    notaEpistemica: 'Estado honesto ◐: en proceso de validación con comerciantes frentistas.'
  },
  {
    id: 'esp-parque-de-mayo',
    nombre: 'Parque de Mayo (Eje Universitario)',
    subnodoId: 'sj_capital_desamparados',
    tipo: 'Parque Urbano',
    lat: -31.5284,
    lng: -68.5489,
    superficieM2: 120000,
    equipamiento: ['Lago Artificial con Peces', 'Pista de Atletismo', 'Monumento al Gral. San Martín', 'Feria de Artesanos'],
    comerciosArticuladosCount: 32,
    estadoHonesto: 'validado',
    notaEpistemica: 'Relevo catastral oficial y auditoría presencial T1 verificada.'
  }
];

export const COMERCIOS_CAPITAL_215: ComercioBarrial[] = [
  {
    id: 'com-01',
    nombre: 'Despensa & Semitería San Martín',
    subnodoId: 'sj_capital_centro',
    subnodoNombre: 'Centro',
    categoria: 'Panadería & Semitas Sanjuaninas',
    direccion: 'Calle Laprida 142 Este',
    lat: -31.5368,
    lng: -68.5245,
    espacioPublicoCercano: 'Plaza 25 de Mayo',
    distanciaMetrosAEspacio: 95,
    especialidad: 'Semitas con chicharrones caseras y pan criollo en horno de barro',
    estadoHonesto: 'validado'
  },
  {
    id: 'com-02',
    nombre: 'Café & Libros del Eje Cívico',
    subnodoId: 'sj_capital_centro',
    subnodoNombre: 'Centro',
    categoria: 'Café & Librería Barrial',
    direccion: 'Calle Rivadavia 285 Este',
    lat: -31.5372,
    lng: -68.5230,
    espacioPublicoCercano: 'Paseo Peatonal Tucumán & Rivadavia',
    distanciaMetrosAEspacio: 40,
    especialidad: 'Café de especialidad y literatura regional cuyana',
    estadoHonesto: 'validado'
  },
  {
    id: 'com-03',
    nombre: 'Rotisería Las Heras (Empanadas Sanjuaninas)',
    subnodoId: 'sj_capital_desamparados',
    subnodoNombre: 'Desamparados',
    categoria: 'Gastronomía Popular',
    direccion: 'Avenida Libertador Gral. San Martín 1420 Oeste',
    lat: -31.5292,
    lng: -68.5475,
    espacioPublicoCercano: 'Parque de Mayo',
    distanciaMetrosAEspacio: 120,
    especialidad: 'Empanadas sanjuaninas de carne cortada a cuchillo con cebolla de verdeo',
    estadoHonesto: 'validado'
  },
  {
    id: 'com-06',
    nombre: 'Cooperativa Universitaria de Frutas & Verduras',
    subnodoId: 'sj_capital_desamparados',
    subnodoNombre: 'Desamparados',
    categoria: 'Verdulería Comunitaria Agroecológica',
    direccion: 'Calle Urquiza 380 Norte',
    lat: -31.5270,
    lng: -68.5495,
    espacioPublicoCercano: 'Parque de Mayo',
    distanciaMetrosAEspacio: 180,
    especialidad: 'Tomates secos, cebollas jachalleras y verduras frescas de Médano de Oro',
    estadoHonesto: 'comunitario'
  }
];
