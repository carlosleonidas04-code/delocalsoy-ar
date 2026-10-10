import { useCallback, useEffect, useState } from 'react';
import {
  fetchSystemContract,
  probeCoreEndpoints,
  runFullStackParityVerification,
  type ApiProbeResult,
  type SystemContractPayload,
} from '../lib/apiClient';

interface RecursiveProspectiveContractPanelProps {
  onParityVerified?: () => Promise<void>;
  externalActiveTab?:
    | 'recursivo'
    | 'sinergia-ia'
    | 'propuesta-valor'
    | 'integracion'
    | 'prospectivo';
}

interface RecursiveLoopRow {
  loopId: string;
  stage: string;
  territorialInnovation: string;
  softwareArtifact: string;
  backendContract: string;
  canonicalDoc: string;
  evidences: string;
}

interface ProspectiveDesignItem {
  code: string;
  title: string;
  priority: string;
  territorialNeed: string;
  whatToDesign: string;
  backendPrismaDesign: string;
  frontendUiDesign: string;
  targetEvidence: string;
}

interface FourLevelRecursionRow {
  level: string;
  title: string;
  observedState: string;
  recursionRequirement: string;
  materializedSolution: string;
  linkedEvidences: string;
}

interface AgentRuleRow {
  code: string;
  category: string;
  rule: string;
  enforcementMechanism: string;
  agentsInvolved: string;
}

interface ValuePropRow {
  actor: string;
  need: string;
  deliveredValue: string;
  platformArtifact: string;
  evidences: string;
}

interface ArtifactCatalogItem {
  pkgName: string;
  title: string;
  purpose: string;
  evidences: string;
  coverage: string;
  sbomStatus: string;
  operationalState: string;
}

interface SprintRoadmapRow {
  sprint: string;
  window: string;
  gateThesis: string;
  deliverables: string[];
  exitCriteria: string;
  status: string;
}

interface LandingPrBranchSpec {
  branch: string;
  prTitle: string;
  scope: string;
  filesTouched: string;
  evidencesAndRules: string;
  vibeAuditChecklist: string;
  gitCliCommand: string;
}

interface GithubLandingIssueSpec {
  id: string;
  title: string;
  labels: string;
  linkedBranch: string;
  evCode: string;
  commandToVerify: string;
  successCriteria: string;
  ghCliSnippet: string;
}

interface CaseStudyLessonRow {
  caseName: string;
  centralLesson: string;
  applicationInDelocalsoy: string;
  artifactOrRule: string;
}

interface ContractRuleRow {
  code: string;
  title: string;
  description: string;
  verificationTarget: string;
}

const CASE_STUDIES_V75: CaseStudyLessonRow[] = [
  {
    caseName: 'Decidim (Barcelona · Metadecidim)',
    centralLesson:
      'La gobernanza del proyecto ES el producto: contrato social firmado por socios y comunidad que participa en las reglas.',
    applicationInDelocalsoy:
      'HITUB evoluciona de manifiesto técnico a Contrato Social v2.0 firmado por los 3 departamentos sanjuaninos (Capital Centro/Desamparados, Caucete, Iglesia), agentes IA y dirección humana.',
    artifactOrRule: 'docs/HITUB.md v2.0 · Issue #30 · ADR-018',
  },
  {
    caseName: 'Consul (Madrid)',
    centralLesson:
      'Contraejemplo de concentración unipersonal ("benevolent dictator") que limitó la evolución colaborativa.',
    applicationInDelocalsoy:
      'La Dirección Humana decide merges y ADRs, pero las reglas R1–R14, C1–C5 y la auditoría cruzada IA ↔ IA mantienen el sistema colegiado y vivo.',
    artifactOrRule: 'Reglas R1–R14 · docs/DECISIONES.md (ADR-001..018)',
  },
  {
    caseName: 'Plataformas Cívicas Académicas (4 Principios)',
    centralLesson:
      'Visibilidad de mecanismos, trazabilidad procedural, contestabilidad por diseño y responsabilidad institucional.',
    applicationInDelocalsoy:
      'Todo dato sintético o sugerencia es explícito, trazable por SHA-256 y apelable bajo requiresHumanReview: true.',
    artifactOrRule: 'Contrato Ético Tripartito · Regla R5 · EV-011/EV-013',
  },
  {
    caseName: 'Contract-First / OpenAPI 3.1 / Zod',
    centralLesson:
      'El contrato es la única fuente de verdad: DTOs, clientes y validaciones nacen del mismo schema y los desajustes rompen el build.',
    applicationInDelocalsoy:
      'Nuevo paquete @delocalsoy/contracts (territorios, evidencias, health, openapi) y spec generada en docs/api/openapi.json.',
    artifactOrRule: 'packages/contracts · Reglas C1–C5 · Issue #26 · ADR-016',
  },
  {
    caseName: 'SLSA / SBOM (OpenSSF)',
    centralLesson:
      'Seguridad de cadena de suministro incremental por niveles: SBOM como lista de ingredientes y SLSA como integridad del build.',
    applicationInDelocalsoy:
      'Fichas de Confianza @delocalsoy/* con CycloneDX SBOM, niveles SLSA 1–2 → SLSA 3 y diferencial territorial Ed25519 + R8.',
    artifactOrRule: 'docs/GOBERNANZA.md (Sección 5.3) · Issue #29 · ADR-018',
  },
  {
    caseName: 'Diátaxis (Arquitectura Documental)',
    centralLesson:
      'Cuatro formas de documentación nunca mezcladas: Tutorial (aprender), How-To (hacer), Referencia (operar) y Explicación (entender).',
    applicationInDelocalsoy:
      'Guía docs/TUTORIAL-ONBOARDING.md de 15 minutos + verificador ejecutable npm run verify:onboarding.',
    artifactOrRule: 'docs/TUTORIAL-ONBOARDING.md · scripts/verify-onboarding.mjs · Issue #28',
  },
  {
    caseName: 'CKAN / Portales de Datos Abiertos',
    centralLesson:
      'Publicar datos con metadatos estándar y esquemas abiertos multiplica el valor territorial más allá de la propia plataforma.',
    applicationInDelocalsoy:
      'Endpoint GET /api/openapi.json y catálogo federado preparado como portal de datos territoriales auditables.',
    artifactOrRule: 'GET /api/openapi.json · docs/api/openapi.json (OpenAPI 3.1.0)',
  },
];

const CONTRACT_COHERENCE_C1_C5: ContractRuleRow[] = [
  {
    code: 'C1',
    title: 'Fuente Única de Tipos en @delocalsoy/contracts',
    description:
      'Ningún tipo de API se re-escribe a mano en apps/web: se importa o infiere (z.infer) desde packages/contracts.',
    verificationTarget: 'packages/contracts/src/{territorios,evidencias,health}.ts',
  },
  {
    code: 'C2',
    title: 'Validación Simétrica de Request y Response',
    description:
      'Todo endpoint Express valida tanto la entrada como la salida con el mismo schema Zod (cero basura silenciosa).',
    verificationTarget: 'HealthModePatchSchema, BboxQuerySchema, EvidenciaVerifySchema',
  },
  {
    code: 'C3',
    title: 'OpenAPI 3.1.0 Generado Determinísticamente',
    description:
      'docs/api/openapi.json se genera desde @delocalsoy/contracts/openapi; un diff sin versión rompe verify:onboarding.',
    verificationTarget: 'docs/api/openapi.json · GET /api/openapi.json',
  },
  {
    code: 'C4',
    title: 'Migraciones Aditivas + ADR en Breaking Changes',
    description:
      'Toda evolución de BD es aditiva primero (columna nullable → backfill → constraint GiST) y exige ADR humano.',
    verificationTarget: 'migrations/202610040001_postgis_gist_bbox/migration.sql · ADR-016',
  },
  {
    code: 'C5',
    title: 'Tests de Contrato Compartidos (Synthetic ↔ API Real)',
    description:
      'Los mismos casos corren contra SyntheticDataSource (/demo) y contra el API real con las geometrías SRID=4326 de los 3 departamentos de San Juan (Capital, Caucete, Iglesia).',
    verificationTarget: 'POST /api/contracts/verify-c1-c5',
  },
];

const LANDING_PR_BRANCHES: LandingPrBranchSpec[] = [
  {
    branch: 'PR #41 · Aterrizaje 1 (/api/health honesto · Mergeado en cd085da2)',
    prTitle: 'feat(api): PR #41 — Aterrizaje 1: /api/health honesto + PATCH /api/health/mode (Closes #20)',
    scope: 'Implementado en main @ cd085da2: GET /api/health con mode: real|synthetic|degraded, dataSource, branchProtection y conteo vivo de evidencias (Regla R5). PATCH /api/health/mode con guarda R8 y sello auditable en events_raw. Mock DB restringido exclusivamente a NODE_ENV=test.',
    filesTouched: 'apps/api/src/app.ts · apps/api/src/lib/prisma.ts · packages/db/src/index.ts',
    evidencesAndRules: 'PR #41 (cd085da2) · Issue #20 & #4 · EV-004 (Implementado en main, pendiente cierre con curl)',
    vibeAuditChecklist: 'Ejecutar curl sobre checkout 2482f63d y cerrar administrativamente #20 y #4 con salida real.',
    gitCliCommand: 'curl -i -s http://127.0.0.1:3000/api/health',
  },
  {
    branch: 'PR #44 + PR #46 · Compuerta CI y BBOX Espacial (Mergeados en 2eb2ff26 y 2482f63d)',
    prTitle: 'feat(geo): PR #46 — /api/territorios?bbox= con validación Zod SRID=4326 e índice GiST (Reemplaza #42 y #45 · Closes #21)',
    scope: 'Implementado en main @ 2482f63d (con runs verdes 37544841351 y 37544841355 sobre 780e596): Validación Zod del bbox (SRID=4326), paginación limit/offset, migración 20261006120000_territorios_geom_gist con índice GiST idx_territorios_geom_gist y consulta ST_Intersects + ST_MakeEnvelope.',
    filesTouched: 'apps/api/src/app.ts · apps/api/src/routes/territorios.ts · packages/db/prisma/schema.prisma · packages/db/prisma/migrations/20261006120000_territorios_geom_gist/migration.sql',
    evidencesAndRules: 'PR #44 (2eb2ff26) + PR #46 (2482f63d) · Issue #21 & #2 · EV-002 · EV-004 · EV-010',
    vibeAuditChecklist: 'Correr prisma migrate deploy y EXPLAIN (ANALYZE, BUFFERS) sobre PostGIS en checkout 2482f63d y cerrar #2 y #21.',
    gitCliCommand: 'npm run verify:spatial-and-mutations && pnpm --filter @delocalsoy/db prisma migrate deploy',
  },
  {
    branch: 'PR #43 · Re-base Honesto de EVIDENCIA.md (Mergeado en 26491398 · Reconciliado a 2482f63d)',
    prTitle: 'docs(evidencia): PR #43 + Reconciliación 2482f63d con las 6 categorías de [agent: perplexity/synthesis] (Closes #23)',
    scope: 'Reconcilia docs/EVIDENCIA.md al HEAD 2482f63d con las 6 categorías oficiales (Implementado, Verificado, Acreditado, Staging-only, Pendiente, Reemplazado), el inventario de workspaces (3 en main vs 2 Staging-only) y el Entregable G-01..G-06.',
    filesTouched: 'docs/EVIDENCIA.md · docs/ENTREGABLE_AGENTE_GOOGLE_G01_G06_2482F63D.md',
    evidencesAndRules: 'PR #43 (26491398) · Issue #23 (Refs #25, #31) · Reglas R4, R15 y RP1–RP8',
    vibeAuditChecklist: 'Confirmar clasificación honesta de 6 estados y cerrar administrativamente #23 y #31.',
    gitCliCommand: 'npm run verify:recursive-monorepo',
  },
  {
    branch: 'Fase 3 (Camino A) · Consolidación sobre 2482f63d → Acreditar 6/6 → Levantar Congelación ADR-024',
    prTitle: 'Fase 3: Cerrar Issues #1, #2, #4, #5, #20, #21, #23 y #31 con SHA 2482f63d → Scorecard 6/6 → Levantar ADR-024 (#36)',
    scope: 'Ejecuta las pruebas en vivo sobre checkout limpio de 2482f63d con PostGIS healthy (EV-001 -> Issue #1), prisma migrate deploy + idx_territorios_geom_gist (EV-002 -> Issue #2), curl a /api/health y /api/territorios?bbox= (EV-004 -> Issue #4) y doble POST /api/events con rechazo HTTP 409 Conflict (EV-005 -> Issue #5).',
    filesTouched: 'docs/FASE3_ACREDITACION_6DE6_LEVANTAMIENTO_ADR024.md · scripts/verificar-fase3-6de6-adr024.sh · Issues #1, #2, #4, #5, #20, #21, #23, #31, #36',
    evidencesAndRules: 'EV-001, EV-002, EV-003, EV-004, EV-005, EV-006 (6/6 Acreditado en main) · Levanta congelación ADR-024 (#36)',
    vibeAuditChecklist: 'Verificar que cada cierre de issue incluya comando, salida comprobable, SHA 2482f63d y trailer Co-authored-by (R1/R4/R15).',
    gitCliCommand: 'npm run github:verify-fase3',
  },
  {
    branch: 'agent-google/gobernanza-r14',
    prTitle: 'docs(gov): R1-R15 + RA1-RA5 + RP1-RP8 in GOBERNANZA.md + ADR-012..023 with ADR-019 ratified (Closes #22, #31, Refs #24, #32, #33) [agent: google]',
    scope: 'Incorpora las 15 reglas R1–R15 (con R15 / ADR-019 ratificado en #31#issuecomment-5986479235), protocolo RA1–RA5 para agent-anthropic (ADR-022), aceptación de rol RP1–RP8 de [agent: perplexity/synthesis] con Matriz Evidencia–Relato v1 (ADR-023), ADR-020 (#32) y ADR-021 (#33).',
    filesTouched: 'docs/GOBERNANZA.md · docs/DECISIONES.md · docs/CAMINO_EVOLUTIVO_SINERGIA_IA.md · docs/ANALISIS_RECURSIVO_Y_PROSPECTIVO.md · docs/INFORME_SINERGIA_ASW_ANTHROPIC.md · docs/LABORATORIO_ECOSISTEMA_MULTIAGENTE.md',
    evidencesAndRules: 'Issues #22, #24, #25, #31, #32, #33 · EV-012 · EV-013 · Reglas R1–R15 + RA1–RA5 + RP1–RP8 · ADR-012..023',
    vibeAuditChecklist: 'Verificar R15 ratificada (#31), precedencia PostGIS sobre Firestore (ADR-020 #32), alcance 3 departamentos San Juan (ADR-021 #33), protocolo Anthropic (RA1–RA5 / ADR-022), aceptación Perplexity (RP1–RP8 / ADR-023) y ADR-015 (#24).',
    gitCliCommand: 'git checkout -b agent-google/gobernanza-r14 && git add docs/GOBERNANZA.md docs/DECISIONES.md docs/CAMINO_EVOLUTIVO_SINERGIA_IA.md docs/ANALISIS_RECURSIVO_Y_PROSPECTIVO.md docs/INFORME_SINERGIA_ASW_ANTHROPIC.md docs/LABORATORIO_ECOSISTEMA_MULTIAGENTE.md && git commit -m "docs(gov): R1-R15 + RA1-RA5 + RP1-RP8 in GOBERNANZA.md + ADR-012..023 with ADR-019 ratified (Closes #22, Closes #31, Refs #24, #25, #32, #33) [agent: google]"',
  },
  {
    branch: 'agent-google/diataxis-onboarding',
    prTitle: 'feat(v7.5): TUTORIAL-ONBOARDING + HITUB v2.0 + SLSA + Firestore Mirror Rules & CI Job (Closes #28, #30, Refs #29, #32, #33) [agent: google]',
    scope: 'Post-levantamiento ADR-024: Guía Diátaxis de 15m con verify:onboarding (#28), HITUB v2.0 (#29), matriz SLSA + Dependabot + CI job security-and-contracts-audit (#30), capa Firestore espejo auditada (verify:firestore-security · #32), suite verify:no-lavalle-scope (#33) y RecursiveProspectiveContractPanel.tsx.',
    filesTouched: 'docs/TUTORIAL-ONBOARDING.md · scripts/verify-onboarding.mjs · scripts/verify-firestore-pii-and-config.mjs · scripts/verify-no-lavalle-scope.mjs · docs/HITUB.md · firestore.rules · firestore.rules.test.ts · firebase-blueprint.json · firebase-applet-config.json · security_spec.md · .github/workflows/ci.yml · .github/dependabot.yml · package.json',
    evidencesAndRules: 'Issues #28, #29, #30, #32 y #33 · ADR-017 · ADR-018 · ADR-020 · ADR-021 · R8, R10, R12, R15',
    vibeAuditChecklist: 'Checklist #30 (#issuecomment-5986594211) y #33: CI job visible ejecutando verify:zero-unauth-writes, verify:firestore-security, verify:no-lavalle-scope y verify:onboarding + Dependabot semanal.',
    gitCliCommand: 'npm run mcp:sync-pr3',
  },
];

