/**
 * Test de mapeo de ApiDataSource (DEMO-3, #18).
 *
 * Verifica el mapeo de las respuestas reales del backend (apps/api) al
 * contrato DataSource, con `fetch` mockeado — sin red en CI. Las lecturas
 * que el backend aún no expone deben declararse vacías (R15: no simular).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiDataSource } from "./ApiDataSource";

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiDataSource (DEMO-3, #18)", () => {
  it("mapea GET /api/territorios al contrato Territorio", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          count: 2,
          data: [
            { id: "t1", nombre: "Capital", provincia: "San Juan", activo: true },
            { id: "t2", nombre: "Caucete", provincia: "San Juan", activo: true },
          ],
        }),
      ),
    );
    const ds = new ApiDataSource();
    const territorios = await ds.getTerritorios();
    expect(territorios.map((t) => t.name)).toEqual(["Capital", "Caucete"]);
    expect(territorios[0].key).toBe("t1");
    expect(territorios[0].subtitle).toBe("San Juan");
    // R15: población no expuesta por el backend → 0, no inventada
    expect(territorios.every((t) => t.population === 0)).toBe(true);
    expect(ds.esSintetico()).toBe(false);
  });

  it("mapea GET /api/evidencias al contrato Evidencia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          count: 1,
          evidencias: [{ id: "e1", code: "EV-001", title: "PostGIS sano", status: "ok" }],
        }),
      ),
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
      vi.fn(async () =>
        jsonResponse({ success: false, error: "sin conexión a la BD", data: [], count: 0 }),
      ),
    );
    const ds = new ApiDataSource();
    await expect(ds.getTerritorios()).rejects.toThrow("sin conexión a la BD");
  });

  it("declara vacías las lecturas sin ruta en el backend (R15: no simular)", async () => {
    const ds = new ApiDataSource();
    expect(await ds.getCapas("capital")).toEqual([]);
    expect(await ds.getCategoriasReporte("capital")).toEqual([]);
    expect(await ds.getFeatures("capital")).toEqual([]);
    expect(await ds.getReportes("capital")).toEqual([]);
    expect(await ds.getEventos("capital")).toEqual([]);
  });
});
