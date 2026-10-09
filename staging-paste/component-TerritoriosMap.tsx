import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  ControlPosition,
  InfoWindow,
  Map,
  type MapCameraChangedEvent,
  type MapCameraProps,
  MapControl,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { Territorio } from '../App';
import type { SpatialGeometryRecord } from '../data/federatedModel';

export type MapGeometryLayerKey = 'assets' | 'problems' | 'public_space';

export interface LayerGroupConfig {
  key: MapGeometryLayerKey;
  label: string;
  shortLabel: string;
  description: string;
  accentColor: string;
}

export const MAP_GEOMETRY_LAYER_GROUPS: LayerGroupConfig[] = [
  {
    key: 'assets',
    label: 'Assets (Activos)',
    shortLabel: 'Assets',
    description: 'Activos hídricos, productivos y corredores sanitarios verificados',
    accentColor: '#2e9e5b',
  },
  {
    key: 'problems',
    label: 'Problems (Problemáticas)',
    shortLabel: 'Problems',
    description: 'Corredores con vulnerabilidad operativa o reportes críticos',
    accentColor: '#f59e0b',
  },
  {
    key: 'public_space',
    label: 'Public Space (Espacio Público)',
    shortLabel: 'Public Space',
    description: 'Microcuencas urbanas, espacio cívico y redes comunitarias',
    accentColor: '#38bdf8',
  },
];

export function classifySpatialGeometryLayer(
  geom: SpatialGeometryRecord,
): MapGeometryLayerKey {
  if (geom.domain === 'problems') {
    return 'problems';
  }
  if (geom.domain === 'public_space' || geom.domain === 'community') {
    return 'public_space';
  }
  return 'assets';
}

export interface ResolvedTerritorioPlace {
  territorioId: string;
  territorioNombre: string;
  provincia: string;
  activo: boolean;
  placeId: string;
  displayName: string;
  formattedAddress: string;
  location: { lat: number; lng: number };
}

interface MarkerItemProps {
  item: ResolvedTerritorioPlace;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}

function TerritorioMarker({ item, isSelected, onSelect }: MarkerItemProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={item.location}
        title={item.displayName}
        onClick={() => onSelect(item.territorioId)}
      >
        <Pin
          background={item.activo ? '#2e9e5b' : '#6b7280'}
          borderColor={item.activo ? '#1b6338' : '#374151'}
          glyphColor="#ffffff"
        />
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => onSelect(null)} maxWidth={260}>
          <div style={{ color: '#1a1a1a', fontSize: '0.85rem', lineHeight: 1.4 }}>
            <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
              {item.territorioNombre}
            </strong>
            <div>{item.formattedAddress}</div>
            <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', opacity: 0.8 }}>
              Estado: <strong>{item.activo ? 'Activo' : 'Inactivo'}</strong> · Place:{' '}
              <code>{item.displayName}</code>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface PlacesResolverProps {
  territorios: Territorio[];
  focusedTerritorioId: string | null;
  onSelectMarker: (id: string | null) => void;
  selectedMarkerId: string | null;
}

function PlacesResolver({
  territorios,
  focusedTerritorioId,
  onSelectMarker,
  selectedMarkerId,
}: PlacesResolverProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [resolved, setResolved] = useState<ResolvedTerritorioPlace[]>([]);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!placesLib || territorios.length === 0) {
      setResolved([]);
      return;
    }

    let cancelled = false;
    setResolving(true);

    const resolveAll = async () => {
      const nextResolved: ResolvedTerritorioPlace[] = [];

      for (const t of territorios) {
        try {
          const query = `${t.nombre}, ${t.provincia}, Argentina`;
          const { places } = await placesLib.Place.searchByText({
            textQuery: query,
            fields: ['id', 'displayName', 'location', 'formattedAddress'],
            maxResultCount: 1,
          });

          const first = places?.[0];
          const loc = first?.location;
          if (first && loc) {
            nextResolved.push({
              territorioId: t.id,
              territorioNombre: t.nombre,
              provincia: t.provincia,
              activo: t.activo,
              placeId: first.id,
              displayName: first.displayName ?? t.nombre,
              formattedAddress: first.formattedAddress ?? `${t.nombre}, ${t.provincia}`,
              location: {
                lat: typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat),
                lng: typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng),
              },
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes('OVER_QUERY_LIMIT') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('QuotaExceededError') ||
            msg.includes('429')
          ) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
        }
      }

      if (!cancelled) {
        setResolved(nextResolved);
        setResolving(false);
        if (map && nextResolved.length > 0 && !focusedTerritorioId) {
          map.setCenter(nextResolved[0].location);
          map.setZoom(7);
        }
      }
    };

    void resolveAll();

    return () => {
      cancelled = true;
    };
  }, [placesLib, territorios, map, focusedTerritorioId]);

  useEffect(() => {
    if (!map || !focusedTerritorioId) return;
    const match = resolved.find((r) => r.territorioId === focusedTerritorioId);
    if (match) {
      map.setCenter(match.location);
      map.setZoom(11);
      onSelectMarker(match.territorioId);
    }
  }, [focusedTerritorioId, resolved, map, onSelectMarker]);

  return (
    <>
      {resolving && (
        <div className="map-status-pill">Geocodificando territorios vía Places API (New)…</div>
      )}
      {resolved.map((item) => (
        <TerritorioMarker
          key={item.territorioId}
          item={item}
          isSelected={selectedMarkerId === item.territorioId}
          onSelect={onSelectMarker}
        />
      ))}
    </>
  );
}

