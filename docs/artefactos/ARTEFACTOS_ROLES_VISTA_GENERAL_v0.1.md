
# Los cuatro artefactos — Roles, accesos y permisos (v0.1)

> **ESPECIFICACIÓN FUNCIONAL v0.1 — propuesta para ratificación de la Dirección Humana (R9).** GitHub acredita; este documento no implementa nada (R15). Estado por componente: 🟢 en main (acreditado por EV) · 🟡 en rama/PR sin merge (cola de merge, CI en pausa) · ◇ propuesto sin aterrizar.
> **Base:** main @ `77500be` · 2026-10-29 — cola de merge: 31 PRs abiertos, CI en pausa (pre-activación #262).

## 1. Principios

1. **Cuatro puertas a la misma casa** — A1–A4 son vistas sobre el mismo dato territorial (PostGIS + sellos en `events_raw`), nunca bases paralelas.
2. **Permiso por rol, no por persona** — la identidad individual vive solo como pseudónimo (hash); el sistema autoriza competencias, no nombres (Ley 25.326, ADR-027).
3. **Escribir = dejar sello** — toda escritura pasa por contrato Zod → sello inmutable en `events_raw` con rollback; nada se escribe en silencio (ADR-032).
4. **Lo que un rol no puede ver, no existe para él** — `restricted` responde 404 sin eco (ADR-036); `descartado`/`discarded`/`rechazado` nunca son públicos.
5. **Lo público solo es lo publicado** — la lectura pública ve lo aprobado/validado + publicado; nada llega a `verified` sin procedencia trazable (ADR-035).

## 2. Tabla RBAC real (fuente primaria: `ROLE_RATE_LIMITS_PER_MINUTE` del lote-2)

| Escalón | Roles | Techo req/min |
| --- | --- | --- |
| Lectura pública | visitante (sin JWT) | 10 |
| Escritura ciudadana | ciudadano, vecino | 10 |
| Operación económica | operador_campo, comerciante | 50 |
| Gestión y moderación | gestor, custodio_territorial, moderador | 100 |
| Gobernanza y auditoría | auditor, admin_nodo, admin_hitub | 500 |

Notas honestas:
- El rol `comerciante` de la tabla pertenece hoy al canal live-ws; en el dominio `comercios`, la titularidad es un **estado de la ficha** (`sin_reclamo → reclamada → verificada`), no un rol de usuarios (MK-1).
- `vecino` existe en la tabla pero v1 no lo diferencia del ciudadano (◇ propuesta de diferenciación a ratificar).
- Hoy el repo exige explícitamente `moderador|admin` en las rutas PATCH; la granularidad restante (gestor por nodo, auditor) es esta propuesta v0.1.

## 3. Matriz de acceso artefacto × rol

| Rol | A1 Vecino/ciudadano | A2 Comerciante | A3 Gestor de nodo | A4 Auditor/datos abiertos |
| --- | --- | --- | --- | --- |
| visitante | leer | leer | — | leer (datos abiertos) |
| ciudadano | leer + escribir | proponer comercio | — | — |
| vecino | leer + escribir | proponer | — | — |
| comerciante / titular verificado | leer | reclamar titularidad, editar ficha | — | — |
| gestor / custodio_territorial | leer | leer | custodia patrimonial, curación de fuentes | leer |
| moderador | leer | moderar (con justificación pública) | bandeja de moderación | leer |
| auditor | leer | leer | leer | auditar libro contable |
| admin_nodo | leer | moderar | todo el pipeline del nodo (solo admin publica ingestas) | leer |
| admin_hitub | leer | moderar | federación entre nodos | leer |

Convención: **leer** = GET público de lo publicado · **escribir** = POST con JWT y pseudónimo · **moderar** = PATCH con justificación y sello · **—** = sin acceso.

## 4. Atribuciones transversales (quién firma qué)

| Acción | Atribución técnica | Regla |
| --- | --- | --- |
| Escritura ciudadana | `created_by_hash` (sha256 truncado) | anti-PII antes de persistir (ADR-027) |
| Moderación | `moderador_hash` + justificación pública ≥10 chars | matriz de transiciones sellada; 409 sin transición (ADR-038) |
| Custodia patrimonial | `custodio_hash` (sha32) | transición de visibilidad ADR-036 |
| Titularidad comercial | `titularidad.reclamado_por_hash`; identificador CUIT/expediente SIEMPRE hash | Ley 25.326 |
| Consentimiento | nunca pre-marcado; nombre de actor solo con `consent_confirmed: true` | ADR-027 |
| Publicación de ingestas | solo `admin` | decisión DH 2026-10-15 (#200, EV-049) |

## 5. Roles del método vs roles de la plataforma

- **Plataforma:** los 11 roles de la tabla RBAC (§2) — viven en la base y el JWT.
- **Método HITUB:** DH (ratifica, R9), agent-vibe (implementa), agent-google (diseña/stage), Perplexity (investiga). Su gobernanza vive en GitHub (issues ↔ PR ↔ EV ↔ SHA ↔ docs), no como roles de plataforma.

## 6. Artefactos de esta serie

1. [ARTEFACTO_A1_VECINO_CIUDADANO_v0.1.md](ARTEFACTO_A1_VECINO_CIUDADANO_v0.1.md) — Vecino, ciudadano y visitante (escritura ciudadana, 10 req/min)
2. [ARTEFACTO_A2_COMERCIANTE_v0.1.md](ARTEFACTO_A2_COMERCIANTE_v0.1.md) — Comerciante (economía con titularidad verificada, 50 req/min)
3. [ARTEFACTO_A3_GESTOR_ADMIN_v0.1.md](ARTEFACTO_A3_GESTOR_ADMIN_v0.1.md) — Gestor y admin de nodo (moderación, custodia y curación, 100–500 req/min)
4. [ARTEFACTO_A4_AUDITOR_DATOS_ABIERTOS_v0.1.md](ARTEFACTO_A4_AUDITOR_DATOS_ABIERTOS_v0.1.md) — Auditor y datos abiertos (libro contable, 500 req/min)

## 7. Pendientes de ratificación DH

- Diferenciación v1 del rol `vecino` vs `ciudadano` (hoy idénticos).
- Granularidad de `gestor` por nodo (JWT alcance por nodo, `NODE_SCOPE_FORBIDDEN` del diseño lote-2) — aún sin aterrizar completo (PR #136 trabado).
- Canal live-ws (#123): sin auth en main — gate de auth en PR #236 (abierto).
- Cola de merge (31 PRs abiertos, CI en pausa; pre-activación #262): comercios MK-1 (#246–#250) y MK-2 (#251/#254), reportes R5/R6 (#219/#220), VIG-008/009 (#252/#253), fuentes VIG (#234) y live-ws auth (#236) aterrizan al volver el CI.

---

> **Serie ARTEFACTOS-ROLES v0.1** — issue #266 · 2026-10-29 · base main @ `77500be`. Propuesta a ratificación DH (R9); sin merge sin CI verde (R15).