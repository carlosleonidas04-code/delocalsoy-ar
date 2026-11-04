import React, { useState } from 'react';
import { TabTokensYPatrones } from './TabTokensYPatrones';
import { TabEstadosHonestos } from './TabEstadosHonestos';
import { NodosFederadosTab } from './NodosFederadosTab';
import { TabCartografiaSensible } from './TabCartografiaSensible';
import { TabTrazabilidadCripto } from './TabTrazabilidadCripto';
import { Palette, Layers, Network, Map, KeyRound } from 'lucide-react';

interface CanvasMaestroProps {
  onNavigateToNode?: (nodoId: string) => void;
}

export const CanvasMaestroDiseno: React.FC<CanvasMaestroProps> = ({ onNavigateToNode }) => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'estados' | 'nodos' | 'cartografia' | 'trazabilidad'>('tokens');

  const tabs = [
    { id: 'tokens', label: '1. Tokens & Patrones', icon: Palette },
    { id: 'estados', label: '2. Estados Honestos', icon: Layers },
    { id: 'nodos', label: '3. Nodos Federados', icon: Network },
    { id: 'cartografia', label: '4. Cartografía Sensible', icon: Map },
    { id: 'trazabilidad', label: '5. Trazabilidad Cripto', icon: KeyRound },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Selector de las 5 Pestañas Declaradas del Canvas Maestro */}
      <div className="bg-white border border-stone-200 rounded-xl p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de la Pestaña Activa */}
      <div>
        {activeTab === 'tokens' && <TabTokensYPatrones />}
        {activeTab === 'estados' && <TabEstadosHonestos />}
        {activeTab === 'nodos' && <NodosFederadosTab onSelectNodo={onNavigateToNode} />}
        {activeTab === 'cartografia' && <TabCartografiaSensible />}
        {activeTab === 'trazabilidad' && <TabTrazabilidadCripto />}
      </div>
    </div>
  );
};
