/**
 * apps/web/src/components/stage-vig/valleDeIglesiaData.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Vocabulario y Distritos Canónicos Ratificados Valle de Iglesia
 * Conforme: VIG-R1-VOCABULARIO · ADR-021 · SRID=4326
 * -----------------------------------------------------------------------------
 * Distritos Ratificados: Rodeo (inc. Colola), Villa Iglesia, Angualasto (Protegido),
 * Las Flores, Tudcum, Bella Vista. Pismanta clasificada como Localidad Termal.
 *
 * ─── ETIQUETA R15 · SINTÉTICO/ILUSTRATIVO (decisión DH 2026-11-03) ───
 * Dataset de STAGE (diseño, no producción): coordenadas, altitudes,
 * poblaciones, vocaciones y estados honestos de este archivo son
 * ILUSTRATIVOS para el prototipo del nodo. El seed ratificado VIG-001
 * tiene lat/lng NULL (R15); la fuente de dato real es la API.
 * Angualasto es RESERVADO_SENSIBLE: solo acredita su punto aproximado
 * y público, nunca geometría de custodia.
 */

export interface DistritoVIG {
  id: string;
  nombre: string;
  tipoEntidad: 'Distrito Departamental' | 'Distrito Patrimonial Protegido' | 'Localidad Termal';
  altitudMsnm: number;
  lat: number;
  lng: number;
  vocacionPrincipal: string;
  cuencaHidrica: string;
  poblacionEstimada: number;
  estadoHonesto: 'validado' | 'sintetico' | 'comunitario' | 'pendiente';
  recursosClave: string[];
  notasTerritoriales?: string;
}

export const DISTRITOS_RATIFICADOS_IGLESIA: DistritoVIG[] = [
  {
    id: 'vig-distrito-rodeo',
    nombre: 'Rodeo (Cabecera Departamental)',
    tipoEntidad: 'Distrito Departamental',
    altitudMsnm: 1610,
    lat: -30.2133,
    lng: -69.1308,
    vocacionPrincipal: 'Centro administrativo, cívico, embalse Cuesta del Viento e integración con Colola',
    cuencaHidrica: 'Cuenca Río Jáchal / Dique Cuesta del Viento',
    poblacionEstimada: 3950,
    estadoHonesto: 'validado',
    recursosClave: ['Embalse Cuesta del Viento', 'Componente Colola', 'Centro Cívico Rodeo', 'Cooperativa Eléctrica'],
    notasTerritoriales: 'Colola se reconoce formalmente como componente territorial de la localidad Rodeo, no como subnodo aislado.'
  },
  {
    id: 'vig-distrito-villa-iglesia',
    nombre: 'Villa Iglesia (Cabecera Histórica)',
    tipoEntidad: 'Distrito Departamental',
    altitudMsnm: 1780,
    lat: -30.3800,
    lng: -69.2000,
    vocacionPrincipal: 'Sede histórica originaria, arquitectura colonial andina, capilla histórica y agricultura tradicional',
    cuencaHidrica: 'Cuenca Media Río Blanco',
    poblacionEstimada: 1450,
    estadoHonesto: 'validado',
    recursosClave: ['Capilla Histórica Nuestra Señora de la Candelaria', 'Acequias Tradicionales', 'Comunidad Rural'],
    notasTerritoriales: 'Distrito ratificado canónico. Raíz histórica de la toponimia departamental.'
  },
  {
    id: 'vig-distrito-angualasto',
    nombre: 'Angualasto (Distrito Patrimonial Protegido)',
    tipoEntidad: 'Distrito Patrimonial Protegido',
    altitudMsnm: 1680,
    lat: -30.0500,
    lng: -69.1800,
    vocacionPrincipal: 'Pucará prehispánico de Angualasto, sitio arqueológico protegido, tramo Qhapaq Ñan y nogales centenarios',
    cuencaHidrica: 'Cuenca Alta Río Blanco Norte',
    poblacionEstimada: 580,
    estadoHonesto: 'validado',
    recursosClave: ['Pucará de Angualasto (Patrimonio Protegido)', 'Vestigios Qhapaq Ñan', 'Nogales de Cosecha Familiar'],
    notasTerritoriales: 'Distrito de máxima protección arqueológica y resguardo epistémico.'
  },
  {
    id: 'vig-distrito-las-flores',
    nombre: 'Las Flores',
    tipoEntidad: 'Distrito Departamental',
    altitudMsnm: 1750,
    lat: -30.2986,
    lng: -69.2155,
    vocacionPrincipal: 'Corredor Bioceánico RN 150, aduana hacia el Paso de Agua Negra, aromáticas y semillas',
    cuencaHidrica: 'Cuenca Río Blanco / Arroyo Las Flores',
    poblacionEstimada: 1850,
    estadoHonesto: 'validado',
    recursosClave: ['Acceso Paso de Agua Negra (RN 150)', 'Semillas Certificadas de Alfalfa', 'Aromáticas de Altura']
  },
  {
    id: 'vig-distrito-tudcum',
    nombre: 'Tudcum',
    tipoEntidad: 'Distrito Departamental',
    altitudMsnm: 1700,
    lat: -30.1780,
    lng: -69.2550,
    vocacionPrincipal: 'Molinos harineros hidráulicos, dulce tradicional de membrillo rubio y huertas familiares agroecológicas',
    cuencaHidrica: 'Vertientes Cordilleranas Tudcum',
    poblacionEstimada: 980,
    estadoHonesto: 'comunitario',
    recursosClave: ['Molinos Hidráulicos Históricos', 'Dulce de Membrillo Rubio', 'Huertas Agroecológicas Familiares']
  },
  {
    id: 'vig-distrito-bella-vista',
    nombre: 'Bella Vista',
    tipoEntidad: 'Distrito Departamental',
    altitudMsnm: 1910,
    lat: -30.3450,
    lng: -69.2700,
    vocacionPrincipal: 'Quebradas andinas, ganadería caprina transhumante de altura y producción artesanal de quesos',
    cuencaHidrica: 'Cuenca Alta Arroyo Chita',
    poblacionEstimada: 430,
    estadoHonesto: 'comunitario',
    recursosClave: ['Quesos de Cabra Artesanales', 'Vegas Cordilleranas', 'Tejidos en Telar Criollo']
  },
  {
    id: 'vig-localidad-pismanta',
    nombre: 'Pismanta (Localidad Termal)',
    tipoEntidad: 'Localidad Termal',
    altitudMsnm: 1820,
    lat: -30.3120,
    lng: -69.2480,
    vocacionPrincipal: 'Aguas mesotermales curativas surgentes a 42-45°C, balneoterapia y turismo de salud',
    cuencaHidrica: 'Acuífero Termal Pismanta',
    poblacionEstimada: 620,
    estadoHonesto: 'validado',
    recursosClave: ['Vertientes Mesotermales 42°C', 'Centro de Salud Comunitario', 'Hostelería Histórica Termal'],
    notasTerritoriales: 'Localidad turística y centro termal dependiente de la circunscripción departamental.'
  }
];

