import { z } from 'zod';

export const TerritorialEntityKindSchema = z.enum([
  'department_node',
  'district_subnode',
  'functional_area',
  'centrality',
  'corridor',
  'network_segment',
  'landmark',
]);
export type TerritorialEntityKind = z.infer<typeof TerritorialEntityKindSchema>;

export const BoundaryStatusSchema = z.enum([
  'official',
  'source_based',
  'provisional',
  'community_proposed',
  'under_review',
]);
export type BoundaryStatus = z.infer<typeof BoundaryStatusSchema>;

export const EvidenceClassSchema = z.enum([
  'official_source',
  'institutional_source',
  'field_survey',
  'community_report',
  'derived',
  'synthetic',
]);
export type EvidenceClass = z.infer<typeof EvidenceClassSchema>;

export const ValidationStatusSchema = z.enum([
  'unreviewed',
  'under_review',
  'reviewed',
  'corroborated',
  'disputed',
  'rejected',
  'expired',
]);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const TerritorialRelationTypeSchema = z.enum([
  'contains',
  'connects',
  'intersects',
  'near',
  'serves',
  'part_of_route',
  'within_study_area',
]);
export type TerritorialRelationType = z.infer<typeof TerritorialRelationTypeSchema>;

export const TerritorialEntitySchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  parentId: z.string().nullable().optional(),
  kind: TerritorialEntityKindSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  boundaryStatus: BoundaryStatusSchema,
  evidenceClass: EvidenceClassSchema,
  validationStatus: ValidationStatusSchema,
  geometryRef: z.string().nullable().optional(),
  sourceIds: z.array(z.string()).default([]),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type TerritorialEntity = z.infer<typeof TerritorialEntitySchema>;

export const TerritorialRelationSchema = z.object({
  id: z.string().min(1),
  fromEntityId: z.string().min(1),
  toEntityId: z.string().min(1),
  relationType: TerritorialRelationTypeSchema,
  confidence: z.enum(['low', 'medium', 'high']),
  evidenceClass: EvidenceClassSchema,
  validationStatus: ValidationStatusSchema,
  sourceIds: z.array(z.string()).default([]),
});
export type TerritorialRelation = z.infer<typeof TerritorialRelationSchema>;

export const TerritorialSourceSchema = z.object({
  id: z.string().min(1),
  publisher: z.string().min(1),
  title: z.string().min(1),
  url: z.string().nullable().optional(),
  evidenceClass: EvidenceClassSchema,
  retrievedAt: z.string(),
  license: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type TerritorialSource = z.infer<typeof TerritorialSourceSchema>;

export const TerritorialCorridorSchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  purpose: z.string(),
  status: z.enum(['candidate', 'mapped', 'validated', 'retired']),
  boundaryStatus: BoundaryStatusSchema,
  fromEntityId: z.string(),
  toEntityId: z.string(),
  viaEntityIds: z.array(z.string()).default([]),
  modes: z.array(z.enum(['walk', 'bike', 'bus', 'car', 'unknown'])).default([]),
  sourceIds: z.array(z.string()).default([]),
});
export type TerritorialCorridor = z.infer<typeof TerritorialCorridorSchema>;

export const StreetAxisCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  orientation: z.enum(['east_west', 'north_south', 'mixed', 'unknown']),
  role: z.array(
    z.enum(['arterial_route', 'territorial_corridor', 'boundary_segment', 'local_connector'])
  ),
  segments: z
    .array(
      z.object({
        fromReference: z.string().nullable().optional(),
        toReference: z.string().nullable().optional(),
        circulation: z.enum(['one_way', 'two_way', 'variable', 'unknown']),
        evidenceStatus: z.enum(['reported', 'source_based', 'field_verified', 'official']),
        sourceIds: z.array(z.string()).default([]),
      })
    )
    .default([]),
  geometryRef: z.string().nullable().optional(),
  validationStatus: ValidationStatusSchema,
});
export type StreetAxisCandidate = z.infer<typeof StreetAxisCandidateSchema>;

export function validateTerritorialModel(
  entities: TerritorialEntity[],
  relations: TerritorialRelation[]
): string[] {
  const errors: string[] = [];
  const ids = new Set(entities.map((e) => e.id));

  if (ids.size !== entities.length) {
    errors.push('Existen identificadores duplicados en las entidades territoriales.');
  }

  for (const entity of entities) {
    if (entity.parentId && !ids.has(entity.parentId)) {
      errors.push(`${entity.id}: parentId (${entity.parentId}) no existe en el catálogo.`);
    }
    if (
      entity.kind === 'functional_area' &&
      entity.boundaryStatus === 'official' &&
      entity.evidenceClass === 'derived'
    ) {
      errors.push(
        `${entity.id}: un área derivada no puede declararse oficial sin evidencia oficial contrastada.`
      );
    }
  }

  for (const relation of relations) {
    if (!ids.has(relation.fromEntityId) || !ids.has(relation.toEntityId)) {
      errors.push(`${relation.id}: referencia a entidad territorial inexistente.`);
    }
    if (relation.fromEntityId === relation.toEntityId && relation.relationType === 'connects') {
      errors.push(`${relation.id}: una entidad no puede conectarse consino misma.`);
    }
  }

  return errors;
}
