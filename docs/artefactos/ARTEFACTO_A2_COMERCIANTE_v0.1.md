
# Artefacto A2 — Comerciante (v0.1)

> **ESPECIFICACIÓN FUNCIONAL v0.1 — propuesta para ratificación DH (R9).** 🟢 en main · 🟡 en rama/PR (cola de merge, CI en pausa) · ◇ propuesto.
> **Base:** main @ `77500be` · 2026-10-29 — cola de merge: 31 PRs abiertos, CI en pausa (pre-activación #262).

## 1. Roles con acceso

| Rol | Autenticación | Techo | Acceso al artefacto |
| --- | --- | --- | --- |
| visitante | sin JWT | 10 req/min | lectura del directorio público |
| ciudadano | JWT | 10 req/min | proponer un comercio (nace `propuesto`) |
| comerciante / titular verificado | JWT | 50 req/min | reclamar titularidad y, verificado, editar su ficha |
| moderador / admin | JWT | 100–500 req/min | aprobar, verificar titularidad, actualizar habilitación |

Nota de dominio (MK-1): la titularidad es un **estado de la ficha** (`sin_reclamo → reclamada → verificada`), no un rol de la tabla usuarios; el rol `comerciante` de los rate limits pertenece al canal live-ws.

## 2. Componentes

| # | Componente | Qué hace | Estado |
| --- | --- | --- | --- |
| 1 | ComercioCard con sello | la acreditación (GitHub/procedencia) es distinta del estado epistémico del dato | 🟡 con MK-1 (PRs #246–#250 en cola) |
| 2 | Ficha de comercio | rubro (join por código a la taxonomía del directorio), atributos, consentimientos granulares por campo | 🟡 MK-1 |
| 3 | Habilitación (Ley 104-A / SIIC) | estados epistémicos: verificada \| en_tramite \| silencio_positivo \| unknown \| sin_dato — verificada SOLO con evidencia primaria (ADR-035) | 🟡 MK-2 (PR #254; PATCH habilitación, seed `fuente_siic_web`; verificación individual ≠ padrón bulk) |
| 4 | Titularidad | reclamo con CUIT o expediente SIIC (identificador SOLO hash), verificación moderador\|admin, edición solo del titular; desistimiento con sello | 🟡 MK-1/MK-2 |
| 5 | Historial de confianza | transiciones 1:1 derivadas de sellos `comercio.*` en `events_raw` (F-3), identificador_hash JAMÁS en la respuesta | 🟡 MK-2 (PR #254; openapi v7.26.0 planificada) |
| 6 | Ofertas/productos | reutiliza `productos` 1:N de VIG-005; precio/vigencia opcionales en MK-3 — nunca tabla paralela | 🟢 base VIG-005 · 🟡 MK-3 |
| 7 | Marketplace | deliberadamente en Fase 2 (mes 12–24, roadmap §5.6): sin pagos, sin promesas | ◇ por diseño |

## 3. Matriz de permisos componente × rol

| Componente | visitante | ciudadano (proponente) | titular verificado | moderador/admin |
| --- | --- | --- | --- | --- |
| Directorio (lo aprobado+public) | leer | leer | leer | leer |
| Alta de comercio | — | escribir (propuesto) | escribir | escribir |
| Reclamo de titularidad | — | escribir | — (ya es titular) | — |
| Verificación de titularidad | — | — | — | moderar |
| Edición de atributos | — | — | escribir (solo su ficha) | moderar |
| Habilitación SIIC | — | — | escribir (con evidencia) | moderar |
| Ofertas/productos | leer (aprobados) | escribir (propuesto) | escribir | moderar |
| Historial | leer | leer | leer | leer |

## 4. Atribuciones y competencias

- **Ciclo de vida:** ciudadano propone (testimonio) → titular reclama (CUIT/expediente + consentimiento granular) → moderador aprueba con justificación pública (ADR-038) → la evidencia primaria SIIC verifica SOLO el campo habilitación (ADR-035).
- **Consentimiento granular por campo:** nunca pre-marcado; cada atributo publicado requiere consentimiento propio (ADR-027, Ley 25.326).
- **Identificador siempre hash:** ni el propio titular ve su CUIT en claro una vez recla­mado; la ficha pública jamás lo expone.
- **Rechazado nunca público:** `rechazado`/`archivado` salen del directorio y de la ficha (404 sin eco, ADR-036).
- **Frontera de regímenes:** habilitación comercial (Ley 104-A, municipal/silencio positivo) ≠ habilitación turística (Ley 2400-T, VIG-005) — regímenes legales distintos documentados en ambos lados.

## 5. Qué ve / qué jamás ve

**Ve:** su ficha con estado de titularidad y habilitación, el historial de transiciones con justificaciones, ofertas propias.

**Jamás ve:** identificador en claro (propio o ajeno), expedientes ajenos, fichas `rechazado`/`archivado`/`restricted` de terceros, datos de contacto sin consentimiento, moderaciones sin justificación pública.

## 6. Trazabilidad

MK-0 doc de decisiones (#244) · MK-1 API + 12 tests E2E (cascada #246–#250) · MK-2 confianza (PR #254 código + #251 diseño) · Directorio: #215 (stage Capital) · VIG-005 productos (EV-045) · Fuentes SIIC: #200 (EV-049).

---

> **Serie ARTEFACTOS-ROLES v0.1** — issue #266 · 2026-10-29 · base main @ `77500be`. Propuesta a ratificación DH (R9); sin merge sin CI verde (R15).