export interface IndicadorHidricoVIG {
  origen: string;
  caudalM3s: number;
  temperaturaC: number;
  conductividadUsCm: number;
  calidadUso: 'Riego agrícola' | 'Consumo humano tratado' | 'Termalismo mineromedicinal';
  estadoHonesto: 'validado' | 'sintetico' | 'comunitario' | 'pendiente';
}

export const INDICADORES_HIDRICOS_VIG: IndicadorHidricoVIG[] = [
  {
    origen: 'Río Blanco en Estación Las Flores',
    caudalM3s: 4.8,
    temperaturaC: 9.5,
    conductividadUsCm: 480,
    calidadUso: 'Riego agrícola',
    estadoHonesto: 'validado'
  },
  {
    origen: 'Vertientes Termales Pismanta Manantial 1',
    caudalM3s: 0.12,
    temperaturaC: 43.2,
    conductividadUsCm: 1420,
    calidadUso: 'Termalismo mineromedicinal',
    estadoHonesto: 'validado'
  },
  {
    origen: 'Arroyo Chita (Afluente Bella Vista)',
    caudalM3s: 0.85,
    temperaturaC: 11.0,
    conductividadUsCm: 320,
    calidadUso: 'Riego agrícola',
    estadoHonesto: 'comunitario'
  },
  {
    origen: 'Embalse Cuesta del Viento (Cota Operativa)',
    caudalM3s: 18.2,
    temperaturaC: 14.8,
    conductividadUsCm: 560,
    calidadUso: 'Consumo humano tratado',
    estadoHonesto: 'validado'
  }
];

export const CALENDARIO_AGROECOLOGICO_VIG = [
  { epoca: 'Enero — Febrero', actividad: 'Cosecha de aromáticas de altura (orégano, tomillo) y damascos en Tudcum y Rodeo' },
  { epoca: 'Marzo — Abril', actividad: 'Elaboración tradicional de dulce de membrillo rubio y secado solar de tomates' },
  { epoca: 'Mayo — Junio', actividad: 'Poda de nogales centenarios en Angualasto y protección contra heladas cordilleranas' },
  { epoca: 'Julio — Agosto', actividad: 'Mantenimiento de acequias comunales y tomas de agua con juntas de regantes' },
  { epoca: 'Septiembre — Octubre', actividad: 'Siembra de ajo blanco y cebolla andina en parcelas irrigadas de Las Flores' },
  { epoca: 'Noviembre — Diciembre', actividad: 'Inicio de la temporada de vientos térmicos en el dique Cuesta del Viento' }
];
