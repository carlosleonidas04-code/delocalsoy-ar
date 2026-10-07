/**
 * Test de mapeo de ApiDataSource (DEMO-3 #18 → CORE-003 R3, #83).
 *
 * Verifica el mapeo completo de las respuestas reales del backend al
 * contrato DataSource, con fetch mockeado — sin red en CI. Incluye la
 * proyección de presentación lat/lng → x/y (ADR-030). Lo que el backend
 * aún no expone se declara vacío con aserción explícita (R15: no simular).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiDataSource } from "./ApiDataSource";

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const NODO_CAPITAL = {
  id: "n1",
  key: "capital",
  nombre: "Capital",
  subtitle: "Centro–Cívico–Desamparados",
  foco: "Comercio y espacio público",
  centro_lat: -31.537,
  centro_lng: -68.522,
  poblacion: 115000,
  activo: true,
};

/** Mock de fetch con rutas: cada path mockeado responde su cuerpo. */
function ruteaFetch(rutas: Record<string, unknown>) {
  return vi.fn(async (path: string) => {
    const cuerpo = rutas[path];
    if (cuerpo === undefined) {
      throw new Error("ruta no mockeada: " + path);
    }
    return jsonResponse(cuerpo);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiDataSource (CORE-003 R3, #83)", () => {
  it("getTerritorios mapea GET /api/nodos con población, centro y foco reales", async () => {
    vi.stubGlobal(
      "fetch",
      ruteaFetch({
        "/api/nodos": { success: true, count: 1, data: [NODO_CAPITAL] },
      }),
    );
    const ds = new ApiDataSource();
    const territorios = await ds.getTerritorios();
    expect(territorios).toHaveLength(1);
    const t = territorios[0];
    expect(t.key).toBe("capital");
    expect(t.name).toBe("Capital");
    expect(t.subtitle).toBe("Centro–Cívico–Desamparados");
    expect(t.population).toBe(115000);
    expect(t.center).toEqual({ lat: -31.537, lng: -68.522 });
    expect(t.focus).toBe("Comercio y espacio público");
    expect(t.color).toBe("#C2410C");
    expect(ds.esSintetico()).toBe(false);
  });

  it("getCapas y getCategoriasReporte mapean el vocabulario del nodo", async () => {
    vi.stubGlobal(
      "fetch",
      ruteaFetch({
        "/api/nodos/capital/capas": {
          success: true,
          count: 1,
          data: [
            { id: "c1", key: "public_lighting", nombre: "Iluminación pública", dominio: "problems", geometria: "Point", default_on: false },
          ],
        },
        "/api/nodos/capital/categorias": {
          success: true,
          count: 1,
          data: [{ id: "k1", code: "insufficient_lighting", label: "Iluminación insuficiente", layer: "public_lighting" }],
        },
      }),
    );
    const ds = new ApiDataSource();
    const capas = await ds.getCapas("capital");
    expect(capas[0]).toMatchObject({
      key: "public_lighting",
      name: "Iluminación pública",
      domain: "problems",
      geometry: "Point",
      defaultOn: false,
    });
    // productores no modelados en el schema → vacío, no inventado (R15)
    expect(capas[0].producedBy).toEqual([]);
    const cats = await ds.getCategoriasReporte("capital");
    expect(cats[0]).toEqual({
      code: "insufficient_lighting",
      label: "Iluminación insuficiente",
      layer: "public_lighting",
    });
  });

  it("getFeatures proyecta lat/lng → x/y sobre la envolvente del centro (ADR-030)", async () => {
    vi.stubGlobal(
      "fetch",
      ruteaFetch({
        "/api/nodos/capital": { success: true, data: NODO_CAPITAL },
        "/api/nodos/capital/features": {
          success: true,
          count: 2,
          data: [
            {
              id: "f1",
              layer: "public_lighting",
              domain: "problems",
              titulo: "Feature en el centro exacto del nodo",
              tipo: "problem",
              estado: "pending",
              fuente_label: "Ilustrativa · relevamiento comunitario",
              observado_at: "2026-09-18T12:00:00.000Z",
              lat: -31.537,
              lng: -68.522,
              is_synthetic: true,
            },
            {
              id: "f2",
              layer: "commerce",
              domain: "assets",
              titulo: "Feature en la esquina noroeste de la envolvente",
              tipo: "asset",
              estado: "verified",
              fuente_label: "Ilustrativa · registro sectorial",
              observado_at: "2026-09-08T12:00:00.000Z",
              lat: -31.487,
              lng: -68.572,
              is_synthetic: true,
            },
          ],
        },
      }),
    );
    const ds = new ApiDataSource();
    const feats = await ds.getFeatures("capital");
    expect(feats).toHaveLength(2);
    // el centro del nodo cae en el medio del lienzo de presentación
    expect(feats[0].x).toBeCloseTo(50);
    expect(feats[0].y).toBeCloseTo(50);
    // esquina noroeste de la envolvente ±0.05° → origen (0, 0)
    expect(feats[1].x).toBeCloseTo(0);
    expect(feats[1].y).toBeCloseTo(0);
    expect(feats[1].type).toBe("asset");
    expect(feats[0].type).toBe("problem");
    expect(feats.every((f) => f.isSynthetic)).toBe(true);
    expect(feats.every((f) => f.nodeKey === "capital")).toBe(true);
    expect(feats.every((f) => f.props)).toBe(true);
  });

  it("getReportes mapea el flujo al contrato (hash como eventId, picked proyectado)", async () => {
    vi.stubGlobal(
      "fetch",
      ruteaFetch({
        "/api/nodos/capital": { success: true, data: NODO_CAPITAL },
        "/api/nodos/capital/reportes": {
          success: true,
          count: 1,
          data: [
            {
              id: "r1",
              nodo_id: "n1",
              categoria: "insufficient_lighting",
              descripcion: "Corredor oscuro frente a plaza",
              estado: "received",
              lat: -31.537,
              lng: -68.522,
              is_synthetic: true,
              hash: "abc123",
              created_at: "2026-10-01T12:00:00.000Z",
              updated_at: "2026-10-01T12:00:00.000Z",
            },
          ],
        },
      }),
    );
    const ds = new ApiDataSource();
    const reportes = await ds.getReportes("capital");
    expect(reportes).toHaveLength(1);
    const r = reportes[0];
    expect(r.eventId).toBe("abc123");
    expect(r.category).toBe("insufficient_lighting");
    expect(r.description).toBe("Corredor oscuro frente a plaza");
    expect(r.status).toBe("received");
    expect(r.createdAt).toBe("2026-10-01T12:00:00.000Z");
    expect(r.picked.x).toBeCloseTo(50);
    expect(r.picked.y).toBeCloseTo(50);
    // sin tabla de historial: única entrada honesta (R15)
    expect(r.history).toEqual([{ status: "received", at: "2026-10-01T12:00:00.000Z" }]);
  });

  it("getEventos sigue declarado vacío (events_raw sin vínculo con nodos — ADR-030)", async () => {
    const ds = new ApiDataSource();
    expect(await ds.getEventos("capital")).toEqual([]);
  });

  it("getEvidencias mapea el envelope de evidencias", async () => {
    vi.stubGlobal(
      "fetch",
      ruteaFetch({
        "/api/evidencias": {
          count: 1,
          evidencias: [{ id: "e1", code: "EV-001", title: "PostGIS sano", status: "ok" }],
        },
      }),
    );
    const ds = new ApiDataSource();
    const evs = await ds.getEvidencias();
    expect(evs).toEqual([{ code: "EV-001", title: "PostGIS sano", status: "ok" }]);
  });

  it("rechaza honestamente errores HTTP del backend", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "boom" }, 500)));
    const ds = new ApiDataSource();
    await expect(ds.getTerritorios()).rejects.toThrow("HTTP 500");
  });

  it("rechaza honestamente envelopes de error (success: false)", async () => {
    vi.stubGlobal(
      "fetch",
      ruteaFetch({
        "/api/nodos": { success: false, error: "sin conexión a la BD", data: [], count: 0 },
      }),
    );
    const ds = new ApiDataSource();
    await expect(ds.getTerritorios()).rejects.toThrow("sin conexión a la BD");
  });
});
