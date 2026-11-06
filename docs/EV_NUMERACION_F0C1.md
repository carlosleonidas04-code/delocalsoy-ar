# Numeración EV — tabla F0-C1

Propósito: fijar la asignación de números EV **antes** de la cascada de registros post-merge (cierre del conflicto abierto F0-C1: EV-057 llegó a estar reclamada dos veces). Regla: el número se escribe en `docs/EVIDENCIA.md` solo al registrar el merge, anclado al SHA real (patrón PR #208).

Estado de esta revisión (2026-11-06, actualización M0): la cascada de 31 PRs se mergeó tras la restauración de Actions (2026-11-01) y EV-055..EV-081 quedaron **registradas** en `docs/EVIDENCIA.md`. Esta tabla refleja ahora los anclajes REALES del registro; las divergencias con la asignación original quedan documentadas en Notas.

| EV | PR | Entregable | Notas |
| --- | --- | --- | --- |
| EV-055 | #219 | CORE-005 R5 — duplicados sugeridos | registrada |
| EV-056 | #220 | CORE-005 R6 — flujo vertical de reportes | registrada; cierra #206 6/6 |
| EV-057 | #216 | NUT-CAP-008 — paquete de nutrición Capital | registrada |
| EV-058 | #217 | Sondeo UNIDE (NUT-CAP-010) | registrada |
| EV-059 | #218 | Verificación normativa Capital | registrada |
| EV-060 | #224 | UX-002 — InputManager + navegación | registrada |
| EV-061 | #226 | UX-003 — PWA offline honesto | registrada; ancla real #226 (no #227 como se reclamó) |
| EV-062 | #229 | UX-004 — demo TV 10-foot | registrada |
| EV-063 | #230 | NVIG-R1 — vocabulario VIG | registrada; cierra #168 |
| EV-064 | #231 | NVIG-R3 — VIG-000-ALCANCE | registrada; cierra #170 |
| EV-065 | #234 | NVIG-R5 — fuentes VIG (16) | registrada; cierra #172 |
| EV-066 | #354 | AUD-09 — frozen-lockfile | registrada; re-anclada #235→#354 (regeneración del lockfile) |
| EV-067 | #236 | live-ws — auth + rate gates | registrada; cierra #123 |
| EV-068 | #233 | Serie contracts NCAP-R2 | registrada |
| EV-069 | #242 | VIG-008/009 — diseños + fichas cooperativas | registrada; fichas SIN seed |
| EV-070 | #299 | MARKET-CAP MK-1 — directorio de proximidad | registrada; re-anclada #250→#299 |
| EV-071 | #300 | VIG-008 — cooperativas (implementación) | registrada; re-anclada #252→#300 |
| EV-072 | #301 | VIG-009 — Achango (implementación) | registrada; re-anclada #253→#301 |
| EV-073 | #302 | MARKET-CAP MK-2 — confianza | registrada; re-anclada #254→#302 |
| EV-074 | #304 | NODO-CAU R6 — subnodos Caucete (10 Georef) | registrada; re-anclada #255→#304 |
| EV-075 | #359 | PR-2 /lab — laboratorio bajo la ruta apartada `#lab` | registrada (2026-11-04) |
| EV-076 | #363 | NCAP-R6-ext (#165) — extensiones del dominio oportunidades | registrada |
| EV-077 | #365 | NCAP-R4 (#156) — red de corredores v0.1 del nodo Capital | registrada |
| EV-078 | #367 | NCAP-R3 (#155) — catálogo de fuentes espaciales del nodo Capital | registrada |
| EV-079 | #369 | NCAP-R1 (#153) — vocabulario del nodo Capital | registrada |
| EV-080 | #371 | NCAP-R5 (#157) — accesibilidad del nodo Capital | registrada |
| EV-081 | #373 | NCAP-FE-163 — integración del frontend del Nodo Capital | registrada |
| EV-082 | — | RESERVADA: registro NC-R4 (#139, cruce in-situ Caucete) | reservada; sin registro aún |
| EV-083 | #383 | VIG-010 (#381) — vocabulario vial del Valle de Iglesia | registrada (registro en #384) |
| EV-084 | #385 | VIG-011 (#378) — AMC: reportes + mediadores | registrada (registro en #386) |
| EV-085 | #387 | VIG-012 (#379) — pedidos formales | registrada (registro en #388) |
| EV-086 | #389 | VIG-013 (#382) — dashboard infraestructura y movilidad | registrada (registro en #390) |
| EV-087 | #391 | VIG-014 (#380) — frontend del módulo | registrada (registro en #392) |

PRs sin EV (documental/estética, patrón #148): #225 (F0 + RFC-027), #232 (volcado ADR-037/038/039), #237 (reporte stage + tokens epistémicos), #238 (stage componentes parciales, ADR-034), #244 (MK-0 diseño), #251 (MK-2 diseño), #257 (CAU-001 doc rector stage Caucete). Fixes sin EV (precedente #298 — corrección de paridad demo): #393 (subnodos demo del nodo iglesia).

Próximo número libre: **EV-088** (EV-082 reservada al registro NC-R4 #139).

Esta tabla es mecánica y fue aterrizada por directiva de la DH del 2026-10-26; revisada contra `docs/EVIDENCIA.md` el 2026-11-06 (actualización M0, PR de docs con traza en #258). Cambios de asignación: editar este archivo en un PR propio con traza.
