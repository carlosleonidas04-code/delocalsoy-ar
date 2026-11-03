/**
 * Banner de cuota agotada de Google Maps Platform. Extraído 1:1 desde App.tsx
 * (FE-DEUDA-02 #293, corte 23): JSX verbatim, componente estático sin props.
 * App retiene la condición de montaje (`gmpQuotaExceeded`).
 */
export function GmpQuotaBanner() {
  return (
    <div className="quota-banner">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  );
}
