import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';
import { ResidenciaAltaSchema } from '@delocalsoy/contracts';
import { requireJwt, requireRole, type Rol } from '../lib/auth.js';

/**
 * Dominio «mi cuenta» — ARTEFACTOS-ROLES AR1 (#400, épica #399).
 *
 * PUT /api/me/residencia — auto-declaración de residencia (decisión DH
 * 2026-11-06: vecino = ATRIBUTO de residencia sobre la cuenta ciudadana,
 * NO rol nuevo). R15: auto-declaración honesta SIN verificación; sin
 * domicilio jamás (Ley 25.326, ADR-027) — solo la clave del subnodo real
 * del vocabulario (validada contra la tabla subnodos) y su timestamp.
 * La re-declaración actualiza el atributo y sella de nuevo (append-only:
 * el historial de declaraciones vive en events_raw).
 *
 * Sello 'residencia.declarada' en events_raw SIN PII (Ley 25.326): solo
 * {subnodo_key, created_by_hash} — el pseudónimo sha256(usuario_id)
 * truncado (patrón CORE-005 R2). Sin sello no hay declaración acreditada
 * (R4/R15): rollback del atributo si el sello falla.
 *
 * Visitante: SOLO LECTURA en v0.2 (decisión DH) — requireRole excluye el
 * rol visitante: la API es la compuerta (403 real), nada se simula (R15).
 */
const router: Router = Router();

// Pseudónimo del declarante: sha256(usuario_id) truncado — irreversible, sin PII.
function seudonimo(usuarioId: string): string {
  return createHash('sha256').update(usuarioId).digest('hex').slice(0, 32);
}

type UsuarioRow = {
  id: string;
  residencia_subnodo_key: string | null;
  residencia_declarada_en: Date | null;
};

// PUT /api/me/residencia — ciudadano|moderador|admin autenticado (el
// visitante NO declara residencia: su ancla es el tránsito, no la radicación).
router.put('/residencia', requireJwt, requireRole('ciudadano', 'moderador', 'admin'), async (req: Request, res: Response) => {
  let parsed: z.infer<typeof ResidenciaAltaSchema>;
  try {
    parsed = ResidenciaAltaSchema.parse(req.body ?? {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  try {
    const session = res.locals.usuario as { id: string; rol: Rol };
    const subnodo = await prisma.subnodos.findUnique({ where: { key: parsed.subnodo_key } });
    if (subnodo === null) {
      res.status(400).json({
        success: false,
        error: 'el subnodo declarado no existe en el vocabulario del nodo — la residencia se ancla a un subnodo real (R15)',
      });
      return;
    }

    const usuario = (await prisma.usuarios.findUnique({ where: { id: session.id } })) as UsuarioRow | null;
    if (usuario === null) {
      res.status(401).json({ success: false, error: 'sesión inválida: el usuario no existe' });
      return;
    }

    const declaradaEn = new Date();
    await prisma.usuarios.update({
      where: { id: session.id },
      data: { residencia_subnodo_key: parsed.subnodo_key, residencia_declarada_en: declaradaEn },
    });

    const autor = seudonimo(session.id);
    const hash = createHash('sha256')
      .update(
        'residencia.declarada' +
          '|' +
          declaradaEn.toISOString() +
          '|' +
          JSON.stringify({ subnodo_key: parsed.subnodo_key, created_by_hash: autor })
      )
      .digest('hex');
    try {
      await prisma.events_raw.create({
        data: {
          type: 'residencia.declarada',
          payload: { subnodo_key: parsed.subnodo_key, created_by_hash: autor } as object,
          hash,
          occurred_at: declaradaEn,
        },
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay declaración acreditada — el
      // atributo vuelve al estado previo (incluido null, primera vez).
      await prisma.usuarios
        .update({
          where: { id: session.id },
          data: {
            residencia_subnodo_key: usuario.residencia_subnodo_key,
            residencia_declarada_en: usuario.residencia_declarada_en,
          },
        })
        .catch(() => undefined);
      console.error('[me] sellar residencia:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'no se pudo sellar la residencia declarada' });
      return;
    }

    res.json({
      success: true,
      data: { residencia_subnodo_key: parsed.subnodo_key, residencia_declarada_en: declaradaEn },
    });
  } catch (err) {
    // AUD-06 (#100): el detalle queda server-side, nunca en la respuesta.
    console.error('[me] residencia:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al declarar la residencia' });
  }
});

export default router;
