/**
 * Test de contrato del DataSource (DEMO-2, #17).
 *
 * Verifica que dos implementaciones distintas — la sintética real del demo
 * (SyntheticDataSource) y un fixture fake — cumplen el mismo contrato
 * observable. Así el contrato queda asegurado antes de agregar ApiDataSource
 * (DEMO-3, #18) sobre los endpoints `/api/*`.
 *
 * R5-UI (#109): el contrato incluye `getActivos` (dominio `activos`, R5b) —
 * toda implementación del DataSource sirve activos ciudadanos con pseudónimo
 * (createdByHash) y estado del flujo de moderación.
 */
import { describe, expect, it } from "vitest";
import type { DataSource } from "./dataSource";
import { SyntheticDataSource } from "./SyntheticDataSource";
import type {
  ActivoTerritorial,
  Capa,
  CategoriaReporte,
  Evidencia,
  EventoTerritorial,
  FeatureTerritorial,
  ReporteTerritorial,
  Territorio,
} from "./types";

/** Fixture mínimo: otra implementación del mismo contrato. */
class FakeDataSource implements DataSource {
  async getTerritorios(): Promise<Territorio[]> {
    return [
      {
        id: "fake-norte", key: "norte", name: "Norte", subtitle: "Fixture",
        population: 1000, focus: "Fixture", focusLong: "Fixture",
        narrative: "Fixture", center: { lat: 0, lng: 0 }, color: "#000000",
      },
      {
        id: "fake-sur", key: "sur", name: "Sur", subtitle: "Fixture",
        population: 2000, focus: "Fixture", focusLong: "Fixture",
        narrative: "Fixture", center: { lat: 1, lng: 1 },
      },
    ];
  }

  async getCapas(territorioKey: string): Promise<Capa[]> {
    return territorioKey
      ? [{ key: "capa-fake", name: "Capa fixture", domain: "assets", geometry: "Point", defaultOn: true, producedBy: ["fixture"] }]
      : [];
  }

  async getCategoriasReporte(territorioKey: string): Promise<CategoriaReporte[]> {
    return territorioKey
      ? [{ code: "cat-fake", label: "Categoría fixture", layer: "capa-fake" }]
      : [];
  }

  async getFeatures(territorioKey: string): Promise<FeatureTerritorial[]> {
    return territorioKey
      ? [{
          id: "feat-fake", nodeKey: territorioKey, layer: "capa-fake", x: 1, y: 1,
          title: "Feature fixture", status: "verified", observedAt: "2026-01-01",
          sourceLabel: "Ilustrativa · fixture", isSynthetic: true, domain: "assets",
          type: "asset", props: {},
        }]
      : [];
  }

  async getReportes(_territorioKey: string): Promise<ReporteTerritorial[]> {
    return [];
  }

  async getActivos(territorioKey: string): Promise<ActivoTerritorial[]> {
    return territorioKey
      ? [{
          id: "act-fake", nodeKey: territorioKey, tipo: "patrimonio",
          titulo: "Activo fixture", descripcion: "Fixture", estado: "propuesto",
          lat: -31.5, lng: -68.5, x: 50, y: 50, createdByHash: "fakehash0000",
          createdAt: "2026-01-01", isSynthetic: true,
        }]
      : [];
  }

  async getEventos(_territorioId: string): Promise<EventoTerritorial[]> {
    return [];
  }

  async getEvidencias(): Promise<Evidencia[]> {
    return [{ code: "EV-FAKE", title: "Evidencia fixture", status: "verified" }];
  }

  esSintetico(): boolean {
    return false;
  }
}

