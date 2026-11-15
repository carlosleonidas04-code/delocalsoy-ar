# Especificación MVP-1 — «Atlas Territorial» (RFC-020/021) v0.1

**Fecha:** 2026-11-15
**Base canónica:** `main @ dbb11fe` (merge PR #530) — openapi **v7.51.0** (79 paths), matriz de sellos **45**, ADR-001..081, EV-001..112.
**Épica:** OBJE-CAMPUS [#531] · **Issue:** MVP-1 [#532] · **Fuente:** OBJE-000 contraste v0 (PR #528, §4).
**Estado del documento:** ESPECIFICACIÓN RATIFICADA. No registra evidencia. Las decisiones **ADR-082..ADR-084 fueron RATIFICADAS por la DH (2026-11-15, orden expresa en la sesión de construcción)** y quedaron registradas en `docs/DECISIONES.md` y `docs/REGISTRO_ADRS_RATIFICADOS.md`; la estructura (S1) ya está aterrizada en el PR #535 con CI verde.

---

## 1. Alcance y propósito

Primer slice educativo de Obje Campus Territorio Vivo, en dos piezas que ya tienen anclas reales en main:

1. **Matriz de trazabilidad curricular** — cursos, competencias, tracks, perfiles y rutas de aprendizaje (`learning_paths`), como dominio nuevo del repo, con procedencia declarada y contenido que SOLO puede provenir del corpus DLUI-IT autorizado (ECO-5).
2. **Exposición pública del Atlas Territorial por nodo** — composición de datos públicos ya existentes (vocabulario CORE-002, KPIs del observatorio LIC-R1, capas de amenaza LIC-R4, convenios LIC-R9) bajo una única vista por nodo, sin duplicar rutas ni capacidades.

**Fuera de alcance (reiterado de #532):** portafolios, certificación y evaluación personal (RFC-022); asistentes/RAG (RFC-024, slices M8-S1..S5 #523..#527); laboratorio GIS integrado (RFC-023); cualquier dato curricular no respaldado por el corpus autorizado; BI (RFC-028).

## 2. Principios epistemológicos no negociables (viajan del repo al slice)

| Regla | Aplicación concreta en el slice |
|---|---|
| R9 (trazabilidad extrema) | Cada curso, competencia y ruta lleva `fuente_key` + `source_ref` + `fecha_corte` de la ingesta que lo originó. Jamás de memoria. |
| R15 (honestidad de verdad) | El dominio curricular **nace vacío** (0 filas). Declarar la estructura NO es simular datos. `null ≠ 0`; lo sin fuente se declara, no se estima. |
| ECO-5 (corpus como contenido) | El corpus DLUI-IT (47 materias núcleo, 103 optativas, 41 programas — declarados en OBJE-000 §3) entra como CONTENIDO con fuente declarada, nunca como actor institucional. Ninguna fila curricular se crea sin ingesta que la respalde. |
| ADR-027 / Ley 25.326 (anti-PII) | La matriz curricular no registra personas. Sin estudiante, sin docente, sin nombre civil. El dominio es catálogo, no expediente. |
| ADR-031 (identidad JWT/roles) | Escritura de la matriz SOLO admin (acto de carga autorizada, patrón convenios DL-14 / salud DL-11). Lectura pública anónima. |
| ADR-036 / R5 (anti-ranking) | La cobertura curricular se expresa «X de N» honesto (DL-5). JAMÁS ranking entre nodos, cursos ni personas. Sin puntajes globales. |
| ADR-061 (WCAG 2.2 AA) | Criterio EV de la UI del atlas: auditoría AA por slice (hoy DISEÑADO, pendiente — se ejecuta en el slice de UI). |
| ADR-069 (k-anonimato ≥ 5) | Compuerta para cualquier agregado por subnodo; con < 5 contribuciones, el valor se declara `sin_publicacion_k_anon`, jamás se muestra. |
| Geo sensible (patrón Iglesia) | El atlas no expone geometrías de dominios sensibles; las capas federadas conservan su procedencia por ingesta (NC-EV-09) y su estado honesto. |

## 3. Modelo de datos propuesto (schema Prisma — migración nueva que NACE VACÍA, R15)

Extensión del dominio existente siguiendo convenciones del repo (`@map()` snake_case, ADR-003; FK a `ingestas` para procedencia, patrón salud_agregados/avisos — el dato no viaja suelto):

```
courses (cursos)                ← materia/módulo del corpus, con fuente por ingesta
competencies (competencias)     ← capacidad verificable, con nivel declarado
course_competencies (matriz)    ← relación N:M con peso_declarado (texto, no puntaje)
tracks (trayectos)              ← eje formativo (núcleo / optativa / taller territorial)
perfiles (perfiles de egreso)   ← perfil declarado en el corpus
learning_paths (rutas)          ← secuencia ordenada de courses con criterio_de_avance textual
learning_path_steps (pasos)     ← orden + course_id + obligatoriedad declarada
```

Decisiones de diseño (RATIFICADAS por la DH el 2026-11-15):

- **ADR-082 (RATIFICADA):** la matriz curricular es **catálogo con procedencia por ingesta** (patrón DL-9/DL-11), no sistema de gestión académica: sin inscripción, sin notas, sin persona. El corpus DLUI-IT es la única fuente autorizada v1; cualquier otra fuente requiere resolución DH.
- **ADR-083 (RATIFICADA):** trazabilidad curricular en **dos direcciones** (curso → competencias que aporta; competencia → cursos que la desarrollan) expuesta en la API pública; los `tracks`, `perfiles` y `learning_paths` son vistas declaradas sobre esa matriz, jamás cálculos.
- **ADR-084 (RATIFICADA):** el Atlas Territorial por nodo es una **composición de solo-lectura** de superficies públicas ya acreditadas (nodos/capas/categorías/features/reportes + KPIs + convenios + amenazas), con estados honestos por bloque (`publicado` / `sin_fuente_ingestada` / `en_custodia`), sin nueva escritura territorial.

## 4. Contratos Zod propuestos (`packages/contracts/src/curricular.ts`)

- `CourseSchema`, `CompetencySchema`, `CourseCompetencyLinkSchema`, `TrackSchema`, `PerfilSchema`, `LearningPathSchema`, `LearningPathStepSchema`.
- `MatrizCurricularResponseSchema`: catálogo por nodo con conteo honesto «X de N» y estados por fila.
- `AtlasNodoResponseSchema`: bloques {vocabulario, kpis, amenazas, convenios, curricular} — cada bloque con `estado: publicado | sin_fuente_ingestada | en_custodia` y `procedencia` cuando corresponde. Ningún bloque se fabrica: si la superficie fuente no tiene datos, el bloque se declara vacío honesto.

## 5. API propuesta (openapi v7.51.0 → v7.52.0, +4 paths)

| Ruta | Método | Acceso | Notas |
|---|---|---|---|
| `/api/curricular/matriz` | GET | pública anónima | matriz cursos↔competencias con trazabilidad bidireccional (ADR-083) |
| `/api/curricular/rutas` | GET | pública anónima | learning paths + tracks + perfiles declarados |
| `/api/curricular/cursos` | POST | solo admin | alta con ingesta existente y `fuente_key` coincidente (patrón ingestas R15 estricta); idempotencia por hash; sello con rollback |
| `/api/atlas/:nodo` | GET | pública anónima | composición Atlas por nodo (ADR-084); nodo inexistente → 400; bloque sin datos → declarado vacío |

Compuertas transversales: anti-PII server-side (ADR-020 cond. 1) sobre todo payload de escritura; k-anonimato (ADR-069) en cualquier agregado por subnodo; sin KPI nuevo salvo que la DH lo exija (evita barrido de suites — precedente LIC-R6/R7/R9).

## 6. Sellos propuestos (matriz 45 → 46)

| Sello | Evento | Fuente |
|---|---|---|
| `curricular.curso_declarado` | alta de curso con ingesta verificada | POST /api/curricular/cursos (rollback si falla) |

Un solo sello nuevo v1: la matriz se acredita por procedencia de ingesta, no por sellos múltiples. Espejo en `artefactoA4.ts` + dientes en `matriz-sellos.test.ts` y `artefactoA4.test.ts` (los 3 lugares del conteo — lección EV-107).

## 7. Trazabilidad RFC → decisión → modelo/API → evidencia

| RFC | Decisión | Modelo/API | Evidencia prevista |
|---|---|---|---|
| RFC-020 (MVP-1) | ADR-082: catálogo con procedencia, sin gestión académica | dominio curricular + POST /api/curricular/cursos | EV-113 (RESERVADA al PR de aterrizaje — ECO-2: no se reserva por adelantado) |
| RFC-021 (Atlas) | ADR-084: composición solo-lectura de superficies públicas | GET /api/atlas/:nodo | ídem |
| RFC-018 (matriz de competencias) | ADR-083: trazabilidad bidireccional declarada | GET /api/curricular/matriz | ídem |
| RFC-025 (gobernanza de datos) | clasificación de sensibilidad del dominio curricular = público con procedencia; sin PII por construcción | contracts + compuertas | suite E2E del slice |

## 8. Plan de slices (sujeto a orden de la DH)

1. **S1 — Contratos + schema:** `curricular.ts` en contracts; migración nueva que nace vacía; seed SOLO si la DH aporta el corpus como ingesta declarada (R15: sin corpus ingerido, la matriz queda en 0 honesto).
2. **S2 — API matriz + rutas:** GET públicos + POST admin + sello + suite E2E (fixture caucete — capital READ-ONLY, login único por email, R5a #101).
3. **S3 — Atlas por nodo:** GET /api/atlas/:nodo + suite de composición con bloques honestos.
4. **S4 — UI del atlas:** apps/web sobre el contrato `DataSource` (ADR-040); criterio EV WCAG 2.2 AA (ADR-061); sin ranking.
5. **S5 — Docs + EV:** openapi v7.52.0, ARCHITECTURE_STATE header, README, MATRIZ_SELLOS 45→46, registro EV.

## 9. Riesgos y dependencias declarados

- **Contenido:** sin ingesta del corpus DLUI-IT, el dominio curricular permanece vacío (honesto, pero sin valor público). La carga del corpus es decisión de la DH (fuente autorizada).
- **CI:** cada suite nueva debe respetar el rate limit de identidad R5a (#101) y la contaminación anti-suites (patrón NCAP-R1).
- **Alcance:** el RFC-021 pide wireframes y flujos de usuario que NO están en el repo; el S4 los precisa o queda declarado pendiente — jamás se inventa UI sin contrato ratificado.

## 10. Próximo paso

ADR-082/083/084 RATIFICADOS por la DH (2026-11-15) y registrados en `docs/DECISIONES.md` + `docs/REGISTRO_ADRS_RATIFICADOS.md`. S1 (contratos + schema + migración que nace vacía) aterrizado en el PR #535 con CI 7/7 verde. Sigue: **S2** (API matriz + rutas + sello `curricular.curso_declarado`) y la autorización de carga del corpus DLUI-IT como ingesta declarada (ECO-5) — sin corpus ingerido, el catálogo permanece en 0 honesto (R15).
