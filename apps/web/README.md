# @delocalsoy/web — Frontend

App frontend de DELocalSoy.AR: **Vite + React 18 + TypeScript**.

Integrada al workspace pnpm/Turborepo del monorepo (`apps/web`).

## Desarrollo

```bash
pnpm install
pnpm --filter @delocalsoy/web dev      # http://localhost:5173
```

Requiere la API levantada (`pnpm --filter @delocalsoy/api dev`).
Vite proxea `/api/*` → `API_URL` (por defecto `http://localhost:3000`).

## Scripts

- `dev` — servidor de desarrollo
- `build` — `tsc -b && vite build` (salida en `dist/`)
- `preview` — sirve el build
- `typecheck` — verificación de tipos

## Integración con la evidencia

La pantalla inicial consulta `GET /api/health`: si responde, la integración
backend↔frontend queda verificada de punta a punta (ver `docs/EVIDENCIA.md`).