interface PostgisGeometriesLayerProps {
  spatialGeometries: SpatialGeometryRecord[];
  focusedGeometry: SpatialGeometryRecord | null;
  onSelectGeometry?: (geom: SpatialGeometryRecord) => void;
}

function PostgisGeometriesLayer({
  spatialGeometries,
  focusedGeometry,
  onSelectGeometry,
}: PostgisGeometriesLayerProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib) return;

    const overlays: Array<{ setMap: (m: unknown) => void }> = [];

    for (const g of spatialGeometries) {
      if (!g.realCoords || g.realCoords.length === 0) continue;
      const isFocused = focusedGeometry?.id === g.id;

      if (g.geometryType === 'Polygon') {
        const poly = new mapsLib.Polygon({
          paths: g.realCoords,
          strokeColor: isFocused ? '#f5c842' : g.color || '#2e9e5b',
          strokeOpacity: 0.9,
          strokeWeight: isFocused ? 3 : 2,
          fillColor: g.color || '#2e9e5b',
          fillOpacity: isFocused ? 0.35 : 0.18,
          map,
        });
        if (onSelectGeometry && 'addListener' in poly && typeof poly.addListener === 'function') {
          poly.addListener('click', () => onSelectGeometry(g));
        }
        overlays.push(poly);
      } else if (g.geometryType === 'LineString') {
        const line = new mapsLib.Polyline({
          path: g.realCoords,
          geodesic: true,
          strokeColor: isFocused ? '#f5c842' : g.color || '#38bdf8',
          strokeOpacity: 0.95,
          strokeWeight: isFocused ? 4 : 3,
          map,
        });
        if (onSelectGeometry && 'addListener' in line && typeof line.addListener === 'function') {
          line.addListener('click', () => onSelectGeometry(g));
        }
        overlays.push(line);
      }
    }

    return () => {
      for (const ov of overlays) {
        ov.setMap(null);
      }
    };
  }, [map, mapsLib, spatialGeometries, focusedGeometry, onSelectGeometry]);

  useEffect(() => {
    if (!map || !focusedGeometry || focusedGeometry.realCoords.length === 0) return;
    const firstPt = focusedGeometry.realCoords[0];
    map.setCenter(firstPt);
    map.setZoom(12);
  }, [map, focusedGeometry]);

  return null;
}

interface TerritoriosMapProps {
  territorios: Territorio[];
  focusedTerritorioId: string | null;
  spatialGeometries?: SpatialGeometryRecord[];
  focusedGeometry?: SpatialGeometryRecord | null;
}

