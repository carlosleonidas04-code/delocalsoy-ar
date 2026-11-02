/**
 * DELocalSoy.AR — Contexto de sesion de plataforma para los artefactos A1–A4
 * (ART-R0, #269, epica #268). Adaptador delgado sobre lib/sesion.ts: los
 * paneles R1+ consumen useSesion(). El montaje llega recien en ART-R5
 * (ArtefactosRoot) — este archivo NO toca App.tsx ni main.tsx.
 *
 * Decision DH 2026-10-29: login JWT real + degradacion honesta a synthetic.
 * ADR-040 (FE-DEUDA-01, #292): selector canonico unico VITE_MOCK_API ('1'
 * activa synthetic; default JWT). VITE_DATA_SOURCE (demo/, ADR-029) queda
 * deprecado como selector vivo — fixtures de suites nada mas.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  crearSesion,
  SesionError,
  type EstadoSesion,
  type ModoSesion,
  type Sesion,
  type UsuarioSesion,
} from '../../lib/sesion';

const transporteNavegador = (
  ruta: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => fetch(ruta, init);

const almacenNavegador = {
  getItem: (clave: string) => window.localStorage.getItem(clave),
  setItem: (clave: string, valor: string) => {
    window.localStorage.setItem(clave, valor);
  },
  removeItem: (clave: string) => {
    window.localStorage.removeItem(clave);
  },
};

function modoDesdeOrigen(): ModoSesion {
  // ADR-040 (FE-DEUDA-01, #292): selector canonico unico — VITE_MOCK_API === '1'
  // activa la degradacion honesta a synthetic; por defecto, login JWT real.
  // Mantiene la semantica de lib/dataSource.ts (createDataSource): un solo
  // selector para toda la app, sin VITE_DATA_SOURCE.
  const mockApi: unknown = import.meta.env.VITE_MOCK_API;
  return mockApi === '1' ? 'synthetic' : 'jwt';
}

export interface ValorSesion {
  modo: ModoSesion;
  estado: EstadoSesion;
  cargando: boolean;
  error: string | null;
  aviso: string | null;
  iniciar(email: string, password: string): Promise<void>;
  registrar(email: string, password: string, displayName?: string): Promise<void>;
  cerrar(): void;
  refrescar(): Promise<void>;
}

const SesionContexto = createContext<ValorSesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const sesion = useMemo<Sesion>(
    () =>
      crearSesion({
        transporte: transporteNavegador,
        almacen: almacenNavegador,
        modo: modoDesdeOrigen(),
      }),
    []
  );

  const [estado, setEstado] = useState<EstadoSesion>({ tipo: 'sin_sesion' });
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    setCargando(true);
    try {
      setEstado(await sesion.quienSoy());
    } finally {
      setCargando(false);
    }
  }, [sesion]);

  const iniciar = useCallback(
    async (email: string, password: string) => {
      setCargando(true);
      setError(null);
      setAviso(null);
      try {
        const usuario: UsuarioSesion = await sesion.iniciar(email, password);
        setEstado({ tipo: 'sesion', usuario });
      } catch (e) {
        const mensaje: string =
          e instanceof SesionError ? e.message : 'fallo al iniciar sesion';
        setError(mensaje);
        setEstado({ tipo: 'sin_sesion' });
      } finally {
        setCargando(false);
      }
    },
    [sesion]
  );

  const registrar = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setCargando(true);
      setError(null);
      setAviso(null);
      try {
        // El register del API no devuelve token (CORE-004 R3): tras crear
        // la cuenta hay que iniciar sesion — aviso honesto, sin sesion falsa.
        await sesion.registrar(email, password, displayName);
        setEstado({ tipo: 'sin_sesion' });
        setAviso('cuenta creada; inicia sesion para escribir como ciudadano');
      } catch (e) {
        const mensaje: string =
          e instanceof SesionError ? e.message : 'fallo al registrar';
        setError(mensaje);
      } finally {
        setCargando(false);
      }
    },
    [sesion]
  );

  const cerrar = useCallback(() => {
    sesion.cerrarSesion();
    setEstado({ tipo: 'sin_sesion' });
    setAviso(null);
    setError(null);
  }, [sesion]);

  const valor = useMemo<ValorSesion>(
    () => ({ modo: sesion.modo, estado, cargando, error, aviso, iniciar, registrar, cerrar, refrescar }),
    [sesion, estado, cargando, error, aviso, iniciar, registrar, cerrar, refrescar]
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContexto);
  if (valor === null) {
    throw new Error('useSesion requiere <SesionProvider> (montaje en ART-R5)');
  }
  return valor;
}
