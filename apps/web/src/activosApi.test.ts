/**
 * Test del cliente de sesión y alta de activos — CORE-004 R5-UI (#109).
 *
 * Fetch mockeado (sin red en CI): verifica el manejo honesto de los estados
 * del backend R5b/R5a — 201/200 felices, 400 datos/anti-PII, 401 sesión,
 * 409 registro, 429 rate limit — y que la validación usa el MISMO schema
 * compartido del backend (contracts), sin duplicación local.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorDeSesion,
  ErrorDeValidacion,
  cerrarSesion,
  crearActivo,
  iniciarSesion,
  registrarCiudadano,
  sesionActiva,
  usuarioActivo,
  validarAltaActivo,
} from "./activosApi";

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const ALTA_VALIDA = {
  tipo: "patrimonio",
  titulo: "Ex estación de ferrocarril",
  descripcion: "Edificio histórico del corredor",
  nodo_key: "capital",
  lat: -31.5375,
  lng: -68.5364,
};

const LOGIN_OK = {
  success: true,
  data: {
    token: "tok-123",
    usuario: { id: "u1", email: "vecina@ejemplo.test", rol: "ciudadano" },
  },
};

const ACTIVO_CREADO = {
  id: "a1",
  tipo: "patrimonio",
  titulo: "Ex estación de ferrocarril",
  descripcion: "Edificio histórico del corredor",
  estado: "propuesto",
  nodo_key: "capital",
  lat: -31.5375,
  lng: -68.5364,
  created_by_hash: "abcdef0123456789abcdef0123456789",
  created_at: "2026-10-08T12:00:00.000Z",
};

beforeEach(() => {
  cerrarSesion();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validarAltaActivo (schema compartido @delocalsoy/contracts)", () => {
  it("acepta un alta válida y la normaliza", () => {
    const r = validarAltaActivo(ALTA_VALIDA);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toEqual(ALTA_VALIDA);
    }
  });

  it("rechaza título corto y lat/lng fuera de rango con mensajes de campo", () => {
    const r = validarAltaActivo({ ...ALTA_VALIDA, titulo: "ab", lat: 999 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("rechaza nodo_key fuera del vocabulario CORE-002", () => {
    const r = validarAltaActivo({ ...ALTA_VALIDA, nodo_key: "mendoza" });
    expect(r.ok).toBe(false);
  });
});

describe("iniciarSesion (POST /api/auth/login)", () => {
  it("guarda la sesión en memoria con token y usuario", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(LOGIN_OK)));
    expect(sesionActiva()).toBe(false);
    await iniciarSesion("vecina@ejemplo.test", "secreto-seguro");
    expect(sesionActiva()).toBe(true);
    expect(usuarioActivo()).toEqual({ email: "vecina@ejemplo.test", rol: "ciudadano" });
  });

  it("401 → ErrorDeSesion genérico (anti-enumeración R5a), sin sesión", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ success: false, error: "credenciales inválidas" }, 401)),
    );
    await expect(iniciarSesion("noexiste@ejemplo.test", "mal")).rejects.toThrow(ErrorDeSesion);
    await expect(iniciarSesion("noexiste@ejemplo.test", "mal")).rejects.toThrow(
      "credenciales inválidas",
    );
    expect(sesionActiva()).toBe(false);
  });

  it("429 → ErrorDeSesion de rate limit (R5a #101)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "rate limit" }, 429)));
    await expect(iniciarSesion("a@ejemplo.test", "x")).rejects.toThrow(/429/);
    expect(sesionActiva()).toBe(false);
  });
});

describe("registrarCiudadano (POST /api/auth/register)", () => {
  it("409 → ErrorDeSesion: el email ya está registrado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ success: false, error: "el email ya está registrado" }, 409)),
    );
    await expect(registrarCiudadano("usado@ejemplo.test", "secreto-seguro")).rejects.toThrow(
      "el email ya está registrado",
    );
    expect(sesionActiva()).toBe(false);
  });

  it("201 → registra y loguea (register + login, 2 llamadas)", async () => {
    const fetchMock = vi.fn(async (path: string) => {
      if (path === "/api/auth/register") {
        return jsonResponse(
          { success: true, data: { id: "u1", email: "nueva@ejemplo.test", rol: "ciudadano" } },
          201,
        );
      }
      if (path === "/api/auth/login") {
        return jsonResponse(LOGIN_OK);
      }
      throw new Error("ruta no mockeada: " + path);
    });
    vi.stubGlobal("fetch", fetchMock);
    await registrarCiudadano("nueva@ejemplo.test", "secreto-seguro");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sesionActiva()).toBe(true);
  });
});

describe("crearActivo (POST /api/activos, R5b)", () => {
  it("sin sesión → ErrorDeSesion, sin salir a la red", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(crearActivo(ALTA_VALIDA)).rejects.toThrow(ErrorDeSesion);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validación local fallida → ErrorDeValidacion, sin salir a la red", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(LOGIN_OK)));
    await iniciarSesion("vecina@ejemplo.test", "secreto-seguro");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(crearActivo({ ...ALTA_VALIDA, lat: 999 })).rejects.toThrow(ErrorDeValidacion);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con sesión → POST con Bearer y cuerpo validado; 201 devuelve el activo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(LOGIN_OK)));
    await iniciarSesion("vecina@ejemplo.test", "secreto-seguro");
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: ACTIVO_CREADO }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const activo = await crearActivo(ALTA_VALIDA);
    expect(activo).toEqual(ACTIVO_CREADO);
    expect(activo.estado).toBe("propuesto");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // vi.fn(async () => ...) no declara parámetros: mock.calls se tipa como [] → cast doble (TS2352)
    const [path, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe("/api/activos");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
    expect(JSON.parse(String(init.body))).toEqual(ALTA_VALIDA);
  });

  it("400 anti-PII → ErrorDeValidacion con el mensaje del backend, sin eco del valor", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(LOGIN_OK)));
    await iniciarSesion("vecina@ejemplo.test", "secreto-seguro");
    const mensaje = "payload rechazado: contiene datos personales identificables (email) — ADR-020 cond. 1, Ley 25.326";
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: mensaje }, 400)));
    await expect(
      crearActivo({ ...ALTA_VALIDA, descripcion: "contactame a juanita@ejemplo.test" }),
    ).rejects.toThrow(ErrorDeValidacion);
    await expect(
      crearActivo({ ...ALTA_VALIDA, descripcion: "contactame a juanita@ejemplo.test" }),
    ).rejects.toThrow("ADR-020");
  });

  it("401 → cierra la sesión en memoria y pide login otra vez", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(LOGIN_OK)));
    await iniciarSesion("vecina@ejemplo.test", "secreto-seguro");
    expect(sesionActiva()).toBe(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ success: false, error: "sesión inválida" }, 401)),
    );
    await expect(crearActivo(ALTA_VALIDA)).rejects.toThrow(ErrorDeSesion);
    expect(sesionActiva()).toBe(false);
  });

  it("500 → Error genérico sanitizado (R5a #100), la sesión sigue activa", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(LOGIN_OK)));
    await iniciarSesion("vecina@ejemplo.test", "secreto-seguro");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ success: false, error: "fallo al crear el activo" }, 500)),
    );
    await expect(crearActivo(ALTA_VALIDA)).rejects.toThrow("fallo al crear el activo");
    expect(sesionActiva()).toBe(true);
  });
});
