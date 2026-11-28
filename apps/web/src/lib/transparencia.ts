// REF-R11 (#644, épica REF #633): datos declarados de la Capa Transparencia
// bajo #lab (precedente #541/EV-114). FUENTE ÚNICA de lo que el panel expone:
// el panel REFERENCIA la acreditación GitHub (cada fila enlaza al PR real y
// la evidencia completa vive en docs/EVIDENCIA.md), jamás la copia ni la
// re-acredita (criterio estructural #149, patrón EV-141).
// R15: solo datos verificados en main; nada se simula ni se adelanta.

export interface EntradaRegistroEv {
  ev: number;
  titulo: string;
  issue: number;
  pr: number;
}

export const NOTA_REGISTRO_EV =
  'La acreditación completa de cada aterrizaje vive en docs/EVIDENCIA.md; esta tabla solo la referencia con el enlace al PR que la aterrizó.';

export const REGISTRO_EV: EntradaRegistroEv[] = [
  { ev: 114, titulo: 'Producto visible sin #lab', issue: 540, pr: 541 },
  { ev: 115, titulo: 'Observatorio del nodo en el A1', issue: 544, pr: 553 },
  { ev: 116, titulo: 'Directorio de activos reales en el A1', issue: 545, pr: 555 },
  { ev: 117, titulo: 'Asistente con filtro por tema (n1)', issue: 546, pr: 557 },
  { ev: 118, titulo: 'Fichas v1.1: 7 dimensiones y no sé', issue: 547, pr: 559 },
  { ev: 119, titulo: 'Banco paginado con detalle por API', issue: 548, pr: 561 },
  { ev: 120, titulo: 'Duplicados como corroboración + usar mi ubicación', issue: 549, pr: 563 },
  { ev: 121, titulo: 'Sesión que mapea la práctica acreditada', issue: 550, pr: 565 },
  { ev: 122, titulo: 'Anuncios en vivo y objetivos táctiles de 44 px', issue: 551, pr: 567 },
  { ev: 123, titulo: 'Monograma de Iglesia en ocre', issue: 552, pr: 569 },
  { ev: 124, titulo: 'Corrección documental del conteo de OBJE-000', issue: 531, pr: 571 },
  { ev: 125, titulo: 'Diseño v0.1 del detalle de nodo del Atlas', issue: 588, pr: 602 },
  { ev: 126, titulo: 'Implementación del detalle del Atlas (procedencia)', issue: 604, pr: 605 },
  { ev: 127, titulo: 'Diseño v0.1 de INTER-TERR', issue: 607, pr: 608 },
  { ev: 128, titulo: 'Mapa como entrada + alternativa textual', issue: 610, pr: 616 },
  { ev: 129, titulo: 'Ancla territorial del Atlas', issue: 611, pr: 618 },
  { ev: 130, titulo: 'Corredores v0.1 provisionales', issue: 612, pr: 620 },
  { ev: 131, titulo: 'Conteos territoriales honestos', issue: 613, pr: 622 },
  { ev: 132, titulo: 'Itinerario por nodo (#nodo/clave)', issue: 614, pr: 624 },
  { ev: 133, titulo: 'Accesibilidad de los controles del mapa', issue: 615, pr: 626 },
  { ev: 134, titulo: 'Panel de la plataforma instituida', issue: 628, pr: 629 },
  { ev: 135, titulo: 'Realidad verificada v0.2 de la interfaz', issue: 634, pr: 645 },
  { ev: 136, titulo: 'Tokens accesibles WCAG 2.2 AA', issue: 635, pr: 647 },
  { ev: 137, titulo: 'Navegación de 5 destinos + 3 capas', issue: 636, pr: 649 },
  { ev: 138, titulo: 'Lenguaje de producto sin códigos', issue: 637, pr: 651 },
  { ev: 139, titulo: 'Componentes base de estados honestos', issue: 638, pr: 653 },
  { ev: 140, titulo: 'Destino Inicio', issue: 639, pr: 655 },
  { ev: 141, titulo: 'Dominio de portafolios (RFC-002)', issue: 573, pr: 631 },
  { ev: 142, titulo: 'Destino Mapa', issue: 640, pr: 658 },
  { ev: 143, titulo: 'Destino Reportar', issue: 641, pr: 660 },
  { ev: 144, titulo: 'Destino Preguntar', issue: 642, pr: 662 },
];

export interface ReglaTransparencia {
  clave: string;
  texto: string;
}

export const REGLAS_TRANSPARENCIA: ReglaTransparencia[] = [
  { clave: 'R4', texto: 'todo trabajo se auto-reporta: si la integración continua falla, el fallo se comenta en el PR con su registro.' },
  { clave: 'R5', texto: 'errores y estados sin maquillaje: los conteos van con su cobertura y fecha de corte, jamás como puntaje global (ADR-036).' },
  { clave: 'R9', texto: 'documentación sincronizada: el contrato abierto y los estados de arquitectura se actualizan en el mismo PR que el código.' },
  { clave: 'R15', texto: 'staging propone, GitHub acredita: nada se da por acreditado sin corrida de integración continua en main; sin dato no es cero (null ≠ 0).' },
];

export interface DecisionTransparencia {
  ref: string;
  texto: string;
}

export const DECISIONES_TRANSPARENCIA: DecisionTransparencia[] = [
  { ref: 'ADR-020 / ADR-027', texto: 'sin datos personales (Ley 25.326): sin nombres civiles ni domicilios; los consentimientos nunca van pre-marcados.' },
  { ref: 'ADR-029 / ADR-040', texto: 'acople por contrato de fuente de datos: toda lectura declara de dónde sale.' },
  { ref: 'ADR-036', texto: 'la plataforma jamás compara personas ni nodos: navegación y cobertura, nunca competencias.' },
  { ref: 'ADR-038 / ADR-039', texto: 'corroborar no es duplicar; lo descartado jamás aparece en la lectura pública.' },
  { ref: 'ADR-061', texto: 'WCAG 2.2 AA: contraste, foco visible, anuncios en vivo y objetivos táctiles de 44 px.' },
  { ref: 'ADR-084', texto: 'la superficie pública es de solo lectura: la escritura territorial vive en el artefacto A1.' },
];

export const DATOS_CONTRATO = {
  openapiVersion: '7.54.0',
  paths: 83,
  matrizSellos: 46,
} as const;
