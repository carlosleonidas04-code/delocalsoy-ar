import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Territorio } from '../App';
import {
  QUARTERS,
  type EvidenciaRecord,
  type SpatialGeometryRecord,
  type TemporalQuarterSnapshot,
  type TerritorioFeature,
  type TerritorialReport,
} from '../data/federatedModel';

interface QuarterlyTrendsSectionProps {
  territorios: Territorio[];
  temporalSnapshots: TemporalQuarterSnapshot[];
  features: TerritorioFeature[];
  reports: TerritorialReport[];
  spatialGeometries: SpatialGeometryRecord[];
  evidencias: EvidenciaRecord[];
}

interface RegistrationTrendRow {
  quarter: string;
  label: string;
  registrosTotales: number;
  activosVerificados: number;
  problematicasAbiertas: number;
  problematicasResueltas: number;
  geometriasPostgis: number;
  paquetesInterNodos: number;
}

interface EvidenceTrendRow {
  quarter: string;
  hito: string;
  verificadasOk: number;
  pendientes: number;
  totalEvidencias: number;
  tasaVerificacion: number;
}

export function QuarterlyTrendsSection({
  territorios,
  temporalSnapshots,
  features,
  reports,
  spatialGeometries,
  evidencias,
}: QuarterlyTrendsSectionProps) {
  const [selectedNodeFilter, setSelectedNodeFilter] = useState<string>('todos');

  // 1. Serie trimestral de registros territoriales (2026-Q1 a 2026-Q4)
  const registrationTrendData = useMemo<RegistrationTrendRow[]>(() => {
    return QUARTERS.map((q) => {
      const matchingSnaps = temporalSnapshots.filter(
        (s) =>
          s.quarter === q &&
          (selectedNodeFilter === 'todos' || s.nodeKey === selectedNodeFilter),
      );

      let activosVerificados = matchingSnaps.reduce((acc, s) => acc + s.activeAssets, 0);
      let problematicasAbiertas = matchingSnaps.reduce((acc, s) => acc + s.openProblems, 0);
      let problematicasResueltas = matchingSnaps.reduce(
        (acc, s) => acc + s.resolvedProblems,
        0,
      );
      let geometriasPostgis = matchingSnaps.reduce(
        (acc, s) => acc + s.postgisGeometries,
        0,
      );
      const paquetesInterNodos = matchingSnaps.reduce(
        (acc, s) => acc + s.interNodePacksActive,
        0,
      );

      // En 2026-Q4 reflejamos también los reportes y geometrías creadas en vivo en la sesión
      if (q === '2026-Q4') {
        const liveReportsCount = reports.filter(
          (r) => selectedNodeFilter === 'todos' || r.nodeKey === selectedNodeFilter,
        ).length;
        const liveGeomsCount = spatialGeometries.filter(
          (g) => selectedNodeFilter === 'todos' || g.nodeKey === selectedNodeFilter,
        ).length;
        problematicasAbiertas += Math.max(0, liveReportsCount - 1);
        geometriasPostgis = Math.max(geometriasPostgis, liveGeomsCount);
      }

      const registrosTotales =
        activosVerificados +
        problematicasAbiertas +
        problematicasResueltas +
        geometriasPostgis;

      const labelMap: Record<string, string> = {
        '2026-Q1': '2026-Q1 · Línea Base',
        '2026-Q2': '2026-Q2 · Consolidación',
        '2026-Q3': '2026-Q3 · Articulación',
        '2026-Q4': '2026-Q4 · Estado Actual',
      };

      return {
        quarter: q,
        label: labelMap[q] ?? q,
        registrosTotales,
        activosVerificados,
        problematicasAbiertas,
        problematicasResueltas,
        geometriasPostgis,
        paquetesInterNodos,
      };
    });
  }, [temporalSnapshots, selectedNodeFilter, reports, spatialGeometries]);

  // 2. Serie trimestral de estado de verificación de evidencias ejecutables HITUB (2026-Q1 a 2026-Q4)
  const evidenceTrendData = useMemo<EvidenceTrendRow[]>(() => {
    const totalCurrent = evidencias.length || 18;
    const okCurrent = evidencias.filter((e) => e.status === 'ok').length;
    const pendingCurrent = Math.max(0, totalCurrent - okCurrent);

    return [
      {
        quarter: '2026-Q1',
        hito: 'CORE-001 + H1',
        verificadasOk: 4,
        pendientes: 2,
        totalEvidencias: 6,
        tasaVerificacion: 67,
      },
      {
        quarter: '2026-Q2',
        hito: 'Horizonte 2 (PostGIS)',
        verificadasOk: 7,
        pendientes: 3,
        totalEvidencias: 10,
        tasaVerificacion: 70,
      },
      {
        quarter: '2026-Q3',
        hito: 'Horizonte 3 (Linaje)',
        verificadasOk: 11,
        pendientes: 3,
        totalEvidencias: 14,
        tasaVerificacion: 79,
      },
      {
        quarter: '2026-Q4',
        hito: 'Horizonte 4 (Actual)',
        verificadasOk: okCurrent,
        pendientes: pendingCurrent,
        totalEvidencias: totalCurrent,
        tasaVerificacion:
          totalCurrent > 0 ? Math.round((okCurrent / totalCurrent) * 100) : 0,
      },
    ];
  }, [evidencias]);

  const q1Row = registrationTrendData[0];
  const q4Row = registrationTrendData[registrationTrendData.length - 1];
  const q4EvRow = evidenceTrendData[evidenceTrendData.length - 1];
  const growthDelta =
    q1Row && q4Row ? q4Row.registrosTotales - q1Row.registrosTotales : 0;

  return (
    <section id="tendencias-trimestrales" className="card" data-state="ok">
      <div className="section-header">
        <div>
          <span className="kicker-text">
            Analítica Temporal HITUB · Evolución 2026-Q1 a 2026-Q4
          </span>
          <h2>
            Tendencia de Registros Territoriales y Verificación de Evidencias por Trimestre
          </h2>
          <p className="section-caption">
            Seguimiento trimestral de activos, problemáticas (abiertas y resueltas), geometrías PostGIS y cierre de evidencias ejecutables (<code>EV-001</code> a <code>EV-018</code>).
          </p>
        </div>

        <div
          className="filter-group"
          role="group"
          aria-label="Filtrar tendencia por nodo territorial"
        >
          <button
            type="button"
            className={selectedNodeFilter === 'todos' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setSelectedNodeFilter('todos')}
          >
            Todos los nodos ({features.length} features)
          </button>
          {territorios.map((t) => (
            <button
              key={t.id}
              type="button"
              className={selectedNodeFilter === t.key ? 'btn-filter active' : 'btn-filter'}
              onClick={() => setSelectedNodeFilter(t.key)}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Grilla de dos gráficos Recharts lado a lado */}
      <div className="charts-two-col-grid">
        {/* Gráfico 1: Tendencia de Registros Territoriales (2026-Q1 a 2026-Q4) */}
        <div className="chart-panel">
          <div className="pane-header">
            <div>
              <span className="tiny-label">
                01. Registros Territoriales por Trimestre (2026-Q1 → 2026-Q4)
              </span>
              <strong>
                {selectedNodeFilter === 'todos'
                  ? 'Agregado Provincial San Juan (3 Departamentos: Capital Centro/Desamparados, Caucete, Iglesia)'
                  : `Departamento: ${territorios.find((t) => t.key === selectedNodeFilter)?.nombre ?? selectedNodeFilter}`}
              </strong>
            </div>
            <span className="territory-meta tabular-nums">
              Variación Q1→Q4: <strong>+{growthDelta} registros</strong>
            </span>
          </div>

          <div className="chart-container-box">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={registrationTrendData}
                margin={{ top: 16, right: 16, left: -10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis
                  dataKey="quarter"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(148, 163, 184, 0.35)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="registrosTotales"
                  name="Registros Totales"
                  fill="rgba(46, 158, 91, 0.16)"
                  stroke="#2e9e5b"
                  strokeWidth={2}
                />
                <Bar
                  dataKey="activosVerificados"
                  name="Activos Verificados"
                  fill="#2e9e5b"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="problematicasAbiertas"
                  name="Problemáticas Abiertas"
                  fill="#e0703a"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="problematicasResueltas"
                  name="Problemáticas Resueltas"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Line
                  type="monotone"
                  dataKey="geometriasPostgis"
                  name="Geometrías PostGIS (H2)"
                  stroke="#f5c842"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f5c842' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Estado de Verificación de Evidencias Ejecutables (2026-Q1 a 2026-Q4) */}
        <div className="chart-panel">
          <div className="pane-header">
            <div>
              <span className="tiny-label">
                02. Estado de Verificación de Evidencias HITUB (2026-Q1 → 2026-Q4)
              </span>
              <strong>Progresión CORE-001 + Horizontes 1, 2 y 3</strong>
            </div>
            <span className="territory-meta tabular-nums">
              Tasa Q4 actual: <strong>{q4EvRow?.tasaVerificacion ?? 0}% verificadas</strong>
            </span>
          </div>

          <div className="chart-container-box">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={evidenceTrendData}
                margin={{ top: 16, right: 16, left: -10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis
                  dataKey="quarter"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(148, 163, 184, 0.35)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '8px' }} />
                <Bar
                  dataKey="verificadasOk"
                  name="Evidencias Verificadas (OK)"
                  stackId="ev"
                  fill="#2e9e5b"
                  radius={[0, 0, 0, 0]}
                  barSize={34}
                />
                <Bar
                  dataKey="pendientes"
                  name="Evidencias Pendientes"
                  stackId="ev"
                  fill="#d99b26"
                  radius={[4, 4, 0, 0]}
                  barSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Resumen tabular de los 4 trimestres */}
      <div className="quarters-summary-strip tabular-nums">
        {registrationTrendData.map((row, idx) => {
          const evRow = evidenceTrendData[idx];
          return (
            <div key={row.quarter} className="quarter-summary-cell">
              <div className="quarter-cell-title">
                <strong>{row.quarter}</strong>
                <span className="territory-meta"> · {evRow?.hito}</span>
              </div>
              <div className="territory-meta">
                Registros: <strong>{row.registrosTotales}</strong> ({row.activosVerificados}{' '}
                activos · {row.problematicasResueltas} resueltas · {row.geometriasPostgis}{' '}
                PostGIS)
              </div>
              <div className="territory-meta">
                Evidencias:{' '}
                <strong style={{ color: '#2e9e5b' }}>
                  {evRow?.verificadasOk ?? 0} ok
                </strong>{' '}
                / {evRow?.pendientes ?? 0} pend. ({evRow?.tasaVerificacion ?? 0}%)
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
