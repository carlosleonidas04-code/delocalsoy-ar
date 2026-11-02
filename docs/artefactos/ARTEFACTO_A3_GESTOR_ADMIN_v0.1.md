
# Artefacto A3 — Gestor y admin de nodo (v0.1)

> **ESPECIFICACIÓN FUNCIONAL v0.1 — propuesta para ratificación DH (R9).** 🟢 en main · 🟡 en rama/PR (cola de merge) · ◇ propuesto.
> **Base:** main @ `77500be` · 2026-10-29 — cola de merge: 31 PRs abiertos, CI en pausa (pre-activación #262).

## 1. Roles con acceso

| Rol | Autenticación | Techo | Acceso al artefacto |
| --- | --- | --- | --- |
| moderador | JWT | 100 req/min | bandeja de moderación (reportes, productos, comercios, fichas) |
| gestor | JWT | 100 req/min | curación de fuentes y datos del nodo (granularidad por nodo ◇) |
| custodio_territorial | JWT | 100 req/min | custodia patrimonial (ficha + visibilidad ADR-036) |
| admin_nodo | JWT | 500 req/min | todo el pipeline del nodo; **único que publica ingestas** |
| admin_hitub | JWT | 500 req/min | federación entre nodos (Capital, Caucete, Valle de Iglesia) |

## 2. Componentes

| # | Componente | Qué hace | Estado |
| --- | --- | --- | --- |
| 1 | Bandeja de moderación de reportes | PATCH `/api/reportes/:id/estado` — matriz `REPORTE_TRANSICIONES`, justificación pública ≥10 chars (ADR-038), sello `reporte.estado_cambiado` con `moderador_hash` + rollback | 🟢 R3 (#211, EV-053) |
| 2 | Moderación de productos | PATCH `/api/productos/:id/estado` — propuesto → aprobado\|rechazado\|archivado, 409 sin transición | 🟢 VIG-005 (EV-045) |
| 3 | Moderación de comercios | matriz `COMERCIO_TRANSICIONES`, verificación de titularidad, habilitación SIIC | 🟡 MK-1/MK-2 (PRs #246–#250 y #251/#254) |
| 4 | Custodia patrimonial | PATCH patrimonio: upsert, transición de visibilidad (public\|generalized\|restricted), `custodio_hash` sha32; `sensible_nota` SOLO en canal de gestión, nunca en GET público | 🟢 VIG-004 (EV-044) |
| 5 | Catálogo de fuentes y pipeline de ingestas | `fuentes` + `ingestas`: recibido → validado_tecnicamente → validado_territorialmente → publicado — **solo admin publica**; lectura pública solo de lo publicado | 🟢 #200 (EV-049) |
| 6 | KPIs del nodo | consumidor `vig003-kpi` con recompute idempotente; `restricted` excluido del cálculo; count 0 honesto | 🟢 VIG-003 (EV-043) |
| 7 | Corroboración de fichas de valoración | testimonio → corroborada \| descartada (individual o de taller) | 🟢 #196 (EV-038) |
| 8 | Alcance por nodo | JWT con scope de nodo (`NODE_SCOPE_FORBIDDEN`) — un gestor de Caucete no modera Capital | ◇ diseño lote-2 (PR #136 trabado); a ratificar |

## 3. Matriz de permisos componente × rol

| Componente | moderador | gestor | custodio_territorial | admin_nodo | admin_hitub |
| --- | --- | --- | --- | --- | --- |
| Moderar reportes | sí (justificación) | — | — | sí | sí |
| Moderar productos/comercios | sí | — | — | sí | sí |
| Custodia patrimonial | sí | — | sí | sí | sí |
| Validar ingestas (téc./territorial) | — | sí | — | sí | sí |
| **Publicar ingestas** | — | — | — | **solo admin** | sí |
| KPIs del nodo | leer | leer | leer | leer | leer |
| Federación entre nodos | — | — | — | — | sí |

## 4. Atribuciones y competencias

- **Moderar = dejar traza:** toda transición lleva justificación pública + sello con `moderador_hash` + rollback; no existe el borrado silencioso (ADR-032/038).
- **Validar sin fabricar:** la validación territorial exige procedencia (ADR-035); un dato sin fuente no se publica, aunque "se sepa" (R15).
- **Custodiar sin exponer:** en modo protegido el sitio vulnerable publica solo punto de acceso/mirador; `sensible` se publica NULL honesto con `sensible_status='sin_relevamiento'` (ADR-036, Leyes 25.743/6.801/7.911).
- **Publicar es un acto de gobierno:** solo admin publica ingestas (decisión DH 2026-10-15) — el dato publicado compromete al nodo.
- **Sin PII en la gestión:** moderadores y gestores operan sobre hashes, nunca sobre identidades (Ley 25.326).

## 5. Qué ve / qué jamás ve

**Ve:** bandejas con estados y justificaciones, fichas completas de lo que modera (incl. `sensible_nota` en canal de gestión), pipeline de ingestas con sellos, KPIs computados.

**Jamás ve:** identificador en claro de ciudadanos o titulares (CUIT/expediente → hash), PII de escritores, moderaciones sin dejar sello (técnicamente imposible), publicar sin pasar el pipeline.

## 6. Trazabilidad

Reportes: #206, EV-051..056 · Productos: VIG-005 (EV-045) · Patrimonio: VIG-004 (EV-044) · Fuentes/ingestas: #200 (EV-049) · KPIs: #182 (EV-043) · Fichas: #149 (EV-038) · Comercios: MK-0 #244, MK-1 #246–#250, MK-2 #251/#254 · Scope por nodo: diseño lote-2 / #136.

---

> **Serie ARTEFACTOS-ROLES v0.1** — issue #266 · 2026-10-29 · base main @ `77500be`. Propuesta a ratificación DH (R9); sin merge sin CI verde (R15).