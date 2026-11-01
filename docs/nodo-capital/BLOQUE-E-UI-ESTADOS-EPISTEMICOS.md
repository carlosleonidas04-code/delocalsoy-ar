# Bloque E — UI de estados epistémicos honestos

**Proyecto:** DELocalSoy.AR  
**Nodo:** Capital  
**Issue asociado:** #215  
**Fecha:** 2026-10-15  
**Base:** main @ 77500be  
**Responsable:** agent-vibe  
**Estado:** especificación de diseño lista para implementación

## 1. Principio

La interfaz no debe aparentar certeza que los datos no tienen.

Cada entidad mostrada —comercio, plaza, corredor, norma, programa o indicador— debe exponer su estado epistémico:

| Estado | Símbolo | Significado | Regla de UI |
|---|---|---|---|
| `verified` | ✓ | Fuente oficial | Puede mostrarse como dato confirmado |
| `provisional` | ◐ | Prensa, academia, directorio o fuente secundaria | Debe mostrarse como provisional |
| `unknown` | ◇ | Sin fuente verificable | Debe mostrarse como desconocido, nunca ocultarse |

## 2. Componentes requeridos

### 2.1 `EpistemicBadge`

Badge compacto junto al nombre de la entidad.

```tsx
type EpistemicStatus = 'verified' | 'provisional' | 'unknown';

interface EpistemicBadgeProps {
  status: EpistemicStatus;
  sourceType?: 'official' | 'press' | 'academic' | 'commercial_directory' | 'citizen_observation';
  sourceName?: string;
  dataDate?: string;
}
```

Textos:

- `verified`: “Verificado por fuente oficial”.
- `provisional`: “Información provisional”.
- `unknown`: “Sin fuente verificable”.

### 2.2 `SourceTrace`

Panel expandible con procedencia.

Campos obligatorios cuando existen:

- Fuente.
- URL.
- Fecha del dato.
- Fecha de consulta.
- Tipo de fuente.
- Licencia.
- Hash del snapshot.

Si falta licencia, mostrar:

> Licencia de reutilización sin confirmar.

Si falta fecha del dato, mostrar:

> Fecha del dato no declarada por la fuente.

### 2.3 `UnknownField`

Para atributos sin dato.

```tsx
<UnknownField label="Superficie" />
```

Texto visible:

> Sin dato verificado

No usar:

- `N/A`
- `0`
- `-`
- Valores inventados
- Placeholders que parezcan datos

### 2.4 `ProvisionalNotice`

Aviso breve para fuentes no oficiales.

> Esta información proviene de una fuente no oficial y requiere verificación institucional.

### 2.5 `DataGapPanel`

Panel de unknowns por dominio.

Ejemplo para Capital:

- Padrón comercial descargable: sin fuente verificable.
- Inventario oficial de plazas: sin fuente verificable.
- Capas UNIDE de espacios verdes: sin confirmar.
- Rampas y estado de veredas: sin fuente verificable.
- Licencias de reutilización: sin confirmar.

## 3. Reglas por dominio

### Comercios

- No mostrar un comercio como “verificado” si solo proviene de directorio comercial.
- No inferir rubro si el nomenclador no está disponible.
- No mostrar dirección exacta si la fuente no la provee.
- No mostrar datos de contacto personales.
- Si el padrón no existe, mostrar:
  > El padrón comercial municipal aún no está disponible como dato público verificado.

### Espacios públicos

- No mostrar superficie, arbolado, mobiliario ni luminaria sin fuente.
- No asumir que una plaza existe por aparecer en un directorio turístico.
- Las plazas mencionadas solo en fuentes secundarias deben aparecer como `provisional`.
- Si UNIDE solo ofrece WMS, mostrar la capa como referencia cartográfica, no como dataset descargable.

### Movilidad

- No mostrar rampas, sendas o estado de veredas sin fuente.
- Los corredores definidos en el repo permanecen `provisional` hasta contar con geometría o norma oficial.
- No calcular flujo peatonal sin metodología publicada.

### Normativa

- Cada norma se muestra por separado.
- No fusionar Ley 104-A, Ley 799-C, Ordenanza 9587, Ordenanza 9194 ni Despacho 325-26.
- Una norma identificada por prensa se muestra como `provisional`.
- Si el texto oficial no está disponible, mostrar:
  > Texto oficial pendiente de localización.

## 4. Contrato de datos

```ts
export type EpistemicStatus = 'verified' | 'provisional' | 'unknown';

export type SourceType =
  | 'official'
  | 'press'
  | 'academic'
  | 'commercial_directory'
  | 'citizen_observation';

export interface TerritorialRecord {
  id: string;
  node: 'capital';
  domain:
    | 'commerce'
    | 'public_space'
    | 'mobility'
    | 'normative'
    | 'economy';
  refes?: string;
  cue?: string;
  name: string;
  epistemicStatus: EpistemicStatus;
  sourceType?: SourceType;
  sourceName?: string;
  sourceUrl?: string;
  dataDate?: string;
  retrievedAt?: string;
  license?: string | null;
  snapshotHash?: string;
  joinKey?: string;
  pii: false;
  notes?: string;
}
```

Reglas:

- `pii` debe ser siempre `false` en la capa pública.
- `epistemicStatus` es obligatorio.
- `sourceUrl` es obligatorio si `epistemicStatus` no es `unknown`.
- `snapshotHash` es obligatorio para recursos descargados.
- `joinKey` es obligatorio para entidades que se relacionan entre sí.

## 5. Estados de UI

### Tarjeta de espacio público

```text
Plaza 25 de Mayo
◐ Información provisional
Fuente: directorio geográfico secundario
Fecha del dato: no declarada
Licencia: sin confirmar
```

### Tarjeta de norma

```text
Despacho N° 325-26 — RUMAE
◐ Información provisional
Fuente: prensa local
Texto oficial: pendiente de localización
```

### Tarjeta de dato faltante

```text
Inventario oficial de plazas
◇ Sin fuente verificable
Pedido formal: SOL-CAP-002
Estado: pendiente
```

### Tarjeta de fuente oficial

```text
UNIDE — WMS
✓ Verificado por fuente oficial
Endpoint: https://unide.sanjuan.gob.ar/geoserver/wms
Capas: sin confirmar
Licencia: sin confirmar
```

## 6. Accesibilidad y ética

- Los símbolos no pueden ser el único indicador: deben acompañarse con texto.
- Contraste mínimo AA.
- Los badges deben tener `aria-label` descriptivo.
- No usar color como única señal.
- No exponer PII en tooltips, mapas ni exportaciones.
- Las exportaciones deben conservar estado epistémico y fuente.

## 7. Definition of Done

- [ ] Componente `EpistemicBadge` implementado.
- [ ] Componente `SourceTrace` implementado.
- [ ] Componente `UnknownField` implementado.
- [ ] Componente `ProvisionalNotice` implementado.
- [ ] Componente `DataGapPanel` implementado.
- [ ] Contrato `TerritorialRecord` implementado.
- [ ] Ninguna entidad sin estado epistémico.
- [ ] Ningún campo faltante mostrado como dato.
- [ ] Ninguna fuente no oficial presentada como oficial.
- [ ] Ninguna geometría publicada sin licencia confirmada.
- [ ] Accesibilidad AA verificada.
