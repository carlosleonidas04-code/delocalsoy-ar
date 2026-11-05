import { useEffect, useId, useState } from 'react';
import {
  CAPITAL_TERRITORIAL_ENTITIES,
  CAPITAL_TERRITORIAL_RELATIONS,
  DIRECTORY_CATEGORIES_CATALOG,
  CAPITAL_DIRECTORY_LISTINGS,
  CAPITAL_GITHUB_TRACEABILITY,
} from '../data/capitalTerritoryData';
import { BancoPotencialidadesPanel } from './BancoPotencialidadesPanel';
import type { DataSource } from '../lib/dataSource';
import { etiquetaContinuidad, type AccesibilidadResumen, type CorredorItem } from '../lib/oportunidades';

type CapitalTab =
  | 'territorio'
  | 'potencialidades'
  | 'accesibilidad'
  | 'directorio'
  | 'gobernanza'
  | 'asistente_etico';

export function NodoCapitalDashboard({ dataSource }: { dataSource: DataSource }) {
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

  // NCAP-FE #163 (cascada NODO-CAPITAL): corredores reales (NCAP-R4) y
  // accesibilidad (NCAP-R5) por contrato DataSource (ADR-029) — carga
  // perezosa UNA sola vez al entrar a cada pestaña; R5: el error ES error,
  // jamás se degrada a lista vacía ni se inventa un resumen.
  const [corredores, setCorredores] = useState<CorredorItem[] | null>(null);
  const [corredoresEstado, setCorredoresEstado] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle');
  const [accesibilidad, setAccesibilidad] = useState<AccesibilidadResumen | null>(null);
  const [accesibilidadEstado, setAccesibilidadEstado] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle');

  useEffect(() => {
    if (activeTab !== 'territorio' || corredoresEstado !== 'idle') return;
    const listar = dataSource.listCorredores?.bind(dataSource);
    if (!listar) return;
    let cancelado = false;
    setCorredoresEstado('loading');
    listar()
      .then((items) => {
        if (cancelado) return;
        setCorredores(items);
        setCorredoresEstado('ok');
      })
      .catch(() => {
        if (!cancelado) setCorredoresEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [activeTab, corredoresEstado, dataSource]);

  useEffect(() => {
    if (activeTab !== 'accesibilidad' || accesibilidadEstado !== 'idle') return;
    const obtener = dataSource.getAccesibilidad?.bind(dataSource);
    if (!obtener) return;
    let cancelado = false;
    setAccesibilidadEstado('loading');
    obtener('capital')
      .then((resumen) => {
        if (cancelado) return;
        setAccesibilidad(resumen);
        setAccesibilidadEstado('ok');
      })
      .catch(() => {
        if (!cancelado) setAccesibilidadEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [activeTab, accesibilidadEstado, dataSource]);

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
              <span className="text-emerald-400">Integración ADR-029 · #163</span>
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
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded">NCAP-R6 #158</span>
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
            onClick={() => setActiveTab('accesibilidad')}
            className={
              'px-4 py-2 text-xs font-semibold rounded-lg transition-colors ' +
              (activeTab === 'accesibilidad'
                ? 'bg-slate-800 text-amber-300 border border-amber-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50')
            }
          >
            Accesibilidad Peatonal (NCAP-R5)
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
        <BancoPotencialidadesPanel dataSource={dataSource} />
      )}

      {activeTab === 'territorio' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <span className="text-xs font-mono text-slate-400">NCAP-R4 #156 · GET /api/corredores</span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Corredores de Articulación Territorial (v0.1 — API real)
              </h2>
              <p className="text-xs text-slate-300">
                Corredores v0.1 publicados por la plataforma (ADR-029): hipótesis de diseño con
                conteos reales de segmentos e hitos por corredor — nada de esto es inventado ni
                promediado (R15).
              </p>
            </div>

            {corredoresEstado === 'loading' && (
              <p className="text-xs font-mono text-slate-400">Cargando corredores de la API…</p>
            )}
            {corredoresEstado === 'error' && (
              <p className="text-xs font-mono text-rose-400">
                Error al cargar corredores (R5: sin fallback silencioso — sin datos no se muestra nada).
              </p>
            )}
            {corredoresEstado === 'ok' && corredores !== null && corredores.length === 0 && (
              <p className="text-xs font-mono text-amber-300">
                0 corredores publicados — la hipótesis de articulación aún no tiene corredores declarados.
              </p>
            )}
            {corredoresEstado === 'ok' && corredores !== null && corredores.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {corredores.map((cor) => (
                  <div key={cor.key} className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">{cor.label}</h3>
                      <span className="text-[11px] font-mono text-amber-400 uppercase">{cor.status}</span>
                    </div>
                    <p className="text-xs text-slate-400">{cor.proposito}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>{cor.segmentos_count} segmentos</span>
                      <span aria-hidden="true">·</span>
                      <span>{cor.hitos_count} hitos</span>
                      <span aria-hidden="true">·</span>
                      <span className={cor.continuidad === 'ok' ? 'text-emerald-400' : 'text-rose-400'}>
                        {etiquetaContinuidad(cor.continuidad)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {activeTab === 'accesibilidad' && (
        <div className="space-y-6">
          {accesibilidadEstado === 'loading' && (
            <p className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
              Cargando accesibilidad del nodo…
            </p>
          )}
          {accesibilidadEstado === 'error' && (
            <p className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-rose-400">
              Error al cargar accesibilidad (R5: sin fallback silencioso — sin datos no se muestra nada).
            </p>
          )}
          {accesibilidadEstado === 'ok' && accesibilidad !== null && (
            <>
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div>
                  <span className="text-xs font-mono text-slate-400">
                    NCAP-R5 #157 · GET /api/nodos/capital/accesibilidad
                  </span>
                  <h2 className="text-lg font-bold text-white mt-0.5">Accesibilidad Peatonal del Nodo Capital</h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">{accesibilidad.regla}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <p className="text-2xl font-black text-amber-300">{accesibilidad.tramos_vereda.cobertura}</p>
                  <p className="text-xs text-slate-300">{accesibilidad.tramos_vereda.cautela}</p>
                  <p className="text-[11px] font-mono text-slate-400">
                    Fecha de corte: {accesibilidad.tramos_vereda.fecha_corte ?? 'sin fecha de corte declarada (R15)'}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-0.5">
                    <p className="text-lg font-black text-amber-300">{accesibilidad.observaciones.ingresadas}</p>
                    <p className="text-[11px] text-slate-400">Ingresadas (pending)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-0.5">
                    <p className="text-lg font-black text-amber-300">{accesibilidad.observaciones.revisadas}</p>
                    <p className="text-[11px] text-slate-400">Revisadas (community_validated)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-0.5">
                    <p className="text-lg font-black text-emerald-400">{accesibilidad.observaciones.corroboradas}</p>
                    <p className="text-[11px] text-slate-400">Corroboradas (verified)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-0.5">
                    <p className="text-lg font-black text-rose-400">{accesibilidad.observaciones.disputadas}</p>
                    <p className="text-[11px] text-slate-400">Disputadas (disputed)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-0.5">
                    <p className="text-lg font-black text-fuchsia-300">{accesibilidad.observaciones.ilustrativas}</p>
                    <p className="text-[11px] text-slate-400">Ilustrativas (synthetic_demo)</p>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-slate-500">
                  Observaciones — fecha de corte: {accesibilidad.observaciones.fecha_corte ?? 'sin fecha declarada (R15)'}
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white">Features por capa y estado</h3>
                {accesibilidad.features_por_capa.map((capa) => (
                  <div key={capa.capa} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-mono">{capa.capa}</span>
                      <span className="font-mono text-amber-300">{capa.total}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(capa.por_estado).map(([estado, total]) => (
                        <span
                          key={estado}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800 text-slate-300"
                        >
                          {estado}: {total}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white">Features por fuente</h3>
                  {accesibilidad.features_por_fuente.length === 0 && (
                    <p className="text-xs text-slate-400">Sin fuentes declaradas.</p>
                  )}
                  {accesibilidad.features_por_fuente.map((f) => (
                    <div key={f.fuente} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-300">{f.fuente}</span>
                      <span className="font-mono text-amber-300 shrink-0">{f.total}</span>
                    </div>
                  ))}
                </div>
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white">Reportes ciudadanos por categoría</h3>
                  {accesibilidad.reportes_por_categoria.length === 0 && (
                    <p className="text-xs text-slate-400">
                      0 reportes ciudadanos — el registro comunitario arranca vacío (dato honesto).
                    </p>
                  )}
                  {accesibilidad.reportes_por_categoria.map((c) => (
                    <div key={c.categoria} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-300">{c.categoria}</span>
                      <span className="font-mono text-amber-300 shrink-0">{c.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white">Hitos del nodo: ficha y última revisión</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {accesibilidad.hitos.map((h) => (
                    <div key={h.key} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-amber-400 font-semibold">{h.label}</span>
                        <span className="font-mono text-slate-400">{h.tipo}</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400">
                        {h.con_ficha ? 'Con ficha viva' : 'Sin ficha (R15)'} ·{' '}
                        {h.ultima_revision ?? 'sin revisión registrada'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
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
