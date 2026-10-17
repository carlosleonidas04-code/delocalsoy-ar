/**
 * packages/contracts/src/directoryTaxonomy.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Taxonomía Canónica de Directorio Territorial
 * Serie Contracts NCAP-R2 · Comercios, Espacios Públicos y Productores
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';

export const RamaTaxonomicaSchema = z.enum([
  'ALIMENTOS_Y_BEBIDAS_LOCALES',
  'ARTESANIAS_Y_MANUFACTURA',
  'SERVICIOS_PROFESIONALES_Y_OFICIOS',
  'TURISMO_Y_PATRIMONIO',
  'ESPACIOS_PUBLICOS_Y_RECREACION',
  'SALUD_Y_BIENESTAR_COMUNITARIO',
  'EDUCACION_Y_CULTURA'
]);
export type RamaTaxonomica = z.infer<typeof RamaTaxonomicaSchema>;

export const CategoriaDirectorioItemSchema = z.object({
  idCategoria: z.string(),
  rama: RamaTaxonomicaSchema,
  nombre: z.string(),
  descripcion: z.string(),
  icono: z.string().optional(),
  permiteVentaDirecta: z.boolean().default(false),
  subcategorias: z.array(z.string()).default([]),
});
export type CategoriaDirectorioItem = z.infer<typeof CategoriaDirectorioItemSchema>;

export const TAXONOMIA_CANONICA_DELOCALSOY: CategoriaDirectorioItem[] = [
  {
    idCategoria: 'cat-almacen-barrial',
    rama: 'ALIMENTOS_Y_BEBIDAS_LOCALES',
    nombre: 'Almacén Barrial & Despensa de Proximidad',
    descripcion: 'Puntos de abastecimiento de alimentos secos, frescos y productos regionales en el barrio',
    icono: 'Store',
    permiteVentaDirecta: true,
    subcategorias: ['Almacén', 'Fiambrería', 'Verdulería de cercanía', 'Panadería artesanal']
  },
  {
    idCategoria: 'cat-gastronomia-regional',
    rama: 'ALIMENTOS_Y_BEBIDAS_LOCALES',
    nombre: 'Gastronomía Sanjuanina & Puntos de Encuentro',
    descripcion: 'Empanadas sanjuaninas, semitas caseras, dulces de membrillo y gastronomía tradicional',
    icono: 'Utensils',
    permiteVentaDirecta: true,
    subcategorias: ['Rotisería barrial', 'Comedor tradicional', 'Puesto de feria']
  },
  {
    idCategoria: 'cat-espacio-civico',
    rama: 'ESPACIOS_PUBLICOS_Y_RECREACION',
    nombre: 'Plazas, Parques y Ejes Peatonales',
    descripcion: 'Espacios de encuentro cívico, esparcimiento verde y articulación barrial',
    icono: 'Trees',
    permiteVentaDirecta: false,
    subcategorias: ['Plaza departamental', 'Parque urbano', 'Paseo peatonal', 'Corredor verde']
  },
  {
    idCategoria: 'cat-taller-oficio',
    rama: 'SERVICIOS_PROFESIONALES_Y_OFICIOS',
    nombre: 'Talleres de Oficios y Reparación',
    descripcion: 'Herrería, zapatería, carpintería, mecánica y oficios tradicionales sanjuaninos',
    icono: 'Wrench',
    permiteVentaDirecta: true,
    subcategorias: ['Reparación', 'Oficio tradicional', 'Taller mecánico']
  }
];
