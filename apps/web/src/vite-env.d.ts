/// <reference types="vite/client" />

// Añadido por [agent: vibe] (commit 6 del PR #119 — ajuste R4/R12 divulgado):
// TerritoriosMap.tsx (M17, línea 313) accede a `import.meta.env` y `tsc -b`
// reportaba TS2339 sobre ImportMeta.env al no existir esta referencia estándar
// del scaffold de Vite en el árbol. No proviene de ningún lote del staging.
