# LIC-05 · Laboratorio de Futuros — Escenarios prospectivos del organismo territorial (v1.0)

> **Módulo LIC-05** (épica LIC-DLUI #448, sprint LIC-R5 #454). Origen curricular: prospectiva territorial / escenarios (DLUI-591 financiamiento de proyectos · DLUI-594 valoración de impacto · DLUI-656 agua y saneamiento · T4 modelado ambiental).
> **Decisión DL-10 (ratificada en #454):** v1 **docs-first sin tabla** — el registro de escenarios es un documento versionado con supuestos e incertidumbre declarados (patrón VIG docs). Sin API, sin openapi, sin migración: el Laboratorio de Futuros v1 es método, no superficie.
> **Estado:** propuesto → ratificado por la DH vía label `r9-ratificado` en el PR de este archivo (R15: staging propone, GitHub acredita).
> **Regla de caducidad:** cada escenario es una **hipótesis con fecha que caduca honestamente** (regla M-CLIMA §5). Un escenario sin fecha de vigencia no se publica.

## 1. Qué es y qué NO es

- **Es:** un registro de escenarios prospectivos del organismo territorial (San Juan como sistema vivo, Iteración 2 #448) con **supuestos, incertidumbres, disparadores y módulos consumidores declarados por escrito**. Cada escenario responde: ¿qué puede pasar, qué evidencia lo diría y qué módulos cambian si pasa?
- **NO es:** un pronóstico, una proyección de datos ni una alerta (invariante heredada de M-ALUVIÓN/M-CLIMA: **la plataforma no es sirena** — LIC-04/SMN/Defensa Civil son la fuente, la plataforma la traducción).
- **Regla de honestidad epistémica (R15):** sin fuente ingestado no hay escenario — lo no verificado se declara `sin_fuente_ingestada` (null ≠ 0, DL-1); lo verificado lleva fuente y fecha; lo hipotético lleva `hipotesis_con_fecha`. Jamás se simula `verified`.

## 2. Estados epistémicos de un escenario (v1)

| Estado | Significado | Ejemplo |
|---|---|---|
| `verificado_con_fuente` | hecho presente con fuente y fecha (corte declarado) | deshielo atípico nov-2026 (sisanjuan 10/11/2026) |
| `hipotesis_con_fecha` | escenario plausible con fuente, fecha y disparadores de invalidación | ventana de riesgo hídrico dic-2026 (M-CLIMA) |
| `unverified` | proyecto/obra declarado sin verificación de estado de avance — jamás simulado como verificado | túnel Agua Negra (caso ancla, E-001) |
| `sin_fuente_ingestada` | dato necesario NO disponible: vacío declarado, no estimado | longitud/presupuesto/cronograma del túnel (DL-10) |

## 3. Escenarios

### E-001 · Caso ancla — Túnel internacional Agua Negra y corredor RN 150

- **Estado:** `construction_status = unverified` (as_of 2026-10-13, decisión DLUI-591 del corpus). El corredor RN 150 está en `pre-ejecución` y el paso internacional Agua Negra en `conditional`; despeje invernal programado oct-nov 2026 (traza ratificada §5bis #448).
- **Supuestos declarados (hipótesis, no hechos):** que el proyecto binacional Argentina–Chile (Coquimbo) avanza de pre-ejecución a obra; que el corredor minero-turístico (M-RN150) concentra flujo de carga y turismo; que la conectividad este-oeste modifica el pulso de bienes de Z4.
- **Incertidumbres (`sin_fuente_ingestada` en v1):** longitud final de la excavación, presupuesto vigente, cronograma de licitación, estado real de la obra — **sin padrón de obra verificado no se declara avance** (regla estados honestos de obra: anuncio ≠ obra, R15).
- **Disparadores de actualización:** (1) publicación oficial de licitación/DAI → pasa a `verificado_con_fuente`; (2) acta de avance de obra verificada → estado de obra en su ciclo real; (3) silencio oficial sostenido → sigue `unverified` con fecha de revisión.
- **Módulos consumidores:** M-RN150 (corredor), M-ANDES (patrimonio+minería), M-CLIMA (despeje/ventana invernal), LIC-04 (riesgo del corredor), DLUI-591/594 (project finance y valoración de impacto como casos docentes).

### E-002 · Ventana de riesgo hídrico diciembre 2026 (M-CLIMA)

- **Estado:** `hipotesis_con_fecha` — fuente: declaraciones del glaciólogo de referencia (nov 2026, por su objeto — regla UNSJ-fuera: la universidad nunca es actora) + deshielo atípico documentado (octubre sin arrancar; río Calingasta duplicó caudal en 15 días, sisanjuan 10/11/2026; pico ~80 m³/s río San Juan, nov 2026).
- **Supuestos:** superposición de deshielo acelerado + tormentas estivales convectivas (El Niño: nieve y energía, no lluvias persistentes — boletín ICAA/SMN N°10, 05/11/2026) → picos de caudal en ríos San Juan y Jáchal a mediados de diciembre.
- **Incertidumbres:** magnitud y localización de picos; respuesta de los tres diques del sur (Ullum/Caracoles/Punta Negra) y de Cuesta del Viento (asimetría 3 vs 1 — Iteración 3).
- **Disparadores:** avisos SMN, informes de tasa de fusión de Hidráulica, crecidas reportadas. **Caduca:** 31/03/2027 (fin del verano hídrico) — revisión obligatoria.
- **Consumidores:** M-CLIMA (BANCO/VIGILANCIA/PROTOCOLO), M-ALUVIÓN (cascada deshielo→crecida), LIC-04, DLUI-656.

### E-003 · Sequía estructural y banco de agua cordillerano

- **Estado:** `verificado_con_fuente` (CIGIAA, Sexto Informe, marzo 2026: «San Juan ante la encrucijada del agua: sequía extrema, agotamiento del modelo de gestión»; Gabinete de Geocriología: glaciares y permafrost en retroceso).
- **Supuestos:** la década de sequía es el régimen, no la anomalía; la nieve 2026 (>2 m, agosto) es alivio parcial que no revierte la tendencia; el macrosistema endorreico del Desaguadero (Ramsar Guanacache) sigue pagando la deuda: «la gestión finaliza en los diques» (Iteración 3).
- **Disparadores:** pronósticos hídricos anuales, balances de embalses, estado de glaciares (Ley 26.639).
- **Consumidores:** M-CUENCA (dos caras: seguridad hídrica arriba / deuda ecosistémica-cultural abajo), M-CLIMA-BANCO, LIC-04, DLUI-566 (justicia hídrica).

### E-004 · Cascada sismo → aluvión (memoria de la prevención)

- **Estado:** `verificado_con_fuente` como patrón histórico (Quebrada del Carrizal, 13/02/1944: semanas tras el sismo M~7,4, caudal estimado 600 m³/s, 35 víctimas, localidad desaparecida — Esper Angillieri, RAGA 2007; Perucca CONICET oct-2026: sismo como disparador de avalanchas M6).
- **Supuestos:** los eventos vienen en cascada, no sueltos (regla M-ALUVIÓN §7); la vigilancia de alta montaña sigue siendo **prestada** de informes mineros (brecha estructural: red pública de sensores `a_verificar`).
- **Disparadores:** actividad sísmica en Z4/Precordillera, lluvias intensas sobre cuenca saturada, GLOF.
- **Consumidores:** M-ALUVIÓN (MICRO/SUSC/MEM — Carrizal 1944 como patrimonio de la prevención, M-ALUV-MEM), LIC-04, DLUI-401/T4.

### E-005 · Minería de cobre y transición energética en Z4 (M-ANDES)

- **Estado:** `verificado_con_fuente` en existencia (El Pachón y Los Azules avisaron crecidas del Los Patos, nov 2026; El Porvenir como proveedora de Veladero — traza §5bis), `sin_fuente_ingestada` en operación (sin datos de operación publicados — solo existencia verificada).
- **Supuestos:** la demanda de cobre sostiene la cartera; los informes ambientales mineros seguirán siendo fuente de vigilancia hidrológica «prestada»; RN 150/Agua Negra condiciona la logística (acople con E-001).
- **Disparadores:** DDJAs/IIAs publicados, informes de impacto, decisiones RIGI.
- **Consumidores:** M-ANDES, M-RN150, LIC-09 (contrapartes y convenios — #456), DLUI-597/598.

## 4. Tabla resumen de vigencia

| ID | Escenario | Estado epistémico | Caduca | Consumidores |
|---|---|---|---|---|
| E-001 | Túnel Agua Negra / corredor RN 150 | `unverified` (as_of 2026-10-13) | revisión trimestral | M-RN150, M-ANDES, M-CLIMA, LIC-04 |
| E-002 | Ventana hídrica dic-2026 | `hipotesis_con_fecha` | 31/03/2027 | M-CLIMA, M-ALUVIÓN, LIC-04 |
| E-003 | Sequía estructural / banco de agua | `verificado_con_fuente` (CIGIAA 03/2026) | revisión anual | M-CUENCA, M-CLIMA-BANCO |
| E-004 | Cascada sismo→aluvión | `verificado_con_fuente` (patrón histórico) | permanente (memoria) | M-ALUVIÓN, LIC-04 |
| E-005 | Minería y transición energética Z4 | existencia `verificado` · operación `sin_fuente_ingestada` | revisión trimestral | M-ANDES, M-RN150, LIC-09 |

## 5. Reglas innegociables del Laboratorio (v1)

1. **Escenario ≠ pronóstico:** todo escenario lleva supuestos + incertidumbres + disparadores; jamás probabilidades inventadas ni estimaciones sin fuente (R15).
2. **Caducidad honesta:** hipótesis con fecha que caduca; revisión obligatoria al vencer (M-CLIMA §5).
3. **La plataforma no es sirena:** los escenarios informan diseño y prevención, jamás actúan como alerta operativa (invariante M-ALUVIÓN/M-CLIMA).
4. **Anti-ranking:** los escenarios jamás comparan nodos entre sí (R5/ADR-036, regla anti-ranking M-METRO).
5. **Sin fuente no hay escenario:** lo no verificado se declara `unverified` o `sin_fuente_ingestada` — null ≠ 0, la brecha es visible (DL-1/DL-5).
6. **UNSJ-fuera:** las fuentes universitarias se citan por su objeto (glaciología, geofísica), la universidad jamás como actora del ecosistema (decisión DH 10/11/2026).

## 6. Versionado

- **v1.0 (2026-11-13):** creación del documento (LIC-R5 #454, DL-10 docs-first). Escenarios E-001..E-005 con estados epistémicos declarados. Caso ancla Agua Negra `unverified`.
- Próximas versiones: cada actualización de escenario suma sección «Cambios» con fecha, fuente y disparador que motivó la revisión (trazabilidad R4).
