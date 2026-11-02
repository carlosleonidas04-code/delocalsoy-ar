
# Artefacto A4 — Auditor y datos abiertos (v0.1)

> **ESPECIFICACIÓN FUNCIONAL v0.1 — propuesta para ratificación DH (R9).** 🟢 en main · 🟡 en rama/PR (cola de merge) · ◇ propuesto.
> **Base:** main @ `77500be` · 2026-10-29 — cola de merge: 31 PRs abiertos, CI en pausa (pre-activación #262).

## 1. Roles con acceso

| Rol | Autenticación | Techo | Acceso al artefacto |
| --- | --- | --- | --- |
| cualquier persona (datos abiertos) | sin JWT | 10 req/min | lectura de lo publicado + historiales públicos |
| auditor | JWT | 500 req/min | verificación de procedencia y del libro contable completo del nodo |

## 2. Componentes

| # | Componente | Qué hace | Estado |
| --- | --- | --- | --- |
| 1 | Libro contable (`events_raw`) | sellos inmutables 1:1 con cada transición; nada se borra, todo se compensa | 🟢 ADR-032 |
| 2 | Historiales públicos derivados de sellos | reportes (ADR-038, #213 EV-054) y comercios (MK-2, F-3) — nunca tabla mutable | 🟢 reportes · 🟡 comercios (MK-2, PR #254) |
| 3 | Cadena de acreditación | issue ↔ PR ↔ EV ↔ SHA ↔ docs (EVIDENCIA.md, compuerta R9, label `r9-ratificado`) — GitHub acredita | 🟢 |
| 4 | Fuentes e ingestas públicas | `GET /api/fuentes`, `?nodo=` en ingestas — solo lo publicado; 15 fuentes con cautelas | 🟢 #200 (EV-049) |
| 5 | KPIs públicos | set honesto v1 (cobertura geométrica null honesto, counts 0 honestos) | 🟢 VIG-003 (EV-043) |
| 6 | Ficha pública patrimonial | la declaratoria es registro público — existe ficha también para `restricted`, sin el punto propio del activo | 🟢 VIG-004 |
| 7 | Export/verificación por hashes | md5/SHA por archivo y blob SHA por push — la integridad es verificable por terceros | 🟢 (mecánica de lotes) |
| 8 | Tamiz de 13 dimensiones (P-10) + historial de acreditación (P-09) | criterios de auditoría de datos abiertos | ◇ por diseñar como checklist operativo |

## 3. Matriz de permisos componente × rol

| Componente | público | auditor |
| --- | --- | --- |
| Historiales públicos (lo publicado) | leer | leer |
| KPIs y fuentes | leer | leer |
| Sellos `events_raw` (vía endpoints públicos derivados) | leer (derivados) | leer + verificar consistencia |
| Verificación de procedencia (ADR-035) | por ficha | por dominio |
| Escritura de dominio | — | **jamás** (el auditor no muta) |
| PII / sensible / restricted | — | — (404 sin eco; el auditor tampoco los ve en claro) |

## 4. Atribuciones y competencias

- **Datos abiertos = accesible + procedente + auditable:** sin las tres, no es abierto (ADR-035 + libros contables).
- **Reconstruir cualquier decisión:** cada estado visible debe poder explicarse con sellos + justificaciones + fuentes — el auditor reproduce la cadena, no confía en la UI.
- **Auditar sin mutar:** el rol auditor no cambia datos de dominio; sus hallazgos se registran como issues/informes R12 (el canal de gobierno es GitHub, no la base).
- **Nada verificado sin fuente:** `verified` exige procedencia; el auditor puede degradar una afirmación a `unknown` si la cadena se rompe.
- **Privacidad como límite de la auditoría:** auditar no autoriza ver PII; los sellos ya viven sin PII (anti-PII antes de persistir).

## 5. Qué ve / qué jamás ve

**Ve:** todo lo publicado con procedencia, historiales completos de moderación con justificaciones, sellos con hashes, KPIs con sus estados honestos, la cadena GitHub (issues/PRs/EVs/ADRs) pública.

**Jamás ve:** PII en claro (no existe en los sellos), `sensible`/`sensible_nota` (NULL honesto), geometría exacta de sitios protegidos, registros `discarded`/`descartado` de terceros, identidades detrás de los pseudónimos.

## 6. Trazabilidad

ADR-032 (events_raw + Redis Streams) · ADR-035 (fuentes científicas/procedencia) · ADR-038 (transparencia como contrato) · ADR-039 (duplicados = sugerencia) · CORE-005 R4 (#213, EV-054) · Fuentes/ingestas (#200, EV-049) · KPIs (#182, EV-043) · Patrimonio (VIG-004, EV-044) · P-09/P-10 (DESIGN.md del lote-1).

---

> **Serie ARTEFACTOS-ROLES v0.1** — issue #266 · 2026-10-29 · base main @ `77500be`. Propuesta a ratificación DH (R9); sin merge sin CI verde (R15).