# VIG-009 — Sistema de apoyo de Achango: ejecución y estado canónico (#241, épica #239)

> Ejecutado 2026-10-20 sobre la rama `feat/vig-009-achango` (apilada sobre VIG-008 #240 / rama `feat/vig-008-cooperativas`, PR #252). CI de GitHub Actions caído hasta ~2026-11-01: sin merge sin CI verde (R15). Este documento registra lo ejecutado, lo bloqueado y las decisiones de la Dirección Humana. openapi v7.27.0 (+2 rutas: POST/GET `/api/patrimonio/{activoId}/observaciones`).

## 1. Alcance y reglas no negociables

Conjunto Monumento Histórico Nacional de Achango (paraje Las Flores, Departamento Iglesia): capilla de Nuestra Señora del Carmen, caserío, cementerio y corrales — declarado MHN por Ley Nacional N° 24.790 (1997), con ficha patrimonial viva desde VIG-004 (#173). Coordenada pública autorizada (VIG-004 / ADR-036): -30.2894, -69.1978, en modo protegido.

**Manifiesto de cero recaudación (no negociable):** la plataforma NO recauda dinero, NO administra ni canaliza presupuestos, NO reemplaza licitaciones públicas y NO promete restauración. Aporta información honesta, visibilidad estructurada y trazabilidad inmutable.

**Candados epistémicos (R15):**

- La estimación de restauración (~50M ARS) es testimonio del cuidador, NO un presupuesto oficial — todo monto formal exige proyecto técnico y presupuesto acreditado.
- El estado crítico reportado por prensa 2026 es testimonio periodístico con fuente, JAMÁS un diagnóstico técnico: `estado_conservacion_global` es SIEMPRE null en la bandeja pública; solo un informe técnico oficial acredita estado.
- La cámara secreta de la capilla NO se especula: datos sensibles viven restringidos (ADR-036).
- Cero nombres civiles (ADR-027, Ley 25.326): la custodia familiar es un ROL (guardián / cuidador / familiar autorizado), jamás un nombre propio. 0 consentimientos materializados.
- Agua, energía y conectividad del paraje: unknown sin relevamiento — no se inventan (R15).

## 2. Estado por requisito (R1–R6)

| Req | Entregable | Estado | Acreditación |
|---|---|---|---|
| R1 | Tabla `patrimonio_observaciones` append-only + contratos `PatrimonioObservacion*`/`CustodiaConsentimiento*` | hecho | commit `ca711772` (sección VIG-009 append en `packages/contracts/src/index.ts` + `schema.prisma` + migración `20261020130000_vig009_patrimonio_observaciones`) |
| R2 | Rutas POST/GET `/api/patrimonio/:activoId/observaciones` + categorías | hecho | commit `2b14df2f` (`apps/api/src/routes/patrimonio.ts` con sello `patrimonio.observado` y rollback + `seed-categorias-vig009.sql`, 10º SQL de `db:seed`) |
| R3 | Instrumento de consentimiento granular de la custodia familiar | hecho (instrumento, 0 usos) | `CustodiaConsentimiento{Alcance,Revocacion}Schema` en `@delocalsoy/contracts` (commit `ca711772`); sin storage de personas hasta consentimiento real (ADR-027, Ley 25.326) |
| R4 | Achango como primer caso del Banco de Potencialidades del nodo (8 oportunidades seed) + suites | hecho | commit `2b14df2f` (`seed-oportunidades-vig009-achango.sql`, 11º SQL de `db:seed`) + commit `d078baa3` (suites E2E `patrimonio-observaciones-vig009.test.ts` y `oportunidades-vig009-rutas.test.ts`, 5+5 tests) |
| R5 | Fichas de tejedoras del nudo textil | EN ESPERA | 0 consentimientos (Ley 25.326, ADR-027): el nudo textil vive como oportunidad cultural (`seed-oportunidad-vig009-nudo-achango`), sin nombres ni identidad/domicilio |
| R6 | Showcase frontend (panel de apoyo Achango) | PENDIENTE del relay DH | `AchangoApoyoPanel.tsx` NO relayado por la DH — no se inventa frontend (R1/R15); pedido activo (sección 5) |

## 3. Observaciones de estado patrimonial (R1/R2: endpoint + suite)

`POST /api/patrimonio/:activoId/observaciones` (requireJwt, ciudadano autenticado, SOLO sobre activos con ficha VIG-004): checklist de 5 dimensiones (grietas, cornisas, techos, maderos, muros), evidencia con procedencia ADR-035, anti-PII sobre nota y evidencia — la observación es testimonio del EDIFICIO, jamás de personas (ADR-020 cond. 1, Ley 25.326); autor como hash pseudónimo sha256 truncado (`observador_hash`); idempotencia por hash único (autor|activo|fecha|checklist|nota) — la duplicada responde 200 `duplicada:true` sin nueva fila ni sello; sello `patrimonio.observado` en `events_raw` con rollback: sin sello no hay observación acreditada (ADR-032). La observación NO cambia el estado de conservación de la ficha (R15).

`GET /api/patrimonio/:activoId/observaciones` (público anónimo): bandeja append-only (100 últimas, orden cronológico) con `estado_conservacion_global` SIEMPRE null + nota honesta — la observación es testimonio, jamás diagnóstico (R15).

Suite E2E `patrimonio-observaciones-vig009.test.ts` (5 tests: POST sin token 401; POST 201 + sello sin PII con `observador_hash` sha32; duplicada 200 `duplicada:true`; activo sin ficha 404; bandeja con estado global null).

## 4. Las 8 oportunidades seed (R4)

Todas en estado `detected` (registro comunitario sujeto a revisión), `created_by_hash` `seed-vig-009` (sello de origen, no un ciudadano), evidencia obligatoria con `evidence_type` canónico, actores SIN nombre con `consent_confirmed=false` (ADR-027), tags sin PII, idempotencia ON CONFLICT (hash):

- `seed-oportunidad-vig009-mhn` — `physical_asset`: conjunto MHN de Achango (capilla, caserío, cementerio y corrales, Ley 24.790), evidencia `institutional_document`.
- `seed-oportunidad-vig009-nudo-achango` — `cultural_asset`: nudo textil (alfombras centenarias, telar de suelo, tintes nativos), evidencia `news_source`.
- `seed-oportunidad-vig009-custodia-familiar` — `institutional_asset`: custodia familiar con relevo generacional COMO ROL, jamás nombre.
- `seed-oportunidad-vig009-demanda-restauracion` — `detected_demand`: restauración urgente con candado epistémico (~50M ARS = testimonio del cuidador, NO presupuesto oficial).
- `seed-oportunidad-vig009-turismo-patrimonial` — `market_gap`: corredor Pismanta-Las Flores sin prestador formal de turismo patrimonial (demanda no verificada con relevamiento propio).
- `seed-oportunidad-vig009-alianzas` — `partnership_opportunity`: mapa de actores (CNM, Provincia/PEDL, Municipio de Iglesia, RSE minera, FECOAGRO/cooperativas, UNSJ/CONICET) — vías verificables, todas en trámite.
- `seed-oportunidad-vig009-inversion-restauracion` — `investment_opportunity`: inversión SOLO con candado epistémico; la plataforma no recauda ni canaliza fondos (manifiesto).
- `seed-oportunidad-vig009-politica-publica` — `policy_opportunity`: PEDL (restauración como Proyecto, sin ejecución acreditada), Pasaporte Sanmartiniano, Leyes 6.801/7.911 — sin plazos inventados.

## 5. Desbloqueo por consentimiento y showcase

Al materializarse consentimientos formales: (1) custodia familiar — activar el instrumento `CustodiaConsentimiento*` con alcance granular y revocación (personas nombradas solo con consentimiento, Ley 25.326); (2) tejedoras del nudo — ficha de tejedora recién con consentimiento (hoy: 0); (3) showcase — **pedido activo a la DH: relay de `AchangoApoyoPanel.tsx` + paneles VIG-008/009 del stage** para materializar R6 (no se inventa frontend, R1/R15). Hasta entonces: 0 personas nombradas, geometría sensible restringida (ADR-036), `estado_conservacion_global` siempre no verificado, cero recaudación.
