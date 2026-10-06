import { PrismaClient } from '@delocalsoy/db';

let prisma: any;
try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
} catch (err) {
  // R5: el mock existe SOLO en pruebas (NODE_ENV=test). En cualquier otro
  // contexto, una API sin base de datos debe fallar ruidosamente,
  // nunca simular éxito silencioso (Aterrizaje PR 1 — issue #20).
  if (process.env.NODE_ENV === 'test') {
    console.warn('[test] Database not connected — using mock');
    const noOp = {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      count: async () => 0,
      create: async (d: any) => d?.data ?? {},
      update: async (d: any) => d?.data ?? {},
      delete: async () => ({}),
      $queryRaw: async () => [],
    };
    prisma = new Proxy({}, { get: () => noOp });
  } else {
    throw err;
  }
}

export { prisma };
export default prisma;
