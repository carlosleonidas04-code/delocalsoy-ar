/**
 * DEPRECATED — shim de compatibilidad (R4/R12, renombre acreditado).
 * El nombre real del árbol de staging es `lib/apiClient.ts`, acreditado por el
 * import de RecursiveProspectiveContractPanel (M26). Este archivo re-exporta
 * todo el contrato público del cliente para no romper consumidores del nombre
 * inferido original (PR #116).
 */
export * from './apiClient';
