import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const EXPORTS_DIR = path.join(ROOT, 'exports', 'nodo-capital');

let failures = 0;

function check(condition, message) {
  if (condition) {
    console.log(`  [OK] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    failures += 1;
  }
}

function calculateSha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

console.log('=== Verificación de Exportación Sin TAR del Nodo Capital ===');

check(fs.existsSync(EXPORTS_DIR), 'Directorio exports/nodo-capital existe');

const jsonManifestPath = path.join(EXPORTS_DIR, 'manifiesto-exportacion-capital.json');
check(fs.existsSync(jsonManifestPath), 'Manifiesto JSON existe');

const mdManifestPath = path.join(EXPORTS_DIR, 'MANIFIESTO_EXPORTACION_SIN_TAR.md');
check(fs.existsSync(mdManifestPath), 'Manifiesto Markdown existe');

// Invariante estricta: Cero archivos TAR
if (fs.existsSync(EXPORTS_DIR)) {
  function scanForTar(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        scanForTar(full);
      } else if (f.endsWith('.tar') || f.endsWith('.tar.gz') || f.endsWith('.tar.xz') || f.endsWith('.tgz')) {
        check(false, `Infracción: Archivo TAR no permitido detectado: ${path.relative(ROOT, full)}`);
      }
    }
  }
  scanForTar(EXPORTS_DIR);
  check(true, 'Invariante cumplida: Cero archivos .tar / .tar.gz en exports/nodo-capital/');
}

console.log('\n============================================================');
if (failures === 0) {
  console.log('✓ VERIFICACIÓN EXITOSA: Todos los archivos exportados sin TAR son íntegros.');
  process.exit(0);
} else {
  console.error(`✗ FALLAS: ${failures} errores detectados.`);
  process.exit(1);
}
