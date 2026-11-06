/**
 * DELocalSoy.AR — ArtefactosRoot: montaje único de los artefactos A1–A4
 * (ART-R5, #274, épica #268).
 *
 * Regla M0: App.tsx ya está muy por encima de un componente sano — TODO lo
 * que App.tsx agrega por esta serie es 1 import + 1 mount. El cableado de
 * sesión (ART-R0), los paneles (ART-R1/R2/R3/R4) y los gates por rol viven
 * acá, no en App.tsx.
 *
 * Composición (serie docs/artefactos/ v0.1, PR #267):
 *   <SesionProvider>              ART-R0 (#269): JWT real + degradación honesta a synthetic
 *     BarraSesion                  identidad del actor: el gate por rol del contexto R0 —
 *                                 sin esta pieza nadie puede asumir el rol que la API exige
 *     <MiCuenta />                ARTEFACTOS-ROLES AR1 (#400, épica #399): perfiles de
 *                                 cuenta — residencia = atributo del vecino (NO rol) y
 *                                 cuenta ligera visitante (solo lectura v0.2): la API es
 *                                 la compuerta
 *     <A1VecinoCiudadano />        ART-R1 (#270): escritura ciudadana y lectura pública
 *     <A2Comerciante />            ART-R4 (#273): comerciante y titular verificado — alta
 *                                 ciudadana, reclamo de titularidad SOLO-hash, habilitación
 *                                 SIIC (ADR-035) e historial F-3 del Mercado de Proximidad
 *                                 (MK-1/MK-2 en main: sin superficie no se simulaba; con
 *                                 superficie se cablea, R15 en ambos sentidos)
 *     <A3GestorAdmin />            ART-R2 (#271): moderación con justificación (ADR-038)
 *     <A4AuditorDatosAbiertos />   ART-R3 (#272): auditoría y datos abiertos (lectura pura)
 *
 * Reglas vivas: R15 (el alta pública solo crea 'ciudadano' — ADR-031; la
 * promoción a moderador/admin es operación de sistema, nunca simulada) ·
 * R5 (errores visibles, jamás []) · Ley 25.326/ADR-027 (en el almacen
 * persiste SOLO el token — el email jamás) · techo por rol real
 * (RATE_LIMIT_POR_ROL de sesion.ts: 10/100/500 req/min).
 */
import { useState, type FormEvent } from 'react';
import { SesionProvider, useSesion } from './SesionProvider';
import { RATE_LIMIT_POR_ROL, RATE_LIMIT_VISITANTE } from '../../lib/sesion';
import A1VecinoCiudadano from './A1VecinoCiudadano';
import A2Comerciante from './A2Comerciante';
import A3GestorAdmin from './A3GestorAdmin';
import A4AuditorDatosAbiertos from './A4AuditorDatosAbiertos';
import MiCuenta from './MiCuenta';

/* ------------------------------------------------------------------ */
/* Gate por rol del contexto R0: la identidad del actor                */
/* ------------------------------------------------------------------ */

function BarraSesion() {
  const { modo, estado, cargando, error, aviso, iniciar, registrar, cerrar } = useSesion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [registrando, setRegistrando] = useState(false);

  const rol = estado.tipo === 'sesion' ? estado.usuario.rol : null;
  const techo =
    rol === null ? RATE_LIMIT_VISITANTE : (RATE_LIMIT_POR_ROL[rol] ?? RATE_LIMIT_VISITANTE);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (registrando) {
      void registrar(email, password, displayName);
    } else {
      void iniciar(email, password);
    }
  };

  return (
    <section aria-label="Sesión de plataforma">
      <h3>Sesión</h3>
      <p>
        modo {modo === 'jwt' ? 'api real (JWT)' : 'synthetic'} ·{' '}
        {estado.tipo === 'sesion'
          ? 'sesión: ' +
            estado.usuario.email +
            ' (rol ' +
            rol +
            ', techo ' +
            techo +
            ' req/min)'
          : estado.tipo === 'demo_sintetico'
            ? 'demo SINTÉTICO declarada: las escrituras no se acreditan (R15)'
            : 'sin sesión (visitante: lectura pública, techo ' + RATE_LIMIT_VISITANTE + ' req/min)'}
      </p>
      {estado.tipo === 'sesion' ? (
        <p>
          <button type="button" onClick={cerrar}>
            cerrar sesión
          </button>
        </p>
      ) : estado.tipo === 'demo_sintetico' ? (
        <p>en modo synthetic no hay sesión JWT: el login no se ofrece (honesto, ADR-029).</p>
      ) : (
        <form onSubmit={enviar}>
          <label>
            email{' '}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>{' '}
          <label>
            contraseña{' '}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>{' '}
          {registrando && (
            <label>
              nombre visible (opcional){' '}
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
          )}{' '}
          <button type="submit" disabled={cargando}>
            {cargando ? 'un momento…' : registrando ? 'crear cuenta' : 'iniciar sesión'}
          </button>{' '}
          <button type="button" onClick={() => setRegistrando(!registrando)}>
            {registrando ? 'ya tengo cuenta' : 'registrarme'}
          </button>
        </form>
      )}
      {error !== null && <p role="alert">{error}</p>}
      {aviso !== null && <p role="status">{aviso}</p>}
      <p>
        <small>
          el alta pública solo crea cuentas ciudadano; moderador y admin son operación de
          sistema (R15) — la API rechaza con 403 real a quien no tiene el rol.
        </small>
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Montaje único (regla M0: App.tsx agrega 1 import + 1 mount)          */
/* ------------------------------------------------------------------ */

export function ArtefactosRoot() {
  return (
    <SesionProvider>
      <section id="artefactos" aria-label="Artefactos de la plataforma por rol (A1–A4)">
        <h2>Artefactos por rol (A1–A4)</h2>
        <p>
          Paneles por rol sobre las superficies reales de la API: A1 vecino/ciudadano/visitante
          (escritura ciudadana y lectura pública), A2 comerciante y titular verificado (mercado
          de proximidad: alta, reclamo de titularidad solo-hash, habilitación SIIC con estados
          epistémicos e historial F-3), A3 gestor y admin (moderación con justificación pública,
          ADR-038) y A4 auditoría y datos abiertos (el auditor no muta). La titularidad comercial
          es estado de ficha, no rol: la API es la compuerta (403 real) — nada se simula (R15).
        </p>
        <BarraSesion />
        <MiCuenta />
        <A1VecinoCiudadano />
        <A2Comerciante />
        <A3GestorAdmin />
        <A4AuditorDatosAbiertos />
      </section>
    </SesionProvider>
  );
}

export default ArtefactosRoot;
