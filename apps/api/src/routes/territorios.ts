import { Router, type Request, type Response, type NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { Prisma } from '@delocalsoy/db';
import { z } from 'zod';

const router: Router = Router();

// Schema de validación para Territorio
const TerritorioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  provincia: z.string().min(1, 'La provincia es obligatoria'),
  activo: z.boolean().optional().default(true),
});

// Bbox para recorte espacial: minLng,minLat,maxLng,maxLat (SRID=4326) — issue #21
const BboxSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/, 'bbox debe tener el formato minLng,minLat,maxLng,maxLat')
  .transform((value) => value.split(',').map(Number) as [number, number, number, number])
  .refine(
    ([minLng, minLat, maxLng, maxLat]) =>
      minLng >= -180 && maxLng <= 180 &&
      minLat >= -90 && maxLat <= 90 &&
      minLng < maxLng && minLat < maxLat,
    'coordenadas fuera de rango o envolvente vacía (SRID=4326)'
  );

// GET /territorios - Listar todos los territorios (opcional: filtrar por activo)
// Con ?bbox=minLng,minLat,maxLng,maxLat: recorte espacial sobre índice GiST (PostGIS)
router.get('/', async (req, res) => {
  try {
    const { activo, bbox } = req.query;

    if (bbox !== undefined) {
      const parsedBbox = BboxSchema.safeParse(bbox);
      if (!parsedBbox.success) {
        return res.status(400).json({
          success: false,
          error: 'bbox inválido',
          details: parsedBbox.error.errors,
        });
      }
      const [minLng, minLat, maxLng, maxLat] = parsedBbox.data;
      const activoFilter =
        activo !== undefined ? Prisma.sql`AND activo = ${activo === 'true'}` : Prisma.empty;

      // Recorte espacial: ST_Intersects sobre envolvente WGS84, servido por el índice GiST idx_territorios_geom_gist
      const territorios = await prisma.$queryRaw`
        SELECT id, nombre, provincia, activo,
               ST_AsGeoJSON(geom)::json AS geometry
        FROM territorios
        WHERE geom IS NOT NULL
          AND ST_Intersects(geom, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
          ${activoFilter}
        ORDER BY nombre ASC
      `;

      return res.json({
        success: true,
        data: territorios,
        count: territorios.length,
        bbox: { minLng, minLat, maxLng, maxLat },
      });
    }

    const where = activo !== undefined ? { activo: activo === 'true' } : {};

    const territorios = await prisma.territorios.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });

    res.json({
      success: true,
      data: territorios,
      count: territorios.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener territorios',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /territorios/:id - Obtener un territorio por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const territorio = await prisma.territorios.findUnique({
      where: { id },
    });

    if (!territorio) {
      return res.status(404).json({
        success: false,
        error: 'Territorio no encontrado',
      });
    }

    res.json({
      success: true,
      data: territorio,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener territorio',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /territorios - Crear un nuevo territorio
router.post('/', async (req, res) => {
  try {
    const body = TerritorioSchema.parse(req.body);

    const territorio = await prisma.territorios.create({
      data: {
        nombre: body.nombre,
        provincia: body.provincia,
        activo: body.activo,
      },
    });

    res.status(201).json({
      success: true,
      data: territorio,
      message: 'Territorio creado exitosamente',
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
      error: 'Error al crear territorio',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// PUT /territorios/:id - Actualizar un territorio
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = TerritorioSchema.partial().parse(req.body);

    const territorioExistente = await prisma.territorios.findUnique({
      where: { id },
    });

    if (!territorioExistente) {
      return res.status(404).json({
        success: false,
        error: 'Territorio no encontrado',
      });
    }

    const territorio = await prisma.territorios.update({
      where: { id },
      data: body,
    });

    res.json({
      success: true,
      data: territorio,
      message: 'Territorio actualizado exitosamente',
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
      error: 'Error al actualizar territorio',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// DELETE /territorios/:id - Eliminar un territorio (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const territorioExistente = await prisma.territorios.findUnique({
      where: { id },
    });

    if (!territorioExistente) {
      return res.status(404).json({
        success: false,
        error: 'Territorio no encontrado',
      });
    }

    const territorio = await prisma.territorios.update({
      where: { id },
      data: { activo: false },
    });

    res.json({
      success: true,
      data: territorio,
      message: 'Territorio desactivado exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al desactivar territorio',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;