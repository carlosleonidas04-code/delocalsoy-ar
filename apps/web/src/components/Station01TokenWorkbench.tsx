/**
 * DELocalSoy.AR — Laboratorio Detallado en Vivo de la Estación 01 del Estudio
 * de Diseño Heurístico: Contrato Visual tokens.css & Pariedad 60-30-10
 * (ADR-034 §4.5) — FE-DEUDA-02 #293 (corte 14 de desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento):
 * el workbench de tokens con Muestrario Tipográfico 2+1, MODO «Solo Texto»,
 * MODO «Declarativo», matrices de Superficies y Acentos por tema claro/oscuro,
 * y el mapa del Contraste WCAG AA/AAA. Acoples por props: themeMode (App),
 * selectedNodeKey (App, compartido con otros workbenches) y
 * onSelectNodeKey (conmutador de nodo del lienzo mineral).
 */
export interface Station01TokenWorkbenchProps {
  themeMode: 'light' | 'dark' | 'auto';
  selectedNodeKey: string;
  onSelectNodeKey: (nodeKey: string) => void;
}

export function Station01TokenWorkbench({
  themeMode,
  selectedNodeKey,
  onSelectNodeKey,
}: Station01TokenWorkbenchProps) {
  return (
    <div
      data-testid="station-01-token-workbench"
      style={{
        marginTop: '0.85rem',
        paddingTop: '0.85rem',
        borderTop: '1px solid var(--color-border-hairline)',
      }}
    >
      <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
        <div>
          <span className="tiny-label">
            ESTACIÓN 01 EN DETALLE · AUDITORÍA VISUAL INTERACTIVA (ADR-034 §4.5 · MODO A)
          </span>
          <strong>
            Muestrario en Vivo de Superficies 60-30-10, 3 Nodos San Juan, 5 Estados R5-UI y Tipografía 2+1
          </strong>
        </div>
        <span className="territory-meta tabular-nums">
          Tema activo:{' '}
          <strong>
            {themeMode === 'dark'
              ? 'Pizarra Andina Nocturna (#0B111E)'
              : themeMode === 'light'
                ? 'Piedra Caliza Sanjuanina (#F7F5F0)'
                : 'Auto (Sistema)'}
          </strong>
        </span>
      </div>

      <div className="coco-baba-triage-grid">
        {/* 1. Distribución 60-30-10 y Contraste WCAG */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            A. Regla 60-30-10 y Contraste WCAG 2.1 AA/AAA
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              marginTop: '0.35rem',
            }}
          >
            <div
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--color-bg-canvas)',
                border: '1px solid var(--color-border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
              }}
            >
              <span>
                <strong>60% Lienzo</strong> (<code>--color-bg-canvas</code>)
              </span>
              <code className="tabular-nums">
                {themeMode === 'dark' ? '#0B111E · 15.8:1 AAA' : '#F7F5F0 · 16.2:1 AAA'}
              </code>
            </div>
            <div
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
              }}
            >
              <span>
                <strong>30% Estructura</strong> (<code>--color-bg-elevated</code>)
              </span>
              <code className="tabular-nums">
                {themeMode === 'dark' ? '#17233B · 1px hairline' : '#F2EDE2 · 1px hairline'}
              </code>
            </div>
            <div
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--color-accent-subtle)',
                border: '1px solid var(--color-border-accent)',
                color: 'var(--color-accent-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
              }}
            >
              <span>
                <strong>10% Acento Cívico</strong> (<code>--color-accent-primary</code>)
              </span>
              <code className="tabular-nums">
                {themeMode === 'dark' ? '#EA580C + #10B981' : '#C2410C + #1F6E50'}
              </code>
            </div>
          </div>
        </div>

        {/* 2. Identidad Mineral de los 3 Departamentos de San Juan + Estados R5-UI */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            B. Identidad Mineral San Juan (ADR-021) + Máquina R5-UI (#109)
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              marginTop: '0.35rem',
            }}
          >
            {(
              [
                {
                  key: 'capital',
                  label: 'Capital (Centro y Desamparados)',
                  token: '--node-capital-*',
                  ratio: '8.4:1 AAA',
                  className: 'token-node-tag-capital',
                },
                {
                  key: 'caucete',
                  label: 'Caucete (Valle de Tulúm y Pie de Palo)',
                  token: '--node-caucete-*',
                  ratio: '9.2:1 AAA',
                  className: 'token-node-tag-caucete',
                },
                {
                  key: 'iglesia',
                  label: 'Iglesia (Cordillera Andina)',
                  token: '--node-iglesia-*',
                  ratio: '9.6:1 AAA',
                  className: 'token-node-tag-iglesia',
                },
              ] as const
            ).map((nd) => (
              <button
                key={nd.key}
                type="button"
                onClick={() => onSelectNodeKey(nd.key)}
                style={{
                  textAlign: 'left',
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-sm, 6px)',
                  border:
                    selectedNodeKey === nd.key
                      ? '1px solid var(--color-accent-primary)'
                      : '1px solid var(--color-border-hairline)',
                  background: 'var(--color-bg-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span className={nd.className}>{nd.label}</span>
                <code className="tabular-nums" style={{ fontSize: '0.72rem' }}>
                  {nd.token} ({nd.ratio})
                </code>
              </button>
            ))}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.35rem',
                paddingTop: '0.25rem',
              }}
            >
              <span className="r5-state-badge r5-state-pendiente">
                pendiente (6.8:1)
              </span>
              <span className="r5-state-badge r5-state-en_revision">
                en_revision (8.4:1)
              </span>
              <span className="r5-state-badge r5-state-verificado">
                verificado (7.4:1)
              </span>
              <span className="r5-state-badge r5-state-publicado">
                publicado (9.6:1)
              </span>
              <span className="r5-state-badge r5-state-rechazado">
                rechazado (7.9:1)
              </span>
            </div>
          </div>
        </div>

        {/* 3. Espécimen Tipográfico 2+1 y Frontera Modo A (ADR-034 §4.5) */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            C. Regla Tipográfica 2+1 (H-TER-02) y Entrega Modo A (ADR-034 §4.5)
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.38rem',
              marginTop: '0.35rem',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.02rem',
                fontWeight: 600,
              }}
            >
              1. Fraunces Display — Autoridad Editorial Territorial
            </div>
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.84rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              2. Plus Jakarta Sans — Lectura densa de capas, custodios y matrices (65–75ch).
            </div>
            <div
              className="tabular-nums"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.76rem',
                padding: '0.35rem 0.5rem',
                borderRadius: 'var(--radius-xs, 4px)',
                background: 'var(--color-bg-inset)',
                border: '1px solid var(--color-border-hairline)',
              }}
            >
              3. JetBrains Mono (tabular-nums): SRID=4326 [-31.5375, -68.5364] · SHA-256 1272e45
            </div>
            <p className="territory-meta" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
              <strong>Garantía ADR-034 §4.5:</strong>{' '}
              <code>apps/web/src/design/tokens.css</code> es un artefacto 100% declarativo (cero cambios en contratos o backend), listo para PR de solo-estética hacia <code>main</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
