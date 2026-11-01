# Bloque D — Verificación normativa del Nodo Capital

**Proyecto:** DELocalSoy.AR  
**Nodo:** Capital  
**Fecha:** 2026-10-15  
**Base:** main @ 77500be  
**Responsable:** agent-vibe  
**Estado:** matriz de verificación iniciada

## 1. Objetivo

Elevar a `verified` las normas y regímenes actualmente sustentados en prensa, y documentar como `unknown` todo texto normativo que no pueda recuperarse de fuente oficial.

Regla: una norma puede tener identificador conocido por prensa, pero no debe ingestarse como texto vigente hasta obtener su publicación oficial, Boletín Municipal, digesto o documento institucional.

## 2. Matriz normativa

| ID | Norma / régimen | Identificador | Tema | Estado actual | Fuente actual | Pendiente para `verified` |
|---|---|---|---|---|---|---|
| NORM-CAP-001 | Registro Único Municipal de Artesanos y Emprendedores | Despacho N° 325-26 | Ferias, feriantes, espacio público | provisional | Diario Huarpe; Diario Colón; Diario La Provincia SJ; Telesol Diario | Texto oficial del Despacho y fecha de promulgación |
| NORM-CAP-002 | Régimen previo de ferias | Ordenanza N° 9194 | Ferias y feriantes | provisional, reemplazado según prensa | Diario Huarpe; Diario Colón | Texto oficial y confirmación de derogación/reemplazo |
| NORM-CAP-003 | Habilitación comercial municipal | Número pendiente | Habilitaciones comerciales | provisional respecto del número | Municipalidad de Capital — página de Habilitaciones | Número, año y texto oficial |
| NORM-CAP-004 | Gastronomía y publicidad en vía pública | Ordenanza N° 9587 | Vía pública, gastronomía, publicidad | verified | Municipalidad de Capital — PDF | Verificar vigencia y modificatorias |
| NORM-CAP-005 | Acceso a la información pública provincial | Sin ley provincial identificada | Transparencia | provisional | Diario Huarpe 2025 y 2026 | Boletín Oficial / digesto; confirmar ausencia de adhesión a Ley 27.275 |
| NORM-CAP-006 | Protección de datos personales | Ley Nacional 25.326 + Decreto 1558/2001 | Datos personales | verified como marco nacional | InfoLEG | Confirmar si existe norma provincial propia o delegación AAIP |
| NORM-CAP-007 | Licencias de datos abiertos y UNIDE | Sin identificador | Reutilización de datos | unknown | — | Texto de licencia por dataset/capa |
| NORM-CAP-008 | Uso cartográfico IGN | Sin identificador | Cartografía derivada | unknown | — | Términos de uso y atribución del IGN |

## 3. Hallazgo reforzado: RUMAE

Varias fuentes periodísticas coinciden en que el **Despacho N° 325-26** creó el **Registro Único Municipal de Artesanos y Emprendedores (RUMAE)**, en reemplazo del régimen de la **Ordenanza N° 9194**.

Elementos reportados de forma consistente:

- Aplica a ferias municipales y a eventos privados o comunitarios con puestos en vía pública.
- Exige inscripción en el RUMAE y credencial vigente.
- Prohíbe la reventa de productos industrializados o adquiridos a terceros en ferias municipales.
- Prevé siete categorías: artesanos, manualistas, artistas callejeros o urbanos, emprendedores, feriantes gastronómicos, feriantes de entretenimiento y actividades emergentes.
- Establece un plazo de adecuación de 60 días desde la promulgación.
- Menciona como espacios de ferias el Paseo Artesanal, Paseo de las Palmeras, Plaza Laprida y Plaza Desamparados.

**Estado epistémico:** `provisional`.  
**Motivo:** las coincidencias provienen de prensa; aún no se dispone del texto oficial del Despacho N° 325-26.

Fuentes:

- Diario Huarpe: https://www.diariohuarpe.com/nota/capital-crea-un-registro-unico-de-artesanos-para-ordenar-espacios-publicos-202691512120  
- Diario Colón: https://diariocolon.com.ar/?p=27515  
- Diario La Provincia SJ: https://diariolaprovinciasj.com/politica/capital-lanzo-su-registro-municipal-de-artesanos-378399/  
- Telesol Diario: https://www.telesoldiario.com/provinciales/capital-crea-el-registro-municipal-de-artesanos-y-emprendedores  

## 4. Acceso a la información pública

La evidencia periodística más reciente disponible indica que San Juan sigue sin adhesión a la Ley Nacional 27.275 y que legisladores oficialistas impulsaron nuevamente una ley provincial de acceso a la información pública en 2026.

**Estado:** `provisional`.  
**Implicancia operativa:** para Municipio y Provincia, los pedidos deben canalizarse por vía administrativa directa, citando la Constitución Provincial, art. 27, y solicitando expresamente el procedimiento vigente.

Fuente:

- Diario Huarpe, 2026-08-18: https://www.diariohuarpe.com/nota/diputados-oficialistas-piden-por-una-ley-de-acceso-a-la-informacion-publica-20268186028  

## 5. Tareas de verificación

- [ ] Localizar el texto oficial del Despacho N° 325-26.
- [ ] Confirmar fecha de promulgación y vigencia.
- [ ] Localizar la Ordenanza N° 9194 y confirmar su relación con el Despacho N° 325-26.
- [ ] Localizar la ordenanza municipal de habilitación comercial: número, año y texto.
- [ ] Verificar modificatorias de la Ordenanza N° 9587.
- [ ] Confirmar en Boletín Oficial si San Juan adhirió a la Ley 27.275.
- [ ] Obtener licencia de cada dataset de datos abiertos.
- [ ] Obtener licencia o condiciones de uso de las capas UNIDE.
- [ ] Revisar términos de uso del IGN para productos cartográficos derivados.
- [ ] Confirmar si existe ley provincial de protección de datos personales o delegación AAIP.

## 6. Regla de ingesta

| Situación | Acción |
|---|---|
| Texto oficial obtenido | Ingestar norma como `verified`, con URL y hash |
| Solo prensa | Mantener `provisional`; no publicar como norma vigente |
| Norma identificada pero texto no disponible | Mantener `provisional` y abrir pedido formal |
| Sin norma identificada | Mantener `unknown` |
| Licencia ausente | Bloquear publicación de derivados |

## 7. Definition of Done

- [ ] Matriz normativa actualizada.
- [ ] Cada norma con identificador, tema, estado y fuente.
- [ ] Ninguna norma sin texto oficial presentada como `verified`.
- [ ] Pedidos formales creados para textos faltantes.
- [ ] Licencias de datos abiertos y UNIDE verificadas o marcadas `unknown`.
- [ ] Marco IGN revisado o marcado `unknown`.
