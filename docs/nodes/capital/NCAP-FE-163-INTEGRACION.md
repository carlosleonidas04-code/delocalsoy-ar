# NCAP-FE #163 — Integración de la vista del nodo Capital

> Parte de la cascada «NODO-CAPITAL» ratificada por la DH el 2026-11-05:
> R3 fuentes (#155 ✓ EV-078) → R1 vocabulario (#153 ✓ EV-079) → R5 accesibilidad (#157 ✓ EV-080) → **FE #163 (este sprint)** → registro EV-081.

## 1. Alcance y decisiones

- **Multinodo desde día 1 (patrón MK-1, MARKET-CAP):** `BancoPotencialidadesPanel` llama `listOportunidades({ limit: 100 })` SIN filtro de nodo — el catálogo es global y el filtro de nodo es una opción del contrato, no un acoplamiento del componente.
- **Solo lectura (R8):** la matriz de transiciones mostrada ES la canónica de la API (`routes/oportunidades.ts`, NCAP-R6 #158), como copia citada para visualización. Este sprint ELIMINA el alias `LocalOpportunity` y el modal de creación local del stage — la escritura exige moderación autenticada (deuda registrada: sprint de autenticación).
- **Acople por contrato (ADR-029):** `NodoCapitalDashboard` recibe `{ dataSource: DataSource }`; `VITE_MOCK_API === 1` selecciona `SyntheticDataSource` con paridad [SINTÉTICO] declarada (R15); la demo congelada de `demo/` (ADR-040) NO se extiende.
- **Cascada visible:** cada panel cita el issue del backend que consume (chip NCAP-R6 #158, botón «Accesibilidad Peatonal (NCAP-R5)», sección corredores NCAP-R4 #156).

## 2. Contrato `lib/oportunidades.ts`

- Tipos `OportunidadItem`/`CorredorItem`/`AccesibilidadResumen` + etiquetas (tipo 10, estado 10, evidencia 7, validación 3, rol 6, continuidad 2) con unions abiertas de string: el vocabulario futuro se muestra tal cual, jamás se recorta (R15).
- `ESTADOS_PUBLICOS`: 9 estados, SIN `discarded` — la API nunca lo publica y el frontend no lo ofrece como filtro.
- `OPORTUNIDAD_TRANSICIONES`: copia citada de la matriz canónica (10 claves) + `SECUENCIA_CICLO` (camino principal de 7 estados). Si la API la extiende, esta copia se actualiza en el mismo PR — no deriva en silencio.
- Normalizadores `normalizarOportunidades`/`normalizarCorredores`/`normalizarAccesibilidad` tolerantes a la forma real de la API (envoltura `success`/`data` o arreglo directo) con null honesto (scoring/contexto/última revisión) — null ≠ 0.

## 3. Matriz canónica vs. stage eliminado

El dashboard stage mostraba una matriz de transiciones divergente y ejes viales `CAPITAL_STREET_AXES` de datos embebidos. Este sprint:

- reemplaza la matriz divergente por la copia citada en SOLO LECTURA (sección 2);
- reemplaza la sección de ejes stage por los corredores v0.1 reales de `GET /api/corredores` (NCAP-R4 #156): cards con `status`, conteos de segmentos e hitos y continuidad revisada ok|ruptura — con estados loading|error|empty|ok honestos (R5: el error ES error, jamás una lista vacía como máscara);
- monta la pestaña nueva «accesibilidad» (NCAP-R5 #157): cobertura «N de M tramos priorizados cuentan con relevamiento» en grande con cautela «anuncio ≠ obra» y fecha de corte, 5 conteos de observaciones (ingresadas/revisadas/corroboradas/disputadas/ilustrativas), features por capa y estado, features por fuente, reportes ciudadanos por categoría e hitos con ficha y última revisión — NUNCA un puntaje global de accesibilidad (R5/ADR-036).

## 4. Paridad sintética [SINTÉTICO] (R15)

`SyntheticDataSource` implementa los tres métodos opcionales:

- 2 oportunidades de demo con título `[SINTÉTICO] …` (`under_review` y `detected`), filtrables por nodo/tipo/estado/subnodo;
- 2 corredores `candidate` (hipótesis de diseño, NCAP-R4);
- accesibilidad del nodo capital con cobertura «0 de 2 tramos priorizados cuentan con relevamiento» — honesta, sin maquillar; para cualquier otro nodo lanza `DataSourceHttpError` 404 (R5: sin fallback silencioso).

`ApiDataSource` agrega `listOportunidades`/`listCorredores`/`getAccesibilidad` con `DataSourceHttpError` tipado (status + endpoint): 404 se propaga tal cual; data malformada → 500 honesto; jamás una lista vacía como máscara de error.

## 5. Criterio de cierre del issue #163

Se cumple cuando el catálogo, la ficha y las transiciones consumen la API real por contrato `DataSource` (ADR-029) y la suite `apps/web/src/lib/oportunidades.test.ts` (19 tests) está verde en CI: normalización con filas reales, matriz espejo de la canónica, URLs exactas de los tres endpoints, propagación de 404/500 tipados, paridad sintética etiquetada y cobertura honesta.

## 6. Cautelas R15

- «Anuncio ≠ obra»: la cobertura de tramos priorizados se muestra con la cautela textual del backend y su fecha de corte.
- Error es error; lista vacía es dato honesto; null ≠ 0.
- Lo sintético se declara SIEMPRE ([SINTÉTICO] + `SYNTHETIC_MODE_WARNING_TEXT`).
- Sin autenticación en este sprint no hay escritura: la plataforma no simula persistencia del lado del cliente.
