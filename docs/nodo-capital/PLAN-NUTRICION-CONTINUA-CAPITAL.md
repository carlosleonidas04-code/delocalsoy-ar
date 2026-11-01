# Análisis recursivo y plan de nutrición continua — Nodo Capital

**Proyecto:** DELocalSoy.AR  
**Nodo:** Capital (San Juan, Argentina)  
**Fecha:** 2026-10-15  
**Base:** main @ 77500be  
**Responsable:** agent-vibe  
**Origen:** revisión recursiva de Bloques A–F

## 1. Lectura recursiva del estado

### Lo que ya está sostenido

| Capa | Estado | Base |
|---|---|---|
| Marco territorial | Sólido | PEC 2025 |
| Infraestructura geoespacial | Sólida, con límite técnico | UNIDE WMS + IDERA |
| Contexto económico | Parcial | CNE 2020-2021 |
| Marco normativo comercial | Parcial | Ley 104-A, Ley 799-C, Ordenanza 9587 |
| Ferias y economía de proximidad | Promisorio pero provisional | Despacho 325-26 / RUMAE |
| Espacios públicos | Débil en datos primarios | Sin inventario municipal confirmado |
| Comercios individuales | Bloqueado | Sin padrón público ni nomenclador |
| Accesibilidad y movilidad | Débil | Sin inventario ni plan confirmado |
| Licencias de reutilización | Bloqueante | Sin texto para datasets ni UNIDE |

### Diagnóstico recursivo

1. **El nodo tiene marco, pero no masa crítica de datos primarios.**  
   El PEC 2025 y UNIDE dan legitimidad territorial, pero aún no proveen inventarios operativos.

2. **El mayor activo inmediato es el RUMAE.**  
   Aunque sigue provisional, es el primer puente concreto entre espacio público, ferias, emprendimientos y economía de proximidad.

3. **El mayor bloqueo es la ausencia de licencias.**  
   Sin licencias de datasets abiertos y UNIDE, no debe publicarse material derivado.

4. **El mayor riesgo es convertir hipótesis en hechos.**  
   Corredores, centralidades y cruces espacio-comercio deben permanecer como hipótesis de diseño.

5. **El nodo necesita una rutina, no solo una carga inicial.**  
   La nutrición debe volverse un ciclo recurrente de búsqueda, verificación, ingesta, publicación y revisión.

## 2. Ciclo de nutrición continua

```text
1. Detectar
   ↓
2. Clasificar fuente
   ↓
3. Verificar identidad y vigencia
   ↓
4. Snapshot + hash
   ↓
5. Ingesta por dominio
   ↓
6. Publicar con estado epistémico
   ↓
7. Revisar vigencia
   ↓
8. Actualizar o deprecar
```

### Regla de oro

Ningún dato ingresa sin:

- Fuente.
- Fecha.
- Estado epistémico.
- Join key.
- Licencia o marca explícita de licencia desconocida.
- Snapshot hasheado, si es descargable.

## 3. Frentes de nutrición priorizados

### Prioridad 1 — Licencias y derechos de reutilización

**Objetivo:** destrabar publicación de derivados.

Acciones:

- [ ] Obtener licencia de cada dataset de datos abiertos.
- [ ] Obtener licencia o condiciones de uso de capas UNIDE.
- [ ] Revisar términos del IGN para derivados cartográficos.
- [ ] Definir licencia interna para observaciones ciudadanas.
- [ ] Crear campo obligatorio `license_status`: `confirmed | unknown | restricted`.

Resultado esperado:

- Poder decidir qué puede publicarse, qué puede visualizarse y qué debe permanecer interno.

### Prioridad 2 — RUMAE y ferias

**Objetivo:** convertir el hallazgo provisional en una capa operativa verificable.

Acciones:

- [ ] Obtener texto oficial del Despacho N° 325-26.
- [ ] Obtener texto de la Ordenanza N° 9194.
- [ ] Confirmar categorías del RUMAE.
- [ ] Confirmar ferias autorizadas, ubicaciones y horarios.
- [ ] Definir esquema `fair` y `fair_event`.
- [ ] Publicar ferias solo como `provisional` hasta confirmación oficial.

Resultado esperado:

- Primera capa real de economía de proximidad del Nodo Capital.

### Prioridad 3 — Inventario de espacios públicos

**Objetivo:** pasar de plazas mencionadas en fuentes secundarias a inventario verificable.

Acciones:

- [ ] Inspeccionar `GetCapabilities` de UNIDE.
- [ ] Confirmar existencia de WFS o API.
- [ ] Solicitar inventario municipal mediante SOL-CAP-002.
- [ ] Crear esquema `public_space`.
- [ ] Diferenciar plaza, parque, paseo, plaza seca y equipamiento.
- [ ] No publicar superficie, arbolado ni mobiliario sin fuente.

Resultado esperado:

- Inventario mínimo verificable del microcentro y expansión progresiva al resto del departamento.

### Prioridad 4 — Padrón comercial y nomenclador

**Objetivo:** habilitar el directorio comercial sin PII.

Acciones:

- [ ] Seguimiento de SOL-CAP-001.
- [ ] Obtener esquema del padrón.
- [ ] Obtener nomenclador codificado de rubros.
- [ ] Definir mapeo hacia categorías del directorio.
- [ ] Definir reglas de anonimización.
- [ ] Crear esquema `commerce` con `join_key`.

Resultado esperado:

- Directorio comercial basado en padrón, no en directorios comerciales.

