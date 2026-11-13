# IGL-001 — Doc rector del Nodo Valle de Iglesia (ficha v1)

> **Estado del nodo:** `fuente_registrada` → **`en_activacion`** (este PR, patrón Caucete: `activo` recién con la activación completa acreditada). **Decisión DH (b) RATIFICADA 12/11/2026:** activar Iglesia.
> **Nodo:** iglesia (Valle de Iglesia) · **Épica:** #458 (carril geográfico, Iteración 5) · **Regla rectora:** LIC-07 — Iglesia es el nodo de **geometría sensible máxima**: doble capa pública/restringida, consentimiento granular del portador (DL-12, ya operativo), publicación solo de puntos de acceso/miradores.

## 1. Rol-hipótesis (verificable)

**El valle, la alta cordillera y la memoria del agua.** Nodo naciente de la cuenca del río Jáchal (río Blanco + arroyo Iglesia → Cuesta del Viento 206 hm³) y puerta norte de la RN 150 / Agua Negra. Hipótesis: despensa de agua y memoria patrimonial del organismo provincial.

## 2. Flujos que recibe y emite

- **Agua** (flujo fundacional): nacientes del río Jáchal; Cuesta del Viento 206 hm³ (EPSE, ancla compartida con Jáchal).
- **Personas**: pulso estacional (veranada, turismo), pulso de servicios hacia Jáchal.
- **Bienes**: producción iglesiana (semillas, frutos secos, frutales, hortalizas — capas v5.1 ya sembradas).
- **Riesgo** (sistema inmune): Carrizal 1944 (aluvión, 35 víctimas), despeje de Agua Negra con 10 aludes (oct–nov 2026) → M-ALUVIÓN / M-CLIMA.
- **Información**: vigilancia hídrica "prestada" (informes mineros) — vacío estructural declarado.

## 3. Funcionalidades espaciales que sirve

Habitar · producir · cuidar · celebrar-recordar (patrimonio y memoria) — con límite LIC-07: el patrimonio vulnerable se documenta, jamás se expone.

## 4. Subnodos (ya sembrados en el vocabulario — VIG-001 #171)

6 distritos ratificados (Villa Iglesia, Las Flores, Tudcum, Rodeo, Angualasto, Bella Vista) + parajes con identidad propia; **52 subnodos de los lotes 1+2** (jerarquía `district` → `paraje` → `subparaje`, Opción B ratificada R9). Pismanta → Las Flores ya en el vocabulario. Sin nombres inventados: todo subnodo con fuente.

## 5. Anclas verificadas (promovidas a ficha v1)

| Ancla | Fuente / registro | Estado honesto |
|---|---|---|
| Fecoagro Tudcum | INAES 28.777/659 · 10 socios · const. 12-08-2004 (corrección epistémica: es de Iglesia, migrada desde la ficha v0 de Jáchal) | verificada |
| Valles Iglesianos | INAES 11.463/170 · 31 socios · const. 25-08-1987 | verificada |
| Dique Cuesta del Viento | BAHRA A19 · Ley 826-G · VHF canal 16 · guardavidas operativo | `capacity_status=unknown` (null ≠ 0) |
| Carrizal 1944 | 35 víctimas; la localidad de El Carrizal desapareció (Esper Angillieri, RAGA 2007) → **M-ALUV-MEM, memoria de la prevención** | geo sensible: punto de acceso, JAMÁS coordenadas del sitio |
| Capilla de Achango | Ley 24.790; alfombras >350 años; estado crítico 2026 | doble capa pública/restringida; ficha VIG-004 ya en main |
| Angualasto | Decreto 2.154/2009 (LHN) + Ley 7.300; **art. 2 del decreto: vacío declarado** | geometría sensible separada |
| Qhapaq Ñan (tramo Angualasto–Colangüil) | 3 niveles de atribución; `not_demonstrated_inca`; fechados 14C de Calingasta JAMÁS trasladados | atribución honesta |
| RN 150 / Agua Negra | `pre-ejecución`; despeje oct–nov 2026; paso `conditional` | estado de obra honesto |
| El Porvenir (proveedora de Veladero) | existencia verificada — sin datos de operación (M-ANDES, minería RIGI) | `verified` solo existencia |

