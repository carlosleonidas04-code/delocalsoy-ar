import React, { useState } from 'react';
import { NODOS_FEDERADOS_REGISTRO, NodoFederadoRegistro } from '@delocalsoy/contracts';
import { ArrowLeftRight, Shield, Navigation } from 'lucide-react';

interface Props {
  nodoActualId: string;
  onCambiarNodo: (nodoId: string) => void;
}

export const NodeTransitionNavigator: React.FC<Props> = ({ nodoActualId, onCambiarNodo }) => {
  const [nodoDestinoId, setNodoDestinoId] = useState<string>('nodo-valle-de-iglesia');
  const [transicionando, setTransicionando] = useState(false);

  const nodoActual = NODOS_FEDERADOS_REGISTRO.find((n: NodoFederadoRegistro) => n.id === nodoActualId) || NODOS_FEDERADOS_REGISTRO[0];
  const nodoDestino = NODOS_FEDERADOS_REGISTRO.find((n: NodoFederadoRegistro) => n.id === nodoDestinoId) || NODOS_FEDERADOS_REGISTRO[1];

  const ejecutarTransicion = () => {
    if (nodoActualId === nodoDestinoId) return;
    setTransicionando(true);
    setTimeout(() => {
      setTransicionando(false);
      onCambiarNodo(nodoDestinoId);
    }, 450);
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-amber-700" />
          <h3 className="font-bold text-stone-900 text-sm">Navegador de Transición Federada (ADR-021)</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-mono">
          <Shield className="w-3.5 h-3.5" />
          <span>Sesión Criptográfica Preservada</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nodo Origen */}
        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
          <span className="text-[10px] uppercase font-mono text-stone-400">Nodo Origen (Actual)</span>
          <div className="font-bold text-stone-900 text-sm">{nodoActual.nombre}</div>
          <div className="text-[11px] text-stone-500 font-mono">
            {nodoActual.lat.toFixed(4)}, {nodoActual.lng.toFixed(4)}
          </div>
        </div>

        {/* Nodo Destino */}
        <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-1">
          <span className="text-[10px] uppercase font-mono text-amber-800">Nodo Destino (ADR-021)</span>
          <select
            value={nodoDestinoId}
            onChange={(e) => setNodoDestinoId(e.target.value)}
            className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs font-semibold text-stone-900 focus:outline-hidden"
          >
            {NODOS_FEDERADOS_REGISTRO.map((n: NodoFederadoRegistro) => (
              <option key={n.id} value={n.id} disabled={n.id === nodoActualId}>
                {n.nombre} ({n.region})
              </option>
            ))}
          </select>
          <div className="text-[11px] text-stone-500 font-mono">
            {nodoDestino.lat.toFixed(4)}, {nodoDestino.lng.toFixed(4)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        <div className="text-[11px] text-stone-500">
          Enlace inter-nodal por RN 40 / RN 150 · Cero pérdida de estado local
        </div>

        <button
          onClick={ejecutarTransicion}
          disabled={transicionando || nodoActualId === nodoDestinoId}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors"
        >
          <ArrowLeftRight className={`w-3.5 h-3.5 ${transicionando ? 'animate-spin' : ''}`} />
          <span>{transicionando ? 'Transicionando...' : 'Transicionar a Nodo'}</span>
        </button>
      </div>
    </div>
  );
};
