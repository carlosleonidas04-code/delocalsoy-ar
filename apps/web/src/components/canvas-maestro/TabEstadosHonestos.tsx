import React, { useState } from 'react';
import { HONEST_EPISTEMIC_STATES_PALETTE, HonestStateKey } from '../../../../design/BaseConsolidadaPrototype';
import { ShieldCheck, Sparkles, Users, Clock, CheckCircle2 } from 'lucide-react';

export const TabEstadosHonestos: React.FC = () => {
  const [selectedState, setSelectedState] = useState<HonestStateKey>('validado');
  const [testText, setTestText] = useState('Relevo territorial en el Valle de Iglesia: canal de riego La Isla auditado por regantes.');

  const iconMap: Record<HonestStateKey, React.ReactNode> = {
    validado: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
    sintetico: <Sparkles className="w-5 h-5 text-amber-500" />,
    comunitario: <Users className="w-5 h-5 text-orange-600" />,
    pendiente: <Clock className="w-5 h-5 text-slate-500" />
  };

  const currentCfg = HONEST_EPISTEMIC_STATES_PALETTE[selectedState];

  return (
    <div className="space-y-8">
      <div className="border-b border-stone-200 pb-4">
        <h2 className="text-xl font-bold text-stone-900 tracking-tight">
          Pestaña 2: Matriz Epistémica Honesta — 4 Señales Independientes
        </h2>
        <p className="text-sm text-stone-600 mt-1">
          Garantía de transparencia: color (WCAG AA), geometría de borde, glifo tipográfico y microcopia explicativa sin ambigüedades.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(HONEST_EPISTEMIC_STATES_PALETTE) as HonestStateKey[]).map((key) => {
          const cfg = HONEST_EPISTEMIC_STATES_PALETTE[key];
          const isSelected = selectedState === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedState(key)}
              className={`p-3 rounded-lg text-left transition-all relative border ${
                isSelected
                  ? 'bg-white shadow-md ring-2 ring-stone-900 border-transparent'
                  : 'bg-stone-50/80 hover:bg-white border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                {iconMap[key]}
                <span className="text-lg font-bold select-none" style={{ color: cfg.colorHex }}>
                  {cfg.glyph}
                </span>
              </div>
              <div className="text-xs font-bold text-stone-900">{cfg.nombre}</div>
              <div className="text-[11px] text-stone-500 font-mono mt-0.5">{cfg.colorHex}</div>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold border"
              style={{
                backgroundColor: currentCfg.bgRgba,
                borderColor: currentCfg.colorHex,
                color: currentCfg.colorHex
              }}
            >
              {currentCfg.glyph}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">{currentCfg.nombre}</h3>
                <span className="text-xs font-mono text-stone-400">ID: {currentCfg.id}</span>
              </div>
              <p className="text-xs text-stone-500">{currentCfg.descripcion}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 self-start sm:self-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>WCAG AA Conforme (&gt; 4.5:1)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="text-stone-400 font-medium uppercase tracking-wider text-[10px] mb-1">Señal 1: Color</div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: currentCfg.colorHex }} />
              <span className="font-mono font-bold text-stone-800">{currentCfg.colorHex}</span>
            </div>
            <div className="text-stone-500 text-[11px] mt-1">Texto: {currentCfg.contrasteHex}</div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="text-stone-400 font-medium uppercase tracking-wider text-[10px] mb-1">Señal 2: Borde</div>
            <div className="font-mono font-bold text-stone-800 capitalize">{currentCfg.borderStyle} ({currentCfg.borderWidth})</div>
            <div className="text-stone-500 text-[11px] mt-1">
              {'borderRadius' in currentCfg ? `Radio: ${(currentCfg as any).borderRadius}` : 'Radio estándar 0.5rem'}
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="text-stone-400 font-medium uppercase tracking-wider text-[10px] mb-1">Señal 3: Glifo</div>
            <div className="font-bold text-stone-800 flex items-center gap-1.5">
              <span className="text-base" style={{ color: currentCfg.colorHex }}>{currentCfg.glyph}</span>
              <span>Símbolo único</span>
            </div>
            <div className="text-stone-500 text-[11px] mt-1">Invariable ante daltonismo</div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="text-stone-400 font-medium uppercase tracking-wider text-[10px] mb-1">Señal 4: Microcopia</div>
            <div className="font-semibold text-stone-800 truncate">{currentCfg.microcopy}</div>
            <div className="text-stone-500 text-[11px] mt-1">Texto de auditoría explícito</div>
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
            Simulador de Contenido en Vivo
          </label>
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:border-stone-500 focus:outline-hidden mb-4"
          />

          <div
            style={{
              backgroundColor: currentCfg.bgRgba,
              borderColor: currentCfg.colorHex,
              borderStyle: currentCfg.borderStyle as any,
              borderWidth: currentCfg.borderWidth,
              borderRadius: 'borderRadius' in currentCfg ? (currentCfg as any).borderRadius : '0.5rem'
            }}
            className="p-4 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold select-none" style={{ color: currentCfg.colorHex }}>
                  {currentCfg.glyph}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: currentCfg.contrasteHex }}>
                  {currentCfg.nombre}
                </span>
              </div>
              <span className="text-[11px] italic font-medium" style={{ color: currentCfg.contrasteHex }}>
                {currentCfg.microcopy}
              </span>
            </div>
            <p className="text-xs text-stone-800 leading-relaxed font-medium">
              {testText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
