# VIG-R5 — Catálogo de fuentes y procedencia del Valle de Iglesia (NVIG-R5)

> Sprint NVIG-R5 (issue #172, épica #167 — ADR-035). Patrón NODO-CAU R2 (#200) reutilizado SIN migraciones, tablas ni rutas nuevas: la tabla global `fuentes`, las rutas `/api/fuentes` y el pipeline `ingestas` (NC-EV-09) ya viven en main y sirven a los tres nodos. Este PR agrega las 16 fuentes específicas del valle verificadas en las tandas 1–3 de investigación (verificación 2026-10-13, trazas #167–#174) con seed idempotente `seed-fuentes-vig.sql`. Registro de evidencia: EV a numerar al volver CI (tabla F0-C1 abierta — EV-055/056 reclamadas por CORE-005 #219/#220).

## Regla central (ADR-035)

Nunca un feature real sin fuente citable (R15). El catálogo es un registro de procedencia, no un registro de datos: cada fuente declara organismo, URL estable cuando existe, tipo de acceso, licencia y cautela. La ingesta de un conjunto externo declara su procedencia completa ANTES de entrar al sistema (NC-EV-09); la lectura pública solo expone lo publicado.

## Fuentes multinodo ya registradas (seed Caucete, #200)

Sirven también al valle sin duplicar filas: IGN (WFS Argenmap), BAHRA (cod_ase), Georef (API), INDEC+IIEE (CPV2022), UNIDE (requiere_credenciales), INPRES (para el valle: INPRES-CIRSOC 103 Parte I 2018, Zona 4), MapBiomas C3 (CC BY-SA 4.0), IDERA y Catastro San Juan. Regla: join por código, nunca por nombre (BAHRA cod_ase, Georef id; departamento Iglesia = 70049). Congelada: API ramsac.ign.gob.ar (posible defacement detectado 2026-10-11, lección #147).

## Catálogo VIG (16 fuentes, seed `seed-fuentes-vig.sql`)

| key | organismo | tipo | estado | cautela central |
|---|---|---|---|---|
| municipio_iglesia | Municipalidad de Iglesia | documento | disponible | Enumera 5 distritos (Villa Iglesia, Las Flores, Tudcum, Rodeo, Angualasto) SIN Bella Vista: Bella Vista es sexto distrito por decisión DH 2026-10-13, no por la ordenanza. Paraje ≠ distrito: BAHRA/Georef son la fuente de verdad de parajes. |
| decreto_2154_2009 | Poder Ejecutivo Nacional (Boletín Oficial) | documento | disponible | Art. 1 verificado (yacimiento ~30°3S 68°10O); art. 2 (MHN aldea) pendiente de cotejo. Ubicación exacta JAMÁS publicable: modo protegido ADR-036, ficha pública sin punto propio del yacimiento. |
| ley_24790 | Congreso de la Nación Argentina | documento | disponible | Declaratoria MHN del conjunto (capilla y alfombras de más de 350 años). Estado de conservación crítico reportado 2026; restauración figura como Proyecto en el PEDL 2024: la norma NO acredita el estado actual. Sin punto sensible publicado (ADR-036). |
| ley_25291 | Congreso de la Nación Argentina | documento | disponible | MHN conjunto binodal: Molino Escobar (Jáchal) + Molino de Bella Vista (Iglesia) — no separar la declaratoria de su alcance. Geometría del molino solo con punto publicable (ADR-036). |
| leyes_patrimonio_sj | Legislatura de San Juan | documento | disponible | Registro provincial NUNCA fusionado con la nacional (Decreto 2.154/2009): son registros separados con alcances distintos (declaratoria provincial vs LHN nacional). |
| conicet_garcia_2024 | CONICET (García 2024) | documento | disponible | DOI verificado (10.58598/cuhes.1415472, 15-06-2024). Documenta el tramo PERO no sostiene atribución inca: qhapaq_nan_status=not_demonstrated_inca. El nodo modela capas de movilidad sucesivas, nunca una ruta inca continua. |
| michieli_2016 | Michieli, C. T. (2016) | documento | disponible | La Fortuna 8.160±160 GaK-4192; Los Morrillos 8.465±240 GX-1826 y 8.255±170 GaK-4195: TODOS de Calingasta — dating_locality=not_verified_for_iglesia; prohibido iglesia.occupation_start=8500 BP. |
| pedl_iglesia | Gobierno de San Juan | documento | disponible | Estado de componentes heterogéneo (en ejecución / suspendido / Proyecto): la restauración de las capillas de Achango y Santo Domingo figura como Proyecto. Citar el estado exacto por componente; nunca prometer obras. |
| cna_2018 | INDEC | descarga | disponible | 758 ha implantadas con alcance departamento (scope=departamento), NO distrito: no desagregar por debajo de la escala publicada. |
| hidrometria_sj | Hidráulica (Gobierno de San Juan) | documento | disponible | Hidrometría del río ≠ capacidad del embalse: capacity_status del dique Cuesta del Viento = unknown (sin aforo de plazas ni protocolos verificados). |
| ley_826_g | Legislatura de San Juan | documento | disponible | Guía oficial de seguridad encontrada (safety_evidence_status=official_guidance_found: VHF canal 16, guardavidas operativo abril 2026). Ocupación hotelera (90% enero 2026) NO es aforo: capacity_status=unknown. |
| viales_rn150 | Viales (San Juan) + DNV | documento | disponible | Paso habilitado 25-11-2024 (80% pavimento), gestión provincial 20 años (convenio 08-2026). Estado del paso DINÁMICO (cierre estacional por hielo; cerrado 01-10-2026): verificar vigencia antes de cada publicación. |
| conectividad_agua_negra | Banco Interamericano de Desarrollo (BID) | documento | disponible | ICR BID (03-2024) confirma que el túnel NO estaba construido: construction_status=unverified, last_confirmed_not_built=2024-03. SIN obra iniciada ni cronograma público a sep-2026: nunca prometer plazos. |
| ley_2400_t | Ministerio de Turismo de San Juan | documento | requiere_solicitud | Padrón desagregado de Iglesia NO encontrado (93/158/377 prestadores provinciales sin desagregación): la ingesta de prestadores exige el registro por prestador; distinguido ≠ habilitado. |
| inaes | INAES | descarga | requiere_solicitud | Registros constatados en la documentación de las cooperativas (Fecoagro Tudcum 28.777/659, const. 12-08-2004; Valles Iglesianos 11.463/170, const. 25-08-1987) PERO INAES sin verificación en vivo: verificar registro y vigencia antes de publicar; sin PII de socios (Ley 25.326). |
| turismo_sj | Ministerio de Turismo de San Juan | documento | requiere_solicitud | Ruta declarada públicamente (municipal + provincial 29-09-2026, FIT) pero instrument_status=not_found: los 12 emprendimientos quedan candidate_provider unverified; identidad/domicilio solo con consentimiento (ADR-027, Ley 25.326). |

Estados honestos verificados 2026-10-13 (tandas 1–3, trazas #167–#174): ninguna fuente se marca disponible sin verificación; las tres que exigen padrón o instrumento no encontrado quedan `requiere_solicitud` (`ley_2400_t`, `inaes`, `turismo_sj`). Idempotencia: ON CONFLICT (key) DO NOTHING; sellos `fuente.registrada` (hash `seed-fuente-<key>`, payload `{key, organismo, source: seed-vig-r5}`, sin PII).

## Reglas específicas del valle (cautelas canon de las trazas)

1. Qhapaq Ñan: capas de movilidad sucesivas; atribución inca `not_demonstrated_inca` (García 2024, DOI verificado).
2. Fechados 14C: los citados con código de laboratorio son de Calingasta — `dating_locality=not_verified_for_iglesia`; prohibido `iglesia.occupation_start=8500 BP`.
3. Capacidad del dique Cuesta del Viento: `capacity_status=unknown` (hidrometría del río ≠ aforo del embalse; ocupación hotelera ≠ aforo).
4. Túnel Agua Negra: `construction_status=unverified` (ICR BID 03-2024: no construido, `last_confirmed_not_built=2024-03`); nunca prometer plazos.
5. Prestadores: ingesta solo con Ley 2400-T verificada por prestador; distinguido ≠ habilitado.
6. Cooperativas: registros constatados en su documentación pero INAES sin verificación en vivo.
7. Emprendimientos Mujeres de Montaña: `candidate_provider` unverified; identidad/domicilio solo con consentimiento (ADR-027, Ley 25.326).
8. Patrimonio: ubicación exacta jamás publicable — ficha pública sin punto propio del yacimiento (ADR-036).

## Rutas y pipeline (reutilizados, sin cambios — openapi v7.24.0)

- `GET /api/fuentes` — catálogo público anónimo (31 fuentes: 15 Caucete + 16 del valle).
- `GET /api/fuentes/:key` — ficha pública de una fuente (404 honesto).
- `POST /api/ingestas` — alta curada admin (NC-EV-09 + anti-PII + idempotencia + sello `ingesta.creada`).
- `GET /api/ingestas` — lectura pública de las publicadas (filtro `?nodo=`).
- `PATCH /api/ingestas/:id/estado` — pipeline recibido → validado_tecnicamente → validado_territorialmente → publicado (solo admin).

## Primera ingesta natural del valle (pendiente, no en este PR)

BAHRA WFS `ign:bahra_paraje` con `cod_depto=70049` (42 parajes oficiales con cod_ase y coordenadas) + centroide Georef de la localidad Pismanta — ya verificados en vivo (VIG-001); entra por el pipeline admin con NC-EV-09 completo. No hay ingesta real publicada todavía: el registro queda 0 honesto (R15).

## Criterio de cierre

#172 cierra con: catálogo VIG en main (16 fuentes + sellos) + suite E2E `fuentes-vig-rutas.test.ts` (5 tests) + suite Caucete actualizada al catálogo global de 31 + CI verde del PR + registro EV post-merge en `docs/EVIDENCIA.md` (numeración F0-C1). Verificación en vivo por fuente: trazas #167–#174 y este documento.
