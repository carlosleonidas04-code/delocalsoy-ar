# LIC-R2 — Protocolo de relevamiento de accesibilidad peatonal (v1.0)

> **Versión v1.0** — LIC-DLUI LIC-R2 (LIC-02 #453, épica #448), aterrizado por R9 el
> 2026-11-11. Este protocolo convive con `NCAP-R5-ACCESIBILIDAD.md` (el dashboard
> define el dominio y sus estados; este documento define CÓMO se releva) y rige el
> trabajo de campo de los practicantes de la Licenciatura en Desarrollo Local Urbano
> Inclusivo (LIC-03). Versionado como el instrumento de fichas VIG-009: cada
> relevamiento queda registrado con la versión con la que fue relevado.

## 1. Qué mide el KPI `tramos_con_relevamiento`

El KPI del set LIC-02 (publicado en `GET /api/nodos/{key}/observatorio`, ficha
metodológica DL-1) cuenta los tramos del anuncio de repavimentación del microcentro
(`repavimentacion_microcentro_2026`, NCAP-R3 #155 — 18 tramos `declared`) con
relevamiento de accesibilidad **completado**: estado `community_validated` o
`verified`.

Nace honesto **«0 de 18»** (DL-5): sin relevamiento, el 0 es REAL sobre los 18
tramos del anuncio. La brecha es visible, jamás oculta — el observatorio la publica
el primer día.

## 2. Qué NO es este relevamiento

- **SIN puntajes globales de accesibilidad** ni rankings de tramos (R5/ADR-036):
  jamás «accesibilidad del Centro: 82%». Solo conteos con cobertura: «X de Y tramos
  relevados».
- **SIN puntajes de personas** (R5): el relevamiento observa el TRAMO (el espacio),
  nunca a las personas que lo transitan.
- La plataforma **NO releva** y **NO computa calidad**: cuenta estados del dominio;
  el relevamiento es trabajo humano de campo con este instrumento versionado (DL-4).

## 3. Quién releva

Los **practicantes de la licenciatura (LIC-03)**, en el marco de su práctica
acreditada. El relevamiento es un acto de extensión territorial documentado: cada
practicante declara su práctica ante la cátedra; la plataforma solo recibe el
resultado estructurado por el canal v1. No hay relevamiento automático, ni por
bot, ni estimado (R15).

## 4. Las cuatro dimensiones del relevamiento (canon MDPI)

Cada tramo se observa en 4 dimensiones; el registro es SIEMPRE observables del
espacio, con fecha y método:

1. **Funcional**: continuidad de la vereda, ancho de banda peatonal, rampas en
   esquinas, cruce peatonal señalizado, pavimento regular (bordillos y solapes).
2. **Seguridad**: iluminación pública del tramo, visibilidad de esquinas, señalización
   horizontal, obstáculos fijos (columnas, bolardos, tarjetas de postes) y su marca
   táctil si existe.
3. **Confort**: sombra/arbolado presente, escurrimientos de agua superficial, estado
   del pavimento (grietas/hundimientos), mobiliario (bancos, bebederos) si el tramo
   lo declara.
4. **Destino**: la función del tramo como conexión — ¿a qué destino conduce?
   (escuela, centro de salud, parada de transporte, espacio público, comercio de
   proximidad). El destino del tramo define su prioridad pedonal, no un puntaje.

Cada observación se registra con **fecha del relevamiento** y el método declarado
(relevamiento a pie con planilla v1). Sin fecha, no es relevamiento: es testimonio
sin corte temporal (R15).

## 5. Canal v1 — la API de reportes existente

El relevamiento se ingresa por la **API de reportes existente** (`POST /api/reportes`,
CORE-005) con la categoría de accesibilidad del vocabulario del nodo, describiendo
tramo y dimensión observada. NO hay Kobo/ODK/PWA en v1: **FE-8 (formulario
dedicado de relevamiento) queda como deuda declarada — slice 2**. La plataforma no
espera el canal perfecto para empezar: el conteo honesto «0 de 18» ya es visible y
el primer relevamiento real mueve el KPI de a uno.

## 6. Estados y transiciones (mismo criterio que el dashboard NCAP-R5)

- **Anuncio ≠ obra (R15)**: `declared → in_execution → completed` es el ciclo de la
  OBRA y solo avanza con evidencia datada de la ejecución municipal (fotografía con
  fecha, acto publicable). El relevamiento NO mueve el ciclo de obra.
- **Relevamiento**: mueve el tramo a `community_validated` (corroboración
  comunitaria del relevamiento de practicantes) o `verified` (verificación técnica:
  organismo, estudio o inspección documentada — ADR-035). La comunidad corrobora,
  NUNCA verifica (R15).
- El KPI `tramos_con_relevamiento` cuenta `community_validated | verified` — el
  MISMO predicado que el dashboard de accesibilidad (verdad única, sin divergencia).

## 7. Anti-PII (Ley 25.326 / ADR-027)

- Fotografías del TRAMO, nunca de personas: sin rostros, sin patentes legibles, sin
  frentes de viviendas con identificación de domicilio.
- Sin nombres de vecinos ni de practicantes en el registro: el autor vive como
  pseudónimo (`created_by_hash`).
- Sin datos de salud, discapacidad ni situación personal de ningún transeúnte — el
  instrumento observa el espacio, no a las personas (R5/ADR-036).

## 8. Canon de honestidad aplicado

R15 (nada simulado; sin dato verificado no se inventa), ADR-035 (procedencia
trazable de toda evidencia), ADR-036 (geo sensible: el relevamiento publica
observables del espacio público, jamás geometría sensible de custodia) y la
gobernanza R9/R15 del repositorio: GitHub acredita, la DH ratifica.

## 9. Verificación pública

El KPI se re-deriva del dominio en cada recompute del consumidor `vig003-kpi`
(patrón VIG-003: upsert idempotente, nunca incrementos): cualquier publicación es
verificable contra la tabla `features` (capa `sidewalks`, id `seed-f-tramo-*`)
en cualquier momento. El desglose por estado (`tramos_declared`,
`tramos_in_execution`, `tramos_completed`, `tramos_community_validated`,
`tramos_verified`) hace la cuenta auditable tramo por tramo.
