-- Seed NVIG-R5 (#172): catálogo de fuentes y procedencia del Valle de
-- Iglesia. Extiende el catálogo global ADR-035 (patrón NODO-CAU R2
-- #138/#147, PR #200) con 16 fuentes específicas del valle verificadas en
-- las tandas 1-3 de investigación (verificación 2026-10-13, trazas
-- #167-#174). El catálogo NO contiene datos del territorio: nunca un
-- feature real sin fuente citable (R15). Reutiliza la tabla global
-- fuentes y el pipeline de ingestas SIN cambios de rutas ni de openapi.
-- Multinodo: IGN/INDEC/BAHRA/Georef/UNIDE/INPRES/MapBiomas/IDERA ya
-- registrados por seed-fuentes-cau.sql sirven también al valle (join
-- por código, nunca por nombre; depto Iglesia = 70049). Congelada: API
-- ramsac.ign.gob.ar (posible defacement 2026-10-11, lección #147).
-- Estados honestos: ninguna fuente se marca disponible sin
-- verificación; ley_2400_t/inaes/turismo_sj quedan requiere_solicitud
-- (padrón o instrumento no encontrados). Idempotencia: ON CONFLICT (key)
-- DO NOTHING; sellos por hash único con payload source seed-vig-r5.

INSERT INTO fuentes (id, key, organismo, nombre, url, tipo, licencia, estado, cautela, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'municipio_iglesia', 'Municipalidad de Iglesia', 'Ordenanza 1906-C.D.-2020 — distritos del departamento Iglesia', NULL, 'documento', NULL, 'disponible', 'Enumera 5 distritos (Villa Iglesia, Las Flores, Tudcum, Rodeo, Angualasto) SIN Bella Vista: Bella Vista es sexto distrito por decisión DH 2026-10-13, no por la ordenanza. Paraje ≠ distrito: BAHRA/Georef son la fuente de verdad de parajes.', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'decreto_2154_2009', 'Poder Ejecutivo Nacional (Boletín Oficial)', 'Decreto 2.154/2009 — LHN yacimiento arqueológico Angualasto', NULL, 'documento', NULL, 'disponible', 'Art. 1 verificado (yacimiento ~30°3S 68°10O); art. 2 (MHN aldea) pendiente de cotejo. Ubicación exacta JAMÁS publicable: modo protegido ADR-036, ficha pública sin punto propio del yacimiento.', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'ley_24790', 'Congreso de la Nación Argentina', 'Ley 24.790 (1997) — MHN: conjunto de Achango', NULL, 'documento', NULL, 'disponible', 'Declaratoria MHN del conjunto (capilla y alfombras de más de 350 años). Estado de conservación crítico reportado 2026; restauración figura como Proyecto en el PEDL 2024: la norma NO acredita el estado actual. Sin punto sensible publicado (ADR-036).', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'ley_25291', 'Congreso de la Nación Argentina', 'Ley 25.291 (2000) — MHN: molinos harineros de Jáchal e Iglesia', NULL, 'documento', NULL, 'disponible', 'MHN conjunto binodal: Molino Escobar (Jáchal) + Molino de Bella Vista (Iglesia) — no separar la declaratoria de su alcance. Geometría del molino solo con punto publicable (ADR-036).', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'leyes_patrimonio_sj', 'Legislatura de San Juan', 'Ley 7.300 (2002) declaratoria provincial + Ley 411-F marco (Digesto SJ)', NULL, 'documento', NULL, 'disponible', 'Registro provincial NUNCA fusionado con la nacional (Decreto 2.154/2009): son registros separados con alcances distintos (declaratoria provincial vs LHN nacional).', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'conicet_garcia_2024', 'CONICET (García 2024)', 'Estudio arqueológico del tramo Angualasto–Colangüil — CHS 5(1) 12-23', 'https://doi.org/10.58598/cuhes.1415472', 'documento', NULL, 'disponible', 'DOI verificado (10.58598/cuhes.1415472, 15-06-2024). Documenta el tramo PERO no sostiene atribución inca: qhapaq_nan_status=not_demonstrated_inca. El nodo modela capas de movilidad sucesivas, nunca una ruta inca continua.', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'michieli_2016', 'Michieli, C. T. (2016)', 'Fechados radiocarbónicos con código de laboratorio (p. 6)', NULL, 'documento', NULL, 'disponible', 'La Fortuna 8.160±160 GaK-4192; Los Morrillos 8.465±240 GX-1826 y 8.255±170 GaK-4195: TODOS de Calingasta — dating_locality=not_verified_for_iglesia; prohibido iglesia.occupation_start=8500 BP.', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'pedl_iglesia', 'Gobierno de San Juan', 'PEDL Iglesia 2018 + Informe de Avance 2024 (107 componentes)', NULL, 'documento', NULL, 'disponible', 'Estado de componentes heterogéneo (en ejecución / suspendido / Proyecto): la restauración de las capillas de Achango y Santo Domingo figura como Proyecto. Citar el estado exacto por componente; nunca prometer obras.', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'cna_2018', 'INDEC', 'Censo Nacional Agropecuario 2018 — departamento Iglesia', NULL, 'descarga', NULL, 'disponible', '758 ha implantadas con alcance departamento (scope=departamento), NO distrito: no desagregar por debajo de la escala publicada.', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'hidrometria_sj', 'Hidráulica (Gobierno de San Juan)', 'Aforos semanales del Río Blanco', NULL, 'documento', NULL, 'disponible', 'Hidrometría del río ≠ capacidad del embalse: capacity_status del dique Cuesta del Viento = unknown (sin aforo de plazas ni protocolos verificados).', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'ley_826_g', 'Legislatura de San Juan', 'Ley 826-G — navegación del dique Cuesta del Viento (08:00-19:00)', NULL, 'documento', NULL, 'disponible', 'Guía oficial de seguridad encontrada (safety_evidence_status=official_guidance_found: VHF canal 16, guardavidas operativo abril 2026). Ocupación hotelera (90% enero 2026) NO es aforo: capacity_status=unknown.', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'viales_rn150', 'Viales (San Juan) + DNV', 'RN 150 y Paso de Agua Negra — estado del corredor', NULL, 'documento', NULL, 'disponible', 'Paso habilitado 25-11-2024 (80% pavimento), gestión provincial 20 años (convenio 08-2026). Estado del paso DINÁMICO (cierre estacional por hielo; cerrado 01-10-2026): verificar vigencia antes de cada publicación.', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'conectividad_agua_negra', 'Banco Interamericano de Desarrollo (BID)', 'Documentos del proyecto túnel Agua Negra (EBITAN 2009, RG-O1655, ICR 2024)', NULL, 'documento', NULL, 'disponible', 'ICR BID (03-2024) confirma que el túnel NO estaba construido: construction_status=unverified, last_confirmed_not_built=2024-03. SIN obra iniciada ni cronograma público a sep-2026: nunca prometer plazos.', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'ley_2400_t', 'Ministerio de Turismo de San Juan', 'Ley 2400-T — habilitación de prestadores turísticos provinciales', NULL, 'documento', NULL, 'requiere_solicitud', 'Padrón desagregado de Iglesia NO encontrado (93/158/377 prestadores provinciales sin desagregación): la ingesta de prestadores exige el registro por prestador; distinguido ≠ habilitado.', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'inaes', 'INAES', 'Registro de cooperativas — Fecoagro Tudcum y Valles Iglesianos', NULL, 'descarga', NULL, 'requiere_solicitud', 'Registros constatados en la documentación de las cooperativas (Fecoagro Tudcum 28.777/659, const. 12-08-2004; Valles Iglesianos 11.463/170, const. 25-08-1987) PERO INAES sin verificación en vivo: verificar registro y vigencia antes de publicar; sin PII de socios (Ley 25.326).', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'),
  (gen_random_uuid()::text, 'turismo_sj', 'Ministerio de Turismo de San Juan', 'Oferta turística provincial — FIT 2026 y ruta Mujeres de Montaña', NULL, 'documento', NULL, 'requiere_solicitud', 'Ruta declarada públicamente (municipal + provincial 29-09-2026, FIT) pero instrument_status=not_found: los 12 emprendimientos quedan candidate_provider unverified; identidad/domicilio solo con consentimiento (ADR-027, Ley 25.326).', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z')
ON CONFLICT (key) DO NOTHING;

-- Sellos fuente.registrada (patrón seed-cau-r2: events_raw única fuente
-- de verdad; hash fijo seed-fuente-<key> → idempotencia; payload source
-- 'seed-vig-r5' distingue el origen del sello; sin PII).
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'fuente.registrada',
       jsonb_build_object('key', f.key, 'organismo', f.organismo, 'source', 'seed-vig-r5'),
       'seed-fuente-' || f.key, f.created_at, f.created_at
FROM fuentes f
WHERE f.key IN ('municipio_iglesia', 'decreto_2154_2009', 'ley_24790', 'ley_25291', 'leyes_patrimonio_sj', 'conicet_garcia_2024', 'michieli_2016', 'pedl_iglesia', 'cna_2018', 'hidrometria_sj', 'ley_826_g', 'viales_rn150', 'conectividad_agua_negra', 'ley_2400_t', 'inaes', 'turismo_sj')
ON CONFLICT (hash) DO NOTHING;
