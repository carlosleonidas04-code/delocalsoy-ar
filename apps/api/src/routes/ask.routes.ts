/**
 * DELocalSoy.AR — Endpoint /api/ask con Branch-Order Corregido y Contrato Ético Tripartito
 * Archivo: apps/api/src/routes/ask.routes.ts
 *
 * Corrección clave de auditoría (Branch-Order + ADR-004 + ADR-020 + ADR-021):
 * 1. Validación estructural Zod del query antes de cualquier procesamiento.
 * 2. Bloqueo determinista Anti-PII en servidor (Ley 25.326: DNI, CUIL/CUIT, email) antes de consultar.
 * 3. Resolución del alcance territorial en los 3 departamentos de San Juan:
 *    ['capital', 'caucete', 'iglesia'] con soporte de "Iglesia-primero condicional"
 *    (swap automático a 'caucete' cuando iglesiaCustodianAvailable === false).
 * 4. Orden estricto de evaluación de ramas (de más específica a más general):
 *    1º emergency_hydric_alert -> 2º spatial_postgis_query -> 3º seci_field_evidence -> 4º general_territorial_rag
 *    (Corrige el bug donde la rama general capturaba todas las consultas al inicio).
 * 5. Salida obligatoria bajo Contrato Ético Tripartito (dato -> interpretacion -> sugerencia)
 *    con requiresHumanReview: true (Regla R7 / ADR-004).
 */

import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireWriteAuth } from '../middleware/jwtAuth.js';
import { askRateLimiter } from '../middleware/rateLimiter.js';

export const askRouter: Router = Router();

export type AskBranchMatched =
  | 'emergency_hydric_alert'
  | 'spatial_postgis_query'
  | 'seci_field_evidence'
  | 'general_territorial_rag';

export const ASK_BRANCH_EVALUATION_ORDER: AskBranchMatched[] = [
  'emergency_hydric_alert',
  'spatial_postgis_query',
  'seci_field_evidence',
  'general_territorial_rag',
];

const DNI_REGEX = /\b\d{1,2}\.\d{3}\.\d{3}\b/;
const CUIL_REGEX = /\b(20|23|24|27|30|33|34)-\d{8}-\d\b/;
const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

function detectPiiInQuery(text: string): string | null {
  if (DNI_REGEX.test(text)) return 'DNI detectado en consulta';
  if (CUIL_REGEX.test(text)) return 'CUIL/CUIT detectado en consulta';
  if (EMAIL_REGEX.test(text)) return 'Email personal detectado en consulta';
  return null;
}

const AskRequestSchema = z.object({
  query: z.string().min(3, 'La consulta debe tener al menos 3 caracteres').max(2000),
  nodeKey: z.enum(['capital', 'caucete', 'iglesia']).optional().default('iglesia'),
  iglesiaCustodianAvailable: z.boolean().optional().default(true),
});

/**
 * Clasificador con orden de ramas corregido (específicas primero, general al final).
 */
export function classifyAskBranch(query: string): AskBranchMatched {
  const q = query.toLowerCase();

  // Rama 1 (Más específica): Emergencia hídrica / caudal / turno de riego / sequía
  if (
    q.includes('emergencia') ||
    q.includes('alerta') ||
    q.includes('caudal') ||
    q.includes('sequía') ||
    q.includes('sequia') ||
    q.includes('canal') ||
    q.includes('hídric') ||
    q.includes('hidric')
  ) {
    return 'emergency_hydric_alert';
  }

  // Rama 2 (Específica espacial): PostGIS, bbox, geometría, polígono, coordenadas, SRID=4326
  if (
    q.includes('bbox') ||
    q.includes('postgis') ||
    q.includes('geometr') ||
    q.includes('polígono') ||
    q.includes('poligono') ||
    q.includes('coordenada') ||
    q.includes('srid') ||
    q.includes('mapa')
  ) {
    return 'spatial_postgis_query';
  }

  // Rama 3 (Específica de campo y evidencia): SECI, outbox, evidencia EV-xxx, reporte
  if (
    q.includes('seci') ||
    q.includes('outbox') ||
    q.includes('ev-') ||
    q.includes('evidencia') ||
    q.includes('reporte') ||
    q.includes('custodio')
  ) {
    return 'seci_field_evidence';
  }

  // Rama 4 (Fallback general): solo si ninguna rama específica coincidió
  return 'general_territorial_rag';
}

// GET /api/ask/branches — Inspección determinista del orden de evaluación de ramas
askRouter.get('/branches', (_req, res) => {
  res.status(200).json({
    branchOrderFixed: true,
    evaluationOrder: ASK_BRANCH_EVALUATION_ORDER,
    sanJuanNodesAllowed: ['capital', 'caucete', 'iglesia'],
    conditionalRule: 'Iglesia-primero condicional con swap automático a Caucete si iglesiaCustodianAvailable === false (ADR-021)',
  });
});

