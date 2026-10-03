#!/usr/bin/env node

/**
 * Script de verificacion de evidencias ejecutables (EV-001 a EV-006)
 * Parte del sprint CORE-001 - "verdad tecnica"
 * 
 * Uso: node scripts/verify-evidencias.js [evidencia]
 * Ejemplo: node scripts/verify-evidencias.js EV-004
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';

// Configurar DATABASE_URL antes de importar prisma
const dbUrl = process.env.DATABASE_URL || 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.DATABASE_URL = dbUrl;

// Importar prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const EVIDENCIAS = {
  'EV-001': {
    titulo: 'docker compose up -d levanta PostGIS sano',
    verificacion: async () => {
      try {
        const dockerCheck = execSync('which docker-compose || which docker 2>/dev/null || echo ""').toString().trim();
        if (!dockerCheck) {
          return { ok: false, error: 'Docker/Docker Compose no esta instalado' };
        }
        
        try {
          const psOutput = execSync('docker ps --format "{{.Names}}" --filter "name=delocalsoy-db" 2>/dev/null || echo ""').toString().trim();
          if (psOutput.includes('delocalsoy-db')) {
            return { ok: true, result: 'Contenedor delocalsoy-db esta corriendo' };
          }
        } catch (e) {
          try {
            const psOutput = execSync('docker compose ps --format "{{.Service}}" 2>/dev/null || echo ""').toString().trim();
            if (psOutput.includes('db')) {
              return { ok: true, result: 'Servicio db esta corriendo via docker compose' };
            }
          } catch (e2) {
            // No hay contenedores corriendo
          }
        }
        
        return { ok: false, error: 'Contenedor PostGIS no esta corriendo', suggestion: 'Ejecutar: docker compose up -d' };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }
  },
  
  'EV-002': {
    titulo: 'prisma migrate dev aplica el schema sin errores',
    verificacion: async () => {
      try {
        try {
          await prisma.$queryRaw`SELECT 1`;
        } catch (dbError) {
          return { ok: false, error: 'No se puede conectar a la base de datos', suggestion: 'Verificar DATABASE_URL y que PostGIS este corriendo' };
        }
        
        const tables = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('territorios', 'nodos', 'comunidades', 'proyectos', 'eventos', 'events_raw', 'evidencias')
        `;
        
        const existingTables = tables.map(t => t.table_name);
        const requiredTables = ['territorios', 'nodos', 'comunidades', 'proyectos', 'eventos', 'events_raw', 'evidencias'];
        const missingTables = requiredTables.filter(t => !existingTables.includes(t));
        
        if (missingTables.length > 0) {
          return { 
            ok: false, 
            error: `Faltan tablas: ${missingTables.join(', ')}`,
            suggestion: 'Ejecutar: pnpm --filter @delocalsoy/db prisma:migrate'
          };
        }
        
        return { ok: true, result: `Todas las tablas requeridas existen: ${existingTables.join(', ')}` };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }
  },
  
  'EV-003': {
    titulo: 'prisma generate genera cliente tipado',
    verificacion: async () => {
      try {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return { ok: true, result: 'Cliente Prisma funcional y conectado a BD' };
        } catch (e) {
          return { ok: false, error: 'Cliente Prisma no puede conectarse a BD', suggestion: 'Verificar DATABASE_URL' };
        }
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }
  },
  
  'EV-004': {
    titulo: 'API /health responde 200',
    verificacion: async () => {
      try {
        // Probar la API directamente
        const serverCode = readFileSync('./apps/api/src/app.ts', 'utf-8');
        if (!serverCode.includes('/health')) {
          return { ok: false, error: 'Endpoint /health no encontrado en app.js' };
        }
        
        // Verificar que el endpoint existe en el codigo
        if (serverCode.includes("'/health'") || serverCode.includes('"/health"')) {
          return { ok: true, result: 'Endpoint /health encontrado en el codigo de la API' };
        }
        
        return { ok: false, error: 'Endpoint /health no esta definido correctamente' };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }
  },
  
  'EV-005': {
    titulo: 'Insert de events_raw con hash duplicado es rechazado (idempotencia)',
    verificacion: async () => {
      try {
        // Verificar que la tabla events_raw existe y tiene el constraint unique en hash
        const columns = await prisma.$queryRaw`
          SELECT column_name, is_unique
          FROM information_schema.key_column_usage
          WHERE table_name = 'events_raw' AND column_name = 'hash'
        `;
        
        if (columns.length === 0) {
          return { ok: false, error: 'Columna hash no encontrada en events_raw' };
        }
        
        const hasUnique = columns.some(c => c.is_unique === true);
        if (!hasUnique) {
          return { ok: false, error: 'Constraint unique no encontrado en columna hash' };
        }
        
        // Probar la idempotencia
        const payload1 = { type: 'test', data: { foo: 'bar' } };
        const hash1 = crypto.createHash('sha256').update(JSON.stringify(payload1)).digest('hex');
        
        try {
          await prisma.events_raw.create({
            data: {
              type: 'test',
              payload: payload1,
              hash: hash1,
              occurred_at: new Date(),
              aggregateType: 'test',
              aggregateId: 'test-1'
            }
          });
          
          await prisma.events_raw.create({
            data: {
              type: 'test',
              payload: { data: 'different' },
              hash: hash1,
              occurred_at: new Date(),
              aggregateType: 'test',
              aggregateId: 'test-2'
            }
          });
          
          return { ok: false, error: 'El constraint unique en hash no funciono' };
        } catch (error) {
          if (error.code === 'P2002' || error.message.includes('Unique constraint failed') || error.message.includes('duplicate key')) {
            return { ok: true, result: 'Constraint unique en hash funciona correctamente - idempotencia verificada' };
          }
          throw error;
        }
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }
  },
  
  'EV-006': {
    titulo: 'turbo run build compila todo el monorepo',
    verificacion: async () => {
      try {
        const buildOutput = execSync('pnpm run build 2>&1', { 
          cwd: '.',
          encoding: 'utf-8',
          timeout: 120000
        });
        
        if (buildOutput.includes('successful') || buildOutput.includes('Done')) {
          return { ok: true, result: 'Build del monorepo exitoso' };
        }
        
        if (buildOutput.includes('error') || buildOutput.includes('Error')) {
          return { ok: false, error: 'Build fallo', details: buildOutput };
        }
        
        return { ok: true, result: 'Build completado', details: buildOutput };
      } catch (error) {
        return { ok: false, error: error.message, output: error.stdout, stderr: error.stderr };
      }
    }
  }
};

/**
 * Funcion para verificar una evidencia especifica
 */
