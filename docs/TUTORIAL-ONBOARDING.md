# Onboarding Ejecutable en 15 Minutos (Estructura Diataxis - ADR-017 #28)

## 1. Tutorial (Orientado al Aprendizaje)
1. Clonar y posicionar en `main`: `git switch main && pnpm install`
2. Levantar PostGIS (`SRID=4326`): `docker compose up -d`
3. Aplicar esquema e indice GiST: `pnpm --filter @delocalsoy/db exec prisma db push`
   - **Migraciones versionadas no-interactivas (#55):** `pnpm --filter @delocalsoy/db db:deploy` — aplica `migrations/` sin prompts (recomendado en CI y verificación; `prisma db push` queda para prototipos sin historial).

## 2. Guias Practicas (How-To)
- **Consultar salud operativa (R5):** `curl -i http://127.0.0.1:3000/api/health`
- **Filtrar territorios por BBOX PostGIS:** `curl -i "http://127.0.0.1:3000/api/territorios?bbox=-68.60,-31.58,-68.48,-31.50"`
- **Verificar idempotencia SHA-256 (EV-005):** `pnpm --filter @delocalsoy/api test` (suite vitest; en CI corre con PostGIS real) o enviar doble `POST /api/events` con identico `hash`.

## 3. Referencia Tecnica
- **Nodos activos (ADR-021 #33):** San Juan (`capital`, `caucete`, `iglesia`).
- **Scorecard CORE-001:** `6/6 Acreditado` en `main @ caa573b`.
- **Suite de tests (riesgo #59):** `pnpm test` (turbo) o `pnpm --filter @delocalsoy/api test`. Requiere `db:generate` previo; los tests de idempotencia se saltan sin base alcanzable (honesto, R5).

## 4. Explicacion (Arquitectura y Gobernanza R1-R15)
- `events_raw` en PostgreSQL/PostGIS es la unica fuente de verdad canonica append-only; Firestore opera como espejo offline-first bajo guardia Anti-PII (Ley 25.326, ADR-020 #32).