// POST /api/ask — Consulta territorial bajo guardia requireWriteAuth (R8) y rateLimiter
askRouter.post('/', askRateLimiter, requireWriteAuth, (req, res) => {
  // 1. Validación estructural
  const parsed = AskRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Consulta inválida en /api/ask',
      issues: parsed.error.issues,
    });
    return;
  }

  const { query, nodeKey, iglesiaCustodianAvailable } = parsed.data;

  // 2. Guardia Anti-PII en servidor (Ley 25.326 · ADR-020 T2)
  const piiDetected = detectPiiInQuery(query);
  if (piiDetected) {
    res.status(422).json({
      error: `Bloqueo Anti-PII en servidor (Ley 25.326): ${piiDetected}. Ninguna consulta con datos personales ingresa a events_raw.`,
      rule: 'ADR-020-T2',
    });
    return;
  }

  // 3. Regla operativa "Iglesia-primero condicional" (ADR-021 · Línea 2)
  const conditionalSwapApplied = nodeKey === 'iglesia' && !iglesiaCustodianAvailable;
  const effectiveNodeKey: 'capital' | 'caucete' | 'iglesia' = conditionalSwapApplied
    ? 'caucete'
    : nodeKey;

  // 4. Evaluación con branch-order corregido (específicas antes de general)
  const branchMatched = classifyAskBranch(query);

  const nodeLabels: Record<'capital' | 'caucete' | 'iglesia', string> = {
    capital: 'Capital (Distrito Centro y Distrito Desamparados · San Juan)',
    caucete: 'Caucete (Oasis Productivo y Corredor Este · San Juan)',
    iglesia: 'Iglesia (Cuenca Alta Cordillerana · San Juan)',
  };

  let dato = '';
  let interpretacion = '';
  let sugerencia = '';
  let evidencesLinked: string[] = [];

  if (branchMatched === 'emergency_hydric_alert') {
    dato = `Nodo activo: ${nodeLabels[effectiveNodeKey]}. Telemetría hídrica e infraestructura de riego monitoreada en SRID=4326 con trazabilidad SHA-256 en events_raw.`;
    interpretacion = `La consulta activó la Rama 1 (emergency_hydric_alert) antes del fallback general. ${conditionalSwapApplied ? 'Se aplicó swap condicional Iglesia -> Caucete por disponibilidad de custodio territorial.' : 'Custodio territorial activo en el nodo seleccionado.'}`;
    sugerencia = `Verificar en campo con la brigada de ${nodeLabels[effectiveNodeKey]} y registrar observación firmada en Outbox Ed25519 antes de elevar alerta.`;
    evidencesLinked = ['EV-005', 'EV-015', 'EV-018'];
  } else if (branchMatched === 'spatial_postgis_query') {
    dato = `Nodo activo: ${nodeLabels[effectiveNodeKey]}. Geometrías WKT SRID=4326 indexadas con índice GiST idx_territorios_geom_gist.`;
    interpretacion = `La consulta activó la Rama 2 (spatial_postgis_query) para intersección espacial ST_Intersects / ST_MakeEnvelope en ${effectiveNodeKey}.`;
    sugerencia = `Ejecutar filtro GET /api/territorios?bbox= sobre ${effectiveNodeKey} y contrastar capas soberanas del nodo.`;
    evidencesLinked = ['EV-003', 'EV-007', 'EV-010', 'EV-015'];
  } else if (branchMatched === 'seci_field_evidence') {
    dato = `Nodo activo: ${nodeLabels[effectiveNodeKey]}. Flujo ADR-020 en 3 estados: pendiente_outbox_local -> espejado_firestore_sin_verificar -> ingestado_events_raw_verificado.`;
    interpretacion = `La consulta activó la Rama 3 (seci_field_evidence) vinculada al ciclo reporte -> events_raw -> visualización (DEC-008).`;
    sugerencia = `Acreditar el registro de campo con firma Ed25519 del custodio y verificar su hash en /api/events.`;
    evidencesLinked = ['EV-005', 'EV-012', 'EV-016', 'EV-017'];
  } else {
    dato = `Nodo activo: ${nodeLabels[effectiveNodeKey]}. Alcance heurístico concentrado en los 3 departamentos de San Juan (Capital, Caucete, Iglesia · ADR-021).`;
    interpretacion = `La consulta fue atendida por la Rama 4 (general_territorial_rag) tras descartar las 3 ramas específicas previas.`;
    sugerencia = `Vincular la consulta a un reporte verificable o capa territorial del nodo ${effectiveNodeKey} bajo revisión humana obligatoria.`;
    evidencesLinked = ['EV-004', 'EV-006', 'EV-011'];
  }

  const eventHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        branchMatched,
        effectiveNodeKey,
        query,
        requiresHumanReview: true,
      }),
    )
    .digest('hex');

  res.status(200).json({
    success: true,
    branchMatched,
    branchEvaluationOrder: ASK_BRANCH_EVALUATION_ORDER,
    effectiveNodeKey,
    conditionalSwapApplied,
    tripartiteContract: {
      dato,
      interpretacion,
      sugerencia,
      requiresHumanReview: true,
    },
    evidencesLinked,
    eventHash,
  });
});