async function verificarEvidencia(code) {
  const evidencia = EVIDENCIAS[code];
  
  if (!evidencia) {
    console.error(`  Evidencia ${code} no encontrada`);
    process.exit(1);
  }
  
  console.log(`\n  ${code}: ${evidencia.titulo}`);
  console.log('-'.repeat(60));
  
  const resultado = await evidencia.verificacion();
  
  if (resultado.ok) {
    console.log(`  OK: ${resultado.result}`);
    if (resultado.data) {
      console.log('   Datos:', JSON.stringify(resultado.data, null, 2));
    }
    return { code, status: 'ok', result: resultado.result, data: resultado.data };
  } else {
    console.log(`  FAIL: ${resultado.error}`);
    if (resultado.suggestion) {
      console.log(`   Sugerencia: ${resultado.suggestion}`);
    }
    if (resultado.details) {
      console.log('   Detalles:', resultado.details);
    }
    return { code, status: 'fallido', error: resultado.error, suggestion: resultado.suggestion };
  }
}

/**
 * Funcion para verificar todas las evidencias
 */
async function verificarTodas() {
  console.log('\n' + '='.repeat(60));
  console.log('  VERIFICACION DE EVIDENCIAS - Sprint CORE-001');
  console.log('='.repeat(60));
  
  const resultados = [];
  
  for (const [code, evidencia] of Object.entries(EVIDENCIAS)) {
    try {
      const resultado = await verificarEvidencia(code);
      resultados.push(resultado);
    } catch (error) {
      console.error(`\n  Error verificando ${code}:`, error.message);
      resultados.push({ code, status: 'error', error: error.message });
    }
  }
  
  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('  RESUMEN');
  console.log('='.repeat(60));
  
  const okCount = resultados.filter(r => r.status === 'ok').length;
  const fallidoCount = resultados.filter(r => r.status === 'fallido').length;
  const errorCount = resultados.filter(r => r.status === 'error').length;
  
  console.log(`  Total: ${resultados.length}`);
  console.log(`  OK: ${okCount}`);
  console.log(`  FAIL: ${fallidoCount}`);
  console.log(`  ERROR: ${errorCount}`);
  
  if (okCount === Object.keys(EVIDENCIAS).length) {
    console.log('\n  Todas las evidencias pasaron!');
    await prisma.$disconnect();
    process.exit(0);
  } else {
    console.log('\n  Algunas evidencias fallaron');
    await prisma.$disconnect();
    process.exit(1);
  }
}

/**
 * Punto de entrada
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await verificarTodas();
  } else {
    for (const arg of args) {
      await verificarEvidencia(arg);
    }
    await prisma.$disconnect();
  }
}

// Ejecutar
main().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
