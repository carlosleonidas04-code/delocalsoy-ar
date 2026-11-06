/**
 * DELocalSoy.AR — Panel «Mi cuenta» (ARTEFACTOS-ROLES AR1, #400, épica
 * #399). Consume useSesion (ART-R0) y el cliente puro lib/miCuenta.ts.
 *
 * AR1 como código (decisiones DH ratificadas 2026-11-06):
 *   - vecino = ATRIBUTO de residencia sobre la cuenta ciudadana, NO un rol:
 *     el perfil se DERIVA de los campos reales de /api/auth/me (R15).
 *   - visitante = cuenta ligera de tránsito (rol real 'visitante', SOLO
 *     LECTURA en v0.2): PUT /api/me/residencia responde 403 real — la API
 *     es la compuerta, nada se simula.
 *
 * Reglas vivas: R5 (errores visibles, jamás []) · R15 (sin simulación) ·
 * ADR-027 / Ley 25.326 (consentimiento NUNCA pre-marcado; sin domicilio
 * jamás — solo la clave del subnodo del vocabulario) · carga perezosa por
 * sección (el visitante tiene techo 10 req/min: no quemarlos al montar).
 *
 * Montaje único en ArtefactosRoot (tras BarraSesion): este archivo NO toca
 * App.tsx ni main.tsx (regla M0).
 */
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useSesion } from './SesionProvider';
import { crearSesion, CLAVE_TOKEN_SESION, SesionError } from '../../lib/sesion';
import {
  crearClienteMiCuenta,
  ErrorMiCuenta,
  perfilDeCuenta,
  PERFILES_CUENTA,
  NODOS,
  type NodoCuenta,
  type SubnodoPublico,
  type TableroPedidos,
} from '../../lib/miCuenta';

function mensajeDe(e: unknown, porDefecto: string): string {
  return e instanceof ErrorMiCuenta || e instanceof SesionError || e instanceof Error
    ? e.message
    : porDefecto;
}

