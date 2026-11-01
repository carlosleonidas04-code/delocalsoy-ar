# Numeración EV — tabla F0-C1

Propósito: fijar la asignación de números EV **antes** de la cascada de registros post-merge (cierre del conflicto abierto F0-C1: EV-057 llegó a estar reclamada dos veces). Regla: el número se escribe en `docs/EVIDENCIA.md` solo al registrar el merge, anclado al SHA real (patrón PR #208). EV-055 y EV-056 ya están reclamadas por CORE-005.

| EV | PR | Entregable | Notas |
| --- | --- | --- | --- |
| EV-055 | #219 | CORE-005 R5 — duplicados sugeridos | reclamada |
| EV-056 | #220 | CORE-005 R6 — flujo vertical de reportes | reclamada; cierra #206 6/6 |
| EV-057 | #216 | NUT-CAP-008 — paquete de nutrición Capital | resolvió la doble reclamación |
| EV-058 | #217 | Sondeo UNIDE (NUT-CAP-010) | |
| EV-059 | #218 | Verificación normativa Capital | |
| EV-060 | #224 | UX-002 — InputManager + navegación | |
| EV-061 | #227 | UX-003 — PWA offline honesto | |
| EV-062 | #229 | UX-004 — demo TV 10-foot | apilado sobre #224 |
| EV-063 | #230 | NVIG-R1 — vocabulario VIG | cierra #168 |
| EV-064 | #231 | NVIG-R3 — VIG-000-ALCANCE | cierra #170 |
| EV-065 | #234 | NVIG-R5 — fuentes VIG (16) | cierra #172 |
| EV-066 | #235 | AUD-09 — frozen-lockfile | cierra #104 |
| EV-067 | #236 | live-ws — auth + rate gates | cierra #123 |
| EV-068 | #233 | Serie contracts NCAP-R2 | registro al merge de la serie |
| EV-069 | #242 | VIG-008/009 — diseños + fichas cooperativas | fichas SIN seed (consentimiento pendiente) |
| EV-070 | #246–#250 | MARKET-CAP MK-1 — directorio de proximidad | EV única del paquete; ancla al cierre (#250) |
| EV-071 | #252 | VIG-008 — cooperativas (implementación) | tras #234 |
| EV-072 | #253 | VIG-009 — Achango (implementación) | tras #252 |
| EV-073 | #254 | MARKET-CAP MK-2 — confianza | tras la cascada MK-1 |
| EV-074 | #255 | NODO-CAU R6 — subnodos Caucete (10 Georef) | |

PRs sin EV (documental/estética, patrón #148): #225 (F0 + RFC-027), #232 (volcado ADR-037/038/039), #237 (reporte stage + tokens epistémicos), #238 (stage componentes parciales, ADR-034), #244 (MK-0 diseño), #251 (MK-2 diseño), #257 (CAU-001 doc rector stage Caucete).

Próximo número libre: **EV-075**.

Esta tabla es mecánica (no requería ratificación de contenido para proponerse) y fue aterrizada por directiva de la DH del 2026-10-26. Cambios de asignación: editar este archivo en un PR propio con traza.
