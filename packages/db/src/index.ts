import { PrismaClient } from '@prisma/client';

let prisma: any;
try {
  prisma = new PrismaClient();
} catch (err) {
  // R5: el mock existe SOLO en pruebas (NODE_ENV=test). Fuera de pruebas,
  // sin base de datos se falla ruidosamente (Aterrizaje PR 1 — issue #20).
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
export * from '@prisma/client';
