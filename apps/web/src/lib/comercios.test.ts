import { describe, expect, it } from 'vitest';
import {
  SCHEMA_ORG_RUBRO,
  jsonLdComercio,
  facetasDesdeQuery,
  queryDesdeFacetas,
  type ComercioItem,
} from './comercios';

function fixture(parcial: Partial<ComercioItem> = {}): ComercioItem {
  return {
    id: 'cm-pub-0001',
    titulo: 'Almacén de doña Rosa',
    nodo_key: 'capital',
    subnodo_key: null,
    lat: null,
    lng: null,
    descripcion: null,
    rubro: { id: 'retail', rama: 'productos', label: 'Retail' },
    estado: 'activo',
    habilitacion_estado: 'sin_dato',
    titularidad_estado: 'sin_reclamo',
    estado_epistemico: 'pending',
    ...parcial,
  };
}

describe('MK-3c C3 — SCHEMA_ORG_RUBRO (mapa honesto rubro canon → schema.org)', () => {
  it('cubre las 11 claves del canon de rubros, sin inventar subtipos', () => {
    expect(Object.keys(SCHEMA_ORG_RUBRO).sort()).toEqual([
      'culture_leisure',
      'education_training',
      'food_drink',
      'health_wellness',
      'home_technical',
      'institutions_organizations',
      'local_production',
      'professional_services',
      'retail',
      'social_economy',
      'spaces_rentals',
    ]);
    for (const valor of Object.values(SCHEMA_ORG_RUBRO)) {
      expect(valor.length).toBeGreaterThan(0);
    }
  });

  it('mapea subtipos con contraparte razonable y deja el resto en LocalBusiness', () => {
    expect(SCHEMA_ORG_RUBRO.food_drink).toBe('FoodEstablishment');
    expect(SCHEMA_ORG_RUBRO.retail).toBe('Store');
    expect(SCHEMA_ORG_RUBRO.professional_services).toBe('ProfessionalService');
    expect(SCHEMA_ORG_RUBRO.home_technical).toBe('HomeAndConstructionBusiness');
    expect(SCHEMA_ORG_RUBRO.health_wellness).toBe('HealthAndBeautyBusiness');
    expect(SCHEMA_ORG_RUBRO.culture_leisure).toBe('EntertainmentBusiness');
    expect(SCHEMA_ORG_RUBRO.local_production).toBe('LocalBusiness');
  });
});

describe('MK-3c C3 — jsonLdComercio (JSON-LD honesto de la ficha pública)', () => {
  it('emite @context schema.org + @type del rubro canon + name', () => {
    const jsonLd = jsonLdComercio(fixture({ rubro: { id: 'food_drink', rama: 'experiencias', label: 'Food & Drink' } }));
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('FoodEstablishment');
    expect(jsonLd.name).toBe('Almacén de doña Rosa');
  });

  it('usa LocalBusiness genérico para rubros sin contraparte o legados cat-* (jamás inventa)', () => {
    expect(jsonLdComercio(fixture())['@type']).toBe('Store');
    expect(
      jsonLdComercio(
        fixture({ rubro: { id: 'cat-alimentos', rama: 'legado', label: 'Alimentos (legado)' } }),
      )['@type'],
    ).toBe('LocalBusiness');
    expect(
      jsonLdComercio(
        fixture({ rubro: { id: 'social_economy', rama: 'economia', label: 'Economía social' } }),
      )['@type'],
    ).toBe('LocalBusiness');
  });

  it('JAMÁS expone PII ni confianza fabricada (Ley 25.326 + decisión DH)', () => {
    const jsonLd = jsonLdComercio(fixture());
    const texto = JSON.stringify(jsonLd);
    for (const prohibido of [
      'telephone',
      'address',
      'aggregateRating',
      'review',
      'identificador',
      'reclamado',
      'hash',
      'titular',
      'habilitacion_estado',
      'estado_epistemico',
    ]) {
      expect(texto.includes(prohibido)).toBe(false);
    }
  });

  it('incluye geo SOLO si existe punto público; sin punto no hay geo', () => {
    const conPunto = jsonLdComercio(fixture({ lat: -31.5372, lng: -68.5234 }));
    expect(conPunto.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: -31.5372,
      longitude: -68.5234,
    });
    const sinPunto = jsonLdComercio(fixture());
    expect(sinPunto.geo).toBeUndefined();
    const soloLat = jsonLdComercio(fixture({ lat: -31.5372 }));
    expect(soloLat.geo).toBeUndefined();
  });

  it('omite openingHours y url: sin dato ratificado no hay campo (R15)', () => {
    const texto = JSON.stringify(jsonLdComercio(fixture()));
    expect(texto.includes('openingHours')).toBe(false);
    expect(texto.includes('url')).toBe(false);
  });
});

describe('MK-3c C2 — facetas en la URL (History API, sin dependencias)', () => {
  it('parsea facetas del query string y omite vacíos o ausentes', () => {
    expect(facetasDesdeQuery('?nodo=capital&rubro=food_drink')).toEqual({
      nodo: 'capital',
      rubro: 'food_drink',
    });
    expect(facetasDesdeQuery('?nodo=&rubro=retail&subnodo=&habilitacion=')).toEqual({
      rubro: 'retail',
    });
    expect(facetasDesdeQuery('')).toEqual({});
    expect(facetasDesdeQuery('?')).toEqual({});
    expect(facetasDesdeQuery('?otra=cosa')).toEqual({});
  });

  it("es redondo con queryDesdeFacetas y '' cuando no hay facetas", () => {
    const facetas = { nodo: 'caucete', rubro: 'local_production', habilitacion: 'verificada' };
    const qs = queryDesdeFacetas(facetas);
    expect(qs).toBe('?nodo=caucete&rubro=local_production&habilitacion=verificada');
    expect(facetasDesdeQuery(qs)).toEqual(facetas);
    expect(queryDesdeFacetas({})).toBe('');
    expect(facetasDesdeQuery(queryDesdeFacetas({ rubro: 'retail' }))).toEqual({ rubro: 'retail' });
  });

  it('serializa en orden estable nodo, rubro, subnodo, habilitacion', () => {
    const qs = queryDesdeFacetas({ habilitacion: 'sin_dato', nodo: 'iglesia', rubro: 'retail', subnodo: 'pismanta' });
    expect(qs).toBe('?nodo=iglesia&rubro=retail&subnodo=pismanta&habilitacion=sin_dato');
  });
});
