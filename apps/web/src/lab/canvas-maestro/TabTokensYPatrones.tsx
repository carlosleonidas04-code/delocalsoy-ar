import React, { useState } from 'react';
import { Copy, Check, Eye } from 'lucide-react';

interface TokenItem {
  nombre: string;
  valor: string;
  categoria: 'Validado' | 'Sintético' | 'Comunitario' | 'Pendiente' | 'Cartografía';
  descripcion: string;
}

const TOKENS_CATALOG: TokenItem[] = [
  { nombre: '--honest-validado-color', valor: '#00A86B', categoria: 'Validado', descripcion: 'Verde esmeralda canónico para datos verificados en terreno' },
  { nombre: '--honest-validado-bg', valor: 'rgba(0, 168, 107, 0.08)', categoria: 'Validado', descripcion: 'Fondo suave de alta legibilidad' },
  { nombre: '--honest-validado-border-color', valor: '#00A86B', categoria: 'Validado', descripcion: 'Borde sólido continuo de 2px' },
  { nombre: '--honest-validado-glyph', valor: "'●'", categoria: 'Validado', descripcion: 'Glifo canónico de acreditación empírica' },
  { nombre: '--honest-validado-microcopy', valor: "'Acreditado criptográficamente'", categoria: 'Validado', descripcion: 'Microcopia de auditoría R15' },

  { nombre: '--honest-sintetico-color', valor: '#FFC72C', categoria: 'Sintético', descripcion: 'Dorado canónico para modelos heurísticos e IA' },
  { nombre: '--honest-sintetico-text', valor: '#92400E', categoria: 'Sintético', descripcion: 'Color tipográfico accesible WCAG AA sobre fondos claros' },
  { nombre: '--honest-sintetico-border-color', valor: '#D97706', categoria: 'Sintético', descripcion: 'Borde discontinuo (dashed) de 1.5px' },
  { nombre: '--honest-sintetico-glyph', valor: "'✦'", categoria: 'Sintético', descripcion: 'Glifo canónico de inferencia de modelo' },
  { nombre: '--honest-sintetico-microcopy', valor: "'Inferencia heurística / Estimación'", categoria: 'Sintético', descripcion: 'Microcopia de transparencia epistémica' },

  { nombre: '--honest-comunitario-color', valor: '#E06D53', categoria: 'Comunitario', descripcion: 'Terracota arcilloso para saberes populares y asambleas' },
  { nombre: '--honest-comunitario-border-radius', valor: '0.44rem', categoria: 'Comunitario', descripcion: 'Radio de borde canónico (divergencia resuelta 0.44)' },
  { nombre: '--honest-comunitario-border-color', valor: '#EA580C', categoria: 'Comunitario', descripcion: 'Borde punteado (dotted) de 1.5px' },
  { nombre: '--honest-comunitario-glyph', valor: "'◈'", categoria: 'Comunitario', descripcion: 'Glifo canónico de aporte territorial de base' },
  { nombre: '--honest-comunitario-microcopy', valor: "'Aporte territorial de asamblea'", categoria: 'Comunitario', descripcion: 'Microcopia de validación vecinal' },

  { nombre: '--honest-pendiente-color', valor: '#94A3B8', categoria: 'Pendiente', descripcion: 'Pizarra neutro para relevos en proceso de auditoría' },
  { nombre: '--honest-pendiente-glyph', valor: "'◐'", categoria: 'Pendiente', descripcion: 'Glifo canónico armonizado con documentación técnica' },
  { nombre: '--honest-pendiente-border-color', valor: '#64748B', categoria: 'Pendiente', descripcion: 'Borde segmentado tenue de 1px' },
  { nombre: '--honest-pendiente-microcopy', valor: "'Relevo en curso / Pendiente R9'", categoria: 'Pendiente', descripcion: 'Microcopia de espera de acreditación' },

  { nombre: '--honest-map-centroid-ring', valor: 'rgba(0, 168, 107, 0.35)', categoria: 'Cartografía', descripcion: 'Anillo de centroide territorial SRID 4326' },
  { nombre: '--honest-map-stroke-validado', valor: '#00A86B', categoria: 'Cartografía', descripcion: 'Trazo de polígonos verificados' }
];

