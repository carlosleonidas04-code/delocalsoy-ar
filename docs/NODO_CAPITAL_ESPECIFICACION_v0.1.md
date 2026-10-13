# NODO CAPITAL — Especificación funcional v0.1 (Bloques 1–12)

> **Estado: ESPECIFICACIÓN FUNCIONAL — NO IMPLEMENTADO (R15).**
> Este documento consolida canónicamente el diseño del Nodo Capital producido en la sesión de diseño del 2026-10-13 (documento fuente: export Perplexity de 30 hilos, procesado íntegro). Nada de lo aquí descrito se considera implementado hasta que exista código, pruebas automatizadas y evidencia de ejecución con CI verde. No modifica `docs/DECISIONES.md`: la formalización como ADR requiere ratificación de la DH (R9).

## Procedencia y criterios de verdad

- **Fuente primaria:** documento de diseño NODO-CAPITAL (30 hilos), subido por la DH el 2026-10-13.
- **Trazabilidad:** épica #152; issues #153–#159 (NCAP-R1 a NCAP-R7).
- **Reglas del proyecto:** R9 (GitHub acredita, la DH ratifica), R15 (nada declarado implementado sin CI verde + evidencia ejecutable), regla documental R9 (todo PR que agrega rutas actualiza openapi + ARCHITECTURE_STATE + README en el mismo PR).
- **Criterio de verdad territorial:** todo dato geográfico conserva fuente, fecha, método y `boundary_status` (`provisional` hasta contraste cartográfico con UNIDE/Catastro). Un dato publicado, una observación ciudadana y una inferencia del sistema nunca son equivalentes.

## Estructura territorial v0.1 (síntesis)

```text
delocalsoy_sj_capital (nodo departamental)
├── sj_capital_centro (subnodo)
│   ├── microcentro (área analítica, perímetro Libertador–Córdoba–Alem–Rioja, PEC 2025)
│   ├── macrocentro (área analítica, delimitación pendiente)
│   └── centro cívico-cultural (centralidad funcional)
├── sj_capital_desamparados (subnodo)
│   ├── plaza Salvador María del Carril / Basílica (centralidad cívico-barrial)
│   ├── Facultad de Ingeniería UNSJ (hito institucional)
│   └── Parque de Mayo (hito recreativo)
└── corredores v0.1 (hipótesis de diseño, no trazas oficiales):
    cor_centro_civico · cor_libertador_west · cor_centro_desamparados
    cor_centro_micro_macro · cor_redtulum_centro
```

Microcentro, macrocentro y Centro Cívico **no son distritos administrativos**: son unidades analíticas/funcionales. El Anillo Céntrico de RedTulum es una geometría de red de transporte, no un límite territorial. Parque de Mayo y Facultad de Ingeniería se modelan como hitos relacionados, sin adjudicarles pertenencia distrital definitiva.

## Bloques 1–12

### Bloque 1 — Contrato territorial
**Objetivo:** vocabulario compartido y sin duplicación: `TerritorialEntityKind` (department_node, district_subnode, functional_area, centrality, corridor, network_segment, landmark), `BoundaryStatus`, `EvidenceClass`, `ValidationStatus`, entidades y relaciones (`TerritorialEntity`, `TerritorialRelation` con confianza y vigencia).
**Regla central:** no crear un segundo `TerritorialNode`/`TerritorialFeature`/`DataSource` si ya existe versión canónica. Issue: #153, #154.

### Bloque 2 — Actores, fichas y ofertas (configuración del piloto)
**Objetivo:** modelo mínimo de presencia en el directorio: `Actor` (persona, emprendimiento, comercio, organización, institución), `CommercialProfile` (ficha pública con visibilidad y contacto según privacidad), ofertas declaradas y vínculo con subnodo/corredor. Configuración declarativa del piloto (`territory-v01`) con `geometryRef: null` y estados `provisional`/`under_review`. Sin pagos ni reseñas todavía.
**Regla central:** la configuración declara entidades candidatas, no límites oficiales. Issue: #154.

### Bloque 3 — Descubrimiento y buscador de oferta local
**Objetivo:** encontrar comercios, emprendimientos, servicios y oportunidades en Centro o Desamparados mediante búsqueda por texto, filtros por categoría/subcategoría/atributos, mapa con ubicaciones validadas, filtros por subnodo/corredor/radio, ficha comercial con contacto según privacidad y resultados que distinguen perfiles verificados/activos/con cobertura.
**Fuera de alcance v0:** pagos, reseñas, logística propia. Issue: #155, #156.

### Bloque 4 — Ciclo de vinculación usuario ↔ actor
**Objetivo:** ciclo trazable: Descubrimiento → Interés → Solicitud → Respuesta del actor → Acuerdo o cierre → Seguimiento. Cada paso con estado, evidencia y plazo.
**Regla central:** la plataforma facilita el encuentro; el acuerdo es de las partes. Issue: #156.

### Bloque 5 — Confianza, reseñas y reputación territorial
**Objetivo:** señales de confianza verificables distinguiendo cuatro cosas que no deben mezclarse: verificación institucional/administrativa, reseña de experiencia, reputación calculada (indicador agregado derivado), y reporte/incidencia (requiere revisión, no es valoración pública).
**Regla central:** no exponer a personas ni convertir la plataforma en mecanismo de denuncia. Issue: #157.

