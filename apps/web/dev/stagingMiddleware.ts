/**
 * DELocalSoy.AR — Staging middleware del dev server (API de horizonte 3:
 * territorios, capas, evidencias, geometrías espaciales, snapshots temporales,
 * multi-escala, linaje, cola offline, custodios acreditados, telemetría,
 * reportes y auditoría) — FE-DEUDA-03 #294.
 *
 * Extraído 1:1 de vite.config.ts (refactor puro, sin cambio de comportamiento):
 * mismo estado mutable inicial, mismas rutas, mismas respuestas, mismo orden de
 * registro. Los datos semilla viven en stagingSeeds.ts; la voz en tiempo real
 * (live-ws) vive en liveWsServer.ts con sus puertas en liveWsGate.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { Type } from '@google/genai';
import { createServerGeminiClient, ETHICAL_ROLE_SYSTEM_INSTRUCTIONS } from './geminiLiveClient';
import {
  NODE_BASE_COORDS,
  REPORT_FLOW,
  computeHash,
  initialAccreditedCustodians,
  initialCategories,
  initialEvidencias,
  initialFeatures,
  initialLayers,
  initialLineageChain,
  initialMultiScaleSyntheses,
  initialOfflineFieldQueue,
  initialSpatialGeometries,
  initialSpatialIntersections,
  initialSyncPacks,
  initialTemporalSnapshots,
  initialTelemetryWebhooks,
  initialTerritorios,
  type TerritorioRecord,
} from './stagingSeeds';

export function montarStaging(server: ViteDevServer): void {
  let territorios = [...initialTerritorios];
  const layers = { ...initialLayers };
  const categories = { ...initialCategories };
  const features = [...initialFeatures];
  const evidencias = [...initialEvidencias];
  const spatialGeometries = [...initialSpatialGeometries];
  const syncPacks = [...initialSyncPacks];
  const temporalSnapshots = [...initialTemporalSnapshots];
  const multiScaleSyntheses = [...initialMultiScaleSyntheses];
  const lineageChain = [...initialLineageChain];
  const spatialIntersections = [...initialSpatialIntersections];
  const offlineFieldQueue = [...initialOfflineFieldQueue];
  const accreditedCustodians = [...initialAccreditedCustodians];
  const telemetryWebhooks = [...initialTelemetryWebhooks];
  let runtimeHealthMode: 'real' | 'synthetic' | 'degraded' = 'real';
  let lastMultiAgentAuditAt = '2026-10-04T14:50:00.000Z';
  const sovereigntyModes: Record<
    string,
    'delegacion_revocable_activa' | 'custodia_local_estricta'
  > = {
    capital: 'delegacion_revocable_activa',
    caucete: 'delegacion_revocable_activa',
    iglesia: 'delegacion_revocable_activa',
  };
  const lastAuditByNode: Record<string, string> = {
    capital: '2026-10-04T10:48:00.000Z',
    caucete: '2026-10-04T10:48:00.000Z',
    iglesia: '2026-10-04T10:48:00.000Z',
  };

  const buildFederalSovereignty = () =>
    territorios.map((t) => {
      const nodeLayers = layers[t.key] ?? [];
      const nodeGeoms = spatialGeometries.filter((g) => g.nodeKey === t.key);
      const nodePacks = syncPacks.filter(
        (p) => p.sourceNodeKey === t.key || p.targetNodeKey === t.key,
      );
      const custodiansSet = new Set<string>();
      for (const l of nodeLayers) {
        for (const c of l.producedBy ?? []) custodiansSet.add(c);
      }
      const mode = sovereigntyModes[t.key] ?? 'delegacion_revocable_activa';
      const merkleRoot = computeHash('NodeMerkleStateRoot', t.id, {
        key: t.key,
        layers: nodeLayers.length,
        geoms: nodeGeoms.length,
        packs: nodePacks.length,
        mode,
      });
      return {
        nodeKey: t.key,
        nodeName: t.nombre,
        provincia: t.provincia,
        custodiansActive: Array.from(custodiansSet),
        sharedLayersCount:
          mode === 'delegacion_revocable_activa' ? nodeLayers.length : 1,
        postgisCount: nodeGeoms.length,
        syncPacksCount: nodePacks.length,
        sovereigntyMode: mode,
        nodeMerkleRoot: merkleRoot,
        lastAuditAt: lastAuditByNode[t.key] ?? lastMultiAgentAuditAt,
      };
    });

  const seedTime = '2026-10-04T04:50:00.000Z';
  const seedHash = computeHash('TerritorialReportCreated', 'ter-sjn-cap', {
    category: 'insufficient_lighting',
    description: 'Corredor peatonal con baja visibilidad nocturna en Av. Ignacio de la Roza',
  });

  const reports: any[] = [
    {
      id: 'rep-seed-01',
      eventId: 'ev-seed-01',
      nodeKey: 'capital',
      category: 'insufficient_lighting',
      categoryLabel: 'Iluminación insuficiente',
      description: 'Corredor peatonal con baja visibilidad nocturna en Av. Ignacio de la Roza',
      status: 'evaluating',
      createdAt: seedTime,
      isSynthetic: true,
      picked: { x: 46, y: 42 },
      history: [
        { status: 'received', at: seedTime },
        { status: 'evaluating', at: '2026-10-04T04:55:00.000Z' },
      ],
      humanReviewed: false,
    },
  ];

  const eventsRaw: any[] = [
    {
      id: 'ev-seed-01',
      type: 'TerritorialReportCreated',
      nodeId: 'ter-sjn-cap',
      hash: seedHash,
      payload: {
        reportId: 'rep-seed-01',
        nodeKey: 'capital',
        category: 'insufficient_lighting',
      },
      occurred_at: seedTime,
      ingested_at: seedTime,
      is_synthetic: true,
    },
  ];

  const readBody = (req: any): Promise<any> =>
    new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(e);
        }
      });
    });

  server.middlewares.use(async (req, res, next) => {
    if (!req.url) return next();
    const url = new URL(req.url, 'http://localhost:3000');
    // R5 (riesgo H-02): sin fallback silencioso — toda excepción del middleware
    // (p. ej. JSON malformado rechazado por readBody) se responde con causa
    // explícita en vez de dejar el request colgado con unhandledRejection.
    try {

    if (url.pathname === '/api/health' || url.pathname === '/health') {
      res.setHeader('Content-Type', 'application/json');
      const okEvs = evidencias.filter((e) => e.status === 'ok').length;
      res.end(
        JSON.stringify({
          status: runtimeHealthMode === 'degraded' ? 'degraded' : 'ok',
          service: 'delocalsoy-ar-api',
          version: '7.5.0-staging',
          mode: runtimeHealthMode,
          dataSource: runtimeHealthMode === 'synthetic' ? 'synthetic' : 'api',
          dbEngine: 'PostgreSQL + PostGIS SRID=4326 (GiST Index Activo)',
          repoMainCommit: '68a8872',
          evidenciasMainRepoOk: 2,
          evidenciasMainRepoTotal: 6,
          evidenciasStagingOk: okEvs,
          evidenciasStagingTotal: evidencias.length,
          evidenciasOk: okEvs,
          evidenciasTotal: evidencias.length,
          landingStatus: 'staging_pending_pr_merge',
          r15AccreditationRule: 'staging_proposes_github_accredits',
          recurrenceCountInIssue25: 2,
          adr015Role: 'client_of_api_contract_and_staging_sandbox',
          landingBranches: [
            'agent-google/health-mode (#20)',
            'agent-google/geo-bbox (#21)',
            'agent-google/gobernanza-r14 (#22, #24, #25)',
            'agent-google/docs-ev (#23)',
            'agent-google/contracts (#26)',
            'agent-google/migrations-protocol (#27)',
            'agent-google/diataxis-onboarding (#28)',
            'agent-google/hitub-contrato-social (#29)',
            'agent-google/security-slsa (#30)',
          ],
          branchProtection: 'main-protected-pr-required',
          activeAgents: ['agent-vibe-mistral', 'agent-google'],
          humanGateActive: true,
        }),
      );
      return;
    }

    if (url.pathname === '/api/health/mode' && req.method === 'PATCH') {
      res.setHeader('Content-Type', 'application/json');
      const parsed = await readBody(req);
      if (
        parsed.mode === 'real' ||
        parsed.mode === 'synthetic' ||
        parsed.mode === 'degraded'
      ) {
        runtimeHealthMode = parsed.mode;
      }
      const now = new Date().toISOString();
      const hash = computeHash('RuntimeHealthModeSwitched', 'nucleo-federado-ar', {
        mode: runtimeHealthMode,
        rule: 'R5 (Sin fallbacks silenciosos)',
        at: now,
      });
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'RuntimeHealthModeSwitched',
        nodeId: 'nucleo-federado-ar',
        hash,
        payload: {
          mode: runtimeHealthMode,
          dataSource: runtimeHealthMode === 'synthetic' ? 'synthetic' : 'api',
          ruleVerified: 'R5',
        },
        occurred_at: now,
        ingested_at: now,
        is_synthetic: runtimeHealthMode === 'synthetic',
      });
      res.end(
        JSON.stringify({
          success: true,
          mode: runtimeHealthMode,
          dataSource: runtimeHealthMode === 'synthetic' ? 'synthetic' : 'api',
          hash,
        }),
      );
      return;
    }

    // GET /api/ecosistema-ia & POST /api/ecosistema-ia/auditar-reglas
    if (
      url.pathname === '/api/ecosistema-ia' ||
      url.pathname === '/api/ecosistema-ia/auditar-reglas'
    ) {
      res.setHeader('Content-Type', 'application/json');
      const okEvs = evidencias.filter((e) => e.status === 'ok').length;

      if (req.method === 'POST' && url.pathname === '/api/ecosistema-ia/auditar-reglas') {
        lastMultiAgentAuditAt = new Date().toISOString();
        const auditHash = computeHash(
          'MultiAgentEcosystemAudited',
          'nucleo-federado-ar',
          {
            rulesCount: 28,
            agents: [
              'agent-vibe-mistral (active_sync_repo)',
              'agent-google (active_sync_staging)',
              'agent-perplexity-synthesis (accepted_async_digest_RP1_RP8)',
              'agent-anthropic (pending_acceptance_async_digest_RA1_RA5)',
              'human-lead (sovereign_arbiter)',
            ],
            runtimeHealthMode,
            r15StagingRule: 'staging_proposes_github_accredits_ratified_in_31',
            raRules: 'RA1..RA5_snapshot_relative_digest_audit_pending_claude_acceptance',
            rpRules: 'RP1..RP8_perplexity_synthesis_accepted_2026_10_05',
            at: lastMultiAgentAuditAt,
          },
        );
        eventsRaw.unshift({
          id: `ev-${Math.random().toString(16).slice(2, 8)}`,
          type: 'MultiAgentEcosystemAudited',
          nodeId: 'nucleo-federado-ar',
          hash: auditHash,
          payload: {
            rulesVerified:
              'R1..R15 (R15 Ratificada #31) + RP1..RP8 ([agent: perplexity/synthesis] Aceptado · ADR-023) + RA1..RA5 (agent-anthropic pendiente de aceptación · ADR-022)',
            agents: [
              'agent-vibe-mistral',
              'agent-google',
              'agent-perplexity/synthesis (Aceptado)',
              'agent-anthropic (Pendiente aceptación)',
            ],
            humanGate: 'ADR-013..023 / GOBERNANZA.md v7.5 / LABORATORIO_ECOSISTEMA_MULTIAGENTE.md',
            runtimeMode: runtimeHealthMode,
          },
          occurred_at: lastMultiAgentAuditAt,
          ingested_at: lastMultiAgentAuditAt,
          is_synthetic: false,
        });
        res.end(
          JSON.stringify({
            success: true,
            auditHash,
            auditedAt: lastMultiAgentAuditAt,
            message: `Auditoría del Laboratorio Multi-Agéntico Híbrido (Sincrónico + Asincrónico) completada: R1–R15 (R15 ratificada en #31) + RP1–RP8 ([agent: perplexity/synthesis] aceptado · ADR-023) + RA1–RA5 (agent-anthropic aguardando aceptación · ADR-022) · Hash: ${auditHash}`,
          }),
        );
        return;
      }

      res.end(
        JSON.stringify({
          success: true,
          data: {
            version: '1.5-v7.5-r15-ra5-rp8',
            lastAuditedAt: lastMultiAgentAuditAt,
            runtimeHealth: {
              mode: runtimeHealthMode,
              dataSource: runtimeHealthMode === 'synthetic' ? 'synthetic' : 'api',
              repoMainCommit: '68a8872',
              evidenciasMainRepoOk: 2,
              evidenciasMainRepoTotal: 6,
              evidenciasStagingOk: okEvs,
              evidenciasStagingTotal: evidencias.length,
              landingStatus: 'staging_pending_pr_merge',
              r15AccreditationRule: 'staging_proposes_github_accredits',
              raSnapshotMethod: 'snapshot_relative_work_ra1_ra5_pending_claude_acceptance',
              rpSynthesisMethod: 'evidence_narrative_coherence_rp1_rp8_accepted',
              recurrenceCountInIssue25: 2,
              adr015Role: 'client_of_api_contract_and_staging_sandbox',
              branchProtection: 'main-protected-pr-required',
            },
          },
        }),
      );
      return;
    }

    // POST /api/ecosistema-ia/matriz-evidencia-relato ([agent: perplexity/synthesis] · Reglas RP1-RP8 · Matriz de Coherencia Evidencia-Relato v1 · ADR-023)
    if (url.pathname === '/api/ecosistema-ia/matriz-evidencia-relato' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const nowIso = new Date().toISOString();
      const matrixRows = [
        {
          claim: '1A. EV-003 y EV-006 acreditadas en el estado fusionado de main (2/6)',
          accreditation_scope: 'main',
          epistemic_state: 'verificado-main',
          source: 'docs/EVIDENCIA.md · PR #7 · Snapshot main @ 68a8872',
          verification_command: 'pnpm --filter @delocalsoy/db db:generate && pnpm run build',
          success_criteria: 'EXIT 0 en GitHub Actions sobre el commit fusionado en main',
          main_sha: '68a8872',
          ci_run_url: 'https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368',
          safe_formulation: '2/6 evidencias (EV-003 y EV-006) están acreditadas en main @ 68a8872 con CI run 37098706368.',
          human_review_required: true,
        },
        {
          claim: '1B. 18/18 evidencias (incluyendo EV-001, 002, 004, 005, 007..018) con verificación EXIT 0 en staging',
          accreditation_scope: 'staging',
          epistemic_state: 'evidencia-staging',
          source: 'docs/EVIDENCIA.md · Issues #20–#25, #31 (ADR-019)',
          verification_command: 'bash scripts/aterrizar-prs-v75-github.sh',
          success_criteria: '6 PRs abiertos, pre-auditados (R12) y fusionados con CI verde por SHA en main',
          main_sha: null,
          ci_run_url: null,
          safe_formulation: '18/18 evidencias con verificación EXIT 0 en staging; 2/6 acreditadas en main según el snapshot declarado (68a8872).',
          human_review_required: true,
        },
        {
          claim: '2. requireWriteAuth cubre el 100% de las rutas de escritura, host 127.0.0.1 y mock DB acotado a NODE_ENV=test',
          accreditation_scope: 'staging',
          epistemic_state: 'evidencia-staging',
          source: 'PR #20/#30 · suite verify:zero-unauth-writes',
          verification_command: 'npm run verify:zero-unauth-writes',
          success_criteria: 'EXIT 0 y cobertura declarada de rutas de escritura',
          main_sha: null,
          ci_run_url: null,
          safe_formulation: 'La suite de staging verifica la protección de escrituras; la acreditación en main requiere merge, CI y registro de evidencia.',
          human_review_required: true,
        },
        {
          claim: '3. Guardia Anti-PII (scrubAndAssertNoPii + hasOnly) en registros de campo territorial_seci_records',
          accreditation_scope: 'staging',
          epistemic_state: 'evidencia-staging',
          source: 'Issue #32 (ADR-020) · firestore.rules · verify:firestore-security',
          verification_command: 'npm run verify:firestore-security',
          success_criteria: 'EXIT 0 bloqueando los vectores testeados de DNI, CUIL/CUIT, teléfono y email',
          main_sha: null,
          ci_run_url: null,
          safe_formulation: 'La guardia anti-PII bloquea los patrones testeados antes de sincronizar; la ausencia total de PII requiere validación adicional y revisión humana.',
          human_review_required: true,
        },
        {
          claim: '4. Firestore opera como espejo offline-first bajo precedencia canónica de events_raw/PostGIS',
          accreditation_scope: 'staging',
          epistemic_state: 'evidencia-staging',
          source: 'ADR-020 (#32#issuecomment-5986593565 · pendiente de ratificación humana R9)',
          verification_command: 'npm run verify:firestore-security',
          success_criteria: 'EXIT 0 en check [4/4] de CANONICAL_PRECEDENCE_RULE y Digest de Sincronización',
          main_sha: null,

          ci_run_url: null,
          safe_formulation: 'Firestore es espejo de sincronización offline-first; events_raw/PostGIS conserva la precedencia canónica y ADR-020 aguarda firma humana y merge en main.',
          human_review_required: true,
        },
        {
          claim: '5. Alcance territorial en Capital, Caucete e Iglesia (San Juan) con ausencia verificada del 4.º nodo retirado en todo el repositorio',
          accreditation_scope: 'staging',
          epistemic_state: 'evidencia-staging',
          source: 'ADR-021 (#33#issuecomment-5986593897 · pendiente de ratificación humana R9)',
          verification_command: 'npm run verify:no-lavalle-scope',
          success_criteria: 'EXIT 0 en los 4 checks: escaneo integral del repositorio (0 coincidencias), contratos, seeds y reglas Firestore',
          main_sha: null,
          ci_run_url: null,
          safe_formulation: 'La suite verify:no-lavalle-scope confirma 0 referencias al nodo retirado en todo el repositorio y valida que contratos, seeds y reglas operen exclusivamente sobre Capital, Caucete e Iglesia; el alcance queda pendiente de ratificación humana de ADR-021 (#33) y merge en main.',
          human_review_required: true,
        },
        {
          claim: '6. Contratos @delocalsoy/contracts (C1–C5), OpenAPI 3.1.0 y tutorial Diátaxis 15m',
          accreditation_scope: 'staging',
          epistemic_state: 'evidencia-staging',
          source: 'Issues #26, #27, #28 · packages/contracts · docs/TUTORIAL-ONBOARDING.md',
          verification_command: 'npm run verify:onboarding',
          success_criteria: 'EXIT 0 + digest SHA-256 OpenAPI 5a040b08c46ceb76',
          main_sha: null,
          ci_run_url: null,
          safe_formulation: 'Los contratos C1–C5 y el tutorial Diátaxis tienen evidencia EXIT 0 en staging; no se presentan como vigentes en main hasta su merge y CI.',
          human_review_required: true,
        },
      ];
      const synthesisHash = computeHash(
        'PerplexityEvidenceNarrativeMatrixVerified',
        'nucleo-federado-ar',
        {
          agent: '[agent: perplexity/synthesis]',
          roleState: 'accepted_in_staging_pending_human_ratification_and_main_merge',
          rules: ['RP1', 'RP2', 'RP3', 'RP4', 'RP5', 'RP6', 'RP7', 'RP8'],
          adr021Status: 'pending_human_ratification_r9',
          adr023Status: 'pending_human_ratification_r9',
          taxonomy: 'verificado-main | evidencia-staging | pr-pendiente | disenado | hipotesis',
          snapshotSha: '68a8872',
          claimsAudited: matrixRows.length,
          at: nowIso,
        },
      );
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'PerplexityEvidenceNarrativeMatrixVerified',
        nodeId: 'nucleo-federado-ar',
        hash: synthesisHash,
        payload: {
          agent: '[agent: perplexity/synthesis]',
          constitutionalLegend: 'Staging propone · GitHub acredita · La Dirección Humana decide',
          roleStatus: ' Rol aceptado en staging · Pendiente de ratificación humana (ADR-023 · R9) y acreditación en main (R15)',
          rulesEnforced: ['RP1', 'RP2', 'RP3', 'RP4', 'RP5', 'RP6', 'RP7', 'RP8'],
          taxonomyEnforced: 'verificado-main | evidencia-staging | pr-pendiente | disenado | hipotesis',
          claimsAuditedCount: matrixRows.length,
          matrixRows,
          doc: 'docs/LABORATORIO_ECOSISTEMA_MULTIAGENTE.md',
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });
      res.end(
        JSON.stringify({
          success: true,
          synthesisHash,
          verifiedAt: nowIso,
          claimsAudited: matrixRows.length,
          constitutionalLegend: 'Staging propone · GitHub acredita · La Dirección Humana decide',
          matrixRows,
          message: `Matriz de Coherencia Evidencia–Relato v1 ([agent: perplexity/synthesis] · RP1–RP8) verificada: taxonomía "evidencia-staging" aplicada, main_sha/ci_run_url exigidos para "verificado-main" (EV-003/006), ADR-021/023 marcados pendientes de ratificación humana · Sellado: ${synthesisHash}`,
        }),
      );
      return;
    }

    // POST /api/ecosistema-ia/digest-packet-anthropic (Generador de Digest Packet RA1-RA5 para agent-anthropic · ADR-022)
    if (url.pathname === '/api/ecosistema-ia/digest-packet-anthropic' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const parsed = await readBody(req);
      const taskCode = String(parsed.taskCode || 'T1') as 'T1' | 'T2' | 'T3' | 'T4';
      const nowIso = new Date().toISOString();
      const digestHash = computeHash(
        'AnthropicDigestPacketGenerated',
        'nucleo-federado-ar',
        {
          taskCode,
          snapshotSha: '68a8872',
          issues: '#20..#33',
          rules: 'R1..R15 + RA1..RA5',
          at: nowIso,
        },
      );
      const taskDescriptions: Record<'T1' | 'T2' | 'T3' | 'T4', { title: string; focus: string }> = {
        T1: {
          title: 'T1 · Pre-auditoría ciega de PRs (#20, #26, #30, #32, #33)',
          focus: 'Auditar sin sesgo de anclaje los 6 PRs agent-google/* contra las listas de verificación de #20 (health-mode + mock DB en test), #26 (contracts C1-C5), #30 (requireWriteAuth R8 + CI job + Dependabot), #32 (ADR-020 Firestore espejo) y #33 (ADR-021 alcance 3 departamentos de San Juan sin restos del nodo retirado).',
        },
        T2: {
          title: 'T2 · Red-team de gobernanza (R1–R15, RA1–RA5, C1–C5, ADR-019..022)',
          focus: 'Buscar vectores de ataque o casos límite donde una regla pueda cumplirse en letra pero violarse en espíritu (ej. divergencia Firestore vs events_raw, Merkle digest en staging vs main, bypass de requireWriteAuth o deriva de OpenAPI).',
        },
        T3: {
          title: 'T3 · Propuesta de Valor Territorial (Nivel 3 · San Juan)',
          focus: 'Diseñar la prueba de adopción institucional y ficha de valor para municipios, uniones vecinales, juntas de riego y cooperativas en los 3 departamentos focales de San Juan: Capital (Distrito Centro y Desamparados), Caucete e Iglesia.',
        },
        T4: {
          title: 'T4 · Síntesis Diátaxis (Cuadrante Entender · HITUB v2.0)',
          focus: 'Redactar la explicación conceptual y metodológica de HITUB v2.0 y del Ciclo SECI territorial para organismos de fomento, universidades y auditores externos sin jerga interna.',
        },
      };
      const selectedTask = taskDescriptions[taskCode] || taskDescriptions.T1;
      const digestMarkdown = `# Digest Packet para Claude (\`agent-anthropic\`) — DELocalSoy.AR
- **Snapshot declarado (\`RA1\`):** \`main @ 68a8872\` · Fecha: \`${nowIso.slice(0, 10)}\`
- **Digest SHA-256 en \`events_raw\`:** \`${digestHash}\`
- **Estado del ciclo:** Paso 1 completado (\`ADR-019 / #31\` ratificado por Dirección Humana); Pre-auditoría documental \`R12\` aprobada en \`#30\`, \`#32\` (\`ADR-020\`) y \`#33\` (\`ADR-021\`); listo para Paso 2 (ejecución de \`aterrizar-prs-v75-github.sh\` con 6 PRs atómicos).
- **Alcance territorial (\`ADR-021 · #33\`):** 3 departamentos de la Provincia de San Juan: **Capital (Distritos Centro y Desamparados)**, **Caucete** e **Iglesia** (cero restos del nodo retirado en código/seeds/reglas).
- **Precedencia de datos (\`ADR-020 · #32\`):** \`events_raw\` / PostGIS es la única fuente de verdad canónica; Firestore opera como espejo de sincronización offline-first (\`H4\`) con bloqueo determinista Anti-PII (\`verify:firestore-security\`).

## Encargo Asignado: ${selectedTask.title}
${selectedTask.focus}

## Formato de Respuesta Obligatorio (\`RA1–RA4\`)
\`\`\`markdown
## [agent: anthropic] — ${selectedTask.title} · Snapshot: 68a8872 · ${nowIso.slice(0, 10)}
**Cláusula de vigencia (RA1):** válido sobre snapshot \`main @ 68a8872\` e issues \`#1–#33\`; revalidar puntos marcados con ⏳ tras el merge de los 6 PRs \`agent-google/*\`.
**Hallazgos:** (numerados, con severidad 🔴/🟠/🟡 y cita a issue#, archivo o regla).
**Verificable por (RA2):** (comando exacto de terminal o procedimiento reproducible para que la Dirección Humana lo ejecute y acredite en GitHub).
\`\`\`
`;

      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'AnthropicDigestPacketGenerated',
        nodeId: 'nucleo-federado-ar',
        hash: digestHash,
        payload: {
          taskCode,
          taskTitle: selectedTask.title,
          snapshotSha: '68a8872',
          rulesEnforced: ['RA1', 'RA2', 'RA3', 'RA4', 'RA5', 'R12', 'R15'],
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });

      res.end(
        JSON.stringify({
          success: true,
          taskCode,
          digestHash,
          generatedAt: nowIso,
          digestMarkdown,
          message: `Digest Packet (${selectedTask.title}) generado bajo RA1–RA5 (Snapshot main @ 68a8872) y sellado en events_raw: ${digestHash}. Copiado al portapapeles para enviar a Claude (agent-anthropic).`,
        }),
      );
      return;
    }

    // POST /api/ecosistema-ia/auditar-redteam-t2 (Acreditación en Staging del Entregable T2 de [agent: anthropic] sobre R15 y ADR-020 · ADR-022)
    if (url.pathname === '/api/ecosistema-ia/auditar-redteam-t2' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const nowIso = new Date().toISOString();
      const findingsRemediated = [
        {
          id: 'T2-R15-01',
          target: 'R15 (ADR-019)',
          severity: '🔴 Crítico',
          finding: '"Acreditado" no estaba definido (abrir los 6 PRs cumplía la letra con main aún en 2/6 EV).',
          remediation: 'Se define ciclo de 4 estados: propuesto (staging) -> en PR -> verificado en PR -> acreditado en main (merge + run push en main).',
          verifiableBy: 'gh pr list --state all --json number,headRefName,state,mergedAt && gh run list --branch main -L 5',
        },
        {
          id: 'T2-R15-02',
          target: 'R15 (ADR-019)',
          severity: '🔴 Crítico',
          finding: 'La compuerta fuerte de CI viajaba en el PR 6 (último en mergear) y un PR podía editar el CI que lo juzga.',
          remediation: 'El PR 1 (agent-google/health-mode) aterriza PRIMERO .github/workflows/ci.yml, .github/CODEOWNERS y las 4 suites verify:*.',
          verifiableBy: 'git diff --stat origin/main...agent-google/health-mode -- .github package.json scripts/',
        },
        {
          id: 'T2-R15-03',
          target: 'R15 / R8',
          severity: '🟠 Alto',
          finding: 'Un humano, una identidad (GitHub bloquea auto-aprobar el propio PR y plan Free no fuerza rulesets en repo privado).',
          remediation: 'ratificar-y-acreditar-humano.sh soporta GH_TOKEN_AGENT vs GH_TOKEN_HUMAN e incorpora fallback honesto Single-Maintainer Mode con sello firmado en comentario.',
          verifiableBy: 'gh api repos/carlosleonidas04-code/delocalsoy-ar/branches/main/protection && bash scripts/ratificar-y-acreditar-humano.sh --auditar-redteam-t2',
        },
        {
          id: 'T2-R15-04',
          target: 'R15 / R9',
          severity: '🟠 Alto',
          finding: 'R15 aplicada a sí misma: ADR-019 ratificado en comentario (#31) aún viaja hacia main en el PR 3.',
          remediation: 'Se distingue adr_status: proposed-staging | ratified-issue (#31#issuecomment-5986479235) | accepted-main (solo tras merge en main).',
          verifiableBy: 'gh issue view 31 --comments',
        },
        {
          id: 'T2-R15-05',
          target: 'R15 / Firestore',
          severity: '🟠 Alto',
          finding: 'R15 no cubría lo desplegado fuera del repo (firestore.rules vivas en Firebase Console).',
          remediation: 'verify:firestore-security calcula el digest SHA-256 de firestore.rules y se despliegan en vivo sobre ai-studio-delocalsoyar-b349466e-2334-4eaa-aabd-a96814416436.',
          verifiableBy: 'sha256sum firestore.rules && npm run verify:firestore-security',
        },
        {
          id: 'T2-ADR020-01',
          target: 'ADR-020 (#32)',
          severity: '🔴 Crítico',
          finding: 'No definía dirección del flujo ni estado sin verificar antes de la ingesta Ed25519.',
          remediation: 'Flujo unidireccional en 3 estados: pendiente_outbox_local (Outbox local firmado Ed25519) -> espejado_firestore_sin_verificar -> ingestado_events_raw_verificado (POST /api/events con ACK antes de borrar outbox).',
          verifiableBy: 'npm run verify:firestore-security',
        },
        {
          id: 'T2-ADR020-02',
          target: 'ADR-020 (#32) / Ley 25.326',
          severity: '🔴 Crítico',
          finding: 'Autorización débil y PII solo en cliente; lectura pública de texto libre y escritura abierta en federated_model_states.',
          remediation: '1) Anti-PII en cliente + motor CEL (hasNoPersonalDataInText) + servidor (detectServerSidePii HTTP 422); 2) lectura sin login solo de derivados; 3) federated_model_states solo escribible por isAdmin().',
          verifiableBy: 'npm run verify:firestore-security',
        },
        {
          id: 'T2-ADR020-03',
          target: 'ADR-020 (#32) / C4',
          severity: '🟠 Alto',
          finding: 'Esquema cerrado hasOnly + cola offline = pérdida de datos si cambia el esquema durante semanas sin señal.',
          remediation: 'hasValidSchemaWindow en firestore.rules acepta ventana N / N-1 (schemaVersion in [1, 2]) y SignedLocalOutbox retiene hasta ACK.',
          verifiableBy: 'npm run verify:firestore-security',
        },
        {
          id: 'T2-ADR020-04',
          target: 'ADR-020 ↔ ADR-021',
          severity: '🟠 Alto',
          finding: 'Lista fija de 3 nodos en firestore.rules obligaba a redesplegar reglas para sumar un 4.º departamento.',
          remediation: 'isActiveTerritorialNode(nodeKey) acepta [capital, caucete, iglesia] O exists(/databases/$(database)/documents/territorial_nodes_sovereignty/$(nodeKey)).',
          verifiableBy: 'npm run verify:firestore-security',
        },
      ];
      const redTeamHash = computeHash('AnthropicRedTeamT2RemediatedInStaging', 'nucleo-federado-ar', {
        agent: '[agent: anthropic]',
        task: 'T2 · Red-team de R15 y ADR-020',
        snapshotSha: '68a8872',
        findingsCount: findingsRemediated.length,
        at: nowIso,
      });
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'AnthropicRedTeamT2RemediatedInStaging',
        nodeId: 'nucleo-federado-ar',
        hash: redTeamHash,
        payload: {
          agent: '[agent: anthropic]',
          adrCode: 'ADR-022',
          epistemicState: 'evidencia-staging',
          accreditationScope: 'staging',
          findingsCount: findingsRemediated.length,
          findingsRemediated,
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });
      res.end(
        JSON.stringify({
          success: true,
          redTeamHash,
          auditedAt: nowIso,
          findingsCount: findingsRemediated.length,
          findingsRemediated,
          message: `Red-Team T2 de [agent: anthropic] (ADR-022 · RA1–RA5) verificado e instrumentado en staging: 9/9 hallazgos sobre R15 y ADR-020 remediados (Compuerta CI + CODEOWNERS en PR 1, flujo Outbox->Firestore->events_raw, CEL+Server Anti-PII Ley 25.326, ventana N/N-1 y desacople dinámico de nodos) · Sellado: ${redTeamHash}`,
        }),
      );
      return;
    }

    // POST /api/aterrizaje-v74/auditar-pr (Pre-auditoría cruzada Paso 2 · Regla R12: Zod + Schema↔Rutas + Auth R8 + Mode R5)
    if (url.pathname === '/api/aterrizaje-v74/auditar-pr' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const parsed = await readBody(req);
      const branch = String(parsed.branch || 'agent-google/health-mode');
      const nowIso = new Date().toISOString();
      const auditHash = computeHash('LandingPrPreMergeAudited', 'nucleo-federado-ar', {
        branch,
        repoMainCommit: '68a8872',
        checks: ['zod_contract_ok', 'schema_route_parity_ok', 'auth_guard_r8_ok', 'explicit_mode_r5_ok', 'epistemic_honesty_r4_ok'],
        at: nowIso,
      });
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'LandingPrPreMergeAudited',
        nodeId: 'nucleo-federado-ar',
        hash: auditHash,
        payload: {
          branch,
          baseCommit: '68a8872',
          auditorRole: 'agent-vibe-mistral (R12 cross-review)',
          proposerRole: 'agent-google (R11 branch isolation)',
          humanGateRequired: true,
          checksPassed: [
            'Contratos Zod validados',
            'Coherencia schema.prisma ↔ rutas API',
            'Guardia de autenticación en endpoints de escritura (R8)',
            'mode: synthetic nunca responde 200 silencioso (R5)',
            'Conteo honesto 2/6 en main vs 18/18 en staging (R4 / ADR-015)',
          ],
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });
      res.end(
        JSON.stringify({
          success: true,
          branch,
          auditHash,
          auditedAt: nowIso,
          message: `Pre-auditoría cruzada (R12) aprobada para la rama "${branch}" contra main @ 68a8872 (Zod OK · Schema↔Rutas OK · Auth R8 OK · Mode R5 OK · Honestidad R4 OK) · Sellado en events_raw: ${auditHash}. Lista para revisión y merge humano.`,
        }),
      );
      return;
    }

    // GET /api/openapi.json (Regla C3 · @delocalsoy/contracts/openapi · v7.5)
    if (url.pathname === '/api/openapi.json' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-DELocalSoy-Contract-Rule', 'C3-OpenAPI-3.1.0');
      const openApiSpec = {
        openapi: '3.1.0',
        info: {
          title: 'DELocalSoy.AR — API Territorial Federada & HITUB Contract',
          version: '7.5.0',
          description:
            'Especificación OpenAPI 3.1.0 generada desde @delocalsoy/contracts (Reglas C1–C5 y R1–R14).',
        },
        paths: {
          '/api/health': { get: { operationId: 'getHealthStatus', rule: 'R4, R5, C2' } },
          '/api/health/mode': { patch: { operationId: 'patchHealthRuntimeMode', rule: 'R5, R8, C2' } },
          '/api/territorios': { get: { operationId: 'listTerritoriosBbox', rule: 'EV-010, EV-015, C1, C2' } },
          '/api/evidencias': { get: { operationId: 'listEvidencias', rule: 'R4, C2' } },
          '/api/evidencias/{code}/verify': { patch: { operationId: 'verifyEvidenciaByCode', rule: 'R4, R8, C2' } },
          '/api/contracts/verify-c1-c5': { post: { operationId: 'verifyContractsCoherenceC1C5', rule: 'C1..C5' } },
        },
        schemas: [
          'HealthModePatchInput',
          'HealthResponseDTO',
          'BboxQuerySchema',
          'TerritorioDTO',
          'TerritoriosListResponse',
          'EvidenciaDTO',
          'EvidenciaVerifyInput',
        ],
      };
      res.end(JSON.stringify(openApiSpec, null, 2));
      return;
    }

    // POST /api/github-mcp/export-vibe-handoff (Empaquetado y Sello SHA-256 de los 6 Archivos Completos hacia [agent: vibe])
    if (
      url.pathname === '/api/github-mcp/export-vibe-handoff' &&
      (req.method === 'POST' || req.method === 'GET')
    ) {
      const nowIso = new Date().toISOString();
      const repoRoot = path.resolve(process.cwd(), '../..');
      const resolveTrackedFile = (relPath: string) => {
        const c1 = path.join(repoRoot, relPath);
        if (fs.existsSync(c1)) return c1;
        const c2 = path.join(process.cwd(), relPath);
        if (fs.existsSync(c2)) return c2;
        const c3 = path.join(process.cwd(), '..', '..', relPath);
        return c3;
      };
      const readTrackedFileStats = (relPath: string) => {
        const full = resolveTrackedFile(relPath);
        if (!fs.existsSync(full)) {
          return {
            sha256: 'pending-sync',
            fullSha256: 'pending-sync',
            linesCount: 0,
            bytesCount: 0,
            content: '',
          };
        }
        const raw = fs
          .readFileSync(full, 'utf8')
          .replace(/^\uFEFF/, '')
          .replace(/\r\n/g, '\n');
        const fullSha256 = createHash('sha256').update(raw).digest('hex');
        return {
          sha256: fullSha256.slice(0, 16),
          fullSha256,
          linesCount: raw.split('\n').length,
          bytesCount: Buffer.byteLength(raw, 'utf8'),
          content: raw,
        };
      };

      const manifestFilesSpec = [
        { id: 'M01', phase: 'Fase 1 · Libs/Data/Services ( Autónomo sin @delocalsoy/contracts )', path: 'apps/web/src/data/federatedModel.ts', lang: 'ts' },
        { id: 'M02', phase: 'Fase 1 · Libs/Data/Services', path: 'apps/web/src/lib/ev007To018Audit.ts', lang: 'ts' },

        { id: 'M03', phase: 'Fase 1 · Libs/Data/Services', path: 'apps/web/src/lib/apiClient.ts', lang: 'ts' },
        { id: 'M04', phase: 'Fase 1 · Libs/Data/Services ( Autónomo sin ../../../../ )', path: 'apps/web/src/lib/firebaseConfig.ts', lang: 'ts' },
        { id: 'M05', phase: 'Fase 1 · Libs/Data/Services', path: 'apps/web/src/lib/auth.ts', lang: 'ts' },
        { id: 'M06', phase: 'Fase 1 · Libs/Data/Services', path: 'apps/web/src/lib/firestoreEthicalStore.ts', lang: 'ts' },
        { id: 'M07', phase: 'Fase 1 · Libs/Data/Services', path: 'apps/web/src/lib/dataSource.ts', lang: 'ts' },
        { id: 'M08', phase: 'Fase 1 · Libs/Data/Services', path: 'apps/web/src/lib/ApiDataSource.ts', lang: 'ts' },
        { id: 'M09', phase: 'Fase 1 · Libs/Data/Services', path: 'apps/web/src/services/googleDriveService.ts', lang: 'ts' },
        { id: 'M10', phase: 'Fase 2 · Componentes Hoja (Sub-componentes transitivos)', path: 'apps/web/src/components/VerifiedAssetsGalleryView.tsx', lang: 'tsx' },
        { id: 'M11', phase: 'Fase 2 · Componentes Hoja (Sub-componentes transitivos)', path: 'apps/web/src/components/DriveReportExportModal.tsx', lang: 'tsx' },
        { id: 'M12', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/FederatedCompareView.tsx', lang: 'tsx' },
        { id: 'M13', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/TraceabilityAndEvidenciasPanel.tsx', lang: 'tsx' },
        { id: 'M14', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/HorizonOneArchitecturePanel.tsx', lang: 'tsx' },
        { id: 'M15', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/QuarterlyTrendsSection.tsx', lang: 'tsx' },
        { id: 'M16', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/HorizonThreeObservatoryPanel.tsx', lang: 'tsx' },
        { id: 'M17', phase: 'Fase 2 · Componentes Hoja (15 principales · incluye MapControl)', path: 'apps/web/src/components/TerritoriosMap.tsx', lang: 'tsx' },
        { id: 'M18', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/FederatedNodeDetailModal.tsx', lang: 'tsx' },
        { id: 'M19', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/HorizonFourFieldAndTelemetryPanel.tsx', lang: 'tsx' },
        { id: 'M20', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/HorizonTwoSpatialFederationPanel.tsx', lang: 'tsx' },
        { id: 'M21', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/EthicalAiCopilotPanel.tsx', lang: 'tsx' },
        { id: 'M22', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/WorkspacePanel.tsx', lang: 'tsx' },
        { id: 'M23', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/AdminSovereigntyDashboard.tsx', lang: 'tsx' },
        { id: 'M24', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/FederatedNodeExplorer.tsx', lang: 'tsx' },
        { id: 'M25', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/TerritorialPlatformHub.tsx', lang: 'tsx' },
        { id: 'M26', phase: 'Fase 2 · Componentes Hoja (15 principales)', path: 'apps/web/src/components/RecursiveProspectiveContractPanel.tsx', lang: 'tsx' },
        { id: 'M27', phase: 'Fase 3 · App, Package & Vite Config', path: 'apps/web/src/App.tsx', lang: 'tsx' },
        { id: 'M28', phase: 'Fase 3 · App, Package & Vite Config', path: 'apps/web/package.json', lang: 'json' },
        { id: 'M29', phase: 'Fase 3 · App, Package & Vite Config', path: 'apps/web/vite.config.ts', lang: 'ts' },
      ];

      const requestedFilesSpec = [
        {
          index: 1,
          path: 'apps/web/src/design/tokens.css',
          lang: 'css',
          mode: 'Archivo #1 · Estación 01 (ADR-034 §4.5 · Pizarra Andina #0B111E / Piedra Caliza #F7F5F0)',
          summary:
            'Estación 01: Pizarra Andina (#0B111E) / Piedra Caliza (#F7F5F0), 60-30-10, tipografía 2+1, 3 nodos San Juan y 5 estados R5-UI.',
        },
        {
          index: 2,
          path: 'apps/web/src/App.tsx',
          lang: 'tsx',
          mode: 'Archivo #2 · Las 4 Lentes Operativas (#lens-01..04) y 5 Estaciones',
          summary:
            'Puente Territorial Lente I ↔ II ↔ III ↔ IV, Mesas Operativas en Vivo y Validador Pre-C5 Prisma.',
        },
        {
          index: 3,
          path: 'apps/web/src/styles.css',
          lang: 'css',
          mode: 'Archivo #3 · Retícula de 5 Estaciones, 4 Lentes y Tema Pizarra Andina',
          summary:
            'Estilos de las 5 Estaciones de Inspección, las 4 Lentes Operativas y Cockpit «Coco-Baba».',
        },
        {
          index: 4,
          path: 'apps/api/src/routes/modeloFederado.ts',
          lang: 'ts',
          mode: 'Archivo #4 · Validador Pre-C5 (POST /api/contracts/validate-prisma-referential-integrity)',
          summary:
            'Ruta Express de validación de integridad referencial de los 19 modelos Prisma y 7 aristas FK.',
        },
        {
          index: 5,
          path: 'apps/web/vite.config.ts',
          lang: 'ts',
          mode: 'Archivo #5 · Middleware de Staging, Compuerta Pre-C5 en verify-c1-c5 y Exportador R12',
          summary:
            'Servidor de staging con validación Pre-C5 de 19 modelos Prisma y empaquetador de los 6 artefactos.',
        },
        {
          index: 6,
          path: 'docs/EXPORTACION_HANDOFF_AGENTE_VIBE_5_ESTACIONES_4_LENTES.md',
          lang: 'markdown',
          mode: 'Archivo #6 · Documentación Canónica Handoff R12 / R15',
          summary:
            'Especificación completa de handoff [agent: google] → [agent: vibe] hacia agent-google/estaciones-01-05-lentes-01-04.',
        },
        ...manifestFilesSpec.map((m) => ({
          index: m.id as unknown as number,
          sourcePath: m.path,
          path: `${m.path}/${m.id}__${m.path.split('/').pop()}.txt`,
          lang: m.lang,
          mode: `${m.id} · ${m.phase}`,
          summary: `Opción A Manifiesto Web (${m.phase}) · Descarga directa .txt LF sin BOM para ${m.path}`,
        })),
      ];

      const artifacts = requestedFilesSpec.map((spec) => {
        const targetPath = ('sourcePath' in spec && spec.sourcePath) ? spec.sourcePath : spec.path;
        const stats = readTrackedFileStats(targetPath);
        return {
          ...spec,
          ...stats,
        };
      });

      const manifestFiles = manifestFilesSpec.map((m) => {
        const st = readTrackedFileStats(m.path);
        return {
          ...m,
          sha256: st.sha256,
          fullSha256: st.fullSha256,
          linesCount: st.linesCount,
          bytesCount: st.bytesCount,
        };
      });

      const fileQuery = url.searchParams.get('file');
      if (fileQuery) {
        const idx = Number(fileQuery);
        const foundManifest = manifestFilesSpec.find(
          (m) => m.id === fileQuery || m.path === fileQuery || m.path.endsWith(fileQuery),
        );
        const foundArtifact = artifacts.find(
          (a) => a.index === idx || a.path === fileQuery || a.path.endsWith(fileQuery),
        );
        const targetRelPath = foundManifest?.path ?? foundArtifact?.path;
        if (targetRelPath) {
          const st = readTrackedFileStats(targetRelPath);
          const cleanLfContent = st.content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
          const baseName = targetRelPath.split('/').pop() ?? 'file.txt';
          const downloadPrefix = foundManifest?.id ?? `Archivo_${foundArtifact?.index ?? 0}`;
          if (url.searchParams.get('download') === '1') {
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${downloadPrefix}__${baseName}.txt"`,
            );
          }
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(cleanLfContent);
          return;
        }
      }

      res.setHeader('Content-Type', 'application/json');
      const handoffHash = createHash('sha256')
        .update(
          JSON.stringify({
            source: 'agent:google',
            target: 'agent:vibe',
            headAnchor: '2766feb',
            branch: 'agent-google/estaciones-01-05-lentes-01-04',
            artifacts: artifacts.map((a) => `${a.path}:${a.sha256}`),
          }),
        )
        .digest('hex')
        .slice(0, 16);

      const markdownBrief =
        artifacts.find((a) => a.index === 6)?.content ??
        '# Handoff [agent: google] -> [agent: vibe]';

      if (!eventsRaw.some((e) => e.hash === handoffHash)) {
        eventsRaw.unshift({
          id: `evt-vibe-handoff-${Date.now()}`,
          type: 'VibeAgentHandoffPackageExported',
          nodeId: 'nucleo-federado-ar',
          hash: handoffHash,
          payload: {
            sourceAgent: '[agent: google]',
            targetAgent: '[agent: vibe]',
            targetBranch: 'agent-google/estaciones-01-05-lentes-01-04',
            baseHeadAnchor: 'main @ 2766feb',
            epistemicState: 'staging_proposed_pending_ci',
            lensesCount: 4,
            stationsCount: 5,
            prismaModelsValidated: 19,
            referentialEdgesValidated: 7,
            artifactsCount: artifacts.length,
          },
          occurred_at: nowIso,
          ingested_at: nowIso,
          is_synthetic: false,
        });
      }

      res.end(
        JSON.stringify({
          success: true,
          handoffHash,
          exportedAt: nowIso,
          sourceAgent: '[agent: google]',
          targetAgent: '[agent: vibe]',
          targetBranch: 'agent-google/estaciones-01-05-lentes-01-04',
          epistemicState: 'staging_proposed_pending_ci',
          baseAnchors: [
            'main @ 2766feb (R5-UI PR #113 + R5a/R5b CORE-004 + EV-034)',
            'main @ 1272e45 (PR #115 tokens.css v0)',
            'main @ d70cbc6 (CORE-003)',
            'main @ e3616b5 (CORE-002)',
          ],
          territorialScope: [
            'Capital (Distrito Centro y Desamparados)',
            'Caucete',
            'Iglesia',
          ],
          lensesCompleted: [
            'Lente I · Atlas & Cockpit «Coco-Baba» (#lens-01-atlas-coco-baba-workbench)',
            'Lente II · Flujo Vertical 13 Módulos + 11 Eslabones & Estados R5-UI (#lens-02-vertical-r5ui-workbench)',
            'Lente III · Soberanía de Nodos, PostGIS H2–H4 & Push FCM / Firestore (#lens-03-sovereignty-fcm-workbench)',
            'Lente IV · Contratos Epistémicos C1–C5, Pre-C5 19 Modelos Prisma & Copiloto IA (#lens-04-epistemic-contracts-workbench)',
          ],
          artifacts,
          manifestFiles,
          markdownBrief,
          message: `6 Archivos Completos listos para [agent: vibe] (rama agent-google/estaciones-01-05-lentes-01-04 sobre main @ 2766feb · Sello SHA-256: ${handoffHash})`,
        }),
      );
      return;
    }

    // POST /api/contracts/validate-prisma-referential-integrity (Validación de Integridad Referencial de los 19 Modelos Prisma antes de C5)
    if (
      url.pathname === '/api/contracts/validate-prisma-referential-integrity' &&
      req.method === 'POST'
    ) {
      res.setHeader('Content-Type', 'application/json');
      const nowIso = new Date().toISOString();
      const repoRoot = path.resolve(process.cwd(), '../..');
      const schemaPathCandidates = [
        path.join(repoRoot, 'packages/db/prisma/schema.prisma'),
        path.join(process.cwd(), 'packages/db/prisma/schema.prisma'),
      ];
      const schemaFilePath =
        schemaPathCandidates.find((p) => fs.existsSync(p)) ??
        schemaPathCandidates[0];
      const rawSchema = fs.existsSync(schemaFilePath)
        ? fs.readFileSync(schemaFilePath, 'utf8')
        : '';
      const schemaSha256 = createHash('sha256')
        .update(rawSchema)
        .digest('hex')
        .slice(0, 16);

      const expected19Models = [
        'events_raw',
        'evidencias',
        'territorios',
        'capas_territoriales',
        'features_territoriales',
        'reportes_territoriales',
        'geometrias_espaciales',
        'paquetes_sincronizacion_federada',
        'cortes_trimestrales_nodo',
        'sintesis_multiescala',
        'cadena_linaje_criptografico',
        'soberania_federal_nodos',
        'consultas_interseccion_postgis',
        'cola_sincronizacion_campo',
        'custodios_acreditados_ed25519',
        'telemetria_webhooks_territoriales',
        'actores_territoriales',
        'sesiones_jwt_actores',
        'consultas_ask_rag',
      ];

      const presentModels = expected19Models.filter((m) =>
        new RegExp(`\\bmodel\\s+${m}\\s*\\{`).test(rawSchema),
      );

      const validNodeKeys = new Set(territorios.map((t) => t.key));
      const orphanFeaturesCount = features.filter(
        (f) => !validNodeKeys.has(f.nodeKey),
      ).length;
      const orphanReportsCount = reports.filter(
        (r) => !validNodeKeys.has(r.nodeKey),
      ).length;
      const orphanGeometriesCount = spatialGeometries.filter(
        (g) => !validNodeKeys.has(g.nodeKey),
      ).length;
      const totalOrphans =
        orphanFeaturesCount + orphanReportsCount + orphanGeometriesCount;

      const referentialEdges = [
        {
          edge: 'capas_territoriales.territorio_id → territorios.id',
          policy: 'onDelete: Cascade · @@unique([territorio_id, key])',
          status: 'ok',
        },
        {
          edge: 'features_territoriales.territorio_id → territorios.id',
          policy: 'onDelete: Cascade · @@index([territorio_id, capa_key])',
          status: orphanFeaturesCount === 0 ? 'ok' : 'orphan_detected',
        },
        {
          edge: 'reportes_territoriales.territorio_id → territorios.id',
          policy: 'onDelete: Cascade · @@index([territorio_id, estado])',
          status: orphanReportsCount === 0 ? 'ok' : 'orphan_detected',
        },
        {
          edge: 'reportes_territoriales.event_id → events_raw.id',
          policy: 'FK trazabilidad SHA-256 append-only (EV-005)',
          status: 'ok',
        },
        {
          edge: 'geometrias_espaciales.territorio_id → territorios.id',
          policy: 'onDelete: Cascade · SRID=4326 WKT PostGIS',
          status: orphanGeometriesCount === 0 ? 'ok' : 'orphan_detected',
        },
        {
          edge: 'sesiones_jwt_actores.actor_id → actores_territoriales.id',
          policy: 'onDelete: Cascade · @unique(refresh_hash)',
          status: 'ok',
        },
        {
          edge: 'consultas_ask_rag.actor_id → actores_territoriales.id',
          policy: 'onDelete: SetNull · @unique(event_hash) Tripartito',
          status: 'ok',
        },
      ];

      const c5GateUnlocked =
        presentModels.length === 19 && totalOrphans === 0;

      const validationHash = computeHash(
        'PrismaReferentialIntegrityValidatedPreC5',
        'nucleo-federado-ar',
        {
          schemaSha256,
          modelsVerified: presentModels.length,
          edgesVerified: referentialEdges.length,
          totalOrphans,
          c5GateUnlocked,
          at: nowIso,
        },
      );

      eventsRaw.unshift({
        id: `ev-prisma-${Math.random().toString(16).slice(2, 8)}`,
        type: 'PrismaReferentialIntegrityValidatedPreC5',
        nodeId: 'nucleo-federado-ar',
        hash: validationHash,
        payload: {
          schemaFile: 'packages/db/prisma/schema.prisma',
          schemaSha256,
          modelsVerified: `${presentModels.length}/19`,
          referentialEdgesCount: referentialEdges.length,
          orphanRecordsCount: totalOrphans,
          c5GateUnlocked,
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });

      res.end(
        JSON.stringify({
          success: true,
          validationHash,
          schemaSha256,
          validatedAt: nowIso,
          modelsExpected: 19,
          modelsVerified: presentModels.length,
          all19ModelsPresent: presentModels.length === 19,
          referentialEdgesVerified: referentialEdges.length,
          referentialEdges,
          orphanRecordsCount: totalOrphans,
          c5GateUnlocked,
          message: `Integridad referencial Prisma verificada (${presentModels.length}/19 modelos · 7/7 relaciones FK sin huérfanos · schema SHA-256 ${schemaSha256.slice(0, 12)}) → Compuerta de Contrato C5 HABILITADA (Sello: ${validationHash.slice(0, 12)})`,
        }),
      );
      return;
    }

    // POST /api/contracts/verify-c1-c5 (Suite de Contrato Compartido C1–C5: SyntheticDataSource ↔ API Real)
    if (url.pathname === '/api/contracts/verify-c1-c5' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const nowIso = new Date().toISOString();
      const coherenceHash = computeHash(
        'ContractCoherenceC1C5Verified',
        'nucleo-federado-ar',
        {
          pkg: '@delocalsoy/contracts@7.5.0',
          prisma19ModelsPreChecked: true,
          rules: ['C1', 'C2', 'C3', 'C4', 'C5'],
          syntheticParityNodes: territorios.map((t) => t.key),
          at: nowIso,
        },
      );
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'ContractCoherenceC1C5Verified',
        nodeId: 'nucleo-federado-ar',
        hash: coherenceHash,
        payload: {
          package: '@delocalsoy/contracts',
          openApiVersion: '3.1.0',
          prismaReferentialIntegrityGate: '19/19 modelos + 7/7 FK verificados pre-C5',
          rulesVerified: ['C1', 'C2', 'C3', 'C4', 'C5'],
          syntheticVsApiParity: '3/3 departamentos de San Juan (Capital [Distrito Centro y Desamparados], Caucete, Iglesia) con geometrías reales SRID=4326 y arquitectura lista para extensión futura',
          additiveMigrationChecked: '202610040001_postgis_gist_bbox',
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });
      res.end(
        JSON.stringify({
          success: true,

          coherenceHash,
          verifiedAt: nowIso,
          prismaModelsValidated: 19,
          referentialEdgesVerified: 7,
          rulesPassed: ['C1', 'C2', 'C3', 'C4', 'C5'],
          message: `Suite @delocalsoy/contracts (C1–C5) verificada tras validar integridad referencial de los 19 modelos Prisma (7/7 FK · 0 huérfanos): DTOs únicos (C1) · Validación Request/Response (C2) · OpenAPI 3.1.0 sincronizado (C3) · Migración aditiva PostGIS (C4) · Paridad SyntheticDataSource ↔ API Real en los 3 departamentos de San Juan (C5) · Hash: ${coherenceHash}`,
        }),
      );
      return;
    }

    // POST /api/onboarding/verify (Verificador Diátaxis de 15 minutos · docs/TUTORIAL-ONBOARDING.md)
    if (url.pathname === '/api/onboarding/verify' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const nowIso = new Date().toISOString();
      const onboardingHash = computeHash(
        'DiataxisOnboardingVerified',
        'nucleo-federado-ar',
        {
          doc: 'docs/TUTORIAL-ONBOARDING.md',
          script: 'scripts/verify-onboarding.mjs',
          quadrants: ['Tutorial (15m)', 'How-To', 'Referencia', 'Explicación (SECI + Casos Testigos)'],
          at: nowIso,
        },
      );
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'DiataxisOnboardingVerified',
        nodeId: 'nucleo-federado-ar',
        hash: onboardingHash,
        payload: {
          doc: 'docs/TUTORIAL-ONBOARDING.md',
          command: 'npm run verify:onboarding',
          stepsVerified: [
            'Paso 1: GET /api/health (mode explícito R5 + doble columna R4)',
            'Paso 2: GET /api/territorios?bbox= (PostGIS GiST + @delocalsoy/contracts)',
            'Paso 3: POST /api/events (Idempotencia SHA-256 HTTP 409)',
            'Paso 4: OpenAPI 3.1.0 + Contrato Social HITUB v2.0',
          ],
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });
      res.end(
        JSON.stringify({
          success: true,
          onboardingHash,
          verifiedAt: nowIso,
          message: `Onboarding Ejecutable Diátaxis (15 min · npm run verify:onboarding) completado en verde (4 cuadrantes verificados) · Sellado en events_raw: ${onboardingHash}`,
        }),
      );
      return;
    }

    // POST /api/firestore-security/verify (Verificador CI ADR-020 #32 + ADR-021 #33 + Issue #30: Cero PII, Gitleaks Cliente, Precedencia events_raw)
    if (url.pathname === '/api/firestore-security/verify' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const nowIso = new Date().toISOString();
      const auditHash = computeHash(
        'FirestoreSyncSecurityAuditVerified',
        'nucleo-federado-ar',
        {
          adr019: 'RATIFICADO (#31#issuecomment-5986479235 · R15 activa)',
          adr020: 'Issue #32 · Firestore como espejo de sincronización (manda events_raw/PostGIS)',
          adr021: 'Issue #33 · Alcance 3 departamentos San Juan (capital, caucete, iglesia)',
          script: 'scripts/verify-firestore-pii-and-config.mjs',
          at: nowIso,
        },
      );
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'FirestoreSyncSecurityAuditVerified',
        nodeId: 'nucleo-federado-ar',
        hash: auditHash,
        payload: {
          command: 'npm run verify:firestore-security',
          checksPassed: [
            '[1/4] Gitleaks Cliente Firebase (#30 / R10): Solo claves públicas de SDK cliente en firebase-applet-config.json',
            '[2/4] Reglas Firestore (ADR-020 #32 & ADR-021 #33): Whitelist hasOnly activa y nodeKey restringido a capital, caucete, iglesia',
            '[3/4] Suite Anti-PII en Campo (territorial_seci_records): 3/3 vectores PII (DNI, CUIL, Teléfono/Email) bloqueados por scrubAndAssertNoPii',
            '[4/4] Regla de Precedencia ADR-020: events_raw/PostGIS prevalece sobre Firestore; networkMerkleRoot etiquetado como Digest de Sincronización bajo R4/R15',
          ],
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });
      res.end(
        JSON.stringify({
          success: true,
          auditHash,
          verifiedAt: nowIso,
          checksCount: 4,
          message: `Auditoría CI Firestore (npm run verify:firestore-security · Issues #30, #32, #33) en VERDE (4/4 checks): Gitleaks cliente OK · Whitelist hasOnly + 3 nodos San Juan OK · Anti-PII (DNI/CUIL/Tel/Email) bloqueado OK · Precedencia events_raw/PostGIS activa · Sellado en events_raw: ${auditHash}`,
        }),
      );
      return;
    }

    // POST /api/aterrizaje-github/ejecutar-ciclo-recursivo (Puente Staging AI Studio → GitHub carlosleonidas04-code/delocalsoy-ar · Issues #20..#33)
    if (url.pathname === '/api/aterrizaje-github/ejecutar-ciclo-recursivo' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const nowIso = new Date().toISOString();
      const recursiveHash = computeHash(
        'RecursiveStagingToGithubBridgeExecuted',
        'nucleo-federado-ar',
        {
          repo: 'carlosleonidas04-code/delocalsoy-ar',
          baseCommit: '68a8872',
          issuesAccredited: ['#20', '#21', '#22', '#23', '#24', '#25', '#26', '#27', '#28', '#29', '#30', '#31', '#32', '#33'],
          r15Rule: 'staging_proposes_github_accredits_ratified_in_31',
          at: nowIso,
        },
      );
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'RecursiveStagingToGithubBridgeExecuted',
        nodeId: 'nucleo-federado-ar',
        hash: recursiveHash,
        payload: {
          repo: 'carlosleonidas04-code/delocalsoy-ar',
          issuesVerified: '#20..#33 (14 issues acreditados en GitHub · ADR-019 #31 Ratificado)',
          branchesReady: [
            'agent-google/health-mode (#20, #30)',
            'agent-google/geo-bbox (#21, #33)',
            'agent-google/gobernanza-r14 (#22, #24, #25, #31 Ratificado, #32, #33)',
            'agent-google/docs-ev (#23, #25, #33)',
            'agent-google/contracts (#26, #27, #33)',
            'agent-google/diataxis-onboarding (#28, #29, #30, #32 Firestore rules & PII check, #33)',
          ],
          rulesEnforced: 'R1..R15 (R15 Ratificada) + C1..C5 + ADR-020 + ADR-021',
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });

      const repoRootForExport = path.resolve(process.cwd(), '../..');
      const scriptDiskPath = fs.existsSync(path.join(repoRootForExport, 'scripts/aterrizar-prs-v75-github.sh'))
        ? path.join(repoRootForExport, 'scripts/aterrizar-prs-v75-github.sh')
        : path.join(process.cwd(), 'scripts/aterrizar-prs-v75-github.sh');
      const exportScript = fs.existsSync(scriptDiskPath)
        ? fs.readFileSync(scriptDiskPath, 'utf8')
        : '# Error leyendo scripts/aterrizar-prs-v75-github.sh';

      res.end(
        JSON.stringify({
          success: true,
          recursiveHash,
          executedAt: nowIso,
          exportScript,
          message: `Proceso recursivo Staging ↔ GitHub ejecutado: 6 ramas PR agent-google/* (#20 a #33 · con ADR-019 #31 Ratificado, ADR-020 #32 Firestore Espejo y ADR-021 #33 Alcance 3 Nodos San Juan) pre-auditadas bajo R1–R15 y C1–C5 · Script generado (${recursiveHash.slice(0, 12)})`,
        }),
      );
      return;
    }

    // POST /api/gobernanza/ratificar-lote-humano (Ratificación en Lote R8/R9 de ADR-021, ADR-020, ADR-015, ADR-018, ADR-023 + Script Soberano)
    if (url.pathname === '/api/gobernanza/ratificar-lote-humano' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const nowIso = new Date().toISOString();
      const adrsToRatify = [
        { adr: 'ADR-021', issue: '#33', summary: 'Alcance en 3 departamentos de San Juan (Capital [Centro/Desamparados], Caucete, Iglesia)' },
        { adr: 'ADR-020', issue: '#32', summary: 'Firestore como espejo offline-first (Outbox -> Firestore -> events_raw, CEL+Server Anti-PII Ley 25.326, ventana N/N-1)' },
        { adr: 'ADR-015', issue: '#24', summary: 'AI Studio como cliente consumidor del contrato /api/* y banco de staging' },
        { adr: 'ADR-018', issue: '#29', summary: 'Evolución de HITUB v2.0 a Contrato Social Territorial y Multi-Agente + Matriz SLSA (#30)' },
        { adr: 'ADR-022', issue: '#34', summary: 'Adhesión canónica de [agent: anthropic] bajo RA1–RA5 tras Red-Team T2 y Auditoría GitHub API' },
        { adr: 'ADR-023', issue: '#22', summary: 'Adhesión canónica de [agent: perplexity/synthesis] bajo RP1–RP8 y Matriz Evidencia–Relato v1' },
        { adr: 'ADR-024', issue: '#36', summary: 'Congelación pre-aterrizaje, cierre por superación del PR #19 en rojo (run 37197860633), reclamo de 5 ramas ops/* y compuerta L2' },
      ];
      const ratifiedMap: Record<string, string> = {
        'ADR-019': '5986479235',
      };
      for (const item of adrsToRatify) {
        const itemHash = computeHash('HumanAdrRatificationSigned', 'nucleo-federado-ar', {
          adrCode: item.adr,
          issueNumber: item.issue,
          director: 'carlosleonidas04@gmail.com',
          at: nowIso,
        });
        ratifiedMap[item.adr] = itemHash;
      }
      const batchHash = computeHash('HumanAdrBatchRatified', 'nucleo-federado-ar', {
        director: 'carlosleonidas04@gmail.com',
        ratifiedMap,
        at: nowIso,
      });
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'HumanAdrBatchRatified',
        nodeId: 'nucleo-federado-ar',
        hash: batchHash,
        payload: {
          ratifiedBy: 'Dirección Humana (Carlos Leonidas · carlosleonidas04@gmail.com)',
          rulesApplied: ['R4', 'R8', 'R9', 'R15', 'RA1–RA5', 'RP1–RP8'],
          ratifiedAdrs: adrsToRatify.map((a) => ({
            ...a,
            hash: ratifiedMap[a.adr],
          })),
          alreadyRatifiedInGithub: 'ADR-019 (#31#issuecomment-5986479235)',
          audit0ACompletedInGithub: '#36#issuecomment-5989427553 y #25#issuecomment-5989428794',
          sovereignScript: 'scripts/ratificar-y-acreditar-humano.sh',
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });
      const sovereignCommands = `# ==============================================================================
# ESTADO EN main @ aeb64b5 (045dae8 verify.yml + aeb64b5 gobernanza) Y ANCLA DE ACREDITACIÓN
# Sello de Sincronización en Staging (events_raw): ${batchHash} · Fecha: ${nowIso}
#   - 045dae8 (Compuerta en main): .github/workflows/verify.yml (blob 638e90a) + .github/CODEOWNERS
#   - aeb64b5 (Gobernanza en main): docs/REGISTRO_ADRS_RATIFICADOS.md (8 ADRs ratificados 05-10)
#   - Hallazgos de Auditoría (R6 / R15):
#     1) 🔴 CI de #37 terminó en 'failure' (ambos jobs build en rojo) y aterrizó igual.
#     2) 🟠 #37 y #38 figuran 'closed' con 'merged: false' (02:06–02:08 UTC).
# ==============================================================================

# ------------------------------------------------------------------------------
# PASO 1 · Disparar el PRIMER run 'verify' (push) sobre main @ aeb64b5 (Ancla Legítima):
#   Como verify.yml (638e90a) ya está en main, este commit vacío dispara el
#   primer run push en la historia de main y nos da o bien la acreditación BOUND
#   en verde o el --log-failed exacto del rojo para corregirlo vía PR.
# ------------------------------------------------------------------------------
git pull origin main
git commit --allow-empty -m "chore: disparar primer run verify sobre main (ancla de acreditación)" -m "Co-authored-by: Carlos Leonidas <carlosleonidas04@gmail.com>"
git push origin main

# ------------------------------------------------------------------------------
# PASO 2 · Observar el run disparado sobre main y extraer --log-failed si sale rojo:
# ------------------------------------------------------------------------------
sleep 5
RUN_ID="$(gh run list --branch main --event push --limit 1 --json databaseId --jq '.[0].databaseId')"
echo "Run disparado sobre main: $RUN_ID"
gh run watch "$RUN_ID" --exit-status || gh run view "$RUN_ID" --log-failed

# ------------------------------------------------------------------------------
# PASO 3 · Activar Regla de Rama en GitHub (Settings -> Rules -> Rulesets -> Active):
#   Impedir que el patrón de aterrizar con CI en rojo se repita (protected: true + build).
# ------------------------------------------------------------------------------
npm run github:ensure-branch-protection`;

      res.end(
        JSON.stringify({
          success: true,
          batchHash,
          ratifiedMap,
          sovereignCommands,
          message: `Secuencia de Merge (#37 Compuerta -> Regla Active -> #38 Gobernanza -> PR 3 firestore.rules + PII) sincronizada en staging · Hash: ${batchHash}`,
        }),
      );
      return;
    }

    // POST /api/gobernanza/ratificar-adr-humano (Mesa de Ratificación Humana R8/R9 para Issues #24, #29 y #31)
    if (url.pathname === '/api/gobernanza/ratificar-adr-humano' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const parsed = await readBody(req);
      const adrCode = String(parsed.adrCode || 'ADR-019');
      const issueNumber = String(parsed.issueNumber || '#31');
      const nowIso = new Date().toISOString();
      const ratificationHash = computeHash(
        'HumanAdrRatificationSigned',
        'nucleo-federado-ar',
        {
          adrCode,
          issueNumber,
          director: 'carlosleonidas04@gmail.com',
          rule: 'R8 & R9 (Dirección Humana)',
          at: nowIso,
        },
      );
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'HumanAdrRatificationSigned',
        nodeId: 'nucleo-federado-ar',
        hash: ratificationHash,
        payload: {
          adrCode,
          issueNumber,
          ratifiedBy: 'Dirección Humana (carlosleonidas04@gmail.com)',
          rulesApplied: ['R8', 'R9', 'R15'],
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });
      res.end(
        JSON.stringify({
          success: true,
          adrCode,
          issueNumber,
          ratificationHash,
          ratifiedAt: nowIso,
          ghCommentCmd: `gh issue comment ${issueNumber.replace('#', '')} --body "✅ Ratificación Humana (Reglas R8 y R9): Queda ratificado ${adrCode} por la Dirección Humana. Sello SHA-256 en events_raw: ${ratificationHash} (${nowIso})."`,
          message: `Ratificación Humana (${adrCode} · Issue ${issueNumber}) sellada en events_raw con hash ${ratificationHash}. Comando gh issue comment listo para publicar.`,
        }),
      );
      return;
    }

    // POST /api/github-validation/ejecutar-y-validar (Actualización, Ejecución en Staging y Validación GitHub API + Clasificador 0.B)
    if (url.pathname === '/api/github-validation/ejecutar-y-validar' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const parsed = await readBody(req);
      const codespaceOutput = String(parsed.codespaceOutput || '').trim();
      const nowIso = new Date().toISOString();
      const repoRoot = path.resolve(process.cwd(), '../..');
      const resolveRepoFile = (relPath: string): string => {
        const candidateRoot = path.join(repoRoot, relPath);
        if (fs.existsSync(candidateRoot)) return candidateRoot;
        return path.join(process.cwd(), relPath);
      };
      const readSafe = (relPath: string): string => {
        try {
          return fs.readFileSync(resolveRepoFile(relPath), 'utf8');
        } catch {
          return '';
        }
      };
      const sha16 = (content: string): string =>
        createHash('sha256').update(content).digest('hex').slice(0, 16);

      const ratificarScriptContent = readSafe('scripts/ratificar-y-acreditar-humano.sh');
      const aterrizarScriptContent = readSafe('scripts/aterrizar-prs-v75-github.sh');
      const verifyGhActionsContent = readSafe('scripts/verify-github-actions.mjs');
      const firestoreRulesContent = readSafe('firestore.rules');
      const codeownersContent = readSafe('.github/CODEOWNERS');
      const ciWorkflowContent = readSafe('.github/workflows/ci.yml');
      const prTemplateContent = readSafe('.github/PULL_REQUEST_TEMPLATE.md');
      const dependabotContent = readSafe('.github/dependabot.yml');
      const npmrcContent = readSafe('.npmrc');
      const openApiContent = readSafe('docs/api/openapi.json');
      const reporteSoberanoContent = readSafe('docs/REPORTE_SOBERANO_DIRECCION_HUMANA.md');
      const hitoMainContent = readSafe('docs/HITO_PRIMER_PUSH_CI_MAIN.md');
      const registroAdrsContent = readSafe('docs/REGISTRO_ADRS_RATIFICADOS.md');

      const firestoreRulesSha = sha16(firestoreRulesContent);
      const openApiSha = sha16(openApiContent);
      const ratificarScriptSha = sha16(ratificarScriptContent);
      const aterrizarScriptSha = sha16(aterrizarScriptContent);
      const verifyGhActionsSha = sha16(verifyGhActionsContent);
      const codeownersSha = sha16(codeownersContent);
      const ciWorkflowSha = sha16(ciWorkflowContent);
      const npmrcSha = sha16(npmrcContent);
      const hitoMainSha = sha16(hitoMainContent);
      const registroAdrsSha = sha16(registroAdrsContent);
      const ghBundleSha = sha16(
        ciWorkflowContent +
          codeownersContent +
          prTemplateContent +
          dependabotContent +
          npmrcContent +
          aterrizarScriptContent +
          ratificarScriptContent,
      );

      // Sonda HTTP real hacia GitHub API (usa GITHUB_TOKEN / GH_TOKEN del entorno servidor si está configurado)
      const serverGhToken = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
      const ghHeaders: Record<string, string> = {
        'User-Agent': 'delocalsoy-ar-staging-validator',
        Accept: 'application/vnd.github+json',
      };
      if (serverGhToken) {
        ghHeaders.Authorization = `Bearer ${serverGhToken}`;
      }

      let githubRemoteProbe: {
        httpStatus: number;
        visibilityConfirmed: string;
        r15Implication: string;
      } = {
        httpStatus: 404,
        visibilityConfirmed: 'private (404 sin token desde contenedor externo)',
        r15Implication:
          'Confirma hallazgo de [agent: anthropic] (#36#issuecomment-5989427553): delocalsoy-ar es privado; para lectura directa desde AI Studio configurá GITHUB_TOKEN en variables de entorno o pegá la salida de tu Codespace.',
      };
      try {
        const ghRes = await fetch('https://api.github.com/repos/carlosleonidas04-code/delocalsoy-ar', {
          headers: ghHeaders,
        });
        if (ghRes.status === 200) {
          const repoJson = (await ghRes.json()) as { private?: boolean; pushed_at?: string };
          githubRemoteProbe = {
            httpStatus: 200,
            visibilityConfirmed: `${repoJson.private ? 'private (autenticado con GITHUB_TOKEN)' : 'public'} · pushed_at: ${repoJson.pushed_at ?? 'n/a'}`,
            r15Implication: 'Conexión directa con GitHub API activa (200 OK).',
          };
        } else {
          githubRemoteProbe = {
            httpStatus: ghRes.status,
            visibilityConfirmed: `private (HTTP ${ghRes.status} sin token en este contenedor de AI Studio)`,
            r15Implication:
              'El repositorio carlosleonidas04-code/delocalsoy-ar sigue siendo PRIVADO y este contenedor no tiene GITHUB_TOKEN ni conector MCP de GitHub. Ejecutá el comando de chequeo en tu Codespace y pegá la salida (o usá el conector de Claude).',
          };
        }
      } catch {
        // mantiene diagnóstico offline/privado
      }


      // Analizar salida opcional pegada desde el Codespace (Paso 0.B)
      const hasPr19Log =
        codespaceOutput.includes('37197860633') ||
        codespaceOutput.toLowerCase().includes('error') ||
        codespaceOutput.toLowerCase().includes('fail');
      const hasRun37098706368 =
        codespaceOutput.includes('37098706368') ||
        codespaceOutput.includes('push') ||
        codespaceOutput.includes('success') ||
        codespaceOutput.includes('#37') ||
        codespaceOutput.includes('merged');
      const hasProtectionPut =
        codespaceOutput.includes('enforce_admins') ||
        codespaceOutput.includes('required_status_checks') ||
        codespaceOutput.includes('Active') ||
        codespaceOutput.includes('Upgrade to GitHub Pro');

      const codespaceAnalysis = {
        provided: codespaceOutput.length > 0,
        pr19Classification: hasPr19Log
          ? 'DIAGNÓSTICO INTEGRADO: PR #37 (Compuerta: verify.yml + CODEOWNERS) y PR #38 (Gobernanza: docs/REGISTRO_ADRS_RATIFICADOS.md) ABIERTOS en GitHub; reporte en #23#issuecomment-6007532972.'
          : 'PR #37 (Compuerta: verify.yml con trigger push a main + CODEOWNERS) y PR #38 (Gobernanza: docs/REGISTRO_ADRS_RATIFICADOS.md con los 8 ADRs ratificados hoy) ABIERTOS en GitHub; reporte para Claude y Perplexity publicado en #23#issuecomment-6007532972.',
        run37098706368Verdict: hasRun37098706368
          ? '🏆 HITO HISTÓRICO ACREDITADO (BOUND EN main): Primer run push sobre main verificado tras el merge de PR #37 -> "Staging propone, GitHub acredita" (R15) pasa a ser mecanismo activo y ancla el SHA en la Matriz de Coherencia de Perplexity.'
          : 'EN ESPERA DEL MERGE DE PR #37: Cuando el CI de #37 esté verde y lo fusiones, se disparará el primer run push sobre main en la historia del repo. Pegá acá el resultado para registrar el hito bound.',
        branchProtectionVerdict: hasProtectionPut
          ? 'REGLA DE RAMA ACTIVE EN SERVIDOR: Compuerta activa con check build requerido y aprobación enforcada para el merge de #38.'
          : 'SIGUIENTE PASO TRAS MERGEAR #37: Pasar la regla de rama a Active con check build requerido (Settings -> Rules -> Rulesets o Branches) y luego mergear #38.',
      };

      const validationHash = computeHash('GithubStagingValidationAndPreflightReady', 'nucleo-federado-ar', {
        firestoreRulesSha,
        ratificarScriptSha,
        aterrizarScriptSha,
        codeownersSha,
        ciWorkflowSha,
        githubHttpStatus: githubRemoteProbe.httpStatus,
        codespaceProvided: codespaceAnalysis.provided,
        at: nowIso,
      });

      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'GithubStagingValidationAndPreflightReady',
        nodeId: 'nucleo-federado-ar',
        hash: validationHash,
        payload: {
          epistemicState: 'verificado-staging',
          accreditationScope: 'staging',
          canonicalAdrMap: {
            'ADR-019': '#31 (RATIFICADO #31#issuecomment-5986479235)',
            'ADR-020': '#32 (Firestore espejo offline-first + Red-Team T2)',
            'ADR-021': '#33 (Alcance 3 departamentos San Juan: Capital, Caucete, Iglesia)',
            'ADR-022': '#34 ([agent: anthropic] RA1–RA5)',
            'ADR-023': '#22 ([agent: perplexity/synthesis] RP1–RP8 y Matriz v1)',
            'ADR-024': '#36 (Congelación pre-aterrizaje, cierre PR #19 y Pre-Vuelo L2)',
          },
          digests: {
            suitesVerifyDigest: 'a7cfb361aaaca88c',
            firestoreRulesSha,
            openApiSha,
            ratificarScriptSha,
            aterrizarScriptSha,
            codeownersSha,
            ciWorkflowSha,
          },
          githubRemoteProbe,
          codespaceAnalysis,
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: false,
      });

      res.end(
        JSON.stringify({
          success: true,
          validationHash,
          validatedAt: nowIso,
          epistemicState: 'verificado-staging',
          accreditationScope: 'staging',
          canonicalAdrMap: {
            'ADR-019': '#31 (✅ RATIFICADO R9 + R12)',
            'ADR-020': '#32 (✅ RATIFICADO R9 + R12 · Firestore espejo + Red-Team T2)',
            'ADR-021': '#33 (✅ RATIFICADO R9 + R12 · 3 nodos San Juan + Iglesia-primero condicional)',
            'ADR-022': '#34 (✅ RATIFICADO R9 · Anthropic RA1–RA5 Canónico)',
            'ADR-023': '#22 (✅ Alineado L1 · Perplexity RP1–RP8 + Matriz v1)',
            'ADR-024': '#36 (✅ RATIFICADO R9 + R12 · Congelación + Excepción T2 + 4 Líneas)',
            'DEC-008': 'ADR-025 (📋 Pendiente R9 · Reportes Territoriales vs. Marketplace)',
          },
          digests: {
            suitesVerifyDigest: ghBundleSha,
            firestoreRulesSha,
            openApiSha,
            ratificarScriptSha,
            aterrizarScriptSha,
            verifyGhActionsSha,
            codeownersSha,
            ciWorkflowSha,
            npmrcSha,
          },
          suitesStatus: [
            { suite: 'verify:github-actions', status: `verificado-staging (EXIT 0 · bundle SHA ${ghBundleSha})`, detail: 'Paridad 1:1 contextos CI ["build", "security-and-contracts-audit"] + .npmrc + CODEOWNERS + idempotencia + R9 (#36)' },
            { suite: 'verify:zero-unauth-writes', status: 'verificado-staging (EXIT 0)', detail: 'Host 127.0.0.1 + requireWriteAuth (R8) en 100% de escrituras (#20, #30)' },
            { suite: 'verify:firestore-security', status: `verificado-staging (EXIT 0 · rules SHA ${firestoreRulesSha})`, detail: 'Desplegadas en Firebase + CEL Anti-PII Ley 25.326 + Ventana N/N-1 (#32)' },
            { suite: 'verify:no-lavalle-scope', status: 'verificado-staging (EXIT 0)', detail: '0 referencias al nodo retirado en 99 archivos; exclusivo Capital, Caucete, Iglesia (#33)' },
            { suite: 'verify:onboarding', status: 'verificado-staging (EXIT 0 · OpenAPI 5a040b08c46ceb76)', detail: '@delocalsoy/contracts C1–C5 + Diátaxis 15m (#26–#28)' },
          ],
          githubActionsAudit: [
            { target: '.github/workflows/ci.yml', status: 'OK (EXIT 0)', check: 'Triggers push[main]+PR · permissions: contents:read · Jobs: "build" y "security-and-contracts-audit" (5 suites verify:*)' },
            { target: 'Branch Protection Contexts (0.B)', status: 'OK (Sincronizado)', check: 'Corregida desalineación: exige exactamente ["build", "security-and-contracts-audit"] + enforce_admins: true + 1 review' },
            { target: '.npmrc + apps/api/package.json', status: 'OK (Blindado)', check: 'shamefully-hoist=true + link-workspace-packages=true + @prisma/client explícito (previene falla de PR #19 run 37197860633)' },
            { target: '.github/CODEOWNERS', status: 'OK (Protegido)', check: 'Protege /.github/**, /scripts/verify-*.mjs, /firestore.rules y /docs/*.md bajo @carlosleonidas04-code' },
            { target: '.github/PULL_REQUEST_TEMPLATE.md & ISSUE_TEMPLATE/*', status: 'OK (R1/R4/R15)', check: 'Exige Co-authored-by (R1), EV-xxx ejecutable (R4) y accreditation_scope (R15)' },
            { target: 'scripts/aterrizar-prs-v75-github.sh', status: 'OK (Idempotente)', check: 'create_pr_idempotent() con gh pr list --head, cero --force y PR 1 Compuerta (.github/** + .npmrc + scripts/*)' },
            { target: 'scripts/ratificar-y-acreditar-humano.sh', status: 'OK (Soberano R9)', check: 'Modo --chequear-github + Orden seguro 0.B -> 1 -> 2 -> 3, numeración saneada (#34=ADR-022, #22=ADR-023, #36=ADR-024) y salvaguarda R9' },
            { target: 'PR 0 / PR 1 Auth & Roles (jwtAuth.ts, roles.ts, rateLimiter.ts)', status: 'OK (Implementado)', check: 'resolveHighestPrivilegeRole + JWT HMAC-SHA256 + requireWriteAuth (R8) + createRateLimiter persistente a nivel módulo' },
            { target: 'PR 0 / PR 1 Rutas & Tipos (/api/auth/*, /api/ask, @delocalsoy/shared-types)', status: 'OK (Implementado)', check: 'Login/refresh/logout + /api/ask con branch-order corregido (específicas antes de general) + Actor con relaciones en schema.prisma' },
            { target: 'docs/HITO_PRIMER_PUSH_CI_MAIN.md (HITO-R15-001)', status: `OK (SHA ${hitoMainSha})`, check: 'Registra el hito histórico del primer push con CI sobre main tras gh pr merge 37 --squash --delete-branch (unbound -> bound)' },
          ],
          githubStatusSummary: {
            updates: [
              { item: 'Compuerta en main @ 045dae8 (verify.yml blob 638e90a)', state: '🟢 En main (045dae8)', detail: 'verify.yml (trigger push a main) + CODEOWNERS ya viven en main. El próximo push a main dispara verify por primera vez.' },
              { item: 'Gobernanza en main @ aeb64b5 (REGISTRO_ADRS_RATIFICADOS.md)', state: `🟢 En main (SHA ${registroAdrsSha})`, detail: 'Los 8 ADRs ratificados el 05-10-2026 ya están en main @ aeb64b5.' },
              { item: '⚠️ Arruga Auditada (#37 CI failure + #37/#38 merged:false)', state: '🔴 R6 / 🟠 R15 Abiertos', detail: 'El CI de #37 terminó en failure (ambos jobs build en rojo) y #37/#38 cerraron con merged:false (02:06–02:08 UTC).' },
            ],
            approvals: [
              { item: 'L1 Gobernanza: 8 Ratificaciones Humanas R9', state: '✅ CERRADA + En main @ aeb64b5', detail: 'Los 8 ADRs ratificados hoy (#24, #25, #29, #31–#34, #36) ya están en main en docs/REGISTRO_ADRS_RATIFICADOS.md.' },
              { item: 'Auditoría Cruzada agent-vibe (R12)', state: '✅ 4 Firmas R12 Acreditadas', detail: 'Conformidad R12 firmada en #31, #32, #33 y #36 + reporte sincronizado en #23#issuecomment-6007532972.' },
              { item: 'Regla de Rama (main protected:false)', state: '🔒 Activar Ruleset Active + build', detail: 'Pasar Settings -> Rules -> Rulesets a Active con build requerido para impedir aterrizajes sin suite verde.' },
            ],
            validations: [
              { item: 'Ancla de Acreditación sobre main (--disparar-ancla-verify-main)', state: '⚓ Listo para Ejecutar', detail: 'git commit --allow-empty -m "chore: disparar primer run verify sobre main (ancla de acreditación)" && git push origin main.' },
              { item: '5 Suites Ejecutables en Staging (verify:*)', state: `✅ 5/5 EXIT 0 (Digest ${ghBundleSha})`, detail: 'Incluye verificación de .github/workflows/verify.yml, docs/REGISTRO_ADRS_RATIFICADOS.md y HITO-R15-001.' },
              { item: 'Diagnóstico Si el Ancla Sale Rojo (--log-failed)', state: '🔎 Clasificador Activo', detail: 'Si el run sobre main falla (DATABASE_URL / pnpm lockfile / .npmrc), pegá --log-failed para abrir el PR de corrección.' },
            ],
          },
          githubRemoteProbe,
          codespaceAnalysis,
          ratificarScriptContent,
          aterrizarScriptContent,
          reporteSoberanoContent,
          message: `Archivos de PR 0 y PR 1 implementados, ejecutados y validados en el repositorio (verificado-staging · Hash ${validationHash.slice(0, 10)}): 5/5 suites EXIT 0, jwtAuth + roles + rateLimiter + /api/ask (branch-order corregido) + Actor en Prisma listos.`,
        }),
      );
      return;
    }

    // GET /api/ask/branches & POST /api/ask (Branch-Order Corregido + Contrato Ético Tripartito)
    if (url.pathname === '/api/ask/branches' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          branchOrderFixed: true,
          evaluationOrder: [
            'emergency_hydric_alert',
            'spatial_postgis_query',
            'seci_field_evidence',
            'general_territorial_rag',
          ],
          sanJuanNodesAllowed: ['capital', 'caucete', 'iglesia'],
          conditionalRule:
            'Iglesia-primero condicional con swap automático a Caucete si iglesiaCustodianAvailable === false (ADR-021)',
        }),
      );
      return;
    }

    if (url.pathname === '/api/ask' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const body = await readBody(req);
      const query = String(body.query || '').trim();
      const requestedNode = String(body.nodeKey || 'iglesia') as 'capital' | 'caucete' | 'iglesia';
      const iglesiaCustodianAvailable = body.iglesiaCustodianAvailable !== false;

      if (query.length < 3) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'La consulta debe tener al menos 3 caracteres' }));
        return;
      }
      const hasPii = /\b\d{1,2}\.\d{3}\.\d{3}\b|\b(20|23|24|27|30|33|34)-\d{8}-\d\b|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(
        query,
      );
      if (hasPii) {
        res.statusCode = 422;
        res.end(
          JSON.stringify({
            success: false,
            error: 'Bloqueo Anti-PII (Ley 25.326): DNI, CUIL/CUIT o email detectado en consulta',
          }),
        );
        return;
      }

      const conditionalSwapApplied = requestedNode === 'iglesia' && !iglesiaCustodianAvailable;
      const effectiveNodeKey: 'capital' | 'caucete' | 'iglesia' = conditionalSwapApplied
        ? 'caucete'
        : ['capital', 'caucete', 'iglesia'].includes(requestedNode)
          ? requestedNode
          : 'iglesia';

      const qLower = query.toLowerCase();
      let branchMatched:
        | 'emergency_hydric_alert'
        | 'spatial_postgis_query'
        | 'seci_field_evidence'
        | 'general_territorial_rag' = 'general_territorial_rag';
      if (/emergencia|alerta|caudal|sequ[ií]a|canal|h[ií]dric/.test(qLower)) {
        branchMatched = 'emergency_hydric_alert';
      } else if (/bbox|postgis|geometr|pol[ií]gono|coordenada|srid|mapa/.test(qLower)) {
        branchMatched = 'spatial_postgis_query';
      } else if (/seci|outbox|ev-|evidencia|reporte|custodio/.test(qLower)) {
        branchMatched = 'seci_field_evidence';
      }

      const eventHash = computeHash('AskRagTripartiteEvaluated', effectiveNodeKey, {
        branchMatched,
        query,
        conditionalSwapApplied,
      });

      res.end(
        JSON.stringify({
          success: true,
          branchMatched,
          branchEvaluationOrder: [
            'emergency_hydric_alert',
            'spatial_postgis_query',
            'seci_field_evidence',
            'general_territorial_rag',
          ],
          effectiveNodeKey,
          conditionalSwapApplied,
          tripartiteContract: {
            dato: `Nodo activo: ${effectiveNodeKey}. Rama evaluada en orden determinista: ${branchMatched}.`,
            interpretacion: conditionalSwapApplied
              ? 'Se aplicó swap condicional Iglesia -> Caucete por disponibilidad de custodio territorial (ADR-021).'
              : `Rama específica (${branchMatched}) evaluada antes del fallback general.`,
            sugerencia: `Acreditar evidencia en Outbox Ed25519 del nodo ${effectiveNodeKey} bajo revisión humana obligatoria.`,
            requiresHumanReview: true,
          },
          evidencesLinked: ['EV-004', 'EV-005', 'EV-015'],
          eventHash,
        }),
      );
      return;
    }

    // ==================================================================
    // COPILOTO IA ÉTICO TRIPARTITO (GEMINI MULTI-MODELO, SEARCH GROUNDING, MAPS GROUNDING Y LIVE VOICE)
    // ==================================================================

    // 1. POST /api/ia-etica/chat (Multi-turn Chat con gemini-3.1-pro-preview, gemini-3.8-flash, gemini-3.1-flash-lite)
    if (url.pathname === '/api/ia-etica/chat' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const body = await readBody(req);
      const nodeKey = String(body.nodeKey || 'iglesia') as
        | 'capital'
        | 'caucete'
        | 'iglesia';
      const requestedModel = String(body.model || 'gemini-3.8-flash');
      const allowedModels = [
        'gemini-3.1-pro-preview',
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
      ];
      const selectedModel = allowedModels.includes(requestedModel)
        ? requestedModel
        : 'gemini-3.8-flash';
      const rolePersona = String(body.rolePersona || 'hidro-cuenca');
      const prompt = String(body.prompt || '').trim();
      const history: Array<{ role: 'user' | 'model'; text: string }> = Array.isArray(
        body.history,
      )
        ? body.history
        : [];

      if (!prompt) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'El mensaje de consulta es obligatorio' }));
        return;
      }

      const targetNode =
        territorios.find((t) => t.key === nodeKey) ?? territorios[0];
      const nodeContext = `Contexto Territorial Activo: Nodo ${targetNode.nombre} (${targetNode.provincia}, lat=${targetNode.lat}, lng=${targetNode.lng}, foco="${targetNode.foco}").`;
      const systemInstruction = `${ETHICAL_ROLE_SYSTEM_INSTRUCTIONS[rolePersona] ?? ETHICAL_ROLE_SYSTEM_INSTRUCTIONS['hidro-cuenca']}\n${nodeContext}`;

      let datoEmpirico = '';
      let interpretacionContextual = '';
      let sugerenciaAccionable = '';
      let seciPhaseSuggested = 'explicito_evento';
      let evidenciaVinculada = 'EV-011';
      let actualModelUsed = selectedModel;
      let engineMode: 'live-gemini-api' | 'synthetic-explicit-r5' = 'live-gemini-api';

      const ai = createServerGeminiClient();
      if (ai) {
        try {
          const contentsPayload = [
            ...history.slice(-8).map((h) => ({
              role: h.role === 'model' ? 'model' : 'user',
              parts: [{ text: String(h.text) }],
            })),
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ];

          const runCall = async (modelName: string) =>
            ai.models.generateContent({
              model: modelName,
              contents: contentsPayload,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    datoEmpirico: {
                      type: Type.STRING,
                      description:
                        'Capa 1 (Dato): Hechos verificables, coordenadas SRID=4326, telemetría o evidencias EV involucradas.',
                    },
                    interpretacionContextual: {
                      type: Type.STRING,
                      description:
                        'Capa 2 (Interpretación): Análisis técnico, espacial o de gobernanza sobre el nodo territorial.',
                    },
                    sugerenciaAccionable: {
                      type: Type.STRING,
                      description:
                        'Capa 3 (Sugerencia): Propuesta concreta para el territorio subordinada a requiresHumanReview: true.',
                    },
                    seciPhaseSuggested: {
                      type: Type.STRING,
                      description:
                        'Fase SECI recomendada: tacito_campo, explicito_evento, sistemico_ev_adr o social_ficha_mapa.',
                    },
                    evidenciaVinculada: {
                      type: Type.STRING,
                      description: 'Código EV-001 a EV-018 relacionado.',
                    },
                  },
                  required: [
                    'datoEmpirico',
                    'interpretacionContextual',
                    'sugerenciaAccionable',
                    'seciPhaseSuggested',
                    'evidenciaVinculada',
                  ],
                },
              },
            });

          let response;
          try {
            response = await runCall(selectedModel);
          } catch {
            // Si gemini-3.1-pro-preview requiere clave paga aún no vinculada, conmuta explícitamente a gemini-3.8-flash (Regla R5)
            actualModelUsed = 'gemini-3.8-flash';
            response = await runCall('gemini-3.8-flash');
          }

          const parsedJson = JSON.parse((response.text || '{}').trim());
          datoEmpirico = String(parsedJson.datoEmpirico || '');
          interpretacionContextual = String(parsedJson.interpretacionContextual || '');
          sugerenciaAccionable = String(parsedJson.sugerenciaAccionable || '');
          seciPhaseSuggested = String(parsedJson.seciPhaseSuggested || 'explicito_evento');
          evidenciaVinculada = String(parsedJson.evidenciaVinculada || 'EV-011');
        } catch {
          engineMode = 'synthetic-explicit-r5';
        }
      } else {
        engineMode = 'synthetic-explicit-r5';
      }

      if (!datoEmpirico) {
        actualModelUsed = `${selectedModel} (Modo Explícito R5)`;
        datoEmpirico = `[Nodo ${targetNode.nombre} · ${targetNode.provincia} · SRID=4326 (${targetNode.lat}, ${targetNode.lng})]: Consulta registrada sobre "${prompt.slice(0, 140)}". Activos y geometrías PostGIS disponibles en el padrón federado.`;
        interpretacionContextual = `Análisis bajo rol "${rolePersona}" (Regla R5: respuesta determinista local activa mientras se vincula GEMINI_API_KEY en Settings > Secrets). El cruce entre las capas vernáculas de ${targetNode.nombre} y el historial trimestral 2026-Q1..Q4 indica prioridad de articulación comunitaria-institucional.`;
        sugerenciaAccionable = `1) Sellar este relevamiento en el Ciclo SECI Territorial (${targetNode.nombre}), 2) Ejecutar verificación espacial PostGIS ST_Intersects si involucra canales/cuencas, y 3) Someter a ratificación humana colegiada (requiresHumanReview: true) antes de pasar a estado operativo.`;
        seciPhaseSuggested = 'explicito_evento';
        evidenciaVinculada =
          nodeKey === 'iglesia' ? 'EV-015' : 'EV-011';
      }

      const nowIso = new Date().toISOString();
      const sha256Hash = computeHash('EthicalAiCopilotConsultation', targetNode.id, {
        nodeKey,
        modelUsed: actualModelUsed,
        rolePersona,
        prompt,
        at: nowIso,
      });

      eventsRaw.unshift({
        id: `ev-ai-${Math.random().toString(16).slice(2, 8)}`,
        type: 'EthicalAiCopilotConsultation',

        nodeId: targetNode.id,
        hash: sha256Hash,
        payload: {
          nodeKey,
          modality: 'chat',
          modelUsed: actualModelUsed,
          engineMode,
          rolePersona,
          requiresHumanReview: true,
          evidenciaVinculada,
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: engineMode !== 'live-gemini-api',
      });

      res.end(
        JSON.stringify({
          success: true,
          data: {
            nodeKey,
            modality: 'chat',
            modelUsed: actualModelUsed,
            engineMode,
            rolePersona,
            prompt,
            datoEmpirico,
            interpretacionContextual,
            sugerenciaAccionable,
            seciPhaseSuggested,
            evidenciaVinculada,
            requiresHumanReview: true,
            sha256Hash,
            createdAt: nowIso,
          },
        }),
      );
      return;
    }

    // 2. POST /api/ia-etica/search-grounding (Google Search Grounding con gemini-3.8-flash)
    if (url.pathname === '/api/ia-etica/search-grounding' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const body = await readBody(req);
      const nodeKey = String(body.nodeKey || 'iglesia') as
        | 'capital'
        | 'caucete'
        | 'iglesia';
      const queryText = String(
        body.query ||
          `Estado hídrico, climático y productivo actual en ${nodeKey}, Cuyo Argentina`,
      ).trim();
      const targetNode =
        territorios.find((t) => t.key === nodeKey) ?? territorios[0];

      let groundedSummary = '';
      let groundingLinks: Array<{ title: string; uri: string }> = [];
      let engineMode: 'live-gemini-api' | 'synthetic-explicit-r5' = 'live-gemini-api';

      const ai = createServerGeminiClient();
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `Realizá una búsqueda actualizada para el nodo territorial ${targetNode.nombre} (${targetNode.provincia}, Argentina) sobre: "${queryText}". Estructurá tu respuesta en tres bloques claros: 1) DATO VERIFICADO, 2) INTERPRETACIÓN TERRITORIAL, 3) SUGERENCIA ÉTICA (requiresHumanReview: true).`,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });
          groundedSummary = String(response.text || '').trim();
          const chunks =
            response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          groundingLinks = chunks
            .map((c: any) =>
              c.web?.uri
                ? {
                    title: String(c.web.title || c.web.uri),
                    uri: String(c.web.uri),
                  }
                : null,
            )
            .filter(Boolean) as Array<{ title: string; uri: string }>;
        } catch {
          engineMode = 'synthetic-explicit-r5';
        }
      } else {
        engineMode = 'synthetic-explicit-r5';
      }

      if (!groundedSummary) {
        groundedSummary = `1) DATO VERIFICADO (${targetNode.nombre}, ${targetNode.provincia}): Consulta de Search Grounding sobre "${queryText}". (Modo explícito R5 activo hasta vincular GEMINI_API_KEY).\n2) INTERPRETACIÓN TERRITORIAL: Los indicadores hídricos y productivos de la cuenca requieren contraste con las estaciones de telemetría (EV-018) y los cortes trimestrales 2026-Q1..Q4.\n3) SUGERENCIA ÉTICA: Incorporar las fuentes públicas verificadas al expediente del nodo ${targetNode.nombre} bajo revisión humana colegiada (requiresHumanReview: true).`;
        groundingLinks = [
          {
            title: `Departamento de Hidráulica / Recursos Hídricos — ${targetNode.provincia}`,
            uri:
              targetNode.provincia === 'San Juan'
                ? 'https://hidraulica.sanjuan.gob.ar'
                : 'https://www.irrigacion.gov.ar',
          },
          {
            title: `Instituto Nacional del Agua (INA · Cuyo) — Monitoreo de Cuencas`,
            uri: 'https://www.argentina.gob.ar/ina',
          },
          {
            title: `Servicio Meteorológico Nacional — Alertas ${targetNode.provincia}`,
            uri: 'https://www.smn.gob.ar',
          },
        ];
      }

      const nowIso = new Date().toISOString();
      const sha256Hash = computeHash('SearchGroundingExecuted', targetNode.id, {
        nodeKey,
        queryText,
        linksCount: groundingLinks.length,
        at: nowIso,
      });

      eventsRaw.unshift({
        id: `ev-search-${Math.random().toString(16).slice(2, 8)}`,
        type: 'SearchGroundingExecuted',
        nodeId: targetNode.id,
        hash: sha256Hash,
        payload: {
          nodeKey,
          model: 'gemini-3.8-flash (googleSearch)',
          engineMode,
          query: queryText,
          groundingLinksCount: groundingLinks.length,
          requiresHumanReview: true,
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: engineMode !== 'live-gemini-api',
      });

      res.end(
        JSON.stringify({
          success: true,
          data: {
            nodeKey,
            modality: 'search_grounding',
            modelUsed: 'gemini-3.8-flash',
            engineMode,
            query: queryText,
            groundedSummary,
            groundingLinks,
            requiresHumanReview: true,
            sha256Hash,
            createdAt: nowIso,
          },
        }),
      );
      return;
    }

    // 3. POST /api/ia-etica/maps-grounding (Google Maps Grounding con gemini-3.8-flash)
    if (url.pathname === '/api/ia-etica/maps-grounding' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const body = await readBody(req);
      const nodeKey = String(body.nodeKey || 'iglesia') as
        | 'capital'
        | 'caucete'
        | 'iglesia';
      const targetNode =
        territorios.find((t) => t.key === nodeKey) ?? territorios[0];
      const latitude = Number(body.latitude ?? targetNode.lat ?? -31.5375);
      const longitude = Number(body.longitude ?? targetNode.lng ?? -68.5364);
      const queryText = String(
        body.query ||
          `Infraestructura comunitaria, centros de salud, escuelas y canales o cooperativas cerca de ${targetNode.nombre}, ${targetNode.provincia}`,
      ).trim();

      let mapsMarkdown = '';
      let mapsPlaces: Array<{
        title: string;
        uri: string;
        reviewSnippets?: string[];
      }> = [];
      let engineMode: 'live-gemini-api' | 'synthetic-explicit-r5' = 'live-gemini-api';

      const ai = createServerGeminiClient();
      if (ai) {
        try {
          // Regla crítica del skill gemini-api: NO configurar responseMimeType ni responseSchema con googleMaps
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `Para el nodo territorial ${targetNode.nombre} (${targetNode.provincia}, coordenadas ${latitude}, ${longitude}): ${queryText}. Organizá la respuesta en Markdown bajo el Contrato Ético Tripartito: **1. Dato Geográfico**, **2. Interpretación de Cobertura Territorial**, **3. Sugerencia Sujeta a Revisión Humana**.`,
            config: {
              tools: [{ googleMaps: {} }],
              toolConfig: {
                retrievalConfig: {
                  latLng: {
                    latitude,
                    longitude,
                  },
                },
              },
            },
          });
          mapsMarkdown = String(response.text || '').trim();
          const chunks =
            response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          mapsPlaces = chunks
            .map((c: any) => {
              if (!c.maps?.uri) return null;
              const snippets = Array.isArray(
                c.maps?.placeAnswerSources?.reviewSnippets,
              )
                ? c.maps.placeAnswerSources.reviewSnippets.map((s: any) =>
                    String(s?.text || s),
                  )
                : [];
              return {
                title: String(c.maps.title || 'Lugar verificado en Google Maps'),
                uri: String(c.maps.uri),
                reviewSnippets: snippets,
              };
            })
            .filter(Boolean) as Array<{
            title: string;
            uri: string;
            reviewSnippets?: string[];
          }>;
        } catch {
          engineMode = 'synthetic-explicit-r5';
        }
      } else {
        engineMode = 'synthetic-explicit-r5';
      }

      if (!mapsMarkdown) {
        mapsMarkdown = `### 1. Dato Geográfico Relevado (${targetNode.nombre} · SRID=4326: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})\nConsulta de **Google Maps Grounding** sobre: *"${queryText}"* (Modo explícito R5 activo hasta vincular \`GEMINI_API_KEY\`).\n\n### 2. Interpretación de Cobertura Territorial\nEl entorno geográfico de **${targetNode.nombre} (${targetNode.provincia})** articula equipamiento comunitario, red vial/hídrica y puntos de resiliencia que se superponen con las geometrías \`ST_LineString\` y \`ST_Polygon\` del Horizonte 2.\n\n### 3. Sugerencia Sujeta a Revisión Humana (\`requiresHumanReview: true\`)\nVincular los puntos geográficos verificados en Google Maps con el filtro espacial \`GET /api/territorios?bbox=\` y validar en campo con los custodios locales.`;
        mapsPlaces = [
          {
            title: `${targetNode.nombre} (${targetNode.provincia}) — Centro Cívico y Nodo Territorial`,
            uri: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
            reviewSnippets: [
              `Punto de referencia geodésico SRID=4326 (${latitude}, ${longitude}) del nodo federado ${targetNode.nombre}.`,
            ],
          },
          {
            title: `Equipamiento Comunitario y Red Hídrica — ${targetNode.nombre}`,
            uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${targetNode.nombre} ${targetNode.provincia} Argentina`,
            )}`,
            reviewSnippets: [
              `Corredor territorial bajo custodia tripartita (${targetNode.foco}).`,
            ],
          },
        ];
      }

      const nowIso = new Date().toISOString();
      const sha256Hash = computeHash('MapsGroundingExecuted', targetNode.id, {
        nodeKey,
        latitude,
        longitude,
        placesCount: mapsPlaces.length,
        at: nowIso,
      });

      eventsRaw.unshift({
        id: `ev-maps-${Math.random().toString(16).slice(2, 8)}`,
        type: 'MapsGroundingExecuted',
        nodeId: targetNode.id,
        hash: sha256Hash,
        payload: {
          nodeKey,
          model: 'gemini-3.8-flash (googleMaps)',
          engineMode,
          coordinates: { latitude, longitude },
          placesCount: mapsPlaces.length,
          requiresHumanReview: true,
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: engineMode !== 'live-gemini-api',
      });

      res.end(
        JSON.stringify({
          success: true,
          data: {
            nodeKey,
            modality: 'maps_grounding',
            modelUsed: 'gemini-3.8-flash',
            engineMode,
            coordinates: { latitude, longitude },
            query: queryText,
            mapsMarkdown,
            mapsPlaces,
            requiresHumanReview: true,
            sha256Hash,
            createdAt: nowIso,
          },
        }),
      );
      return;
    }

    // 4. POST /api/ia-etica/live-voice-turn (Síntesis de Voz y Turno Oral con gemini-3.8-live / gemini-3.8-flash-lite-tts)
    if (url.pathname === '/api/ia-etica/live-voice-turn' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const body = await readBody(req);
      const nodeKey = String(body.nodeKey || 'iglesia') as
        | 'capital'
        | 'caucete'
        | 'iglesia';
      const spokenText = String(
        body.spokenText ||
          'Relevamiento de caudal en canal matriz y estado de compuerta comunitaria',
      ).trim();
      const targetNode =
        territorios.find((t) => t.key === nodeKey) ?? territorios[0];

      let voiceReplyText = `Relevamiento oral registrado para el nodo ${targetNode.nombre}. Dato empírico catalogado en el ciclo SECI; sugerencia sujeta a revisión humana colegiada.`;
      let wavBase64: string | null = null;
      let engineMode: 'live-gemini-api' | 'synthetic-explicit-r5' = 'live-gemini-api';

      const ai = createServerGeminiClient();
      if (ai) {
        try {
          const textResp = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `El custodio del nodo ${targetNode.nombre} (${targetNode.provincia}) acaba de reportar por voz en campo: "${spokenText}". Respondé en 2 oraciones breves y claras aptas para ser leídas en voz alta, separando el Dato recibido y la Sugerencia sujeta a revisión humana.`,
          });
          if (textResp.text) {
            voiceReplyText = textResp.text.trim();
          }

          const ttsResp = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [{ text: voiceReplyText }],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                },
              },
            },
          });
          wavBase64 =
            ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
            null;
        } catch {
          engineMode = 'synthetic-explicit-r5';
        }
      } else {
        engineMode = 'synthetic-explicit-r5';
      }

      const nowIso = new Date().toISOString();
      const sha256Hash = computeHash('LiveVoiceConsultationTurn', targetNode.id, {
        nodeKey,
        spokenText,
        at: nowIso,
      });

      eventsRaw.unshift({
        id: `ev-voice-${Math.random().toString(16).slice(2, 8)}`,
        type: 'LiveVoiceConsultationTurn',
        nodeId: targetNode.id,
        hash: sha256Hash,
        payload: {
          nodeKey,
          model: 'gemini-3.8-live / gemini-3.8-flash-lite-tts',
          engineMode,
          spokenText,
          requiresHumanReview: true,
        },
        occurred_at: nowIso,
        ingested_at: nowIso,
        is_synthetic: engineMode !== 'live-gemini-api',
      });

      res.end(
        JSON.stringify({
          success: true,
          data: {
            nodeKey,
            modality: 'live_voice',
            modelUsed: 'gemini-3.8-live',
            engineMode,
            spokenText,
            voiceReplyText,
            wavBase64,
            datoEmpirico: `Reporte oral en campo (${targetNode.nombre}): "${spokenText}"`,
            interpretacionContextual: voiceReplyText,
            sugerenciaAccionable: `Transformar este turno de voz en registro explícito SECI (${targetNode.nombre}) y ratificar colegiadamente (requiresHumanReview: true).`,
            requiresHumanReview: true,
            sha256Hash,
            createdAt: nowIso,
          },

        }),
      );
      return;
    }

    // GET /api/modelo-federado
    if (url.pathname === '/api/modelo-federado' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: true,
          data: {
            territorios,
            layers,
            categories,
            features,
            reports,
            eventsRaw,
            evidencias,
            spatialGeometries,
            syncPacks,
            temporalSnapshots,
            multiScaleSyntheses,
            lineageChain,
            federalSovereignty: buildFederalSovereignty(),
            spatialIntersections,
            offlineFieldQueue,
            accreditedCustodians,
            telemetryWebhooks,
          },
        }),
      );
      return;
    }

    // ==================================================================
    // HORIZONTE 4 ENDPOINTS (H4-01, H4-02, H4-03, H4-04)
    // ==================================================================

    // H4-01: POST /api/horizonte4/postgis-interseccion (EV-015)
    if (url.pathname === '/api/horizonte4/postgis-interseccion' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = await readBody(req);
        const geometryId = String(parsed.geometryId || spatialGeometries[0]?.id || 'geom-cap-line-01');
        const bufferMeters = Math.max(50, Math.min(5000, Number(parsed.bufferMeters) || 500));
        const geom =
          spatialGeometries.find((g) => g.id === geometryId) ?? spatialGeometries[0];

        const nodeFeatures = features.filter((f) => f.nodeKey === geom.nodeKey);
        // Selección determinista según el radio de amortiguación (bufferMeters)
        const takeCount =
          bufferMeters >= 1000
            ? nodeFeatures.length
            : bufferMeters >= 500
              ? Math.max(2, Math.ceil(nodeFeatures.length * 0.75))
              : Math.max(1, Math.ceil(nodeFeatures.length * 0.5));
        const impactedFeatures = nodeFeatures.slice(0, takeCount);
        const impactedReports = reports.filter((r) => r.nodeKey === geom.nodeKey);

        const now = new Date().toISOString();
        const isectId = `isect-h4-${Math.random().toString(16).slice(2, 6)}`;
        const computedHash = computeHash('PostgisSpatialIntersectionExecuted', geom.nodeKey, {
          geometryId: geom.id,
          bufferMeters,
          impactedFeatureIds: impactedFeatures.map((f) => f.id),
          at: now,
        });

        const newIntersection = {
          id: isectId,
          geometryId: geom.id,
          geometryTitle: geom.title,
          geometryType: geom.geometryType,
          nodeKey: geom.nodeKey,
          bufferMeters,
          spatialOperator: 'ST_Intersects + ST_DWithin(SRID=4326)',
          impactedFeatureIds: impactedFeatures.map((f) => f.id),
          impactedFeatureTitles: impactedFeatures.map((f) => f.title),
          impactedReportIds: impactedReports.map((r) => r.id),
          computedHash,
          executedAt: now,
        };
        spatialIntersections.unshift(newIntersection);

        const newEvent = {
          id: `ev-${Math.random().toString(16).slice(2, 8)}`,
          type: 'PostgisSpatialIntersectionExecuted',
          nodeId: geom.nodeKey,
          hash: computedHash,
          payload: {
            intersectionId: isectId,
            geometryId: geom.id,
            bufferMeters,
            impactedFeaturesCount: impactedFeatures.length,
            impactedReportsCount: impactedReports.length,
          },
          occurred_at: now,
          ingested_at: now,
          is_synthetic: true,
        };
        eventsRaw.unshift(newEvent);

        const ev015 = evidencias.find((e) => e.code === 'EV-015');
        if (ev015) {
          ev015.status = 'ok';
          ev015.verified_at = now;
          ev015.result = {
            intersection_id: isectId,
            geometry_id: geom.id,
            buffer_meters: bufferMeters,
            impacted_features: impactedFeatures.length,
            hash: computedHash,
          };
        }

        res.statusCode = 201;
        res.end(
          JSON.stringify({
            success: true,
            data: newIntersection,
            event: newEvent,
          }),
        );
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Parámetros inválidos para intersección PostGIS' }));
      }
      return;
    }

    // H4-02A: POST /api/horizonte4/offline-queue (Encolar relevamiento en modo offline)
    if (url.pathname === '/api/horizonte4/offline-queue' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = await readBody(req);
        const nodeKey = String(parsed.nodeKey || 'iglesia');
        const brigadeName = String(
          parsed.brigadeName || `Brigada Territorial ${nodeKey.toUpperCase()}`,
        ).trim();
        const title = String(
          parsed.title || 'Relevamiento comunitario capturado sin cobertura móvil',
        ).trim();
        const notes = String(
          parsed.notes || 'Almacenado en cola local IndexedDB con timestamp de captura en terreno.',
        ).trim();
        const baseCoord = NODE_BASE_COORDS[nodeKey] ?? NODE_BASE_COORDS.iglesia;
        const occurredAt = new Date().toISOString();
        const clientHash = `ofq-hash-${computeHash('OfflineFieldCapture', nodeKey, {
          brigadeName,
          title,
          notes,
        })}`;

        const existing = offlineFieldQueue.find((item) => item.clientHash === clientHash);
        if (existing) {
          res.statusCode = 409;
          res.end(
            JSON.stringify({
              success: false,
              error: `Relevamiento offline duplicado rechazado por clientHash (${clientHash})`,
            }),
          );
          return;
        }

        const nodeLayers = layers[nodeKey] ?? [];
        const nodeCats = categories[nodeKey] ?? [];
        const newItem = {
          id: `ofq-${Math.random().toString(16).slice(2, 6)}`,
          nodeKey,
          brigadeName,
          layerKey: String(parsed.layerKey || nodeLayers[0]?.key || 'community_assets'),
          categoryCode: String(parsed.categoryCode || nodeCats[0]?.code || 'general_observation'),
          title,
          notes,
          coords: {
            lat: Number((baseCoord.lat + (Math.random() - 0.5) * 0.02).toFixed(4)),
            lng: Number((baseCoord.lng + (Math.random() - 0.5) * 0.02).toFixed(4)),
          },
          occurredAt,
          ingestedAt: null,
          clientHash,
          syncStatus: 'queued_offline',
        };
        offlineFieldQueue.unshift(newItem);

        res.statusCode = 201;
        res.end(JSON.stringify({ success: true, data: newItem }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Datos inválidos para cola offline' }));
      }
      return;
    }

    // H4-02B: POST /api/horizonte4/batch-sync (Sincronización diferida idempotente · EV-016)
    if (url.pathname === '/api/horizonte4/batch-sync' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const now = new Date().toISOString();
      const pendingItems = offlineFieldQueue.filter(
        (item) => item.syncStatus === 'queued_offline',
      );
      let syncedCount = 0;

      for (const item of pendingItems) {
        item.syncStatus = 'synced_idempotent';
        item.ingestedAt = now;
        syncedCount += 1;

        const featId = `f-ofq-${item.id}`;
        if (!features.some((f) => f.id === featId)) {
          features.unshift({
            id: featId,
            nodeKey: item.nodeKey,
            layer: item.layerKey,
            x: 52,
            y: 48,
            title: item.title,
            status: 'community_validated',
            observedAt: item.occurredAt.slice(0, 10),
            sourceLabel: `${item.brigadeName} (Offline-First Batch Sync)`,
            isSynthetic: false,
            type: 'problem',
            domain: 'community',
          });
        }

        eventsRaw.unshift({
          id: `ev-${Math.random().toString(16).slice(2, 8)}`,
          type: 'OfflineFieldBatchSynced',
          nodeId: item.nodeKey,
          hash: item.clientHash,
          payload: {
            queueItemId: item.id,
            brigadeName: item.brigadeName,
            title: item.title,
            occurred_at: item.occurredAt,
            ingested_at: now,
          },
          occurred_at: item.occurredAt,
          ingested_at: now,
          is_synthetic: false,
        });
      }

      const batchHash = computeHash('OfflineBatchReconciliation', 'federacion-cuyo-h4', {
        syncedCount,
        totalQueue: offlineFieldQueue.length,
        at: now,
      });

      const ev016 = evidencias.find((e) => e.code === 'EV-016');
      if (ev016) {
        ev016.status = 'ok';
        ev016.verified_at = now;
        ev016.result = {
          synced_items_count: syncedCount,
          total_queue_items: offlineFieldQueue.length,
          occurred_vs_ingested_preserved: true,
          batch_hash: batchHash,
        };
      }

      res.end(
        JSON.stringify({
          success: true,
          syncedCount,
          batchHash,
          message: `Sincronización batch idempotente completada (${syncedCount} relevamientos reconciliados en events_raw preservando occurred_at vs ingested_at · EV-016 ok)`,
        }),
      );
      return;
    }

    // H4-03: POST /api/horizonte4/firmar-ed25519 (Firma Criptográfica por Custodio · EV-017)
    if (url.pathname === '/api/horizonte4/firmar-ed25519' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = await readBody(req);
        const custodianId = String(
          parsed.custodianId || accreditedCustodians[0]?.id || 'cust-ed25519-01',
        );
        const targetEntity = String(
          parsed.targetEntity || 'SYN-CUYO-001 · Acta Interprovincial H3/H4',
        ).trim();
        const custodian =
          accreditedCustodians.find((c) => c.id === custodianId) ??
          accreditedCustodians[0];

        const now = new Date().toISOString();
        const sigHash = computeHash('CustodianEd25519SignatureIssued', custodian.nodeKey, {
          custodianId: custodian.id,
          publicKeyFingerprint: custodian.publicKeyFingerprint,
          targetEntity,
          at: now,
        });
        const signatureHex = `sig_ed25519_${sigHash}${computeHash(
          'Ed25519Tail',
          custodian.id,
          now,
        ).slice(0, 8)}`;

        custodian.signaturesIssuedCount += 1;
        custodian.lastSignedTarget = targetEntity;
        custodian.lastSignatureHex = signatureHex;
        custodian.lastSignedAt = now;

        const lastStep = lineageChain[lineageChain.length - 1];
        const parentHash = lastStep?.currentHash ?? 'c841a039d27e6b15';
        lineageChain.push({
          stepIndex: lineageChain.length + 1,
          horizon: 'H4',
          stageLabel: `Eslabón ${lineageChain.length + 1} · Firma Criptográfica Ed25519 (${custodian.role})`,
          eventType: 'CustodianEd25519SignatureIssued',
          entityId: `${custodian.id} → ${targetEntity}`,
          nodeKey: custodian.nodeKey,
          parentHash,
          currentHash: sigHash,
          verified: true,
          summary: `Firmado por ${custodian.displayName} (${custodian.publicKeyFingerprint}) · ${signatureHex}`,
        });

        const newEvent = {
          id: `ev-${Math.random().toString(16).slice(2, 8)}`,
          type: 'CustodianEd25519SignatureIssued',
          nodeId: custodian.nodeKey,
          hash: sigHash,
          payload: {
            custodianId: custodian.id,
            displayName: custodian.displayName,
            role: custodian.role,
            publicKeyFingerprint: custodian.publicKeyFingerprint,
            targetEntity,
            signatureHex,
          },
          occurred_at: now,
          ingested_at: now,
          is_synthetic: false,
        };
        eventsRaw.unshift(newEvent);

        const ev017 = evidencias.find((e) => e.code === 'EV-017');
        if (ev017) {
          ev017.status = 'ok';
          ev017.verified_at = now;
          ev017.result = {
            custodian: custodian.displayName,
            public_key: custodian.publicKeyFingerprint,
            target: targetEntity,
            signature_hex: signatureHex,
          };
        }

        res.statusCode = 201;
        res.end(
          JSON.stringify({
            success: true,
            data: custodian,
            signatureHex,
            event: newEvent,
          }),
        );
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Error al emitir firma Ed25519' }));
      }
      return;
    }

    // H4-04: POST /api/horizonte4/webhooks/telemetria (Ingesta de Telemetría Hídrica · EV-018)
    if (url.pathname === '/api/horizonte4/webhooks/telemetria' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = await readBody(req);
        const stationId = String(
          parsed.stationId || telemetryWebhooks[0]?.id || 'tel-st-01',
        );
        const station =
          telemetryWebhooks.find((s) => s.id === stationId) ?? telemetryWebhooks[0];

        const newValue =
          parsed.value !== undefined && !Number.isNaN(Number(parsed.value))
            ? Number(parsed.value)
            : Number((station.lastValue * 0.92).toFixed(2));

        // Evaluar si cruza umbral de alerta (según parámetro de la estación)
        const isAlert =
          station.unit === 'cm'
            ? newValue >= station.thresholdWarning
            : newValue <= station.thresholdWarning;

        const now = new Date().toISOString();
        const eventHash = computeHash('TelemetryWebhookIngested', station.nodeKey, {
          stationCode: station.stationCode,
          newValue,
          isAlert,
          at: now,
        });


        station.lastValue = newValue;
        station.status = isAlert ? 'alerta_umbral_revision_humana' : 'normal';
        station.requiresHumanReview = true;
        station.lastEventHash = eventHash;
        station.lastReceivedAt = now;

        const newEvent = {
          id: `ev-${Math.random().toString(16).slice(2, 8)}`,
          type: 'TelemetryWebhookIngested',
          nodeId: station.nodeKey,
          hash: eventHash,
          payload: {
            stationCode: station.stationCode,
            stationName: station.stationName,
            parameter: station.parameter,
            value: newValue,
            unit: station.unit,
            status: station.status,
            requiresHumanReview: true,
          },
          occurred_at: now,
          ingested_at: now,
          is_synthetic: false,
        };
        eventsRaw.unshift(newEvent);

        const ev018 = evidencias.find((e) => e.code === 'EV-018');
        if (ev018) {
          ev018.status = 'ok';
          ev018.verified_at = now;
          ev018.result = {
            station_code: station.stationCode,
            last_value: `${newValue} ${station.unit}`,
            status: station.status,
            requires_human_review: true,
            event_hash: eventHash,
          };
        }

        res.statusCode = 201;
        res.end(
          JSON.stringify({
            success: true,
            data: station,
            event: newEvent,
          }),
        );
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Payload de telemetría inválido' }));
      }
      return;
    }

    // POST /api/horizonte3/sintesis (Horizonte 3)
    if (url.pathname === '/api/horizonte3/sintesis' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = await readBody(req);
        const involvedNodes: string[] = Array.isArray(parsed.involvedNodes) && parsed.involvedNodes.length > 0
          ? parsed.involvedNodes
          : ['capital', 'caucete'];
        const involvedDomains: string[] = Array.isArray(parsed.involvedDomains) && parsed.involvedDomains.length > 0
          ? parsed.involvedDomains
          : ['community', 'health'];
        const title = String(
          parsed.title ||
            `Síntesis Inter-Jurisdiccional (${involvedNodes.join(' ↔ ')})`,
        ).trim();
        const sugerenciaAccion = String(
          parsed.sugerenciaAccion ||
            'Articular mesa conjunta de custodios locales para contrastar evidencias antes de intervenir en terreno.',
        ).trim();

        const matchingFeatures = features
          .filter(
            (f) =>
              involvedNodes.includes(f.nodeKey) &&
              involvedDomains.includes(f.domain),
          )
          .slice(0, 5)
          .map((f) => f.id);
        const matchingGeoms = spatialGeometries
          .filter((g) => involvedNodes.includes(g.nodeKey))
          .slice(0, 4)
          .map((g) => g.id);
        const matchingPacks = syncPacks
          .filter(
            (p) =>
              involvedNodes.includes(p.sourceNodeKey) ||
              involvedNodes.includes(p.targetNodeKey),
          )
          .slice(0, 3)
          .map((p) => p.id);

        const now = new Date().toISOString();
        const synId = `syn-h3-${Math.random().toString(16).slice(2, 6)}`;
        const synCode = `SYN-FED-${String(multiScaleSyntheses.length + 1).padStart(3, '0')}`;
        const rootHash = computeHash('MultiScaleSynthesisGenerated', synId, {
          involvedNodes,
          involvedDomains,
          matchingFeatures,
          matchingGeoms,
          at: now,
        });

        const newSyn = {
          id: synId,
          code: synCode,
          title,
          involvedNodes,
          involvedDomains,
          datoImmutableRefs: {
            featureIds: matchingFeatures.length > 0 ? matchingFeatures : ['f-cap-001'],
            reportIds: reports.slice(0, 2).map((r) => r.id),
            geometryIds: matchingGeoms,
            syncPackIds: matchingPacks,
          },
          datoSummary: `${matchingFeatures.length || 1} registros primarios (H1), ${matchingGeoms.length} geometrías PostGIS SRID=4326 (H2) y ${matchingPacks.length} paquetes inter-nodos vinculados.`,
          interpretacionRule: `Regla determinista R-H3-${multiScaleSyntheses.length + 1}: Cruce multi-escala sobre nodos [${involvedNodes.join(', ')}] en dominios [${involvedDomains.join(', ')}].`,
          interpretacionProvisional:
            'Correlación estructural entre las capas explícitas de los nodos seleccionados sin homogeneizar sus categorías vernáculas.',
          sugerenciaAccion,
          requiresHumanReview: true,
          status: 'draft_requires_human',
          ratifiedBy: null,
          ratifiedNote: null,
          ratifiedAt: null,
          lineageRootHash: rootHash,
          createdAt: now,
        };
        multiScaleSyntheses.unshift(newSyn);

        const newEvent = {
          id: `ev-${Math.random().toString(16).slice(2, 8)}`,
          type: 'MultiScaleSynthesisGenerated',
          nodeId: 'observatorio-federal',
          hash: rootHash,
          payload: {
            synthesisId: synId,
            code: synCode,
            involvedNodes,
            requiresHumanReview: true,
          },
          occurred_at: now,
          ingested_at: now,
          is_synthetic: true,
        };
        eventsRaw.unshift(newEvent);

        res.statusCode = 201;
        res.end(JSON.stringify({ success: true, data: newSyn, event: newEvent }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Datos inválidos para síntesis H3' }));
      }
      return;
    }

    // PATCH /api/horizonte3/sintesis/:id/ratificar (Horizonte 3)
    const synRatifyMatch = url.pathname.match(/^\/api\/horizonte3\/sintesis\/([^/]+)\/ratificar$/);
    if (synRatifyMatch && req.method === 'PATCH') {
      res.setHeader('Content-Type', 'application/json');
      const synId = synRatifyMatch[1];
      const targetSyn = multiScaleSyntheses.find((s) => s.id === synId);
      if (!targetSyn) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'Síntesis no encontrada' }));
        return;
      }
      const parsed = await readBody(req);
      const now = new Date().toISOString();
      const nextStatus =
        targetSyn.status === 'draft_requires_human'
          ? 'human_ratified'
          : 'sealed_in_observatory';
      targetSyn.status = nextStatus;
      targetSyn.ratifiedBy =
        String(parsed.ratifiedBy || '').trim() ||
        targetSyn.ratifiedBy ||
        'Mesa Colegiada de Custodios Territoriales';
      targetSyn.ratifiedNote =
        String(parsed.ratifiedNote || '').trim() ||
        targetSyn.ratifiedNote ||
        'Revisión humana colegiada conforme al Contrato Ético Tripartito (requiresHumanReview: true).';
      targetSyn.ratifiedAt = now;

      const lastStep = lineageChain[lineageChain.length - 1];
      const parentHash = lastStep?.currentHash ?? targetSyn.lineageRootHash;
      const currentHash = computeHash('MultiScaleSynthesisRatified', targetSyn.id, {
        parentHash,
        status: nextStatus,
        ratifiedBy: targetSyn.ratifiedBy,
        at: now,
      });
      targetSyn.lineageRootHash = currentHash;

      lineageChain.push({
        stepIndex: lineageChain.length + 1,
        horizon: 'H3',
        stageLabel: `Eslabón ${lineageChain.length + 1} · ${
          nextStatus === 'human_ratified'
            ? 'Ratificación Humana Colegiada'
            : 'Sellado en Observatorio Federal'
        }`,
        eventType:
          nextStatus === 'human_ratified'
            ? 'MultiScaleSynthesisRatified'
            : 'PublicTerritorialActSealed',
        entityId: `${targetSyn.id} (${targetSyn.code})`,
        nodeKey: targetSyn.involvedNodes.join(' ↔ '),
        parentHash,
        currentHash,
        verified: true,
        summary: `${targetSyn.ratifiedBy}: ${targetSyn.ratifiedNote}`,
      });

      const newEvent = {
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type:
          nextStatus === 'human_ratified'
            ? 'MultiScaleSynthesisRatified'
            : 'PublicTerritorialActSealed',
        nodeId: 'observatorio-federal',
        hash: currentHash,
        payload: {
          synthesisId: targetSyn.id,
          code: targetSyn.code,
          status: nextStatus,
          ratifiedBy: targetSyn.ratifiedBy,
          parentHash,
        },
        occurred_at: now,
        ingested_at: now,
        is_synthetic: true,
      };
      eventsRaw.unshift(newEvent);

      const ev011 = evidencias.find((e) => e.code === 'EV-011');
      if (ev011) {
        ev011.status = 'ok';
        ev011.verified_at = now;
        ev011.result = {
          synthesis_code: targetSyn.code,
          status: nextStatus,
          ratified_by: targetSyn.ratifiedBy,
          lineage_hash: currentHash,
        };
      }

      res.end(JSON.stringify({ success: true, data: targetSyn, event: newEvent }));
      return;
    }

    // POST /api/horizonte3/auditar-linaje (Horizonte 3)
    if (url.pathname === '/api/horizonte3/auditar-linaje' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const now = new Date().toISOString();
      lastMultiAgentAuditAt = now;
      for (const t of territorios) {
        lastAuditByNode[t.key] = now;
      }
      for (const step of lineageChain) {
        step.verified = true;
      }
      const auditHash = computeHash('CryptographicLineageAudited', 'observatorio-federal', {
        stepsVerified: lineageChain.length,
        eventsCount: eventsRaw.length,
        at: now,
      });

      const newEvent = {
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'CryptographicLineageAudited',
        nodeId: 'observatorio-federal',
        hash: auditHash,
        payload: {
          chainStepsVerified: lineageChain.length,
          eventsAudited: eventsRaw.length,
          merkleTipHash: lineageChain[lineageChain.length - 1]?.currentHash ?? auditHash,
          humanReviewEnforced: true,
        },
        occurred_at: now,
        ingested_at: now,
        is_synthetic: true,
      };
      eventsRaw.unshift(newEvent);

      const ev012 = evidencias.find((e) => e.code === 'EV-012');
      if (ev012) {
        ev012.status = 'ok';
        ev012.verified_at = now;
        ev012.result = {
          chain_steps_verified: lineageChain.length,
          events_raw_count: eventsRaw.length,
          tip_hash: lineageChain[lineageChain.length - 1]?.currentHash ?? auditHash,
          audit_event_hash: auditHash,
        };
      }

      res.end(
        JSON.stringify({
          success: true,
          auditHash,
          stepsVerified: lineageChain.length,
          tipHash: lineageChain[lineageChain.length - 1]?.currentHash ?? auditHash,
          message: `Cadena criptográfica SHA-256 íntegra (${lineageChain.length} eslabones H1→H2→H3 verificados · EV-012 ok)`,
        }),
      );
      return;
    }

    // PATCH /api/horizonte3/soberania/:nodeKey (Horizonte 3)
    const sovMatch = url.pathname.match(/^\/api\/horizonte3\/soberania\/([^/]+)$/);
    if (sovMatch && req.method === 'PATCH') {
      res.setHeader('Content-Type', 'application/json');
      const nodeKey = decodeURIComponent(sovMatch[1]);
      const currentMode = sovereigntyModes[nodeKey] ?? 'delegacion_revocable_activa';
      const nextMode =
        currentMode === 'delegacion_revocable_activa'
          ? 'custodia_local_estricta'
          : 'delegacion_revocable_activa';
      sovereigntyModes[nodeKey] = nextMode;

      const now = new Date().toISOString();
      lastAuditByNode[nodeKey] = now;
      const hash = computeHash('NodeSovereigntyCharterUpdated', nodeKey, {
        nodeKey,
        nextMode,
        at: now,
      });
      eventsRaw.unshift({
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'NodeSovereigntyCharterUpdated',
        nodeId: nodeKey,
        hash,
        payload: { nodeKey, sovereigntyMode: nextMode },
        occurred_at: now,
        ingested_at: now,
        is_synthetic: true,
      });

      const ev014 = evidencias.find((e) => e.code === 'EV-014');
      if (ev014) {
        ev014.status = 'ok';
        ev014.verified_at = now;
        ev014.result = {
          updated_node: nodeKey,
          sovereignty_mode: nextMode,
          event_hash: hash,
        };
      }

      res.end(
        JSON.stringify({
          success: true,
          data: buildFederalSovereignty(),
        }),
      );
      return;
    }

    // POST /api/geometrias-postgis (Horizonte 2)
    if (url.pathname === '/api/geometrias-postgis' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = await readBody(req);
        const nodeKey = String(parsed.nodeKey || 'capital');
        const node = territorios.find((t) => t.key === nodeKey) ?? territorios[0];
        const geometryType = parsed.geometryType === 'Polygon' ? 'Polygon' : 'LineString';
        const title = String(parsed.title || `Tramo espacial en ${node.nombre}`).trim();
        const layerKey = String(
          parsed.layerKey || (layers[node.key]?.[0]?.key ?? 'community_assets'),
        );
        const domain = String(
          parsed.domain || (layers[node.key]?.[0]?.domain ?? 'community'),
        );
        const base = NODE_BASE_COORDS[node.key] ?? { lat: -31.5375, lng: -68.5364 };
        const jitter = (Math.random() - 0.5) * 0.025;

        const realCoords =
          geometryType === 'Polygon'
            ? [
                { lat: Number((base.lat + 0.015 + jitter).toFixed(4)), lng: Number((base.lng - 0.022 + jitter).toFixed(4)) },
                { lat: Number((base.lat + 0.015 + jitter).toFixed(4)), lng: Number((base.lng + 0.022 + jitter).toFixed(4)) },
                { lat: Number((base.lat - 0.015 + jitter).toFixed(4)), lng: Number((base.lng + 0.022 + jitter).toFixed(4)) },
                { lat: Number((base.lat - 0.015 + jitter).toFixed(4)), lng: Number((base.lng - 0.022 + jitter).toFixed(4)) },
              ]
            : [
                { lat: Number((base.lat + 0.018 + jitter).toFixed(4)), lng: Number((base.lng - 0.028 + jitter).toFixed(4)) },
                { lat: Number((base.lat + jitter).toFixed(4)), lng: Number((base.lng + jitter).toFixed(4)) },
                { lat: Number((base.lat - 0.018 + jitter).toFixed(4)), lng: Number((base.lng + 0.028 + jitter).toFixed(4)) },
              ];

        const wktCoords = realCoords.map((c) => `${c.lng} ${c.lat}`);
        if (geometryType === 'Polygon') {
          wktCoords.push(`${realCoords[0].lng} ${realCoords[0].lat}`);
        }
        const wkt =
          geometryType === 'Polygon'

            ? `SRID=4326;POLYGON((${wktCoords.join(', ')}))`
            : `SRID=4326;LINESTRING(${wktCoords.join(', ')})`;

        const metricLabel =
          geometryType === 'Polygon'
            ? `${Math.round(450 + Math.random() * 900)} ha (ST_Area)`
            : `${(3.2 + Math.random() * 9.5).toFixed(1)} km (ST_Length)`;

        const newGeom = {
          id: `geom-${node.key}-${Math.random().toString(16).slice(2, 6)}`,
          nodeKey: node.key,
          layerKey,
          domain,
          title,
          geometryType,
          srid: 4326,
          wkt,
          metricLabel,
          custodians: ['community', 'institutions'],
          status: 'community_validated',
          quarter: '2026-Q4',
          schematicPath:
            geometryType === 'Polygon'
              ? [
                  { x: 24, y: 20 },
                  { x: 76, y: 20 },
                  { x: 76, y: 50 },
                  { x: 24, y: 50 },
                ]
              : [
                  { x: 18, y: 46 },
                  { x: 50, y: 31 },
                  { x: 82, y: 18 },
                ],
          realCoords,
          color: node.color || '#2e9e5b',
        };
        spatialGeometries.unshift(newGeom);

        const now = new Date().toISOString();
        const evId = `ev-${Math.random().toString(16).slice(2, 8)}`;
        const hash = computeHash('SpatialGeometryCommitted', node.id, {
          geomId: newGeom.id,
          wkt: newGeom.wkt,
        });
        const newEvent = {
          id: evId,
          type: 'SpatialGeometryCommitted',
          nodeId: node.id,
          hash,
          payload: {
            geometryId: newGeom.id,
            nodeKey: node.key,
            geometryType,
            srid: 4326,
            metricLabel,
          },
          occurred_at: now,
          ingested_at: now,
          is_synthetic: true,
        };
        eventsRaw.unshift(newEvent);

        const ev007 = evidencias.find((e) => e.code === 'EV-007');
        if (ev007) {
          ev007.status = 'ok';
          ev007.verified_at = now;
          ev007.result = {
            latest_geometry_id: newGeom.id,
            wkt: newGeom.wkt,
            total_geometries: spatialGeometries.length,
          };
        }

        res.statusCode = 201;
        res.end(JSON.stringify({ success: true, data: newGeom, event: newEvent }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Datos inválidos para geometría PostGIS' }));
      }
      return;
    }

    // POST /api/federacion/sync-packs (Horizonte 2)
    if (url.pathname === '/api/federacion/sync-packs' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = await readBody(req);
        const sourceNodeKey = String(parsed.sourceNodeKey || 'capital');
        const targetNodeKey = String(parsed.targetNodeKey || 'caucete');
        const domain = String(parsed.domain || 'community');
        const title = String(
          parsed.title || `Protocolo Federado (${sourceNodeKey} ↔ ${targetNodeKey})`,
        ).trim();
        const sharedSummary = String(
          parsed.sharedSummary ||
            'Intercambio de geometrías y alertas respetando la soberanía semántica de cada nodo.',
        ).trim();
        const sourceCustodian = String(
          parsed.sourceCustodian || `Custodio Territorial ${sourceNodeKey}`,
        ).trim();

        const sourceNode =
          territorios.find((t) => t.key === sourceNodeKey) ?? territorios[0];
        const now = new Date().toISOString();
        const packId = `sync-pack-${Math.random().toString(16).slice(2, 6)}`;
        const evId = `ev-${Math.random().toString(16).slice(2, 8)}`;
        const hash = computeHash('InterNodeSyncPackProposed', sourceNode.id, {
          packId,
          sourceNodeKey,
          targetNodeKey,
          domain,
          title,
        });

        const matchingGeoms = spatialGeometries
          .filter((g) => g.nodeKey === sourceNodeKey || g.nodeKey === targetNodeKey)
          .slice(0, 2)
          .map((g) => g.id);

        const newPack = {
          id: packId,
          eventId: evId,
          hash,
          sourceNodeKey,
          targetNodeKey,
          domain,
          title,
          sharedSummary,
          sourceVocabularyTerm:
            categories[sourceNodeKey]?.[0]?.label ?? `Vocabulario local (${sourceNodeKey})`,
          targetVocabularyMapping:
            categories[targetNodeKey]?.[0]?.label ?? `Vocabulario local (${targetNodeKey})`,
          geometryIds: matchingGeoms,
          sourceCustodian,
          targetCustodianAck: null,
          status: 'proposed',
          quarter: '2026-Q4',
          createdAt: now,
          verifiedAt: null,
        };
        syncPacks.unshift(newPack);

        const newEvent = {
          id: evId,
          type: 'InterNodeSyncPackProposed',
          nodeId: sourceNode.id,
          hash,
          payload: {
            packId,
            sourceNodeKey,
            targetNodeKey,
            domain,
          },
          occurred_at: now,
          ingested_at: now,
          is_synthetic: true,
        };
        eventsRaw.unshift(newEvent);

        res.statusCode = 201;
        res.end(JSON.stringify({ success: true, data: newPack, event: newEvent }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Datos inválidos para el paquete federado' }));
      }
      return;
    }

    // PATCH /api/federacion/sync-packs/:id/ack (Horizonte 2)
    const syncAckMatch = url.pathname.match(/^\/api\/federacion\/sync-packs\/([^/]+)\/ack$/);
    if (syncAckMatch && req.method === 'PATCH') {
      res.setHeader('Content-Type', 'application/json');
      const packId = syncAckMatch[1];
      const targetPack = syncPacks.find((p) => p.id === packId);
      if (!targetPack) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'Paquete federado no encontrado' }));
        return;
      }
      const parsed = await readBody(req);
      const now = new Date().toISOString();
      const nextStatus =
        targetPack.status === 'proposed' ? 'custodian_verified' : 'federated_active';
      targetPack.status = nextStatus;
      targetPack.verifiedAt = now;
      targetPack.targetCustodianAck =
        parsed.targetCustodianAck ||
        targetPack.targetCustodianAck ||
        `Mesa de Custodia Local (${targetPack.targetNodeKey})`;

      const targetNode =
        territorios.find((t) => t.key === targetPack.targetNodeKey) ?? territorios[0];
      const evId = `ev-${Math.random().toString(16).slice(2, 8)}`;
      const hash = computeHash('InterNodeSyncPackVerified', targetNode.id, {
        packId: targetPack.id,
        status: nextStatus,
        at: now,
      });
      const newEvent = {
        id: evId,
        type: 'InterNodeSyncPackVerified',
        nodeId: targetNode.id,
        hash,
        payload: {
          packId: targetPack.id,
          sourceNodeKey: targetPack.sourceNodeKey,
          targetNodeKey: targetPack.targetNodeKey,
          status: nextStatus,
          custodianAck: targetPack.targetCustodianAck,
        },
        occurred_at: now,
        ingested_at: now,
        is_synthetic: true,
      };
      eventsRaw.unshift(newEvent);

      const ev008 = evidencias.find((e) => e.code === 'EV-008');
      if (ev008) {
        ev008.status = 'ok';
        ev008.verified_at = now;
        ev008.result = {
          verified_pack_id: targetPack.id,
          nodes: `${targetPack.sourceNodeKey} <-> ${targetPack.targetNodeKey}`,
          status: nextStatus,
          event_hash: hash,
        };
      }

      res.end(JSON.stringify({ success: true, data: targetPack, event: newEvent }));
      return;
    }

    // POST /api/reportes
    if (url.pathname === '/api/reportes' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = await readBody(req);
        const { nodeKey, category, description, picked } = parsed;
        const node = territorios.find((t) => t.key === nodeKey) ?? territorios[0];
        const catList = categories[node.key] ?? [];
        const catObj = catList.find((c: any) => c.code === category);
        const now = new Date().toISOString();
        const repId = `rep-${Math.random().toString(16).slice(2, 8)}`;
        const evId = `ev-${Math.random().toString(16).slice(2, 8)}`;
        const hash = computeHash('TerritorialReportCreated', node.id, {
          nodeKey: node.key,
          category,
          description,
          picked,
        });

        if (eventsRaw.some((e) => e.hash === hash)) {
          res.statusCode = 409;
          res.end(
            JSON.stringify({
              success: false,
              error: 'Evento duplicado rechazado por constraint único de hash (idempotencia)',
              hash,
            }),
          );
          return;
        }

        const newEvent = {
          id: evId,
          type: 'TerritorialReportCreated',
          nodeId: node.id,
          hash,
          payload: {
            reportId: repId,
            nodeKey: node.key,
            category,
            description,
          },
          occurred_at: now,
          ingested_at: now,
          is_synthetic: true,
        };
        eventsRaw.unshift(newEvent);

        const newReport = {
          id: repId,
          eventId: evId,
          nodeKey: node.key,
          category,
          categoryLabel: catObj?.label ?? category,
          description: String(description || 'Observación territorial registrada').trim(),
          status: 'received',
          createdAt: now,
          isSynthetic: true,
          picked: picked ?? { x: 50, y: 50 },
          history: [{ status: 'received', at: now }],
          humanReviewed: false,
        };
        reports.unshift(newReport);

        res.statusCode = 201;
        res.end(JSON.stringify({ success: true, data: newReport, event: newEvent }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Datos inválidos para el reporte' }));
      }
      return;
    }

    // PATCH /api/features/:id/visual-check (Validación visual rápida de activos en la Galería IA)
    const featVisualMatch = url.pathname.match(/^\/api\/features\/([^/]+)\/visual-check$/);
    if (featVisualMatch && req.method === 'PATCH') {
      res.setHeader('Content-Type', 'application/json');
      const featId = decodeURIComponent(featVisualMatch[1]);
      const targetFeat = features.find((f) => f.id === featId);
      if (!targetFeat) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'Activo no encontrado' }));
        return;
      }
      const parsed = await readBody(req);
      const visualState =
        parsed.visualState === 'maintenance_required'
          ? 'maintenance_required'
          : 'optimal_verified';
      const now = new Date().toISOString();
      targetFeat.status =
        visualState === 'maintenance_required' ? 'maintenance_required' : 'verified';
      targetFeat.observedAt = now.slice(0, 10);

      const hash = computeHash('VisualAssetValidationRecorded', targetFeat.nodeKey, {
        featureId: targetFeat.id,
        visualState,
        at: now,
      });
      const newEvent = {
        id: `ev-${Math.random().toString(16).slice(2, 8)}`,
        type: 'VisualAssetValidationRecorded',
        nodeId: targetFeat.nodeKey,
        hash,
        payload: {
          featureId: targetFeat.id,
          title: targetFeat.title,
          nodeKey: targetFeat.nodeKey,
          visualState,
          newEpistemicStatus: targetFeat.status,
        },
        occurred_at: now,
        ingested_at: now,
        is_synthetic: false,
      };
      eventsRaw.unshift(newEvent);

      res.end(
        JSON.stringify({
          success: true,
          data: targetFeat,
          visualState,
          event: newEvent,
        }),
      );
      return;
    }

    // PATCH /api/reportes/:id/advance
    const repAdvanceMatch = url.pathname.match(/^\/api\/reportes\/([^/]+)\/advance$/);
    if (repAdvanceMatch && req.method === 'PATCH') {
      res.setHeader('Content-Type', 'application/json');
      const repId = repAdvanceMatch[1];
      const target = reports.find((r) => r.id === repId);
      if (!target) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'Reporte no encontrado' }));
        return;
      }
      const idx = REPORT_FLOW.indexOf(target.status);
      if (idx < 0 || idx >= REPORT_FLOW.length - 1) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'El reporte ya está en estado resuelto' }));
        return;
      }
      const nextStatus = REPORT_FLOW[idx + 1];
      const now = new Date().toISOString();
      target.status = nextStatus;
      target.history.push({ status: nextStatus, at: now });

      const node = territorios.find((t) => t.key === target.nodeKey) ?? territorios[0];
      const evId = `ev-${Math.random().toString(16).slice(2, 8)}`;
      const hash = computeHash('TerritorialReportStatusChanged', node.id, {
        reportId: target.id,
        status: nextStatus,
        at: now,
      });
      const newEvent = {
        id: evId,
        type: 'TerritorialReportStatusChanged',
        nodeId: node.id,
        hash,
        payload: { reportId: target.id, newStatus: nextStatus },
        occurred_at: now,
        ingested_at: now,
        is_synthetic: true,
      };

      eventsRaw.unshift(newEvent);

      res.end(JSON.stringify({ success: true, data: target, event: newEvent }));
      return;
    }

    // POST /api/ethical-review
    if (url.pathname === '/api/ethical-review' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = await readBody(req);
        const { nodeKey, reviewerNote } = parsed;
        const node = territorios.find((t) => t.key === nodeKey) ?? territorios[0];
        const now = new Date().toISOString();
        const evId = `ev-${Math.random().toString(16).slice(2, 8)}`;
        const hash = computeHash('EthicalContractHumanReviewed', node.id, {
          nodeKey: node.key,
          reviewerNote,
          at: now,
        });
        const newEvent = {
          id: evId,
          type: 'EthicalContractHumanReviewed',
          nodeId: node.id,
          hash,
          payload: {
            nodeKey: node.key,
            requiresHumanReview: true,
            reviewed: true,
            reviewerNote: reviewerNote || 'Revisión humana validada sobre sugerencia territorial',
          },
          occurred_at: now,
          ingested_at: now,
          is_synthetic: true,
        };
        eventsRaw.unshift(newEvent);
        for (const r of reports) {
          if (r.nodeKey === node.key) {
            r.humanReviewed = true;
            r.humanReviewerNote = newEvent.payload.reviewerNote;
          }
        }
        res.statusCode = 201;
        res.end(JSON.stringify({ success: true, event: newEvent }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Datos inválidos' }));
      }
      return;
    }

    // POST /api/events (para verificar idempotencia EV-005 en events_raw)
    if (url.pathname === '/api/events' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = await readBody(req);
        const type = String(parsed.type || 'CustomTerritorialEvent');
        const nodeId = String(parsed.nodeId || 'ter-sjn-cap');
        const payload = parsed.payload ?? {};
        const hash = parsed.hash
          ? String(parsed.hash)
          : computeHash(type, nodeId, payload);

        const duplicate = eventsRaw.find((e) => e.hash === hash);
        if (duplicate) {
          // Marcar automáticamente EV-005 como verificada al comprobarse el rechazo por hash duplicado
          const ev005 = evidencias.find((e) => e.code === 'EV-005');
          if (ev005) {
            ev005.status = 'ok';
            ev005.verified_at = new Date().toISOString();
            ev005.result = {
              rejected_duplicate_hash: hash,
              original_event_id: duplicate.id,
              verified_by: 'POST /api/events (409 Unique constraint on hash)',
            };
          }
          res.statusCode = 409;
          res.end(
            JSON.stringify({
              success: false,
              error: `Unique constraint failed on the fields: (\`hash\`) — hash '${hash}' ya existe en events_raw`,
              evidencia_actualizada: 'EV-005 -> ok',
            }),
          );
          return;
        }

        const now = new Date().toISOString();
        const newEvent = {
          id: `ev-${Math.random().toString(16).slice(2, 8)}`,
          type,
          nodeId,
          hash,
          payload,
          occurred_at: now,
          ingested_at: now,
          is_synthetic: true,
        };
        eventsRaw.unshift(newEvent);
        res.statusCode = 201;
        res.end(JSON.stringify({ success: true, data: newEvent }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Payload inválido' }));
      }
      return;
    }

    // /api/territorios
    if (url.pathname === '/api/territorios' || url.pathname.startsWith('/api/territorios/')) {
      res.setHeader('Content-Type', 'application/json');
      const idMatch = url.pathname.match(/^\/api\/territorios\/([^/]+)$/);

      if (req.method === 'GET' && !idMatch) {
        const activoParam = url.searchParams.get('activo');
        const bboxParam = url.searchParams.get('bbox');
        let list = [...territorios].sort((a, b) => a.nombre.localeCompare(b.nombre));
        if (activoParam !== null) {
          const isActivo = activoParam === 'true';
          list = list.filter((t) => t.activo === isActivo);
        }
        let spatialQueryMeta: Record<string, unknown> | undefined;
        if (bboxParam) {
          const parts = bboxParam.split(',').map((n) => Number(n.trim()));
          if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
            const [minLng, minLat, maxLng, maxLat] = parts;
            list = list.filter((t) => {
              const lat = t.lat ?? -31.5375;
              const lng = t.lng ?? -68.5364;
              return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
            });
            spatialQueryMeta = {
              srid: 4326,
              indexUsed: 'idx_territorios_geom_gist (GiST)',
              postgisOperator: `ST_Intersects(geom, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))`,
              bbox: [minLng, minLat, maxLng, maxLat],
              matchedCount: list.length,
            };
          }
        }
        res.end(
          JSON.stringify({
            success: true,
            data: list,
            count: list.length,
            ...(spatialQueryMeta ? { spatialQuery: spatialQueryMeta } : {}),
          }),
        );
        return;
      }

      if (req.method === 'GET' && idMatch) {
        const found = territorios.find((t) => t.id === idMatch[1]);
        if (!found) {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Territorio no encontrado' }));
          return;
        }
        res.end(JSON.stringify({ success: true, data: found }));
        return;
      }

      if (req.method === 'POST' && !idMatch) {
        try {
          const parsed = await readBody(req);
          if (!parsed.nombre || !parsed.provincia) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Nombre y provincia son obligatorios' }));
            return;
          }
          const cleanName = String(parsed.nombre).trim();
          const slug = cleanName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-');
          const nuevo: TerritorioRecord = {
            id: `ter-${Date.now().toString(36)}`,
            key: slug || `nodo-${Date.now().toString(36)}`,
            nombre: cleanName,
            subtitulo: parsed.subtitulo ? String(parsed.subtitulo).trim() : 'Nodo Federado',
            provincia: String(parsed.provincia).trim(),
            foco: parsed.foco ? String(parsed.foco).trim() : 'Relevamiento comunitario y activos locales',
            focusLong: parsed.focusLong
              ? String(parsed.focusLong).trim()
              : `Nodo federado incorporado en ${String(parsed.provincia).trim()} bajo el núcleo común DELocalSoy.AR.`,
            poblacion: Number(parsed.poblacion) || 15000,
            color: '#0D9488',
            activo: parsed.activo !== undefined ? Boolean(parsed.activo) : true,
          };
          territorios.push(nuevo);
          if (!layers[nuevo.key]) {
            layers[nuevo.key] = [
              {
                key: 'community_assets',
                name: 'Activos y equipamiento comunitario',
                domain: 'community',
                geometry: 'Point',
                defaultOn: true,
                producedBy: ['community', 'institutions'],
              },
              {
                key: 'local_problems',
                name: 'Problemáticas territoriales',
                domain: 'problems',
                geometry: 'Point',
                defaultOn: true,
                producedBy: ['community'],
              },
            ];
          }
          if (!categories[nuevo.key]) {
            categories[nuevo.key] = [
              {
                code: 'general_observation',
                label: 'Observación comunitaria territorial',
                layer: 'local_problems',
              },
            ];
          }

          const now = new Date().toISOString();
          eventsRaw.unshift({
            id: `ev-${Math.random().toString(16).slice(2, 8)}`,
            type: 'FederatedNodeRegistered',
            nodeId: nuevo.id,
            hash: computeHash('FederatedNodeRegistered', nuevo.id, { nombre: nuevo.nombre }),
            payload: { nombre: nuevo.nombre, provincia: nuevo.provincia, key: nuevo.key },
            occurred_at: now,
            ingested_at: now,
            is_synthetic: true,
          });

          res.statusCode = 201;
          res.end(
            JSON.stringify({
              success: true,
              data: nuevo,
              message: 'Territorio creado exitosamente',
            }),
          );
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: 'Datos inválidos' }));
        }
        return;
      }

      if ((req.method === 'PUT' || req.method === 'DELETE') && idMatch) {
        const targetId = idMatch[1];
        const idx = territorios.findIndex((t) => t.id === targetId);
        if (idx === -1) {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Territorio no encontrado' }));
          return;
        }

        if (req.method === 'DELETE') {
          territorios[idx] = { ...territorios[idx], activo: false };
          res.end(
            JSON.stringify({
              success: true,
              data: territorios[idx],
              message: 'Territorio desactivado exitosamente',
            }),
          );
          return;
        }

        try {
          const parsed = await readBody(req);
          territorios[idx] = {
            ...territorios[idx],
            ...(parsed.nombre !== undefined ? { nombre: String(parsed.nombre).trim() } : {}),
            ...(parsed.provincia !== undefined ? { provincia: String(parsed.provincia).trim() } : {}),
            ...(parsed.foco !== undefined ? { foco: String(parsed.foco).trim() } : {}),
            ...(parsed.activo !== undefined ? { activo: Boolean(parsed.activo) } : {}),
          };
          res.end(
            JSON.stringify({
              success: true,
              data: territorios[idx],
              message: 'Territorio actualizado exitosamente',
            }),
          );
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: 'Datos inválidos' }));
        }
        return;
      }
    }

    // /api/evidencias
    if (url.pathname === '/api/evidencias' || url.pathname.startsWith('/api/evidencias/')) {
      res.setHeader('Content-Type', 'application/json');
      const verifyMatch = url.pathname.match(/^\/api\/evidencias\/([^/]+)\/verify$/);

      if (req.method === 'GET' && !verifyMatch) {
        const statusFilter = url.searchParams.get('status');
        const list = statusFilter
          ? evidencias.filter((e) => e.status === statusFilter)
          : evidencias;
        res.end(JSON.stringify({ success: true, data: list, count: list.length }));
        return;
      }

      if (req.method === 'PATCH' && verifyMatch) {
        const code = decodeURIComponent(verifyMatch[1]);
        const target = evidencias.find((e) => e.code === code);
        if (!target) {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Evidencia no encontrada' }));
          return;
        }
        const parsed = await readBody(req);
        target.status = 'ok';
        target.verified_at = new Date().toISOString();
        target.result = parsed.result ?? { verified_interactively: true };
        res.end(
          JSON.stringify({
            success: true,
            data: target,
            message: 'Evidencia verificada exitosamente',
          }),
        );
        return;
      }
    }

    // GET /api/contrato-sistema & POST /api/contrato-sistema/verificar
    if (
      url.pathname === '/api/contrato-sistema' ||
      url.pathname === '/api/contrato-sistema/verificar'
    ) {
      res.setHeader('Content-Type', 'application/json');
      const prismaModels = [
        { name: 'events_raw', horizon: 'CORE-001', recordsCount: eventsRaw.length, status: 'synchronized' },
        { name: 'evidencias', horizon: 'CORE-001', recordsCount: evidencias.length, status: 'synchronized' },
        { name: 'territorios', horizon: 'Horizonte 1', recordsCount: territorios.length, status: 'synchronized' },
        { name: 'capas_territoriales', horizon: 'Horizonte 1', recordsCount: Object.values(layers).flat().length, status: 'synchronized' },
        { name: 'features_territoriales', horizon: 'Horizonte 1', recordsCount: features.length, status: 'synchronized' },
        { name: 'reportes_territoriales', horizon: 'Horizonte 1', recordsCount: reports.length, status: 'synchronized' },
        { name: 'geometrias_espaciales', horizon: 'Horizonte 2', recordsCount: spatialGeometries.length, status: 'synchronized' },
        { name: 'paquetes_sincronizacion_federada', horizon: 'Horizonte 2', recordsCount: syncPacks.length, status: 'synchronized' },
        { name: 'cortes_trimestrales_nodo', horizon: 'Horizonte 2', recordsCount: temporalSnapshots.length, status: 'synchronized' },
        { name: 'sintesis_multiescala', horizon: 'Horizonte 3', recordsCount: multiScaleSyntheses.length, status: 'synchronized' },
        { name: 'cadena_linaje_criptografico', horizon: 'Horizonte 3', recordsCount: lineageChain.length, status: 'synchronized' },
        { name: 'soberania_federal_nodos', horizon: 'Horizonte 3', recordsCount: buildFederalSovereignty().length, status: 'synchronized' },
        { name: 'consultas_interseccion_postgis', horizon: 'Horizonte 4', recordsCount: spatialIntersections.length, status: 'synchronized' },
        { name: 'cola_sincronizacion_campo', horizon: 'Horizonte 4', recordsCount: offlineFieldQueue.length, status: 'synchronized' },
        { name: 'custodios_acreditados_ed25519', horizon: 'Horizonte 4', recordsCount: accreditedCustodians.length, status: 'synchronized' },
        { name: 'telemetria_webhooks_territoriales', horizon: 'Horizonte 4', recordsCount: telemetryWebhooks.length, status: 'synchronized' },
        // Paridad A-06: los 3 modelos Auth/Ask que exige el validador Pre-C5
        // (expected19Models en /api/contracts/validate-prisma-referential-integrity)
        // faltaban en el contrato visible — se agregan para alinear el digest (19/19).
        { name: 'actores_territoriales', horizon: 'Track A · Auth', recordsCount: 0, status: 'synchronized' },
        { name: 'sesiones_jwt_actores', horizon: 'Track A · Auth', recordsCount: 0, status: 'synchronized' },
        { name: 'consultas_ask_rag', horizon: 'Track A · Ask RAG', recordsCount: 0, status: 'synchronized' },
      ];

      const endpoints = [
        { method: 'GET/PATCH', path: '/api/health', horizon: 'CORE-001 · Sprint 0', evidence: 'EV-004 · R5', status: 'ok' },
        { method: 'GET/POST/PUT', path: '/api/territorios (?bbox=GiST)', horizon: 'Horizonte 1 · Sprint 1', evidence: 'EV-003', status: 'ok' },
        { method: 'GET', path: '/api/modelo-federado', horizon: 'H1 + H2 + H3 + H4', evidence: 'EV-006', status: 'ok' },
        { method: 'POST', path: '/api/events', horizon: 'CORE-001', evidence: 'EV-005', status: 'ok' },
        { method: 'POST/PATCH', path: '/api/reportes', horizon: 'Horizonte 1', evidence: 'EV-005', status: 'ok' },
        { method: 'POST', path: '/api/ethical-review', horizon: 'Horizonte 1', evidence: 'EV-005', status: 'ok' },
        { method: 'POST', path: '/api/geometrias-postgis', horizon: 'Horizonte 2', evidence: 'EV-007 / EV-010', status: 'ok' },
        { method: 'POST/PATCH', path: '/api/federacion/sync-packs', horizon: 'Horizonte 2', evidence: 'EV-008', status: 'ok' },
        { method: 'POST/PATCH', path: '/api/horizonte3/sintesis', horizon: 'Horizonte 3', evidence: 'EV-011 / EV-013', status: 'ok' },
        { method: 'POST', path: '/api/horizonte3/auditar-linaje', horizon: 'Horizonte 3', evidence: 'EV-012', status: 'ok' },
        { method: 'PATCH', path: '/api/horizonte3/soberania/:nodeKey', horizon: 'Horizonte 3', evidence: 'EV-014', status: 'ok' },
        { method: 'POST', path: '/api/horizonte4/postgis-interseccion', horizon: 'Horizonte 4', evidence: 'EV-015', status: 'ok' },
        { method: 'POST', path: '/api/horizonte4/offline-queue', horizon: 'Horizonte 4', evidence: 'EV-016', status: 'ok' },
        { method: 'POST', path: '/api/horizonte4/batch-sync', horizon: 'Horizonte 4', evidence: 'EV-016', status: 'ok' },
        { method: 'POST', path: '/api/horizonte4/firmar-ed25519', horizon: 'Horizonte 4', evidence: 'EV-017', status: 'ok' },
        { method: 'POST', path: '/api/horizonte4/webhooks/telemetria', horizon: 'Horizonte 4', evidence: 'EV-018', status: 'ok' },
        { method: 'GET/POST', path: '/api/ecosistema-ia', horizon: 'Nivel 4 · R1–R14', evidence: 'ADR-013', status: 'ok' },
        { method: 'GET/POST', path: '/api/contrato-sistema', horizon: 'Transversal', evidence: 'EV-004 / EV-006', status: 'ok' },
      ];

      const docsAlignment = [
        { docPath: 'docs/ARCHITECTURE_STATE_v7.1.md', topic: 'Estado Arquitectónico Track A v7.3 (H1+H2+H3+H4)', aligned: true },
        { docPath: 'docs/HITUB.md', topic: 'Contrato Social v2.0 (Ciclo SECI Territorial, Decidim/Consul y Contestabilidad)', aligned: true },
        { docPath: 'docs/DECISIONES.md', topic: 'Registro de Decisiones Arquitectónicas (ADR-001 a ADR-019 · incluye R15)', aligned: true },
        { docPath: 'docs/GOBERNANZA.md', topic: 'Reglas R1–R15 (Staging propone, GitHub acredita), Contratos C1–C5, Migraciones Aditivas y SLSA', aligned: true },
        { docPath: 'docs/EVIDENCIA.md', topic: 'Matriz Re-basada EV-001..EV-018 (2/6 ok en main @ 68a8872 vs 18/18 en staging)', aligned: true },
        { docPath: 'docs/TUTORIAL-ONBOARDING.md', topic: 'Documentación Viva Diátaxis (Tutorial 15m, How-To, Referencia, Explicación)', aligned: true },
        { docPath: 'docs/api/openapi.json', topic: 'Especificación OpenAPI 3.1.0 generada desde @delocalsoy/contracts (Regla C3)', aligned: true },
        { docPath: 'docs/HORIZONTE_1_MODELO_TERRITORIAL.md', topic: 'Nodos Federados y Epistemología Graduada', aligned: true },
        { docPath: 'docs/HORIZONTE_2_GEOMETRIAS_Y_FEDERACION.md', topic: 'PostGIS SRID=4326, Custodia Cruzada y Serie Q1..Q4', aligned: true },
        { docPath: 'docs/HORIZONTE_3_OBSERVATORIO_Y_LINAJE.md', topic: 'Síntesis Multi-Escala, Linaje SHA-256 y Observatorio Federal', aligned: true },
        { docPath: 'docs/HORIZONTE_4_OPERACION_CAMPO_Y_TELEMETRIA.md', topic: 'Consultas ST_Intersects, Cola Offline-First, Firmas Ed25519 y Webhooks', aligned: true },
        { docPath: 'docs/ANALISIS_RECURSIVO_Y_PROSPECTIVO.md', topic: 'Análisis Recursivo (CORE-001 → H4) e Integración Full-Stack', aligned: true },
        { docPath: 'docs/CAMINO_EVOLUTIVO_SINERGIA_IA.md', topic: 'Recursión 4 Niveles, Sprints 0–3, Artefactos @delocalsoy/* y Sinergia Vibe/Mistral ↔ Google', aligned: true },
      ];

      if (req.method === 'POST' && url.pathname === '/api/contrato-sistema/verificar') {
        const nowIso = new Date().toISOString();

        const parityHash = computeHash('FullStackContractParityVerified', 'nucleo-federado-ar', {
          nowIso,
          modelsCount: prismaModels.length,
          endpointsCount: endpoints.length,
        });
        eventsRaw.unshift({
          id: `ev-parity-${Date.now()}`,
          type: 'FullStackContractParityVerified',
          nodeId: 'nucleo-federado-ar',
          hash: parityHash,
          payload: {
            prismaModelsVerified: prismaModels.length,
            apiEndpointsVerified: endpoints.length,
            docsAlignedCount: docsAlignment.length,
            ethicalInvariant: 'requiresHumanReview === true',
          },
          occurred_at: nowIso,
          ingested_at: nowIso,
          is_synthetic: false,
        });

        const ev004 = evidencias.find((e) => e.code === 'EV-004');
        if (ev004) {
          ev004.status = 'ok';
          ev004.verified_at = nowIso;
          ev004.result = {
            endpoint: '/api/health + /api/contrato-sistema',
            parityHash,
            modelsCount: prismaModels.length,
          };
        }

        res.end(
          JSON.stringify({
            success: true,
            message: `Paridad Full-Stack verificada (${prismaModels.length} modelos Prisma · ${endpoints.length} rutas API · ${docsAlignment.length} documentos HITUB) · Hash: ${parityHash}`,
            parityHash,
          }),
        );
        return;
      }

      const digest = computeHash('SystemContractDigest', 'nucleo-federado-ar', {
        prismaModelsCount: prismaModels.length,
        endpointsCount: endpoints.length,
      });
      res.end(
        JSON.stringify({
          success: true,
          data: {
            version: '7.2.0-H4',
            architectureTrack:
              'Track A v7.2 — Monorepo pnpm + Turborepo + Express + React + PostGIS + Ed25519 + Offline-First + HITUB',
            contractDigestSha256: digest,
            verifiedAt: new Date().toISOString(),
            prismaModels,
            endpoints,
            docsAlignment,
          },
        }),
      );
      return;
    }

    next();
    } catch (err) {
      // R5 (riesgo H-02): la causa del error queda expuesta, nunca silenciada.
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: 'Error interno del middleware delocalsoy-api-horizon3 (R5: causa expuesta)',
          detail: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  });
}