const PATRONES_CATALOG = [
  { id: 'P-01', nombre: 'Banner Nodal de Soberanía', descripcion: 'Encabezado con estado federado, coordenadas y huella criptográfica SHA-256' },
  { id: 'P-02', nombre: 'Indicador Epistémico Cuádruple', descripcion: 'Color + Geometría de Borde + Glifo + Microcopia sin usar pill boxes' },
  { id: 'P-03', nombre: 'Matriz de Relevo Territorial Sensible', descripcion: 'Grilla de relevo con filtros de privacidad estricta y auditoría R15' },
  { id: 'P-04', nombre: 'Visualizador de Cuencas y Oasis', descripcion: 'Superficie hídrica, canales y cuencas con gradientes permeables' },
  { id: 'P-05', nombre: 'Ficha de Comercio Barrial de Proximidad', descripcion: 'Tarjeta de comercio local con trazabilidad de compras y abastecimiento' },
  { id: 'P-06', nombre: 'Tarjeta de Espacio Cívico Comunitario', descripcion: 'Ficha de plazas, parques y espacios de reunión comunitaria' },
  { id: 'P-07', nombre: 'Transición Nodal Federada', descripcion: 'Cambio de nodo conservando sesión criptográfica y contratos de red' },
  { id: 'P-08', nombre: 'Monitor de Evidencias Criptográficas', descripcion: 'Verificación en vivo de firmas Ed25519 y sumas de comprobación SHA-256' },
  { id: 'P-09', nombre: 'Exportador SIN TAR Transportable', descripcion: 'Empaquetado JSON transportable bajo 1.024.000 Bytes por archivo' },
  { id: 'P-10', nombre: 'Consola de Gobernanza y Consenso', descripcion: 'Acreditación comunitaria de saberes territoriales sin intermediarios' }
];