### Bloque 6 — Panel del actor
**Objetivo:** interfaz segura y autónoma del actor: crear/mantener ficha, publicar ofertas, gestionar solicitudes/reservas/presupuestos, ver reputación y responder reseñas, administrar presencia territorial, controlar visibilidad/contacto/privacidad, ver métricas sin datos sensibles.
**Regla central:** el panel es la interfaz de operación del actor; no reemplaza al administrador. Issue: #157.

### Bloque 7 — Administración, moderación y auditoría
**Objetivo:** capacidades del equipo DELocalSoy.AR: revisar altas y fichas, verificar identidades y comercios, moderar reseñas y contenido, gestionar reportes/disputas/apelaciones, controlar categorías y catálogo, auditar cambios, mantener políticas públicas versionadas.
**Regla central:** toda acción de administración debe tener autorización, evidencia, motivo y registro. Issue: #157.

### Bloque 8 — Dashboard de economía local
**Objetivo:** responder qué oferta local está visible/activa, qué categorías y territorios tienen presencia, qué tan completa y confiable es la información, qué interacciones se generan y responden, qué oportunidades/vacíos detecta el Banco de Potencialidades, y qué cobertura real tienen los datos y desde cuándo.
**Regla central:** distinguir actividad de plataforma, cobertura de relevamiento y resultado económico verificado. No afirmar "la economía de Centro creció" midiendo fichas o clics. Todo porcentaje declara muestra, criterio y fecha (ej.: "82% de los tramos relevados; cobertura: 14 de 120 tramos priorizados"). Issue: #155, #158.

### Bloque 9 — Banco de Potencialidades
**Objetivo:** capa de inteligencia territorial participativa: registrar capacidades, recursos y oportunidades; detectar necesidades o vacíos de oferta; proponer vínculos entre actores; validar potenciales con evidencia y revisión; convertir oportunidades en proyectos o acciones; hacer seguimiento de resultados sin prometer impactos no verificados.
**Regla central:** no es una lista de deseos ni un CRM. Una oportunidad es un registro comunitario sujeto a revisión, no un hecho validado.
**Estado especial:** propuesto como primer slice vertical, con PR de implementación en curso (dominio `oportunidades`: contratos, migración, API con matriz de transiciones sellada, suite E2E). El estado `validacion` es del registro, no del territorio. Issue: #158.

### Bloque 10 — Participación comunitaria
**Objetivo:** ciclo participativo: proponer iniciativas/mejoras/proyectos, comentar y aportar evidencia, priorizar según criterios públicos, decidir dentro del alcance de cada proceso, responder explícitamente qué se hará / qué no / por qué, y hacer seguimiento del cumplimiento.
**Regla central:** la plataforma no reemplaza instituciones ni convierte un voto digital en decisión vinculante automática. Cada proceso declara quién decide, con qué alcance y con qué consecuencias. Issue: #159.

### Bloque 11 — Asistente territorial (RAG)
**Objetivo:** asistente que ayuda a encontrar información local, explicar el estado de un corredor/hito/subnodo, sugerir comercios/servicios/espacios, resumir oportunidades y vacíos, apoyar la exploración del dashboard y orientar sobre participación y canales institucionales.
**Regla central:** no inventa datos, no certifica denuncias, no reemplaza decisiones humanas y no presenta una inferencia como hecho. Interpretaciones trazables, separadas de datos y sugerencias. Issue: #159.

### Bloque 12 — Federación de nodos
**Objetivo:** que cada nodo mantenga su identidad, gobernanza y datos; publique catálogos y entidades seleccionadas; consuma datos de otros nodos con permisos explícitos; busque en la red sin centralizar información sensible; sincronice cambios de forma trazable; opere con distintos niveles de autonomía; y audite qué se compartió, con quién y bajo qué condiciones.
**Regla central:** federación por consentimiento y contrato, no replicación automática ni dependencia de una base central. Issue: #159.

## Orden de implementación sugerido

Bloque 9 → 10 → 11 → 12 (cada uno depende del anterior), por slices verticales, sin mezclar participación, IA y federación en un mismo PR. Bloques 3–8 avanzan en paralelo según las prioridades que ratifique la DH para el directorio y el dashboard.

## Estado real (R15)

| Bloque | Estado |
| :-- | :-- |
| 1–8 | Diseño / especificación funcional. No implementado. |
| 9 | Especificación completa; propuesta de implementación en PR (contratos + migración + API + tests), pendiente de CI verde y merge por la DH. |
| 10–12 | Diseño arquitectónico y especificación funcional completos. No implementado. |

## Decisiones que requiere la DH (R9)

1. Ratificar esta especificación como documento canónico del Nodo Capital.
2. Numeración ADR: propuesta ADR-037 = Nodo Capital (el candidato "vigilancia cuántica" pasaría a ADR-038). Numeración a decisión de la DH.
3. Priorización de slices verticales después del Bloque 9.

---

*Consolidado por el agente Vibe a partir del documento fuente de la DH. Trazabilidad completa en la épica #152.*