export function TerritoriosMap({
  territorios,
  focusedTerritorioId,
  spatialGeometries = [],
  focusedGeometry = null,
}: TerritoriosMapProps) {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [clickedGeometry, setClickedGeometry] =
    useState<SpatialGeometryRecord | null>(null);
  const [cameraProps, setCameraProps] = useState<MapCameraProps>({
    center: { lat: -31.5375, lng: -68.5364 },
    zoom: 6,
  });

  // Visibilidad independiente de las 3 capas de geometrías espaciales: Assets, Problems, Public Space
  const [layerVisibility, setLayerVisibility] = useState<
    Record<MapGeometryLayerKey, boolean>
  >({
    assets: true,
    problems: true,
    public_space: true,
  });

  // Cuando se enfoca explícitamente una geometría desde otro panel, aseguramos que su capa esté visible
  useEffect(() => {
    if (!focusedGeometry) return;
    const groupKey = classifySpatialGeometryLayer(focusedGeometry);
    setLayerVisibility((prev) =>
      prev[groupKey] ? prev : { ...prev, [groupKey]: true },
    );
    setClickedGeometry(focusedGeometry);
  }, [focusedGeometry]);

  const toggleGeometryLayer = useCallback((key: MapGeometryLayerKey) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const setAllGeometryLayers = useCallback((visible: boolean) => {
    setLayerVisibility({
      assets: visible,
      problems: visible,
      public_space: visible,
    });
  }, []);

  // Conteo por capa y filtrado de geometrías visibles en el mapa
  const layerCounts = useMemo<Record<MapGeometryLayerKey, number>>(() => {
    const counts: Record<MapGeometryLayerKey, number> = {
      assets: 0,
      problems: 0,
      public_space: 0,
    };
    for (const g of spatialGeometries) {
      const k = classifySpatialGeometryLayer(g);
      counts[k] += 1;
    }
    return counts;
  }, [spatialGeometries]);

  const visibleSpatialGeometries = useMemo(
    () =>
      spatialGeometries.filter((g) => {
        const k = classifySpatialGeometryLayer(g);
        return layerVisibility[k];
      }),
    [spatialGeometries, layerVisibility],
  );

  const handleCameraChange = useCallback((ev: MapCameraChangedEvent) => {
    setCameraProps(ev.detail);
  }, []);

  const activeInspectionGeometry = clickedGeometry ?? focusedGeometry;

  if (!apiKey) {
    return (
      <section className="card" data-state="error">
        <h2>Mapa Territorial — Google Maps Platform</h2>
        <p className="error">Falta configurar VITE_GOOGLE_MAPS_API_KEY</p>
      </section>
    );
  }

  return (
    <section className="card" data-state="ok">
      <div className="section-header">
        <div>
          <span className="kicker-text">
            Cartografía Geoespacial Real · Places API (New) + Capas PostGIS SRID=4326 (EV-010)
          </span>
          <h2>Mapa Territorial y Geometrías PostGIS — Google Maps Platform</h2>
          <p className="section-caption">
            Ubicaciones resueltas con Places API (New), Advanced Markers y control independiente de visibilidad por capa espacial: <strong>Assets</strong>, <strong>Problems</strong> y <strong>Public Space</strong>.
          </p>
        </div>

        {/* Barra de control rápido sincronizada con el MapControl interno */}
        <div
          className="filter-group"
          role="group"
          aria-label="Conmutar capas de geometría espacial en el mapa"
        >
          {MAP_GEOMETRY_LAYER_GROUPS.map((group) => {
            const isOn = layerVisibility[group.key];
            return (
              <button
                key={group.key}
                type="button"
                aria-pressed={isOn}
                className={isOn ? 'btn-filter active' : 'btn-filter'}
                onClick={() => toggleGeometryLayer(group.key)}
                title={group.description}
              >
                <span
                  className="layer-color-dot"
                  style={{ backgroundColor: group.accentColor }}
                />
                {group.label} ({layerCounts[group.key]})
              </button>
            );
          })}
        </div>
      </div>

      {activeInspectionGeometry && (
        <div className="territory-meta tabular-nums" style={{ marginTop: '0.45rem' }}>
          Geometría seleccionada: <strong>{activeInspectionGeometry.title}</strong> · Capa:{' '}
          <strong>
            {MAP_GEOMETRY_LAYER_GROUPS.find(
              (l) => l.key === classifySpatialGeometryLayer(activeInspectionGeometry),
            )?.label ?? activeInspectionGeometry.domain}
          </strong>{' '}
          · Tipo: <code>ST_{activeInspectionGeometry.geometryType}</code> · Métrica:{' '}
          <strong>{activeInspectionGeometry.metricLabel}</strong>
        </div>
      )}

      <div className="map-wrapper">
        <APIProvider
          apiKey={apiKey}
          language="es"
          region="AR"
          libraries={['places', 'marker']}
        >
          <Map
            {...cameraProps}
            onCameraChanged={handleCameraChange}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            gestureHandling="greedy"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Custom Control UI posicionado sobre el mapa mediante MapControl (@vis.gl/react-google-maps) */}
            <MapControl position={ControlPosition.TOP_RIGHT}>
              <div
                className="map-layer-control-card tabular-nums"
                role="region"
                aria-label="Control de capas espaciales PostGIS"
              >
                <div className="map-layer-control-header">
                  <span className="map-layer-control-title">
                    Capas Espaciales PostGIS
                  </span>
                  <span className="map-layer-control-count">
                    {visibleSpatialGeometries.length}/{spatialGeometries.length} visibles
                  </span>
                </div>

                <div className="map-layer-toggle-list">
                  {MAP_GEOMETRY_LAYER_GROUPS.map((group) => {
                    const isChecked = layerVisibility[group.key];
                    const count = layerCounts[group.key];
                    return (
                      <label
                        key={group.key}
                        className={
                          isChecked
                            ? 'map-layer-toggle-item active'
                            : 'map-layer-toggle-item'
                        }
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleGeometryLayer(group.key)}
                        />
                        <span
                          className="layer-color-dot"
                          style={{ backgroundColor: group.accentColor }}
                        />
                        <span className="map-layer-toggle-label">
                          {group.label}
                        </span>
                        <span className="map-layer-toggle-badge">{count}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="map-layer-control-actions">
                  <button
                    type="button"
                    className="map-layer-mini-btn"
                    onClick={() => setAllGeometryLayers(true)}
                  >
                    Mostrar todas
                  </button>
                  <button
                    type="button"
                    className="map-layer-mini-btn"
                    onClick={() => setAllGeometryLayers(false)}
                  >
                    Ocultar todas
                  </button>
                </div>
              </div>
            </MapControl>

            <PlacesResolver
              territorios={territorios}
              focusedTerritorioId={focusedTerritorioId}
              selectedMarkerId={selectedMarkerId}
              onSelectMarker={setSelectedMarkerId}
            />
            <PostgisGeometriesLayer
              spatialGeometries={visibleSpatialGeometries}
              focusedGeometry={focusedGeometry}
              onSelectGeometry={setClickedGeometry}
            />
          </Map>
        </APIProvider>
      </div>
    </section>
  );
}
