# OBJE-000 — Alcance: contraste de los 36 RFCs «Obje Campus Territorio Vivo» contra el monorepo real

> **Estado:** CONTRASTE v0 cerrado por merge (patrón VIG-000 → VIG-001). Fuente de las RFCs: **Documento Fundacional Integrado v1.0** (DLUI-IT, Drive de la DH — 36 RFCs, catálogo en su Anexo A). Verificado contra **main @ `b0058a7e`** (post Fase 0 social #481): openapi **v7.51.0** (79 paths), matriz de sellos **45**, ADR-001..081, EV-001..111.
> **Regla #460:** la épica OBJE-CAMPUS se crea SOLO al cerrar este contraste. **MVP-1 confirmado = RFC-020/021 Atlas Territorial.**

## 1. Método

Cada RFC del corpus fundacional se contrasta contra la realidad verificable del monorepo (código, openapi, docs). Tres estados honestos: **mapeado** (el repo ya cubre lo esencial), **parcial** (hay anclas reales, falta el resto), **futuro** (no existe nada; entra a la épica OBJE-CAMPUS). Nada se marca «existente» si solo está diseñado (R15).

## 2. Correcciones transversales del corpus al repo (patrón VIG-000)

1. **Nombres de archivos:** los RFCs proponen estructuras propias; la realidad es la del monorepo — `apps/api/src/routes/*.ts`, `packages/contracts/src/*.ts`, `packages/db/prisma/schema.prisma`.
2. **Estados en inglés** sobre columnas/valores reales (`received`, `resolved`, `published`, `vigente`…), no los estados en español de los RFCs.
3. **EV → `docs/EVIDENCIA.md`**: registro único; la EV se asigna al PR de registro, jamás se reserva (ECO-2).
4. **`LayerFeature` → `features`**: el modelo real del vocabulario CORE-002 expone `features` (con `is_synthetic=true` para features de diseño).
5. **Presupuesto/equipo (RFC-031):** no aplica al repo — proyecto personal sin aval institucional (nota de autoría del corpus); el repo acredita ejecución técnica, no gestión presupuestaria.
6. **UNSJ-fuera:** decisión DH — ninguna RFC involucra a la UNSJ como actora; el corpus entra como contenido (RAG), nunca como institución (ECO-5).

## 3. Tabla de contraste (36 RFCs)

| RFC | Título (catálogo fundacional) | Realidad del monorepo (13/11/2026) | Estado |
|---|---|---|---|
| RFC-001 | Arquitectura inicial de Obje Campus Territorio Vivo | Monorepo Turborepo+pnpm real: `apps/{api,web,worker}` + `packages/{contracts,db,redis}`; PostgreSQL+PostGIS; Redis Streams. La arquitectura canónica es la de `docs/ARCHITECTURE_STATE_v7.1.md`, no la propuesta del RFC | mapeado |
| RFC-002 | Modelo de datos académicos, territoriales, geoespaciales y de portafolios | Prisma real con `@map()` snake_case (ADR-003); dominios vivos: nodos/capas/categorías/features/reportes/ingestas/salud/convenios/avisos/amenazas/patrimonio/prácticas. El subdominio académico (cursos/competencias/portafolios) NO existe | parcial |
| RFC-003 | Infraestructura de datos, backups y continuidad | Postgres+PostGIS+Redis reales y probados en CI; backups con prueba trimestral acreditada (ECO-9) DISEÑADO, sin implementar | parcial |
| RFC-004 | Módulo curricular y experiencia académica inicial | Sin dominio curricular en el repo; el corpus DLUI-IT entra como contenido RAG futuro (ECO-5); matriz de trazabilidad curricular SQL propuesta (MVP-1) | futuro |
| RFC-005 | Catálogo de datos territoriales, atlas geoespacial y laboratorio GIS | Catálogo de fuentes (C6, dueño LIC-04) + capas de amenaza con procedencia por ingesta (LIC-R4, DL-9) + vocabulario público `/api/nodos`; laboratorio QGIS/Python integrado NO existe | parcial |
| RFC-006 | Identidad, autenticación, autorización, privacidad | JWT + roles + rate limit de identidad R5a (#101) reales; ADR-026 (API key → JWT por etapas); MFA/OAuth NO existen (R15: sin especular) | parcial |
| RFC-007 | Portafolios, evidencias, evaluación y certificación | Ancla real: `practica.acreditada` (LIC-R3, compuerta DL-7) + sellos; portafolio de estudiante NO existe | futuro |
| RFC-008 | Proyectos territoriales, PPS y vinculación institucional | Lado institucional vivo: `/api/convenios` (LIC-R9, DL-14, estados honestos); PPS/proyectos de estudiante NO existen | parcial |
| RFC-009 | IA responsable, RAG territorial y asistentes | Diseño ratificado completo (M8: ADR-078..081 — citas+abstención+responsable, fuentes autorizadas, activación asamblearia); SIN implementar (slices M8-S1..S5 #523..#527) | futuro |
| RFC-010 | Arquitectura de APIs, eventos e integraciones | Express + openapi v7.51.0 (79 paths) + `events_raw` con hash único (ADR-004) + Redis Streams en worker | mapeado |
| RFC-011 | UX/UI, sistema de diseño, accesibilidad | apps/web Vite con contrato de origen canónico (ADR-040, `lib/`); WCAG 2.2 AA como criterio EV (ADR-061) DISEÑADO; auditoría AA por slice pendiente | parcial |
| RFC-012 | Observabilidad, testing, calidad, CI/CD | CI de 8 checks (build/test/vertical/compuerta R9/scope/CodeQL/Analyze/report) + compuertas R9/R15; observabilidad de runtime NO existe | mapeado |
| RFC-013 | Roadmap, backlog fundacional y plan de piloto | Plan v1 ratificado + épica #458 (B→A→C) + Fase 0 social completa (#481, 46 slices #482..#527); el roadmap canónico es el del ecosistema, no el 2026–2027 del RFC | mapeado |
| RFC-014 | Plan de estudios consolidado, ciclo I | Contenido curricular del corpus (47 materias núcleo) — entra como RAG/contenido, no como dominio del repo (ECO-5) | futuro |
| RFC-015 | Ciclo II: planificación, instituciones, participación | Ídem RFC-014 | futuro |
| RFC-016 | Ciclo III: intervención, proyectos, ciencia de datos | Ídem RFC-014 | futuro |
| RFC-017 | Ciclo IV: resiliencia, IA, plataformas, TFC | Ídem RFC-014; la capa de resiliencia YA vive en el repo (amenazas LIC-R4, sellos honestos) | parcial |
| RFC-018 | Optativas, trayectorias y matriz de competencias | Corpus completo (103 optativas + 41 programas generados) en Drive; matriz de trazabilidad SQL propuesta para MVP-1 | futuro |
| RFC-019 | Reglamento académico, modalidades, TFC | Contenido del corpus; sin dominio en el repo | futuro |
| RFC-020 | **Especificación técnica y de contenido del MVP-1** | **CONFIRMADO como primer slice educativo** — insumos reales: KPIs LIC-R1 (observatorio vivo), capas del organismo (amenazas/acc./salud/comunicación/convenios), corpus DLUI como contenido RAG (ECO-5) | mapeado |
| RFC-021 | **Diseño detallado del módulo «Atlas Territorial»** | Base real: `GET /api/nodos` + capas/categorías/features/reportes públicos + panel observatorio; faltan wireframes y flujos de usuario del RFC | parcial |
| RFC-022 | Módulo «Portafolio y Evaluación» | Sin dominio de portafolios; rúbricas NO existen; ancla: evaluación participativa (M4-S4) y práctica acreditada | futuro |
| RFC-023 | Módulo «Catálogo de Datos y Laboratorio GIS» | Catálogo de fuentes C6 + ingestas con pipeline de procedencia (NC-EV-09); laboratorio integrado QGIS/SQL/Python NO existe | parcial |
| RFC-024 | Módulo «IA Responsable y RAG Territorial» | Ídem RFC-009 — diseño M8 ratificado, sin implementar | futuro |
| RFC-025 | Módulo «Gobernanza de Datos y Auditoría» | Anclas reales: ADR-027 anti-PII, sellos sin PII (ADR-045), k-anonimato gate (ADR-069, M9-S4), consentimiento granular DL-12 operativo (patrimonio); clasificación de sensibilidad en contracts pendiente | parcial |
| RFC-026 | Módulo «Identidad, Autenticación y Autorización» | Ídem RFC-006 | parcial |
| RFC-027 | Módulo «Notificaciones y Comunicación» | NO existe notificación personal; ancla honesta: `/api/comunicacion/avisos` (LIC-R8, DL-13 — comunicación pública con fuente+caducidad, jamás sirena) | parcial |
| RFC-028 | Módulo «Analítica, Reportes y BI» | `kpi_snapshots` + observatorio público (LIC-R1, 28 KPI_KEYS) con fichas metodológicas; BI NO existe; sin perfilado invasivo por diseño (anti-ranking) | parcial |
| RFC-029 | Módulo «Exportación, Interoperabilidad y APIs Públicas» | openapi.json público y versionado (v7.51.0); export GeoJSON/CSV/JSON-LD NO existe; federación OGC/IDERA pendiente (C6, a federar) | parcial |
| RFC-030 | Módulo «Portal Público, Comunicación Institucional y Reputación» | apps/web con panel del observatorio; sin portal institucional ni blog; canon de comunicación honesta ya es ley interna (DL-13) | parcial |
| RFC-031 | Plan integral de implementación, presupuesto y hoja de ruta 2026–2029 | Roadmap técnico vivo (épica #458, cronogramas consolidados); presupuesto/equipo fuera del alcance del repo (nota de autoría del corpus) | parcial |
| RFC-032 | Manual de operación, soporte y mantenimiento | README + ARCHITECTURE_STATE + MATRIZ_SELLOS como docs de operación; sin manual de soporte formal | parcial |
| RFC-033 | Estrategia de comunicación, difusión y comunidad | Canon LIC-08 (DL-13, ADR-079) como ley interna de toda comunicación; estrategia de difusión externa NO es código | parcial |
| RFC-034 | Estrategia de vinculación territorial, alianzas y cooperación | `/api/convenios` (LIC-R9) + federaciones semilla D3 (INAES/RUPEPYS/Dirección ESS SJ, enlazar no copiar) — convocatoria pendiente de la DH | parcial |
| RFC-035 | Estrategia de evaluación de impacto, mejora continua e investigación | Cruce explícito ratificado: Índice de Acogida (M9, ADR-053/066) ↔ RFC-035 ↔ observatorio LIC-R1; SROI rechazado por sustancia (ADR-067) | mapeado |
| RFC-036 | Compendio final, lecciones aprendidas y cierre fundacional | `docs/EVIDENCIA.md` como registro vivo (EV-001..111) + lecciones por sprint registradas en trazas | mapeado |

**Balance honesto:** 7 mapeados · 17 parciales · 12 futuros. Los «parciales» ya tienen ancla real en main; los «futuros» definen el backlog de la épica OBJE-CAMPUS.

## 4. MVP-1 confirmado — RFC-020/021 «Atlas Territorial»

- **Insumos ya en main:** vocabulario público de nodos/capas/categorías/features (CORE-002), KPIs del observatorio (LIC-R1), capas de amenaza con procedencia (LIC-R4), corpus DLUI-IT como contenido RAG autorizado (ECO-5, jamás actor).
- **Reglas que viajan:** estados honestos `null ≠ 0`, federación de trazas (IGN/MOP jamás de memoria), anti-ranking, WCAG 2.2 AA, geo sensible (patrón Iglesia).
- **Primer slice propuesto:** matriz de trazabilidad curricular (courses/competencies extendida con tracks/perfiles/learning_paths) + exposición pública del atlas por nodo.

## 5. Próximo paso (regla #460)

Crear la **épica OBJE-CAMPUS** con sub-issues derivados de esta tabla (los 12 «futuros» + los vacíos de los «parciales»), SOLO por orden expresa de la DH al ratificar este contraste.
