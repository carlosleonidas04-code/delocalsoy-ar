import { useState, useId } from 'react';
import type { LocalOpportunity } from '@delocalsoy/contracts';
import { CAPITAL_OPPORTUNITIES_SEEDS } from '../data/capitalTerritoryData';

// Fix puente (#233, ratificado por la DH 2026-11-01): oportunidades.js fue eliminado de
// contracts (decisión DH 2026-10-17: dominio Bloque 9 canónico único = Oportunidad* en
// index.ts). Los tipos se derivan del alias puente LocalOpportunity (directoryTaxonomy.ts);
// la matriz de transiciones y el validador se recuperan VERBATIM del oportunidades.ts
// original (lote 1, restaurado byte-exacto en 3ce3af263f) como código stage-local del
// panel — no duplican el dominio canónico (la matriz canónica vive en la API, NCAP-R6).
// Deuda registrada: cuando el stage migre a Oportunidad* canónicas, esta copia se elimina.
type OpportunityType = LocalOpportunity['type'];
type OpportunityStatus = LocalOpportunity['status'];
type DirectoryCategoryCode = LocalOpportunity['categoryCodes'][number];

const ALLOWED_OPPORTUNITY_TRANSITIONS: Record<OpportunityStatus, readonly OpportunityStatus[]> = {
  detected: ['under_review', 'discarded', 'archived'],
  under_review: ['validated', 'detected', 'discarded', 'archived'],
  validated: ['prioritized', 'in_development', 'active', 'paused', 'archived'],
  prioritized: ['in_development', 'active', 'validated', 'paused', 'archived'],
  in_development: ['active', 'implemented', 'paused', 'validated', 'archived'],
  active: ['implemented', 'paused', 'archived'],
  implemented: ['active', 'archived'],
  paused: ['under_review', 'validated', 'active', 'discarded', 'archived'],
  discarded: ['under_review', 'archived'],
  archived: ['under_review', 'detected'],
};

// Verbatim de packages/contracts/src/oportunidades.ts (lote 1, 3ce3af263f) — stage-local.
function validateOpportunity(opp: LocalOpportunity): string[] {
  const errors: string[] = [];

  if (opp.actors.length === 0) {
    errors.push('La oportunidad debe contener al menos un actor con consentimiento.');
  }

  const unconsentedActors = opp.actors.filter((a) => !a.consentConfirmed);
  if (unconsentedActors.length > 0) {
    errors.push('Todos los actores registrados deben haber otorgado consentimiento explícito.');
  }

  if (opp.evidence.length === 0) {
    errors.push('La oportunidad debe incorporar al menos una evidencia comprobable.');
  }

  if (opp.status === 'validated' || opp.status === 'active' || opp.status === 'implemented') {
    const hasCorroboratedEvidence = opp.evidence.some(
      (e) => e.validationStatus === 'corroborated' || e.validationStatus === 'reviewed'
    );
    if (!hasCorroboratedEvidence) {
      errors.push(
        `Para alcanzar estado '${opp.status}', la oportunidad requiere evidencia revisada o corroborada.`
      );
    }
  }

  return errors;
}

const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  human_capacity: 'Capacidad Humana',
  productive_capacity: 'Capacidad Productiva',
  physical_asset: 'Activo Físico / Espacio',
  institutional_asset: 'Activo Institucional',
  cultural_asset: 'Activo Cultural y Patrimonial',
  detected_demand: 'Demanda Comunitaria Detectada',
  market_gap: 'Brecha de Mercado Local',
  partnership_opportunity: 'Oportunidad de Alianza',
  investment_opportunity: 'Oportunidad de Inversión',
  policy_opportunity: 'Iniciativa de Política Pública',
};

const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, { label: string; color: string }> = {
  detected: { label: 'Detectada', color: 'text-amber-300' },
  under_review: { label: 'En Revisión Técnica', color: 'text-blue-300' },
  validated: { label: 'Validada', color: 'text-emerald-300' },
  prioritized: { label: 'Priorizada', color: 'text-indigo-300' },
  in_development: { label: 'En Desarrollo', color: 'text-purple-300' },
  active: { label: 'Activa y Operativa', color: 'text-green-400' },
  implemented: { label: 'Concretada', color: 'text-teal-300' },
  paused: { label: 'Pausada', color: 'text-neutral-400' },
  discarded: { label: 'Descartada', color: 'text-rose-400' },
  archived: { label: 'Archivada', color: 'text-neutral-500' },
};