export function MiCuenta() {
  const { modo, estado, refrescar } = useSesion();
  const enSesion = estado.tipo === 'sesion' ? estado.usuario : null;
  const perfil = enSesion !== null ? perfilDeCuenta(enSesion) : null;

  const cliente = useMemo(
    () =>
      crearClienteMiCuenta({
        transporte: (ruta, init) => fetch(ruta, init),
        token: () => window.localStorage.getItem(CLAVE_TOKEN_SESION),
      }),
    []
  );

  // Registro visitante (cuenta ligera): sesión local del módulo — el mismo
  // contrato de lib/sesion.ts (consentimiento se exige ANTES de llamar a la
  // API; en el almacen persiste SOLO el token, Ley 25.326).
  const sesionRegistro = useMemo(
    () =>
      crearSesion({
        transporte: (ruta, init) => fetch(ruta, init),
        almacen: window.localStorage,
        modo: 'jwt',
      }),
    []
  );

  /* ---------- carga perezosa: cada sección declara SU estado ---------- */

  const [cargando, setCargando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  /* ---------- declarar residencia (atributo de la cuenta) ---------- */

  const [nodoResidencia, setNodoResidencia] = useState<NodoCuenta>('iglesia');
  const [subnodos, setSubnodos] = useState<SubnodoPublico[] | null>(null);
  const [subnodoElegido, setSubnodoElegido] = useState('');
  const [errorResidencia, setErrorResidencia] = useState<string | null>(null);

  const cargarSubnodos = useCallback(async () => {
    setCargando('subnodos');
    setErrorResidencia(null);
    try {
      setSubnodos(await cliente.subnodos(nodoResidencia));
    } catch (e) {
      setErrorResidencia(mensajeDe(e, 'no se pudieron cargar los subnodos del nodo'));
    } finally {
      setCargando(null);
    }
  }, [cliente, nodoResidencia]);

  const declarar = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorResidencia(null);
      if (subnodoElegido === '') {
        setErrorResidencia('elegí el subnodo del vocabulario — la residencia se ancla a un subnodo real (R15)');
        return;
      }
      setCargando('residencia');
      try {
        const r = await cliente.declararResidencia(subnodoElegido);
        setAviso(
          'residencia declarada en ' + r.residencia_subnodo_key + ' — auto-declarada (R15), sin domicilio jamás (Ley 25.326)'
        );
        await refrescar();
      } catch (err) {
        setErrorResidencia(mensajeDe(err, 'no se pudo declarar la residencia'));
      } finally {
        setCargando(null);
      }
    },
    [cliente, subnodoElegido, refrescar]
  );

  /* ---------- tablero vecino: pedidos DPV del nodo ---------- */

  const [nodoTablero, setNodoTablero] = useState<NodoCuenta>('iglesia');
  const [tablero, setTablero] = useState<TableroPedidos | null>(null);
  const [errorTablero, setErrorTablero] = useState<string | null>(null);

  const cargarTablero = useCallback(async () => {
    setCargando('tablero');
    setErrorTablero(null);
    try {
      setTablero(await cliente.tableroPedidos(nodoTablero));
    } catch (e) {
      setErrorTablero(mensajeDe(e, 'no se pudo cargar el tablero de pedidos'));
    } finally {
      setCargando(null);
    }
  }, [cliente, nodoTablero]);

  /* ---------- registro visitante (cuenta ligera) ---------- */

  const [visEmail, setVisEmail] = useState('');
  const [visPassword, setVisPassword] = useState('');
  const [visAlias, setVisAlias] = useState('');
  const [visNodo, setVisNodo] = useState<NodoCuenta>('iglesia');
  const [visSubnodos, setVisSubnodos] = useState<SubnodoPublico[] | null>(null);
  const [visSubnodo, setVisSubnodo] = useState('');
  const [visConsent, setVisConsent] = useState(false); // ADR-027: NUNCA pre-marcado
  const [errorVis, setErrorVis] = useState<string | null>(null);
  const [enviandoVis, setEnviandoVis] = useState(false);

  const cargarSubnodosVisita = useCallback(async () => {
    setCargando('vis-subnodos');
    setErrorVis(null);
    try {
      setVisSubnodos(await cliente.subnodos(visNodo));
    } catch (e) {
      setErrorVis(mensajeDe(e, 'no se pudieron cargar los subnodos del nodo'));
    } finally {
      setCargando(null);
    }
  }, [cliente, visNodo]);

  const registrarVisitante = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorVis(null);
      if (visSubnodo === '') {
        setErrorVis('elegí el subnodo de tránsito — declarado, jamás geolocalizado (Ley 25.326)');
        return;
      }
      setEnviandoVis(true);
      try {
        await sesionRegistro.registrarVisitante(
          visEmail,
          visPassword,
          visAlias,
          visSubnodo,
          visConsent
        );
        setVisEmail('');
        setVisPassword('');
        setVisAlias('');
        setVisSubnodo('');
        setVisConsent(false);
        setAviso('cuenta visitante creada — es solo lectura en v0.2; iniciá sesión con tu email y contraseña');
      } catch (err) {
        setErrorVis(mensajeDe(err, 'no se pudo registrar la cuenta visitante'));
      } finally {
        setEnviandoVis(false);
      }
    },
    [sesionRegistro, visEmail, visPassword, visAlias, visSubnodo, visConsent]
  );

  /* ---------- render ---------- */

  return (
    <section aria-labelledby="micuenta-titulo" className="mi-cuenta-ar1">
      <header>
        <h3 id="micuenta-titulo">Mi cuenta — perfiles ARTEFACTOS-ROLES v0.2</h3>
        <p>
          {estado.tipo === 'sesion'
            ? 'perfil: ' + perfil + ' · rol ' + (enSesion?.rol ?? '—')
            : estado.tipo === 'demo_sintetico'
              ? 'modo SINTÉTICO: demo declarada — nada de esto se acredita (R15)'
              : 'sin sesión — podés crear una cuenta ligera visitante'}
          {modo === 'jwt' ? ' · origen: API real' : ' · origen: API sintética'}
        </p>
        {aviso !== null && <p role="status">{aviso}</p>}
      </header>

      <h4>Perfiles de cuenta (AR1)</h4>
      <ul>
        {PERFILES_CUENTA.map((p) => (
          <li key={p.perfil}>
            <strong>{p.etiqueta}</strong>
            {perfil === p.perfil ? ' — TU PERFIL · ' : ' — '}
            {p.detalle}
          </li>
        ))}
      </ul>

      {estado.tipo === 'sesion' && enSesion !== null && enSesion.rol === 'visitante' && (
        <div>
          <h4>Lens visitante (solo lectura v0.2)</h4>
          <p>
            alias público: {enSesion.display_name ?? 'sin alias'} · subnodo de tránsito declarado:{' '}
            {enSesion.transito_subnodo_key ?? 'sin dato'} — declarado, jamás geolocalizado (Ley 25.326).
            La escritura ciudadana exige una cuenta ciudadana: la API responde 403 real (R15).
          </p>
        </div>
      )}

      {modo === 'jwt' && estado.tipo === 'sesion' && enSesion !== null && enSesion.rol !== 'visitante' && (
        <div>
          <h4>Declarar residencia (atributo del vecino — NO un rol)</h4>
          <p>
            residencia actual:{' '}
            {enSesion.residencia_subnodo_key != null
              ? enSesion.residencia_subnodo_key + ' (auto-declarada, R15)'
              : 'sin declarar — declararla activa el tablero vecino'}
          </p>
          <form onSubmit={declarar}>
            <label>
              nodo del vocabulario{' '}
              <select
                value={nodoResidencia}
                onChange={(e) => {
                  setNodoResidencia(e.target.value as NodoCuenta);
                  setSubnodos(null);
                  setSubnodoElegido('');
                }}
              >
                {NODOS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>{' '}
            <button type="button" onClick={() => void cargarSubnodos()} disabled={cargando === 'subnodos'}>
              {cargando === 'subnodos' ? 'cargando…' : 'cargar subnodos'}
            </button>
            <br />
            <label>
              subnodo de residencia{' '}
              <select value={subnodoElegido} onChange={(e) => setSubnodoElegido(e.target.value)}>
                <option value="">elegí del vocabulario…</option>
                {(subnodos ?? []).map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} ({s.key})
                  </option>
                ))}
              </select>
            </label>{' '}
            <button type="submit" disabled={cargando === 'residencia'}>
              {cargando === 'residencia' ? 'declarando…' : 'declarar residencia'}
            </button>
          </form>
          <p>
            <small>
              auto-declaración honesta (R15): sin verificación, sin domicilio jamás — solo la clave
              del subnodo y su fecha (Ley 25.326 / ADR-027). Re-declarar renueva el atributo y
              sella de nuevo.
            </small>
          </p>
          {errorResidencia !== null && <p role="alert">{errorResidencia}</p>}
        </div>
      )}

      {modo === 'jwt' && perfil === 'vecino' && (
        <div>
          <h4>Tablero vecino — pedidos al DPV (lectura pública)</h4>
          <p>
            nodo{' '}
            <select
              value={nodoTablero}
              onChange={(e) => {
                setNodoTablero(e.target.value as NodoCuenta);
                setTablero(null);
              }}
            >
              {NODOS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>{' '}
            <button type="button" onClick={() => void cargarTablero()} disabled={cargando === 'tablero'}>
              {cargando === 'tablero' ? 'cargando…' : 'cargar tablero'}
            </button>
          </p>
          {tablero !== null && (
            <p>
              {tablero.cobertura} · fuente: {tablero.fuente} — sin respuesta:{' '}
              {tablero.sin_respuesta}, en espera: {tablero.en_espera} (estado efectivo DERIVADO,
              R15)
            </p>
          )}
          {errorTablero !== null && <p role="alert">{errorTablero}</p>}
        </div>
      )}

      {modo === 'jwt' && estado.tipo === 'sin_sesion' && (
        <div>
          <h4>Crear cuenta ligera visitante</h4>
          <p>
            <small>
              el tránsito se declara contra el vocabulario del nodo — jamás geolocalizado; el
              consentimiento de contacto es literal y nunca se pre-marca (ADR-027).
            </small>
          </p>
          <form onSubmit={registrarVisitante}>
            <label>
              email <input type="email" value={visEmail} onChange={(e) => setVisEmail(e.target.value)} required />
            </label>{' '}
            <label>
              contraseña{' '}
              <input
                type="password"
                value={visPassword}
                onChange={(e) => setVisPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>{' '}
            <label>
              alias público (3–40){' '}
              <input value={visAlias} onChange={(e) => setVisAlias(e.target.value)} maxLength={40} required />
            </label>
            <br />
            <label>
              nodo{' '}
              <select
                value={visNodo}
                onChange={(e) => {
                  setVisNodo(e.target.value as NodoCuenta);
                  setVisSubnodos(null);
                  setVisSubnodo('');
                }}
              >
                {NODOS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>{' '}
            <button type="button" onClick={() => void cargarSubnodosVisita()} disabled={cargando === 'vis-subnodos'}>
              {cargando === 'vis-subnodos' ? 'cargando…' : 'cargar subnodos'}
            </button>
            <br />
            <label>
              subnodo de tránsito{' '}
              <select value={visSubnodo} onChange={(e) => setVisSubnodo(e.target.value)}>
                <option value="">elegí del vocabulario…</option>
                {(visSubnodos ?? []).map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} ({s.key})
                  </option>
                ))}
              </select>
            </label>
            <br />
            <label>
              <input type="checkbox" checked={visConsent} onChange={(e) => setVisConsent(e.target.checked)} />{' '}
              acepto que la plataforma me contacte por email sobre este subnodo (opcional, granular
              — ADR-027)
            </label>
            <br />
            <button type="submit" disabled={enviandoVis}>
              {enviandoVis ? 'creando…' : 'crear cuenta visitante'}
            </button>
          </form>
          {errorVis !== null && <p role="alert">{errorVis}</p>}
          <p>
            <small>
              la cuenta visitante es SOLO LECTURA en v0.2: para escribir como vecino creá una
              cuenta ciudadana en la barra de sesión.
            </small>
          </p>
        </div>
      )}

      {modo === 'synthetic' && (
        <p>
          <small>
            en modo synthetic el registro y la declaración no se ofrecen (honesto, ADR-029):
            nada de esto se acredita sin la API real.
          </small>
        </p>
      )}
    </section>
  );
}

export default MiCuenta;