/** El contrato observable que toda implementación debe cumplir. */
async function verificarContrato(ds: DataSource): Promise<Territorio[]> {
  const territorios = await ds.getTerritorios();
  expect(Array.isArray(territorios)).toBe(true);
  expect(territorios.length).toBeGreaterThanOrEqual(2);
  for (const t of territorios) {
    expect(typeof t.id).toBe("string");
    expect(typeof t.key).toBe("string");
    expect(typeof t.name).toBe("string");
    expect(typeof t.population).toBe("number");
    expect(typeof t.center.lat).toBe("number");
    expect(typeof t.center.lng).toBe("number");
  }
  // Claves de territorio únicas (la UI navega por key)
  const keys = territorios.map((t) => t.key);
  expect(new Set(keys).size).toBe(keys.length);

  for (const t of territorios) {
    const capas = await ds.getCapas(t.key);
    expect(Array.isArray(capas)).toBe(true);
    for (const c of capas) {
      expect(typeof c.key).toBe("string");
      expect(typeof c.name).toBe("string");
      expect(typeof c.defaultOn).toBe("boolean");
      expect(Array.isArray(c.producedBy)).toBe(true);
    }

    const cats = await ds.getCategoriasReporte(t.key);
    for (const cat of cats) {
      expect(typeof cat.code).toBe("string");
      expect(typeof cat.label).toBe("string");
      // Integridad: cada categoría referencia una capa existente del territorio
      expect(capas.some((c) => c.key === cat.layer)).toBe(true);
    }

    const feats = await ds.getFeatures(t.key);
    for (const f of feats) {
      expect(f.nodeKey).toBe(t.key);
      expect(["asset", "problem"]).toContain(f.type);
      expect(typeof f.title).toBe("string");
      expect(typeof f.layer).toBe("string");
    }

    expect(Array.isArray(await ds.getReportes(t.key))).toBe(true);
    expect(Array.isArray(await ds.getEventos(t.id))).toBe(true);

    // R5-UI (#109): activos ciudadanos — pseudónimo sin PII, estado válido.
    const activos = await ds.getActivos(t.key);
    expect(Array.isArray(activos)).toBe(true);
    for (const a of activos) {
      expect(a.nodeKey).toBe(t.key);
      expect(typeof a.titulo).toBe("string");
      expect(typeof a.createdByHash).toBe("string");
      expect(["propuesto", "aprobado", "rechazado"]).toContain(a.estado);
    }
  }

  expect(Array.isArray(await ds.getEvidencias())).toBe(true);
  expect(typeof ds.esSintetico()).toBe("boolean");
  return territorios;
}

describe("Contrato DataSource (DEMO-2, #17)", () => {
  it("SyntheticDataSource (datos reales del demo) cumple el contrato", async () => {
    const territorios = await verificarContrato(new SyntheticDataSource());
    expect(territorios.map((t) => t.key)).toEqual(["capital", "caucete", "iglesia"]);
    expect(new SyntheticDataSource().esSintetico()).toBe(true);
  });

  it("FakeDataSource (fixture) cumple el mismo contrato", async () => {
    const territorios = await verificarContrato(new FakeDataSource());
    expect(territorios.length).toBe(2);
    expect(new FakeDataSource().esSintetico()).toBe(false);
  });

  it("no expone referencias mutables compartidas (copia defensiva)", async () => {
    const ds = new SyntheticDataSource();
    const a = await ds.getTerritorios();
    a.pop();
    const b = await ds.getTerritorios();
    expect(b.length).toBe(3);
  });

  it("SyntheticDataSource.getActivos deriva lat/lng del centro del nodo (R5-UI, #109)", async () => {
    const ds = new SyntheticDataSource();
    const territorios = await ds.getTerritorios();
    for (const t of territorios) {
      const activos = await ds.getActivos(t.key);
      for (const a of activos) {
        expect(a.nodeKey).toBe(t.key);
        expect(a.isSynthetic).toBe(true);
        expect(a.estado).toBe("propuesto");
        expect(typeof a.createdByHash).toBe("string");
        // envolvente de presentación ±0.05° alrededor del centro (ADR-030)
        expect(a.lat).toBeGreaterThan(t.center.lat - 0.05);
        expect(a.lat).toBeLessThan(t.center.lat + 0.05);
        expect(a.lng).toBeGreaterThan(t.center.lng - 0.05);
        expect(a.lng).toBeLessThan(t.center.lng + 0.05);
      }
    }
    // fixture declarado en SyntheticDataSource: 2 en capital, 1 en caucete, 1 en iglesia
    expect((await ds.getActivos("capital")).length).toBe(2);
    expect((await ds.getActivos("caucete")).length).toBe(1);
    expect((await ds.getActivos("iglesia")).length).toBe(1);
  });
});
