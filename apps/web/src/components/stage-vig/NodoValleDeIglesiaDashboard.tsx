import React, { useState } from 'react';
import {
  DISTRITOS_RATIFICADOS_IGLESIA,
  INDICADORES_HIDRICOS_VIG,
  CALENDARIO_AGROECOLOGICO_VIG,
  DistritoVIG
} from './valleDeIglesiaData';
import { Droplets, Mountain, ShieldCheck, Calendar, Thermometer, ShieldAlert } from 'lucide-react';

interface Props {
  onNavigateToCapital?: () => void;
}

export const NodoValleDeIglesiaDashboard: React.FC<Props> = ({ onNavigateToCapital }) => {
  const [selectedDistrito, setSelectedDistrito] = useState<DistritoVIG>(DISTRITOS_RATIFICADOS_IGLESIA[0]);
  const [vistaActiva, setVistaActiva] = useState<'distritos' | 'hidrico' | 'agro'>('distritos');

  return (
    <div className="space-y-6">
      {/* Banner Principal del Nodo Valle de Iglesia (ADR-021) */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-800 relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-stone-400">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              NODO ACTIVO: VALLE DE IGLESIA (VIG)
            </span>
            <span>·</span>
            <span>1 DE 3 NODOS FEDERADOS (ADR-021)</span>
            <span>·</span>
            <span className="text-amber-300">SRID=4326</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Soberanía Hídrica, Agroecología de Altura & Patrimonio Andino
            </h1>
            <p className="text-stone-300 text-sm mt-2 leading-relaxed">
              Vocabulario canónico ratificado: distritos Rodeo (inc. Colola), Villa Iglesia, Angualasto (Patrimonial Protegido), Las Flores, Tudcum y Bella Vista; junto a la localidad termal de Pismanta y el dique Cuesta del Viento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-xs font-mono text-stone-300 flex items-center gap-2">
              <Mountain className="w-4 h-4 text-amber-400" />
              <span>Altitud: 1.610 — 1.910 msnm</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-xs font-mono text-stone-300 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span>Cuenca Río Blanco / Jáchal</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-xs font-mono text-stone-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Vocabulario VIG-R1 Ratificado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Vistas del Stage VIG */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setVistaActiva('distritos')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            vistaActiva === 'distritos' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Distritos Ratificados ({DISTRITOS_RATIFICADOS_IGLESIA.length})
        </button>
        <button
          onClick={() => setVistaActiva('hidrico')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            vistaActiva === 'hidrico' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Monitor de Cuencas Hídricas & Termas
        </button>
        <button
          onClick={() => setVistaActiva('agro')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            vistaActiva === 'agro' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Calendario Agroecológico
        </button>
      </div>

      {/* VISTA 1: DISTRITOS RATIFICADOS */}
      {vistaActiva === 'distritos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Listado de Distritos */}
          <div className="space-y-2 lg:col-span-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 block">
              Distritos y Localidades del Valle
            </span>
            {DISTRITOS_RATIFICADOS_IGLESIA.map((dist) => {
              const isSelected = selectedDistrito.id === dist.id;
              return (
                <button
                  key={dist.id}
                  onClick={() => setSelectedDistrito(dist)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-400 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-stone-900 mb-1">
                    <span className="truncate">{dist.nombre}</span>
                    <span className="font-mono text-[10px] text-stone-500 shrink-0">{dist.altitudMsnm} msnm</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-mono mb-1">
                    <span>{dist.tipoEntidad}</span>
                    <span>·</span>
                    <span className={dist.estadoHonesto === 'validado' ? 'text-emerald-700 font-bold' : 'text-orange-700 font-bold'}>
                      ● {dist.estadoHonesto}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 line-clamp-2">{dist.vocacionPrincipal}</p>
                </button>
              );
            })}
          </div>

          {/* Ficha Detallada del Distrito Seleccionado */}
          <div className="lg:col-span-2 bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-amber-800 font-bold px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                    {selectedDistrito.tipoEntidad}
                  </span>
                  <span className="text-xs text-stone-500 font-mono">{selectedDistrito.altitudMsnm} msnm</span>
                </div>
                <h3 className="text-xl font-bold text-stone-900">{selectedDistrito.nombre}</h3>
                <p className="text-xs text-stone-600 mt-1">{selectedDistrito.vocacionPrincipal}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-stone-400 block">WGS-84 (SRID 4326)</span>
                <span className="font-mono font-bold text-xs text-stone-800">
                  {selectedDistrito.lat.toFixed(4)}, {selectedDistrito.lng.toFixed(4)}
                </span>
              </div>
            </div>

            {selectedDistrito.notasTerritoriales && (
              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-300 text-xs text-amber-950 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Acreditación Territorial: </span>
                  <span>{selectedDistrito.notasTerritoriales}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
                <span className="font-bold text-stone-700 block">Cuenca Hidrográfica</span>
                <div className="flex items-center gap-2 text-stone-800 font-medium">
                  <Droplets className="w-4 h-4 text-cyan-600" />
                  <span>{selectedDistrito.cuencaHidrica}</span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Riego tradicional regulado por juntas de regantes y turnados vecinales inmutables.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
                <span className="font-bold text-stone-700 block">Población & Comunidad</span>
                <div className="text-lg font-bold text-stone-900">
                  ~{selectedDistrito.poblacionEstimada.toLocaleString()} habitantes
                </div>
                <p className="text-[11px] text-stone-500">
                  Relevo consolidado conforme al Censo y registros asamblearios locales.
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
                Recursos Territoriales Clave
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedDistrito.recursosClave.map((r) => (
                  <span
                    key={r}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-800 border border-stone-200 text-xs font-medium"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: MONITOR DE CUENCAS HÍDRICAS & TERMALISMO */}
      {vistaActiva === 'hidrico' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {INDICADORES_HIDRICOS_VIG.map((ind) => (
              <div key={ind.origen} className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-3 text-xs">
                <div className="font-bold text-stone-900 leading-snug">{ind.origen}</div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Caudal:</span>
                    <span className="font-bold text-stone-900">{ind.caudalM3s} m³/s</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Temperatura:</span>
                    <span className="font-bold text-amber-700 flex items-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      {ind.temperaturaC}°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Conductividad:</span>
                    <span className="font-bold text-stone-900">{ind.conductividadUsCm} µS/cm</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500">
                  <span>{ind.calidadUso}</span>
                  <span className="text-emerald-700 font-bold">● Validado</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 3: CALENDARIO AGROECOLÓGICO */}
      {vistaActiva === 'agro' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-bold text-stone-900">
              Ciclo Agroecológico Comunitario del Valle de Iglesia
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CALENDARIO_AGROECOLOGICO_VIG.map((item) => (
              <div key={item.epoca} className="p-4 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                <div className="font-bold text-amber-900">{item.epoca}</div>
                <p className="text-stone-700 leading-relaxed">{item.actividad}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
