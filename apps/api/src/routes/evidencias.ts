import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireWriteAuth } from '../lib/authGuard.js';
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

// Regla R4 (Issue #23 / #25): ninguna evidencia se marca 'ok' sin resultado comprobable adjunto
const EvidenciaVerifySchema = z.object({
  result: z.record(z.any(), {
    required_error:
      'Regla R4: Para verificar una evidencia (status="ok") es obligatorio adjuntar el objeto result con la salida ejecutable.',
  }),
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

// POST /evidencias - Crear una nueva evidencia (Protegido por Regla R8)
router.post('/', requireWriteAuth, async (req, res) => {
  try {
    const body = EvidenciaSchema.parse(req.body);

    const evidencia = await prisma.evidencias.create({
      data: {
        code: body.code,
        title: body.title,
        status: body.status,
        result: body.result ?? undefined,
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

// PUT /evidencias/:code - Actualizar una evidencia (Protegido por Regla R8)
router.put('/:code', requireWriteAuth, async (req, res) => {
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
        result: body.result ?? undefined,
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

// PATCH /evidencias/:code/verify - Verificar una evidencia bajo Reglas R4 y R8
router.patch('/:code/verify', requireWriteAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const parsed = EvidenciaVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        rule: 'R4',
        error: 'Toda verificación de evidencia exige payload de ejecución comprobable (Regla R4)',
        details: parsed.error.errors,
      });
    }

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
        result: parsed.data.result as object,
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

// DELETE /evidencias/:code - Eliminar una evidencia (Protegido por Regla R8)
router.delete('/:code', requireWriteAuth, async (req, res) => {
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
