#!/usr/bin/env node
/**
 * DELocalSoy.AR — PR-1 /lab (refactor lab-move) — transform determinista e idempotente.
 *
 * 1) Extrae la marca (COLORS + DelocalSoyNetworkLogoSvg + DelocalSoyWordmark) verbatim
 *    de components/BaseConsolidadaPrototype.tsx → lib/DelocalSoyBrand.tsx (PRODUCTO).
 * 2) TopBarHeader (producto): pasa a importar la marca desde ../lib/DelocalSoyBrand.
 * 3) App.tsx: 22 imports estáticos de laboratorio → React.lazy + <Suspense fallback={null}>.
 *
 * Todo reemplazo lleva assert de unicidad: si el árbol de main no calza exactamente,
 * aborta con diagnóstico SIN tocar git (el gate R15 exige verificación real).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const WEB = 'apps/web/src';
const fail = (msg) => {
  console.error('TRANSFORM FAIL: ' + msg);
  process.exit(1);
};
const assertOne = (hay, needle, what) => {
  const n = hay.split(needle).length - 1;
  if (n !== 1) fail('esperaba 1 ocurrencia de [' + what + '], encontre ' + n);
};

// ── Escáner balanceado: strings, comentarios y bloques anidados (JSX incluido) ──
const balance = (src, i) => {
  let depth = 0;
  let j = i;
  while (j < src.length) {
    const c = src[j];
    if (c === "'" || c === '"' || c === '`') { j = skipString(src, j); continue; }
    if (c === '/' && src[j + 1] === '/') { const n = src.indexOf('\n', j); j = n < 0 ? src.length : n; continue; }
    if (c === '/' && src[j + 1] === '*') { const n = src.indexOf('*/', j); j = n < 0 ? src.length : n + 2; continue; }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') { depth--; if (depth === 0) return j; }
    j++;
  }
  return fail('bloque sin cerrar desde la posicion ' + i);
};
const skipString = (src, i) => {
  const q = src[i];
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue; }
    if (q === '`' && src[j] === '$' && src[j + 1] === '{') { j = balance(src, j + 1) + 1; continue; }
    if (src[j] === q) return j + 1;
    j++;
  }
  return fail('string sin cerrar desde la posicion ' + i);
};

// ── 1. Marca → lib/DelocalSoyBrand.tsx ──────────────────────────────────────
const proto = readFileSync(WEB + '/components/BaseConsolidadaPrototype.tsx', 'utf8');
const mColors = proto.match(/(?:export )?const COLORS = \{[\s\S]*?\} as const;/);
if (!mColors) fail('no encontre COLORS en components/BaseConsolidadaPrototype.tsx');

const grab = (name) => {
  const sm = proto.match(new RegExp('(^|\\n)export function ' + name + '\\('));
  if (!sm) fail('no encontre export function ' + name + ' en BaseConsolidadaPrototype');
  const startIdx = sm.index + (sm[1] === '\n' ? 1 : 0);
  const openParen = sm.index + sm[0].length - 1;
  const closeParen = balance(proto, openParen); // cierre de la firma
  let k = closeParen + 1;
  while (proto[k] !== '{') {
    k++;
    if (k > closeParen + 400) fail('no encontre el cuerpo de ' + name);
  }
  const end = balance(proto, k); // cierre del cuerpo de la funcion
  const fn = proto.slice(startIdx, end + 1);
  if (!fn.startsWith('export function ' + name))
    fail('extraccion de ' + name + ' no empieza en export');
  return fn;
};

const logo = grab('DelocalSoyNetworkLogoSvg');
const wordmark = grab('DelocalSoyWordmark');
let colorsDecl = mColors[0];
if (!colorsDecl.startsWith('export ')) colorsDecl = 'export ' + colorsDecl;
const brandBody = colorsDecl + '\n\n' + logo + '\n\n' + wordmark + '\n';
const reactImports = [];
if (/\bReact\./.test(brandBody)) reactImports.push("import React from 'react';");
if (/CSSProperties/.test(brandBody)) reactImports.push("import type { CSSProperties } from 'react';");
const brand =
  '/**\n' +
  " * DELocalSoy.AR — Marca (isologo + wordmark) — módulo de PRODUCTO.\n" +
  ' *\n' +
  ' * Extracción 1:1 (refactor /lab, PR-1) desde components/BaseConsolidadaPrototype.tsx:\n' +
  ' * COLORS, DelocalSoyNetworkLogoSvg y DelocalSoyWordmark son verbatim; solo mudan de\n' +
  ' * módulo para que TopBarHeader (producto) no importe el archivo lab de ~177 KB.\n' +
  ' */\n' +
  (reactImports.length ? reactImports.join('\n') + '\n\n' : '') +
  brandBody;
writeFileSync(WEB + '/lib/DelocalSoyBrand.tsx', brand);
console.log('OK: lib/DelocalSoyBrand.tsx generado (' + brand.length + ' bytes, logo=' + logo.length + ', wordmark=' + wordmark.length + ')');

