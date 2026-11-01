/**
 * Fichas ilustrativas del demo TV - UX-004 (#228).
 *
 * R15 (nada se simula): el dato es 100% sintetico (isSynthetic: true), sin
 * PII (ADR-027) y con estados honestos del vocabulario del repositorio.
 * Este modulo NO alimenta la app: solo el prototipo de laboratorio.
 */
export type EstadoHonesto = 'verified' | 'community_validated' | 'pending';
export type NodoDemo = 'capital' | 'caucete' | 'iglesia';
export type CategoriaFicha = 'patrimonio' | 'produccion' | 'servicio';

export interface FichaIlustrativa {
  id: string;
  titulo: string;
  nodo: NodoDemo;
  categoria: CategoriaFicha;
  detalle: string;
  estado: EstadoHonesto;
  fuente: string;
  isSynthetic: true;
}

export const FICHAS_DEMO: FichaIlustrativa[] = [
  {
    id: 'demo-tv-001',
    titulo: 'Capilla historica con visitas guiadas',
    nodo: 'iglesia',
    categoria: 'patrimonio',
    detalle: 'Ficha patrimonial del Valle de Iglesia. Demo de legibilidad 10-foot para titulo largo de dos lineas.',
    estado: 'verified',
    fuente: 'Ilustrativa - demo TV',
    isSynthetic: true,
  },
  {
    id: 'demo-tv-002',
    titulo: 'Finca olivicola familiar - produccion activa',
    nodo: 'iglesia',
    categoria: 'produccion',
    detalle: 'Ficha productiva ilustrativa. Valida jerarquia visual y contraste del estado honesto en ficha 10-foot.',
    estado: 'community_validated',
    fuente: 'Ilustrativa - demo TV',
    isSynthetic: true,
  },
  {
    id: 'demo-tv-003',
    titulo: 'Camino rural con erosion hidrica',
    nodo: 'iglesia',
    categoria: 'servicio',
    detalle: 'Ficha de servicio territorial ilustrativa. Valida navegacion espacial vertical entre filas.',
    estado: 'pending',
    fuente: 'Ilustrativa - demo TV',
    isSynthetic: true,
  },
  {
    id: 'demo-tv-004',
    titulo: 'Escuela primaria con matricula estable',
    nodo: 'caucete',
    categoria: 'servicio',
    detalle: 'Ficha de educacion ilustrativa. Valida reconocimiento de categoria a distancia.',
    estado: 'verified',
    fuente: 'Ilustrativa - demo TV',
    isSynthetic: true,
  },
  {
    id: 'demo-tv-005',
    titulo: 'Biblioteca popular municipal',
    nodo: 'caucete',
    categoria: 'patrimonio',
    detalle: 'Ficha comunitaria ilustrativa. Valida foco visible sobre fondo oscuro.',
    estado: 'community_validated',
    fuente: 'Ilustrativa - demo TV',
    isSynthetic: true,
  },
  {
    id: 'demo-tv-006',
    titulo: 'Punto de resiliencia aluvional',
    nodo: 'caucete',
    categoria: 'servicio',
    detalle: 'Ficha de resiliencia ilustrativa. Valida estado pendiente sin tono alarmista.',
    estado: 'pending',
    fuente: 'Ilustrativa - demo TV',
    isSynthetic: true,
  },
  {
    id: 'demo-tv-007',
    titulo: 'Plaza 25 de Mayo - mobiliario en buen estado',
    nodo: 'capital',
    categoria: 'patrimonio',
    detalle: 'Ficha de espacio publico ilustrativa. Valida movimiento D-pad izquierda/derecha en fila.',
    estado: 'verified',
    fuente: 'Ilustrativa - demo TV',
    isSynthetic: true,
  },
  {
    id: 'demo-tv-008',
    titulo: 'Galeria comercial centrica',
    nodo: 'capital',
    categoria: 'produccion',
    detalle: 'Ficha comercial ilustrativa. Valida detalle expandible y retorno con Back/Escape.',
    estado: 'community_validated',
    fuente: 'Ilustrativa - demo TV',
    isSynthetic: true,
  },
  {
    id: 'demo-tv-009',
    titulo: 'Acequia historica de riego urbano',
    nodo: 'capital',
    categoria: 'patrimonio',
    detalle: 'Ficha patrimonial hidrica ilustrativa. Valida leyenda de estados honestos en el pie.',
    estado: 'pending',
    fuente: 'Ilustrativa - demo TV',
    isSynthetic: true,
  },
];

export const ETIQUETA_ESTADO: Record<EstadoHonesto, string> = {
  verified: 'Verificado',
  community_validated: 'Validado por la comunidad',
  pending: 'Pendiente de verificacion',
};

export const ETIQUETA_CATEGORIA: Record<CategoriaFicha, string> = {
  patrimonio: 'Patrimonio',
  produccion: 'Produccion',
  servicio: 'Servicio',
};

export const ETIQUETA_NODO: Record<NodoDemo, string> = {
  capital: 'Capital',
  caucete: 'Caucete',
  iglesia: 'Iglesia',
};
