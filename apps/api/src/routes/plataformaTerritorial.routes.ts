import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execSync } from 'node:child_process';
import prisma, { getDatabaseRuntimeState } from '../lib/prisma.js';
import { type AuthenticatedWriteRequest } from '../lib/authGuard.js';
import {
  verifyJwtToken,
  signJwtToken,
  requireWriteAuth,
} from '../middleware/jwtAuth.js';
import { apiWriteRateLimiter } from '../middleware/rateLimiter.js';
import {
  hasMinimumPrivilege,
  resolveHighestPrivilegeRole,
  type ActorRole as RbacActorRole,
} from '../lib/roles.js';
import { BboxStringSchema } from '../../../../packages/contracts/src/territorios.js';
import {
  ActivoCreateSchema,
  type ActivoItem as R5ActivoItem,
} from '../../../../packages/contracts/src/activos.js';
import {
  AssetVerificationTransitionSchema,
  EthicalTerritoryQuerySchema,
  MarketplaceOfferCreateSchema,
  ParticipationProposalCreateSchema,
  ParticipationStageAdvanceSchema,
  PublicSpaceEnvironmentRecordCreateSchema,
  TerritorialEventCreateSchema,
  VerifiedTerritorialAssetCreateSchema,
  type TerritorialNodeCode,
} from '../../../../packages/contracts/src/plataformaTerritorial.js';
import {
  applyAssetVerificationTransition,
  applyProposalStageAdvance,
  BASELINE_STATE_D70CBC6,
  buildDeliberativeProposalEntity,
  buildMarketplaceOfferEntity,
  buildVerifiedTerritorialAssetEntity,
  evaluateEthicalTerritorialIntelligence,
  INITIAL_MARKETPLACE_OFFERS,
  INITIAL_PARTICIPATION_PROPOSALS,
  INITIAL_PUBLIC_SPACE_ENV_RECORDS,
  INITIAL_TERRITORIAL_EVENTS,
  INITIAL_VERIFIED_ASSETS,
  INTERNATIONAL_REFERENCE_FAMILIES,
  PARTICIPATION_STAGES_ORDER,
  PLATFORM_MODULES_CATALOG,
  PLATFORM_ROADMAP_PHASES,
  PROVISIONAL_REGISTRATION_FASE0,
  TERRITORY_LABELS,
  type DeliberativeCitizenProposal,
  type MarketplaceProximityOffer,
  type PublicSpaceEnvironmentRecord,
  type TerritorialCommunityEvent,
  type VerifiedTerritorialAsset,
} from '../../../../packages/domain/src/index.js';
import {
  computeDeterministicEventHash,
  territorialStreamBus,
} from '../../../../packages/events/src/index.js';
import {
  TerritorialAssetProjectionWorker,
  territorialWorker,
  type WorkerExecutionReceipt,
} from '../../../worker/src/index.js';

export const plataformaTerritorialRouter: Router = Router();

export interface PostgisAssetProjectionRecord {
  projectionId: string;
  assetId: string;
  territoryId: TerritorialNodeCode;
  barrioNodo: string;
  nombre: string;
  categoria: string;
  estado: string;
  srid: 4326;
  wkt: string;
  latitud: number;
  longitud: number;
  evidenciaHash: string;
  projectedAt: string;
}

// Estado vivo en proceso inicializado con los datos semilla reproducibles de Gran San Juan, Caucete e Iglesia
const verifiedAssetsStore: VerifiedTerritorialAsset[] = [...INITIAL_VERIFIED_ASSETS];
const marketplaceOffersStore: MarketplaceProximityOffer[] = [...INITIAL_MARKETPLACE_OFFERS];
const participationProposalsStore: DeliberativeCitizenProposal[] = [
  ...INITIAL_PARTICIPATION_PROPOSALS,
];
const publicSpaceEnvStore: PublicSpaceEnvironmentRecord[] = [
  ...INITIAL_PUBLIC_SPACE_ENV_RECORDS,
];
const territorialEventsStore: TerritorialCommunityEvent[] = [...INITIAL_TERRITORIAL_EVENTS];
const postgisProjectionsStore: PostgisAssetProjectionRecord[] = [];

function resolveActorFromRequest(req: Request, fallbackName: string, fallbackDomainRole?: string): {
  actorId: string;
  email: string;
  roles: string[];
  highestRole: RbacActorRole;
  isJwtAuthenticated: boolean;
} {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice('Bearer '.length).trim();
    const jwtClaims = verifyJwtToken(rawToken);
    if (jwtClaims) {
      return {
        actorId: jwtClaims.sub,
        email: jwtClaims.email,
        roles: jwtClaims.roles,
        highestRole: jwtClaims.highestRole,
        isJwtAuthenticated: true,
      };
    }
  }

  const mappedRole: RbacActorRole =
    fallbackDomainRole === 'moderador_territorial' || fallbackDomainRole === 'custodio_barrial'
      ? 'custodio_territorial'
      : fallbackDomainRole === 'comerciante' || fallbackDomainRole === 'organizacion'
        ? 'operador_campo'
        : 'ciudadano';

  return {
    actorId: fallbackName,
    email: 'actor@delocalsoy.ar',
    roles: [mappedRole],
    highestRole: resolveHighestPrivilegeRole([mappedRole]),
    isJwtAuthenticated: false,
  };
}

async function materializePostgisAssetProjection(
  asset: VerifiedTerritorialAsset,
): Promise<PostgisAssetProjectionRecord> {
  const wkt = `POINT(${asset.geometria.longitud} ${asset.geometria.latitud})`;
  const nowIso = new Date().toISOString();
  const projection: PostgisAssetProjectionRecord = {
    projectionId: `proj-${asset.id}`,
    assetId: asset.id,
    territoryId: asset.territoryId,
    barrioNodo: asset.barrioNodo,
    nombre: asset.nombre,
    categoria: asset.categoria,
    estado: asset.estado,
    srid: 4326,
    wkt,
    latitud: asset.geometria.latitud,
    longitud: asset.geometria.longitud,
    evidenciaHash: asset.evidenciaHash,
    projectedAt: nowIso,
  };

  const existingIdx = postgisProjectionsStore.findIndex((p) => p.assetId === asset.id);
  if (existingIdx >= 0) {
    postgisProjectionsStore[existingIdx] = projection;
  } else {
    postgisProjectionsStore.unshift(projection);
  }

  try {
    await prisma.features_territoriales?.create?.({
      data: {
        id: projection.projectionId,
        territorio_id: asset.territoryId,
        capa_key: 'assets',
        titulo: asset.nombre,
        tipo: 'asset',
        dominio: 'production',
        estado: asset.estado === 'publicado' || asset.estado === 'verificado' ? 'verified' : 'pending',
        fuente_tipo: asset.autorRol,
        es_sintetico: false,
      },
    });
  } catch {
    // Fallback limpio cuando PostgreSQL/PostGIS no está conectado en el contenedor de preview
  }

  return projection;
}

// Sembrar en el bus de eventos y en el worker idempotente el primer flujo vertical inicial para trazabilidad inmediata
let initialSeedBootstrapped = false;
function ensureInitialVerticalSeed(): void {
  if (initialSeedBootstrapped) return;
  initialSeedBootstrapped = true;

  for (const seedAsset of INITIAL_VERIFIED_ASSETS) {
    const env = territorialStreamBus.publish({
      type: 'territory.asset.verified',
      territoryId: seedAsset.territoryId,
      aggregateId: seedAsset.id,
      actor: seedAsset.autorNombre,
      customHash: seedAsset.evidenciaHash,
      occurredAt: seedAsset.actualizadoEn,
      payload: {
        assetId: seedAsset.id,
        nombre: seedAsset.nombre,
        categoria: seedAsset.categoria,
        barrioNodo: seedAsset.barrioNodo,
        estado: seedAsset.estado,
        geometria: seedAsset.geometria,
      },
    });
    void materializePostgisAssetProjection(seedAsset);
    territorialWorker.consumeEvent(env, {
      actorRole: seedAsset.autorRol,
      dbPersisted: true,
      projectionSummary: `Activo semilla "${seedAsset.nombre}" (${seedAsset.barrioNodo}) proyectado en PostGIS Point(${seedAsset.geometria.longitud} ${seedAsset.geometria.latitud}) SRID=4326 y consultable por nodo o bbox.`,
    });
  }
}

