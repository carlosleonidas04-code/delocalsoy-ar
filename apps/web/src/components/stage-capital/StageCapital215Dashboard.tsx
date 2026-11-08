import React, { useState } from 'react';
import {
  COMERCIOS_CAPITAL_215,
  ESPACIOS_PUBLICOS_CAPITAL,
  SUBNODOS_CAPITAL_STAGE,
  ComercioBarrial
} from './stageCapital215Data';
import { Store, Trees, MapPin, Search } from 'lucide-react';

export const StageCapital215Dashboard: React.FC = () => {
  const [subnodoFiltro, setSubnodoFiltro] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [comercioSeleccionado, setComercioSeleccionado] = useState<ComercioBarrial | null>(null);

  // MONTAR-2 (#445): filtro armonizado al vocabulario ratificado del nodo
  // Capital (#154, PEC 2025) — el stage ya no declara subnodos propios.
  const subnodos = SUBNODOS_CAPITAL_STAGE;

  const comerciosFiltrados = COMERCIOS_CAPITAL_215.filter((c) => {
    const matchSubnodo = subnodoFiltro === 'todos' || c.subnodoId === subnodoFiltro;
    const matchBusqueda =
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.especialidad.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.categoria.toLowerCase().includes(busqueda.toLowerCase());
    return matchSubnodo && matchBusqueda;
  });

  const espaciosFiltrados = ESPACIOS_PUBLICOS_CAPITAL.filter((e) => {
    return subnodoFiltro === 'todos' || e.subnodoId === subnodoFiltro;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-stone-500">
          <span className="text-amber-800 font-bold">STAGE CAPITAL #215</span>
          <span>·</span>
          <span>SAN JUAN CAPITAL</span>
          <span>·</span>
          <span className="text-emerald-700 font-semibold">2 SUBNODOS RATIFICADOS (PEC 2025 · #154)</span>
        </div>

        <div className="max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Comercios Barriales de Proximidad × Espacios Públicos Cívicos
          </h1>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
            Relevamiento sensible y matriz de articulación territorial entre la economía de proximidad (almacenes, rotiserías, oficios) y el espacio cívico (plazas, parques y paseos peatonales).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg text-xs font-medium text-stone-600 overflow-x-auto">
            {subnodos.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubnodoFiltro(s.id)}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  subnodoFiltro === s.id
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'hover:text-stone-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar comercio u oficio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:border-stone-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trees className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Espacios Públicos Articuladores ({espaciosFiltrados.length})
            </span>
          </div>
          <span className="text-xs text-stone-500">SRID 4326 PostGIS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {espaciosFiltrados.map((esp) => (
            <div key={esp.id} className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-stone-500 uppercase">{esp.tipo}</span>
                <span className={esp.estadoHonesto === 'validado' ? 'text-emerald-700 font-bold text-[11px]' : 'text-slate-600 font-bold text-[11px]'}>
                  {esp.estadoHonesto === 'validado' ? '● Validado' : '◐ Pendiente (Fuentes secundarias)'}
                </span>
              </div>
              <h4 className="font-bold text-stone-900 text-sm leading-snug">{esp.nombre}</h4>
              <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                <span>{(esp.superficieM2 / 1000).toFixed(1)}k m²</span>
                <span>·</span>
                <span className="text-amber-800 font-semibold">{esp.comerciosArticuladosCount} comercios en radio 200m</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {esp.equipamiento.slice(0, 2).map((eq) => (
                  <span key={eq} className="px-2 py-0.5 rounded bg-stone-50 text-stone-600 border border-stone-200 text-[10px]">
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Comercios Barriales & Oficios Tradicionales ({comerciosFiltrados.length})
            </span>
          </div>
          <span className="text-xs text-stone-500">Proximidad & Abastecimiento Local</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comerciosFiltrados.map((com) => {
            const isSelected = comercioSeleccionado?.id === com.id;
            return (
              <div
                key={com.id}
                onClick={() => setComercioSeleccionado(com)}
                className={`bg-white border rounded-xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between text-xs ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-400'
                    : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-stone-500">{com.subnodoNombre}</span>
                    <span className={com.estadoHonesto === 'validado' ? 'text-emerald-700 font-bold' : 'text-orange-700 font-bold'}>
                      {com.estadoHonesto === 'validado' ? '● Validado' : '◈ Comunitario'}
                    </span>
                  </div>

                  <h3 className="font-bold text-stone-900 text-sm">{com.nombre}</h3>
                  <div className="text-[11px] text-amber-800 font-medium">{com.categoria}</div>
                  <p className="text-[11px] text-stone-600 line-clamp-2">{com.especialidad}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-stone-500">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{com.direccion}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500 font-mono">
                    <span className="truncate">Cerca de: {com.espacioPublicoCercano}</span>
                    <span className="font-bold text-stone-800 shrink-0">~{com.distanciaMetrosAEspacio}m</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