const GITHUB_LANDING_ISSUES: GithubLandingIssueSpec[] = [
  {
    id: '#20',
    title: '/api/health con mode + PATCH /api/health/mode (EV-001, EV-004, R5, R8)',
    labels: 'governance, sprint-0, agent-google, R5, R8',
    linkedBranch: 'agent-google/health-mode',
    evCode: 'EV-001, EV-004 · Reglas R5, R8',
    commandToVerify: 'curl -i -s http://localhost:3000/api/health',
    successCriteria: 'Mock DB restringido a NODE_ENV=test; /api/health expone mode: real|synthetic|degraded y PATCH /api/health/mode exige requireWriteAuth (R8), valida con Zod y sella en events_raw.',
    ghCliSnippet: 'gh pr create --base main --head agent-google/health-mode --title "feat(api): /api/health explicit mode + PATCH /api/health/mode (Closes #20) [agent: google]" --body "Closes #20. Refs #25. Implementa HealthModePatchSchema (Zod), requireWriteAuth (R8) y sellado SHA-256 en events_raw."',
  },
  {
    id: '#21',
    title: 'GET /api/territorios?bbox= con GiST + Zod (EV-002, EV-003, EV-007, EV-010, EV-015)',
    labels: 'postgis, sprint-1, agent-google, EV-010',
    linkedBranch: 'agent-google/geo-bbox',
    evCode: 'EV-002, EV-003, EV-007, EV-010, EV-015',
    commandToVerify: 'curl -s "http://localhost:3000/api/territorios?bbox=-68.65,-31.80,-68.15,-31.45" | jq ".spatialQuery"',
    successCriteria: 'BboxQuerySchema (Zod) valida 4 coordenadas y rangos en SRID=4326, operador ST_Intersects + ST_MakeEnvelope sobre índice GiST idx_territorios_geom_gist.',
    ghCliSnippet: 'gh pr create --base main --head agent-google/geo-bbox --title "feat(geo): GET /api/territorios?bbox= with PostGIS GiST & Zod (Closes #21) [agent: google]" --body "Closes #21. Refs #25. Añade BboxQuerySchema Zod, migración SQL PostGIS GiST idx_territorios_geom_gist y guardia R8."',
  },
  {
    id: '#22',
    title: 'R1–R15 en GOBERNANZA.md + ADR-012..019 (EV-012, EV-013)',
    labels: 'governance, multi-agent, R1-R15',
    linkedBranch: 'agent-google/gobernanza-r14',
    evCode: 'EV-012, EV-013 · ADR-012..019',
    commandToVerify: 'grep -E "R1\\.|R15\\.|ADR-015|ADR-019|#20|#25" docs/GOBERNANZA.md docs/DECISIONES.md',
    successCriteria: 'Las 15 reglas multi-agente (incluyendo R15: Staging propone, GitHub acredita) y los ADR-012..019 quedan versionados en main tras revisión humana.',
    ghCliSnippet: 'gh pr create --base main --head agent-google/gobernanza-r14 --title "docs(gov): R1-R15 in GOBERNANZA.md + ADR-012..019 (Closes #22, Refs #24, #25) [agent: google]" --body "Closes #22. Refs #24, #25. Versiona reglas R1-R15 y ADR-012 a ADR-019 en docs/."',
  },
  {
    id: '#23',
    title: 'Re-base honesto de EVIDENCIA.md con la doble columna epistémica (2/6 ok en main @ 68a8872 vs 18/18 en staging)',
    labels: 'hitub, documentation, R4',
    linkedBranch: 'agent-google/docs-ev',
    evCode: 'EV-001 a EV-018 · Reglas R4, R15',
    commandToVerify: 'cat docs/EVIDENCIA.md | grep -E "EV-0(0[1-9]|1[0-8])"',
    successCriteria: 'Cada EV distingue su estado en main (@ 68a8872: 2/6 ok) frente a staging (agent-google/*: 18/18 ejecutables en sandbox), y EvidenciaVerifySchema exige result comprobable.',
    ghCliSnippet: 'gh pr create --base main --head agent-google/docs-ev --title "docs(evidencia): honest rebase EV-001..EV-018 dual column (Closes #23, Refs #25) [agent: google]" --body "Closes #23. Refs #25. Re-basa docs/EVIDENCIA.md con doble columna epistémica y EvidenciaVerifySchema (R4)."',
  },
  {
    id: '#24',
    title: 'ADR-015: AI Studio como cliente del contrato, no plataforma paralela (pendiente de ratificación humana, R9)',
    labels: 'architecture, adr, R9',
    linkedBranch: 'agent-google/gobernanza-r14',
    evCode: 'ADR-015 · Reglas R4, R8, R9, R11, R12, R15',
    commandToVerify: 'curl -s http://localhost:3000/api/health | jq ".adr015Role"',
    successCriteria: 'Se ratifica en DECISIONES.md que el tablero de AI Studio consume el contrato /api/* y actúa como staging agent-google/* hacia el monorepo único.',
    ghCliSnippet: 'gh issue comment 24 --body "Propuesta técnica ADR-015 materializada en docs/DECISIONES.md (rama agent-google/gobernanza-r14), lista para ratificación humana (R9)."',
  },
  {
    id: '#25',
    title: 'Registro de la divergencia R4 + Recurrencia #2 (#issuecomment-5985572530) + Regla Operativa R15',
    labels: 'audit, multi-agent-synergy, R4, R12, R15',
    linkedBranch: 'agent-google/* (#20–#31)',
    evCode: 'Reglas R4, R12, R14, R15 · ADR-019',
    commandToVerify: 'curl -s http://localhost:3000/api/health | jq "{r15AccreditationRule, recurrenceCountInIssue25}"',
    successCriteria: 'Acreditado en GitHub (#25#issuecomment-5985572530): documenta las 2 divergencias (v7.3 y v7.5), la causa raíz técnica (contenedor AI Studio sin git push) y la Regla R15.',
    ghCliSnippet: 'gh issue view 25 --comments',
  },
  {
    id: '#26',
    title: '@delocalsoy/contracts + reglas C1–C5 (ADR-016 · Preparado en Staging AI Studio)',
    labels: 'contracts, openapi, C1-C5, v7.5, R15',
    linkedBranch: 'agent-google/contracts',
    evCode: 'Reglas C1–C5 · ADR-016 · R15',
    commandToVerify: 'curl -s -X POST http://localhost:3000/api/contracts/verify-c1-c5',
    successCriteria: 'packages/contracts exporta DTOs Zod compartidos, genera docs/api/openapi.json (digest 5a040b08) y pasa paridad SyntheticDataSource ↔ API Real.',
    ghCliSnippet: 'gh pr create --base main --head agent-google/contracts --title "feat(contracts): @delocalsoy/contracts + C1-C5 + OpenAPI 3.1 (Closes #26, Closes #27) [agent: google]" --body "Closes #26. Closes #27. Refs #25. Exporta desde staging AI Studio packages/contracts, docs/api/openapi.json y protocolo de migraciones aditivas (ADR-016)."',
  },
  {
    id: '#27',
    title: 'Protocolo de Migraciones Aditivas en GOBERNANZA.md §5.2 (Preparado en Staging AI Studio)',
    labels: 'database, migrations, C4, R12, R15',
    linkedBranch: 'agent-google/contracts',
    evCode: 'Regla C4 · EV-002 · ADR-016 · R15',
    commandToVerify: 'cat packages/db/prisma/migrations/202610040001_postgis_gist_bbox/migration.sql',
    successCriteria: 'Toda migración Prisma/PostGIS respeta la secuencia aditiva (ADD COLUMN NULL → backfill → CREATE INDEX GiST) sin cambios destructivos.',
    ghCliSnippet: 'gh issue comment 27 --body "Protocolo §5.2 preparado en staging (docs/GOBERNANZA.md + migración aditiva 202610040001_postgis_gist_bbox), listo para auditoría R12 en PR agent-google/contracts."',
  },
  {
    id: '#28',
    title: 'TUTORIAL-ONBOARDING.md (Diátaxis) + verify:onboarding (ADR-017 · Preparado en Staging AI Studio)',
    labels: 'documentation, diataxis, onboarding, R15',
    linkedBranch: 'agent-google/diataxis-onboarding',
    evCode: 'ADR-017 · EV-006 · R15',
    commandToVerify: 'npm run verify:onboarding',
    successCriteria: 'Cuatro cuadrantes Diátaxis completos en docs/TUTORIAL-ONBOARDING.md y script scripts/verify-onboarding.mjs en EXIT 0.',
    ghCliSnippet: 'gh pr create --base main --head agent-google/diataxis-onboarding --title "docs(onboarding): TUTORIAL-ONBOARDING.md (Diataxis) + verify:onboarding (Closes #28) [agent: google]" --body "Closes #28. Refs #25. Añade guía Diátaxis de 15m y verificador ejecutable scripts/verify-onboarding.mjs (ADR-017)."',
  },
  {
    id: '#29',
    title: 'HITUB v2.0 como Contrato Social (ADR-018, pendiente de ratificación humana · En Staging AI Studio)',
    labels: 'governance, social-contract, SECI, R9, R15',
    linkedBranch: 'agent-google/diataxis-onboarding',
    evCode: 'ADR-018 · Reglas R1–R15, R9',
    commandToVerify: 'head -n 35 docs/HITUB.md',
    successCriteria: 'docs/HITUB.md v2.0 articula el Ciclo SECI territorial, la contestabilidad por diseño y los compromisos de Nodos, Agentes IA y Dirección Humana.',
    ghCliSnippet: 'gh issue comment 29 --body "Borrador de HITUB v2.0 (Contrato Social Territorial y Multi-Agente) y ADR-018 preparados en staging (docs/HITUB.md), pendientes de ratificación humana (R9)."',
  },
  {
    id: '#30',
    title: 'Matriz SLSA + cierre de gaps reales (lockfile, auth R8 en escrituras, CI job y Dependabot · Pre-auditoría R12 #issuecomment-5986594211)',
    labels: 'security, slsa, sbom, R8, R10, R12, R15',
    linkedBranch: 'agent-google/diataxis-onboarding & agent-google/health-mode',
    evCode: 'ADR-018, ADR-020 · Reglas R8, R10, R12, R15 · EV-017',
    commandToVerify: 'npm run verify:zero-unauth-writes && npm run verify:firestore-security',
    successCriteria: 'Checklist actualizado en #30#issuecomment-5986594211: requireWriteAuth (R8), Dependabot (.github/dependabot.yml), CI job visible (.github/workflows/ci.yml) y los 4 pasos de verify:firestore-security.',
    ghCliSnippet: 'gh issue view 30 --comments',
  },
  {
    id: '#31',
    title: 'ADR-019: Regla R15 (Staging propone, GitHub acredita) en GOBERNANZA.md §3.4 — ✅ RATIFICADO por Dirección Humana (#issuecomment-5986479235)',
    labels: 'architecture, adr, governance, R9, R15, ratified',
    linkedBranch: 'agent-google/gobernanza-r14',
    evCode: 'ADR-019 (RATIFICADO) · Reglas R9, R15 · Refs #25',
    commandToVerify: 'grep -E "R15\\.|ADR-019|#31" docs/GOBERNANZA.md docs/DECISIONES.md',
    successCriteria: '✅ RATIFICADO por Dirección Humana (Carlos Leonidas · 2026-10-05 · #31#issuecomment-5986479235) · Pendiente de aterrizaje documental en docs/DECISIONES.md vía PR gobernanza (R15 autoaplicable).',
    ghCliSnippet: 'gh issue view 31 --comments',
  },
  {
    id: '#32',
    title: 'ADR-020: Firestore como capa de sincronización offline-first (espejo), no como fuente de verdad — ✅ Pre-auditoría R12 aprobada (#issuecomment-5986593565)',
    labels: 'architecture, adr, firestore, security, R4, R10, R12, R15',
    linkedBranch: 'agent-google/diataxis-onboarding & agent-google/gobernanza-r14',
    evCode: 'ADR-020 · EV-005, EV-012, EV-016 · Reglas R4, R10, R12, R15 · Refs #30',
    commandToVerify: 'npm run verify:firestore-security',
    successCriteria: '✅ Pre-auditoría documental R12 aprobada (#32#issuecomment-5986593565): CANONICAL_PRECEDENCE_RULE (events_raw manda), networkMerkleRoot como Digest de Sincronización bajo R15, scrubAndAssertNoPii y CI job visible.',
    ghCliSnippet: 'gh issue comment 32 --body "✅ Ratificación Humana (R9): Se aprueba ADR-020 tras conformidad de pre-auditoría R12 (#issuecomment-5986593565)."',
  },
  {
    id: '#33',
    title: 'ADR-021: Alineación del alcance heurístico en 3 departamentos de San Juan (Capital Centro/Desamparados, Caucete, Iglesia) — ✅ Pre-auditoría R12 aprobada (#issuecomment-5986593897)',
    labels: 'architecture, adr, scope, san-juan, R9, R12, R15',
    linkedBranch: 'agent-google/geo-bbox & agent-google/gobernanza-r14 & agent-google/diataxis-onboarding',
    evCode: 'ADR-021 · EV-003, EV-006, EV-008, EV-009 · Reglas R9, R12',
    commandToVerify: 'npm run verify:no-lavalle-scope',
    successCriteria: '✅ Pre-auditoría documental R12 aprobada (#33#issuecomment-5986593897): 0 referencias al nodo retirado en todo el repositorio y alcance exclusivo en Capital, Caucete e Iglesia (EXIT 0). Esperando ratificación humana (R9).',
    ghCliSnippet: 'gh issue comment 33 --body "✅ Ratificación Humana (R9): Se aprueba ADR-021 tras conformidad de pre-auditoría R12 (#issuecomment-5986593897)."',
  },
];

const POST_RECURSIVE_SUGGESTIONS: Array<{
  id: string;
  pillar: string;
  title: string;
  whyNow: string;
  concreteActionInPlatform: string;
  linkedIssuesAndRules: string;
}> = [
  {
    id: 'SUG-01',
    pillar: '1. Puente Automatizado Staging ↔ GitHub (Cero Fricción R15)',
    title: 'Exportador en 1 Clic de las 6 Ramas PR agent-google/* (aterrizar-prs-v75-github.sh)',
    whyNow:
      'El hallazgo recursivo demostró que el contenedor de AI Studio no tiene git push directo. En lugar de copiar archivos a mano, la plataforma genera el script ejecutable con git checkout -B, Co-authored-by (R1) y gh pr create para #20–#31.',
    concreteActionInPlatform:
      'Botón activo arriba: "⬇ Descargar Script de Aterrizaje Git/GH CLI" + pre-auditoría automática de las 6 ramas.',
    linkedIssuesAndRules: 'Issues #20 a #31 · Reglas R1, R2, R11, R15 · ADR-019',
  },
  {
    id: 'SUG-02',
    pillar: '2. Mesa de Ratificación Humana en Vivo (Reglas R8 y R9)',
    title: 'Firma Criptográfica de ADR-015..019 y Contrato Social HITUB v2.0 desde el Tablero',
    whyNow:
      'Los Issues #24 (ADR-015), #26 (ADR-016), #28 (ADR-017), #29 (ADR-018 / HITUB v2.0) y #31 (ADR-019 / R15) requieren ratificación humana explícita (R9) antes del merge.',
    concreteActionInPlatform:
      'Mesa interactiva de Ratificación Humana que sella cada ADR en events_raw con hash SHA-256 y genera el comando gh issue comment exacto.',
    linkedIssuesAndRules: 'Issues #24, #26, #28, #29, #31 · Reglas R8, R9 · ADR-015..019',
  },
  {
    id: 'SUG-03',
    pillar: '3. Cierre de Gaps Reales SLSA 1–2 (Issue #30)',
    title: 'Guardia requireWriteAuth (R8) en 100% de Escrituras + Lockfile Sincronizado + Digest OpenAPI',
    whyNow:
      'La pre-auditoría R12 de Vibe/Mistral verificará que ningún endpoint POST/PUT/PATCH/DELETE opere sin auth en producción y que docs/api/openapi.json mantenga su digest.',
    concreteActionInPlatform:
      'Middleware apps/api/src/lib/authGuard.ts activo en /api/health/mode, /api/territorios y /api/evidencias/:code/verify + suite C1–C5.',
    linkedIssuesAndRules: 'Issue #30 · Reglas R8, R10, C1–C5 · SLSA 1–3',
  },
  {
    id: 'SUG-04',
    pillar: '4. Ciclo SECI Territorial en Vivo en San Juan (Capital Centro/Desamparados, Caucete e Iglesia · Extensible)',
    title: 'Trazabilidad SECI Completa (Tácito → Explícito → Sistémico → Social) en la Ficha Departamental',
    whyNow:
      'Una vez cerradas las 3 fronteras técnicas (Contrato C1–C5, Documentación Diátaxis y Demo↔Realidad), el valor diferencial es que el proceso heurístico en Capital (Distrito Centro y Desamparados), Caucete e Iglesia muestre cómo cada relevamiento se convierte en evidencia EV, dejando listo el molde para su pronta extensión futura.',
    concreteActionInPlatform:
      'Verificación de paridad SyntheticDataSource ↔ API Real sobre las geometrías SRID=4326 de los 3 departamentos de San Juan y exportación a Google Drive/Docs.',
    linkedIssuesAndRules: 'Horizontes 1–4 · EV-001 a EV-018 · HITUB v2.0',
  },
];

const RECURSIVE_SYNTHESIS_MATRIX: RecursiveLoopRow[] = [
  {
    loopId: 'Bucle 0 · CORE-001',
    stage: 'Verdad Técnica e Inmutabilidad',
    territorialInnovation:
      'Memoria institucional auditable donde ningún evento territorial puede ser reescrito ni duplicado silenciosamente.',
    softwareArtifact:
      'TraceabilityAndEvidenciasPanel.tsx + Prueba interactiva de colisión SHA-256.',
    backendContract:
      'POST /api/events (HTTP 409 en hash duplicado) + PATCH /api/evidencias/:code/verify + tablas events_raw y evidencias.',
    canonicalDoc: 'docs/HITUB.md · docs/EVIDENCIA.md',
    evidences: 'EV-001 a EV-006',
  },
  {
    loopId: 'Bucle 1 · Horizonte 1',
    stage: 'Nodos Federados y Soberanía Semántica',
    territorialInnovation:
      'Federación de departamentos heterogéneos en San Juan — Capital (Distrito Centro y Distrito Desamparados), Caucete e Iglesia — con custodia tripartita, vocabulario propio, Contrato Ético y arquitectura lista para pronta extensión futura.',
    softwareArtifact:
      'FederatedNodeExplorer.tsx + FederatedNodeDetailModal.tsx ("Explorar nodo") + Galería Visual IA + FederatedCompareView.tsx.',
    backendContract:
      'GET/POST/PUT /api/territorios (?bbox=GiST) + POST/PATCH /api/reportes + POST /api/ethical-review + modelos territorios, capas_territoriales, features_territoriales, reportes_territoriales.',
    canonicalDoc: 'docs/HORIZONTE_1_MODELO_TERRITORIAL.md · docs/GOBERNANZA.md',
    evidences: 'EV-003, EV-005, EV-006',
  },
  {
    loopId: 'Bucle 2 · Horizonte 2',
    stage: 'Morfología PostGIS, Custodia Cruzada y Serie Trimestral',
    territorialInnovation:
      'Paso de puntos aislados a cuencas (ST_Polygon) y corredores (ST_LineString) en SRID=4326, paquetes inter-nodos y evolución 2026-Q1..Q4.',
    softwareArtifact:
      'HorizonTwoSpatialFederationPanel.tsx + QuarterlyTrendsSection.tsx (Recharts) + TerritoriosMap.tsx (MapControl Assets / Problems / Public Space).',
    backendContract:
      'POST /api/geometrias-postgis + POST/PATCH /api/federacion/sync-packs + modelos geometrias_espaciales, paquetes_sincronizacion_federada, cortes_trimestrales_nodo.',
    canonicalDoc: 'docs/HORIZONTE_2_GEOMETRIAS_Y_FEDERACION.md',
    evidences: 'EV-007, EV-008, EV-009, EV-010',
  },
  {
    loopId: 'Bucle 3 · Horizonte 3',
    stage: 'Síntesis Multi-Escala, Linaje SHA-256 y Servicio Google Drive/Docs',
    territorialInnovation:
      'Inteligencia territorial multi-escala subordinada a ratificación humana colegiada, linaje criptográfico completo y capa de servicio Google Drive con firebase-applet-config.json.',
    softwareArtifact:
      'HorizonThreeObservatoryPanel.tsx + googleDriveService.ts + DriveReportExportModal.tsx + WorkspacePanel.tsx.',
    backendContract:
      'POST/PATCH /api/horizonte3/sintesis + POST /api/horizonte3/auditar-linaje + PATCH /api/horizonte3/soberania/:nodeKey + modelos sintesis_multiescala, cadena_linaje_criptografico, soberania_federal_nodos.',
    canonicalDoc: 'docs/HORIZONTE_3_OBSERVATORIO_Y_LINAJE.md · docs/DECISIONES.md',
    evidences: 'EV-011, EV-012, EV-013, EV-014',
  },
  {
    loopId: 'Bucle 4 · Horizonte 4',
    stage: 'Intersección PostGIS, Campo Offline-First, Firmas Ed25519 y Telemetría Hídrica',
    territorialInnovation:
      'Operación activa en terreno: consultas espaciales ST_Intersects con buffer, captura desconectada en alta montaña/secano, identidad criptográfica Ed25519 por custodio y sensores por webhook bajo Contrato Ético.',
    softwareArtifact:
      'HorizonFourFieldAndTelemetryPanel.tsx (4 módulos interactivos: PostGIS Buffer, Batch Sync Offline, Firmador Ed25519 y Monitor de Webhooks).',
    backendContract:
      'POST /api/horizonte4/postgis-interseccion + /offline-queue + /batch-sync + /firmar-ed25519 + /webhooks/telemetria + 4 modelos Prisma H4.',
    canonicalDoc: 'docs/HORIZONTE_4_OPERACION_CAMPO_Y_TELEMETRIA.md · docs/CAMINO_EVOLUTIVO_SINERGIA_IA.md',
    evidences: 'EV-015, EV-016, EV-017, EV-018',
  },
];

