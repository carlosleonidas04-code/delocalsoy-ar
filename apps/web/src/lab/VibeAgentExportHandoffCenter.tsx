/**
 * DELocalSoy.AR — Centro de Exportación y Handoff hacia [agent: vibe]
 * (ADR-034 · R12 · R15) — FE-DEUDA-02 #293 (corte 12 de desmonolitización
 * de App.tsx).
 *
 * Extraído 1:1 de App.tsx (refactor puro, sin cambio de comportamiento):
 * bundle de handoff SHA-256 (v7.7), prompt de coordinación, descarga JSON y
 * rutas de aterrizaje ADR-034. El estado del bundle (vibeHandoffBundle,
 * vibeHandoffCopied), el handler de exportación y su efecto de montaje migran
 * con el componente (solo se consumían aquí); la recarga del modelo federado
 * sigue en App y se acopla por props.
 */
import { useCallback, useEffect, useState } from 'react';

export interface VibeAgentExportHandoffCenterProps {
  onReloadFederatedModel: () => Promise<void>;
}

export function VibeAgentExportHandoffCenter({
  onReloadFederatedModel,
}: VibeAgentExportHandoffCenterProps) {
  const [vibeHandoffBundle, setVibeHandoffBundle] = useState<{
    handoffHash: string;
    exportedAt: string;
    targetBranch?: string;
    epistemicState: string;
    artifacts: Array<{
      index?: number;
      path: string;
      lang?: string;
      mode: string;
      sha256: string;
      fullSha256?: string;
      linesCount?: number;
      bytesCount?: number;
      content?: string;
      summary: string;
    }>;
    markdownBrief: string;
    message: string;
  } | null>(null);
  const [vibeHandoffCopied, setVibeHandoffCopied] = useState<string>('none');

  const handleExportToVibeAgent = useCallback(async () => {
    try {
      const res = await fetch('/api/github-mcp/export-vibe-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          handoffHash: string;
          exportedAt: string;
          targetBranch?: string;
          epistemicState: string;
          artifacts: Array<{
            index?: number;
            path: string;
            lang?: string;
            mode: string;
            sha256: string;
            fullSha256?: string;
            linesCount?: number;
            bytesCount?: number;
            content?: string;
            summary: string;
          }>;
          markdownBrief: string;
          message: string;
        };
        setVibeHandoffBundle(data);
      }
    } catch {
      // Mantiene estado local si la red está ocupada
    }
  }, []);

  useEffect(() => {
    void handleExportToVibeAgent();
  }, [handleExportToVibeAgent]);

  return (
    <div
      id="vibe-agent-export-handoff-center"
      data-testid="vibe-agent-export-handoff-center"
      className="coco-baba-triage-box"
      style={{
        marginTop: '0.85rem',
        marginBottom: '0.85rem',
        borderColor: 'var(--color-accent-primary)',
      }}
    >
      <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
        <div>
          <span className="kicker-text">
            Exportación Oficial `[agent: google]` → `[agent: vibe]` · `ADR-034` (`#109` / `#114`) · Auditoría Cruzada `R12` y Regla `R15`
          </span>
          <strong style={{ display: 'block', fontSize: '1.02rem' }}>
            📦 Paquete Consolidado: 5 Estaciones de Inspección + 4 Lentes Operativas en Vivo + Compuerta Pre-`C5` (19 Modelos Prisma)
          </strong>
        </div>
        <div className="filter-group">
          <span className="r5-state-badge r5-state-verificado tabular-nums">
            Sello Handoff SHA-256: {vibeHandoffBundle?.handoffHash ?? 'verificando…'}
          </span>
          <button
            type="button"
            className="btn-confirm"
            onClick={async () => {
              await handleExportToVibeAgent();
              await onReloadFederatedModel();
            }}
          >
            ⚡ Sellar y Actualizar Paquete en `events_raw`
          </button>
          <button
            type="button"
            className="btn-toggle"
            onClick={() => {
              const promptText = `### 📦 Handoff Oficial [agent: google] → [agent: vibe] (Refs #109, Refs #114, ADR-034 · Sello SHA-256: ${vibeHandoffBundle?.handoffHash ?? 'verificado-staging'})

Hola \`agent-vibe\`, desde \`[agent: google]\` junto a la Dirección Humana (\`Carlos Leonidas <carlosleonidas04@gmail.com>\`) exportamos el desarrollo consolidado y compilado en \`EXIT 0\` sobre el lienzo **Pizarra Andina (\`#0B111E\`)**:

1. **Estación 01 & Tokens ADR-034 (\`apps/web/src/design/tokens.css\`):** Paleta 60-30-10 Pizarra Andina (\`#0B111E\`) / Piedra Caliza (\`#F7F5F0\`), tipografía 2+1 (\`Fraunces\`, \`Plus Jakarta Sans\`, \`JetBrains Mono tabular-nums\`), 3 nodos de San Juan (\`Capital [Centro y Desamparados]\`, \`Caucete\`, \`Iglesia\`) y 5 estados \`R5-UI\` (\`#109\`).
2. **Estaciones 02–05 & 4 Lentes Operativas con Puente Territorial 1:1 (\`apps/web/src/App.tsx\` + \`apps/web/src/styles.css\`):**
   - **Lente I (\`#lens-01-atlas-coco-baba-workbench\`):** Atlas San Juan + Cockpit «Coco-Baba» (4 vistas rescatadas del Demo Base + custodia tripartita + dualidad \`(x,y)\` ↔ \`PostGIS SRID=4326\`).
   - **Lente II (\`#lens-02-vertical-r5ui-workbench\`):** Flujo Vertical 13 módulos + 11 eslabones (\`Fase 0 #87\`), máquina de 5 estados \`R5-UI\` y 4 orígenes \`IDataSource\` (\`Regla R5\`).
   - **Lente III (\`#lens-03-sovereignty-fcm-workbench\`):** Soberanía Federal (\`EV-014\`), alertas Push FCM / Firestore a custodios \`Ed25519\` y Horizontes \`H2–H4\` (\`ST_Intersects\`, Merkle \`SHA-256\` \`EV-012\`, cola Offline-First \`EV-016\`).
   - **Lente IV (\`#lens-04-epistemic-contracts-workbench\`):** Compuerta Pre-\`C5\` de 19 modelos Prisma, suite \`C1–C5\`, estado \`R15\`, Copiloto IA Tripartito (\`requiresHumanReview: true\`) y \`events_raw\` (\`EV-001..018\`).
3. **Validador de Integridad Referencial Prisma Pre-\`C5\` (\`POST /api/contracts/validate-prisma-referential-integrity\`):** Verifica los **19 modelos Prisma** y las **7 aristas FK (\`@relation\`)** con **0 registros huérfanos** antes de habilitar el contrato \`C5\` (\`c5GateUnlocked: true\`).
4. **Especificación completa en repo:** \`docs/EXPORTACION_HANDOFF_AGENTE_VIBE_5_ESTACIONES_4_LENTES.md\`.

Co-authored-by: Carlos Leonidas <carlosleonidas04@gmail.com>`;
              if (navigator.clipboard) {
                void navigator.clipboard.writeText(promptText);
                setVibeHandoffCopied('prompt');
                setTimeout(() => setVibeHandoffCopied('none'), 3500);
              }
            }}
          >
            {vibeHandoffCopied === 'prompt'
              ? '✓ Prompt para Agente Vibe Copiado'
              : '📋 Copiar Prompt para [agent: vibe]'}
          </button>
          <button
            type="button"
            className="btn-toggle"
            onClick={() => {
              const payload = JSON.stringify(
                vibeHandoffBundle ?? {
                  sourceAgent: '[agent: google]',
                  targetAgent: '[agent: vibe]',
                  epistemicState: 'verificado-staging',
                },
                null,
                2,
              );
              const blob = new Blob([payload], {
                type: 'application/json;charset=utf-8',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'handoff-agent-google-to-agent-vibe-v7.7.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            ⬇️ Descargar Bundle JSON (`v7.7`)
          </button>
        </div>
      </div>

      {vibeHandoffBundle?.message && (
        <div
          className="r5-state-badge r5-state-verificado tabular-nums"
          style={{
            display: 'block',
            padding: '0.45rem 0.65rem',
            marginBottom: '0.65rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.73rem',
          }}
        >
          ✓ {vibeHandoffBundle.message}
        </div>
      )}

      <div className="coco-baba-triage-grid">
        {/* Columna 1: Los 6 Archivos Completos solicitados por [agent: vibe] (Copia 1-clic & Descarga) */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            1. Los 6 Archivos Íntegros para `Opción B — Integración Full-Stack` (`main @ 2766feb` → `agent-google/estaciones-01-05-lentes-01-04`)
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              marginTop: '0.35rem',
            }}
          >
            {(vibeHandoffBundle?.artifacts ?? []).map((art, idx) => {
              const fileNum = art.index ?? idx + 1;
              const copyKey = `file-${fileNum}`;
              return (
                <div
                  key={art.path}
                  className="tabular-nums"
                  style={{
                    padding: '0.42rem 0.58rem',
                    borderRadius: 'var(--radius-xs, 4px)',
                    background: 'var(--color-bg-inset)',
                    border: '1px solid var(--color-border-hairline)',
                    fontSize: '0.72rem',
                  }}
                >
                  <div className="event-row-top">
                    <strong>
                      #{fileNum} · <code>{art.path}</code>
                    </strong>
                    <span className="r5-state-badge r5-state-publicado">
                      {art.linesCount ?? '—'} líneas · SHA {art.sha256}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: '0.15rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.7rem',
                    }}
                  >
                    {art.summary}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                      marginTop: '0.32rem',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-confirm"
                      style={{ fontSize: '0.7rem', padding: '0.24rem 0.52rem' }}
                      onClick={async () => {
                        let rawContent = art.content ?? '';
                        if (!rawContent) {
                          const res = await fetch(
                            `/api/github-mcp/export-vibe-handoff?file=${fileNum}`,
                          );
                          if (res.ok) rawContent = await res.text();
                        }
                        const formatted = `### Archivo #${fileNum}: \`${art.path}\` (${art.linesCount ?? rawContent.split('\n').length} líneas · SHA-256: \`${art.sha256}\`)\n\n\`\`\`${art.lang ?? 'ts'}\n${rawContent}\n\`\`\``;
                        if (navigator.clipboard) {
                          await navigator.clipboard.writeText(formatted);
                          setVibeHandoffCopied(copyKey);
                          setTimeout(() => setVibeHandoffCopied('none'), 3500);
                        }
                      }}
                    >
                      {vibeHandoffCopied === copyKey
                        ? `✓ Archivo #${fileNum} Copiado Íntegro`
                        : `📋 Copiar #${fileNum} Íntegro para [agent: vibe]`}
                    </button>
                    <button
                      type="button"
                      className="btn-toggle"
                      style={{ fontSize: '0.7rem', padding: '0.24rem 0.52rem' }}
                      onClick={async () => {
                        let rawContent = art.content ?? '';
                        if (!rawContent) {
                          const res = await fetch(
                            `/api/github-mcp/export-vibe-handoff?file=${fileNum}`,
                          );
                          if (res.ok) rawContent = await res.text();
                        }
                        const blob = new Blob([rawContent], {
                          type: 'text/plain;charset=utf-8',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = art.path.split('/').pop() ?? `file-${fileNum}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                    >
                      ⬇️ Descargar #{fileNum}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna 2: Dos Rutas de Aterrizaje para [agent: vibe] según ADR-034 */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            2. Dos Rutas de Integración en `main` para `[agent: vibe]` (`ADR-034 §4.5` vs `Modo Coordinado R12`)
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.42rem',
              marginTop: '0.35rem',
              fontSize: '0.73rem',
            }}
          >
            <div
              style={{
                padding: '0.45rem 0.6rem',
                borderRadius: 'var(--radius-xs, 4px)',
                background: 'var(--color-bg-inset)',
                border: '1px solid var(--color-border-hairline)',
              }}
            >
              <div className="event-row-top">
                <strong>Opción A · PR Solo-Estética (`ADR-034 §4.5`)</strong>
                <span className="r5-state-badge r5-state-verificado">
                  0 Conflictos con PR #115
                </span>
              </div>
              <p className="territory-meta" style={{ margin: '0.2rem 0 0' }}>
                Extrae únicamente <code>apps/web/src/design/tokens.css</code> hacia{' '}
                <code>main @ 1272e45</code> con Pizarra Andina (<code>#0B111E</code>), los 3
                nodos de San Juan y los 5 estados <code>R5-UI</code>.
              </p>
            </div>

            <div
              style={{
                padding: '0.45rem 0.6rem',
                borderRadius: 'var(--radius-xs, 4px)',
                background: 'var(--color-bg-inset)',
                border: '1px solid var(--color-border-hairline)',
              }}
            >
              <div className="event-row-top">
                <strong>Opción B · Integración Full-Stack (`R12`)</strong>
                <span className="r5-state-badge r5-state-publicado">
                  4 Lentes + Pre-C5 Prisma
                </span>
              </div>
              <p className="territory-meta" style={{ margin: '0.2rem 0 0' }}>
                Incorpora las <strong>4 Lentes Operativas (`#lens-01..04`)</strong>, las{' '}
                <strong>5 Estaciones</strong> y el endpoint{' '}
                <code>POST /api/contracts/validate-prisma-referential-integrity</code> (19
                modelos Prisma + 7 aristas FK sin huérfanos antes de <code>C5</code>).
              </p>
            </div>

            <pre
              className="demo-contract-json-pre"
              style={{
                margin: 0,
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
              }}
            >
{`# Comandos para [agent: vibe] en Codespace / GitHub
git fetch origin
# Opción A (ADR-034 §4.5 solo-estética):
git checkout main && git checkout -b feat/adr034-tokens-pizarra-andina
# Opción B (4 Lentes + Validador Pre-C5 19 modelos Prisma):
pnpm run build && npm test`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