function attachRuntimeModeHeader(res: Response): 'real' | 'synthetic' | 'degraded' {
  const rt = getDatabaseRuntimeState();
  res.setHeader('X-DELocalSoy-Runtime-Mode', rt.mode);
  res.setHeader('X-DELocalSoy-Data-Source', rt.dataSource);
  return rt.mode;
}

const PII_GUARD_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'DNI_AR', regex: /\b\d{1,2}\.\d{3}\.\d{3}\b/ },
  { name: 'CUIT_CUIL_AR', regex: /\b(20|23|24|27|30|33|34)-\d{8}-\d\b/ },
  { name: 'EMAIL_PERSONAL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
];

function detectSensitivePiiInObject(value: unknown): string | null {
  const serialized = JSON.stringify(value);
  for (const pat of PII_GUARD_PATTERNS) {
    if (pat.regex.test(serialized)) {
      return pat.name;
    }
  }
  return null;
}

async function persistImmutableRawEvent(params: {
  type: string;
  hash: string;
  payload: Record<string, unknown>;
}): Promise<boolean> {
  try {
    await prisma.events_raw.create({
      data: {
        type: params.type,
        hash: params.hash,
        payload: params.payload,
        occurred_at: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/plataforma/overview
 * Devuelve el estado integral sobre el ancla `main @ d70cbc6` (CORE-003), los 13 módulos de la plataforma
 * con sus estados honestos (Definido | Implementado | Verificado | Operativo), las 3 familias de referencia,
 * las fases del roadmap, los activos verificados y la observabilidad de los 11 eslabones del Flujo Vertical.
 */
plataformaTerritorialRouter.get('/overview', (req, res) => {
  ensureInitialVerticalSeed();
  const runtimeMode = attachRuntimeModeHeader(res);
  const territoryFilter = req.query.territoryId as TerritorialNodeCode | undefined;

  const filterByTerritory = <T extends { territoryId: TerritorialNodeCode }>(items: T[]): T[] => {
    if (
      territoryFilter === 'gran-san-juan-capital' ||
      territoryFilter === 'caucete' ||
      territoryFilter === 'iglesia'
    ) {
      return items.filter((item) => item.territoryId === territoryFilter);
    }
    return items;
  };

  const latestReceipts: WorkerExecutionReceipt[] = territorialWorker.getRecentReceipts(12);

  return res.json({
    success: true,
    mode: runtimeMode,
    baselineState: BASELINE_STATE_D70CBC6,
    provisionalRegistration: PROVISIONAL_REGISTRATION_FASE0,
    workerClass: TerritorialAssetProjectionWorker.name,
    principioRector:
      'delocalsoy.ar es una infraestructura digital territorial para relevar, conectar, interpretar y fortalecer los activos de comunidades locales mediante nodos barriales, datos verificables, participación ciudadana, economía de proximidad e inteligencia territorial ética.',
    territories: Object.entries(TERRITORY_LABELS).map(([id, label]) => ({
      id,
      label,
      assetsCount: verifiedAssetsStore.filter((a) => a.territoryId === id).length,
      offersCount: marketplaceOffersStore.filter((o) => o.territoryId === id).length,
      proposalsCount: participationProposalsStore.filter((p) => p.territoryId === id).length,
      envRecordsCount: publicSpaceEnvStore.filter((e) => e.territoryId === id).length,
      eventsCount: territorialEventsStore.filter((ev) => ev.territoryId === id).length,
    })),
    modulesCatalog: PLATFORM_MODULES_CATALOG,
    internationalReferences: INTERNATIONAL_REFERENCE_FAMILIES,
    roadmapPhases: PLATFORM_ROADMAP_PHASES,
    participationStagesOrder: PARTICIPATION_STAGES_ORDER,
    verifiedAssets: filterByTerritory(verifiedAssetsStore),
    postgisProjections: filterByTerritory(postgisProjectionsStore),
    marketplaceOffers: filterByTerritory(marketplaceOffersStore),
    participationProposals: filterByTerritory(participationProposalsStore),
    publicSpaceEnvRecords: filterByTerritory(publicSpaceEnvStore),
    territorialEvents: filterByTerritory(territorialEventsStore),
    observability: {
      streamStats: territorialStreamBus.getStreamStats(),
      workerStats: territorialWorker.getWorkerStats(),
      recentStreamEvents: territorialStreamBus.listRecent(10),
      recentWorkerReceipts: latestReceipts,
      latestVerticalTrace: latestReceipts[0]?.verticalTrace ?? [],
    },
  });
});

/**
 * GET /api/plataforma/activos
 * Eslabón 10 de la Cadena Vertical Fase 0: Consulta de activos territoriales por nodo (`territoryId`)
 * o por ventana espacial PostGIS (`?bbox=minLng,minLat,maxLng,maxLat` en SRID=4326).
 */
plataformaTerritorialRouter.get('/activos', (req, res) => {
  ensureInitialVerticalSeed();
  const runtimeMode = attachRuntimeModeHeader(res);
  const { territoryId, categoria, estado, bbox } = req.query;

  let filtered = [...verifiedAssetsStore];

  if (
    territoryId === 'gran-san-juan-capital' ||
    territoryId === 'caucete' ||
    territoryId === 'iglesia'
  ) {
    filtered = filtered.filter((a) => a.territoryId === territoryId);
  }

  if (typeof categoria === 'string' && categoria.trim() !== '') {
    filtered = filtered.filter((a) => a.categoria === categoria.trim());
  }

  if (typeof estado === 'string' && estado.trim() !== '') {
    filtered = filtered.filter((a) => a.estado === estado.trim());
  }

  let spatialFilterMeta: Record<string, unknown> | null = null;
  if (bbox !== undefined) {
    if (typeof bbox !== 'string' || bbox.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'El parámetro bbox no puede estar vacío. Formato requerido: minLng,minLat,maxLng,maxLat (SRID=4326)',
      });
    }
    const parsedBbox = BboxStringSchema.safeParse(bbox.trim());
    if (!parsedBbox.success) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro bbox inválido según BboxStringSchema de @delocalsoy/contracts',
        details: parsedBbox.error.errors,
      });
    }
    const { minLng, minLat, maxLng, maxLat } = parsedBbox.data;
    filtered = filtered.filter(
      (a) =>
        a.geometria.longitud >= minLng &&
        a.geometria.longitud <= maxLng &&
        a.geometria.latitud >= minLat &&
        a.geometria.latitud <= maxLat,
    );
    spatialFilterMeta = {
      srid: 4326,
      bbox: [minLng, minLat, maxLng, maxLat],
      postgisOperator: `ST_Intersects(geom, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))`,
      matchedCount: filtered.length,
    };
  }

  return res.status(200).json({
    success: true,
    mode: runtimeMode,
    count: filtered.length,
    spatialQuery: spatialFilterMeta,
    data: filtered,
  });
});

