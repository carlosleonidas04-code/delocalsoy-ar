import React, { useState } from 'react';
import { NODOS_FEDERADOS_REGISTRO, NodoFederadoRegistro } from '../../../packages/contracts/src/index';
import { MapPin, Network, Activity, Shield, ArrowRight } from 'lucide-react';

interface NodosFederadosTabProps {
  onSelectNodo?: (nodoId: string) => void;
}

export const NodosFederadosTab: React.FC<NodosFederadosTabProps> = ({ onSelectNodo }) => {
  const [selectedNodoId, setSelectedNodoId] = useState<string>('nodo-capital-san-juan');

  const selectedNodo =
    NODOS_FEDERADOS_REGISTRO.find((n: NodoFederadoRegistro) => n.id === selectedNodoId) ||
    NODOS_FEDERADOS_REGISTRO[0];

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="border-b border-stone-200 pb-4">
        <h2 className="text-xl font-bold text-stone-900 tracking-tight">
          Pestaña 3: Topología Federada & Red de 3 Nodos San Juan (ADR-021)
        </h2>
        <p className="text-sm text-stone-600 mt-1">
          Arquitectura descentralizada HITUB: 3 nodos territoriales ratificados (Capital, Valle de Iglesia, Caucete Este) con soberanía de datos, cuencas hídricas y consensos locales.
        </p>
      </div>

      {/* Grid de los 3 Nodos Provinciales Federados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {NODOS_FEDERADOS_REGISTRO.map((nodo: NodoFederadoRegistro) => {
          const isSelected = selectedNodoId === nodo.id;
          return (
            <button
              key={nodo.id}
              onClick={() => {
                setSelectedNodoId(nodo.id);
                if (onSelectNodo) onSelectNodo(nodo.id);
              }}
              className={`p-4 rounded-xl text-left transition-all border flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-50/80 border-amber-500 shadow-sm ring-1 ring-amber-400'
                  : 'bg-white border-stone-200 hover:border-stone-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                  <span className="font-mono text-[10px] uppercase font-semibold text-stone-600 tracking-wider">
                    {nodo.region}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {nodo.estadoHonesto}
                  </span>
                </div>
                <h4 className="text-base font-bold text-stone-900 leading-snug">{nodo.nombre}</h4>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{nodo.descripcion}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="font-mono text-stone-500 font-medium">{nodo.subnodosCount} subnodos / distritos</span>
                <span className="text-amber-800 font-semibold flex items-center gap-1 hover:underline">
                  Ver Ficha <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Ficha Nodal Detallada */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-stone-100 text-stone-700 rounded border border-stone-200">
                ID: {selectedNodo.id}
              </span>
              <span className="text-xs text-stone-500">Región: {selectedNodo.region}</span>
              <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ADR-021 Ratificado
              </span>
            </div>
            <h3 className="text-xl font-bold text-stone-900">{selectedNodo.nombre}</h3>
            <p className="text-xs text-stone-600 mt-1">{selectedNodo.descripcion}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-stone-400 uppercase font-mono">Centroide WGS-84</div>
              <div className="text-xs font-mono font-bold text-stone-800">
                {selectedNodo.lat.toFixed(4)}, {selectedNodo.lng.toFixed(4)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <MapPin className="w-5 h-5 text-amber-700" />
            </div>
          </div>
        </div>

        {/* Métricas de Interoperabilidad Federada */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
            <div className="flex items-center gap-1.5 text-stone-600 font-medium">
              <Network className="w-4 h-4 text-stone-700" />
              <span>Conexiones Activas de Red (ADR-021)</span>
            </div>
            <div className="text-xl font-bold text-stone-900">2 Enlaces Inter-Nodales</div>
            <p className="text-[11px] text-stone-500">Capital ↔ Valle de Iglesia ↔ Caucete Este</p>
          </div>

          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
            <div className="flex items-center gap-1.5 text-stone-600 font-medium">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Gobernanza Territorial</span>
            </div>
            <div className="text-xl font-bold text-stone-900">ADR-034 / NCAP-R2</div>
            <p className="text-[11px] text-stone-500">Firmas criptográficas Ed25519 y hash SHA-256</p>
          </div>

          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
            <div className="flex items-center gap-1.5 text-stone-600 font-medium">
              <Activity className="w-4 h-4 text-amber-600" />
              <span>Estado del Consenso</span>
            </div>
            <div className="text-xl font-bold text-stone-900">Sincronizado 100%</div>
            <p className="text-[11px] text-stone-500">3 de 3 nodos en quórum provincial inmutable</p>
          </div>
        </div>
      </div>
    </div>
  );
};
