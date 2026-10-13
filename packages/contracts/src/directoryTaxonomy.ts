import { z } from 'zod';

export const DirectoryCategoryCodeSchema = z.enum([
  'food_drink',
  'retail',
  'professional_services',
  'home_technical',
  'health_wellness',
  'education_training',
  'culture_leisure',
  'local_production',
  'social_economy',
  'spaces_rentals',
  'institutions_organizations',
]);
export type DirectoryCategoryCode = z.infer<typeof DirectoryCategoryCodeSchema>;

export const ServiceModeSchema = z.enum([
  'on_site',
  'pickup',
  'delivery',
  'appointment',
  'home_service',
  'online',
]);
export type ServiceMode = z.infer<typeof ServiceModeSchema>;

export const TrustLevelSchema = z.enum([
  'unverified',
  'contact_verified',
  'business_verified',
  'local_production_verified',
]);
export type TrustLevel = z.infer<typeof TrustLevelSchema>;

export const OperationalStatusSchema = z.enum([
  'draft',
  'active',
  'temporarily_closed',
  'suspended',
  'archived',
]);
export type OperationalStatus = z.infer<typeof OperationalStatusSchema>;

export const DirectoryAttributeCodeSchema = z.enum([
  'service_mode',
  'coverage_area',
  'payment_methods',
  'accessibility',
  'audience',
  'schedule',
  'local_origin',
  'trust_level',
  'operational_status',
]);
export type DirectoryAttributeCode = z.infer<typeof DirectoryAttributeCodeSchema>;

export const DirectorySubcategorySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  isActive: z.boolean().default(true),
  requiredAttributes: z.array(DirectoryAttributeCodeSchema).default([]),
  optionalAttributes: z.array(DirectoryAttributeCodeSchema).default([]),
  synonyms: z.array(z.string()).default([]),
});
export type DirectorySubcategory = z.infer<typeof DirectorySubcategorySchema>;

export const DirectoryCategorySchema = z.object({
  code: DirectoryCategoryCodeSchema,
  name: z.string().min(1),
  description: z.string(),
  isActive: z.boolean().default(true),
  subcategories: z.array(DirectorySubcategorySchema).default([]),
});
export type DirectoryCategory = z.infer<typeof DirectoryCategorySchema>;

export const DirectoryListingSchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  actorId: z.string().min(1),
  displayName: z.string().min(1),
  headline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  primaryCategory: DirectoryCategoryCodeSchema,
  subcategories: z.array(z.string()).max(2).default([]),
  tags: z.array(z.string()).default([]),
  address: z
    .object({
      street: z.string().nullable().optional(),
      number: z.string().nullable().optional(),
      neighborhood: z.string().nullable().optional(),
      subnodeId: z.string().nullable().optional(),
      city: z.string().default('San Juan'),
      province: z.string().default('San Juan'),
    })
    .nullable()
    .optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      sourceId: z.string(),
    })
    .nullable()
    .optional(),
  serviceModes: z.array(ServiceModeSchema).default([]),
  paymentMethods: z.array(z.string()).default([]),
  accessibility: z.array(z.string()).default([]),
  trustLevel: TrustLevelSchema.default('unverified'),
  status: OperationalStatusSchema.default('active'),
  contactPolicy: z.enum(['public', 'through_platform', 'private']).default('public'),
  contact: z
    .object({
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
      social: z.string().nullable().optional(),
    })
    .optional(),
  territorialContext: z.object({
    subnodeId: z.string().nullable().optional(),
    corridorId: z.string().nullable().optional(),
    landmarkId: z.string().nullable().optional(),
  }),
});
export type DirectoryListing = z.infer<typeof DirectoryListingSchema>;

export function validateDirectoryTaxonomy(categories: DirectoryCategory[]): string[] {
  const errors: string[] = [];
  const catCodes = new Set<string>();
  const subCodes = new Set<string>();

  for (const cat of categories) {
    if (catCodes.has(cat.code)) {
      errors.push(`Categoría primaria duplicada: ${cat.code}`);
    }
    catCodes.add(cat.code);

    for (const sub of cat.subcategories) {
      if (subCodes.has(sub.code)) {
        errors.push(`Subcategoría duplicada: ${sub.code}`);
      }
      subCodes.add(sub.code);

      if (!sub.code.startsWith(`${cat.code}.`)) {
        errors.push(`Subcategoría ${sub.code} no tiene prefijo de categoría ${cat.code}.`);
      }
    }
  }

  return errors;
}
