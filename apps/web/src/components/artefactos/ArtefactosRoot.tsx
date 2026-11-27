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
 *     <InstitucionPanel />        INSTITUCION-1 (#628): panel de institución de la
 *                                 plataforma como desarrollo territorial íntegro
 *                                 (decisión DH 2026-11-27; contenido declarado en
 *                                 lib/institucion.ts, 0 rutas nuevas, M0 intacto)
 *     <A1VecinoCiudadano />        ART-R1 (#270): escritura ciudadana y lectura pública
 *     <A2Comerciante />            ART-R4 (#273): comerciante y titular verificado — alta
 *                                 ciudadana, reclamo de titularidad SOLO-hash, habilitación
 *                                 SIIC (ADR-035) e historial F-3 del Mercado de Proximidad
 *                                 (MK-1/MK-2 en main: sin superficie no se simulaba; con
 *                                 superficie se cablea, R15 en ambos sentidos)
 *                                 ARTEFACTOS-ROLES AR2 (#401, épica #399): búsqueda por
 *                                 facetas reales del directorio y camino buscar → ver →
 *                                 reclamar/editar con un click; frontera honesta de la
 *                                 edición (horario declarado NO existe en MK-1 v0.2, R15)
 *     <A3GestorAdmin />            ART-R2 (#271): moderación con justificación (ADR-038)
 *                                 ARTEFACTOS-ROLES AR3 (#402, épica #399): cola
 *                                 unificada de pendientes del gestor — reportes,
 *                                 fichas testimonio, oportunidades y activos
 *                                 propuestos leídos de las superficies REALES,
 *                                 matriz de transiciones y sello esperado
 *                                 visibles ANTES de confirmar
 *     <A4AuditorDatosAbiertos />   ART-R3 (#272): auditoría y datos abiertos (lectura pura)
 *                                 ARTEFACTOS-ROLES AR4 (#403, épica #399): libro
 *                                 contable de sellos — GET /api/sellos y
 *                                 /api/sellos/tipos con cobertura contra la
 *                                 matriz v0.2 (34 sellos), sin escritura
 *
 * Reglas vivas: R15 (el alta pública solo crea 'ciudadano' — ADR-031; la
 * promoción a moderador/admin es operación de sistema, nunca simulada) ·
 * R5 (errores visibles, jamás []) · Ley 25.326/ADR-027 (en el almacen
 * persiste SOLO el token — el email jamás) · techo por rol real
 * (RATE_LIMIT_POR_ROL de sesion.ts: 10/100/500 req/min).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { SesionProvider, useSesion } from './SesionProvider';
import { RATE_LIMIT_POR_ROL, RATE_LIMIT_VISITANTE } from '../../lib/sesion';
import A1VecinoCiudadano from './A1VecinoCiudadano';
import A2Comerciante from './A2Comerciante';
import A3GestorAdmin from './A3GestorAdmin';
import A4AuditorDatosAbiertos from './A4AuditorDatosAbiertos';
import MiCuenta from './MiCuenta';
import InstitucionPanel from './InstitucionPanel';

/**
 * PIZ-R7 (#550, épica #543): título unificado del panel de Sesión — el
 * <h1> del panel y el <title> dinámico del runner comparten la misma
 * copy (decisión DH 2026-11-21: unificar todo a «A1 — Sesión y estados
 * operativos», encabezado + título dinámico). Al desmontar se restaura
 * el título base del documento (index.html).
 */
const TITULO_PANEL_SESION = 'A1 — Sesión y estados operativos';
const TITULO_BASE_DOCUMENTO = 'DELocalSoy.AR — Plataforma Territorial Federada & HITUB';
const TITULO_DOCUMENTO = TITULO_PANEL_SESION + ' · DELocalSoy.AR';

/* ------------------------------------------------------------------ */
/* Gate por rol del contexto R0: la identidad del actor                */
/* ------------------------------------------------------------------ */

function BarraSesion() {
  const { modo, estado, cargando, error, aviso, iniciar, registrar, cerrar, refrescar } = useSesion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [registrando, setRegistrando] = useState(false);

  // PIZ-R7 (#550): el <title> del runner comparte la copy del <h1> del
  // panel mientras este está montado; al desmontar se restaura el base.
  useEffect(() => {
    document.title = TITULO_DOCUMENTO;
    return () => {
      document.title = TITULO_BASE_DOCUMENTO;
    };
  }, []);
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
    <section aria-labelledby="sesion-titulo">
      <h1 id="sesion-titulo">{TITULO_PANEL_SESION}</h1>
      <p>
        modo {modo === 'jwt' ? 'api real (JWT)' : 'synthetic'} ·{' '}
        {estado.tipo === 'sesion'
          ? 'sesión: ' +
            estado.usuario.email +
            ' (rol ' +
            rol +
            ', techo ' +
            techo +
            ' req/min' +
            (estado.usuario.practica_acreditada === true
              ? ', práctica acreditada: sí (acreditación real, LIC-R3)'
              : estado.usuario.practica_acreditada === false
                ? ', práctica acreditada: no'
                : ', práctica acreditada: sin dato aún (se lee al refrescar la sesión)')
          : estado.tipo === 'demo_sintetico'
            ? 'modo demo: los cambios no se acreditan'
            : 'sin sesión (visitante: lectura pública, techo ' + RATE_LIMIT_VISITANTE + ' req/min)'}
      </p>
      {estado.tipo === 'sesion' ? (
        <p>
          <button type="button" onClick={cerrar} disabled={cargando}>
            cerrar sesión
          </button>{' '}
          <button type="button" onClick={() => void refrescar()} disabled={cargando}>
            refrescar sesión
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
          sistema — la plataforma rechaza con su error real a quien no tiene el rol.
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
          es estado de ficha, no rol: la plataforma es la compuerta — nada se simula.
        </p>
        <InstitucionPanel />
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