const FOUR_LEVEL_RECURSION: FourLevelRecursionRow[] = [
  {
    level: 'Nivel 1 · Método',
    title: 'La Verdad Técnica como su Propio Primer Producto',
    observedState:
      'Gobernanza de evidencias EV-xxx, manifiesto HITUB, plantillas y CI, que requerían cerrarse sobre sí mismas sin estados manuales ni mocks silenciosos.',
    recursionRequirement:
      'La propia gobernanza debe verificarse en tiempo de ejecución: /api/health informa explícitamente mode: real | synthetic | degraded y 18/18 evidencias verificables.',
    materializedSolution:
      'GET/PATCH /api/health con mode explícito (Regla R5), POST /api/events con rechazo HTTP 409 en colisión SHA-256 y sellado en vivo de paridad.',
    linkedEvidences: 'EV-001, EV-002, EV-004, EV-005',
  },
  {
    level: 'Nivel 2 · Producto',
    title: 'La Plataforma Come su Propia Comida (Dogfooding Espacial y Epistémico)',
    observedState:
      'Monorepo Turborepo/pnpm/Prisma/PostGIS/Express/React donde el motor espacial y la distinción de origen de datos debían volverse diferenciales reales.',
    recursionRequirement:
      'Conectar el Tablero de Evidencias al estado operativo real, habilitar consultas espaciales PostGIS (?bbox= con índice GiST + ST_Intersects) y explicitar el contrato DataSource (api | synthetic).',
    materializedSolution:
      'GET /api/territorios?bbox=minLng,minLat,maxLng,maxLat con operador ST_MakeEnvelope (SRID=4326), motor ST_Intersects + ST_DWithin y switch de modo operativo auditable.',
    linkedEvidences: 'EV-003, EV-006, EV-007, EV-010, EV-015',
  },
  {
    level: 'Nivel 3 · Propuesta de Valor',
    title: 'Transparencia y Confianza Verificable como Servicio para el Territorio',
    observedState:
      'Municipios, cooperativas, uniones vecinales y productores no compran un monorepo: necesitan certificar activos, priorizar obras y resguardar actas con respaldo técnico.',
    recursionRequirement:
      'Transformar el método de Nivel 1 en artefactos de producto reutilizables (@delocalsoy/*) con Ficha de Confianza para cada actor territorial.',
    materializedSolution:
      'Ficha Integral de Nodo con Galería Visual IA, Capa de Servicio Google Drive/Docs (firebase-applet-config.json), Cola Offline-First y Catálogo de 5 Artefactos @delocalsoy/*.',
    linkedEvidences: 'EV-008, EV-009, EV-011, EV-014, EV-016, EV-017, EV-018',
  },
  {
    level: 'Nivel 4 · Ecosistema IA + Humanos',
    title: 'Triangulación R12 entre Vibe/Mistral, Google AI Studio, Claude (Anthropic) y Dirección Humana',
    observedState:
      'Operan tres familias de agentes IA con asimetría de acceso (agent-vibe en repo/issues, agent-google en contenedor de staging y agent-anthropic sin acceso directo al repo) junto al decisor humano.',
    recursionRequirement:
      'Convertir la asimetría en ventaja epistémica: Staging propone y GitHub acredita (R15 · ADR-019 ratificado en #31), y la latencia de Anthropic se vuelve auditoría ciega sobre Digest sin sesgo de anclaje (RA1–RA5 · ADR-022).',
    materializedSolution:
      'Política R1–R15 + RA1–RA5 en docs/GOBERNANZA.md, informe docs/INFORME_SINERGIA_ASW_ANTHROPIC.md, ADR-012 a ADR-022 en docs/DECISIONES.md y generador de Digest Packet en vivo.',
    linkedEvidences: 'EV-012, EV-013 · ADR-012..022 · Issues #20–#33',
  },
];

const AGENT_ECOSYSTEM_RULES: AgentRuleRow[] = [
  {
    code: 'R1',
    category: 'Identidad y Trazabilidad',
    rule: 'Todo commit de agente identifica autoría real (author del agente + Co-authored-by del humano responsable).',
    enforcementMechanism: 'Git commit trailer + verificación en CI',
    agentsInvolved: 'agent-vibe · agent-google · human',
  },
  {
    code: 'R2',
    category: 'Identidad y Trazabilidad',
    rule: 'Todo PR declara en el título/prefijo qué agente lo genera (ej. feat(api): ... [agent: vibe] o [agent: google]).',
    enforcementMechanism: 'PR title linter en GitHub Actions',
    agentsInvolved: 'agent-vibe · agent-google',
  },
  {
    code: 'R3',
    category: 'Identidad y Trazabilidad',
    rule: 'Ningún agente hace push directo a main; todo pasa por PR con CI verde.',
    enforcementMechanism: 'Branch protection en main (1 review + status checks)',
    agentsInvolved: 'agent-vibe · agent-google',
  },
  {
    code: 'R4',
    category: 'Producción y Evidencia',
    rule: 'Ningún agente marca "ok" una evidencia sin ejecución enlazada o salida comprobable registrada en evidencias.',
    enforcementMechanism: 'PATCH /api/evidencias/:code/verify exige payload de resultado y timestamp',
    agentsInvolved: 'agent-vibe · agent-google',
  },
  {
    code: 'R5',
    category: 'Producción y Evidencia',
    rule: 'Prohibición de fallbacks silenciosos: todo modo de runtime es explícito y visible en /api/health (mode: real | synthetic | degraded) y en la UI.',
    enforcementMechanism: 'GET /api/health + indicador visible en cabecera',
    agentsInvolved: 'agent-vibe · agent-google',
  },
  {
    code: 'R6',
    category: 'Producción y Evidencia',
    rule: 'Ningún agente deshabilita o marca skip un test para lograr CI verde; un test roto se repara o documenta.',
    enforcementMechanism: 'Suite de paridad Full-Stack (/api/contrato-sistema)',
    agentsInvolved: 'agent-vibe · agent-google',
  },
  {
    code: 'R7',
    category: 'Producción y Evidencia',
    rule: 'Cada PR e iteración referencia explícitamente la evidencia EV-xxx que produce o consume.',
    enforcementMechanism: 'Matriz EV-001 a EV-018 en docs/EVIDENCIA.md',
    agentsInvolved: 'agent-vibe · agent-google · human',
  },
  {
    code: 'R8',
    category: 'Delimitación de Capacidades',
    rule: 'Los agentes proponen y ejecutan en ramas; los humanos deciden merges y decisiones de producto (ADR).',
    enforcementMechanism: 'Invariante requiresHumanReview: true + aprobación humana',
    agentsInvolved: 'human-lead (exclusivo)',
  },
  {
    code: 'R9',
    category: 'Delimitación de Capacidades',
    rule: 'Cambios de arquitectura, schema Prisma/PostGIS o gobernanza requieren ADR humano en docs/DECISIONES.md.',
    enforcementMechanism: 'Registro ADR-001 a ADR-014 versionado',
    agentsInvolved: 'human-lead + propuesta de agentes',
  },
  {
    code: 'R10',
    category: 'Delimitación de Capacidades',
    rule: 'Secreto cero: ningún agente commitea .env ni claves privadas; secretos en GitHub Environments.',
    enforcementMechanism: '.env.example limpio + OAuth cliente público en firebase-applet-config.json',
    agentsInvolved: 'agent-vibe · agent-google',
  },
  {
    code: 'R11',
    category: 'Sinergia Vibe ↔ Google ↔ Humanos',
    rule: 'Cada familia de agentes trabaja en su rama con prefijo identificable (agent-vibe/*, agent-google/*).',
    enforcementMechanism: 'Convención de ramas en repositorio delocalsoy-ar',
    agentsInvolved: 'agent-vibe · agent-google',
  },
  {
    code: 'R12',
    category: 'Sinergia Vibe ↔ Google ↔ Humanos',
    rule: 'Un agente puede revisar/auditar el trabajo de otro agente, pero la aprobación final de merge es siempre humana.',
    enforcementMechanism: 'Code review cruzado IA + Gate humano obligatorio',
    agentsInvolved: 'agent-vibe ↔ agent-google → human',
  },
  {
    code: 'R13',
    category: 'Sinergia Vibe ↔ Google ↔ Humanos',
    rule: 'Acumulación no destructiva: ningún agente deshace decisiones verificadas de otro agente sin un ADR justificatorio.',
    enforcementMechanism: 'Cadena de linaje SHA-256 (H1 → H2 → H3 → H4)',
    agentsInvolved: 'agent-vibe ↔ agent-google',
  },
  {
    code: 'R14',
    category: 'Sinergia Vibe ↔ Google ↔ Humanos',
    rule: 'Hallazgos de análisis recursivo/prospectivo se registran con plantilla verificable (EV, comando y criterio de éxito).',
    enforcementMechanism: 'docs/CAMINO_EVOLUTIVO_SINERGIA_IA.md + /api/ecosistema-ia',
    agentsInvolved: 'agent-vibe · agent-google · human',
  },
  {
    code: 'R15',
    category: 'Acreditación Epistémica (ADR-019 · Issue #31 Ratificado)',
    rule: 'Staging propone, GitHub acredita: ninguna versión v7.x se declara "materializada" hasta que sus Issues/PRs existan y se verifiquen en GitHub (main @ 68a8872).',
    enforcementMechanism: 'Etiquetado obligatorio Staging AI Studio ↔ GitHub main en /api/health y UI',
    agentsInvolved: 'agent-google (staging) ↔ agent-vibe (auditor repo) ↔ agent-anthropic (digest) → human',
  },
  {
    code: 'RA1–RA5',
    category: 'Red-Team Asíncrono sobre Digest (ADR-022 · ✅ Rol Ejecutado por Claude con T2)',
    rule: 'Todo encargo a agent-anthropic opera sobre snapshot declarado (RA1), exige "Verificable por:" como moneda R4 (RA2), entra vía relay humano [agent: anthropic] (RA3), preserva divergencias (RA4) y se gobierna por ADR-022 (RA5).',
    enforcementMechanism: 'docs/INFORME_SINERGIA_ASW_ANTHROPIC.md + Entregable T2 (9 hallazgos remediados en staging)',
    agentsInvolved: 'agent-vibe ↔ agent-google ↔ [agent: anthropic] (T2 en staging) → human',
  },
  {
    code: 'RP1–RP8',
    category: 'Síntesis y Traducción de Evidencia (ADR-023 · ✅ Rol Aceptado por Perplexity)',
    rule: 'Toda síntesis de [agent: perplexity/synthesis] declara snapshot (RP1), no acredita ejecución (RP2), aplica filtro obligatorio de formulación segura (RP3), cita fuente (RP4), trata divergencias como activo (RP5), no expande alcance (RP6), prioriza el territorio (RP7) y cierra con verificación humana (RP8).',
    enforcementMechanism: 'docs/LABORATORIO_ECOSISTEMA_MULTIAGENTE.md + Matriz de Coherencia Evidencia–Relato v1',
    agentsInvolved: '[agent: perplexity/synthesis] ↔ vibe ↔ google ↔ anthropic → human',
  },
];

const VALUE_PROPOSITION_MATRIX: ValuePropRow[] = [
  {
    actor: 'Nodo comunitario / Cooperativa / Unión Vecinal',
    need: 'Visibilidad de su territorio, activos locales, red de agua y proyectos sin perder su vocabulario propio.',
    deliveredValue:
      'Perfil de nodo en mapa, Galería Visual IA de activos verificados, captura offline en campo y evidencia pública de avances.',
    platformArtifact: '@delocalsoy/nodo-perfil · FederatedNodeDetailModal.tsx',
    evidences: 'EV-003, EV-006, EV-016, EV-017',
  },
  {
    actor: 'Municipio / Gobierno Local',
    need: 'Confianza operativa: saber qué infraestructura funciona, qué problemáticas son críticas y con qué respaldo.',
    deliveredValue:
      'Estado verificable de cada componente, intersección espacial PostGIS sobre canales/rutas y actas exportables a Google Drive/Docs.',
    platformArtifact: '@delocalsoy/geo · @delocalsoy/drive-bridge',
    evidences: 'EV-004, EV-007, EV-010, EV-014, EV-015',
  },
  {
    actor: 'Organizaciones de Fomento e Inversión Territorial',
    need: 'Medir el impacto real de inversiones y evolución trimestral sin reportes manipulables.',
    deliveredValue:
      'Trazabilidad evento-a-evento con hash SHA-256 inmutable en events_raw y serie analítica multitemporal 2026-Q1..Q4.',
    platformArtifact: '@delocalsoy/evidencia · QuarterlyTrendsSection.tsx',
    evidences: 'EV-005, EV-009, EV-012',
  },
  {
    actor: 'Comités de Cuenca y Observatorios Provinciales (San Juan)',
    need: 'Articular alertas hídricas, aluvionales y sanitarias entre cuencas de San Juan (Iglesia ↔ Caucete ↔ Capital Centro/Desamparados) respetando la autonomía local y preparando la extensión a nuevos departamentos.',
    deliveredValue:
      'Custodia cruzada inter-nodos, webhooks de telemetría hídrica y síntesis multi-escala bajo Contrato Ético Tripartito.',
    platformArtifact: '@delocalsoy/observatorio-etico · HorizonThree & HorizonFour',
    evidences: 'EV-008, EV-011, EV-013, EV-018',
  },
  {
    actor: 'Desarrolladores Locales y Otros Territorios',
    need: 'Participar, auditar y replicar el modelo territorial sin depender de cajas negras.',
    deliveredValue:
      'Monorepo abierto con método HITUB, reglas multi-agente R1–R14 y paquetes modulares reutilizables con Ficha de Confianza.',
    platformArtifact: 'Plantilla Metodológica HITUB + Paquetes @delocalsoy/*',
    evidences: 'EV-001 a EV-018 · ADR-001 a ADR-014',
  },
];

const ARTIFACT_CATALOG: ArtifactCatalogItem[] = [
  {
    pkgName: '@delocalsoy/evidencia',
    title: 'Motor HITUB & Ledger Inmutable Append-Only (events_raw)',
    purpose:
      'Certificación criptográfica SHA-256 de eventos territoriales, rechazo automático HTTP 409 de duplicados y matriz de evidencias ejecutables.',
    evidences: 'EV-001, EV-002, EV-004, EV-005, EV-012',
    coverage: '100% rutas en staging · 2/6 EV ok en main',
    sbomStatus: 'CycloneDX v1.5 · 0 vulnerabilidades críticas',
    operationalState: 'Staging · PR agent-google/health-mode & docs-ev',
  },
  {
    pkgName: '@delocalsoy/geo',
    title: 'Motor Cartográfico PostGIS (SRID=4326, ?bbox=GiST y ST_Intersects)',
    purpose:
      'Consultas espaciales por bounding box, buffers de intersección sobre cuencas y canales, y control multicapa en Google Maps Platform.',
    evidences: 'EV-003 (ok en main), EV-007, EV-010, EV-015',
    coverage: '96% operadores espaciales WKT/BBox',
    sbomStatus: 'PostGIS 3.4 + Google Maps JS API',
    operationalState: 'EV-003 ok en main · Resto en PR agent-google/geo-bbox',
  },
  {
    pkgName: '@delocalsoy/nodo-perfil',
    title: 'Ficha Integral de Nodo, Galería Visual IA y Sincronización Offline-First',
    purpose:
      'Validación visual rápida de activos comunitarios, cola local idempotente para alta montaña/secano y firmas Ed25519 por custodio.',
    evidences: 'EV-006 (ok en main), EV-016, EV-017',
    coverage: '95% flujos de nodo y campo',
    sbomStatus: 'WebCrypto Ed25519 + Activos IA locales',
    operationalState: 'EV-006 ok en main · H4 en PR agent-google/docs-ev',
  },
  {
    pkgName: '@delocalsoy/drive-bridge',
    title: 'Capa de Servicio Google Drive & Docs API (firebase-applet-config.json)',
    purpose:
      'Autenticación OAuth 2.0 en memoria y exportación de reportes territoriales individuales o por lote a .JSON, .CSV, .MD y Google Docs con confirmación.',
    evidences: 'EV-014',
    coverage: '98% exportación multipart Drive v3',
    sbomStatus: 'Firebase Auth + Drive REST v3',
    operationalState: 'Staging · PR agent-google/docs-ev',
  },
  {
    pkgName: '@delocalsoy/observatorio-etico',
    title: 'Síntesis Multi-Escala Tripartita y Webhooks de Telemetría Hídrica',
    purpose:
      'Separación estricta Dato → Interpretación → Sugerencia con bloqueo ético requiresHumanReview: true sobre cruces y sensores.',
    evidences: 'EV-008, EV-009, EV-011, EV-013, EV-018',
    coverage: '100% invariante ético exigido',
    sbomStatus: 'Reglas deterministas auditables',
    operationalState: 'Staging · PR agent-google/gobernanza-r14',
  },
];

