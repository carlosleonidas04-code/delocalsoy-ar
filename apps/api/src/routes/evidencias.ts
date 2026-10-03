import { Router, type Request, type Response, type NextFunction } from 'express';
import { Prisma } from '@delocalsoy/db';
import prisma from '../lib/prisma.js';
import { z } from 'zod';

const router: Router = Router();

// Schema de validación para Evidencia
const EvidenciaSchema = z.object({
  code: z.string().min(1, 'El código es obligatorio'),
  title: z.string().min(1, 'El título es obligatorio'),
  status: z.enum(['pendiente', 'ok', 'fallido']).optional().default('pendiente'),
  result: z.record(z.any()).optional().nullable(),
  verified_at: z.string().datetime().optional().nullable(),
});

// GET /evidencias - Listar todas las evidencias (opcional: filtrar por status)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status: status as string } : {};

    const evidencias = await prisma.evidencias.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    res.json({
      success: true,
      data: evidencias,
      count: evidencias.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener evidencias',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /evidencias/:code - Obtener una evidencia por código
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const evidencia = await prisma.evidencias.findUnique({
      where: { code },
    });

    if (!evidencia) {
      return res.status(404).json({
        success: false,
        error: 'Evidencia no encontrada',
      });
    }

    res.json({
      success: true,
      data: evidencia,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener evidencia',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /evidencias - Crear una nueva evidencia
router.post('/', async (req, res) => {
  try {
    const body = EvidenciaSchema.parse(req.body);

    const evidencia = await prisma.evidencias.create({
      data: {
        code: body.code,
        title: body.title,
        status: body.status,
        result: body.result === null ? Prisma.JsonNull : body.result as Prisma.InputJsonValue,
        verified_at: body.verified_at ? new Date(body.verified_at) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: evidencia,
      message: 'Evidencia creada exitosamente',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    // Manejar error de código duplicado
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(409).json({
        success: false,
        error: 'El código de evidencia ya existe',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear evidencia',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// PUT /evidencias/:code - Actualizar una evidencia
router.put('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const body = EvidenciaSchema.partial().parse(req.body);

    const evidenciaExistente = await prisma.evidencias.findUnique({
      where: { code },
    });

    if (!evidenciaExistente) {
      return res.status(404).json({
        success: false,
        error: 'Evidencia no encontrada',
      });
    }

    const evidencia = await prisma.evidencias.update({
      where: { code },
      data: {
        title: body.title,
        status: body.status,
        result: body.result === null ? Prisma.JsonNull : body.result as Prisma.InputJsonValue,
        verified_at: body.verified_at ? new Date(body.verified_at) : undefined,
      },
    });

    res.json({
      success: true,
      data: evidencia,
      message: 'Evidencia actualizada exitosamente',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al actualizar evidencia',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// PATCH /evidencias/:code/verify - Verificar una evidencia (cambiar status a 'ok' y guardar resultado)
router.patch('/:code/verify', async (req, res) => {
  try {
    const { code } = req.params;
    const { result } = req.body;

    const evidenciaExistente = await prisma.evidencias.findUnique({
      where: { code },
    });

    if (!evidenciaExistente) {
      return res.status(404).json({
        success: false,
        error: 'Evidencia no encontrada',
      });
    }

    const evidencia = await prisma.evidencias.update({
      where: { code },
      data: {
        status: 'ok',
        result: result as object,
        verified_at: new Date(),
      },
    });

    res.json({
      success: true,
      data: evidencia,
      message: 'Evidencia verificada exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al verificar evidencia',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// DELETE /evidencias/:code - Eliminar una evidencia
router.delete('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const evidenciaExistente = await prisma.evidencias.findUnique({
      where: { code },
    });

    if (!evidenciaExistente) {
      return res.status(404).json({
        success: false,
        error: 'Evidencia no encontrada',
      });
    }

    await prisma.evidencias.delete({
      where: { code },
    });

    res.json({
      success: true,
      message: 'Evidencia eliminada exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar evidencia',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
