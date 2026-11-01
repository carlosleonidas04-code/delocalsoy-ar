# Especificación Técnica de la Serie Contracts NCAP-R2
**DELocalSoy.AR — Nodo Capital (San Juan)**
*Lote 4 · Cierre de la Serie Contracts · Versión 0.6.0-ncap.r2*

---

## 1. Alcance y Propósito
El **Lote 4** consolida los contratos tipados de validación territorial para el **Nodo Capital (San Juan)** bajo la Regla NCAP-R2 y ADR-034/ADR-036.

## 2. Los 4 Subnodos de Capital
1. **Centro Histórico & Eje Cívico** (`capital-centro-historico`): (-31.5375, -68.5252)
2. **Desamparados & Eje Universitario** (`capital-desamparados`): (-31.5284, -68.5489)
3. **Concepción & Pueblo Viejo** (`capital-concepcion`): (-31.5168, -68.5310)
4. **Trinidad & Eje Sur Ferroviario** (`capital-trinidad`): (-31.5560, -68.5280)

## 3. Protocolo de Exportación SIN TAR (#134 / NCAP-R2)
- **Cero empaquetado .tar:** Se transmiten archivos individuales o un manifiesto JSON con payload UTF-8 / Base64.
- **Tamaño:** Ningún archivo excede 1.024.000 Bytes (0% de riesgo por límites de red).
- **Integridad:** Doble hash SHA-256 y MD5 por archivo.
- **Validación de Tipos:** Esquemas Zod con validación en tiempo de ejecución.