## 6. Vacíos declarados (null ≠ 0, R15)

- Red pública de sensores aluvionales/sísmicos: `a_verificar` (vigilancia prestada de informes mineros).
- Inventario de eventos aluvionales del valle: `sin_fuente_ingestada` (M-ALUV-INV).
- Aforos y capacidad turística: `capacity_status=unknown`.
- Geometrías de sitios arqueológicos: **restringidas por diseño** (no es vacío: es regla LIC-07).

## 7. Proyectos puerta (regla de la puerta: P-01/P-02 antes de temáticos)

- P-01 perfil territorial participativo del valle (con consentimiento granular).
- P-02 tramos FE-8 de caminos rurales (capa `rural_services` ya sembrada) — verificación de campo = práctica acreditada (LIC-03/DL-7).
- P-11 memoria del Carrizal 1944 como patrimonio de la prevención (M-ALUV-MEM).

## 8. Módulos priorizados

LIC-07 (patrimonio vivo, DL-12) · LIC-04 (M-ALUVIÓN: M-ALUV-MEM/M-ALUV-INV) · M-CLIMA (Agua Negra despeje) · M-ANDES (minería RIGI: existencia verificada, sin datos de operación) · M-RN150 (corredor minero-turístico con estados honestos) · LIC-09 (cooperativas INAES ya verificadas).

## 9. Condiciones de activación (cumplidas al merge de esta ficha)

1. ✅ Anclas verificadas con fuente (tabla §5).
2. ✅ Subnodos sembrados con fuente (VIG-001, 52 del lote 1+2).
3. ✅ Regla LIC-07 de doble capa y consentimiento granular operativa (DL-12, PR #470).
4. ✅ Decisión DH (b) ratificada (12/11/2026).
5. ⏳ `activo` recién con la activación completa acreditada (patrón Caucete) — este PR deja el nodo en `en_activacion`.

## Campo 10 — Las 7 dimensiones (cada una produce capa, KPI o proyecto, o declara vacío)

| Dimensión | Produce | Estado |
|---|---|---|
| Ecosistémica | Cuenca del río Jáchal: nacientes + Cuesta del Viento (M-CUENCA) | capa declarada, geometría a federar (IGN/MOP) |
| Ambiental | Deshielo/crecidas + vigilancia prestada (M-CLIMA-BANCO) | vacío de red propia declarado `a_verificar` |
| Cultural | Achango, Angualasto, Qhapaq Ñan, Carrizal 1944 (LIC-07/M-ALUV-MEM) | fichas VIG-004/009 ya en main |
| Económica | Cooperativas INAES verificadas + producción (capa `productive_units`) | 2 anclas verificadas |
| Prevención | Carrizal 1944 como memoria + Agua Negra aludes (M-ALUVIÓN) | M-ALUV-INV `sin_fuente_ingestada` |
| Resiliencia | Cuesta del Viento como reservorio + puntos de encuentro | capacity unknown honesto |
| Sustentabilidad territorial | RN 150/Agua Negra `pre-ejecución` + límite de rol: la plataforma no es sirena | estado de obra honesto |

## Capa hidrográfica (viaja con todas las zonas)

Posición hidráulica: **naciente** — subcuenca alta cordillerana del río Jáchal (río Blanco + arroyo Iglesia → Cuesta del Viento 206 hm³, 28 GWh, EPSE; obras 2025-26: válvula −57% agua, descargador tras década inoperativo). Regla del agua: la cuenca manda sobre el departamento; la codificación oficial (Strahler, MOP+IGN C6) se federará, jamás de memoria.

## Trazabilidad

- Decisión DH (b) ratificada 12/11/2026 (paquete §5bis del canvas 30); Iteración 5 (Z4) ratificada (turno 9).
- Este PR es **docs-only**: sin migraciones, sin sellos, sin rutas — la ficha v1 documenta; el estado `en_activacion` es el estado documental del nodo (patrón Caucete).
- UNSJ-fuera · anti-PII · anti-ranking · geo sensible máxima (LIC-07).
