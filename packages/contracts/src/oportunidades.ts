import { z } from 'zod';
import { DirectoryCategoryCodeSchema } from './directoryTaxonomy.js';

export const OpportunityTypeSchema = z.enum([
  'human_capacity',
  'productive_capacity',
  'physical_asset',
  'institutional_asset',
  'cultural_asset',
  'detected_demand',
  'market_gap',
  'partnership_opportunity',
  'investment_opportunity',
  'policy_opportunity',
]);
export type OpportunityType = z.infer<typeof OpportunityTypeSchema>;

export const OpportunityStatusSchema = z.enum([
  'detected',
  'under_review',
  'validated',
  'prioritized',
  'in_development',
  'active',
  'implemented',
  'paused',
  'discarded',
  'archived',
]);
export type OpportunityStatus = z.infer<typeof OpportunityStatusSchema>;

export const ALLOWED_OPPORTUNITY_TRANSITIONS: Record<OpportunityStatus, readonly OpportunityStatus[]> = {
  detected: ['under_review', 'discarded', 'archived'],
  under_review: ['validated', 'detected', 'discarded', 'archived'],
  validated: ['prioritized', 'in_development', 'active', 'paused', 'archived'],
  prioritized: ['in_development', 'active', 'validated', 'paused', 'archived'],
  in_development: ['active', 'implemented', 'paused', 'validated', 'archived'],
  active: ['implemented', 'paused', 'archived'],
  implemented: ['active', 'archived'],
  paused: ['under_review', 'validated', 'active', 'discarded', 'archived'],
  discarded: ['under_review', 'archived'],
  archived: ['under_review', 'detected'],
};

export function isOpportunityTransitionAllowed(
  currentStatus: OpportunityStatus,
  nextStatus: OpportunityStatus
): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_OPPORTUNITY_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
}

export const OpportunityActorSchema = z.object({
  actorId: z.string().nullable().optional(),
  name: z.string().min(1),
  role: z.enum(['proposer', 'beneficiary', 'provider', 'partner', 'validator', 'supporter']),
  consentConfirmed: z.boolean().default(true),
  contactInfo: z.string().nullable().optional(),
});
export type OpportunityActor = z.infer<typeof OpportunityActorSchema>;

export const OpportunityEvidenceSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().nullable().optional(),
  evidenceType: z.enum([
    'community_input',
    'survey',
    'platform_data',
    'field_observation',
    'institutional_document',
    'news_source',
    'statistical_source',
  ]),
  description: z.string().min(1),
  referenceUrl: z.string().nullable().optional(),
  capturedAt: z.string(),
  validationStatus: z.enum(['unreviewed', 'reviewed', 'corroborated', 'disputed', 'rejected']),
});
export type OpportunityEvidence = z.infer<typeof OpportunityEvidenceSchema>;

export const ResourceRequirementSchema = z.object({
  resourceType: z.enum([
    'funding',
    'space',
    'equipment',
    'training',
    'technical_support',
    'institutional_support',
    'volunteers',
    'legal_support',
  ]),
  description: z.string().min(1),
  quantity: z.string().nullable().optional(),
  status: z.enum(['needed', 'identified', 'committed', 'received']),
});
export type ResourceRequirement = z.infer<typeof ResourceRequirementSchema>;

export const LocalOpportunitySchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  type: OpportunityTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  status: OpportunityStatusSchema,
  territorialContext: z.object({
    subnodeId: z.string().nullable().optional(),
    corridorId: z.string().nullable().optional(),
    landmarkId: z.string().nullable().optional(),
    serviceAreaName: z.string().nullable().optional(),
  }),
  actors: z.array(OpportunityActorSchema).min(1),
  evidence: z.array(OpportunityEvidenceSchema).min(1),
  tags: z.array(z.string()).default([]),
  categoryCodes: z.array(DirectoryCategoryCodeSchema).default([]),
  impactHypothesis: z.string().nullable().optional(),
  requiredResources: z.array(ResourceRequirementSchema).default([]),
  visibility: z.enum(['public', 'restricted', 'private']).default('public'),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  lastReviewedAt: z.string().nullable().optional(),
  score: z
    .object({
      territorialImpact: z.number().min(1).max(5),
      feasibility: z.number().min(1).max(5),
      urgency: z.number().min(1).max(5),
      totalScore: z.number(),
    })
    .optional(),
});
export type LocalOpportunity = z.infer<typeof LocalOpportunitySchema>;

export const OpportunityConnectionSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  fromActorName: z.string().min(1),
  toActorName: z.string().min(1),
  connectionType: z.enum([
    'offers_capacity',
    'requires_capacity',
    'offers_space',
    'requires_space',
    'proposes_partnership',
    'provides_support',
    'participates_in_project',
  ]),
  status: z.enum([
    'proposed',
    'contacted',
    'in_conversation',
    'agreed',
    'declined',
    'closed',
  ]),
  consentConfirmed: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OpportunityConnection = z.infer<typeof OpportunityConnectionSchema>;

export function validateOpportunity(opp: LocalOpportunity): string[] {
  const errors: string[] = [];

  if (opp.actors.length === 0) {
    errors.push('La oportunidad debe contener al menos un actor con consentimiento.');
  }

  const unconsentedActors = opp.actors.filter((a) => !a.consentConfirmed);
  if (unconsentedActors.length > 0) {
    errors.push('Todos los actores registrados deben haber otorgado consentimiento explícito.');
  }

  if (opp.evidence.length === 0) {
    errors.push('La oportunidad debe incorporar al menos una evidencia comprobable.');
  }

  if (opp.status === 'validated' || opp.status === 'active' || opp.status === 'implemented') {
    const hasCorroboratedEvidence = opp.evidence.some(
      (e) => e.validationStatus === 'corroborated' || e.validationStatus === 'reviewed'
    );
    if (!hasCorroboratedEvidence) {
      errors.push(
        `Para alcanzar estado '${opp.status}', la oportunidad requiere evidencia revisada o corroborada.`
      );
    }
  }

  return errors;
}
