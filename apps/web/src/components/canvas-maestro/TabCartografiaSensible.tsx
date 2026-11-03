import React, { useState } from 'react';
import { Layers, Eye, EyeOff, Lock, Globe, ShieldAlert } from 'lucide-react';

interface CapaCarto {
  id: string;
  nombre: string;
  tipo: string;
  privacidad: 'PUBLICO' | 'COMUNITARIO_PROTEGIDO' | 'RESERVADO_SENSIBLE';
  descripcion: string;
  featuresCount: number;
}

const CAPAS_INICIALES: CapaCarto[] = [
  {
    id: 'capa-ejes-civicos',
    nombre: 'Ejes Cívicos y Plazas Principales',
    tipo: 'Vectorial / Polígonos WGS-84',
    privacidad: 'PUBLICO',
    descripcion: 'Espacios de libre acceso público en Capital y centros departamentales',
    featuresCount: 38
  },
  {
    id: 'capa-cuencas-hidricas',
    nombre: 'Red Hídrica y Canales Comunales de Riego',
    tipo: 'Lineal / PostGIS Multilinestring',
    privacidad: 'COMUNITARIO_PROTEGIDO',
    descripcion: 'Trazas de tomas de agua y turnos de riego custodiados por juntas de regantes',
    featuresCount: 84
  },
  {
    id: 'capa-saberes-ancestrales',
    nombre: 'Sitios Patrimoniales y Rogativas Andinas',
    tipo: 'Puntos Sensibles / Coordenadas Difuminadas',
    privacidad: 'RESERVADO_SENSIBLE',
    descripcion: 'Ubicaciones de significancia cultural comunitaria con ofuscación criptográfica',
    featuresCount: 19
  },
  {
    id: 'capa-comercios-proximidad',
    nombre: 'Comercios Barriales y Oficios Tradicionales',
    tipo: 'Puntos / Directorio Abierto',
    privacidad: 'PUBLICO',
    descripcion: 'Puntos de abastecimiento vecinal y ferias agroecológicas',
    featuresCount: 142
  }
];

export const TabCartografiaSensible: React.FC = () => {
  const [capas] = useState<CapaCarto[]>(CAPAS_INICIALES);
  const [capasVisibles, setCapasVisibles] = useState<Record<string, boolean>>({
    'capa-ejes-civicos': true,
    'capa-cuencas-hidricas': true,
    'capa-comercios-proximidad': true,
    'capa-saberes-ancestrales': false
  });
  const [rolUsuario, setRolUsuario] = useState<'PUBLICO' | 'COMUNITARIO' | 'AUDITOR'>('COMUNITARIO');

  const toggleCapa = (id: string) => {
    setCapasVisibles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-stone-200 pb-4">
        <h2 className="text-xl font-bold text-stone-900 tracking-tight">
          Pestaña 4: Cartografía Sensible & Gobernanza Espacial (SRID 4326)
        </h2>
        <p className="text-sm text-stone-600 mt-1">
          Protección de datos espaciales: acceso graduado, privacidad diferencial y trazabilidad de consulta territorial.
        </p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <span className="font-bold text-stone-900 block">Nivel de Credencial de Consulta</span>
          <span className="text-stone-500">Determina qué geometrías sensibles pueden visualizarse en el mapa.</span>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg">
          <button
            onClick={() => setRolUsuario('PUBLICO')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              rolUsuario === 'PUBLICO' ? 'bg-white text-stone-900 font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Ciudadano / Abierto
          </button>
          <button
            onClick={() => setRolUsuario('COMUNITARIO')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              rolUsuario === 'COMUNITARIO' ? 'bg-white text-stone-900 font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Miembro Comunitario
          </button>
          <button
            onClick={() => setRolUsuario('AUDITOR')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              rolUsuario === 'AUDITOR' ? 'bg-white text-stone-900 font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Auditor Acreditado R15
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3 md:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Capas Territoriales</span>
          {capas.map((capa) => {
            const isVisible = !!capasVisibles[capa.id];
            const isLocked = capa.privacidad === 'RESERVADO_SENSIBLE' && rolUsuario === 'PUBLICO';

            return (
              <div
                key={capa.id}
                className={`p-3.5 rounded-lg border transition-all text-xs ${
                  isVisible ? 'bg-white border-stone-300 shadow-xs' : 'bg-stone-50/60 border-stone-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-stone-900 leading-snug">{capa.nombre}</div>
                  <button
                    onClick={() => !isLocked && toggleCapa(capa.id)}
                    disabled={isLocked}
                    className={`p-1 rounded ${isLocked ? 'cursor-not-allowed text-stone-300' : 'text-stone-500 hover:text-stone-900'}`}
                  >
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : isVisible ? <Eye className="w-3.5 h-3.5 text-amber-700" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono mb-2">
                  <span>{capa.featuresCount} geometrías</span>
                  <span>·</span>
                  <span className={
                    capa.privacidad === 'PUBLICO' ? 'text-emerald-700 font-bold' :
                    capa.privacidad === 'COMUNITARIO_PROTEGIDO' ? 'text-orange-700 font-bold' :
                    'text-rose-700 font-bold'
                  }>
                    {capa.privacidad}
                  </span>
                </div>

                <p className="text-[11px] text-stone-600 leading-tight">{capa.descripcion}</p>
              </div>
            );
          })}
        </div>

        <div className="md:col-span-2 bg-stone-900 text-stone-100 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[360px] border border-stone-800">
          <div className="flex items-center justify-between text-xs text-stone-400 font-mono z-10">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>PROYECCIÓN: EPSG:4326 (WGS-84) · San Juan</span>
            </div>
            <span>SRID=4326</span>
          </div>

          <div className="my-auto py-8 text-center space-y-3 z-10">
            <div className="inline-flex p-3 rounded-full bg-stone-800/80 border border-stone-700 mb-2">
              <Layers className="w-8 h-8 text-amber-400" />
            </div>
            <h4 className="text-sm font-bold text-stone-200">
              Visualización Cartográfica Activa
            </h4>
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto text-xs">
              {Object.entries(capasVisibles).filter(([_, v]) => v).map(([id]) => {
                const c = capas.find(item => item.id === id);
                return (
                  <span key={id} className="px-2.5 py-1 rounded bg-stone-800 border border-stone-700 text-stone-300 font-mono text-[11px]">
                    {c?.nombre.split(' ')[0]} ({c?.featuresCount} feats)
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-800 pt-3 z-10">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Protección activa contra scrapeo masivo de coordenadas sensibles</span>
            </div>
            <span className="font-mono text-emerald-400">PostGIS Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
