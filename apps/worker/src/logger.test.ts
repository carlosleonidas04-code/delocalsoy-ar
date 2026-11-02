import { describe, expect, it, vi } from 'vitest';
import { logJson } from './logger.js';

// M1 (#288): unidad del logger del worker — sin Redis ni DB (no toca
// consumer groups, seguro con fileParallelism: false de la suite).
describe('M1 logs JSON — logger del worker (#288)', () => {
  it('info loguea una linea JSON.parse-able con ts, level, source y campos', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      logJson('info', 'pasada', { pass: 1, group: 'core004-worker', processed: 2, errors: 0 });
      expect(spy.mock.calls.length).toBe(1);
      const line = JSON.parse(String(spy.mock.calls[0][0]));
      expect(line.level).toBe('info');
      expect(line.source).toBe('worker');
      expect(line.msg).toBe('pasada');
      expect(line.pass).toBe(1);
      expect(line.group).toBe('core004-worker');
      expect(line.processed).toBe(2);
      expect(typeof line.ts).toBe('string');
    } finally {
      spy.mockRestore();
    }
  });

  it('error sale por console.error como JSON', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      logJson('error', 'pasada_fallo', { group: 'vig003-kpi', error: 'sin conexion' });
      expect(spy.mock.calls.length).toBe(1);
      const line = JSON.parse(String(spy.mock.calls[0][0]));
      expect(line.level).toBe('error');
      expect(line.group).toBe('vig003-kpi');
      expect(line.error).toBe('sin conexion');
    } finally {
      spy.mockRestore();
    }
  });
});
