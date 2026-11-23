# INTER-TERR v0.1: diseño de la interfaz territorial primaria

> DISEÑO, NO IMPLEMENTADO. Épica #607. Mandato DH 2026-11-23 con MONTAR-2/#445 en ejecución. Los ADR-085/086 aquí propuestos NO están ratificados: este documento CERO código y CERO rutas; toda implementación exige ratificación DH previa (R9).

## 1. Diagnóstico

Main @ 3672da5d terminó la pizarra de interfaz (#543 PIZ-R1..R9, EV-115..123) y OBJE-RFC-021 (EV-125/126): vistas por nodo honestas, procedencia DL-13, accesible. Pero la interfaz sigue organizada como consola de artefactos (A1..A4) donde el territorio es UNA sección más. La realidad territorial ya está modelada:

- `TerritoriosMap.tsx`: Google Maps + Places + capas PostGIS (assets/problems/public_space) con control por capa y conteo (EV-010).
- Atlas Territorial MVP-1: superficie por nodo kpis/amenazas/convenios/curricular/vocabulario.
- Modelo federado: geografías espaciales volumen con linaje SHA-256 (H3) del Hero.

La evolución declarada por la DH: el territorio es la PUERTA, los artefactos son el contenido.

## 2. Principios (ratificados o propuestos)

| Regla | Vigente / propuesta | Efecto en interfaz |
|---|---|---|
| ADR-036 (R5) anti-ranking | VIGENTE | Las capas muestran conteos con cobertura, jamás puntaje. El mapa no tiene «ranking de nodos». |
| ADR-084 solo-lectura | VIGENTE + extendido | Todo el itinerario territorial es lectura; escritura solo por canales acreditados (reportes ADR-039, fichas). |
| ADR-061 AA WCAG 2.2 | VIGENTE | Cada capa del mapa tiene equivalente textual; el mapa digitale no es el único canal (1.4.1). |
| ADR-085 mapa como entrada | PROPUESTA | TerritoriosMap promovido a la cabecera visible del producto (EV-114 ya garantiza producto sin #lab). |
| ADR-086 sensibilidad de geometrías | PROPUESTA | El patrón Iglesia (geometrías de dominio sensible jamás publicadas) se generaliza: atributo `sensibilidad` de la geometría, no excepción de un nodo. |
| R15 / ADR-027 | VIGENTE | Cero geometrías estimadas; corredores con boundary_status: provisional; actores sin nombre. |

## 3. Slices IT-R1..R6

Cada slice: issue propio + rama + PR con CI verde + EV (HITUB). Frontend primero; rutas nuevas solo las mínimas si se justifican题型 (regla documental R9: openapi + ARCHITECTURE_STATE + README en el mismo PR).

### IT-R1 Entrada mapa-primero
TerritoriosMap como primera sección visible del producto. Sin API key, el fallback pasa de «error» a «alternativa honesta»: listado textual de territorios y sus capas (WCAG 1.4.1) más nota de que el mapa digital requiere Google Maps Platform.
Archivos previstos: App.tsx (caudal/banner orden), TerritoriosMap.tsx (fallback), sin cambio de API.

### IT-R2 Atlas vínculo al mapa
Cada bloque del Atlas declara su ancla territorial (la capa PostGIS si su superficie emite geometría) con procedencia DL-13: «emitido por X · capa: Assets». Enlazar, no crear: reusa `SUPERFICIES_BLOQUE` (patrón EV-126).

### IT-R3 Corredores v0.1 (NCAP-R4)
Capa nueva de hipótesis de diseño, con `boundary_status: provisional` en cada ficha, contraste UNIDE/Catastro pendiente: cor_centro_civico, cor_libertador_west, cor_centro_desamparados, cor_centro_micro_macro, cor_redtulum_centro (Nodo Capital, doc fuente 2026-10-13). Grupo nuevo en `MAP_GEOMETRY_LAYER_GROUPS`.

### IT-R4 Conteos territoriales honestos (NCAP-R5)
Panel de conteo por capa y nodo con cobertura y fuente declaradas (regla LIC-01/LIC-02); null ≠ 0; jamás puntaje global. Reusa evaluación del observatorio (EV-115).

### IT-R5 Itinerario por nodo
URL `/nodo/:key` compone TerritoriosMap (foco en el nodo) + Observatorio + Fichas + Reportes. Navegación, no comparación (R5). Ruta frontend pura si el router actual lo permite; else hash.

### IT-R6 Accesibilidad territorial
Touch targets 44 px en controles del mapa (patrón EV-122), aria-live en estados de geocodificación/camadas, descripciones accesibles por capa.

## 4. Compuertas transversales

- CI 8 checks verde previo al merge; label `r9-ratificado` tras ratificación DH.
- Anti-PII (ADR-027) y geolocalización solo punto público (ADR-036) en el flujo de reporte con mapa.
- DataSource (ADR-040) por contrato; jamás acoplar al origen (ADR-029).

## 5. Fuera de alcance

Heat maps socioeconómicos, scoring, comparación entre nodos, overlays de censo sin fuente ingerida (ECO-5), RAG territorial (ECO-5), geometrías de dominio sensible.

## 6. Dependencias abiertas

- MONTAR-2 #445: re-disparo ejecutado por la DH 2026-11-23; run pendiente de verificación (sin tool de workflow runs en este entorno).
- ECO-5 ingesta corpus DLUI-IT: bloquea contenido real de Iglesia/Caucete; la interfaz lo declara, no lo simula.