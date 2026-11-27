/**
 * DELocalSoy.AR — INSTITUCION-1 (#628): contenido declarado del panel de
 * institución. Regla R15: todo lo que este módulo expone es declaración
 * (fuente: repo + docs/EVIDENCIA.md), jamás cálculo ni dato inventado.
 * El acto documental (acta + ADR-087 + registro EV) se mergea al cierre del
 * ciclo (2026-12-01); hasta entonces ESTADO_ACTO declara el estado en curso.
 */

export const ESTADO_ACTO = 'Acto de institución: 1 de diciembre de 2026. Este panel es la manifestación funcional ratificada por la Dirección Humana el 2026-11-27 (issue #628); el acto documental (acta + ADR-087 + registro en docs/EVIDENCIA.md) cierra el ciclo. Mientras tanto, este panel declara el estado en curso, sin adelantar resultados (R15).';

export const DECLARACION = 'DELocalSoy.AR se instituye como plataforma de desarrollo territorial íntegro: un organismo territorial federado de nodos, con cartografía ciudadana, escritura verificada, servicios informativos honestos y gobernanza HITUB acreditada en GitHub. La plataforma declara lo que hay, con estados honestos, y jamás simula un dato o un resultado que no exista (R15).';

export interface EpicaAcreditada {
  epica: number;
  titulo: string;
  registro: string;
  enlace: string;
}

export const FUNDAMENTO_EPICAS: EpicaAcreditada[] = [
  { epica: 399, titulo: 'ARTEFACTOS-ROLES: residencia, visitante, bandeja del gestor y libro contable de sellos (A1 a A4)', registro: 'EV-089 a EV-092 (PRs #404, #407, #408, #410)', enlace: 'https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/399' },
  { epica: 543, titulo: 'Pase de la pizarra de interfaz: observatorio, activos, asistente, fichas v1.1, banco paginado, reportes sin duplicados, sesión, accesibilidad y monograma de Iglesia', registro: 'EV-115 a EV-123 (PIZ-R1 a R9)', enlace: 'https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/543' },
  { epica: 607, titulo: 'Interfaz territorial primaria: mapa como entrada, ancla del Atlas, corredores v0.1, conteos honestos, itinerario por nodo y accesibilidad del mapa', registro: 'EV-128 a EV-133 (IT-R1 a R6)', enlace: 'https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/607' },
  { epica: 459, titulo: 'Fase 0 social: fundamentos D1 a D41 de la Plataforma Social y tablero de 46 slices', registro: 'Fase 0 completa (EV-112); los slices quedan en compuerta', enlace: 'https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/459' },
  { epica: 448, titulo: 'LIC-DLUI: módulos derivados de la Licenciatura DLUI', registro: 'EV-103 a EV-111 (LIC-R1 a R9)', enlace: 'https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/448' },
  { epica: 531, titulo: 'OBJE-CAMPUS: Atlas Territorial (MVP-1) y contraste OBJE-000', registro: 'EV-113, EV-124 a EV-126 (RFC-021 completa); backlog vivo', enlace: 'https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/531' },
];

export interface VacioHonesto {
  tema: string;
  estado: 'sin_fuente_ingestada' | 'en_compuerta' | 'pendiente_verificacion';
  detalle: string;
}

export const VACIOS_HONESTOS: VacioHonesto[] = [
  { tema: 'Catálogo curricular', estado: 'sin_fuente_ingestada', detalle: 'El catálogo nace en 0 honesto hasta la ingesta del corpus DLUI-IT (ECO-5, pendiente de la Dirección Humana); 0 no es un cero: es ausencia declarada.' },
  { tema: 'Fase 1 Plataforma Social', estado: 'en_compuerta', detalle: 'Los 46 slices (#482 a #527) esperan la convocatoria de federaciones semilla (INAES, RUPEPYS, Dirección de Economía Social SJ), pendiente solo-DH.' },
  { tema: 'MONTAR-2 (acreditación full-stack)', estado: 'pendiente_verificacion', detalle: 'Workflow re-disparado por la DH; la corrida (EV-102) queda pendiente de verificación en el issue #445.' },
];

export const REGLAS_INNEGOCIABLES: string[] = [
  'R9: GitHub acredita; la Dirección Humana ratifica las decisiones.',
  'R15: nada se simula: todo cambio pasa por issue, rama, PR con CI verde y registro en docs/EVIDENCIA.md.',
  'Anti-ranking: la plataforma jamás rankea personas, comercios ni territorios (R5/ADR-036).',
  'No es sirena ni policía: la plataforma informa y enlaza; las alertas las emiten los organismos del Estado.',
  'Ley 25.326 (ADR-027): sin datos personales; los actores se identifican por consentimiento y pseudónimos.',
  'Geometría sensible (LIC-07): los sitios vulnerables publican solo el punto de acceso.',
  'Estados honestos: publicado, sin_fuente_ingestada o en_custodia; un vacío se declara, nunca se disimula.',
];

export interface FaseSiguiente {
  fase: string;
  detalle: string;
}

export const FASES_SIGUIENTES: FaseSiguiente[] = [
  { fase: 'OBJE-CAMPUS #531', detalle: 'Backlog vivo de RFCs (parciales y futuros) bajo la épica #531.' },
  { fase: 'Fase 1 Plataforma Social #459', detalle: '46 slices (#482 a #527) en compuerta por federaciones semilla (solo-DH).' },
  { fase: 'Pendientes solo-DH', detalle: 'Ingesta del corpus DLUI-IT (ECO-5), MONTAR-2 EV-102, copia Drive del corpus y convocatoria de federaciones semilla.' },
];

export function resumenInstitucion() {
  return {
    epicas: FUNDAMENTO_EPICAS.length,
    vacios: VACIOS_HONESTOS.length,
    reglas: REGLAS_INNEGOCIABLES.length,
    fases: FASES_SIGUIENTES.length,
  };
}