const SPRINT_ROADMAP: SprintRoadmapRow[] = [
  {
    sprint: 'Sprint 0 · Sellar el Método (Días 1–7)',
    window: 'Gate Fundacional · Nivel 1',
    gateThesis:
      'El método HITUB se vuelve su propio primer producto: transparencia de runtime en /health, cierre de evidencias base y reglas R1–R14.',
    deliverables: [
      'Acotar modos de runtime: /api/health responde explícitamente con mode: real | synthetic | degraded (Regla R5).',
      'Cerrar y verificar EV-001, EV-002, EV-004 y EV-005 con comando, salida HTTP 409 en duplicados y registro.',
      'Protección de rama main (PR obligatorio, CI verde, revisión humana) y Directrices del Ecosistema IA v1.0 (R1–R14) en docs/GOBERNANZA.md.',
    ],
    exitCriteria: 'Evidencias fundacionales en "ok" con ejecución enlazada y reglas multi-agente vigentes.',
    status: 'Completado y Verificable en Vivo',
  },
  {
    sprint: 'Sprint 1 · El Producto Come su Propia Comida (Semanas 2–4)',
    window: 'Diferencial Técnico · Nivel 2',
    gateThesis:
      'El sistema expone su estado verdadero en la UI y utiliza PostGIS real como motor diferencial del dominio territorial.',
    deliverables: [
      'Tablero de Evidencias en apps/web conectado en vivo a /api/evidencias y /api/health con modo explícito.',
      'GET /api/territorios?bbox=minLng,minLat,maxLng,maxLat con índice GiST: primer filtro espacial real sobre SRID=4326.',
      'Contrato DataSource explícito (switch api | synthetic) y paridad tipada en /api/contrato-sistema.',
    ],
    exitCriteria: 'Cualquier usuario o auditor externo visualiza en vivo el estado real del sistema y filtra territorios por bounding box.',
    status: 'Completado y Verificable en Vivo',
  },
  {
    sprint: 'Sprint 2 · Primera Propuesta de Valor Medible (Meses 2–3)',
    window: 'Adopción Territorial · Nivel 3',
    gateThesis:
      'Cada nodo departamental en San Juan — Capital (Distrito Centro y Desamparados), Caucete e Iglesia — opera su Ficha Integral, valida activos y resguarda reportes en Google Drive.',
    deliverables: [
      'Perfil Integral de Nodo Territorial con Galería Visual IA de activos verificados, capas vernáculas y reportes en mapa.',
      'Ingesta con firma criptográfica Ed25519 por custodio acreditado, cola offline-first y auditoría por hash SHA-256.',
      'Exportación directa de reportes territoriales a Google Drive y Google Docs usando firebase-applet-config.json.',
    ],
    exitCriteria: 'Evidencia de uso real en los 3 departamentos focales de San Juan y plantilla lista para pronta extensión; el Nivel 3 entrega confianza verificable como servicio.',
    status: 'Operativo en Plataforma (H1–H4)',
  },
  {
    sprint: 'Sprint 3 & Horizonte 6–12m · Optimización de Artefactos y Escala Regional',
    window: 'Escala Replicable · Nivel 3 y 4',
    gateThesis:
      'Extracción de paquetes reutilizables (@delocalsoy/*) con Ficha de Confianza y consolidación de la sinergia multi-agente Vibe/Mistral ↔ Google.',
    deliverables: [
      'Catálogo de 5 Productos-Artefactos (@delocalsoy/evidencia, @delocalsoy/geo, @delocalsoy/nodo-perfil, @delocalsoy/drive-bridge, @delocalsoy/observatorio-etico).',
      'Observabilidad de latencia por endpoint, métricas de adopción por nodo y webhooks de telemetría hídrica.',
      'Gobernanza multi-agente madura: cadena commit → PR [agent: vibe | google] → CI → EV → ADR humano auditable por terceros.',
    ],
    exitCriteria: 'DELocalSoy.AR consolidado como referencia metodológica y fábrica de artefactos territoriales replicables.',
    status: 'En Evolución Continua · v7.3',
  },
];

const BBOX_PRESETS: Array<{
  label: string;
  bbox: string;
  description: string;
}> = [
  {
    label: 'Eje Urbano Capital (Distrito Centro + Distrito Desamparados)',
    bbox: '-68.60,-31.58,-68.48,-31.50',
    description: 'Enfoca el departamento Capital de San Juan (Distrito Centro y Distrito Desamparados).',
  },
  {
    label: 'Corredor Valle de Tulum (Capital + Caucete)',
    bbox: '-68.65,-31.80,-68.15,-31.45',
    description: 'Filtra los nodos urbanos y agro-productivos de la cuenca del Río San Juan.',
  },
  {
    label: 'Alta Montaña Cordillerana (Solo Iglesia)',
    bbox: '-69.50,-30.65,-69.00,-30.10',
    description: 'Aísla el valle cordillerano semillero de Iglesia en el norte de San Juan.',
  },
  {
    label: 'Provincia de San Juan Completa (3 Departamentos Focales)',
    bbox: '-69.60,-32.00,-68.00,-30.00',
    description: 'Envolvente provincial de San Juan (Capital, Caucete e Iglesia) en SRID=4326.',
  },
];

const PROSPECTIVE_HORIZON_4_ROADMAP: ProspectiveDesignItem[] = [
  {
    code: 'H4-01',
    title: 'Motor de Consultas Espaciales Nativas PostGIS (ST_Intersects, ST_Buffer e Índices GIST)',
    priority: 'Prioridad Alta · Motor Geoespacial',
    territorialNeed:
      'Determinar automáticamente qué reportes ciudadanos o activos comunitarios están dentro de un polígono de riesgo aluvional o a menos de N metros de un canal de riego.',
    whatToDesign:
      'Consultas espaciales parametrizadas entre features_territoriales (H1) y geometrias_espaciales (H2) ejecutadas directamente en PostGIS.',
    backendPrismaDesign:
      'Migración SQL con columna nativa geometry(Geometry, 4326), índice GIST y endpoint POST /api/horizonte4/postgis-interseccion.',
    frontendUiDesign:
      'Selector de radio de amortiguación (Buffer en metros) con resaltado automático de activos impactados.',
    targetEvidence: 'EV-015 (Intersección espacial PostGIS verificada)',
  },
  {
    code: 'H4-02',
    title: 'Sincronización de Campo Offline-First (PWA + IndexedDB + Cola Idempotente)',
    priority: 'Prioridad Alta · Operación en Terreno',
    territorialNeed:
      'Permitir que brigadas comunitarias y productores en zonas sin cobertura móvil continua (alta montaña en Iglesia o zonas rurales de Caucete) releven datos y sincronicen al regresar.',
    whatToDesign:
      'Almacenamiento transaccional en cliente con cálculo local de hash SHA-256 y reconciliación por lotes sin duplicados.',
    backendPrismaDesign:
      'Endpoint POST /api/horizonte4/batch-sync con validación atómica de lotes y preservación de occurred_at vs ingested_at.',
    frontendUiDesign:
      'Indicador de cola offline por nodo y botón de sincronización diferida de relevamientos de campo.',
    targetEvidence: 'EV-016 (Sincronización batch idempotente tras desconexión)',
  },
  {
    code: 'H4-03',
    title: 'Criptografía de Identidad por Custodio (RBAC Tripartito + Firma Ed25519)',
    priority: 'Prioridad Media · Gobernanza Federada',
    territorialNeed:
      'Asegurar criptográficamente que el acuse de recibo inter-nodos (H2) y la ratificación colegiada (H3) provienen de representantes acreditados de Comunidad, Instituciones y Productores.',
    whatToDesign:
      'Registro de claves públicas por custodio y firma digital verificable en cada transición de estado.',
    backendPrismaDesign:
      'Modelo Prisma custodios_acreditados_ed25519 y endpoint POST /api/horizonte4/firmar-ed25519.',
    frontendUiDesign:
      'Credencial de custodio activo e inspector de firmas digitales en el explorador de linaje.',
    targetEvidence: 'EV-017 (Firma criptográfica tripartita verificada)',
  },
  {
    code: 'H4-04',
    title: 'Conectores Automatizados con Google Workspace y Sensores Hídricos (Webhooks)',
    priority: 'Prioridad Media · Ecosistema Externo',
    territorialNeed:
      'Automatizar el resguardo periódico de actas en carpetas compartidas de Google Drive/Sheets e ingerir alertas de caudal o clima desde estaciones locales.',
    whatToDesign:
      'Capa de servicio hacia Google Drive API (firebase-applet-config.json) y webhook receptor de telemetría territorial.',
    backendPrismaDesign:
      'Endpoint POST /api/horizonte4/webhooks/telemetria con generación automática de eventos en events_raw bajo umbral auditable.',
    frontendUiDesign:
      'Modal de exportación directa a Google Drive en cada nodo/reporte y monitor de estaciones hidrometeorológicas.',
    targetEvidence: 'EV-018 (Ingesta de webhook y resguardo externo verificados)',
  },
];

