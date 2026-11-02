# Bloque F — Activación del stage Nodo Capital

**Proyecto:** DELocalSoy.AR  
**Nodo:** Capital  
**Issue asociado:** #215  
**Fecha:** 2026-10-15  
**Base:** main @ 77500be  
**Responsable:** agent-vibe  
**Estado:** especificación de activación

## 1. Objetivo

Activar el stage de diseño del Nodo Capital con doble lente:

1. **El espacio que cuida** — espacios públicos, accesibilidad, arbolado, mobiliario y cuidado comunitario.
2. **Economía de proximidad** — comercios, ferias, mercados, emprendimientos y oportunidades locales.

El stage no es un mapa decorativo: es una interfaz de lectura territorial con estados epistémicos honestos.

## 2. Principios de activación

- Solo se activan capas con fuente o estado declarado.
- Los unknowns son visibles, no ocultos.
- Los corredores del repo permanecen `provisional`.
- No se publican geometrías derivadas de UNIDE sin licencia confirmada.
- No se muestran comercios individuales hasta disponer de fuente y regla anti-PII.
- Las ferias y el RUMAE se muestran como contexto provisional hasta obtener texto oficial.
- El microcentro se delimita según el PEC 2025: rectángulo de 7 × 6 cuadras entre Av. Libertador Gral. San Martín al norte, Córdoba al sur, Alem al oeste y Rioja al este.

## 3. Estructura del stage

```text
Stage Nodo Capital
├── Lente A — El espacio que cuida
│   ├── Mapa de espacios públicos
│   ├── Panel de inventario y unknowns
│   ├── Capa de accesibilidad
│   └── Panel normativo ambiental
├── Lente B — Economía de proximidad
│   ├── Mapa de centralidades comerciales
│   ├── Panel de ferias y mercados
│   ├── Panel de economía local
│   └── Panel de programas y vacíos
└── Conector — Corredores y proximidad
    ├── Corredores provisionales
    ├── Accesibilidad peatonal
    └── Cruce espacio-comercio
```

## 4. Lente A — El espacio que cuida

### Contenidos activables

| Módulo | Dato | Estado | Fuente |
|---|---|---|---|
| Microcentro | Rectángulo 7 × 6 cuadras | verified | PEC 2025 |
| Corredores peatonales estratégicos | Concepto y plan de veredas | verified como marco; geometría provisional | PEC 2025 |
| Espacios públicos del microcentro | Plazas mencionadas en fuentes secundarias | provisional | Directorios y fuentes secundarias |
| UNIDE WMS | Endpoint oficial | verified | UNIDE |
| Capas UNIDE | Espacios verdes, equipamiento, zonificación | unknown | Pendiente GetCapabilities |
| Arbolado | Inventario | unknown | Sin fuente |
| Mobiliario y luminaria | Inventario | unknown | Sin fuente |
| Rampas y veredas | Inventario | unknown | Sin fuente |

### UI obligatoria

- Badge de estado en cada entidad.
- Panel de procedencia.
- Aviso cuando una capa proviene de WMS y no es descargable.
- Panel de unknowns con pedidos formales asociados.
- Leyenda que distinga dato oficial, provisional y unknown.

## 5. Lente B — Economía de proximidad

### Contenidos activables

| Módulo | Dato | Estado | Fuente |
|---|---|---|---|
| Mercado de Abasto | Horario 06:00 a 13:00, lunes a sábado | verified | Municipalidad de Capital |
| RUMAE | Registro único de feriantes | provisional | Prensa; texto oficial pendiente |
| Ferias mencionadas | Paseo Artesanal, Paseo de las Palmeras, Plaza Laprida, Plaza Desamparados | provisional | Prensa |
| Padrón comercial | Dataset descargable | unknown | Sin fuente |
| Nomenclador de rubros | Codificación | unknown | Sin fuente |
| Comercios individuales | No activables | blocked | Sin fuente y sin regla anti-PII |
| Programas de fomento | Vigentes | unknown | Sin fuente |

### UI obligatoria

- El Mercado de Abasto puede mostrarse como punto institucional verificado.
- El RUMAE debe mostrarse como régimen provisional.
- Las ferias no deben mostrarse como autorizadas sin texto oficial.
- No se muestra un directorio comercial hasta disponer de padrón o fuente verificable.
- Los unknowns deben vincularse a SOL-CAP-001 y SOL-PROV-004.

## 6. Conector — Corredores y proximidad

El conector cruza ambas lentes:

- Espacios públicos como anclas de cuidado.
- Comercios y ferias como actividad de proximidad.
- Corredores peatonales como hipótesis de conexión.
- Accesibilidad como condición de uso real.

### Reglas

- Un corredor no puede marcarse como oficial sin norma, geometría o programa que lo declare.
- Un corredor puede mostrarse como `provisional` si se deriva del PEC 2025 o de hipótesis de diseño.
- El cruce espacio-comercio se muestra como hipótesis, nunca como programa vigente.
- No se calcula indicador de vitalidad sin metodología y fuente.

## 7. Estados de activación

| Estado | Significado | Acción UI |
|---|---|---|
| `active_verified` | Dato oficial con fuente | Mostrar con badge ✓ |
| `active_provisional` | Dato secundario o hipótesis | Mostrar con badge ◐ y aviso |
| `blocked_license` | Existe dato pero falta licencia | No publicar; mostrar motivo |
| `blocked_pii` | Riesgo de datos personales | No publicar; mostrar motivo |
| `unknown` | Sin fuente | Mostrar como vacío verificado |
| `pending_request` | Pedido formal enviado | Mostrar ID y estado del pedido |

## 8. Pantallas mínimas

1. **Mapa Nodo Capital**
   - Base territorial.
   - Microcentro.
   - Espacios públicos.
   - Corredores provisionales.
   - Filtros por lente.

2. **Ficha de espacio público**
   - Nombre.
   - Estado epistémico.
   - Fuente.
   - Atributos disponibles.
   - Unknowns.

3. **Ficha de economía de proximidad**
   - Mercado de Abasto.
   - RUMAE.
   - Ferias.
   - Programas y vacíos.

4. **Panel de unknowns**
   - Lista de vacíos.
   - Pedido formal asociado.
   - Estado de respuesta.

5. **Panel normativo**
   - Normas separadas.
   - Estado de verificación.
   - Texto oficial o aviso de pendencia.

## 9. Definition of Done

- [ ] Stage activable sin datos simulados.
- [ ] Doble lente implementada.
- [ ] Microcentro delimitado según PEC 2025.
- [ ] Corredores marcados provisionales.
- [ ] Mercado de Abasto mostrado como verificado.
- [ ] RUMAE mostrado como provisional.
- [ ] Comercios individuales bloqueados hasta fuente y anti-PII.
- [ ] Unknowns visibles y vinculados a pedidos.
- [ ] Ninguna geometría UNIDE publicada sin licencia.
- [ ] Accesibilidad AA.
- [ ] Trazabilidad por fila.
