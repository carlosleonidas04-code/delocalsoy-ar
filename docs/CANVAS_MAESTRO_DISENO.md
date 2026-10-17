# Canvas Maestro de Diseño Territorial — DELocalSoy.AR

**Documento Rector:** `docs/CANVAS_MAESTRO_DISENO.md`  
**Acreditación:** Regla R15 (Acreditación Documentada y Empírica)  
**Versión:** 1.0.0-canonica  
**Framework:** React 18+ · Tailwind CSS · TypeScript · PostGIS SRID 4326  

---

## 1. Visión General del Canvas Maestro

El **Canvas Maestro de Diseño** es la interfaz central de auditoría visual, cartográfica, epistémica y criptográfica de DELocalSoy.AR. Articula los 3 nodos territoriales de la provincia de San Juan (Capital, Valle de Iglesia, Caucete) y garantiza la aplicación estricta del estándar ético de 4 señales independientes.

El Canvas Maestro está estructurado en **5 Pestañas Declaradas y Acreditadas**:

1. **Pestaña 1: Tokens & Patrones (P-01 a P-10)**
   - Catálogo vivo de los 43 tokens `--honest-*` (§3B).
   - Implementación y pruebas de los 10 patrones de diseño territorial.
   - Demostración de tipografía sin "pill boxes" cosméticos.

2. **Pestaña 2: Estados Epistémicos Honestos**
   - Validación empírica de los 4 estados: *Validado* (`#00A86B`), *Sintético* (`#FFC72C`), *Comunitario* (`#E06D53`), *Pendiente* (`#94A3B8`).
   - Verificación de contraste WCAG AA $\ge$ 4.5:1 con tipografía de alto contraste.
   - Despliegue simultáneo de 4 señales: color, geometría de borde, glifo y microcopia.

3. **Pestaña 3: Nodos Federados & Red Territorial**
   - Topología de los 3 nodos de la red San Juan (ADR-021).
   - Centroides WGS-84, subnodos y corredores de articulación inter-nodal.
   - Monitor de telemetría y estado de consenso federado.

4. **Pestaña 4: Cartografía Sensible (SRID 4326)**
   - Visualización de capas cartográficas vectoriales y cuencas hídricas.
   - Modos de privacidad territorial: `PUBLICO`, `COMUNITARIO_PROTEGIDO`, `RESERVADO_SENSIBLE`.
   - Protección contra extracción masiva de coordenadas de saberes ancestrales o recursos hídricos vulnerables.

5. **Pestaña 5: Trazabilidad Criptográfica & Registro R15**
   - Cadena de custodia con sumas de verificación SHA-256 por cada relevo.
   - Firmas Ed25519 acreditadas por asambleas o auditores técnicos.
   - Exportador transportable SIN TAR con límites $< 1.024.000$ Bytes.

## 2. Especificación de Componentes en `apps/web/src/components/canvas-maestro/`

| Componente | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| **CanvasMaestroDiseno** | `CanvasMaestroDiseno.tsx` | Contenedor principal orquestador con selector de pestañas accesible y atajos de teclado |
| **TabTokensYPatrones** | `TabTokensYPatrones.tsx` | Explorador interactivo de los 43 tokens `--honest-*` y catálogo de patrones P-01 a P-10 |
| **TabEstadosHonestos** | `TabEstadosHonestos.tsx` | Simulador y contrastador WCAG AA de los 4 estados epistémicos con cálculo en vivo $\ge 4.5:1$ |
| **TabNodosFederados** | `NodosFederadosTab.tsx` | Topología de los 3 nodos provinciales ratificados (ADR-021) y métricas de consenso |
| **TabCartografiaSensible** | `TabCartografiaSensible.tsx` | Control de capas vectoriales WGS-84 (SRID 4326) y 3 niveles de privacidad territorial |
| **TabTrazabilidadCripto** | `TabTrazabilidadCripto.tsx` | Verificador de sumas de control SHA-256/MD5 y exportación directa de lotes sin compresión |

---

## 3. Conformidad Epistémica & Reglas de Acreditación (R1 a R15)

1. **Regla R1 (Inmutabilidad de Semántica):** Todo dato territorial mantiene su significado exacto en el tiempo; las mutaciones no justificadas son rechazadas en el gate de CI.
2. **Regla R12 (Estado Epistémico Honesto Obligatorio):** Todo relevo expone una de las cuatro señales:
   - `● Validado`: Fuentes primarias oficiales, aforos hidrológicos y catastro formal.
   - `◈ Comunitario`: Asambleas vecinales, juntas de regantes y acuerdos locales.
   - `✦ Sintético`: Proyecciones climáticas, modelos de deshielo o estimaciones censales.
   - `◐ Pendiente`: Datos secundarios o en proceso de verificación (nunca reportados como verificados).
3. **Regla R15 (Acreditación Empírica Comprobable):** Ninguna entrega se considera válida por mera declaración; requiere archivo materializado, suma criptográfica SHA-256 verificable y compatibilidad estricta con el monorepo.

---

## 4. Topología Provincial Ratificada (ADR-021)

La red federada DELocalSoy.AR se asienta sobre 3 nodos soberanos interconectados:
- **`nodo-capital-san-juan`:** Eje cívico, administrativo, universitario y comercial de la provincia.
- **`nodo-valle-de-iglesia`:** Eje cordillerano, cuencas andinas de deshielo, termalismo y agricultura agroecológica de altura.
- **`nodo-caucete-este`:** Oasis irrigado este, vitivinicultura patrimonial y corredor bioceánico.

*Cualquier módulo o vista que declare 5 nodos provinciales queda depreciado en favor de esta especificación canónica.*
