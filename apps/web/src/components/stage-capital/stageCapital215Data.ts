/**
 * apps/web/src/components/stage-capital/stageCapital215Data.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Dataset Canónico Stage Capital #215
 * Comercios de Proximidad × Espacios Públicos en los 4 Subnodos de Capital
 * SRID=4326 · ADR-034 / NCAP-R2
 * -----------------------------------------------------------------------------
 * Corrección Epistémica: Las plazas del microcentro cuentan solo con respaldo de
 * fuentes secundarias, por lo que su estado honesto obligatorio es PENDIENTE (◐).
 */

export interface ComercioBarrial {
  id: string;
  nombre: string;
  subnodoId: 'capital-centro-historico' | 'capital-desamparados' | 'capital-concepcion' | 'capital-trinidad';
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
  subnodoId: 'capital-centro-historico' | 'capital-desamparados' | 'capital-concepcion' | 'capital-trinidad';
  tipo: 'Plaza Central' | 'Parque Urbano' | 'Paseo Peatonal' | 'Espacio Cívico';
  lat: number;
  lng: number;
  superficieM2: number;
  equipamiento: string[];
  comerciosArticuladosCount: number;
  estadoHonesto: 'validado' | 'sintetico' | 'comunitario' | 'pendiente';
  notaEpistemica?: string;
}

export const ESPACIOS_PUBLICOS_CAPITAL: EspacioPublicoCapital[] = [
  {
    id: 'esp-plaza-25-de-mayo',
    nombre: 'Plaza 25 de Mayo (Centro Cívico)',
    subnodoId: 'capital-centro-historico',
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
    subnodoId: 'capital-centro-historico',
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
    subnodoId: 'capital-desamparados',
    tipo: 'Parque Urbano',
    lat: -31.5284,
    lng: -68.5489,
    superficieM2: 120000,
    equipamiento: ['Lago Artificial con Peces', 'Pista de Atletismo', 'Monumento al Gral. San Martín', 'Feria de Artesanos'],
    comerciosArticuladosCount: 32,
    estadoHonesto: 'validado',
    notaEpistemica: 'Relevo catastral oficial y auditoría presencial T1 verificada.'
  },
  {
    id: 'esp-plaza-concepcion',
    nombre: 'Plaza de Concepción (Pueblo Viejo)',
    subnodoId: 'capital-concepcion',
    tipo: 'Plaza Central',
    lat: -31.5168,
    lng: -68.5310,
    superficieM2: 11000,
    equipamiento: ['Santuario Nuestra Señora de la Inmaculada Concepción', 'Juegos Infantiles Inclusivos', 'Monumento a los Fundadores'],
    comerciosArticuladosCount: 18,
    estadoHonesto: 'comunitario',
    notaEpistemica: 'Aporte territorial de asamblea barrial de Concepción.'
  },
  {
    id: 'esp-paseo-ferroviario-trinidad',
    nombre: 'Paseo Ferroviario Sur & Plaza Trinidad',
    subnodoId: 'capital-trinidad',
    tipo: 'Espacio Cívico',
    lat: -31.5560,
    lng: -68.5280,
    superficieM2: 18500,
    equipamiento: ['Antigua Vía Ferrocaril San Martín', 'Paseo Saludable', 'Iluminación Solar LED', 'Cancha Barrial'],
    comerciosArticuladosCount: 22,
    estadoHonesto: 'validado',
    notaEpistemica: 'Plan de recuperación urbana municipal auditado.'
  }
];

export const COMERCIOS_CAPITAL_215: ComercioBarrial[] = [
  {
    id: 'com-01',
    nombre: 'Despensa & Semitería San Martín',
    subnodoId: 'capital-centro-historico',
    subnodoNombre: 'Centro Histórico',
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
    subnodoId: 'capital-centro-historico',
    subnodoNombre: 'Centro Histórico',
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
    subnodoId: 'capital-desamparados',
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
    id: 'com-04',
    nombre: 'Almacén de Barrio El Parral',
    subnodoId: 'capital-concepcion',
    subnodoNombre: 'Concepción',
    categoria: 'Almacén de Proximidad',
    direccion: 'Calle Tucumán 1280 Norte',
    lat: -31.5175,
    lng: -68.5305,
    espacioPublicoCercano: 'Plaza de Concepción',
    distanciaMetrosAEspacio: 80,
    especialidad: 'Aceitunas changlot en salmuera y aceite de oliva virgen extra de Pocito',
    estadoHonesto: 'comunitario'
  },
  {
    id: 'com-05',
    nombre: 'Taller de Oficios & Herrería Trinidad',
    subnodoId: 'capital-trinidad',
    subnodoNombre: 'Trinidad',
    categoria: 'Oficios & Herrería Artesanal',
    direccion: 'Calle General Acha 1940 Sur',
    lat: -31.5570,
    lng: -68.5275,
    espacioPublicoCercano: 'Paseo Ferroviario Sur & Plaza Trinidad',
    distanciaMetrosAEspacio: 150,
    especialidad: 'Parrillas sanjuaninas forjadas a medida y reparación de herramientas rurales',
    estadoHonesto: 'validado'
  },
  {
    id: 'com-06',
    nombre: 'Cooperativa Universitaria de Frutas & Verduras',
    subnodoId: 'capital-desamparados',
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
