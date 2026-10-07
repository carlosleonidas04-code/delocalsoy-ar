/**
 * Selector de origen de datos del demo (DEMO-3, #18).
 *
 * VITE_DATA_SOURCE=synthetic (default) → SyntheticDataSource (literales
 * 100% sintéticos, banner de honestidad).
 * VITE_DATA_SOURCE=api → ApiDataSource (backend real vía proxy /api).
 *
 * El acceso a import.meta.env es deliberadamente sin tipos de Vite
 * (cast defensivo) para no acoplar el typecheck a vite/client.
 */
import { ApiDataSource } from "./ApiDataSource";
import type { DataSource } from "./dataSource";
import { SyntheticDataSource } from "./SyntheticDataSource";

export type DemoDataSourceMode = "synthetic" | "api";

export function demoDataSourceMode(): DemoDataSourceMode {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> })
    .env;
  return env?.VITE_DATA_SOURCE === "api" ? "api" : "synthetic";
}

export function makeDemoDataSource(): DataSource {
  return demoDataSourceMode() === "api"
    ? new ApiDataSource()
    : new SyntheticDataSource();
}
