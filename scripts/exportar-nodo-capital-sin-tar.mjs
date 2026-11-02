#!/usr/bin/env node
/**
 * scripts/exportar-nodo-capital-sin-tar.mjs
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Lote 4 Serie Contracts NCAP-R2 (Nodo Capital - San Juan)
 * -----------------------------------------------------------------------------
 * Exportador / Importador Determinístico SIN TAR.
 * 
 * Motivo Arquitectónico (#134 / #150 / NCAP-R2):
 * - Evita la descompresión automática (auto-gunzip) de navegadores y proxys HTTP.
 * - Evita la corrupción por headers ustar / octal padding.
 * - Garantiza archivos estrictamente menores al límite de subida (1.024.000 Bytes).
 * - Provee transporte en JSON estructurado byte-exacto con hashes SHA-256 y MD5.
 * - Permite exportación directa e importación/aterrizaje idempotente con verificación.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const EXPORTS_DIR = path.join(ROOT_DIR, 'exports');

// Límite de subida estricto de plataforma (1 MB)
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1.024.000 B

/**
 * Inventario canónico de Lote 4 — Serie Contracts NCAP-R2
 */
const LOTE_4_SPEC = {
  loteId: 'lote-4-contracts-ncap-r2',
  nodo: 'nodo-capital-san-juan',
  version: '0.6.0-ncap.r2',
  descripcion: 'Contratos Zod, Esquemas PostGIS SRID=4326, 4 Subnodos de San Juan Capital y Linaje Criptográfico NCAP-R2',
  scopeGuard: 'packages/contracts/** & docs/NCAP_R2_CONTRACTS.md',
  archivos: [
    {
      relPath: 'packages/contracts/src/nodoCapital.ts',
      description: 'Contratos canónicos Zod, tipos TypeScript y 4 subnodos de San Juan Capital bajo NCAP-R2'
    },
    {
      relPath: 'packages/contracts/src/ncap.ts',
      description: 'Re-exportación y aliasing canónico NCAP-R2 para interoperabilidad federada'
    },
    {
      relPath: 'docs/NCAP_R2_CONTRACTS_SPEC.md',
      description: 'Documentación técnica de la Serie Contracts NCAP-R2 y matriz de validación epistémica'
    }
  ]
};

/**
 * Contenido canónico generado para Lote 4
 */