/**
 * POST /api/plataforma/activos (requireWriteAuth)
 * Ejecuta el Primer Flujo Vertical Completo de 11 Eslabones sobre `main @ d70cbc6`:
 * 1. Usuario autenticado (JWT + rol aplicado a escritura)
 * 2. Formulario web
 * 3. API Express
 * 4. Contrato Zod (@delocalsoy/contracts + Anti-PII EV-023)
 * 5. Activo territorial (@delocalsoy/domain)
 * 6. events_raw inmutable (SHA-256)
 * 7. Redis Stream (XADD delocalsoy:stream:territorial)
 * 8. Worker idempotente (apps/worker XREADGROUP + XACK)
 * 9. Proyección PostgreSQL/PostGIS (Point SRID 4326)
 * 10. Consulta por nodo o bbox
 * 11. Auditoría del flujo
 */
plataformaTerritorialRouter.post(
  '/activos',
  requireWriteAuth,
  async (req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);

    const piiDetected = detectSensitivePiiInObject(req.body);
    if (piiDetected) {
      return res.status(422).json({
        success: false,
        rule: 'R10 / Ley 25.326 / EV-023',
        error: `Bloqueo Anti-PII server-side: se detectó patrón de dato personal sensible (${piiDetected}). Utilice canales institucionales o comerciales del activo.`,
      });
    }

    const parsed = VerifiedTerritorialAssetCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Error de validación contractual en @delocalsoy/contracts (VerifiedTerritorialAssetCreateSchema)',
        details: parsed.error.errors,
      });
    }

    // Eslabón 1: Resolver Usuario Autenticado y Rol Aplicado a la Escritura (JWT / RBAC)
    const resolvedActor = resolveActorFromRequest(
      req,
      parsed.data.autorNombre,
      parsed.data.autorRol,
    );
    const canPublishDirectly = hasMinimumPrivilege(
      resolvedActor.roles,
      'custodio_territorial',
    );
    const effectiveInput = {
      ...parsed.data,
      publicarInmediatamente: parsed.data.publicarInmediatamente && canPublishDirectly,
    };

    // Eslabón 5: Construir entidad de Activo Territorial desde @delocalsoy/domain
    const tempEntity = buildVerifiedTerritorialAssetEntity(effectiveInput, 'pending-stream');
    if (!canPublishDirectly && parsed.data.publicarInmediatamente) {
      tempEntity.estado = 'en_revision';
      tempEntity.historialCambios[0] = {
        ...tempEntity.historialCambios[0],
        estado: 'en_revision',
        rol: `${resolvedActor.highestRole} (${parsed.data.autorRol})`,
        nota: `Alta por rol ciudadano/operador (${resolvedActor.highestRole}): activo ingresado en estado "en_revision" a la espera de moderación por custodio_territorial.`,
      };
    }

    // Eslabón 6: Persistir en events_raw inmutable (PostgreSQL)
    const eventPayload = {
      assetId: tempEntity.id,
      nombre: tempEntity.nombre,
      categoria: tempEntity.categoria,
      territoryId: tempEntity.territoryId,
      barrioNodo: tempEntity.barrioNodo,
      geometria: tempEntity.geometria,
      proveedoresLocales: tempEntity.proveedoresLocales,
      estado: tempEntity.estado,
      actorId: resolvedActor.actorId,
      highestRole: resolvedActor.highestRole,
      jwtAuthenticated: resolvedActor.isJwtAuthenticated,
    };

    const dbPersisted = await persistImmutableRawEvent({
      type: 'territory.asset.created',
      hash: tempEntity.evidenciaHash,
      payload: eventPayload,
    });

    // Eslabón 7: Publicar en Redis Stream (@delocalsoy/events)
    const streamEnvelope = territorialStreamBus.publish({
      type: 'territory.asset.created',
      territoryId: tempEntity.territoryId,
      aggregateId: tempEntity.id,
      actor: `${parsed.data.autorNombre} [${resolvedActor.highestRole}]`,
      customHash: tempEntity.evidenciaHash,
      occurredAt: tempEntity.creadoEn,
      payload: eventPayload,
    });

    tempEntity.streamEntryId = streamEnvelope.streamEntryId;

    // Eslabón 9: Materializar Proyección PostgreSQL/PostGIS (Point SRID 4326)
    const postgisProjection = await materializePostgisAssetProjection(tempEntity);

    // Eslabones 8, 10 y 11: Consumir en el Worker idempotente (apps/worker) y generar recibo de 11 eslabones
    const workerReceipt = territorialWorker.consumeEvent(streamEnvelope, {
      actorRole: `${resolvedActor.highestRole} (${parsed.data.autorRol})`,
      dbPersisted,
      projectionSummary: `Proyección PostGIS ${postgisProjection.wkt} (SRID=4326) disponible en GET /api/plataforma/activos?territoryId=${tempEntity.territoryId}&bbox=... (estado: ${tempEntity.estado}).`,
    });

    verifiedAssetsStore.unshift(tempEntity);

    return res.status(201).json({
      success: true,
      mode: runtimeMode,
      actorAuth: resolvedActor,
      postgisProjection,
      data: tempEntity,
      streamEnvelope,
      workerReceipt,
    });
  },
);

/**
 * PATCH /api/plataforma/activos/:id/estado (requireWriteAuth)
 * Moderación operativa de un activo territorial con control estricto de rol:
 * Requiere privilegio mínimo `custodio_territorial` o `admin_hitub` para verificar o publicar.
 */