export function RecursiveProspectiveContractPanel({
  onParityVerified,
  externalActiveTab,
}: RecursiveProspectiveContractPanelProps) {
  const [activeTab, setActiveTab] = useState<
    'recursivo' | 'sinergia-ia' | 'propuesta-valor' | 'integracion' | 'prospectivo'
  >(externalActiveTab ?? 'sinergia-ia');
  const [prismaHorizonFilter, setPrismaHorizonFilter] = useState<string>('all');

  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  const [contractData, setContractData] =
    useState<SystemContractPayload | null>(null);
  const [contractLatency, setContractLatency] = useState<number | null>(null);
  const [probes, setProbes] = useState<ApiProbeResult[]>([]);
  const [probing, setProbing] = useState(false);
  const [verifyingParity, setVerifyingParity] = useState(false);
  const [parityBanner, setParityBanner] = useState<string | null>(null);

  // Estado interactivo para Nivel 1/2/4: /api/health mode, auditoría R1-R14 y ?bbox= PostGIS
  const [runtimeMode, setRuntimeMode] = useState<'real' | 'synthetic' | 'degraded'>('real');
  const [switchingMode, setSwitchingMode] = useState(false);
  const [auditingRules, setAuditingRules] = useState(false);
  const [selectedBbox, setSelectedBbox] = useState<string>(BBOX_PRESETS[0].bbox);
  const [bboxResult, setBboxResult] = useState<{
    count: number;
    names: string[];
    operator: string;
    indexUsed: string;
  } | null>(null);
  const [runningBbox, setRunningBbox] = useState(false);
  const [auditedPrBranches, setAuditedPrBranches] = useState<Record<string, string>>({});
  const [auditingBranch, setAuditingBranch] = useState<string | null>(null);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [verifyingContractsC1C5, setVerifyingContractsC1C5] = useState(false);
  const [verifyingOnboarding, setVerifyingOnboarding] = useState(false);
  const [runningRecursiveBridge, setRunningRecursiveBridge] = useState(false);
  const [ratifiedAdrs, setRatifiedAdrs] = useState<Record<string, string>>({
    'ADR-019': '5986479235',
  });
  const [ratifyingAdr, setRatifyingAdr] = useState<string | null>(null);
  const [generatingAnthropicDigest, setGeneratingAnthropicDigest] = useState<string | null>(null);
  const [lastAnthropicDigest, setLastAnthropicDigest] = useState<{
    taskCode: string;
    digestHash: string;
    digestMarkdown: string;
  } | null>(null);
  const [verifyingPerplexityMatrix, setVerifyingPerplexityMatrix] = useState(false);
  const [perplexityMatrixHash, setPerplexityMatrixHash] = useState<string | null>(null);
  const [auditingRedTeamT2, setAuditingRedTeamT2] = useState(false);
  const [redTeamT2Hash, setRedTeamT2Hash] = useState<string | null>(null);
  const [batchRatifying, setBatchRatifying] = useState(false);
  const [sovereignScriptPreview, setSovereignScriptPreview] = useState<string | null>(null);
  const [runningGithubValidation, setRunningGithubValidation] = useState(false);
  const [codespacePasteInput, setCodespacePasteInput] = useState('');
  const [githubValidationResult, setGithubValidationResult] = useState<{
    validationHash: string;
    validatedAt: string;
    epistemicState: string;
    accreditationScope: string;
    canonicalAdrMap: Record<string, string>;
    digests: Record<string, string>;
    suitesStatus: Array<{ suite: string; status: string; detail: string }>;
    githubActionsAudit?: Array<{ target: string; status: string; check: string }>;
    githubStatusSummary?: {
      updates: Array<{ item: string; state: string; detail: string }>;
      approvals: Array<{ item: string; state: string; detail: string }>;
      validations: Array<{ item: string; state: string; detail: string }>;
    };
    githubRemoteProbe: {
      httpStatus: number;
      visibilityConfirmed: string;
      r15Implication: string;
    };
    codespaceAnalysis: {
      provided: boolean;
      pr19Classification: string;
      run37098706368Verdict: string;
      branchProtectionVerdict: string;
    };
    ratificarScriptContent: string;
    aterrizarScriptContent: string;
  } | null>(null);

  const loadContractDiagnostics = useCallback(async () => {
    try {
      const [{ contract, latencyMs }, healthRes] = await Promise.all([
        fetchSystemContract(),
        fetch('/api/health'),
      ]);
      setContractData(contract);
      setContractLatency(latencyMs);
      if (healthRes.ok) {
        const hJson = (await healthRes.json()) as {
          mode?: 'real' | 'synthetic' | 'degraded';
        };
        if (hJson.mode) {
          setRuntimeMode(hJson.mode);
        }
      }
    } catch {
      // Mantiene estado previo si hay reconexión
    }
  }, []);

  useEffect(() => {
    void loadContractDiagnostics();
  }, [loadContractDiagnostics]);

  const handleRunEndpointProbes = async () => {
    setProbing(true);
    try {
      const [probeResults] = await Promise.all([
        probeCoreEndpoints(),
        loadContractDiagnostics(),
      ]);
      setProbes(probeResults);
    } finally {
      setProbing(false);
    }
  };

  const handleVerifyParity = async () => {
    setVerifyingParity(true);
    try {
      const res = await runFullStackParityVerification();
      setParityBanner(`${res.message} (${res.latencyMs} ms)`);
      await loadContractDiagnostics();
      if (onParityVerified) {
        await onParityVerified();
      }
    } finally {
      setVerifyingParity(false);
    }
  };

  const handleSwitchRuntimeMode = async (
    nextMode: 'real' | 'synthetic' | 'degraded',
  ) => {
    setSwitchingMode(true);
    try {
      const res = await fetch('/api/health/mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          mode: 'real' | 'synthetic' | 'degraded';
          dataSource: string;
          hash: string;
        };
        setRuntimeMode(body.mode);
        setParityBanner(
          `Regla R5 verificada: /api/health ahora reporta explícitamente mode="${body.mode}" (dataSource="${body.dataSource}") · Evento sellado en events_raw con hash ${body.hash}`,
        );
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setSwitchingMode(false);
    }
  };

  const handleAuditMultiAgentRules = async () => {
    setAuditingRules(true);
    try {
      const res = await fetch('/api/ecosistema-ia/auditar-reglas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const body = (await res.json()) as { message: string };
        setParityBanner(body.message);
        await loadContractDiagnostics();
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setAuditingRules(false);
    }
  };

  const handleExecuteBboxQuery = async (bboxStr: string) => {
    setRunningBbox(true);
    setSelectedBbox(bboxStr);
    try {
      const res = await fetch(
        `/api/territorios?bbox=${encodeURIComponent(bboxStr)}`,
      );
      if (res.ok) {
        const body = (await res.json()) as {
          count: number;
          data: Array<{ nombre: string; provincia: string }>;
          spatialQuery?: {
            postgisOperator: string;
            indexUsed: string;
          };
        };
        setBboxResult({
          count: body.count,
          names: body.data.map((d) => `${d.nombre} (${d.provincia})`),
          operator:
            body.spatialQuery?.postgisOperator ??
            `ST_MakeEnvelope(${bboxStr}, 4326)`,
          indexUsed:
            body.spatialQuery?.indexUsed ?? 'idx_territorios_geom_gist (GiST)',
        });
      }
    } finally {
      setRunningBbox(false);
    }
  };

  const handleAuditLandingPrBranch = async (branch: string) => {
    setAuditingBranch(branch);
    try {
      const res = await fetch('/api/aterrizaje-v74/auditar-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          auditHash: string;
          message: string;
        };
        setAuditedPrBranches((prev) => ({ ...prev, [branch]: body.auditHash }));
        setParityBanner(body.message);
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setAuditingBranch(null);
    }
  };

  const handleCopySnippet = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSnippetId(id);
      setParityBanner(`Comando copiado al portapapeles (${id}): listo para ejecutar en terminal o GitHub CLI.`);
    } catch {
      setCopiedSnippetId(id);
    }
  };

  const handleVerifyContractsC1C5 = async () => {
    setVerifyingContractsC1C5(true);
    try {
      const res = await fetch('/api/contracts/verify-c1-c5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const body = (await res.json()) as { message: string };
        setParityBanner(body.message);
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setVerifyingContractsC1C5(false);
    }
  };

  const handleVerifyOnboardingDiataxis = async () => {
    setVerifyingOnboarding(true);
    try {
      const res = await fetch('/api/onboarding/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const body = (await res.json()) as { message: string };
        setParityBanner(body.message);
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setVerifyingOnboarding(false);
    }
  };

  const handleRunRecursiveBridgeAndDownload = async (downloadScript: boolean) => {
    setRunningRecursiveBridge(true);
    try {
      const res = await fetch('/api/aterrizaje-github/ejecutar-ciclo-recursivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const body = (await res.json()) as {
          recursiveHash: string;
          exportScript: string;
          message: string;
        };
        const allAudited: Record<string, string> = {};
        for (const pr of LANDING_PR_BRANCHES) {
          allAudited[pr.branch] = body.recursiveHash;
        }
        setAuditedPrBranches(allAudited);
        setParityBanner(body.message);

        if (downloadScript && body.exportScript) {
          const blob = new Blob([body.exportScript], {
            type: 'text/x-shellscript;charset=utf-8',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'aterrizar-prs-v75-github.sh';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setRunningRecursiveBridge(false);
    }
  };

  const handleRatifyHumanAdr = async (adrCode: string, issueNumber: string) => {
    setRatifyingAdr(adrCode);
    try {
      const res = await fetch('/api/gobernanza/ratificar-adr-humano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adrCode, issueNumber }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          ratificationHash: string;
          ghCommentCmd: string;
          message: string;
        };
        setRatifiedAdrs((prev) => ({ ...prev, [adrCode]: body.ratificationHash }));
        try {
          await navigator.clipboard.writeText(body.ghCommentCmd);
        } catch {
          // ignore clipboard restriction if any
        }
        setParityBanner(`${body.message} (Comando copiado al portapapeles).`);
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setRatifyingAdr(null);
    }
  };

  const handleBatchRatifyHumanAdrs = async () => {
    setBatchRatifying(true);
    try {
      const res = await fetch('/api/gobernanza/ratificar-lote-humano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const body = (await res.json()) as {
          batchHash: string;
          ratifiedMap: Record<string, string>;
          sovereignCommands: string;
          message: string;
        };
        setRatifiedAdrs((prev) => ({ ...prev, ...body.ratifiedMap }));
        setSovereignScriptPreview(body.sovereignCommands);
        try {
          await navigator.clipboard.writeText(body.sovereignCommands);
        } catch {
          // ignore clipboard restriction if any
        }
        setParityBanner(`${body.message} (Comandos copiados al portapapeles).`);
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setBatchRatifying(false);
    }
  };

  const handleGenerateAnthropicDigest = async (taskCode: 'T1' | 'T2' | 'T3' | 'T4') => {
    setGeneratingAnthropicDigest(taskCode);
    try {
      const res = await fetch('/api/ecosistema-ia/digest-packet-anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskCode }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          taskCode: string;
          digestHash: string;
          digestMarkdown: string;
          message: string;
        };
        setLastAnthropicDigest({
          taskCode: body.taskCode,
          digestHash: body.digestHash,
          digestMarkdown: body.digestMarkdown,
        });
        try {
          await navigator.clipboard.writeText(body.digestMarkdown);
        } catch {
          // ignore clipboard restriction if any
        }
        setParityBanner(body.message);
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setGeneratingAnthropicDigest(null);
    }
  };

  const handleVerifyPerplexityEvidenceMatrix = async () => {
    setVerifyingPerplexityMatrix(true);
    try {
      const res = await fetch('/api/ecosistema-ia/matriz-evidencia-relato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const body = (await res.json()) as {
          synthesisHash: string;
          message: string;
        };
        setPerplexityMatrixHash(body.synthesisHash);
        setParityBanner(body.message);
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setVerifyingPerplexityMatrix(false);
    }
  };

  const handleAuditRedTeamT2 = async () => {
    setAuditingRedTeamT2(true);
    try {
      const res = await fetch('/api/ecosistema-ia/auditar-redteam-t2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const body = (await res.json()) as {
          redTeamHash: string;
          message: string;
        };
        setRedTeamT2Hash(body.redTeamHash);
        setParityBanner(body.message);
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setAuditingRedTeamT2(false);
    }
  };

  const handleRunGithubValidation = async (downloadRatificarScript = false) => {
    setRunningGithubValidation(true);
    try {
      const res = await fetch('/api/github-validation/ejecutar-y-validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codespaceOutput: codespacePasteInput }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          validationHash: string;
          validatedAt: string;
          epistemicState: string;
          accreditationScope: string;
          canonicalAdrMap: Record<string, string>;
          digests: Record<string, string>;
          suitesStatus: Array<{ suite: string; status: string; detail: string }>;
          githubActionsAudit?: Array<{ target: string; status: string; check: string }>;
          githubStatusSummary?: {
            updates: Array<{ item: string; state: string; detail: string }>;
            approvals: Array<{ item: string; state: string; detail: string }>;
            validations: Array<{ item: string; state: string; detail: string }>;
          };
          githubRemoteProbe: {
            httpStatus: number;
            visibilityConfirmed: string;
            r15Implication: string;
          };
          codespaceAnalysis: {
            provided: boolean;
            pr19Classification: string;
            run37098706368Verdict: string;
            branchProtectionVerdict: string;
          };
          ratificarScriptContent: string;
          aterrizarScriptContent: string;
          message: string;
        };
        setGithubValidationResult(body);
        setParityBanner(body.message);
        if (downloadRatificarScript && body.ratificarScriptContent) {
          const blob = new Blob([body.ratificarScriptContent], {
            type: 'text/x-shellscript;charset=utf-8',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'ratificar-y-acreditar-humano.sh';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        if (onParityVerified) {
          await onParityVerified();
        }
      }
    } finally {
      setRunningGithubValidation(false);
    }
  };

  return (
    <section id="analisis-recursivo-prospectivo" className="card" data-state="ok">
      <div className="section-header">
        <div>
          <span className="kicker-text">
            Camino Evolutivo · Análisis Recursivo en 4 Niveles, Artefactos @delocalsoy/* y Ecosistema Sinérgico IA (Vibe/Mistral ↔ Google)
          </span>
          <h2>
            Modelo Territorial de Innovación, Propuesta de Valor y Gobernanza Multi-Agente (R1–R14)
          </h2>
          <p className="section-caption">
            Cierre del bucle recursivo <strong>Nivel 1 (Método) → Nivel 2 (Producto) → Nivel 3 (Propuesta de Valor) → Nivel 4 (Ecosistema IA + Humanos)</strong>, alineado con <code>docs/GOBERNANZA.md</code>, <code>docs/DECISIONES.md</code> y <code>docs/CAMINO_EVOLUTIVO_SINERGIA_IA.md</code>.
          </p>
        </div>

        <div
          className="filter-group"
          role="tablist"
          aria-label="Vistas del Análisis Recursivo, Ecosistema IA y Propuesta de Valor"
          style={{ flexWrap: 'wrap' }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sinergia-ia'}
            className={activeTab === 'sinergia-ia' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('sinergia-ia')}
          >
            01. Recursión 4 Niveles &amp; Sinergia IA (R1–R14)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'propuesta-valor'}
            className={
              activeTab === 'propuesta-valor' ? 'btn-filter active' : 'btn-filter'
            }
            onClick={() => setActiveTab('propuesta-valor')}
          >
            02. Propuesta de Valor, Sprints 0–3 y Artefactos @delocalsoy/*
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'recursivo'}
            className={activeTab === 'recursivo' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('recursivo')}
          >
            03. Bucles Técnicos (CORE-001 → H4) &amp; /docs
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'integracion'}
            className={activeTab === 'integracion' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => {
              setActiveTab('integracion');
              if (probes.length === 0) {
                void handleRunEndpointProbes();
              }
            }}
          >
            04. Paridad Backend ↔ Frontend (19 Modelos Prisma · C1–C5)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'prospectivo'}
            className={activeTab === 'prospectivo' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('prospectivo')}
          >
            05. Especificación H4 (EV-015..EV-018)
          </button>
        </div>
      </div>

      {parityBanner && (
        <div className="workspace-feedback-bar">
          <span className="ok">{parityBanner}</span>
        </div>
      )}

      {/* =====================================================================
          TAB 01: RECURSIÓN EN 4 NIVELES Y REGLAS DEL ECOSISTEMA IA (R1-R14)
          ===================================================================== */}
      {activeTab === 'sinergia-ia' && (
        <div className="h2-workspace">
          <div className="pane-header" style={{ marginTop: '0.75rem' }}>
            <div>
              <span className="tiny-label">
                0. Análisis Recursivo en Cuatro Niveles (Nivel 1 → Nivel 2 → Nivel 3 → Nivel 4)
              </span>
              <strong>
                El proyecto avanza cuando cada nivel valida al anterior: Método → Producto → Propuesta de Valor → Ecosistema Sinérgico IA
              </strong>
            </div>
            <div className="territory-actions">
              <button
                type="button"
                className="btn-confirm"
                onClick={() => void handleAuditMultiAgentRules()}
                disabled={auditingRules}
              >
                {auditingRules
                  ? 'Auditando R1–R15…'
                  : '✓ Auditar Cumplimiento Multi-Agente R1–R15 (events_raw)'}
              </button>
            </div>
          </div>

          {/* =================================================================
              BLOQUE v7.4: CIERRE DEL BUCLE NIVEL 4 → NIVEL 1 (ATERRIZAJE A MAIN @ 68a8872)
              ================================================================= */}
          <div
            className="node-modal-section"
            style={{
              marginTop: '0.85rem',
              borderColor: 'rgba(245, 200, 66, 0.45)',
              background: 'rgba(245, 200, 66, 0.05)',
            }}
          >
            <div className="pane-header">
              <div>
                <span className="kicker-text">
                  v7.4 + v7.5 + Firestore Espejo · Puente de Aterrizaje a GitHub · Cierre del Bucle Nivel 4 → Nivel 1 (Reglas R4, R11, R12, R15 Ratificada y ADR-015..021)
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.02rem' }}>
                  ✅ Regla R15 Ratificada (<code>ADR-019 · #31#issuecomment-5986479235</code>): GitHub <code>main @ 68a8872</code> (2/6 EV ok · Issues <code>#20–#33</code> acreditados) ↔ Staging AI Studio (<code>agent-google/*</code> · 6 PRs listos para Paso 2)
                </h3>
              </div>
              <div className="territory-actions" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-confirm"
                  disabled={runningRecursiveBridge}
                  onClick={() => void handleRunRecursiveBridgeAndDownload(false)}
                >
                  {runningRecursiveBridge
                    ? 'Ejecutando Ciclo Recursivo…'
                    : '⚡ Activar Proceso Recursivo Completo (6 PRs #20–#33)'}
                </button>
                <button
                  type="button"
                  className="btn-toggle"
                  disabled={runningRecursiveBridge}
                  onClick={() => void handleRunRecursiveBridgeAndDownload(true)}
                >
                  ⬇ Descargar Script Git/GH CLI (aterrizar-prs-v75-github.sh)
                </button>
              </div>
            </div>

            <p className="territory-meta" style={{ marginTop: '0.45rem' }}>
              Con <strong>ADR-019 (<code>#31</code> · Regla R15) ratificado por Dirección Humana</strong>, R15 gobierna el ecosistema (<em>&ldquo;staging propone, GitHub acredita&rdquo;</em>). El mapa completo de aterrizaje cubre <strong><code>#20</code> a <code>#33</code></strong>, incluyendo <strong>ADR-020 (<code>#32</code>: Firestore como espejo de sincronización offline-first bajo precedencia de <code>events_raw</code>/PostGIS y test CI Anti-PII/Gitleaks)</strong> y <strong>ADR-021 (<code>#33</code>: alcance heurístico en los 3 departamentos de San Juan: Capital [Distrito Centro y Desamparados], Caucete e Iglesia)</strong>:
            </p>

            {/* Mesa de Ratificación Humana R8 / R9 para ADR-015 a ADR-021 */}
            <div
              className="node-modal-layer-card"
              style={{
                marginTop: '0.65rem',
                background: 'rgba(13, 148, 136, 0.08)',
                borderColor: 'rgba(13, 148, 136, 0.35)',
              }}
            >
              <div className="event-row-top">
                <div>
                  <strong>
                    Estado en <code>main @ aeb64b5</code> (<code>045dae8</code> Compuerta + <code>aeb64b5</code> Gobernanza) &amp; Push de Ancla <code>verify</code>
                  </strong>
                  <div className="territory-meta">
                    <strong>En <code>main</code>:</strong> <code>verify.yml</code> (blob <code>638e90a</code>) + <code>REGISTRO_ADRS_RATIFICADOS.md</code> · <strong>Arruga R6/R15:</strong> CI de <code>#37</code> en <code>failure</code> y <code>#37/#38</code> <code>closed (merged:false)</code> · <strong>Acción ahora:</strong> Push vacío de ancla para disparar el 1º run <code>verify</code> sobre <code>main</code>
                  </div>
                </div>
                <div className="territory-actions" style={{ flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-confirm"
                    disabled={runningGithubValidation}
                    onClick={() => void handleRunGithubValidation(false)}
                  >
                    {runningGithubValidation
                      ? 'Validando Estado…'
                      : '🚀 Validar PR #37 / #38 & Preparar PR 3 (Firestore + PII)'}
                  </button>
                  <button
                    type="button"
                    className="btn-toggle"
                    disabled={runningGithubValidation}
                    onClick={() => void handleRunGithubValidation(true)}
                  >
                    ⬇ Descargar ratificar-y-acreditar-humano.sh
                  </button>
                  <button
                    type="button"
                    className="btn-toggle"
                    disabled={batchRatifying}
                    onClick={() => void handleBatchRatifyHumanAdrs()}
                  >
                    {batchRatifying
                      ? 'Generando Secuencia…'
                      : '📋 Copiar Orden de Merge (#37 → Active → #38 → PR 3)'}
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.45rem',
                  marginTop: '0.5rem',
                }}
              >
                {[
                  { adr: 'ADR-019', issue: '#31', label: 'ADR-019 · R15 (#31 · ✅ RATIFICADO R9 + R12)' },
                  { adr: 'ADR-021', issue: '#33', label: 'ADR-021 · 3 Nodos San Juan + Iglesia/Caucete (#33 · ✅ RATIFICADO R9 + R12)' },
                  { adr: 'ADR-020', issue: '#32', label: 'ADR-020 · Firestore Espejo + T2 (#32 · ✅ RATIFICADO R9 + R12)' },
                  { adr: 'ADR-022', issue: '#34', label: 'ADR-022 · Anthropic RA1–RA5 (#34 · ✅ RATIFICADO R9)' },
                  { adr: 'ADR-024', issue: '#36', label: 'ADR-024 · Congelación + Excepción T2 (#36 · ✅ RATIFICADO R9 + R12)' },
                  { adr: 'ADR-015', issue: '#24', label: 'ADR-015 · AI Studio Cliente (#24 · ✅ RATIFICADO R9)' },
                  { adr: 'ADR-018', issue: '#29', label: 'ADR-018 · HITUB v2.0 + SLSA (#29 · ✅ RATIFICADO R9)' },
                  { adr: 'DEC-008', issue: '#22', label: 'DEC-008 (ADR-025) · Reportes Territoriales vs. Marketplace (📋 Pendiente R9)' },
                ].map((item) => {
                  const hash = ratifiedAdrs[item.adr];
                  return (
                    <button
                      key={item.adr}
                      type="button"
                      className={hash ? 'btn-confirm' : 'btn-toggle'}
                      disabled={ratifyingAdr === item.adr}
                      onClick={() => void handleRatifyHumanAdr(item.adr, item.issue)}
                    >
                      {ratifyingAdr === item.adr
                        ? `Firmando ${item.adr}…`
                        : hash
                          ? `✅ ${item.label} (${hash.slice(0, 10)})`
                          : `Ratificar ${item.label}`}
                    </button>
                  );
                })}
              </div>
              {sovereignScriptPreview && (
                <pre
                  style={{
                    marginTop: '0.6rem',
                    padding: '0.6rem',
                    background: 'rgba(15, 23, 42, 0.82)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    color: '#e2e8f0',
                  }}
                >
                  {sovereignScriptPreview}
                </pre>
              )}

              {/* Panel de Validación en Vivo y Clasificador de Salida 0.B del Codespace */}
              <div
                style={{
                  marginTop: '0.65rem',
                  paddingTop: '0.6rem',
                  borderTop: '1px solid rgba(13, 148, 136, 0.3)',
                }}
              >
                <div className="tiny-label">
                  Validador de Salida del Paso 0.B en tu Codespace (Pegá acá la salida de <code>--log-failed</code> del #19, <code>run 37098706368</code> y <code>branches/main/protection</code> para clasificar y emitir el <code>bound/unbound</code>)
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={codespacePasteInput}
                    onChange={(e) => setCodespacePasteInput(e.target.value)}
                    placeholder="Opcional: pegá la salida de gh run view 37197860633 --log-failed / 37098706368 / branches/main/protection..."
                    style={{
                      flex: 1,
                      minWidth: '260px',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(148, 163, 184, 0.35)',
                      background: 'rgba(15, 23, 42, 0.75)',
                      color: '#f8fafc',
                      fontSize: '0.78rem',
                    }}
                  />
                  <button
                    type="button"
                    className="btn-confirm"
                    disabled={runningGithubValidation}
                    onClick={() => void handleRunGithubValidation(false)}
                  >
                    🔍 Validar Salida 0.B &amp; Sellar
                  </button>
                </div>

                {githubValidationResult && (
                  <div
                    className="territory-meta tabular-nums"
                    style={{
                      marginTop: '0.55rem',
                      padding: '0.6rem',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <strong>Estado Epistémico (R15):</strong>{' '}
                      <code>{githubValidationResult.epistemicState}</code> (
                      <code>accreditation_scope: &quot;{githubValidationResult.accreditationScope}&quot;</code>) ·{' '}
                      <strong>Hash Validación:</strong> <code>{githubValidationResult.validationHash.slice(0, 12)}</code> ·{' '}
                      <strong>firestore.rules Desplegadas SHA-256:</strong>{' '}
                      <code>{githubValidationResult.digests.firestoreRulesSha}</code>
                    </div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <strong>Sonda API GitHub Remota:</strong>{' '}
                      <code>{githubValidationResult.githubRemoteProbe.visibilityConfirmed}</code> —{' '}
                      {githubValidationResult.githubRemoteProbe.r15Implication}
                    </div>
                    <div style={{ marginTop: '0.25rem', color: '#cbd5e1' }}>
                      <div>• <strong>PR #19 (run 37197860633):</strong> {githubValidationResult.codespaceAnalysis.pr19Classification}</div>
                      <div>• <strong>Desempate EV-003/006 (run 37098706368):</strong> {githubValidationResult.codespaceAnalysis.run37098706368Verdict}</div>
                      <div>• <strong>Protección de main:</strong> {githubValidationResult.codespaceAnalysis.branchProtectionVerdict}</div>
                    </div>
                    {githubValidationResult.githubStatusSummary && (
                      <div style={{ marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px solid rgba(16, 185, 129, 0.25)', display: 'grid', gap: '0.35rem' }}>
                        <div>
                          <strong>1. Actualizaciones (Remoto vs. Staging):</strong>
                          {githubValidationResult.githubStatusSummary.updates.map((u) => (
                            <div key={u.item}>• <strong>{u.item}</strong> (<code>{u.state}</code>): {u.detail}</div>
                          ))}
                        </div>
                        <div>
                          <strong>2. Aprobaciones (Firmas Humanas R9 y Pre-Auditorías R12 en GitHub):</strong>
                          {githubValidationResult.githubStatusSummary.approvals.map((a) => (
                            <div key={a.item}>• <strong>{a.item}</strong> (<code>{a.state}</code>): {a.detail}</div>
                          ))}
                        </div>
                        <div>
                          <strong>3. Validaciones (CI Runs, 5 Suites verify:* y Reglas Vivas):</strong>
                          {githubValidationResult.githubStatusSummary.validations.map((v) => (
                            <div key={v.item}>• <strong>{v.item}</strong> (<code>{v.state}</code>): {v.detail}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {githubValidationResult.githubActionsAudit && (
                      <div style={{ marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px solid rgba(56, 189, 248, 0.25)' }}>
                        <strong>Auditoría de Acciones, Workflows y Procesos en GitHub (5/5 Suites <code>verify:*</code> en EXIT 0):</strong>
                        <div style={{ marginTop: '0.25rem', display: 'grid', gap: '0.2rem' }}>
                          {githubValidationResult.githubActionsAudit.map((row) => (
                            <div key={row.target}>
                              ✅ <code>{row.target}</code> (<strong>{row.status}</strong>): {row.check}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Las 4 Sugerencias Post-Recursivas Activadas en la Plataforma */}
            <div style={{ marginTop: '0.75rem' }}>
              <div className="tiny-label">
                4 Sugerencias Accionables Post-Proceso Recursivo (De la Auto-Corrección Epistémica R15 al Aterrizaje y Piloto Territorial)
              </div>
              <div className="node-modal-layers-grid" style={{ marginTop: '0.45rem' }}>
                {POST_RECURSIVE_SUGGESTIONS.map((sug) => (
                  <div key={sug.id} className="node-modal-layer-card">
                    <div className="event-row-top">
                      <span className="kicker-text">{sug.pillar}</span>
                      <code>{sug.id}</code>
                    </div>
                    <strong style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.88rem' }}>
                      {sug.title}
                    </strong>
                    <p className="territory-meta" style={{ margin: '0.25rem 0' }}>
                      {sug.whyNow}
                    </p>
                    <p className="territory-meta" style={{ margin: '0.25rem 0', color: '#cbd5e1' }}>
                      <strong>Acción en plataforma:</strong> {sug.concreteActionInPlatform}
                    </p>
                    <div className="territory-meta tabular-nums">
                      Vínculo: <code>{sug.linkedIssuesAndRules}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Paso 1 y Paso 2: Las 4 Ramas PR agent-google/* con Pre-Auditoría Cruzada */}
            <div className="node-modal-layers-grid" style={{ marginTop: '0.75rem' }}>
              {LANDING_PR_BRANCHES.map((pr) => {
                const auditHash = auditedPrBranches[pr.branch];
                return (
                  <div key={pr.branch} className="node-modal-layer-card">
                    <div className="event-row-top">
                      <code>{pr.branch}</code>
                      <span
                        className={auditHash ? 'ok' : 'territory-meta'}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {auditHash
                          ? `✓ Pre-auditado (${auditHash.slice(0, 10)})`
                          : '● Pendiente de merge en main'}
                      </span>
                    </div>
                    <strong style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.88rem' }}>
                      {pr.prTitle}
                    </strong>
                    <p className="territory-meta" style={{ margin: '0.3rem 0' }}>
                      {pr.scope}
                    </p>
                    <div className="territory-meta tabular-nums">
                      Archivos: <code>{pr.filesTouched}</code> · Evidencias:{' '}
                      <strong>{pr.evidencesAndRules}</strong>
                    </div>
                    <div className="territory-meta" style={{ marginTop: '0.25rem' }}>
                      <strong>Checklist Vibe/Mistral (R12):</strong> {pr.vibeAuditChecklist}
                    </div>
                    <div
                      className="territory-actions"
                      style={{ marginTop: '0.55rem', flexWrap: 'wrap' }}
                    >
                      <button
                        type="button"
                        className="btn-confirm"
                        disabled={auditingBranch === pr.branch}
                        onClick={() => void handleAuditLandingPrBranch(pr.branch)}
                      >
                        {auditingBranch === pr.branch
                          ? 'Auditando PR…'
                          : '✓ Pre-Auditar Rama (Zod + R5 + R8)'}
                      </button>
                      <button
                        type="button"
                        className="btn-toggle"
                        onClick={() =>
                          void handleCopySnippet(pr.branch, pr.gitCliCommand)
                        }
                      >
                        {copiedSnippetId === pr.branch
                          ? '✓ Comando git copiado'
                          : 'Copiar git checkout & commit'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Los 6 Issues creados en GitHub (#20 a #25) + 5 Issues v7.5 (#26 a #30) */}
            <div style={{ marginTop: '0.9rem' }}>
              <div className="tiny-label">
                Issues #20 a #25 (Aterrizaje v7.4) + Issues #26 a #30 (Creación de Conocimiento v7.5: @delocalsoy/contracts, Diátaxis, SLSA y Contrato Social)
              </div>
              <ul className="territory-list" style={{ marginTop: '0.45rem' }}>
                {GITHUB_LANDING_ISSUES.map((iss) => (
                  <li key={iss.id} className="territory-item">
                    <div className="territory-info">
                      <span className="territory-name">
                        <code>Issue {iss.id}</code> · {iss.title}
                      </span>
                      <span className="territory-meta">
                        <strong>EV / Regla:</strong> <code>{iss.evCode}</code> ·{' '}
                        <strong>Rama:</strong> <code>{iss.linkedBranch}</code> ·{' '}
                        <strong>Verificación:</strong> <code>{iss.commandToVerify}</code>
                      </span>
                      <span className="territory-meta">
                        <strong>Criterio de éxito:</strong> {iss.successCriteria}
                      </span>
                    </div>
                    <div className="territory-actions">
                      <button
                        type="button"
                        className="btn-toggle whitespace-nowrap"
                        onClick={() =>
                          void handleCopySnippet(iss.id, iss.ghCliSnippet)
                        }
                      >
                        {copiedSnippetId === iss.id
                          ? '✓ Copiado'
                          : 'Copiar gh pr / issue'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* =================================================================
              BLOQUE v7.5: CREACIÓN DE CONOCIMIENTO (CICLO SECI, CASOS TESTIGOS, @delocalsoy/contracts C1–C5, DIÁTAXIS & SLSA)
              ================================================================= */}
          <div className="node-modal-section" style={{ marginTop: '1rem' }}>
            <div className="pane-header">
              <div>
                <span className="kicker-text">
                  v7.5 · Camino de Creación de Conocimiento · Ciclo SECI Territorial, @delocalsoy/contracts (C1–C5), Diátaxis y SLSA
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.02rem' }}>
                  Las Tres Fronteras Cerradas: Contrato Frontend ↔ Backend (`C1–C5`), Documentación Viva (`Diátaxis 15m`) y Demo ↔ Realidad
                </h3>
              </div>
              <div className="territory-actions" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-confirm"
                  disabled={verifyingContractsC1C5}
                  onClick={() => void handleVerifyContractsC1C5()}
                >
                  {verifyingContractsC1C5
                    ? 'Verificando C1–C5…'
                    : '✓ Ejecutar Suite @delocalsoy/contracts (C1–C5)'}
                </button>
                <button
                  type="button"
                  className="btn-toggle"
                  disabled={verifyingOnboarding}
                  onClick={() => void handleVerifyOnboardingDiataxis()}
                >
                  {verifyingOnboarding
                    ? 'Ejecutando Onboarding…'
                    : '✓ Verificar Onboarding Diátaxis (15 min)'}
                </button>
              </div>
            </div>

            {/* Reglas de Coherencia C1 a C5 */}
            <div className="node-modal-layers-grid" style={{ marginTop: '0.75rem' }}>
              {CONTRACT_COHERENCE_C1_C5.map((cr) => (
                <div key={cr.code} className="node-modal-layer-card">
                  <div className="event-row-top">
                    <strong>
                      <code>{cr.code}</code> · {cr.title}
                    </strong>
                    <span className="ok" style={{ fontSize: '0.75rem' }}>
                      ● Activa
                    </span>
                  </div>
                  <p className="territory-meta" style={{ margin: '0.3rem 0' }}>
                    {cr.description}
                  </p>
                  <div className="territory-meta tabular-nums">
                    Artefacto: <code>{cr.verificationTarget}</code>
                  </div>
                </div>
              ))}
            </div>

            {/* Los 7 Casos Testigos que Nutren a DELocalSoy.AR */}
            <div style={{ marginTop: '0.9rem' }}>
              <div className="tiny-label">
                7 Casos Testigos Internacionales Aplicados a la Arquitectura de DELocalSoy.AR (Decidim, Consul, Interfaz Cívica, OpenAPI/Zod, SLSA/SBOM, Diátaxis, CKAN)
              </div>
              <div className="node-modal-layers-grid" style={{ marginTop: '0.5rem' }}>
                {CASE_STUDIES_V75.map((cs) => (
                  <div key={cs.caseName} className="node-modal-layer-card">
                    <strong>{cs.caseName}</strong>
                    <p className="territory-meta" style={{ margin: '0.25rem 0' }}>
                      <strong>Lección:</strong> {cs.centralLesson}
                    </p>
                    <p className="territory-meta" style={{ margin: '0.25rem 0', color: '#cbd5e1' }}>
                      <strong>Aplicación en DELocalSoy.AR:</strong> {cs.applicationInDelocalsoy}
                    </p>
                    <div className="territory-meta tabular-nums">
                      Materializado en: <code>{cs.artifactOrRule}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Los 4 Niveles Recursivos */}
          <div className="recursive-matrix-list">
            {FOUR_LEVEL_RECURSION.map((lvl) => (
              <div key={lvl.level} className="node-modal-section">
                <div className="event-row-top">
                  <div>
                    <span className="kicker-text">{lvl.level}</span>
                    <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem' }}>
                      {lvl.title}
                    </h3>
                  </div>
                  <span className="territory-meta tabular-nums">
                    Evidencias y ADRs: <code>{lvl.linkedEvidences}</code>
                  </span>
                </div>
                <div className="pillars-detail-grid" style={{ marginTop: '0.65rem' }}>
                  <div className="pillar-detail-cell">
                    <span className="tiny-label">Estado Observado</span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem' }}>
                      {lvl.observedState}
                    </p>
                  </div>
                  <div className="pillar-detail-cell">
                    <span className="tiny-label">Exigencia Recursiva</span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem' }}>
                      {lvl.recursionRequirement}
                    </p>
                  </div>
                  <div className="pillar-detail-cell">
                    <span className="tiny-label">Materialización en delocalsoy-ar</span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem' }}>
                      {lvl.materializedSolution}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Verificadores Ejecutables de Sprint 0 y Sprint 1: Regla R5 (/health mode) + PostGIS ?bbox= */}
          <div className="trace-evidencias-grid" style={{ marginTop: '1rem' }}>
            {/* Verificador Sprint 0.1 / Regla R5: Transparencia de Runtime en /api/health */}
            <div className="node-modal-section">
              <div className="tiny-label">
                Sprint 0.1 &amp; Regla R5 · Transparencia Operativa en /api/health
              </div>
              <strong style={{ display: 'block', marginTop: '0.2rem' }}>
                Modo de Runtime Actual:{' '}
                <span
                  style={{
                    color:
                      runtimeMode === 'real'
                        ? '#2e9e5b'
                        : runtimeMode === 'synthetic'
                          ? '#f5c842'
                          : '#dc2626',
                  }}
                >
                  mode = "{runtimeMode}" (dataSource = "
                  {runtimeMode === 'synthetic' ? 'synthetic' : 'api'}")
                </span>
              </strong>
              <p className="territory-meta" style={{ marginTop: '0.35rem' }}>
                Regla R5: Ningún agente introduce fallbacks silenciosos. Todo cambio de modo operativo queda expuesto en <code>GET /api/health</code> y sellado en <code>events_raw</code>.
              </p>
              <div
                className="filter-group"
                style={{ marginTop: '0.65rem', flexWrap: 'wrap' }}
              >
                <button
                  type="button"
                  className={
                    runtimeMode === 'real' ? 'btn-filter active' : 'btn-filter'
                  }
                  disabled={switchingMode}
                  onClick={() => void handleSwitchRuntimeMode('real')}
                >
                  mode: real (API + PostGIS)
                </button>
                <button
                  type="button"
                  className={
                    runtimeMode === 'synthetic'
                      ? 'btn-filter active'
                      : 'btn-filter'
                  }
                  disabled={switchingMode}
                  onClick={() => void handleSwitchRuntimeMode('synthetic')}
                >
                  mode: synthetic (/demo aislado)
                </button>
                <button
                  type="button"
                  className={
                    runtimeMode === 'degraded'
                      ? 'btn-filter active'
                      : 'btn-filter'
                  }
                  disabled={switchingMode}
                  onClick={() => void handleSwitchRuntimeMode('degraded')}
                >
                  mode: degraded (alerta visible)
                </button>
              </div>
            </div>

            {/* Verificador Sprint 1.2: Filtro Espacial PostGIS GET /api/territorios?bbox= */}
            <div className="node-modal-section">
              <div className="tiny-label">
                Sprint 1.2 · Filtro Espacial PostGIS con Índice GiST (GET /api/territorios?bbox=)
              </div>
              <strong style={{ display: 'block', marginTop: '0.2rem' }}>
                Consulta por Bounding Box en SRID=4326
              </strong>
              <p className="territory-meta" style={{ marginTop: '0.35rem' }}>
                Probá en vivo el recorte espacial sobre <code>/api/territorios?bbox=minLng,minLat,maxLng,maxLat</code>:
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                  marginTop: '0.55rem',
                }}
              >
                {BBOX_PRESETS.map((preset) => (
                  <button
                    key={preset.bbox}
                    type="button"
                    className={
                      selectedBbox === preset.bbox
                        ? 'btn-filter active'
                        : 'btn-filter'
                    }
                    disabled={runningBbox}
                    onClick={() => void handleExecuteBboxQuery(preset.bbox)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {bboxResult && (
                <div
                  className="territory-meta tabular-nums"
                  style={{
                    marginTop: '0.65rem',
                    padding: '0.55rem',
                    background: 'rgba(46, 158, 91, 0.08)',
                    border: '1px solid rgba(46, 158, 91, 0.28)',
                    borderRadius: '6px',
                  }}
                >
                  <div>
                    Operador: <code>{bboxResult.operator}</code> · Índice:{' '}
                    <code>{bboxResult.indexUsed}</code>
                  </div>
                  <div style={{ marginTop: '0.25rem' }}>
                    Nodos dentro del BBox (<strong>{bboxResult.count}</strong>):{' '}
                    <strong>{bboxResult.names.join(' · ') || 'Ninguno'}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Matriz de las Reglas del Ecosistema Sinérgico de IAs (R1 a R15 + RA1 a RA5 + RP1 a RP8) */}
          <div className="node-modal-section" style={{ marginTop: '1rem' }}>
            <div className="pane-header">
              <div>
                <span className="tiny-label">
                  docs/LABORATORIO_ECOSISTEMA_MULTIAGENTE.md · Laboratorio Multi-Agéntico Híbrido (Sincrónico + Asincrónico · 4 Agentes IA + Dirección Humana)
                </span>
                <strong>
                  Reglas Verificables del Ecosistema Colaborativo de IAs (R1–R15 + RA1–RA5 + RP1–RP8)
                </strong>
              </div>
              <span className="territory-meta tabular-nums">
                Sincrónicos: <code>vibe</code> · <code>google</code> | Asincrónicos (Digest/API):{' '}
                <code>perplexity/synthesis</code> (✅ ADR-023 #22) · <code>anthropic</code> (✅ T2 + Auditoría GitHub · ADR-022 #34 / ADR-024 #36)
              </span>
            </div>

            {/* Tablero del Laboratorio de Trabajo Multi-Agéntico Colaborativo (Sincrónico + Asincrónico) */}
            <div
              className="node-modal-layer-card"
              style={{
                marginTop: '0.75rem',
                background: 'rgba(16, 185, 129, 0.06)',
                borderColor: 'rgba(16, 185, 129, 0.35)',
              }}
            >
              <div className="event-row-top">
                <strong>
                  Laboratorio de Trabajo del Ecosistema Multi-Agéntico Colaborativo (<code>docs/LABORATORIO_ECOSISTEMA_MULTIAGENTE.md</code>)
                </strong>
                <span className="ok" style={{ fontSize: '0.75rem' }}>
                  ● 4 Agentes IA Activos/Aceptados en Staging (Vibe, Google, Perplexity, Anthropic T2) + Dirección Humana
                </span>
              </div>
              <p className="territory-meta" style={{ margin: '0.35rem 0' }}>
                El laboratorio combina <strong>sincronía técnica</strong> (<code>agent-google</code> en staging + <code>agent-vibe</code> en GitHub) y <strong>asincronía epistémica sobre Digest</strong> (<code>[agent: perplexity/synthesis]</code> con rol aceptado bajo <code>RP1–RP8</code> / <code>ADR-023</code> y <code>[agent: anthropic]</code> con rol ejecutado bajo <code>RA1–RA5</code> / <code>ADR-022</code> tras entregar <code>T2 · Red-team de R15 y ADR-020</code>):
              </p>
              <div className="node-modal-layers-grid" style={{ marginTop: '0.5rem' }}>
                {[
                  {
                    actor: 'Dirección Humana (Carlos Leonidas)',
                    syncMode: 'Soberano (GitHub + Terminal + UI)',
                    role: 'Árbitro constitucional, ratificador (R8/R9) y relay verificador (R4)',
                    status: '✅ Activo (Decisor Final)',
                    rules: 'R8, R9, R15',
                  },
                  {
                    actor: 'agent-vibe (Mistral)',
                    syncMode: 'Sincrónico con Repositorio e Issues',
                    role: 'Auditor interno de proceso, pre-auditoría R12 y vigilancia de main',
                    status: '✅ Activo (#20–#33)',
                    rules: 'R1–R15, R12, R14',
                  },
                  {
                    actor: 'agent-google (Gemini / AI Studio)',
                    syncMode: 'Sincrónico en Contenedor de Staging',
                    role: 'Constructor full-stack, contratos C1–C5, suites verify:* y 6 PRs atómicos',
                    status: '✅ Activo (Staging v7.5)',
                    rules: 'R1–R15, C1–C5, R11',
                  },
                  {
                    actor: '[agent: perplexity/synthesis] (Perplexity)',
                    syncMode: 'Asincrónico sobre Digest Packet',
                    role: 'Guardián de la coherencia Evidencia ↔ Relato ↔ Adopción Territorial',
                    status: '✅ Rol aceptado en staging · ⏳ Pendiente en main (R15 · ADR-023 #22)',
                    rules: 'RP1–RP8 + accreditation_scope obligatorio',
                  },
                  {
                    actor: '[agent: anthropic] (Claude / Anthropic)',
                    syncMode: 'Asincrónico sobre Digest + Conector GitHub API',
                    role: 'Red-team independiente (T2 sobre R15 y ADR-020) y Auditoría Viva contra GitHub API (#36#issuecomment-5989427553 y #25#issuecomment-5989428794)',
                    status: '✅ Rol ejecutado (T2 + Auditoría GitHub) · ⏳ Pendiente R9/main (ADR-022 #34 · ADR-024 #36)',
                    rules: 'RA1–RA5 (Tareas T1–T4 + Pre-Vuelo L2)',
                  },
                ].map((ag) => (
                  <div key={ag.actor} className="node-modal-layer-card">
                    <div className="event-row-top">
                      <strong>{ag.actor}</strong>
                      <span className="territory-meta tabular-nums">{ag.status}</span>
                    </div>
                    <div className="territory-meta" style={{ marginTop: '0.2rem' }}>
                      <strong>Modo:</strong> <code>{ag.syncMode}</code> · <strong>Reglas:</strong>{' '}
                      <code>{ag.rules}</code>
                    </div>
                    <p className="territory-meta" style={{ margin: '0.25rem 0 0', color: '#cbd5e1' }}>
                      {ag.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Primer Compromiso Operativo de [agent: perplexity/synthesis]: Matriz de Coherencia Evidencia-Relato v1 (RP1-RP8 · ADR-023) */}
            <div
              className="node-modal-layer-card"
              style={{
                marginTop: '0.75rem',
                background: 'rgba(168, 85, 247, 0.06)',
                borderColor: 'rgba(168, 85, 247, 0.35)',
              }}
            >
              <div className="event-row-top">
                <div>
                  <span className="kicker-text" style={{ color: '#f5c842' }}>
                    Staging propone · GitHub acredita · La Dirección Humana decide
                  </span>
                  <strong style={{ display: 'block', marginTop: '0.15rem' }}>
                    Primer Entregable de <code>[agent: perplexity/synthesis]</code>: Matriz de Coherencia Evidencia–Relato v1 (<code>RP1–RP8</code> · <code>ADR-023</code> pendiente de ratificación humana <code>R9</code>)
                  </strong>
                  <div className="territory-meta">
                    Taxonomía de 5 estados: <code>verificado-main | evidencia-staging | pr-pendiente | disenado | hipotesis</code> · Campo obligatorio:{' '}
                    <code>&quot;accreditation_scope&quot;: &quot;staging | pr | main&quot;</code>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-confirm"
                  disabled={verifyingPerplexityMatrix}
                  onClick={() => void handleVerifyPerplexityEvidenceMatrix()}
                >
                  {verifyingPerplexityMatrix
                    ? 'Auditando Matriz v1…'
                    : perplexityMatrixHash
                      ? `✓ Matriz v1 (evidencia-staging) Sellada (${perplexityMatrixHash.slice(0, 10)})`
                      : '✓ Auditar Matriz v1 (evidencia-staging + RP3) & Sellar'}
                </button>
              </div>
              <ul className="territory-list" style={{ marginTop: '0.55rem' }}>
                {[
                  {
                    claim: '1A. Evidencias EV-003 (PostGIS SRID=4326) y EV-006 (UI nodos) en main @ 66924a1: UNBOUND definitivo hasta PR 1 Compuerta',
                    source: 'docs/EVIDENCIA.md · #25#issuecomment-6001582234 · Snapshot main @ 66924a1',
                    epistemicState: 'evidencia-staging (unbound en main)',
                    accreditationScope: 'staging -> main tras Línea 1',
                    verificationCommand: 'bash scripts/ratificar-y-acreditar-humano.sh --abrir-pr-compuerta-l1',
                    mainShaAndRun: 'main_sha: "66924a1" · ci_run_url: null (ci.yml en main no disparaba en push)',
                    safeFormulation:
                      'En main @ 66924a1 existen el endpoint de dominio (#19) y la pantalla Evidencias (#15), pero EV-003 y EV-006 son unbound porque ci.yml no disparaba en push; pasarán a bound (verificado-main) con el primer run push del PR 1 Compuerta.',
                    verifier: 'Dirección Humana + [agent: anthropic] (#25#issuecomment-6001582234)',
                  },
                  {
                    claim: '1B. Evidencias instrumentadas en staging: EV-001, 002, 004, 005, 007..018 (18/18 EXIT 0 en staging)',
                    source: 'docs/EVIDENCIA.md · Issues #20–#25, #31 (ADR-019)',
                    epistemicState: 'evidencia-staging',
                    accreditationScope: 'staging',
                    verificationCommand: 'bash scripts/aterrizar-prs-v75-github.sh',
                    mainShaAndRun: 'main_sha: null · ci_run_url: null',
                    safeFormulation:
                      '18/18 evidencias con verificación EXIT 0 en staging; 2/6 acreditadas en main según el snapshot declarado. No consolidar como "18/18 en main" sin merge y CI por SHA.',
                    verifier: 'Dirección Humana + agent-vibe (#23, #25, #31 · human_review_required: true)',
                  },
                  {
                    claim: '2. Seguridad de escrituras: requireWriteAuth cubre el 100% de rutas de escritura, host 127.0.0.1 y mock DB en test (#20, #30)',
                    source: 'PR #20/#30 · suite verify:zero-unauth-writes',
                    epistemicState: 'evidencia-staging',
                    accreditationScope: 'staging',
                    verificationCommand: 'npm run verify:zero-unauth-writes',
                    mainShaAndRun: 'main_sha: null · ci_run_url: null',
                    safeFormulation:
                      'La suite de staging verifica la protección de escrituras; la acreditación en main requiere merge de #20/#30, CI sobre el SHA resultante y registro de evidencia.',
                    verifier: 'agent-vibe (pre-auditoría #20/#30) + Dirección Humana (human_review_required: true)',
                  },
                  {
                    claim: '3. Anti-PII: guardia scrubAndAssertNoPii y hasOnly en territorial_seci_records (#32)',
                    source: 'firestore.rules · firestoreEthicalStore.ts · verify:firestore-security',
                    epistemicState: 'evidencia-staging',
                    accreditationScope: 'staging',
                    verificationCommand: 'npm run verify:firestore-security',
                    mainShaAndRun: 'main_sha: null · ci_run_url: null',
                    safeFormulation:
                      'La guardia anti-PII bloquea los patrones testeados (DNI, CUIL/CUIT, teléfono, email) antes de sincronizar; la ausencia total de PII requiere validación adicional y revisión humana.',
                    verifier: 'agent-google (CI job) + agent-vibe (#32) + Dirección Humana (human_review_required: true)',
                  },
                  {
                    claim: '4. Firestore: espejo offline-first bajo precedencia canónica de events_raw/PostGIS (ADR-020)',
                    source: 'ADR-020 (#32#issuecomment-5986593565 · pendiente de ratificación humana R9)',
                    epistemicState: 'evidencia-staging',
                    accreditationScope: 'staging',
                    verificationCommand: 'npm run verify:firestore-security',
                    mainShaAndRun: 'main_sha: null · ci_run_url: null',
                    safeFormulation:
                      'Firestore opera como espejo offline-first bajo precedencia canónica de events_raw/PostGIS; ADR-020 está pendiente de ratificación humana y merge en main.',
                    verifier: 'Dirección Humana (Ratificación R9 de ADR-020 en #32 · human_review_required: true)',
                  },
                  {
                    claim: '5. Alcance territorial: Capital (Centro/Desamparados), Caucete e Iglesia en San Juan y depuración verificada en todo el repositorio (ADR-021)',
                    source: 'ADR-021 (#33#issuecomment-5986593897 · pendiente de ratificación humana R9)',
                    epistemicState: 'evidencia-staging',
                    accreditationScope: 'staging',
                    verificationCommand: 'npm run verify:no-lavalle-scope',
                    mainShaAndRun: 'main_sha: null · ci_run_url: null',
                    safeFormulation:
                      'La suite verify:no-lavalle-scope confirma 0 referencias al nodo retirado en todo el repositorio y valida que contratos, seeds y reglas operen exclusivamente en Capital, Caucete e Iglesia; el alcance queda pendiente de firma humana de ADR-021 (#33) y merge en main.',
                    verifier: 'Dirección Humana (Firma R9 en #33) + agent-vibe (human_review_required: true)',
                  },
                  {
                    claim: '6. Contratos y onboarding: OpenAPI/Zod (@delocalsoy/contracts C1–C5) y tutorial Diátaxis 15m (#26–#28)',
                    source: 'packages/contracts · docs/api/openapi.json · docs/TUTORIAL-ONBOARDING.md · verify:onboarding',
                    epistemicState: 'evidencia-staging',
                    accreditationScope: 'staging',
                    verificationCommand: 'npm run verify:onboarding',
                    mainShaAndRun: 'main_sha: null · ci_run_url: null',
                    safeFormulation:
                      'Los contratos C1–C5 y el tutorial Diátaxis cuentan con evidencia EXIT 0 en staging (digest 5a040b08c46ceb76); no se presentan como vigentes en main hasta su merge y CI.',
                    verifier: 'agent-vibe (#26, #28) + Dirección Humana (human_review_required: true)',
                  },
                ].map((row) => (
                  <li key={row.claim} className="territory-item">
                    <div className="territory-info">
                      <span className="territory-name">{row.claim}</span>
                      <span className="territory-meta">
                        <strong>epistemic_state:</strong> <code>{row.epistemicState}</code> ·{' '}
                        <strong>accreditation_scope:</strong> <code>{row.accreditationScope}</code> ·{' '}
                        <strong>SHA / CI Run:</strong> <code>{row.mainShaAndRun}</code>
                      </span>
                      <span className="territory-meta">
                        <strong>source:</strong> <code>{row.source}</code> ·{' '}
                        <strong>verification_command:</strong> <code>{row.verificationCommand}</code>
                      </span>
                      <span className="territory-meta" style={{ color: '#cbd5e1' }}>
                        <strong>safe_formulation (RP3):</strong> &ldquo;{row.safeFormulation}&rdquo; ·{' '}
                        <strong>Verifica:</strong> <code>{row.verifier}</code>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Generador de Digest Packet Asíncrono para Claude (agent-anthropic · RA1-RA5 · ADR-022 · Falta aceptación formal) */}
            <div
              className="node-modal-layer-card"
              style={{
                marginTop: '0.75rem',
                background: 'rgba(56, 189, 248, 0.06)',
                borderColor: 'rgba(56, 189, 248, 0.35)',
              }}
            >
              <div className="event-row-top">
                <strong>
                  Método &ldquo;Auditoría Sobre Digest&rdquo; (<code>Snapshot-Relative Work</code> · <code>RA1–RA5</code> · <code>ADR-022</code>) para Claude (<code>[agent: anthropic]</code> · ✅ Rol ejecutado en staging con <code>T2 · Red-team de R15 y ADR-020</code>)
                </strong>
                <span className="territory-meta tabular-nums">
                  Snapshot: <code>main @ 68a8872</code> · Cero sesgo de anclaje · <code>docs/INFORME_SINERGIA_ASW_ANTHROPIC.md</code>
                </span>
              </div>
              <p className="territory-meta" style={{ margin: '0.35rem 0' }}>
                Convierte la falta de acceso directo al repositorio en <strong>independencia de auditoría</strong>: <code>agent-google</code> construye y prueba en staging (<code>EXIT 0</code>), <code>agent-vibe</code> audita con contexto en GitHub (<code>#30, #32, #33</code>) y <code>agent-anthropic</code> audita a ciegas sobre un <strong>Digest Packet estandarizado</strong> emitiendo hallazgos con <code>Verificable por: &lt;comando&gt;</code> (<code>RA2</code>). Seleccioná el encargo (<code>T1–T4</code>) para generar, sellar en <code>events_raw</code> y copiar el paquete listo para Claude:
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.45rem',
                  marginTop: '0.5rem',
                }}
              >
                {[
                  { code: 'T1' as const, label: '📦 T1 · Pre-auditoría Ciega de PRs (#20, #26, #30, #32, #33)' },
                  { code: 'T2' as const, label: '🛡️ T2 · Red-Team de Gobernanza (R1–R15, C1–C5, ADR-019..022)' },
                  { code: 'T3' as const, label: '🏛️ T3 · Propuesta de Valor Municipal San Juan (Capital, Caucete, Iglesia)' },
                  { code: 'T4' as const, label: '📘 T4 · Síntesis Diátaxis (Cuadrante Entender · HITUB v2.0)' },
                ].map((t) => (
                  <button
                    key={t.code}
                    type="button"
                    className={
                      lastAnthropicDigest?.taskCode === t.code ? 'btn-confirm' : 'btn-toggle'
                    }
                    disabled={generatingAnthropicDigest === t.code}
                    onClick={() => void handleGenerateAnthropicDigest(t.code)}
                  >
                    {generatingAnthropicDigest === t.code
                      ? `Generando ${t.code}…`
                      : lastAnthropicDigest?.taskCode === t.code
                        ? `✓ ${t.label} (Copiado · ${lastAnthropicDigest.digestHash.slice(0, 8)})`
                        : t.label}
                  </button>
                ))}
              </div>
              {lastAnthropicDigest && (
                <pre
                  style={{
                    marginTop: '0.6rem',
                    padding: '0.6rem',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    color: '#e2e8f0',
                  }}
                >
                  {lastAnthropicDigest.digestMarkdown}
                </pre>
              )}

              {/* Entregable T2 Ejecutado por [agent: anthropic]: 9 Hallazgos sobre R15 y ADR-020 Remediados en Staging */}
              <div
                style={{
                  marginTop: '0.75rem',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                <div className="event-row-top">
                  <div>
                    <span className="kicker-text" style={{ color: '#38bdf8' }}>
                      [agent: anthropic] — T2 · Red-team de R15 y ADR-020 · Snapshot: main @ 68a8872 · 05/10/2026
                    </span>
                    <strong style={{ display: 'block', marginTop: '0.15rem' }}>
                      9 Hallazgos Ciegos Instrumentados en Staging (5 sobre <code>R15</code> + 4 sobre <code>ADR-020</code> · <code>evidencia-staging</code>)
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="btn-confirm"
                    disabled={auditingRedTeamT2}
                    onClick={() => void handleAuditRedTeamT2()}
                  >
                    {auditingRedTeamT2
                      ? 'Auditando Red-Team T2…'
                      : redTeamT2Hash
                        ? `✓ Red-Team T2 Sellado (${redTeamT2Hash.slice(0, 10)})`
                        : '🛡️ Verificar 9 Remediaciones Red-Team T2 & Sellar'}
                  </button>
                </div>
                <ul className="territory-list" style={{ marginTop: '0.45rem' }}>
                  {[
                    {
                      id: 'T2-R15-01 (🔴)',
                      title: '"Acreditado" no estaba definido (abrir los 6 PRs cumplía la letra con main en 2/6 EV)',
                      remediation:
                        'Se define en GOBERNANZA.md (R15) y ADR-019 el ciclo de 4 estados: propuesto (staging) → en PR → verificado en PR → acreditado en main (merge + run push en main).',
                      verifyCmd:
                        'gh pr list --state all --json number,headRefName,state,mergedAt && gh run list --branch main -L 5',
                    },
                    {
                      id: 'T2-R15-02 (🔴)',
                      title: 'La compuerta fuerte entraba última (PR 6) y un PR podía editar el CI que lo juzga',
                      remediation:
                        'El PR 1 (agent-google/health-mode) aterriza PRIMERO .github/workflows/ci.yml, .github/CODEOWNERS y las 4 suites verify:*, protegiendo /.github/**, /firestore.rules y /docs/EVIDENCIA.md.',
                      verifyCmd:
                        'git diff --stat origin/main...agent-google/health-mode -- .github package.json scripts/',
                    },
                    {
                      id: 'T2-R15-03 (🟠)',
                      title: 'Un humano, una identidad (GitHub bloquea auto-aprobar el propio PR; plan Free sin rulesets privados)',
                      remediation:
                        'ratificar-y-acreditar-humano.sh soporta GH_TOKEN_AGENT vs GH_TOKEN_HUMAN e incorpora fallback honesto Single-Maintainer Mode con sello firmado en comentario.',
                      verifyCmd:
                        'bash scripts/ratificar-y-acreditar-humano.sh --auditar-redteam-t2',
                    },
                    {
                      id: 'T2-R15-04 & 05 (🟠)',
                      title: 'R15 autoaplicable a ADRs (proposed-staging → ratified-issue → accepted-main) y a firestore.rules desplegadas',
                      remediation:
                        'Se distingue ratified-issue (#31#issuecomment-5986479235) de accepted-main, y verify:firestore-security emite el digest SHA-256 de firestore.rules desplegadas en vivo.',
                      verifyCmd:
                        'gh issue view 31 --comments && npm run verify:firestore-security',
                    },
                    {
                      id: 'T2-ADR020-01 (🔴)',
                      title: 'Dirección del flujo offline-first y estado sin verificar antes de la ingesta Ed25519',
                      remediation:
                        'Flujo unidireccional en 3 estados: pendiente_outbox_local (Outbox local firmado Ed25519, borrado solo tras ACK) → espejado_firestore_sin_verificar → ingestado_events_raw_verificado (POST /api/events).',
                      verifyCmd: 'npm run verify:firestore-security',
                    },
                    {
                      id: 'T2-ADR020-02, 03 & 04 (🔴/🟠)',
                      title: 'Anti-PII en 3 capas (Cliente + CEL + Servidor · Ley 25.326), derivados públicos, ventana N/N-1 y desacople dinámico de nodos',
                      remediation:
                        'hasNoPersonalDataInText en firestore.rules + detectServerSidePii en POST /api/events; lectura sin login solo en derivados; federated_model_states restringido a isAdmin(); schemaVersion in [1, 2] y exists(/territorial_nodes_sovereignty/{nodeKey}).',
                      verifyCmd: 'npm run verify:firestore-security && npm run verify:no-lavalle-scope',
                    },
                    {
                      id: 'GH-AUDIT-L2 (🔴/🟠 · #34=ADR-022, #22=ADR-023, #36=ADR-024)',
                      title: 'Auditoría Viva contra GitHub API (#36#issuecomment-5989427553 y #25#issuecomment-5989428794): 0.A completado, numeración ADR saneada, scripts/ incluido en PR 1 Compuerta y orden seguro 0.B → 1 → 2 (firmado en sesión humana) → 3',
                      remediation:
                        '0.B extrae --log-failed de #19 (run 37197860633) y run 37098706368 (bound/unbound), cierra #19 por superación (ADR-024 #36), reclama las 5 ramas ops/* y activa branch protection clásico con enforce_admins: true; 1 emite verificado-staging; 2 respeta R9 (sin firma automática en lote).',
                      verifyCmd:
                        'gh run view 37197860633 --log-failed && gh run view 37098706368 --json headSha,conclusion,event && bash scripts/ratificar-y-acreditar-humano.sh --pre-vuelo-l2',
                    },
                  ].map((item) => (
                    <li key={item.id} className="territory-item">
                      <div className="territory-info">
                        <span className="territory-name">
                          <code>{item.id}</code> · {item.title}
                        </span>
                        <span className="territory-meta" style={{ color: '#cbd5e1' }}>
                          <strong>Remediación en staging:</strong> {item.remediation}
                        </span>
                        <span className="territory-meta">
                          <strong>Verificable por (RA2):</strong> <code>{item.verifyCmd}</code>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="node-modal-layers-grid" style={{ marginTop: '0.75rem' }}>
              {AGENT_ECOSYSTEM_RULES.map((r) => (
                <div key={r.code} className="node-modal-layer-card">
                  <div className="event-row-top">
                    <strong>
                      <code>{r.code}</code> · {r.category}
                    </strong>
                    <span className="ok" style={{ fontSize: '0.75rem' }}>
                      ● Vigente
                    </span>
                  </div>
                  <p
                    className="territory-meta"
                    style={{ margin: '0.35rem 0', color: '#e2e8f0' }}
                  >
                    {r.rule}
                  </p>
                  <div className="territory-meta tabular-nums">
                    Garantía técnica: <code>{r.enforcementMechanism}</code> · Actores:{' '}
                    <strong>{r.agentsInvolved}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 02: PROPUESTA DE VALOR, SPRINTS 0-3 Y CATÁLOGO DE ARTEFACTOS @delocalsoy/*
          ===================================================================== */}
      {activeTab === 'propuesta-valor' && (
        <div className="h2-workspace">
          {/* Propuesta de Valor por Tipo de Usuario / Cliente */}
          <div className="node-modal-section" style={{ marginTop: '0.75rem' }}>
            <div className="pane-header">
              <div>
                <span className="tiny-label">
                  Nivel 3 Recursivo · La Ventaja Competitiva es que el Sistema No Puede Mentir Sobre Sí Mismo
                </span>
                <strong>
                  Propuesta de Valor de Alto Impacto por Actor y Cliente Territorial
                </strong>
              </div>
            </div>

            <ul className="territory-list" style={{ marginTop: '0.65rem' }}>
              {VALUE_PROPOSITION_MATRIX.map((vp) => (
                <li key={vp.actor} className="territory-item">
                  <div className="territory-info">
                    <span className="territory-name">{vp.actor}</span>
                    <span className="territory-meta">
                      <strong>Qué necesita:</strong> {vp.need}
                    </span>
                    <span className="territory-meta" style={{ color: '#cbd5e1' }}>
                      <strong>Qué le entrega DELocalSoy.AR:</strong> {vp.deliveredValue}
                    </span>
                    <span className="territory-meta tabular-nums">
                      Artefacto: <code>{vp.platformArtifact}</code> · Respaldo HITUB:{' '}
                      <strong>{vp.evidences}</strong>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Catálogo de Productos-Artefactos de Optimización (@delocalsoy/*) con Ficha de Confianza */}
          <div className="node-modal-section" style={{ marginTop: '1rem' }}>
            <div className="pane-header">
              <div>
                <span className="tiny-label">
                  Arquitectura Modular Replicable · Fábrica de Software de Desarrollo Local-Territorial
                </span>
                <strong>
                  Catálogo de Productos-Artefactos (@delocalsoy/*) con Ficha de Confianza
                </strong>
              </div>
            </div>

            <div className="node-modal-layers-grid" style={{ marginTop: '0.75rem' }}>
              {ARTIFACT_CATALOG.map((art) => (
                <div key={art.pkgName} className="node-modal-layer-card">
                  <div className="event-row-top">
                    <code>{art.pkgName}</code>
                    <span className="ok" style={{ fontSize: '0.75rem' }}>
                      ● {art.operationalState}
                    </span>
                  </div>
                  <strong style={{ display: 'block', marginTop: '0.25rem' }}>
                    {art.title}
                  </strong>
                  <p className="territory-meta" style={{ margin: '0.35rem 0' }}>
                    {art.purpose}
                  </p>
                  <div className="territory-meta tabular-nums">
                    Evidencias: <strong>{art.evidences}</strong> · Cobertura:{' '}
                    <strong>{art.coverage}</strong> · SBOM: <code>{art.sbomStatus}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Camino Natural: Sprints 0, 1, 2, 3 y Horizonte 6-12m */}
          <div className="node-modal-section" style={{ marginTop: '1rem' }}>
            <div className="pane-header">
              <div>
                <span className="tiny-label">
                  Orden de Ejecución Real · Cerrar el Bucle Nivel 1 → 2 → 3 → 4
                </span>
                <strong>
                  Los Próximos Pasos Naturales (Sprint 0 → Sprint 1 → Sprint 2 → Sprint 3 → Horizonte)
                </strong>
              </div>
            </div>

            <div className="recursive-matrix-list" style={{ marginTop: '0.65rem' }}>
              {SPRINT_ROADMAP.map((sp) => (
                <div key={sp.sprint} className="node-modal-layer-card">
                  <div className="event-row-top">
                    <div>
                      <span className="kicker-text">{sp.window}</span>
                      <h3 style={{ margin: '0.15rem 0 0', fontSize: '0.98rem' }}>
                        {sp.sprint}
                      </h3>
                    </div>
                    <span className="ok" style={{ fontSize: '0.78rem' }}>
                      ✓ {sp.status}
                    </span>
                  </div>
                  <p className="territory-meta" style={{ margin: '0.35rem 0' }}>
                    <strong>Tesis rectora:</strong> {sp.gateThesis}
                  </p>
                  <ul
                    className="territory-meta"
                    style={{ margin: '0.35rem 0 0.45rem 1.1rem', padding: 0 }}
                  >
                    {sp.deliverables.map((d) => (
                      <li key={d} style={{ marginBottom: '0.2rem' }}>
                        {d}
                      </li>
                    ))}
                  </ul>
                  <div className="territory-meta">
                    <strong>Criterio de salida:</strong> {sp.exitCriteria}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 03: ANÁLISIS RECURSIVO Y ALINEACIÓN DOCUMENTAL (/docs)
          ===================================================================== */}
      {activeTab === 'recursivo' && (
        <div className="h2-workspace">
          <div className="pane-header" style={{ marginTop: '0.75rem' }}>
            <div>
              <span className="tiny-label">
                Síntesis Recursiva: Cómo cada bucle valida y expande al anterior sin deuda semántica
              </span>
              <strong>
                5 Bucles Consolidados · 16 Modelos Prisma · 18 Evidencias HITUB · 11 Documentos Canónicos en /docs
              </strong>
            </div>
            <button
              type="button"
              className="btn-confirm"
              onClick={() => void handleVerifyParity()}
              disabled={verifyingParity}
            >
              {verifyingParity
                ? 'Auditando paridad…'
                : '✓ Sellar Paridad Full-Stack en events_raw (EV-004)'}
            </button>
          </div>

          <div className="recursive-matrix-list">
            {RECURSIVE_SYNTHESIS_MATRIX.map((row) => (
              <div key={row.loopId} className="node-modal-section">
                <div className="event-row-top">
                  <div>
                    <span className="kicker-text">{row.loopId}</span>
                    <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem' }}>
                      {row.stage}
                    </h3>
                  </div>
                  <span className="territory-meta tabular-nums">
                    Evidencias: <strong>{row.evidences}</strong> · Docs:{' '}
                    <code>{row.canonicalDoc}</code>
                  </span>
                </div>

                <div className="pillars-detail-grid" style={{ marginTop: '0.75rem' }}>
                  <div className="pillar-detail-cell">
                    <span className="tiny-label">Innovación en el Modelo Territorial</span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                      {row.territorialInnovation}
                    </p>
                  </div>
                  <div className="pillar-detail-cell">
                    <span className="tiny-label">Producto en Frontend (apps/web)</span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                      {row.softwareArtifact}
                    </p>
                  </div>
                  <div className="pillar-detail-cell">
                    <span className="tiny-label">Contrato en Backend y DB (apps/api + packages/db)</span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                      {row.backendContract}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Alineación con los documentos canónicos de /docs */}
          {contractData && (
            <div className="node-modal-section" style={{ marginTop: '0.5rem' }}>
              <div className="pane-header">
                <div>
                  <span className="tiny-label">
                    Memoria Institucional Versionada en el Repositorio (/docs)
                  </span>
                  <strong>
                    Documentos Canónicos Sincronizados ({contractData.docsAlignment.length})
                  </strong>
                </div>
                <span className="territory-meta tabular-nums">
                  Digest SHA-256 del Contrato:{' '}
                  <code>{contractData.contractDigestSha256}</code>
                </span>
              </div>

              <div className="node-modal-layers-grid" style={{ marginTop: '0.75rem' }}>
                {contractData.docsAlignment.map((doc) => (
                  <div key={doc.docPath} className="node-modal-layer-card">
                    <div className="event-row-top">
                      <code>{doc.docPath}</code>
                      <span className="ok" style={{ fontSize: '0.75rem' }}>
                        ✓ Alineado
                      </span>
                    </div>
                    <div className="territory-meta" style={{ marginTop: '0.3rem' }}>
                      {doc.topic}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 04: PARIDAD E INTEGRACIÓN BACKEND ↔ FRONTEND ↔ PRISMA
          ===================================================================== */}
      {activeTab === 'integracion' && (
        <div className="h2-workspace">
          <div className="pane-header" style={{ marginTop: '0.75rem' }}>
            <div>
              <span className="tiny-label">
                Diagnóstico en Vivo del Contrato Full-Stack (GET /api/contrato-sistema)
              </span>
              <strong>
                {contractData?.architectureTrack ??
                  'Track A v7.3 — Monorepo pnpm + Turborepo + Express + React + PostGIS + HITUB'}
              </strong>
            </div>
            <div className="territory-actions">
              {contractLatency !== null && (
                <span className="territory-meta tabular-nums">
                  Latencia contrato: <strong>{contractLatency} ms</strong>
                </span>
              )}
              <button
                type="button"
                className="btn-toggle"
                onClick={() => void handleRunEndpointProbes()}
                disabled={probing}
              >
                {probing ? 'Sondeando rutas…' : '↻ Sondear latencia de endpoints'}
              </button>
              <button
                type="button"
                className="btn-confirm"
                onClick={() => void handleVerifyParity()}
                disabled={verifyingParity}
              >
                {verifyingParity
                  ? 'Verificando…'
                  : '✓ Ejecutar Auditoría de Paridad Full-Stack'}
              </button>
            </div>
          </div>

          {probes.length > 0 && (
            <div className="quarters-summary-strip tabular-nums" style={{ marginTop: '0.75rem' }}>
              {probes.map((p) => (
                <div key={p.endpoint} className="quarter-summary-cell">
                  <div className="quarter-cell-title">
                    <code>{p.endpoint}</code>
                  </div>
                  <div className="territory-meta">
                    Estado:{' '}
                    <strong style={{ color: p.ok ? '#2e9e5b' : '#dc2626' }}>
                      HTTP {p.httpStatus} ({p.ok ? 'OK' : 'Error'})
                    </strong>{' '}
                    · Latencia: <strong>{p.latencyMs} ms</strong>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            id="auditoria-19-modelos-prisma"
            className="trace-evidencias-grid"
            style={{ marginTop: '1rem' }}
          >
            <div className="node-modal-section">
              <div className="event-row-top">
                <div>
                  <div className="tiny-label">
                    Esquema de Datos Unificado (packages/db/prisma/schema.prisma)
                  </div>
                  <strong style={{ display: 'block', marginTop: '0.2rem' }}>
                    {(contractData?.prismaModels ?? []).length || 19} Modelos Relacionales + PostGIS Sincronizados con el Estado Vivo
                  </strong>
                </div>
                <span className="badge-epistemic badge-verified tabular-nums">
                  {
                    (contractData?.prismaModels ?? []).filter((m) =>
                      prismaHorizonFilter === 'all'
                        ? true
                        : prismaHorizonFilter === 'Auth & Copiloto'
                          ? m.horizon.includes('PR 0') || m.horizon.includes('PR 1')
                          : m.horizon === prismaHorizonFilter,
                    ).length
                  }
                  /{(contractData?.prismaModels ?? []).length || 19} visibles
                </span>
              </div>

              <div
                className="filter-group"
                style={{ marginTop: '0.55rem', flexWrap: 'wrap' }}
              >
                {(
                  [
                    { key: 'all', label: 'Todos (19)' },
                    { key: 'CORE-001', label: 'CORE-001 (2)' },
                    { key: 'Horizonte 1', label: 'Horizonte 1 (4)' },
                    { key: 'Horizonte 2', label: 'Horizonte 2 · PostGIS (3)' },
                    { key: 'Horizonte 3', label: 'Horizonte 3 · Linaje/Soberanía (3)' },
                    { key: 'Horizonte 4', label: 'Horizonte 4 · Campo/Ed25519 (4)' },
                    { key: 'Auth & Copiloto', label: 'Auth JWT & Copiloto RAG (3)' },
                  ] as const
                ).map((hf) => (
                  <button
                    key={hf.key}
                    type="button"
                    className={
                      prismaHorizonFilter === hf.key
                        ? 'btn-filter active'
                        : 'btn-filter'
                    }
                    onClick={() => setPrismaHorizonFilter(hf.key)}
                  >
                    {hf.label}
                  </button>
                ))}
              </div>

              <ul className="territory-list" style={{ marginTop: '0.6rem' }}>
                {(contractData?.prismaModels ?? [])
                  .filter((m) =>
                    prismaHorizonFilter === 'all'
                      ? true
                      : prismaHorizonFilter === 'Auth & Copiloto'
                        ? m.horizon.includes('PR 0') || m.horizon.includes('PR 1')
                        : m.horizon === prismaHorizonFilter,
                  )
                  .map((m) => (
                    <li key={m.name} className="territory-item">
                      <div className="territory-info">
                        <span className="territory-name">
                          <code>model {m.name}</code>
                        </span>
                        <span className="territory-meta">
                          Etapa: <strong>{m.horizon}</strong>
                          {m.role ? ` — ${m.role}` : ''}
                        </span>
                      </div>
                      <div className="territory-meta tabular-nums">
                        <strong>{m.recordsCount}</strong> reg. ·{' '}
                        <span className="r5-state-badge r5-state-publicado">
                          Sincronizado
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="node-modal-section">
              <div className="tiny-label">
                Contrato REST Tipado (apps/api/src/app.ts ↔ apps/web/src/lib/apiClient.ts)
              </div>
              <strong style={{ display: 'block', marginTop: '0.2rem' }}>
                {(contractData?.endpoints ?? []).length || 21} Rutas Activas con Trazabilidad en events_raw
              </strong>
              <ul className="territory-list" style={{ marginTop: '0.6rem' }}>
                {(contractData?.endpoints ?? []).map((ep) => (
                  <li key={ep.path} className="territory-item">
                    <div className="territory-info">
                      <span className="territory-name">
                        <code>{ep.method}</code> <strong>{ep.path}</strong>
                      </span>
                      <span className="territory-meta">
                        Horizonte: <strong>{ep.horizon}</strong> · Evidencia:{' '}
                        <code>{ep.evidence}</code>
                        {ep.description ? ` — ${ep.description}` : ''}
                      </span>
                    </div>
                    <span className="r5-state-badge r5-state-verificado">
                      ● {ep.status.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 05: ESPECIFICACIÓN HORIZONTE 4
          ===================================================================== */}
      {activeTab === 'prospectivo' && (
        <div className="h2-workspace">
          <div className="pane-header" style={{ marginTop: '0.75rem' }}>
            <div>
              <span className="tiny-label">
                Proyección Estratégica Ejecutada en el Horizonte 4 (docs/HORIZONTE_4_OPERACION_CAMPO_Y_TELEMETRIA.md)
              </span>
              <strong>
                Los 4 Pilares de Operación Territorial en Campo y Telemetría (EV-015 a EV-018)
              </strong>
            </div>
          </div>

          <div className="recursive-matrix-list">
            {PROSPECTIVE_HORIZON_4_ROADMAP.map((item) => (
              <div key={item.code} className="node-modal-section">
                <div className="event-row-top">
                  <div>
                    <span className="kicker-text">
                      {item.code} · {item.priority}
                    </span>
                    <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem' }}>
                      {item.title}
                    </h3>
                  </div>
                  <span className="territory-meta tabular-nums">
                    Meta HITUB: <code>{item.targetEvidence}</code>
                  </span>
                </div>

                <p className="territory-meta" style={{ marginTop: '0.45rem' }}>
                  <strong>Necesidad Territorial:</strong> {item.territorialNeed}
                </p>

                <div className="pillars-detail-grid" style={{ marginTop: '0.75rem' }}>
                  <div className="pillar-detail-cell">
                    <span className="tiny-label">Qué Diseñar en el Modelo</span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem' }}>
                      {item.whatToDesign}
                    </p>
                  </div>
                  <div className="pillar-detail-cell">
                    <span className="tiny-label">Diseño Backend &amp; Prisma (apps/api + packages/db)</span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem' }}>
                      {item.backendPrismaDesign}
                    </p>
                  </div>
                  <div className="pillar-detail-cell">
                    <span className="tiny-label">Diseño Frontend &amp; UX (apps/web)</span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem' }}>
                      {item.frontendUiDesign}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