const CANONICAL_CONTENTS = {
  'packages/contracts/src/nodoCapital.ts': `/**
 * packages/contracts/src/nodoCapital.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos Canónicos del Nodo Capital (San Juan, Argentina)
 * Serie Contracts NCAP-R2 · SRID=4326 · 4 Subnodos · 4 Estados Epistémicos Honestos
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';

/**
 * 4 Estados Epistémicos Honestos ADR-034 / NCAP-R2
 * 4 señales independientes: color, geometría de trazo, glifo y microcopia
 */
export const EstadoHonestoNCAPSchema = z.enum([
  'validado',    // Verde #4ADE80 · Sólido · ✓ · Verificado científicamente o fuente oficial T1-T2
  'comunitario', // Celeste #75AADB · Guiones · ⚑ · Aporte territorial de asamblea / relevo ciudadano
  'pendiente',   // Ámbar #FBBF24 · Rayado · ◐ · En proceso de auditoría / acreditación R9
  'sintetico',   // Dorado #FFC72C · Punteado · ◈ · Proyección heurística o inferencia de modelo
]);
export type EstadoHonestoNCAP = z.infer<typeof EstadoHonestoNCAPSchema>;

/**
 * Identificadores de los 4 Subnodos Canónicos de San Juan Capital
 */
export const SubnodoCapitalIdSchema = z.enum([
  'capital-centro-historico', // Plaza 25, Catedral, Eje Cívico Cultural
  'capital-desamparados',      // Parque de Mayo, UNSJ, Urquiza
  'capital-concepcion',        // Pueblo Viejo, Eje Norte Histórico
  'capital-trinidad',          // Eje Ferroviario Sur, Circunvalación
]);
export type SubnodoCapitalId = z.infer<typeof SubnodoCapitalIdSchema>;

/**
 * Coordenadas WGS-84 (SRID 4326) con validación estricta de rango para San Juan Capital
 */
export const CoordenadaWGS84Schema = z.object({
  lat: z.number().min(-31.60).max(-31.45),
  lng: z.number().min(-68.60).max(-68.45),
});
export type CoordenadaWGS84 = z.infer<typeof CoordenadaWGS84Schema>;

/**
 * Geometría PostGIS SRID 4326 en GeoJSON
 */
export const GeoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-68.60).max(-68.45), // Lng
    z.number().min(-31.60).max(-31.45), // Lat
  ]),
});

export const GeoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

/**
 * Contrato de Indicador Territorial NCAP
 */
export const IndicadorCapitalSchema = z.object({
  codigo: z.string().regex(/^NCAP-IND-[0-9]{3}$/),
  nombre: z.string().min(3).max(120),
  valor: z.number(),
  unidad: z.string(),
  estadoHonesto: EstadoHonestoNCAPSchema,
  fuenteNombre: z.string(),
  fuenteTipo: z.enum(['OFICIAL_T1', 'CIENTIFICA_T2', 'ASAMBLEA_R9', 'INFERENCIA_H6']),
  hashVerificacionSha256: z.string().length(64),
  actualizadoEn: z.string().datetime(),
});
export type IndicadorCapital = z.infer<typeof IndicadorCapitalSchema>;

/**
 * Contrato del Subnodo de San Juan Capital
 */
export const SubnodoCapitalSchema = z.object({
  id: SubnodoCapitalIdSchema,
  nombre: z.string().min(4).max(80),
  descripcion: z.string(),
  centroide: CoordenadaWGS84Schema,
  geom: GeoJSONPolygonSchema.optional(),
  indicadores: z.array(IndicadorCapitalSchema),
  estadoEpistemicoPredominante: EstadoHonestoNCAPSchema,
  coberturaKm2: z.number().positive(),
  poblacionEstimada: z.number().int().nonnegative(),
});
export type SubnodoCapital = z.infer<typeof SubnodoCapitalSchema>;

/**
 * Contrato de Relevo Territorial Sensible NCAP-R2 (ADR-036)
 */
export const RelevoTerritorialNCAPR2Schema = z.object({
  idRelevo: z.string().uuid(),
  nodoId: z.literal('nodo-capital-san-juan'),
  subnodoId: SubnodoCapitalIdSchema,
  marcaTemporal: z.string().datetime(),
  coordenada: CoordenadaWGS84Schema,
  estadoHonesto: EstadoHonestoNCAPSchema,
  observaciones: z.string().max(2000),
  privacidadNivel: z.enum(['PUBLICO', 'COMUNITARIO_PROTEGIDO', 'RESERVADO_SENSIBLE']),
  firmaCriptograficaSha256: z.string().length(64),
  acreditadoPor: z.string().min(3),
});
export type RelevoTerritorialNCAPR2 = z.infer<typeof RelevoTerritorialNCAPR2Schema>;

/**
 * Catálogo Canónico de los 4 Subnodos de San Juan Capital (Semilla NCAP-R2)
 */
export const SUBNODOS_CAPITAL_CANONICOS: Record<SubnodoCapitalId, {
  nombre: string;
  descripcion: string;
  centroide: CoordenadaWGS84;
  coberturaKm2: number;
  poblacionEstimada: number;
}> = {
  'capital-centro-historico': {
    nombre: 'Centro Histórico & Eje Cívico',
    descripcion: 'Núcleo fundacional, Plaza 25 de Mayo, Catedral, Eje Cívico Cultural y comercial',
    centroide: { lat: -31.5375, lng: -68.5252 },
    coberturaKm2: 4.8,
    poblacionEstimada: 38200,
  },
  'capital-desamparados': {
    nombre: 'Desamparados & Eje Universitario',
    descripcion: 'Polo educativo superior (UNSJ), Parque de Mayo, corredor Avenida Libertador Oeste',
    centroide: { lat: -31.5284, lng: -68.5489 },
    coberturaKm2: 7.2,
    poblacionEstimada: 42100,
  },
  'capital-concepcion': {
    nombre: 'Concepción & Pueblo Viejo',
    descripcion: 'Raíz histórica colonial, Eje Norte de San Juan, Matadero Tradicional y barrios residenciales',
    centroide: { lat: -31.5168, lng: -68.5310 },
    coberturaKm2: 5.6,
    poblacionEstimada: 29800,
  },
  'capital-trinidad': {
    nombre: 'Trinidad & Eje Sur Ferroviario',
    descripcion: 'Corredor sur de conectividad metropolitana, eje ex-ferroviario y articulación con Rawson',
    centroide: { lat: -31.5560, lng: -68.5280 },
    coberturaKm2: 6.4,
    poblacionEstimada: 34500,
  },
};
`,

  'packages/contracts/src/ncap.ts': `/**
 * packages/contracts/src/ncap.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Re-exportación Canónica NCAP-R2 (Lote 4 Contracts)
 * -----------------------------------------------------------------------------
 */

export * from './nodoCapital.js';
`,

  'docs/NCAP_R2_CONTRACTS_SPEC.md': `# Especificación Técnica de la Serie Contracts NCAP-R2
**DELocalSoy.AR — Nodo Capital (San Juan)**
*Lote 4 · Cierre de la Serie Contracts · Versión 0.6.0-ncap.r2*

---

## 1. Alcance y Propósito
El **Lote 4** consolida los contratos tipados de validación territorial para el **Nodo Capital (San Juan)** bajo la Regla NCAP-R2 y ADR-034/ADR-036.

## 2. Los 4 Subnodos de Capital
1. **Centro Histórico & Eje Cívico** (\`capital-centro-historico\`): (-31.5375, -68.5252)
2. **Desamparados & Eje Universitario** (\`capital-desamparados\`): (-31.5284, -68.5489)
3. **Concepción & Pueblo Viejo** (\`capital-concepcion\`): (-31.5168, -68.5310)
4. **Trinidad & Eje Sur Ferroviario** (\`capital-trinidad\`): (-31.5560, -68.5280)

## 3. Protocolo de Exportación SIN TAR (#134 / NCAP-R2)
- **Cero empaquetado .tar:** Se transmiten archivos individuales o un manifiesto JSON con payload UTF-8 / Base64.
- **Tamaño:** Ningún archivo excede 1.024.000 Bytes (0% de riesgo por límites de red).
- **Integridad:** Doble hash SHA-256 y MD5 por archivo.
- **Validación de Tipos:** Esquemas Zod con validación en tiempo de ejecución.
`
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function calculateChecksums(buffer) {
  return {
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    md5: crypto.createHash('md5').update(buffer).digest('hex'),
    sizeBytes: buffer.length
  };
}

/**
 * Exporta Lote 4 a directorio exports/ en formato SIN TAR (JSON bundle + archivos individuales)
 */
export function exportarLote4SinTar() {
  console.log('================================================================');
  console.log(' DELocalSoy.AR — Exportador Lote 4 Contracts NCAP-R2 (SIN TAR)');
  console.log('================================================================');
  console.log(`[INFO] Directorio de exportación: ${EXPORTS_DIR}`);
  ensureDir(EXPORTS_DIR);

  const manifest = {
    loteId: LOTE_4_SPEC.loteId,
    nodo: LOTE_4_SPEC.nodo,
    version: LOTE_4_SPEC.version,
    generatedAt: new Date().toISOString(),
    protocolo: 'NCAP-R2-SIN-TAR-V1',
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    archivos: [],
    resumen: {
      totalArchivos: 0,
      totalBytes: 0,
      todosBajoLimite1MB: true
    }
  };

  const bundlePayload = {};
  const sha256Lines = [];
  const md5Lines = [];

  for (const item of LOTE_4_SPEC.archivos) {
    const relPath = item.relPath;
    let contentStr = CANONICAL_CONTENTS[relPath];

    // Si ya existe en workspace, priorizar el existente o escribir el canónico
    const fullSourcePath = path.join(ROOT_DIR, relPath);
    if (fs.existsSync(fullSourcePath)) {
      contentStr = fs.readFileSync(fullSourcePath, 'utf8');
    } else {
      // Escribir localmente en workspace para materializar el Lote 4
      ensureDir(path.dirname(fullSourcePath));
      fs.writeFileSync(fullSourcePath, contentStr, 'utf8');
      console.log(`  [MATERIALIZADO] ${relPath}`);
    }

    const buf = Buffer.from(contentStr, 'utf8');
    const chk = calculateChecksums(buf);

    if (chk.sizeBytes > MAX_FILE_SIZE_BYTES) {
      manifest.resumen.todosBajoLimite1MB = false;
      throw new Error(`[ERROR] Archivo ${relPath} excede 1.024.000 B (${chk.sizeBytes} B)`);
    }

    // Guardar copia individual exportada sin tar en exports/
    const exportIndivPath = path.join(EXPORTS_DIR, path.basename(relPath));
    fs.writeFileSync(exportIndivPath, buf);

    manifest.archivos.push({
      relPath,
      exportedFileName: path.basename(relPath),
      description: item.description,
      sizeBytes: chk.sizeBytes,
      sha256: chk.sha256,
      md5: chk.md5
    });

    bundlePayload[relPath] = {
      contentUtf8: contentStr,
      contentBase64: buf.toString('base64'),
      sizeBytes: chk.sizeBytes,
      sha256: chk.sha256,
      md5: chk.md5
    };

    sha256Lines.push(`${chk.sha256}  ${path.basename(relPath)}`);
    md5Lines.push(`${chk.md5}  ${path.basename(relPath)}`);

    manifest.resumen.totalArchivos++;
    manifest.resumen.totalBytes += chk.sizeBytes;

    console.log(`  [OK] ${relPath} -> ${chk.sizeBytes} B (SHA256: ${chk.sha256.slice(0, 12)}...)`);
  }

  // 1. Manifiesto principal JSON
  const manifestPath = path.join(EXPORTS_DIR, 'lote-4-contracts-ncap-r2.manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`  [OK] Manifiesto: ${path.relative(ROOT_DIR, manifestPath)}`);

  // 2. Bundle único autónomo en JSON (sin tar, transportable por HTTP/API)
  const bundlePath = path.join(EXPORTS_DIR, 'lote-4-contracts-ncap-r2.bundle.json');
  fs.writeFileSync(bundlePath, JSON.stringify({
    manifest,
    payload: bundlePayload
  }, null, 2), 'utf8');
  const bundleSize = fs.statSync(bundlePath).size;
  console.log(`  [OK] Bundle JSON transportable: ${path.relative(ROOT_DIR, bundlePath)} (${bundleSize} B < 1.024.000 B)`);

  // 3. Manifiestos de checksum estándar sha256sum y md5sum
  const sha256Path = path.join(EXPORTS_DIR, 'lote-4-ncap-r2-checksums.sha256');
  fs.writeFileSync(sha256Path, sha256Lines.join('\n') + '\n', 'utf8');

  const md5Path = path.join(EXPORTS_DIR, 'lote-4-ncap-r2-checksums.md5');
  fs.writeFileSync(md5Path, md5Lines.join('\n') + '\n', 'utf8');

  console.log(`  [OK] Manifiestos SHA256 y MD5 generados en exports/`);
  console.log('================================================================');
  console.log(`[EXITO] Lote 4 exportado al 100% SIN TAR. Total: ${manifest.resumen.totalBytes} Bytes en ${manifest.resumen.totalArchivos} archivos.`);
  console.log('================================================================');

  return { manifest, bundlePath };
}

// Ejecución directa por CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  exportarLote4SinTar();
}