export const TabTokensYPatrones: React.FC = () => {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todos');
  const [selectedPatron, setSelectedPatron] = useState<string>('P-02');

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1800);
  };

  const tokensFiltrados = filtroCategoria === 'Todos'
    ? TOKENS_CATALOG
    : TOKENS_CATALOG.filter(t => t.categoria === filtroCategoria);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">§3B — 43 Tokens Epistémicos & 10 Patrones P-01…P-10</h2>
          <p className="text-sm text-stone-600 mt-0.5">
            Especificación canónica del Lote 1 «Caucete Estético» y Canvas Maestro. Cero pill boxes genéricos.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg text-xs font-medium text-stone-600 overflow-x-auto">
          {['Todos', 'Validado', 'Sintético', 'Comunitario', 'Pendiente', 'Cartografía'].map(cat => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                filtroCategoria === cat
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'hover:text-stone-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Tokens CSS (--honest-*)</span>
          <span className="text-xs text-stone-500">{tokensFiltrados.length} tokens visibles</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tokensFiltrados.map(token => (
            <div
              key={token.nombre}
              className="bg-white border border-stone-200 rounded-lg p-3 hover:border-stone-400 transition-all text-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <code className="font-mono font-semibold text-stone-800 bg-stone-50 px-1.5 py-0.5 rounded text-[11px]">
                  {token.nombre}
                </code>
                <button
                  onClick={() => copyToClipboard(`var(${token.nombre})`)}
                  className="text-stone-400 hover:text-stone-700 p-1"
                  title="Copiar token"
                >
                  {copiedToken === `var(${token.nombre})` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-4 h-4 rounded border border-stone-300 shrink-0"
                  style={{ backgroundColor: token.valor.startsWith('#') || token.valor.startsWith('rgba') ? token.valor : '#fff' }}
                />
                <span className="font-mono text-stone-600 text-[11px] truncate">{token.valor}</span>
              </div>
              <p className="text-stone-500 text-[11px] leading-relaxed line-clamp-2">{token.descripcion}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-stone-200">
        <div className="mb-4">
          <h3 className="text-base font-bold text-stone-900">Catálogo de 10 Patrones Canónicos (P-01 a P-10)</h3>
          <p className="text-xs text-stone-600">Patrones formales para aplicaciones territoriales sin degradación de legibilidad.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5 md:col-span-1 max-h-96 overflow-y-auto pr-1">
            {PATRONES_CATALOG.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPatron(p.id)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors flex items-start gap-2.5 ${
                  selectedPatron === p.id
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950 font-medium'
                    : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span className="font-mono font-bold text-amber-800 text-[11px] shrink-0 mt-0.5">{p.id}</span>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.nombre}</div>
                  <div className="text-[11px] text-stone-500 truncate">{p.descripcion}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="md:col-span-2 bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
                <div>
                  <span className="font-mono text-xs font-bold text-amber-700 mr-2">{selectedPatron}</span>
                  <span className="font-semibold text-stone-900 text-sm">
                    {PATRONES_CATALOG.find(p => p.id === selectedPatron)?.nombre}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-stone-500">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview en vivo</span>
                </div>
              </div>

              {selectedPatron === 'P-01' && (
                <div className="bg-stone-900 text-white rounded-lg p-4 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-stone-400 text-[11px]">
                    <span>NODO FEDERADO: SAN JUAN CAPITAL</span>
                    <span className="text-emerald-400">● ACTIVO Y VERIFICADO</span>
                  </div>
                  <div className="text-base font-bold text-stone-100">Eje Cívico Cultural & Subnodos Barriales</div>
                  <div className="flex items-center gap-4 text-stone-400 text-[11px] pt-2 border-t border-stone-800">
                    <span>SRID: 4326 (WGS-84)</span>
                    <span>·</span>
                    <span>CENTROIDE: -31.5375, -68.5252</span>
                    <span>·</span>
                    <span>HINT: 4 subnodos</span>
                  </div>
                </div>
              )}

              {selectedPatron === 'P-02' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600">
                    4 señales perceptibles sin confusión: color contrastado, trazo diferencial, glifo unívoco y texto explícito.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded bg-emerald-50/60 border-2 border-emerald-500 text-emerald-900">
                      <div className="flex items-center justify-between font-bold">
                        <span>● Validado en Terreno</span>
                        <span className="text-[10px] uppercase font-mono">Borde continuo</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-1">Acreditado criptográficamente · R15</p>
                    </div>

                    <div className="p-2.5 rounded bg-amber-50/80 border border-dashed border-amber-600 text-amber-950">
                      <div className="flex items-center justify-between font-bold">
                        <span>✦ Inferencia Sintética</span>
                        <span className="text-[10px] uppercase font-mono">Borde dashed</span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-1">Inferencia heurística / Estimación</p>
                    </div>

                    <div className="p-2.5 rounded bg-orange-50/60 border border-dotted border-orange-600 text-orange-950" style={{ borderRadius: '0.44rem' }}>
                      <div className="flex items-center justify-between font-bold">
                        <span>◈ Aporte Comunitario</span>
                        <span className="text-[10px] uppercase font-mono">Borde dotted</span>
                      </div>
                      <p className="text-[11px] text-orange-800 mt-1">Aporte territorial de asamblea</p>
                    </div>

                    <div className="p-2.5 rounded bg-slate-50 border border-dashed border-slate-400 text-slate-800">
                      <div className="flex items-center justify-between font-bold">
                        <span>◐ Relevo Pendiente</span>
                        <span className="text-[10px] uppercase font-mono">Segmentado fino</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">Relevo en curso / Pendiente R9</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span>Conforme estándar de diseño DELocalSoy.AR</span>
              <span className="font-mono text-emerald-700">WCAG 2.1 AA Acreditado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
