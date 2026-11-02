
# Artefacto A1 — Vecino, ciudadano y visitante (v0.1)

> **ESPECIFICACIÓN FUNCIONAL v0.1 — propuesta para ratificación DH (R9).** 🟢 en main (EV acreditada) · 🟡 en rama/PR sin merge · ◇ propuesto.
> **Base:** main @ `77500be` · 2026-10-29 — cola de merge: 31 PRs abiertos, CI en pausa (pre-activación #262).

## 1. Roles con acceso

| Rol | Autenticación | Techo | Acceso al artefacto |
| --- | --- | --- | --- |
| visitante | sin JWT | 10 req/min | solo lectura pública — caso de prueba de honestidad |
| ciudadano | JWT | 10 req/min | lectura + escritura ciudadana con pseudónimo |
| vecino | JWT | 10 req/min | idéntico a ciudadano en v1 (diferenciación ◇ a ratificar) |

## 2. Componentes

| # | Componente | Qué hace | Estado |
| --- | --- | --- | --- |
| 1 | Mapa y territorio | nodos, subnodos, capas, features, corredores provisionales (`boundary_status` visible) | 🟢 GET públicos |
| 2 | Reporte ciudadano | POST `/api/reportes` (recibe sugeridos por proximidad), `/mios`, historial público | 🟢 R2–R4 (#207–#214, EV-051..054) · sugeridos ST_DWithin y E2E vertical 🟡 PR #219/#220 |
| 3 | Ficha de valoración de espacio público | 7 dimensiones, testimonio → corroborada \| descartada | 🟢 #196 (EV-038) |
| 4 | Banco de Potencialidades (Bloque 9) | ver oportunidades públicas; postular con evidencia obligatoria y consentimiento de actores | 🟢 #160 (EV-039) |
| 5 | Observaciones patrimoniales | testimonio → corroborado, idempotencia por hash, estado global siempre null honesto | 🟡 PR #253 (VIG-009, Achango) |
| 6 | Directorio y producción | activos, productos, operativa (solo lo aprobado+public) | 🟢 VIG-002/005 |
| 7 | Comercios (lectura) | ficha pública, habilitación con estado epistémico | 🟡 MK-1 PRs #246–#250 en cola |
| 8 | KPIs públicos | set honesto v1, count 0 honesto | 🟢 VIG-003 (EV-043) |
| 9 | Asistente territorial RAG | respuestas solo sobre contenido autorizado; unknown de primera clase | ◇ VIG-006 (#188) — las demos existentes se etiquetan "demo" (R15) |

## 3. Matriz de permisos componente × rol

| Componente | visitante | ciudadano | vecino |
| --- | --- | --- | --- |
| Mapa y territorio | leer | leer | leer |
| Reportes | leer | escribir + ver propios (`/mios`) | igual |
| Ficha de valoración | leer | escribir (testimonio) | igual |
| Oportunidades (ver) | leer | leer | leer |
| Oportunidades (postular) | — | escribir con evidencia | igual |
| Observaciones patrimoniales | leer | escribir (testimonio) | igual |
| Productos/comercios (lectura) | leer | leer | leer |
| KPIs | leer | leer | leer |

## 4. Atribuciones y competencias

- **Testimonio, no veredicto:** lo que escribe el ciudadano nace `testimonio`/`propuesto`/`received` — la moderación ES la validación comunitaria; nunca `verified` por escribir.
- **Evidencia obligatoria:** una oportunidad sin evidencia no se acepta (Bloque 9); el registro comunitario está sujeto a revisión.
- **Consentimiento explícito:** nunca pre-marcado; nombre de actor solo con `consent_confirmed: true` (ADR-027).
- **Pseudónimo:** toda escritura firma `created_by_hash`; sin PII (Ley 25.326).
- **Duplicados = sugerencia:** el sistema sugiere reportes cercanos (ST_DWithin, ADR-039); nunca fusiona automáticamente.
- **Accesibilidad:** WCAG AA como criterio de plataforma (propuesta de elevación, Ley 26.653).

## 5. Qué ve / qué jamás ve

**Ve:** lo publicado con su estado epistémico honesto (4 estados honestos: verified / community_validated / pending / synthetic), el historial público de moderación con justificaciones, fuentes y procedencia (ADR-035).

**Jamás ve:** geometría o ficha de sitios `restricted` (404 sin eco, solo punto de acceso/mirador en modo protegido), `sensible`/`sensible_nota` (NULL honesto), reportes `descartado` ajenos (visible solo en `/mios` con justificación), oportunidades `discarded`, PII de terceros, promesas de plazos (túnel, capacidad).

## 6. Trazabilidad

Reportes: #206 (épica CORE-005), EV-051..056 · Ficha: #149, EV-038 · Oportunidades: #152/#158, EV-039 · KPIs: #182, EV-043 · Observaciones: VIG-009 PR #253 · Cooperativas: VIG-008 PR #252 · Estados honestos: #150 (tokens `--honest-*`).

---

> **Serie ARTEFACTOS-ROLES v0.1** — issue #266 · 2026-10-29 · base main @ `77500be`. Propuesta a ratificación DH (R9); sin merge sin CI verde (R15).