// AUD-08 (#103, R4 — higiene del log del job de CI): los P2002 «repeated»
// de la proyección idempotente (ADR-032) son ESPERADOS, pero el servicio
// PostGIS del job test los loguea a stderr del contenedor con STATEMENT
// completo y esa sección inunda el tail de 20000 chars del auto-report R4:
// la salida de vitest quedó FUERA del comentario en cuatro corridas de este
// PR (34cd6d4 → da822f6 — ciego ante el paso que falla).
//
// El intento anterior (ALTER ROLE en el beforeAll de kpi-consumer.test.ts)
// llegaba TARDE: vitest ordena los archivos por tamaño descendente y ese
// archivo no corre primero. globalSetup corre ANTES que cualquier archivo.
//
// ALTER SYSTEM + pg_reload_conf (superusuario delocalsoy, el POSTGRES_USER
// del contenedor de CI): aplica al SERVIDOR entero, de inmediato, a las
// sesiones vivas y a las nuevas — sin depender del orden de archivos. El
// contenedor es efímero: el setting muere con el job. El cliente (Prisma)
// sigue recibiendo cada P2002 y los tests siguen contando «repeated»: no se
// oculta comportamiento, solo el ruido del log del contenedor.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';

async function cargarPrisma() {
  try {
    return (await import('@delocalsoy/db')).prisma;
  } catch {
    // Fallback: importación relativa por si el alias no aplica en
    // globalSetup (mismo paquete, misma fuente TS del workspace).
    return (await import('../../packages/db/src/index')).prisma;
  }
}

export default async function globalSetup(): Promise<void> {
  try {
    const prisma = await cargarPrisma();
    await prisma.$executeRawUnsafe(`ALTER SYSTEM SET log_min_messages = 'fatal'`);
    await prisma.$executeRawUnsafe(`ALTER SYSTEM SET log_min_error_statement = 'panic'`);
    await prisma.$queryRaw`SELECT pg_reload_conf()`;
  } catch {
    // best-effort (higiene del log en CI): sin superusuario o sin base, el
    // ruido queda — no afecta la semántica de los tests.
  }
}