export function BancoPotencialidadesPanel() {
  const [opportunities, setOpportunities] = useState<LocalOpportunity[]>(CAPITAL_OPPORTUNITIES_SEEDS);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubnode, setFilterSubnode] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOppForTransition, setSelectedOppForTransition] = useState<LocalOpportunity | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<OpportunityType>('human_capacity');
  const [newDescription, setNewDescription] = useState('');
  const [newSubnode, setNewSubnode] = useState<'sj_capital_centro' | 'sj_capital_desamparados'>('sj_capital_centro');
  const [newCorridor, setNewCorridor] = useState('axis_ignacio_de_la_roza');
  const [newActorName, setNewActorName] = useState('');
  const [newActorConsent, setNewActorConsent] = useState(true);
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [newImpactHypothesis, setNewImpactHypothesis] = useState('');

  const searchInputId = useId();
  const subnodeFilterId = useId();
  const typeFilterId = useId();
  const statusFilterId = useId();
  const modalTypeId = useId();
  const modalSubnodeId = useId();
  const modalCorridorId = useId();
  const modalTitleId = useId();
  const modalDescId = useId();
  const modalImpactId = useId();
  const modalActorId = useId();
  const modalConsentId = useId();
  const modalEvidenceId = useId();

  const filtered = opportunities.filter((opp) => {
    if (filterType !== 'all' && opp.type !== filterType) return false;
    if (filterSubnode !== 'all' && opp.territorialContext.subnodeId !== filterSubnode) return false;
    if (filterStatus !== 'all' && opp.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = opp.title.toLowerCase().includes(q);
      const matchDesc = opp.description.toLowerCase().includes(q);
      const matchActor = opp.actors.some((a) => a.name.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchActor) return false;
    }
    return true;
  });

  const totalCount = opportunities.length;
  const validatedCount = opportunities.filter((o) => o.status === 'validated' || o.status === 'active' || o.status === 'implemented').length;
  const activeCount = opportunities.filter((o) => o.status === 'active').length;
  const marketGapsCount = opportunities.filter((o) => o.type === 'market_gap' || o.type === 'detected_demand').length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    const candidate: LocalOpportunity = {
      id: `opp-cap-${String(opportunities.length + 1).padStart(3, '0')}`,
      nodeId: 'delocalsoy_sj_capital',
      type: newType,
      title: newTitle.trim(),
      description: newDescription.trim(),
      status: 'detected',
      territorialContext: {
        subnodeId: newSubnode,
        corridorId: newCorridor,
        serviceAreaName: newSubnode === 'sj_capital_centro' ? 'Área Central / Microcentro' : 'Área Desamparados / Oeste',
      },
      actors: [
        {
          name: newActorName.trim() || 'Proponente Ciudadano Registrado',
          role: 'proposer',
          consentConfirmed: newActorConsent,
        },
      ],
      evidence: [
        {
          id: `ev-new-${Date.now()}`,
          sourceId: 'src_relevo_comunitario_web',
          evidenceType: 'community_input',
          description: newEvidenceDesc.trim() || 'Aporte ingresado mediante formulario de participación del Nodo Capital.',
          capturedAt: new Date().toISOString().split('T')[0],
          validationStatus: 'unreviewed',
        },
      ],
      tags: ['participativo', 'nodo capital', newType],
      categoryCodes: ['social_economy'] as DirectoryCategoryCode[],
      // Puente LocalOpportunity: impactHypothesis es string min(1) — vacío = aún sin
      // hipótesis declarada (falsy, el render lo omite); no se inventa texto (R15).
      impactHypothesis: newImpactHypothesis.trim(),
      requiredResources: [],
      visibility: 'public',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      createdBy: 'ciudadano_activo',
      lastReviewedAt: new Date().toISOString().split('T')[0],
      // Score pendiente de relevo comunitario: valores mínimos honestos hasta revisión
      // (totalScore 0 = sin relevo aún) — no se inventa puntuación (R15).
      score: { territorialImpact: 1, feasibility: 1, urgency: 1, totalScore: 0 },
    };

    const errors = validateOpportunity(candidate);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setOpportunities([candidate, ...opportunities]);
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewActorName('');
    setNewEvidenceDesc('');
    setNewImpactHypothesis('');
  };

  const handleTransition = (newStatus: OpportunityStatus) => {
    if (!selectedOppForTransition) return;
    const current = selectedOppForTransition.status;
    const allowed = ALLOWED_OPPORTUNITY_TRANSITIONS[current] ?? [];

    if (!allowed.includes(newStatus)) {
      setTransitionMessage(`Transición no permitida: de '${current}' no se puede pasar directamente a '${newStatus}'.`);
      return;
    }

    const updated = opportunities.map((opp) => {
      if (opp.id === selectedOppForTransition.id) {
        return {
          ...opp,
          status: newStatus,
          updatedAt: new Date().toISOString().split('T')[0],
          lastReviewedAt: new Date().toISOString().split('T')[0],
        };
      }
      return opp;
    });

    setOpportunities(updated);
    setSelectedOppForTransition(null);
    setTransitionMessage(null);
  };

  return (
    <div className="space-y-6 text-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Bloque 9 — Banco de Potencialidades</span>
            <span aria-hidden="true">·</span>
            <span>Nodo Capital (`delocalsoy_sj_capital`)</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">Épica #152 / PR #160</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Banco de Potencialidades y Oportunidades de Desarrollo Local
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Plataforma comunitaria de activación económica: mapea capacidades humanas, activos ociosos, vacíos de mercado y alianzas estratégicas bajo la regla de consentimiento previo y trazabilidad sin inferencias forzadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            + Postular Oportunidad Comunitaria
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Total Oportunidades</div>
          <div className="text-xl font-bold text-white font-mono tabular-nums mt-0.5">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">10 tipos canónicos</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Validadas / Concretadas</div>
          <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5">{validatedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Con evidencia corroborada</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Activas en Desarrollo</div>
          <div className="text-xl font-bold text-amber-300 font-mono tabular-nums mt-0.5">{activeCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Vinculadas a actores locales</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Demandas y Brechas</div>
          <div className="text-xl font-bold text-sky-400 font-mono tabular-nums mt-0.5">{marketGapsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Señales de inversión comunitaria</div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor={searchInputId} className="sr-only">Buscar por título, actor o palabra clave</label>
            <input
              id={searchInputId}
              type="text"
              placeholder="Buscar por título, actor, necesidad o palabra clave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div>
              <label htmlFor={subnodeFilterId} className="sr-only">Filtrar por subnodo territorial</label>
              <select
                id={subnodeFilterId}
                value={filterSubnode}
                onChange={(e) => setFilterSubnode(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-amber-400"
              >
                <option value="all">Todos los subnodos</option>
                <option value="sj_capital_centro">Subnodo Centro</option>
                <option value="sj_capital_desamparados">Subnodo Desamparados</option>
              </select>
            </div>

            <div>
              <label htmlFor={typeFilterId} className="sr-only">Filtrar por tipo de oportunidad</label>
              <select
                id={typeFilterId}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-amber-400"
              >
                <option value="all">Todos los tipos (10)</option>
                {Object.entries(OPPORTUNITY_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={statusFilterId} className="sr-only">Filtrar por estado del ciclo de vida</label>
              <select
                id={statusFilterId}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-amber-400"
              >
                <option value="all">Todos los estados (10)</option>
                {Object.entries(OPPORTUNITY_STATUS_LABELS).map(([k, meta]) => (
                  <option key={k} value={k}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
            No se encontraron oportunidades con los filtros seleccionados.
          </div>
        ) : (
          filtered.map((opp) => {
            const statusInfo = OPPORTUNITY_STATUS_LABELS[opp.status] || {
              label: opp.status,
              color: 'text-slate-300',
            };
            const typeLabel = OPPORTUNITY_TYPE_LABELS[opp.type] || opp.type;

            return (
              <div
                key={opp.id}
                className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-amber-400">{typeLabel}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-400 font-mono text-[11px]">{opp.id}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">{opp.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOppForTransition(opp);
                        setTransitionMessage(null);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/60"
                    >
                      Transición de Estado ({opp.status})
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{opp.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/40 p-3 rounded-lg border border-slate-800/40">
                  <div>
                    <span className="text-slate-400 font-medium">Contexto Territorial:</span>
                    <div className="text-slate-300 mt-0.5">
                      {opp.territorialContext.subnodeId === 'sj_capital_centro' ? 'San Juan Centro' : 'Desamparados'}
                      {opp.territorialContext.corridorId ? ` · Eje ${opp.territorialContext.corridorId.replace('axis_', '')}` : ''}
                      {opp.territorialContext.serviceAreaName ? ` · ${opp.territorialContext.serviceAreaName}` : ''}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Actores con Consentimiento:</span>
                    <ul className="text-slate-300 mt-0.5 space-y-0.5">
                      {opp.actors.map((actor, idx) => (
                        <li key={idx}>
                          {actor.name} <span className="text-slate-400">({actor.role})</span>
                          {actor.consentConfirmed ? (
                            <span className="text-emerald-400 ml-1.5 text-[11px]">✓ Consentido</span>
                          ) : (
                            <span className="text-rose-400 ml-1.5 text-[11px]">⚠ Sin consentimiento</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 text-xs text-slate-400 pt-1">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-medium">Evidencia Trazable:</span>
                    <div className="text-slate-400">
                      {opp.evidence.map((ev, i) => (
                        <span key={i}>
                          [{ev.evidenceType}] {ev.description} ({ev.capturedAt} · {ev.validationStatus})
                        </span>
                      ))}
                    </div>
                  </div>

                  {opp.impactHypothesis && (
                    <div className="sm:text-right max-w-sm space-y-1">
                      <span className="text-slate-400 font-medium">Hipótesis de Impacto:</span>
                      <div className="text-slate-300 italic">{opp.impactHypothesis}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Postular Nueva Oportunidad Comunitaria</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {validationErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs space-y-1">
                <span className="font-semibold">Errores de validación según contratos:</span>
                <ul className="list-disc list-inside">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={modalTypeId} className="block text-slate-300 font-medium mb-1">Tipo de Potencialidad (10)</label>
                  <select
                    id={modalTypeId}
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as OpportunityType)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    {Object.entries(OPPORTUNITY_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={modalSubnodeId} className="block text-slate-300 font-medium mb-1">Subnodo Territorial</label>
                  <select
                    id={modalSubnodeId}
                    value={newSubnode}
                    onChange={(e) => setNewSubnode(e.target.value as 'sj_capital_centro' | 'sj_capital_desamparados')}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="sj_capital_centro">San Juan Centro (Microcentro / Cívico)</option>
                    <option value="sj_capital_desamparados">Desamparados (Puyuta / UNSJ / El Palomar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={modalCorridorId} className="block text-slate-300 font-medium mb-1">Corredor o Eje de Referencia</label>
                <select
                  id={modalCorridorId}
                  value={newCorridor}
                  onChange={(e) => setNewCorridor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="axis_ignacio_de_la_roza">Avenida Ignacio de la Roza (Central)</option>
                  <option value="axis_25_de_mayo">Calle 25 de Mayo (El Palomar / Oeste)</option>
                  <option value="axis_libertador_west">Avenida Libertador San Martín Oeste</option>
                  <option value="axis_nuche">Boulevard Víctor Nuche</option>
                  <option value="axis_paula_albarracin">Avenida Paula Albarracín de Sarmiento</option>
                </select>
              </div>

              <div>
                <label htmlFor={modalTitleId} className="block text-slate-300 font-medium mb-1">Título de la Oportunidad / Necesidad</label>
                <input
                  id={modalTitleId}
                  type="text"
                  required
                  placeholder="Ej: Taller cooperativo de calzado en Desamparados"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label htmlFor={modalDescId} className="block text-slate-300 font-medium mb-1">Descripción Detallada</label>
                <textarea
                  id={modalDescId}
                  required
                  rows={3}
                  placeholder="Detalla la capacidad, el espacio disponible o la necesidad no resuelta..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label htmlFor={modalImpactId} className="block text-slate-300 font-medium mb-1">Hipótesis de Impacto Socio-Territorial</label>
                <input
                  id={modalImpactId}
                  type="text"
                  placeholder="Ej: Beneficiará a 50 familias del barrio y articulará con comercios cercanos"
                  value={newImpactHypothesis}
                  onChange={(e) => setNewImpactHypothesis(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label htmlFor={modalActorId} className="block text-slate-300 font-medium mb-1">Nombre del Actor Proponente</label>
                  <input
                    id={modalActorId}
                    type="text"
                    required
                    placeholder="Ej: Unión Vecinal / Cooperativa / Docente"
                    value={newActorName}
                    onChange={(e) => setNewActorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      id={modalConsentId}
                      type="checkbox"
                      checked={newActorConsent}
                      onChange={(e) => setNewActorConsent(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500"
                    />
                    <label htmlFor={modalConsentId} className="text-[11px] text-slate-400">
                      Cuenta con consentimiento explícito del actor registrado
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor={modalEvidenceId} className="block text-slate-300 font-medium mb-1">Evidencia Inicial Comprobable</label>
                  <input
                    id={modalEvidenceId}
                    type="text"
                    required
                    placeholder="Ej: Relevo vecinal, asamblea o relevamiento fotográfico"
                    value={newEvidenceDesc}
                    onChange={(e) => setNewEvidenceDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg"
                >
                  Registrar en el Banco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedOppForTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono text-slate-400">Transición Sellada de Estado</span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedOppForTransition.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOppForTransition(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Estado actual:</span>
                <span className="font-semibold text-amber-400 uppercase font-mono">{selectedOppForTransition.status}</span>
              </div>
              <div className="text-slate-400">
                Estados legalmente alcanzables según la matriz de transiciones del Bloque 9:
              </div>
            </div>

            {transitionMessage && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs">
                {transitionMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              {(ALLOWED_OPPORTUNITY_TRANSITIONS[selectedOppForTransition.status] || []).map((targetStatus: OpportunityStatus) => {
                const info = OPPORTUNITY_STATUS_LABELS[targetStatus];
                return (
                  <button
                    key={targetStatus}
                    type="button"
                    onClick={() => handleTransition(targetStatus)}
                    className="p-3 text-left rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors"
                  >
                    <div className="font-bold text-xs text-white">Avanzar a {info.label}</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">estado: {targetStatus}</div>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              * Cumple con la regla R9/R15: cualquier cambio de estado requiere registro en auditoría y evidencia respaldatoria antes de su publicación definitiva.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
