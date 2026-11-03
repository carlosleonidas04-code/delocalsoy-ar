/**
 * DELocalSoy.AR — Registro Maestro de Nodos Territoriales y Estado de
 * Integración API (/api/territorios · /api/health) — FE-DEUDA-02 #293
 * (corte 21 de desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento):
 * sección #registro-maestro-nodos con el estado de salud de la API, filtros
 * (todos/activos/inactivos + recarga), lista de territorios con acciones
 * (Explorar nodo / Ver en mapa / Activar-Desactivar) y el formulario de
 * federación de nuevos nodos. Acoples por props: estado compartido de App
 * (health, territorios, filtro, nombre, provincia, focoNuevo, submitting) y
 * handlers prop-ificados (onSetFiltro, onSetNombre, onSetProvincia,
 * onSetFocoNuevo, onCreateTerritorio, onToggleActivo, onFocusOnGoogleMap,
 * onSelectNodeKey, onInspectNode, onSincronizarTodo).
 */
import type { FormEvent } from 'react';
import type {
  FiltroActivo,
  HealthState,
  TerritoriosState,
  Territorio,
} from '../App';

export interface MasterRegistrySectionProps {
  health: HealthState;
  territorios: TerritoriosState;
  filtro: FiltroActivo;
  onSetFiltro: (filtro: FiltroActivo) => void;
  nombre: string;
  onSetNombre: (nombre: string) => void;
  provincia: string;
  onSetProvincia: (provincia: string) => void;
  focoNuevo: string;
  onSetFocoNuevo: (foco: string) => void;
  submitting: boolean;
  onCreateTerritorio: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onToggleActivo: (territorio: Territorio) => void | Promise<void>;
  onFocusOnGoogleMap: (territorioId: string) => void;
  onSelectNodeKey: (nodeKey: string) => void;
  onInspectNode: (nodeKey: string | null) => void;
  onSincronizarTodo: () => void | Promise<void>;
}

export function MasterRegistrySection({
  health,
  territorios,
  filtro,
  onSetFiltro,
  nombre,
  onSetNombre,
  provincia,
  onSetProvincia,
  focoNuevo,
  onSetFocoNuevo,
  submitting,
  onCreateTerritorio,
  onToggleActivo,
  onFocusOnGoogleMap,
  onSelectNodeKey,
  onInspectNode,
  onSincronizarTodo,
}: MasterRegistrySectionProps) {
  return (
  <section
    id="registro-maestro-nodos"
    className="card"
    data-state={
      territorios.status === 'ok'
        ? 'ok'
        : territorios.status === 'error'
          ? 'error'
          : 'checking'
    }
  >
  <div className="section-header">
    <div>
      <span className="kicker-text">04. Registro Maestro y Estado de API</span>
      <h2>Nodos Territoriales Registrados (/api/territorios)</h2>
      <p className="section-caption">
        Estado de salud del servicio:{' '}
        {health.status === 'ok' ? (
          <span className="ok">API conectada ({health.body})</span>
        ) : health.status === 'checking' ? (
          <span>Consultando /api/health…</span>
        ) : (
          <span className="error">Sin conexión ({health.message})</span>
        )}
      </p>
    </div>
    <div className="filter-group" role="group" aria-label="Filtrar territorios">
      <button
        type="button"
        className={filtro === 'todos' ? 'btn-filter active' : 'btn-filter'}
        onClick={() => onSetFiltro('todos')}
      >
        Todos
      </button>
      <button
        type="button"
        className={filtro === 'activos' ? 'btn-filter active' : 'btn-filter'}
        onClick={() => onSetFiltro('activos')}
      >
        Activos
      </button>
      <button
        type="button"
        className={filtro === 'inactivos' ? 'btn-filter active' : 'btn-filter'}
        onClick={() => onSetFiltro('inactivos')}
      >
        En vinculación / Inactivos
      </button>
      <button
        type="button"
        className="btn-filter"
        onClick={() => void onSincronizarTodo()}
        title="Recargar territorios"
      >
        Recargar
      </button>
    </div>
  </div>

  {territorios.status === 'loading' && (
    <p>Consultando <code>/api/territorios</code>…</p>
  )}

  {territorios.status === 'error' && (
    <>
      <p className="error">Error al cargar territorios</p>
      <pre>{territorios.message}</pre>
    </>
  )}

  {territorios.status === 'ok' && (
    <>
      {territorios.items.length === 0 ? (
        <p className="empty-state">No hay territorios para el filtro seleccionado.</p>
      ) : (
        <ul className="territory-list">
          {territorios.items.map((t) => (
            <li key={t.id} className="territory-item">
              <div className="territory-info">
                <span className="territory-name">
                  {t.nombre}{' '}
                  <span className="node-subtitle">· {t.subtitulo || t.provincia}</span>
                </span>
                <span className="territory-meta tabular-nums">
                  Provincia: <strong>{t.provincia}</strong> · Foco:{' '}
                  <strong>{t.foco || 'General'}</strong> · Estado:{' '}
                  <strong className={t.activo ? 'r5-status-aprobado' : 'r5-status-pendiente'}>
                    {t.activo ? 'Activo' : 'Inactivo / En vinculación'}
                  </strong>{' '}
                  · ID: <code>{t.id}</code>
                </span>
              </div>
              <div className="territory-actions">
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => {
                    onSelectNodeKey(t.key);
                    onInspectNode(t.key);
                  }}
                >
                  Explorar nodo
                </button>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => onFocusOnGoogleMap(t.id)}
                >
                  Ver en mapa
                </button>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => void onToggleActivo(t)}
                >
                  {t.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="territory-form" onSubmit={(e) => void onCreateTerritorio(e)}>
        <input
          type="text"
          placeholder="Nombre del nodo (ej. Jáchal)"
          value={nombre}
          onChange={(e) => onSetNombre(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Provincia (ej. San Juan)"
          value={provincia}
          onChange={(e) => onSetProvincia(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Foco vocacional (ej. Agua y agricultura familiar)"
          value={focoNuevo}
          onChange={(e) => onSetFocoNuevo(e.target.value)}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Incorporando…' : '+ Federar nuevo nodo'}
        </button>
      </form>
    </>
  )}
  </section>
  );
}
