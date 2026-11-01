# Índice maestro — Nutrición del Nodo Capital

**Proyecto:** DELocalSoy.AR  
**Nodo:** Capital  
**Base:** main @ 77500be  
**Issue asociado:** #215  
**Fecha:** 2026-10-15  
**Responsable:** agent-vibe  

## 1. Paquete documental

| Orden | Archivo | Bloque | Propósito |
|---|---|---|---|
| 1 | `docs/nodo-capital/NUTRICION-CAPITAL-TRABAJO.md` | A | Reglas, fuentes, unknowns y Definition of Done |
| 2 | `docs/nodo-capital/PEDIDOS-FORMALES-CAPITAL.md` | C | Pedidos formales base |
| 3 | `docs/nodo-capital/SOLICITUDES-FORMALES-CAPITAL.md` | C | Texto completo de solicitudes |
| 4 | `docs/nodo-capital/BLOQUE-B-UNIDE-SONDEO.md` | B | Sondeo técnico de UNIDE |
| 5 | `docs/nodo-capital/BLOQUE-D-VERIFICACION-NORMATIVA.md` | D | Matriz normativa y RUMAE |
| 6 | `docs/nodo-capital/BLOQUE-E-UI-ESTADOS-EPISTEMICOS.md` | E | UI honesta ✓ / ◐ / ◇ |
| 7 | `docs/nodo-capital/BLOQUE-F-ACTIVACION-STAGE-CAPITAL.md` | F | Activación del stage de doble lente |
| 8 | `docs/nodo-capital/PLAN-NUTRICION-CONTINUA-CAPITAL.md` | Continuo | Ciclo, frentes, esquemas y cadencia |

## 2. Paquete de datos

| Archivo | Propósito |
|---|---|
| `data/sources/capital/sources.seed.json` | Semilla de fuentes y unknowns |
| `data/sources/capital/requests.tracking.json` | Ledger de pedidos formales |
| `data/sources/capital/unide-layers.json` | Pendiente: inventario de capas UNIDE |
| `data/sources/capital/responses/` | Pendiente: respuestas oficiales snapshotadas |

## 3. Backlog ejecutable

### NUT-CAP-008 — Consolidación del paquete

- [ ] Crear rama `agent-vibe/nut-capital-consolidacion`.
- [ ] Aterrizr los ocho documentos.
- [ ] Aterrizr `sources.seed.json` y `requests.tracking.json`.
- [ ] Validar JSON.
- [ ] Validar hashes.
- [ ] Crear índice maestro.
- [ ] Abrir PR.

### NUT-CAP-009 — Validaciones automáticas

- [ ] Validar que `sources.seed.json` sea JSON válido.
- [ ] Validar que cada fuente tenga `id`, `name`, `url`, `type` y `status`.
- [ ] Validar que cada URL sea absoluta.
- [ ] Validar que ninguna fuente tenga PII.
- [ ] Validar que cada unknown esté declarado.
- [ ] Validar que cada pedido tenga estado.
- [ ] Fallar CI si una norma `verified` no tiene URL oficial.
- [ ] Fallar CI si un recurso descargable no tiene hash.

### NUT-CAP-010 — Sondeo UNIDE

- [ ] Ejecutar `GetCapabilities` WMS.
- [ ] Intentar `GetCapabilities` WFS.
- [ ] Generar `unide-layers.json`.
- [ ] Registrar licencias o `unknown`.
- [ ] No publicar derivados sin licencia.

### NUT-CAP-011 — Envío y seguimiento de pedidos

- [ ] Confirmar destinatarios exactos.
- [ ] Enviar SOL-CAP-001 a SOL-PROV-004.
- [ ] Registrar fecha, canal y acuse.
- [ ] Archivar respuestas con hash.
- [ ] Actualizar ledger.

### NUT-CAP-012 — Verificación normativa

- [ ] Obtener texto oficial del Despacho 325-26.
- [ ] Obtener texto de la Ordenanza 9194.
- [ ] Obtener número y texto de la ordenanza de habilitación comercial.
- [ ] Confirmar situación de adhesión a Ley 27.275.
- [ ] Revisar términos IGN.

### NUT-CAP-013 — Activación controlada del stage

- [ ] Implementar doble lente.
- [ ] Activar solo datos con estado declarado.
- [ ] Mostrar unknowns.
- [ ] Bloquear comercios individuales.
- [ ] Bloquear geometrías sin licencia.
- [ ] Vincular unknowns a pedidos.

## 4. Contrato de calidad

Un PR de nutrición solo puede fusionarse si:

1. No introduce datos sin fuente.
2. No introduce PII.
3. No une entidades por nombre.
4. No publica derivados sin licencia.
5. No presenta prensa como fuente oficial.
6. No oculta unknowns.
7. Conserva snapshots inmutables.
8. Actualiza el índice y el tablero.

## 5. Estado consolidado

| Métrica | Valor |
|---|---|
| Fuentes verificadas | 15 |
| Fuentes provisionales | 4 |
| Unknowns activos | 25 |
| Pedidos formales | 4 |
| Pedidos respondidos | 0 |
| Licencias confirmadas | 0 |
| Comercios ingestables | 0 |
| Espacios públicos verificados | 0 |
| Corredores verificados | 0 |
| Stage activable | Sí, con estados honestos |