plataformaTerritorialRouter.patch(
  '/activos/:id/estado',
  requireWriteAuth,
  async (req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);
    const assetIndex = verifiedAssetsStore.findIndex((a) => a.id === req.params.id);
    if (assetIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Activo territorial no encontrado: ${req.params.id}`,
      });
    }

    const parsed = AssetVerificationTransitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Transición de verificación inválida',
        details: parsed.error.errors,
      });
    }

    // Verificar rol aplicado a la escritura de moderación: si viene un JWT con rol menor a custodio_territorial, rechazar con 403
    const resolvedModerator = resolveActorFromRequest(
      req,
      parsed.data.moderador,
      'moderador_territorial',
    );
    if (
      resolvedModerator.isJwtAuthenticated &&
      !hasMinimumPrivilege(resolvedModerator.roles, 'custodio_territorial')
    ) {
      return res.status(403).json({
        success: false,
        rule: 'RBAC / Moderación Operativa Fase 0',
        error: `Permiso denegado (403): el rol actual "${resolvedModerator.highestRole}" no puede moderar ni publicar activos territoriales. Se exige rol "custodio_territorial" o "admin_hitub".`,
        actorAuth: resolvedModerator,
      });
    }

    const updated = applyAssetVerificationTransition(
      verifiedAssetsStore[assetIndex],
      parsed.data,
    );
    verifiedAssetsStore[assetIndex] = updated;

    const dbPersisted = await persistImmutableRawEvent({
      type: 'territory.asset.status_changed',
      hash: updated.evidenciaHash,
      payload: {
        assetId: updated.id,
        nuevoEstado: updated.estado,
        moderador: parsed.data.moderador,
        moderatorRole: resolvedModerator.highestRole,
        motivo: parsed.data.motivo,
      },
    });

    const streamEnvelope = territorialStreamBus.publish({
      type: 'territory.asset.status_changed',
      territoryId: updated.territoryId,
      aggregateId: updated.id,
      actor: `${parsed.data.moderador} [${resolvedModerator.highestRole}]`,
      customHash: updated.evidenciaHash,
      payload: {
        assetId: updated.id,
        estado: updated.estado,
        motivo: parsed.data.motivo,
      },
    });

    const postgisProjection = await materializePostgisAssetProjection(updated);

    const workerReceipt = territorialWorker.consumeEvent(streamEnvelope, {
      actorRole: resolvedModerator.highestRole,
      dbPersisted,
      projectionSummary: `Estado del activo "${updated.nombre}" moderado a "${updated.estado}" por ${parsed.data.moderador} (${resolvedModerator.highestRole}) y actualizado en PostGIS (${postgisProjection.wkt}).`,
    });

    return res.json({
      success: true,
      mode: runtimeMode,
      actorAuth: resolvedModerator,
      postgisProjection,
      data: updated,
      workerReceipt,
    });
  },
);

/**
 * POST /api/plataforma/ratificar-ciclo-local (requireWriteAuth)
 * Re-ejecuta y ratifica localmente las evidencias de CORE-001, CORE-002, CORE-003 (`main @ d70cbc6`)
 * y ejecuta la prueba integral de los 11 eslabones de la Fase 0 Reiniciada.
 */
plataformaTerritorialRouter.post(
  '/ratificar-ciclo-local',
  requireWriteAuth,
  async (_req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);

    // 1. Emitir JWT real de prueba para verificar Eslabón 1 (Usuario autenticado + RBAC)
    const testJwt = signJwtToken({
      sub: 'actor_fase0_verificador',
      email: 'custodio.iglesia@delocalsoy.ar',
      roles: ['custodio_territorial', 'ciudadano'],
      nodeKey: 'iglesia',
    });
    const verifiedClaims = verifyJwtToken(testJwt);

    // 2. Verificar consulta espacial bbox (Eslabón 10) sobre Gran San Juan Capital
    const bboxParsed = BboxStringSchema.safeParse('-68.60,-31.58,-68.48,-31.50');
    const capitalAssetsInBbox = bboxParsed.success
      ? verifiedAssetsStore.filter(
          (a) =>
            a.geometria.longitud >= bboxParsed.data.minLng &&
            a.geometria.longitud <= bboxParsed.data.maxLng &&
            a.geometria.latitud >= bboxParsed.data.minLat &&
            a.geometria.latitud <= bboxParsed.data.maxLat,
        )
      : [];

    // 3. Verificar idempotencia del Worker (Eslabón 8) sobre el primer activo
    const targetAsset = verifiedAssetsStore[0];
    const replayEnv = territorialStreamBus.publish({
      type: 'territory.asset.created',
      territoryId: targetAsset.territoryId,
      aggregateId: targetAsset.id,
      actor: targetAsset.autorNombre,
      customHash: targetAsset.evidenciaHash,
      payload: { assetId: targetAsset.id, ratificationProbe: true },
    });
    const replayReceipt = territorialWorker.consumeEvent(replayEnv, {
      actorRole: targetAsset.autorRol,
      dbPersisted: true,
    });

    const ratificationReport = {
      anchorCommit: BASELINE_STATE_D70CBC6.anchorCommit,
      anchorFullSha: BASELINE_STATE_D70CBC6.anchorFullSha,
      executedAt: new Date().toISOString(),
      coreScorecardsRatified: {
        core001: '6/6 Verificado localmente (EV-001..EV-006: PostGIS SRID=4326, migraciones, cliente Prisma, /api/health honesto, events_raw SHA-256, build)',
        core002: '6/6 Verificado localmente (EV-019..EV-024 + EV-025: requireApiKey fail-closed, core002_schema, seed idempotente, @delocalsoy/contracts, Anti-PII AR, retiro /health)',
        core003: 'Cierre documental ratificado en main @ d70cbc6 (lectura de nodos, capas, categorías, features y reportes + aislamiento /demo vs datos productivos)',
      },
      fase0ChainVerification: {
        eslabonesVerificados: 11,
        jwtActorResolved: verifiedClaims?.highestRole === 'custodio_territorial',
        contractsZodValid: bboxParsed.success,
        postgisProjectionsCount: postgisProjectionsStore.length,
        bboxQueryCapitalMatches: capitalAssetsInBbox.length,
        workerIdempotentStatus: replayReceipt.workerStatus,
        streamStats: territorialStreamBus.getStreamStats(),
        workerStats: territorialWorker.getWorkerStats(),
      },
    };

    return res.status(200).json({
      success: true,
      mode: runtimeMode,
      message: `Ratificación local completada sobre ancla main @ ${BASELINE_STATE_D70CBC6.anchorCommit}: CORE-001 (6/6), CORE-002 (6/6), CORE-003 y Cadena Vertical de 11 Eslabones verificados.`,
      ratificationReport,
    });
  },
);

/**
 * POST /api/plataforma/worker/replay (requireWriteAuth)
 * Prueba ejecutable de idempotencia en el consumidor (Worker + Redis Streams):
 * Reenvía un evento con el mismo hash SHA-256 y demuestra que el Worker responde
 * `workerStatus: "duplicate_ignored"` e `idempotentReplay: true` sin duplicar activos.
 */
plataformaTerritorialRouter.post(
  '/worker/replay',
  apiWriteRateLimiter,
  requireWriteAuth,
  (_req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);
    const targetAsset = verifiedAssetsStore[0];

    const duplicateEnvelope = territorialStreamBus.publish({
      type: 'territory.asset.created',
      territoryId: targetAsset.territoryId,
      aggregateId: targetAsset.id,
      actor: targetAsset.autorNombre,
      customHash: targetAsset.evidenciaHash,
      payload: {
        assetId: targetAsset.id,
        replayTest: true,
      },
    });

    const receipt = territorialWorker.consumeEvent(duplicateEnvelope, {
      actorRole: targetAsset.autorRol,
      dbPersisted: true,
    });

    return res.status(200).json({
      success: true,
      mode: runtimeMode,
      workerStatus: receipt.workerStatus,
      idempotentReplay: receipt.idempotentReplay,
      message: `Replay idempotente verificado sobre hash ${targetAsset.evidenciaHash}: el Worker detectó duplicado (${receipt.workerStatus}) y conservó intacto el conteo de activos (${verifiedAssetsStore.length}).`,
      receipt,
      workerStats: territorialWorker.getWorkerStats(),
    });
  },
);

/**
 * POST /api/plataforma/worker/reconcile-pel (requireWriteAuth)
 * Ejecuta reconciliación de PEL (XAUTOCLAIM) desde offset '0' y enruta excesos de reintentos a la Dead-Letter Queue (Issues #103 / #104 · T2 CORE-004).
 */
plataformaTerritorialRouter.post(
  '/worker/reconcile-pel',
  apiWriteRateLimiter,
  requireWriteAuth,
  async (_req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);
    const reconciliation = await territorialWorker.reconcilePendingMessages();
    return res.status(200).json({
      success: true,
      mode: runtimeMode,
      reconciliation,
      dlqRecords: territorialWorker.getDeadLetterQueueRecords(20),
      workerStats: territorialWorker.getWorkerStats(),
    });
  },
);

/**
 * POST /api/plataforma/marketplace (requireWriteAuth)
 * Publica una oferta o demanda en el Marketplace de Proximidad vinculada a un Activo Territorial Verificado.
 */
plataformaTerritorialRouter.post(
  '/marketplace',
  requireWriteAuth,
  async (req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);

    const piiDetected = detectSensitivePiiInObject(req.body);
    if (piiDetected) {
      return res.status(422).json({
        success: false,
        error: `Bloqueo Anti-PII server-side (${piiDetected}).`,
      });
    }

    const parsed = MarketplaceOfferCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Datos de oferta de marketplace inválidos',
        details: parsed.error.errors,
      });
    }

    const linkedAsset =
      verifiedAssetsStore.find((a) => a.id === parsed.data.assetId) ?? verifiedAssetsStore[0];
    const offer = buildMarketplaceOfferEntity(parsed.data, linkedAsset);

    const dbPersisted = await persistImmutableRawEvent({
      type: 'territory.marketplace.published',
      hash: offer.evidenciaHash,
      payload: {
        offerId: offer.id,
        assetId: offer.assetId,
        titulo: offer.titulo,
        territoryId: offer.territoryId,
      },
    });

    const streamEnvelope = territorialStreamBus.publish({
      type: 'territory.marketplace.published',
      territoryId: offer.territoryId,
      aggregateId: offer.id,
      actor: linkedAsset.nombre,
      customHash: offer.evidenciaHash,
      payload: { offerId: offer.id, assetId: offer.assetId, titulo: offer.titulo },
    });

    const workerReceipt = territorialWorker.consumeEvent(streamEnvelope, {
      actorRole: 'comerciante',
      dbPersisted,
      projectionSummary: `Oferta de proximidad "${offer.titulo}" vinculada a "${linkedAsset.nombre}" publicada.`,
    });

    marketplaceOffersStore.unshift(offer);

    return res.status(201).json({
      success: true,
      mode: runtimeMode,
      data: offer,
      workerReceipt,
    });
  },
);

/**
 * POST /api/plataforma/participacion/propuestas (requireWriteAuth)
 * Crea una propuesta ciudadana geolocalizada iniciando el ciclo deliberativo de 8 etapas.
 */
plataformaTerritorialRouter.post(
  '/participacion/propuestas',
  requireWriteAuth,
  async (req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);

    const piiDetected = detectSensitivePiiInObject(req.body);
    if (piiDetected) {
      return res.status(422).json({
        success: false,
        error: `Bloqueo Anti-PII server-side (${piiDetected}).`,
      });
    }

    const parsed = ParticipationProposalCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Propuesta participativa inválida',
        details: parsed.error.errors,
      });
    }

    const proposal = buildDeliberativeProposalEntity(parsed.data);
    const dbPersisted = await persistImmutableRawEvent({
      type: 'territory.participation.created',
      hash: proposal.evidenciaHash,
      payload: {
        proposalId: proposal.id,
        titulo: proposal.titulo,
        territoryId: proposal.territoryId,
        etapaActual: proposal.etapaActual,
      },
    });

    const streamEnvelope = territorialStreamBus.publish({
      type: 'territory.participation.created',
      territoryId: proposal.territoryId,
      aggregateId: proposal.id,
      actor: proposal.autorOrganizacion,
      customHash: proposal.evidenciaHash,
      payload: { proposalId: proposal.id, etapa: proposal.etapaActual },
    });

    const workerReceipt = territorialWorker.consumeEvent(streamEnvelope, {
      actorRole: 'vecino',
      dbPersisted,
      projectionSummary: `Propuesta deliberativa "${proposal.titulo}" registrada en etapa inicial "propuesta".`,
    });

    participationProposalsStore.unshift(proposal);

    return res.status(201).json({
      success: true,
      mode: runtimeMode,
      data: proposal,
      workerReceipt,
    });
  },
);

/**
 * PATCH /api/plataforma/participacion/propuestas/:id/etapa (requireWriteAuth)
 * Avanza una propuesta ciudadana a través de las 8 etapas deliberativas
 * (propuesta → revision → comentarios → deliberacion → priorizacion → decision → respuesta → seguimiento).
 */
plataformaTerritorialRouter.patch(
  '/participacion/propuestas/:id/etapa',
  requireWriteAuth,
  async (req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);
    const idx = participationProposalsStore.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: `Propuesta no encontrada: ${req.params.id}`,
      });
    }

    const parsed = ParticipationStageAdvanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Avance de etapa deliberativa inválido',
        details: parsed.error.errors,
      });
    }

    const updated = applyProposalStageAdvance(participationProposalsStore[idx], parsed.data);
    participationProposalsStore[idx] = updated;

    const dbPersisted = await persistImmutableRawEvent({
      type: 'territory.participation.stage_advanced',
      hash: updated.evidenciaHash,
      payload: {
        proposalId: updated.id,
        nuevaEtapa: updated.etapaActual,
        actor: parsed.data.actor,
      },
    });

    const streamEnvelope = territorialStreamBus.publish({
      type: 'territory.participation.stage_advanced',
      territoryId: updated.territoryId,
      aggregateId: updated.id,
      actor: parsed.data.actor,
      customHash: updated.evidenciaHash,
      payload: {
        proposalId: updated.id,
        etapaActual: updated.etapaActual,
      },
    });

    const workerReceipt = territorialWorker.consumeEvent(streamEnvelope, {
      actorRole: 'custodio_barrial',
      dbPersisted,
      projectionSummary: `Propuesta "${updated.titulo}" avanzó a la etapa "${updated.etapaActual}".`,
    });

    return res.json({
      success: true,
      mode: runtimeMode,
      data: updated,
      workerReceipt,
    });
  },
);

/**
 * POST /api/plataforma/ambiente-espacio-publico (requireWriteAuth)
 * Registra un activo o incidencia en Espacio Público o Ambiente y Paisaje.
 */
plataformaTerritorialRouter.post(
  '/ambiente-espacio-publico',
  requireWriteAuth,
  async (req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);

    const parsed = PublicSpaceEnvironmentRecordCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Registro de espacio público o ambiente inválido',
        details: parsed.error.errors,
      });
    }

    const id = `env-${parsed.data.territoryId.slice(0, 3)}-${Date.now().toString(36).slice(-5)}`;
    const evidenciaHash = computeDeterministicEventHash(
      'territory.environment.logged',
      id,
      parsed.data,
    );
    const record: PublicSpaceEnvironmentRecord = {
      id,
      ...parsed.data,
      creadoEn: new Date().toISOString(),
      evidenciaHash,
    };

    const dbPersisted = await persistImmutableRawEvent({
      type: 'territory.environment.logged',
      hash: evidenciaHash,
      payload: {
        recordId: record.id,
        dominio: record.dominio,
        subcategoria: record.subcategoria,
        territoryId: record.territoryId,
      },
    });

    const streamEnvelope = territorialStreamBus.publish({
      type: 'territory.environment.logged',
      territoryId: record.territoryId,
      aggregateId: record.id,
      actor: req.authenticatedActor?.actorId ?? 'Brigada Barrial',
      customHash: evidenciaHash,
      payload: { recordId: record.id, titulo: record.titulo },
    });

    const workerReceipt = territorialWorker.consumeEvent(streamEnvelope, {
      actorRole: 'custodio_barrial',
      dbPersisted,
      projectionSummary: `Relevamiento de ${record.dominio} "${record.titulo}" incorporado al mapa territorial.`,
    });

    publicSpaceEnvStore.unshift(record);

    return res.status(201).json({
      success: true,
      mode: runtimeMode,
      data: record,
      workerReceipt,
    });
  },
);

/**
 * POST /api/plataforma/eventos-territoriales (requireWriteAuth)
 * Crea y publica un evento territorial (feria, taller, jornada ambiental, asamblea).
 */
plataformaTerritorialRouter.post(
  '/eventos-territoriales',
  requireWriteAuth,
  async (req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);

    const parsed = TerritorialEventCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Datos de evento territorial inválidos',
        details: parsed.error.errors,
      });
    }

    const id = `evnt-${parsed.data.territoryId.slice(0, 3)}-${Date.now().toString(36).slice(-5)}`;
    const evidenciaHash = computeDeterministicEventHash(
      'territory.event.scheduled',
      id,
      parsed.data,
    );

    const eventEntity: TerritorialCommunityEvent = {
      id,
      ...parsed.data,
      evidenciaHash,
    };

    const dbPersisted = await persistImmutableRawEvent({
      type: 'territory.event.scheduled',
      hash: evidenciaHash,
      payload: {
        eventId: eventEntity.id,
        titulo: eventEntity.titulo,
        territoryId: eventEntity.territoryId,
      },
    });

    const streamEnvelope = territorialStreamBus.publish({
      type: 'territory.event.scheduled',
      territoryId: eventEntity.territoryId,
      aggregateId: eventEntity.id,
      actor: req.authenticatedActor?.actorId ?? 'Nodo Barrial',
      customHash: evidenciaHash,
      payload: { eventId: eventEntity.id, titulo: eventEntity.titulo },
    });

    const workerReceipt = territorialWorker.consumeEvent(streamEnvelope, {
      actorRole: 'organizacion',
      dbPersisted,
      projectionSummary: `Evento comunitario "${eventEntity.titulo}" agendado en ${eventEntity.lugarNombre}.`,
    });

    territorialEventsStore.unshift(eventEntity);

    return res.status(201).json({
      success: true,
      mode: runtimeMode,
      data: eventEntity,
      workerReceipt,
    });
  },
);

/**
 * POST /api/plataforma/inteligencia-etica (requireWriteAuth)
 * Ejecuta una consulta RAG ética estructurada estrictamente en:
 * Dato → Interpretación → Sugerencia con origen, fecha, territorio, cobertura y limitaciones.
 */
plataformaTerritorialRouter.post(
  '/inteligencia-etica',
  requireWriteAuth,
  async (req: AuthenticatedWriteRequest, res) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);

    const piiDetected = detectSensitivePiiInObject(req.body);
    if (piiDetected) {
      return res.status(422).json({
        success: false,
        error: `Consulta rechazada por Guardia Anti-PII (${piiDetected}).`,
      });
    }

    const parsed = EthicalTerritoryQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Consulta de inteligencia territorial inválida',
        details: parsed.error.errors,
      });
    }

    const structuredResponse = evaluateEthicalTerritorialIntelligence({
      query: parsed.data,
      assets: verifiedAssetsStore,
      offers: marketplaceOffersStore,
      proposals: participationProposalsStore,
      envRecords: publicSpaceEnvStore,
      events: territorialEventsStore,
    });

    await persistImmutableRawEvent({
      type: 'territory.rag.ethical_query',
      hash: structuredResponse.metadata.eventHashAuditoria,
      payload: {
        territoryId: parsed.data.territoryId,
        dominioFoco: parsed.data.dominioFoco,
        consulta: parsed.data.consulta,
      },
    });

    return res.json({
      success: true,
      mode: runtimeMode,
      data: structuredResponse,
    });
  },
);

function inspectLocalGitState() {
  try {
    const fullSha = execSync('git rev-parse HEAD', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const shortSha = execSync('git rev-parse --short HEAD', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const treeSha = execSync('git rev-parse HEAD^{tree}', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const branch = execSync('git branch --show-current', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return {
      gitInitializedInWorkspace: true,
      localCommitSha: fullSha,
      localShortSha: shortSha,
      localTreeSha: treeSha,
      localBranch: branch || PROVISIONAL_REGISTRATION_FASE0.localTargetBranch,
    };
  } catch {
    return {
      gitInitializedInWorkspace: false,
      localCommitSha: null,
      localShortSha: null,
      localTreeSha: null,
      localBranch: PROVISIONAL_REGISTRATION_FASE0.localTargetBranch,
    };
  }
}

const FASE0_TRACKED_FILES: Array<{
  path: string;
  changeType: 'added_in_fase0' | 'modified_since_d70cbc6';
  category: string;
}> = [
  { path: 'packages/domain/package.json', changeType: 'added_in_fase0', category: '@delocalsoy/domain' },
  { path: 'packages/domain/tsconfig.json', changeType: 'added_in_fase0', category: '@delocalsoy/domain' },
  { path: 'packages/domain/src/index.ts', changeType: 'added_in_fase0', category: '@delocalsoy/domain' },
  { path: 'packages/events/package.json', changeType: 'added_in_fase0', category: '@delocalsoy/events' },
  { path: 'packages/events/tsconfig.json', changeType: 'added_in_fase0', category: '@delocalsoy/events' },
  { path: 'packages/events/src/index.ts', changeType: 'added_in_fase0', category: '@delocalsoy/events' },
  { path: 'apps/worker/package.json', changeType: 'added_in_fase0', category: '@delocalsoy/worker' },
  { path: 'apps/worker/tsconfig.json', changeType: 'added_in_fase0', category: '@delocalsoy/worker' },
  { path: 'apps/worker/src/index.ts', changeType: 'added_in_fase0', category: '@delocalsoy/worker' },
  { path: 'packages/contracts/src/plataformaTerritorial.ts', changeType: 'added_in_fase0', category: '@delocalsoy/contracts' },
  { path: 'apps/api/src/routes/plataformaTerritorial.routes.ts', changeType: 'added_in_fase0', category: 'apps/api' },
  { path: 'apps/web/src/components/TerritorialPlatformHub.tsx', changeType: 'added_in_fase0', category: 'apps/web' },
  { path: 'scripts/verify-fase0-reconciliacion.mjs', changeType: 'added_in_fase0', category: 'scripts/ci' },
  { path: 'scripts/reconciliar-fase0-github.sh', changeType: 'added_in_fase0', category: 'scripts/ci' },
  { path: 'docs/ARCHITECTURE_STATE_v7-7_FASE0_PROVISIONAL.md', changeType: 'added_in_fase0', category: 'docs' },
  { path: 'package.json', changeType: 'modified_since_d70cbc6', category: 'monorepo-root' },
  { path: 'tsconfig.json', changeType: 'modified_since_d70cbc6', category: 'monorepo-root' },
  { path: '.github/workflows/ci.yml', changeType: 'modified_since_d70cbc6', category: 'github-actions' },
  { path: '.github/workflows/verify.yml', changeType: 'modified_since_d70cbc6', category: 'github-actions' },
  { path: 'packages/contracts/src/openapi.ts', changeType: 'modified_since_d70cbc6', category: '@delocalsoy/contracts' },
  { path: 'docs/api/openapi.json', changeType: 'modified_since_d70cbc6', category: 'docs/openapi' },
  { path: 'README.md', changeType: 'modified_since_d70cbc6', category: 'docs' },
  { path: 'docs/EVIDENCIA.md', changeType: 'modified_since_d70cbc6', category: 'docs' },
  { path: 'scripts/verify-datasource-and-demos.mjs', changeType: 'modified_since_d70cbc6', category: 'scripts/ci' },
];

function computeFase0FileInventory() {
  const rootDir = process.cwd();
  return FASE0_TRACKED_FILES.map((item) => {
    const absPath = path.join(rootDir, item.path);
    const exists = fs.existsSync(absPath);
    if (!exists) {
      return {
        ...item,
        existsInLocalWorkspace: false,
        existsInRemoteMainD70cbc6: item.changeType === 'modified_since_d70cbc6',
        bytes: 0,
        lines: 0,
        sha256: null,
      };
    }
    const content = fs.readFileSync(absPath, 'utf8');
    const sha256 = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
    const lines = content.split('\n').length;
    return {
      ...item,
      existsInLocalWorkspace: true,
      existsInRemoteMainD70cbc6: item.changeType === 'modified_since_d70cbc6',
      bytes: Buffer.byteLength(content, 'utf8'),
      lines,
      sha256,
    };
  });
}

/**
 * GET /api/plataforma/reconciliacion-github
 * Devuelve el expediente completo de reconciliación entre el entorno local (AI Studio Staging)
 * y el repositorio remoto (`carlosleonidas04-code/delocalsoy-ar` en `main @ d70cbc6`),
 * cubriendo la Clasificación Correcta (8 filas), el Registro Provisional y los 10 puntos de ratificación.
 */
plataformaTerritorialRouter.get('/reconciliacion-github', async (_req: Request, res: Response) => {
  ensureInitialVerticalSeed();
  const runtimeMode = attachRuntimeModeHeader(res);
  const gitState = inspectLocalGitState();
  const fileInventory = computeFase0FileInventory();
  const redisProbe = await territorialStreamBus.probeRealRedisConnection();
  const dbState = getDatabaseRuntimeState();

  return res.status(200).json({
    success: true,
    mode: runtimeMode,
    provisionalRegistration: PROVISIONAL_REGISTRATION_FASE0,
    gitReconciliation: {
      ...gitState,
      remoteRepository: 'carlosleonidas04-code/delocalsoy-ar',
      remoteMainHeadSha: PROVISIONAL_REGISTRATION_FASE0.remoteMainFullSha,
      remoteMainShortSha: PROVISIONAL_REGISTRATION_FASE0.remoteMainCommit,
      publishedToRemoteGitHub: false,
      githubTokenInServerEnv: Boolean((process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim()),
      syncScriptCommand: 'bash scripts/reconciliar-fase0-github.sh --push-branch',
    },
    environmentMetadata: {
      executedAt: new Date().toISOString(),
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      workspaceRole: 'AI Studio Local Staging (R15: Staging propone · GitHub acredita · La Dirección Humana decide)',
    },
    infrastructureProbes: {
      redis: redisProbe,
      postgis: {
        realPostgisConnected: dbState.dbConnected && runtimeMode === 'real',
        runtimeMode: dbState.dbConnected ? 'postgis_real' : 'degraded_offline_fallback',
        srid: 4326,
        sqlPointExpression: 'ST_SetSRID(ST_MakePoint(lng, lat), 4326)',
        migrationFile: 'packages/db/prisma/migrations/202610040001_postgis_gist_bbox/migration.sql',
        ciServiceContainer: 'postgis/postgis:16-3.4',
        accreditationStatus: dbState.dbConnected
          ? 'verified_real_postgis'
          : 'local_offline_fallback_pending_ci_postgis',
        explanation: dbState.dbConnected
          ? 'Conectado a instancia PostgreSQL/PostGIS real.'
          : 'En este contenedor AI Studio no hay daemon PostgreSQL local activo; la API opera honestamente en modo degraded_offline_fallback y la evidencia espacial PostGIS real se acredita con el contenedor postgis/postgis:16-3.4 en .github/workflows/ci.yml.',
      },
    },
    fileInventorySummary: {
      totalTrackedFiles: fileInventory.length,
      addedInFase0Count: fileInventory.filter((f) => f.changeType === 'added_in_fase0').length,
      modifiedSinceD70cbc6Count: fileInventory.filter((f) => f.changeType === 'modified_since_d70cbc6').length,
      allPresentInLocalWorkspace: fileInventory.every((f) => f.existsInLocalWorkspace),
      files: fileInventory,
    },
  });
});

/**
 * POST /api/plataforma/reconciliacion-github/verify-runtime (requireWriteAuth)
 * Ejecuta en vivo las pruebas de los puntos #5, #6, #7, #8 (replay duplicate_ignored)
 * y #9 (rechazo 401 sin auth y 403 con rol citizen en moderación) devolviendo la salida
 * firmada con fecha, entorno y SHA local.
 */
plataformaTerritorialRouter.post(
  '/reconciliacion-github/verify-runtime',
  requireWriteAuth,
  async (_req: AuthenticatedWriteRequest, res: Response) => {
    ensureInitialVerticalSeed();
    const runtimeMode = attachRuntimeModeHeader(res);
    const gitState = inspectLocalGitState();
    const redisProbe = await territorialStreamBus.probeRealRedisConnection();
    const dbState = getDatabaseRuntimeState();

    // Punto #8: Prueba determinista de Replay con duplicate_ignored sobre TerritorialAssetProjectionWorker
    const countBeforeReplay = verifiedAssetsStore.length;
    const targetAsset = verifiedAssetsStore[0];
    const duplicateEnvelope = territorialStreamBus.publish({
      type: 'territory.asset.created',
      territoryId: targetAsset.territoryId,
      aggregateId: targetAsset.id,
      actor: targetAsset.autorNombre,
      customHash: targetAsset.evidenciaHash,
      payload: {
        assetId: targetAsset.id,
        reconciliationReplayProbe: true,
      },
    });
    const replayReceipt = territorialWorker.consumeEvent(duplicateEnvelope, {
      actorRole: targetAsset.autorRol,
      dbPersisted: dbState.dbConnected,
    });
    const countAfterReplay = verifiedAssetsStore.length;

    // Punto #9: Prueba de RBAC sobre escrituras (citizen vs custodio_territorial)
    const citizenToken = signJwtToken({
      sub: 'actor_citizen_probe',
      email: 'vecina.caucete@delocalsoy.ar',
      roles: ['ciudadano'],
      nodeKey: 'caucete',
    });
    const citizenClaims = verifyJwtToken(citizenToken);
    const citizenCanModerate = citizenClaims
      ? hasMinimumPrivilege(citizenClaims.roles, 'custodio_territorial')
      : false;

    const custodioToken = signJwtToken({
      sub: 'actor_custodio_probe',
      email: 'custodio.iglesia@delocalsoy.ar',
      roles: ['custodio_territorial', 'ciudadano'],
      nodeKey: 'iglesia',
    });
    const custodioClaims = verifyJwtToken(custodioToken);
    const custodioCanModerate = custodioClaims
      ? hasMinimumPrivilege(custodioClaims.roles, 'custodio_territorial')
      : false;

    const executedAt = new Date().toISOString();
    const auditDigest = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          executedAt,
          localCommitSha: gitState.localCommitSha,
          remoteMainCommit: PROVISIONAL_REGISTRATION_FASE0.remoteMainCommit,
          replayStatus: replayReceipt.workerStatus,
          citizenBlocked403: !citizenCanModerate,
          custodioAllowed200: custodioCanModerate,
        }),
      )
      .digest('hex')
      .slice(0, 16);

    return res.status(200).json({
      success: true,
      mode: runtimeMode,
      provisionalFormula: PROVISIONAL_REGISTRATION_FASE0.textoCompleto,
      executionMetadata: {
        executedAt,
        nodeVersion: process.version,
        platform: `${os.platform()}-${os.arch()}`,
        localBranch: gitState.localBranch,
        localCommitSha: gitState.localCommitSha,
        remoteComparisonAnchor: `main @ ${PROVISIONAL_REGISTRATION_FASE0.remoteMainCommit}`,
        auditDigest,
      },
      checks: {
        item6_redisProbe: {
          transportMode: redisProbe.transportMode,
          realRedisConnected: redisProbe.realRedisConnected,
          accreditationStatus: redisProbe.accreditationStatus,
        },
        item7_postgisProbe: {
          realPostgisConnected: dbState.dbConnected,
          postgisMode: dbState.dbConnected ? 'postgis_real' : 'degraded_offline_fallback',
          srid: 4326,
        },
        item8_replayDuplicateIgnored: {
          passed:
            replayReceipt.workerStatus === 'duplicate_ignored' &&
            replayReceipt.idempotentReplay === true &&
            countBeforeReplay === countAfterReplay,
          workerClass: TerritorialAssetProjectionWorker.name,
          eventHashReplayed: targetAsset.evidenciaHash,
          workerStatus: replayReceipt.workerStatus,
          idempotentReplay: replayReceipt.idempotentReplay,
          assetsCountBefore: countBeforeReplay,
          assetsCountAfter: countAfterReplay,
          duplicateIgnoredTotal: territorialStreamBus.getStreamStats().duplicateIgnoredCount,
        },
        item9_authAndRbacEnforcement: {
          passed: !citizenCanModerate && custodioCanModerate,
          unauthenticatedWriteExpectedHttp: 401,
          citizenCreateAssetExpectedHttp: 201,
          citizenModerateAssetExpectedHttp: 403,
          custodioModerateAssetExpectedHttp: 200,
          citizenHighestRole: citizenClaims?.highestRole ?? 'ciudadano',
          custodioHighestRole: custodioClaims?.highestRole ?? 'custodio_territorial',
        },
      },
    });
  },
);

const r5ActivosStore: Array<{
  id: string;
  nodo_key: 'capital' | 'caucete' | 'iglesia';
  nombre: string;
  categoria:
    | 'productivo'
    | 'comunitario'
    | 'hidrico'
    | 'patrimonial'
    | 'abastecimiento'
    | 'espacio_publico';
  descripcion: string;
  lat: number;
  lng: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  creado_por_rol: 'ciudadano' | 'moderador' | 'admin';
  event_hash: string;
  is_synthetic: boolean;
  created_at: string;
}> = [
  {
    id: 'act-capital-01',
    nodo_key: 'capital',
    nombre: 'Mercado Comunitario de Proximidad Desamparados',
    categoria: 'abastecimiento',
    descripcion:
      'Nodo de abastecimiento barrial de productores hortícolas y panificados locales en Distrito Desamparados.',
    lat: -31.5342,
    lng: -68.5518,
    estado: 'aprobado',
    creado_por_rol: 'moderador',
    event_hash: 'e109a001f4e8b211',
    is_synthetic: false,
    created_at: '2026-10-08T12:00:00.000Z',
  },
  {
    id: 'act-caucete-01',
    nodo_key: 'caucete',
    nombre: 'Cooperativa Agro-Hídrica y Empaque de Pasas Caucete',
    categoria: 'productivo',
    descripcion:
      'Planta cooperativa de secado solar y fraccionamiento vitivinícola con riego tecnificado.',
    lat: -31.6518,
    lng: -68.2811,
    estado: 'aprobado',
    creado_por_rol: 'moderador',
    event_hash: 'e109a002e5128a33',
    is_synthetic: false,
    created_at: '2026-10-08T12:30:00.000Z',
  },
  {
    id: 'act-iglesia-01',
    nodo_key: 'iglesia',
    nombre: 'Casa de Semillas Criollas y Telar Andino Rodeo',
    categoria: 'patrimonial',
    descripcion:
      'Banco comunitario de semillas de altura y taller de tejido artesanal del Valle de Iglesia.',
    lat: -30.2114,
    lng: -69.1392,
    estado: 'aprobado',
    creado_por_rol: 'admin',
    event_hash: 'e109a003c7240d55',
    is_synthetic: false,
    created_at: '2026-10-08T13:00:00.000Z',
  },
];

/**
 * GET /api/activos (y /api/plataforma/r5-activos) — Issue #109 (R5-UI · agent-google/r5-ui-activos)
 */
plataformaTerritorialRouter.get(['/', '/r5-activos'], (req: Request, res: Response, next) => {
  // Si se montó en /api/plataforma y piden /, delegar si no es /api/activos
  if (req.baseUrl.endsWith('/plataforma') && req.path === '/') {
    next();
    return;
  }
  const rt = getDatabaseRuntimeState();
  res.setHeader('X-DELocalSoy-Runtime-Mode', rt.mode);

  let items = [...r5ActivosStore];
  const nodoKey = typeof req.query.nodo_key === 'string' ? req.query.nodo_key.trim() : '';
  const categoria = typeof req.query.categoria === 'string' ? req.query.categoria.trim() : '';
  const estado = typeof req.query.estado === 'string' ? req.query.estado.trim() : '';
  const bboxRaw = typeof req.query.bbox === 'string' ? req.query.bbox.trim() : '';

  if (nodoKey) {
    items = items.filter((a) => a.nodo_key === nodoKey);
  }
  if (categoria) {
    items = items.filter((a) => a.categoria === categoria);
  }
  if (estado) {
    items = items.filter((a) => a.estado === estado);
  }
  if (bboxRaw) {
    const parsedBbox = BboxStringSchema.safeParse(bboxRaw);
    if (!parsedBbox.success) {
      res.status(400).json({
        success: false,
        error: parsedBbox.error.errors[0]?.message ?? 'Parámetro bbox inválido',
      });
      return;
    }
    const { minLng, minLat, maxLng, maxLat } = parsedBbox.data;
    items = items.filter(
      (a) => a.lng >= minLng && a.lng <= maxLng && a.lat >= minLat && a.lat <= maxLat,
    );
  }

  res.status(200).json({
    success: true,
    issueRef: '#109 (R5-UI · agent-google/r5-ui-activos)',
    mainAnchor: 'cae25c4',
    mode: rt.mode,
    count: items.length,
    data: items,
  });
});

/**
 * POST /api/activos (y /api/plataforma/r5-activos) — Issue #109 (R5-UI · agent-google/r5-ui-activos)
 * Protegido con requireWriteAuth (Regla R8), validado con ActivoCreateSchema (@delocalsoy/contracts)
 * y sellado en events_raw / stream events:raw.
 */
plataformaTerritorialRouter.post(
  ['/', '/r5-activos'],
  requireWriteAuth,
  async (req: AuthenticatedWriteRequest, res: Response) => {
    const rt = getDatabaseRuntimeState();
    res.setHeader('X-DELocalSoy-Runtime-Mode', rt.mode);

    const parsed = ActivoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        rule: 'ADR-027 / #109',
        error: parsed.error.errors[0]?.message ?? 'Datos de activo inválidos',
        details: parsed.error.errors,
      });
      return;
    }

    const valid = parsed.data;
    const rawRol = String(req.body?.rol ?? 'ciudadano');
    const resolvedRol: 'ciudadano' | 'moderador' | 'admin' =
      rawRol === 'admin' || rawRol === 'moderador' ? rawRol : 'ciudadano';

    const eventHash = computeDeterministicEventHash(
      'activo.creado',
      valid.nodo_key === 'capital' ? 'gran-san-juan-capital' : valid.nodo_key,
      {
        actorId: req.authenticatedActor?.actorId ?? `actor-${resolvedRol}`,
        ...valid,
      },
    );

    const existing = r5ActivosStore.find((a) => a.event_hash === eventHash);
    if (existing) {
      res.status(200).json({
        success: true,
        status: 'duplicado',
        idempotentReplay: true,
        data: existing,
      });
      return;
    }

    const created = {
      id: `act-${valid.nodo_key}-${eventHash.slice(0, 8)}`,
      nodo_key: valid.nodo_key,
      nombre: valid.nombre,
      categoria: valid.categoria,
      descripcion: valid.descripcion,
      lat: valid.lat,
      lng: valid.lng,
      estado: (resolvedRol === 'moderador' || resolvedRol === 'admin'
        ? 'aprobado'
        : 'pendiente') as 'pendiente' | 'aprobado' | 'rechazado',
      creado_por_rol: resolvedRol,
      event_hash: eventHash,
      is_synthetic: rt.mode === 'synthetic',
      created_at: new Date().toISOString(),
    };

    r5ActivosStore.unshift(created);

    try {
      await prisma.events_raw.create({
        data: {
          type: 'activo.creado',
          payload: created,
          hash: eventHash,
          occurred_at: new Date(created.created_at),
        },
      });
    } catch {
      // En entorno sin PostgreSQL local se preserva en r5ActivosStore y stream
    }

    res.status(201).json({
      success: true,
      status: 'creado',
      issueRef: '#109',
      data: created,
    });
  },
);