### Prioridad 5 — Accesibilidad y movilidad

**Objetivo:** sustentar la lente “el espacio que cuida”.

Acciones:

- [ ] Seguimiento de SOL-CAP-003.
- [ ] Obtener inventario de rampas y veredas.
- [ ] Obtener plan de movilidad vigente.
- [ ] Obtener obras con plazo.
- [ ] Crear esquema `accessibility_feature`.
- [ ] Mantener corredores como provisionales.

Resultado esperado:

- Capa de accesibilidad basada en evidencia, no en percepción.

### Prioridad 6 — Observación ciudadana ética

**Objetivo:** incorporar conocimiento local sin convertirlo en dato oficial.

Acciones:

- [ ] Definir esquema `citizen_observation`.
- [ ] Separar observación de hecho verificado.
- [ ] Prohibir PII.
- [ ] Exigir categoría, ubicación aproximada, fecha y descripción.
- [ ] Establecer moderación y trazabilidad.
- [ ] Nunca promocionar observaciones a `verified` sin fuente institucional.

Resultado esperado:

- Capa viva de cuidado territorial, claramente separada de la capa oficial.

## 4. Esquemas mínimos a crear

### `public_space`

```json
{
  "refes": "REFES-XXXX",
  "cue": "CUE-XXXX",
  "name": "string",
  "type": "plaza | parque | paseo | plaza_seca | equipamiento",
  "geometry_status": "official | provisional | unknown",
  "surface": "number | null",
  "epistemic_status": "verified | provisional | unknown",
  "source_id": "SRC-XXXX",
  "license_status": "confirmed | unknown | restricted"
}
```

### `fair`

```json
{
  "refes": "REFES-XXXX",
  "cue": "CUE-XXXX",
  "name": "string",
  "type": "artesanal | gastronomica | productores | navidena | otra",
  "location_status": "official | provisional | unknown",
  "schedule_status": "official | provisional | unknown",
  "registry": "RUMAE",
  "epistemic_status": "verified | provisional | unknown",
  "source_id": "SRC-XXXX"
}
```

### `commerce`

```json
{
  "refes": "REFES-XXXX",
  "cue": "CUE-XXXX",
  "activity_code": "string",
  "activity_label": "string",
  "zone": "string | null",
  "status": "active | inactive | unknown",
  "epistemic_status": "verified | provisional | unknown",
  "source_id": "SRC-XXXX",
  "pii": false
}
```

### `accessibility_feature`

```json
{
  "refes": "REFES-XXXX",
  "cue": "CUE-XXXX",
  "type": "rampa | senda | vereda | paso_peatonal",
  "condition": "good | fair | poor | unknown",
  "geometry_status": "official | provisional | unknown",
  "epistemic_status": "verified | provisional | unknown",
  "source_id": "SRC-XXXX"
}
```

## 5. Cadencia recomendada

| Frecuencia | Actividad |
|---|---|
| Semanal | Revisar respuestas a pedidos formales y novedades de UNIDE |
| Quincenal | Revisar Boletín Oficial, digesto municipal y normas nuevas |
| Mensual | Revisar datasets abiertos, CNE, INDEC e indicadores económicos |
| Mensual | Auditar snapshots, hashes y vigencias |
| Trimestral | Revisar licencias, normativa y estado de programas |
| Por evento | Ferias, obras, cambios normativos o novedades territoriales |

## 6. Tablero de nutrición

| Indicador | Definición | Meta inicial |
|---|---|---|
| Fuentes verificadas | Cantidad de fuentes oficiales snapshotadas | 15 |
| Fuentes provisionales | Prensa, academia o directorios | 4 |
| Unknowns activos | Vacíos sin fuente | 25 |
| Pedidos enviados | Solicitudes formales enviadas | 4 |
| Pedidos respondidos | Respuestas oficiales recibidas | 0 |
| Licencias confirmadas | Datasets o capas con licencia conocida | 0 |
| Espacios públicos verificados | Entidades con fuente oficial | 0 |
| Ferias verificadas | Ferias con norma y horario oficial | 0 |
| Comercios ingestables | Registros sin PII y con fuente | 0 |
| Corredores verificados | Corredores con geometría o norma oficial | 0 |

## 7. Riesgos recurrentes

| Riesgo | Señal temprana | Control |
|---|---|---|
| Prensa elevada a oficial | Una sola fuente periodística | Exigir texto oficial |
| WMS confundido con WFS | Se intenta descargar geometría | Verificar capacidades |
| Licencia ausente | Dataset sin términos | Bloquear derivados |
| PII filtrada | Nombre, teléfono o domicilio en export | Validación automática |
| Corredor convertido en hecho | Se dibuja sin norma o geometría | Mantener provisional |
| Feria presentada como autorizada | Solo prensa | Exigir resolución o despacho oficial |
| Snapshot mutable | URL cambia sin control | Hash y archivo inmutable |
| Unknown oculto | UI no muestra vacíos | DataGapPanel obligatorio |

## 8. Definition of Done del ciclo continuo

- [ ] Cada nuevo dato tiene fuente, fecha, estado y join key.
- [ ] Cada recurso descargable tiene snapshot y hash.
- [ ] Cada unknown tiene responsable y, si corresponde, pedido formal.
- [ ] Cada norma tiene texto oficial o permanece provisional.
- [ ] Cada capa geoespacial tiene licencia conocida o está bloqueada.
- [ ] Cada observación ciudadana está separada del dato oficial.
- [ ] El tablero refleja el estado real, no una meta aspiracional.