// ── 2. TopBarHeader → marca desde ../lib/DelocalSoyBrand ─────────────────────
const tbPath = WEB + '/components/TopBarHeader.tsx';
let tb = readFileSync(tbPath, 'utf8');
const tbRe = /import \{\s*DelocalSoyNetworkLogoSvg,\s*DelocalSoyWordmark,\s*\} from '\.\/BaseConsolidadaPrototype';/;
if (!tbRe.test(tb)) fail('no encontre el import de marca en TopBarHeader');
tb = tb.replace(tbRe, "import { DelocalSoyNetworkLogoSvg, DelocalSoyWordmark } from '../lib/DelocalSoyBrand';");
writeFileSync(tbPath, tb);
console.log('OK: TopBarHeader importa la marca desde ../lib/DelocalSoyBrand');

// ── 3. App.tsx: 22 imports lab → lazy + Suspense ────────────────────────────
const appPath = WEB + '/App.tsx';
let app = readFileSync(appPath, 'utf8');

const reactOld = "import { type FormEvent, useCallback, useEffect, useState } from 'react';";
assertOne(app, reactOld, 'import de react');
app = app.replace(
  reactOld,
  "import { type FormEvent, lazy, Suspense, useCallback, useEffect, useState } from 'react';",
);

// [nombre del módulo, tipos que exporta y consume App]
const LAB = [
  ['BaseConsolidadaPrototype', []],
  ['CognitiveLensSelector', ['DesignLensKey']],
  ['DemoDataSourceAuditSection', []],
  ['DesignStudioHeader', []],
  ['EthicalAiCopilotPanel', []],
  ['HeuristicsAwardMatrix', []],
  ['HorizonOneArchitecturePanel', []],
  ['HorizonThreeObservatoryPanel', []],
  ['HorizonTwoSpatialFederationPanel', []],
  ['HorizonFourFieldAndTelemetryPanel', []],
  ['InspectionStationsConsole', []],
  ['LensOneAtlasWorkbench', ['CockpitMacroView']],
  ['LensTwoVerticalFlowWorkbench', []],
  ['LensThreeSovereigntyWorkbench', []],
  ['LensFourEpistemicContractsWorkbench', []],
  ['MasterRegistrySection', []],
  ['OperationalOriginStrip', []],
  ['QuarterlyTrendsSection', []],
  ['RecursiveDesignChainSection', []],
  ['RecursiveProspectiveContractPanel', []],
  ['TokenEvolutionStrip', []],
  ['VibeAgentExportHandoffCenter', []],
];

const lazyDecls = [];
const typeImports = [];
for (const [name, types] of LAB) {
  const lineRe = new RegExp("^import \\{([^}]*)\\} from '\\./components/" + name + "';$");
  const lines = app.split('\n');
  const idx = lines.findIndex((l) => lineRe.test(l));
  if (idx < 0) fail('no encontre el import estatico de ' + name + ' en App.tsx');
  const spec = lines[idx].match(lineRe)[1];
  const values = spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.startsWith('type '));
  if (values.length !== 1 || values[0] !== name)
    fail('export inesperado en ' + name + ': ' + JSON.stringify(values));
  for (const t of types) {
    if (!spec.includes('type ' + t))
      fail('esperaba type ' + t + ' en el import de ' + name);
    typeImports.push("import type { " + t + " } from './lab/" + name + "';");
  }
  lines.splice(idx, 1);
  app = lines.join('\n');
  lazyDecls.push(
    'const ' + name + ' = lazy(() =>\n' +
    "  import('./lab/" + name + "').then((m) => ({\n" +
    '    default: m.' + name + ',\n' +
    '  })),\n' +
    ');',
  );
}
if (typeImports.length !== 2) fail('esperaba 2 type imports, obtuve ' + typeImports.length);
if (lazyDecls.length !== 22) fail('esperaba 22 lazy, obtuve ' + lazyDecls.length);

const anchor = "} from './data/federatedModel';";
assertOne(app, anchor, 'ancla de imports (federatedModel)');
const block =
  '\n' +
  typeImports.join('\n') +
  '\n\n' +
  '// Refactor /lab (PR-1): los 22 modulos de laboratorio cargan por demanda via\n' +
  '// React.lazy — el chunk inicial del ciudadano deja de arrastrar ~800 KB de lab.\n' +
  lazyDecls.join('\n\n') +
  '\n';
app = app.replace(anchor, anchor + block);

const retOld = '  return (\n    <>';
assertOne(app, retOld, 'return con fragment raiz');
app = app.replace(retOld, '  return (\n    <Suspense fallback={null}>');
const endOld = '    </>\n  );';
assertOne(app, endOld, 'cierre del fragment raiz');
app = app.replace(endOld, '    </Suspense>\n  );');

// Sanity final: ningun import estatico residual hacia los 22
for (const [name] of LAB) {
  if (app.includes("'./components/" + name + "'"))
    fail('import residual hacia ./components/' + name);
}
writeFileSync(appPath, app);
console.log('OK: App.tsx transformado (' + app.length + ' bytes, 22 lazy + Suspense)');
console.log('TRANSFORM OK');
