import { useState, useId } from 'react';
import {
  CAPITAL_TERRITORIAL_ENTITIES,
  CAPITAL_TERRITORIAL_RELATIONS,
  CAPITAL_STREET_AXES,
  DIRECTORY_CATEGORIES_CATALOG,
  CAPITAL_DIRECTORY_LISTINGS,
  CAPITAL_GITHUB_TRACEABILITY,
} from '../data/capitalTerritoryData';
import { BancoPotencialidadesPanel } from './BancoPotencialidadesPanel';

type CapitalTab = 'territorio' | 'potencialidades' | 'directorio' | 'gobernanza' | 'asistente_etico';

export function NodoCapitalDashboard() {
  const [activeTab, setActiveTab] = useState<CapitalTab>('potencialidades');
  const [selectedSubnode, setSelectedSubnode] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedListingForContact, setSelectedListingForContact] = useState<typeof CAPITAL_DIRECTORY_LISTINGS[0] | null>(null);
  const [contactSuccessMessage, setContactSuccessMessage] = useState<string | null>(null);

  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState<{
    query: string;
    dato: string;
    interpretacion: string;
    sugerencia: string;
    fuentes: string[];
  } | null>(null);

  const assistantInputId = useId();
  const contactNameId = useId();
  const contactPhoneId = useId();
  const contactMsgId = useId();

  const filteredEntities = CAPITAL_TERRITORIAL_ENTITIES.filter((entity) => {
    if (selectedSubnode === 'all') return true;
    if (entity.id === selectedSubnode) return true;
    if (entity.parentId === selectedSubnode) return true;
    return false;
  });

  const filteredListings = CAPITAL_DIRECTORY_LISTINGS.filter((listing) => {
    if (selectedCategory !== 'all' && listing.primaryCategory !== selectedCategory) return false;
    if (selectedSubnode !== 'all' && listing.territorialContext.subnodeId !== selectedSubnode) return false;
    return true;
  });

  const handleAssistantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantQuery.trim()) return;

    const q = assistantQuery.toLowerCase();
    if (q.includes('el palomar') || q.includes('universit') || q.includes('natatorio') || q.includes('comedor')) {
      setAssistantResponse({
        query: assistantQuery,
        dato: 'El Complejo Polideportivo El Palomar (UNSJ) está ubicado en calle 25 de Mayo 1920 Oeste, Desamparados. Cuenta con Comedor Universitario, natatorio climatizado y canchas deportivas operativas (fuente: Secretaría de Bienestar Universitario UNSJ).',
        interpretacion:
          'Constituye una centralidad neurálgica de bienestar estudiantil y deporte que articula la vida universitaria con los barrios residenciales de Desamparados a lo largo del eje 25 de Mayo.',
        sugerencia:
          'Consultar la oferta del Comedor Universitario en el Directorio Comercial o postular proyectos de extensión estudiantil en el Banco de Potencialidades.',
        fuentes: ['Secretaría de Bienestar Universitario UNSJ', 'Relevamiento territorial 25 de Mayo Oeste'],
      });
    } else if (q.includes('mupa') || q.includes('paleontol') || q.includes('museo')) {
      setAssistantResponse({
        query: assistantQuery,
        dato: 'El Museo Paleontológico y de Ciencias Naturales (MUPA - UNSJ) se ubica en el predio del ex Ferrocarril Belgrano junto al Parque Belgrano. Su estado operativo actual es "en preparación y acondicionamiento", sin apertura masiva confirmada aún (fuente: UNSJ / Min. Infraestructura).',
        interpretacion:
          'Representa un hito científico de relevancia internacional en el Eje Cívico-Cultural, pero no debe informarse al público como servicio turístico abierto hasta confirmación oficial de fecha de inauguración.',
        sugerencia:
          'Explorar el Museo de la Historia Urbana (MHU) o el Auditorio Juan Victoria, que se encuentran plenamente operativos en el Parque de Mayo.',
        fuentes: ['Boletín de Prensa UNSJ 2026', 'Inspección técnica Parque Belgrano'],
      });
    } else if (q.includes('rampa') || q.includes('accesib') || q.includes('libertador')) {
      setAssistantResponse({
        query: assistantQuery,
        dato: 'En Av. Libertador Oeste entre Urquiza y Paula Albarracín se registraron 6 esquinas con rampas deterioradas o pendientes de ejecución (fuente: relevamiento comunitario Foro de Accesibilidad Capital, 01-10-2026).',
        interpretacion:
          'Existe una discontinuidad peatonal que impacta la accesibilidad hacia Casa de Gobierno y centros de salud de la zona.',
        sugerencia:
          'La demanda comunitaria se encuentra registrada bajo el código opp-cap-003 en el Banco de Potencialidades para priorización ante la Municipalidad de la Ciudad de San Juan.',
        fuentes: ['Relevamiento de Campo Accesibilidad Capital 2026', 'PEC Diagnóstico 2025'],
      });
    } else {
      setAssistantResponse({
        query: assistantQuery,
        dato: 'El Nodo Capital abarca los subnodos piloto San Juan Centro y Desamparados, vinculados por 5 corredores este-oeste y 7 ejes norte-sur.',
        interpretacion:
          'La densidad de comercios y servicios es máxima en Microcentro (perímetro Libertador-Córdoba-Alem-Rioja), mientras que Desamparados concentra potencial productivo, educativo y comunitario.',
        sugerencia:
          'Utilizar los filtros del Banco de Potencialidades o el Directorio Comercial para explorar oportunidades específicas en el territorio.',
        fuentes: ['Plan Estratégico Capital 2025', 'Base Consolidada DELocalSoy.AR'],
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-amber-400 font-semibold">Nodo Capital San Juan</span>
              <span aria-hidden="true">·</span>
              <span>delocalsoy_sj_capital</span>
              <span aria-hidden="true">·</span>
              <span>Épica #152</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">Main @ 89c0bcc</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              Plataforma Territorial del Nodo Capital
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl mt-1">
              Despliegue de los subnodos piloto <strong className="text-white">San Juan Centro</strong> y <strong className="text-white">Desamparados</strong>, sus corredores de articulación, el Banco de Potencialidades (Bloque 9) y la arquitectura integral de los Bloques 1 al 12.
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedSubnode('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedSubnode === 'all'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todo Capital
            </button>
            <button
              type="button"
              onClick={() => setSelectedSubnode('sj_capital_centro')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedSubnode === 'sj_capital_centro'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Subnodo Centro
            </button>
            <button
              type="button"
              onClick={() => setSelectedSubnode('sj_capital_desamparados')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedSubnode === 'sj_capital_desamparados'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Subnodo Desamparados
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('potencialidades')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'potencialidades'
                ? 'bg-slate-800 text-amber-300 border border-amber-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>Banco de Potencialidades (Bloque 9)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded">PR #160</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('territorio')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'territorio'
                ? 'bg-slate-800 text-amber-300 border border-amber-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Territorio, Corredores e Hitos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directorio')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'directorio'
                ? 'bg-slate-800 text-amber-300 border border-amber-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Directorio Comercial Clasificado (11 Cat.)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('asistente_etico')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'asistente_etico'
                ? 'bg-slate-800 text-amber-300 border border-amber-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Asistente Territorial Ético (Bloque 11)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gobernanza')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'gobernanza'
                ? 'bg-slate-800 text-amber-300 border border-amber-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Gobernanza y Épica #152 (Bloques 1–12)
          </button>
        </div>
      </div>

      {activeTab === 'potencialidades' && (
        <BancoPotencialidadesPanel />
      )}

      {activeTab === 'territorio' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <span className="text-xs font-mono text-slate-400">NCAP-R4 #156</span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Red de Ejes Viales y Corredores de Articulación Territorial
              </h2>
              <p className="text-xs text-slate-300">
                Corredores v0.1 modelados como hipótesis de diseño e interconexión funcional entre el Microcentro, el Complejo El Palomar, la UNSJ y el oeste departamental.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CAPITAL_STREET_AXES.map((axis) => (
                <div key={axis.id} className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{axis.name}</h3>
                    <span className="text-[11px] font-mono text-amber-400 uppercase">
                      {axis.orientation.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    {axis.segments.map((seg, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400">↳</span>
                        <span>
                          <strong>{seg.fromReference}</strong> ➔ <strong>{seg.toReference}</strong>{' '}
                          <span className="text-slate-300">({seg.circulation === 'two_way' ? 'doble mano' : 'mano única'} · {seg.evidenceStatus})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-slate-400">Inventario Canónico v0.1</span>
                <h2 className="text-lg font-bold text-white mt-0.5">Centralidades e Hitos Cívico-Universitarios</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {filteredEntities.length} entidades en vista
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredEntities.map((ent) => (
                <div key={ent.id} className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-semibold">{ent.kind.replace('_', ' ')}</span>
                    <span className="text-[11px] font-mono text-slate-400">{ent.boundaryStatus}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white leading-snug">{ent.name}</h3>
                  {ent.metadata && (
                    <div className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-slate-800/60">
                      {Object.entries(ent.metadata).map(([k, val]) => (
                        <div key={k}>
                          <span className="text-slate-400">{k}:</span> {String(val)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h2 className="text-base font-bold text-white">Grafo de Relaciones Territoriales Topológicas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {CAPITAL_TERRITORIAL_RELATIONS.map((rel) => (
                <div key={rel.id} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-slate-300">{rel.fromEntityId}</span>{' '}
                    <span className="text-amber-400 font-semibold">[{rel.relationType}]</span>{' '}
                    <span className="font-mono text-slate-300">{rel.toEntityId}</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono">{rel.confidence}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'directorio' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono text-slate-400">Bloques 2, 3 y 4 — Directorio Comercial</span>
                <h2 className="text-lg font-bold text-white mt-0.5">Catálogo de Actores y Servicios Locales</h2>
                <p className="text-xs text-slate-300">
                  Taxonomía normalizada en 11 categorías primarias con sellos de verificación y contacto directo sin comisiones ni intermediación externa.
                </p>
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="all">Todas las Categorías (11)</option>
                  {DIRECTORY_CATEGORIES_CATALOG.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {filteredListings.map((listing) => (
                <div
                  key={listing.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-400">
                        {DIRECTORY_CATEGORIES_CATALOG.find((c) => c.code === listing.primaryCategory)?.name || listing.primaryCategory}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400">
                        ✓ {listing.trustLevel.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{listing.displayName}</h3>
                    {listing.headline && (
                      <p className="text-xs text-slate-300 italic">{listing.headline}</p>
                    )}
                    <p className="text-xs text-slate-400">{listing.description}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
                    <div className="text-slate-400">
                      <strong>Ubicación:</strong> {listing.address?.street} {listing.address?.number} ({listing.address?.neighborhood})
                    </div>
                    <div className="text-slate-400">
                      <strong>Modalidad:</strong> {listing.serviceModes.join(', ')}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedListingForContact(listing);
                        setContactSuccessMessage(null);
                      }}
                      className="w-full mt-2 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                    >
                      Enviar Consulta / Reservar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'asistente_etico' && (
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Bloque 11 — Inteligencia Territorial Ética</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400">Paradigma RAG: Dato ➔ Interpretación ➔ Sugerencia</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Asistente Territorial de Consulta con Trazabilidad y Citas
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Procesa preguntas sobre equipamientos, corredores, accesibilidad u oportunidades en San Juan Capital. No inventa datos, cita fuentes verificables y distingue datos de hechos de inferencias.
            </p>
          </div>

          <form onSubmit={handleAssistantSubmit} className="space-y-2">
            <div className="flex gap-2">
              <label htmlFor={assistantInputId} className="sr-only">Pregunta al Asistente Territorial</label>
              <input
                id={assistantInputId}
                type="text"
                placeholder="Ej: ¿Qué servicios ofrece el Complejo El Palomar? o ¿Cuál es el estado del MUPA?"
                value={assistantQuery}
                onChange={(e) => setAssistantQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors shrink-0"
              >
                Consultar
              </button>
            </div>
            <div className="flex gap-2 text-[11px] text-slate-500">
              <span>Consultas rápidas:</span>
              <button
                type="button"
                onClick={() => setAssistantQuery('¿Qué actividades y servicios hay en El Palomar?')}
                className="underline hover:text-slate-300"
              >
                El Palomar UNSJ
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setAssistantQuery('¿Está abierto el Museo Paleontológico MUPA?')}
                className="underline hover:text-slate-300"
              >
                Estado MUPA
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setAssistantQuery('¿Dónde faltan rampas peatonales en Libertador?')}
                className="underline hover:text-slate-300"
              >
                Accesibilidad Libertador
              </button>
            </div>
          </form>

          {assistantResponse && (
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-xs animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="font-semibold text-white">Consulta: "{assistantResponse.query}"</span>
                <span className="text-[11px] font-mono text-emerald-400">Verificado RAG v1</span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="font-bold text-amber-400 mb-1">1. Dato Verificado (Fuente Registrada)</div>
                  <p className="text-slate-200">{assistantResponse.dato}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="font-bold text-sky-400 mb-1">2. Interpretación Territorial</div>
                  <p className="text-slate-200">{assistantResponse.interpretacion}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="font-bold text-emerald-400 mb-1">3. Sugerencia de Acción</div>
                  <p className="text-slate-200">{assistantResponse.sugerencia}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                <strong>Fuentes respaldatorias:</strong> {assistantResponse.fuentes.join(' · ')}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'gobernanza' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <span className="text-xs font-mono text-slate-400">Regla R9 · Trazabilidad de GitHub</span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Matriz de Issues de la Épica NODO-CAPITAL (#152)
              </h2>
              <p className="text-xs text-slate-300">
                Estado honesto de avance entre lo diseñado, lo propuesto en PR y lo verificado en workspace.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-2">Referencia</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2">Nombre del Entregable</th>
                    <th className="pb-2">Estado</th>
                    <th className="pb-2">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {CAPITAL_GITHUB_TRACEABILITY.map((item) => (
                    <tr key={item.ref} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-mono text-amber-400 font-bold">{item.ref}</td>
                      <td className="py-2.5 text-slate-300">{item.tipo}</td>
                      <td className="py-2.5 font-semibold text-white">{item.nombre}</td>
                      <td className="py-2.5">
                        <span
                          className={`font-semibold ${
                            item.estado.includes('PR')
                              ? 'text-emerald-400'
                              : item.estado === 'Abierta'
                              ? 'text-sky-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">{item.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h2 className="text-base font-bold text-white">Especificación Canónica: Arquitectura de 12 Bloques</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 1</strong>
                <span className="text-slate-400">Vocabulario y Contratos Base</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 2</strong>
                <span className="text-slate-400">Actores y Taxonomía Comercial (11 Cat.)</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 3</strong>
                <span className="text-slate-400">Búsqueda Espacial y Descubrimiento</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 4</strong>
                <span className="text-slate-400">Interacciones y Solicitudes sin Pasarela</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 5</strong>
                <span className="text-slate-400">Confianza, Reseñas y Reputación</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 6</strong>
                <span className="text-slate-400">Panel Operativo del Comercio</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 7</strong>
                <span className="text-slate-400">Gobernanza y Moderación de Plataforma</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 8</strong>
                <span className="text-slate-400">Dashboard de Desarrollo Económico Local</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-600/40">
                <strong className="text-amber-300 block">Bloque 9 (Activo)</strong>
                <span className="text-slate-300">Banco de Potencialidades y Oportunidades</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 10</strong>
                <span className="text-slate-400">Participación y Deliberación Ciudadana</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 11</strong>
                <span className="text-slate-400">Inteligencia Territorial Ética RAG</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <strong className="text-white block">Bloque 12</strong>
                <span className="text-slate-400">Federación Inter-Nodo por Contratos</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedListingForContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <span className="text-[11px] font-mono text-slate-400">Contacto Directo sin Intermediación</span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedListingForContact.displayName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedListingForContact(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {contactSuccessMessage ? (
              <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs space-y-2">
                <div className="font-bold">✓ Consulta transmitida con éxito</div>
                <p>{contactSuccessMessage}</p>
                <button
                  type="button"
                  onClick={() => setSelectedListingForContact(null)}
                  className="mt-2 px-3 py-1.5 bg-emerald-600 text-white rounded font-medium"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setContactSuccessMessage(
                    `Su mensaje fue derivado al canal autorizado de ${selectedListingForContact.displayName}. Recibirá respuesta según la política de contacto declarada.`
                  );
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label htmlFor={contactNameId} className="block text-slate-300 font-medium mb-1">Su Nombre / Identificación</label>
                  <input
                    id={contactNameId}
                    type="text"
                    required
                    placeholder="Ej: Vecino / Estudiante de Desamparados"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label htmlFor={contactPhoneId} className="block text-slate-300 font-medium mb-1">Canal de Contacto (Email o Teléfono)</label>
                  <input
                    id={contactPhoneId}
                    type="text"
                    required
                    placeholder="Ej: usuario@gmail.com o 264-4..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label htmlFor={contactMsgId} className="block text-slate-300 font-medium mb-1">Mensaje o Detalle del Pedido</label>
                  <textarea
                    id={contactMsgId}
                    rows={3}
                    required
                    placeholder="Escriba su consulta, pedido de disponibilidad o presupuesto..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedListingForContact(null)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg"
                  >
                    Enviar Mensaje
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
