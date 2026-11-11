import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Test de matriz de sellos (C5, #412 — mejora de la hoja de mantenimiento):
// la validación automática que docs/MATRIZ_SELLOS.md v0.2 prometía. Tres
// dientes que fallan ruidosamente si el doc, el espejo o el código divergan.
// (El backtick de las filas del doc se construye con fromCharCode para no
// necesitar literales de plantilla en este archivo.)
//
// 1. DOC — la tabla Matriz parsea a exactamente 41 filas + set mínimo de
//    sellos canónicos (guard anti-regex-podrido: si la regex dejara de
//    matchear, un conteo en 0 delata el podrimiento — nunca pasa en silencio).
// 2. ESPEJO — MATRIZ_SELLOS_V0_2 (apps/web/src/lib/artefactoA4.ts) es 1:1
//    con el doc: mismos sellos en el mismo orden.
// 3. EMISORES — todo sello de dominio emitido en apps/api/src (sin .test.ts,
//    sin comentarios) tiene fila en la matriz: la regla 5 de
//    docs/MANTENIMIENTO.md con diente en CI. system.* queda excluido: son
//    sellos internos reservados (H-01) fuera del alcance de la matriz —
//    precedente: la suite A4 usa system.mode_change como type SIN fila.
//
// El inverso NO se exige (R15): semillas SQL emiten sellos documentados que
// no aparecen en apps/api/src (patrimonio.ingestado, fuente.registrada,
// subnodo.creado, operativa.ingestado, capa.registrada, corredor.creado) —
// la matriz los documenta igual.

const BT = String.fromCharCode(96);
const RAIZ = new URL('../../../', import.meta.url);
const DOC = readFileSync(new URL('docs/MATRIZ_SELLOS.md', RAIZ), 'utf8');
const A4 = readFileSync(new URL('apps/web/src/lib/artefactoA4.ts', RAIZ), 'utf8');

// Diente 1 — el doc: filas de 4 columnas de la tabla Matriz. La tabla
// Consumidores (2 columnas) y las cabeceras no matchean.
const RE_FILA = new RegExp(
  '^\\| ' + BT + '([a-z][a-z0-9_.]+)' + BT + ' \\| (.+?) \\| (.+?) \\| (.+?) \\|$'
);
const filasDoc = DOC.split('\n')
  .map((l) => RE_FILA.exec(l))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => ({ sello: m[1], dominio: m[2], origen: m[3], estado: m[4] }));

const SELLOS_CANONICOS = [
  'reporte.recibido',
  'cluster.creado',
  'residencia.declarada',
  'visitante.registrado',
  'comercio.ingestado',
  'activo.propuesto',
  'pedido.presentado',
  'mediador.registrado',
] as const;

describe('C5 (#412) — diente 1: la tabla Matriz de docs/MATRIZ_SELLOS.md', () => {
  it('parsea exactamente 41 filas', () => {
    expect(filasDoc).toHaveLength(41);
  });

  it('contiene el set mínimo de sellos canónicos (guard anti-regex-podrido)', () => {
    const sellos = filasDoc.map((f) => f.sello);
    for (const canon of SELLOS_CANONICOS) {
      expect(sellos).toContain(canon);
    }
  });

  it('no tiene sellos duplicados', () => {
    const sellos = filasDoc.map((f) => f.sello);
    expect(new Set(sellos).size).toBe(sellos.length);
  });
});

// Diente 2 — el espejo del cliente web: mismos sellos, mismo orden. El
// escaneo se acota al segmento del array para no capturar objetos ajenos.
const I_ESPEJO = A4.indexOf('export const MATRIZ_SELLOS_V0_2');
const I_FIN = A4.indexOf('];', I_ESPEJO);
const SEG_ESPEJO = I_ESPEJO >= 0 && I_FIN > I_ESPEJO ? A4.slice(I_ESPEJO, I_FIN) : '';
const RE_ESPEJO = /\{\s*sello:\s*'([^']+)',\s*dominio:\s*'([^']+)',\s*origen:\s*'([^']+)'\s*\}/g;
const espejo: Array<{ sello: string; dominio: string; origen: string }> = [];
for (let m = RE_ESPEJO.exec(SEG_ESPEJO); m !== null; m = RE_ESPEJO.exec(SEG_ESPEJO)) {
  espejo.push({ sello: m[1], dominio: m[2], origen: m[3] });
}

describe('C5 (#412) — diente 2: el espejo MATRIZ_SELLOS_V0_2 es 1:1 con el doc', () => {
  it('tiene las mismas 41 filas en el mismo orden', () => {
    expect(espejo).toHaveLength(41);
    expect(espejo.map((f) => f.sello)).toEqual(filasDoc.map((f) => f.sello));
  });
});

// Diente 3 — emisores: escaneo de apps/api/src sin .test.ts ni comentarios.
function sinComentarios(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => (l.trim().startsWith('//') ? '' : l))
    .join('\n');
}

const DIR_API = fileURLToPath(new URL('apps/api/src', RAIZ));
const archivosApi: string[] = [];
for (const entrada of readdirSync(DIR_API, { withFileTypes: true })) {
  if (entrada.isDirectory()) {
    for (const sub of readdirSync(DIR_API + '/' + entrada.name, { withFileTypes: true })) {
      if (sub.isFile() && sub.name.endsWith('.ts') && !sub.name.endsWith('.test.ts')) {
        archivosApi.push(entrada.name + '/' + sub.name);
      }
    }
  } else if (entrada.isFile() && entrada.name.endsWith('.ts') && !entrada.name.endsWith('.test.ts')) {
    archivosApi.push(entrada.name);
  }
}

const SELLO = '[a-z][a-z0-9_]*(?:\\.[a-z][a-z0-9_]*)+';
const RES_EMISION = [
  new RegExp("sellarEvento\\(\\s*'(" + SELLO + ")'", 'g'),
  new RegExp("type:\\s*'(" + SELLO + ")'", 'g'),
  new RegExp("=\\s*'(" + SELLO + ")';", 'g'),
];

const emisores = new Map<string, string[]>();
for (const rel of archivosApi) {
  const src = sinComentarios(readFileSync(DIR_API + '/' + rel, 'utf8'));
  for (const re of RES_EMISION) {
    re.lastIndex = 0;
    for (let m = re.exec(src); m !== null; m = re.exec(src)) {
      const sello = m[1];
      if (sello.startsWith('system.')) continue; // reservados H-01: fuera de la matriz
      if (!emisores.has(sello)) emisores.set(sello, []);
      emisores.get(sello)!.push(rel);
    }
  }
}

describe('C5 (#412) — diente 3: todo sello emitido en apps/api/src tiene fila', () => {
  it('el escaneo encuentra emisores (guard anti-regex-podrido: >= 20)', () => {
    expect(emisores.size).toBeGreaterThanOrEqual(20);
  });

  for (const [sello, archivos] of emisores) {
    it('sello ' + sello + ' (' + archivos.join(', ') + ') tiene fila en la matriz', () => {
      expect(filasDoc.some((f) => f.sello === sello)).toBe(true);
    });
  }
});
