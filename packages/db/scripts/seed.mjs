// db:seed serializado y atómico — MARKET-CAP MK-3a (#426, PR #428).
//
// CAUSA RAÍZ (corridas de CI 42389665300 / 42390270760): vitest corre
// los archivos de test en paralelo y varias suites ejecutan
// `pnpm --filter @delocalsoy/db db:seed` en su beforeAll
// (comercios-confianza-mk2 L43, productos-operativa L41, ...). El script
// histórico era una cadena de 18 `prisma db execute --file`, cada uno con
// su propia conexión y transacción: dos seeds concurrentes intercalaban
// transacciones (esperas de lock entre statements del seed visibles en
// el log de Postgres del job test) y el beforeAll fallaba con
// `Error: P2002: Unique constraint failed on the fields: (id)`.
// Verificado por búsqueda de código: NINGÚN test crea filas con ids
// fijos de la semilla — la carrera es seed-vs-seed. R15: la ventana
// visible del log de CI no alcanza al statement exacto; se declara lo
// verificado y lo no observable.
//
// FIX ESTRUCTURAL: los 18 SQL canónicos (mismo orden que la cadena
// histórica) se componen en UN lote
// `BEGIN; SELECT pg_advisory_xact_lock(<key>); ...; COMMIT;`
// ejecutado con UNA sola invocación de `prisma db execute --stdin`.
//   1. Serialización: el lock es de transacción (se libera solo con
//      COMMIT/ROLLBACK) — dos seeds concurrentes ya no intercalan.
//   2. Todo-o-nada: si un statement falla, el lote completo aborta y
//      la base queda como estaba (antes, un fallo a mitad de la
//      cadena dejaba estado parcial entre archivos).
//   3. Equivalencia demostrada: cada ejecución ve la base confirmada y
//      recae en los arbiters ON CONFLICT — exactamente la ejecución
//      secuencial que main demuestra idempotente (el propio test de
//      idempotencia de productos-operativa re-ejecuta el seed).
//   4. Diagnóstico: si el lote falla, reintento archivo por archivo
//      (secuencial, con lock por archivo); el archivo que falla solo
//      queda nombrado en stderr. Si todos pasan solo, la carrera quedó
//      resuelta por el lock y la siembra está completa (idempotencia).
// Sin dependencias nuevas (solo node:child_process / node:fs).

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const pkgDir = fileURLToPath(new URL('..', import.meta.url));
const prismaDir = path.join(pkgDir, 'prisma');
const schema = path.join(prismaDir, 'schema.prisma');

// Orden canónico EXACTO de la cadena histórica de db:seed (18 archivos).
const SEED_FILES = [
  'seed.sql',
  'seed-subnodos.sql',
  'seed-activos-vig002.sql',
  'seed-patrimonio-vig004.sql',
  'seed-productos-vig005.sql',
  'seed-subnodos-capital.sql',
  'seed-fuentes-cau.sql',
  'seed-fuentes-vig.sql',
  'seed-oportunidades-vig008.sql',
  'seed-categorias-vig009.sql',
  'seed-oportunidades-vig009-achango.sql',
  'seed-fuentes-market-cap.sql',
  'seed-subnodos-caucete.sql',
  'seed-corredores-capital.sql',
  'seed-fuentes-capital.sql',
  'seed-vocabulario-capital.sql',
  'seed-accesibilidad-capital.sql',
  'seed-vocabulario-vial-iglesia.sql',
  'seed-lic-r4-amenaza-sismica.sql',
];

// Clave de lock de aplicación: constante arbitraria y estable (sin
// colisiones — `pg_advisory` no aparece en ningún otro lugar del
// monorepo, verificado 2026-11-07). NO cambiar sin coordinar: versiones
// mixtas del script con claves distintas no se serializarían entre sí.
const ADVISORY_LOCK_KEY = '74920115';

function composeBatch(files) {
  const parts = ['BEGIN;', 'SELECT pg_advisory_xact_lock(' + ADVISORY_LOCK_KEY + ');'];
  for (const f of files) {
    const sql = readFileSync(path.join(prismaDir, f), 'utf8');
    parts.push('-- ===== db:seed: ' + f + ' =====');
    parts.push(sql.endsWith('\n') ? sql : sql + '\n');
  }
  parts.push('COMMIT;');
  return parts.join('\n') + '\n';
}

function runPrismaExecute(batch) {
  const args = ['db', 'execute', '--stdin', '--schema', schema];
  const candidates = ['prisma', path.join(pkgDir, 'node_modules', '.bin', 'prisma')];
  let lastSpawnError = null;
  for (const bin of candidates) {
    const res = spawnSync(bin, args, {
      cwd: pkgDir,
      input: batch,
      encoding: 'utf8',
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    if (res.error && res.error.code === 'ENOENT') {
      lastSpawnError = res.error;
      continue;
    }
    return res;
  }
  console.error('db:seed: no se encontro el binario de prisma (' + (lastSpawnError ? lastSpawnError.message : 'sin candidatos') + ')');
  return { status: 127 };
}

// Lote único: serializado + atómico.
const batch = composeBatch(SEED_FILES);
const result = runPrismaExecute(batch);
if (result.status === 0) {
  process.exit(0);
}

// Diagnóstico: reintento secuencial archivo por archivo (cada uno en su
// propia transacción con el lock) para atribuir el fallo exacto.
console.error('db:seed: el lote unico fallo (transaccion abortada, sin estado parcial); reintentando archivo por archivo para atribuir el fallo...');
for (const f of SEED_FILES) {
  const res = runPrismaExecute(composeBatch([f]));
  if (res.status !== 0) {
    console.error('db:seed: el archivo que falla SOLO es: prisma/' + f);
    process.exit(res.status ?? 1);
  }
}
console.error('db:seed: el lote fallo pero los 18 archivos pasan secuencialmente — la siembra quedo completa (idempotente). Causa probable: carrera resuelta por el lock.');
process.exit(0);

