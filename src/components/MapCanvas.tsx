import { useEffect, useRef, useState } from 'react';
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { union } from '@turf/union';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import Text from 'ol/style/Text';
import type React from 'react';
import type Map from 'ol/Map';
import type TileLayer from 'ol/layer/Tile';
import type { FeatureLike } from 'ol/Feature';
import type { Extent } from 'ol/extent';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { ProjectState } from '../types/project';
import { createBaseLayers } from '../map/basemap';
import { adminStyle, createAdminLayer } from '../map/adminLayer';
import { createDrawInteraction } from '../map/drawInteraction';
import { initMap } from '../map/initMap';
import { createMaskLayer, updateMaskLayer } from '../map/maskLayer';
import { createPointModifyInteraction } from '../map/modifyInteraction';
import { useProjectStore } from '../store/useProjectStore';
import type { AdminFeatureCollection } from '../types/geojson';
import type { IndustrialParkInfo } from '../types/project';
import type { MapStatus } from '../types/map';
import { shapeDefaultStyle } from '../store/useProjectStore';
import { getFeatureCode, getFeatureName } from '../utils/geojson';
import { loadAdminGeoJson } from '../utils/geojson';
import { hexToRgba } from '../utils/color';
import { createPatternCanvas, getStrokeDash, isDoubleStroke } from '../utils/stylePatterns';
import { loadIndustrialParks } from '../utils/industrialParks';
import 'ol/ol.css';

interface MapCanvasProps {
  onAdminDataLoaded: (data: AdminFeatureCollection | null) => void;
  onIndustrialParksLoaded: (data: IndustrialParkInfo[]) => void;
  onStatusChange: (status: MapStatus) => void;
  mapElementRef: React.MutableRefObject<HTMLDivElement | null>;
}

const geoJson = new GeoJSON();
const adminLevelLabel = {
  sido: '시도',
  sigungu: '시군구',
  emd: '읍면동',
};

interface HoverInfo {
  name: string;
  code: string;
  level: string;
  x: number;
  y: number;
  alignRight: boolean;
}

interface ContextMenuInfo {
  x: number;
  y: number;
  alignRight: boolean;
  alignBottom: boolean;
  lonLat: [number, number];
  target: 'admin' | 'shape' | 'map';
  name?: string;
  code?: string;
  shapeId?: string;
  extent?: Extent;
}

function shapeSelectionStyle(feature: FeatureLike, selectedShapeIds: string[], project: ProjectState) {
  const style = feature.get('style') ?? shapeDefaultStyle;
  const type = feature.getGeometry()?.getType();
  const selected = selectedShapeIds.includes(feature.get('id'));
  const fillPattern = type === 'LineString' ? undefined : createPatternCanvas(style);
  const baseStyle = new Style({
    fill: new Fill({ color: type === 'LineString' ? 'rgba(0,0,0,0)' : fillPattern ?? hexToRgba(style.fillColor, style.fillOpacity) }),
    stroke: new Stroke({ color: hexToRgba(style.strokeColor, style.strokeOpacity), width: style.strokeWidth, lineDash: getStrokeDash(style) }),
  });
  const styles = [];
  if (selected && project.highlight.selectedHalo) {
    styles.push(
    new Style({
      stroke: new Stroke({
        color: hexToRgba(project.highlight.haloColor, 0.96),
        width: Math.max(style.strokeWidth + project.highlight.haloWidth, style.strokeWidth + 2),
        lineDash: getStrokeDash(style),
      }),
    }),
    );
  }
  if (selected) {
    styles.push(
    new Style({
      stroke: new Stroke({
        color: 'rgba(17,24,39,0.96)',
        lineDash: getStrokeDash(style) ?? [7, 4],
        width: Math.max(style.strokeWidth + 3, 4.5),
      }),
    }),
    );
  }
  styles.push(baseStyle);
  if (isDoubleStroke(style)) {
    styles.push(new Style({
      stroke: new Stroke({
        color: 'rgba(255,255,255,0.96)',
        lineDash: getStrokeDash(style),
        width: Math.max(1, style.strokeWidth * 0.45),
      }),
    }));
  }
  return styles;
}

export function MapCanvas({ onAdminDataLoaded, onIndustrialParksLoaded, onStatusChange, mapElementRef }: MapCanvasProps) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const baseLayerRefs = useRef<TileLayer[]>([]);
  const adminLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const selectedFillLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const compareLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const industrialLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const shapeLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const hoverLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const maskLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const drawInteractionRef = useRef<import('ol/interaction/Draw').default | null>(null);
  const modifyRef = useRef<import('ol/interaction/Modify').default | null>(null);
  const moveendSaveTimeoutRef = useRef<number | undefined>(undefined);
  const pendingFitSelectedRef = useRef(false);
  const [loadMessage, setLoadMessage] = useState('행정구역 데이터를 불러오는 중');
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuInfo | null>(null);
  const project = useProjectStore((state) => state.project);
  const adminLevelRef = useRef(project.adminLayer.level);
  const drawMode = useProjectStore((state) => state.drawMode);
  const activeShapeId = useProjectStore((state) => state.activeShapeId);
  const selectedShapeIds = useProjectStore((state) => state.selectedShapeIds);
  const shapePointEditMode = useProjectStore((state) => state.shapePointEditMode);
  const fitSelectedRequest = useProjectStore((state) => state.fitSelectedRequest);
  const toggleSelectedCode = useProjectStore((state) => state.toggleSelectedCode);
  const selectSingleCode = useProjectStore((state) => state.selectSingleCode);
  const setMapView = useProjectStore((state) => state.setMapView);
  const addShape = useProjectStore((state) => state.addShape);
  const updateShape = useProjectStore((state) => state.updateShape);
  const setActiveShape = useProjectStore((state) => state.setActiveShape);
  const toggleSelectedShape = useProjectStore((state) => state.toggleSelectedShape);
  const setActiveAdminCode = useProjectStore((state) => state.setActiveAdminCode);
  const selectIndustrialPark = useProjectStore((state) => state.selectIndustrialPark);
  const mapToneFilter = project.map.tone.preserveOriginalColors
    ? 'none'
    : [
        `brightness(${project.map.tone.brightness})`,
        `contrast(${project.map.tone.contrast})`,
        `saturate(${project.map.tone.saturation})`,
        `grayscale(${project.map.tone.grayscale})`,
        `sepia(${project.map.tone.sepia})`,
        `hue-rotate(${project.map.tone.hueRotate}deg)`,
      ].join(' ');
  const mapToneStyle = { '--map-tone-filter': mapToneFilter } as React.CSSProperties;
  const selectedCodeKey = project.adminLayer.selectedCodes.join('|');

  function fitSelectedFeatures(duration = 450) {
    const map = mapRef.current;
    const source = adminLayerRef.current?.getSource();
    const selectedCodes = useProjectStore.getState().project.adminLayer.selectedCodes;
    if (!map || !source || selectedCodes.length === 0) return false;

    const selected = source
      .getFeatures()
      .filter((feature) => selectedCodes.includes(getFeatureCode(feature.getProperties())));
    if (!selected.length) return false;

    const extent = selected.reduce((acc, feature) => {
      const geometryExtent = feature.getGeometry()?.getExtent();
      if (!geometryExtent) return acc;
      if (!acc) return [...geometryExtent] as Extent;
      acc[0] = Math.min(acc[0], geometryExtent[0]);
      acc[1] = Math.min(acc[1], geometryExtent[1]);
      acc[2] = Math.max(acc[2], geometryExtent[2]);
      acc[3] = Math.max(acc[3], geometryExtent[3]);
      return acc;
    }, null as Extent | null);

    if (!extent) return false;
    map.getView().fit(extent, { padding: [80, 80, 80, 80], duration, maxZoom: 13 });
    return true;
  }

  function industrialParkStyle(feature: FeatureLike) {
    const id = String(feature.get('id') ?? '');
    const kind = feature.get('kind') as 'area' | 'marker' | undefined;
    const displayMode = project.industrialLayer.displayMode;
    if (kind === 'area' && displayMode === 'marker') return undefined;
    if (kind === 'marker' && displayMode === 'area') return undefined;

    const selected = project.industrialLayer.selectedId === id;
    const markerColor = hexToRgba(project.industrialLayer.markerColor, selected ? 1 : project.industrialLayer.markerOpacity);
    if (kind === 'area') {
      const areaStyle = new Style({
        fill: new Fill({ color: hexToRgba(project.industrialLayer.markerColor, selected ? 0.26 : 0.14) }),
        stroke: new Stroke({
          color: hexToRgba(project.industrialLayer.markerColor, selected ? 0.98 : 0.74),
          width: selected ? 3.2 : 2,
          lineDash: selected ? undefined : [7, 4],
        }),
        text: project.industrialLayer.labelVisible || selected
          ? new Text({
              text: String(feature.get('name') ?? ''),
              font: `${selected ? '800' : '700'} ${selected ? 13 : 11}px Pretendard, Arial, sans-serif`,
              fill: new Fill({ color: selected ? '#0F172A' : '#334155' }),
              stroke: new Stroke({ color: 'rgba(255,255,255,0.96)', width: 4 }),
              padding: [2, 4, 2, 4],
            })
          : undefined,
      });
      if (!selected) return areaStyle;
      return [
        new Style({
          stroke: new Stroke({ color: 'rgba(255,255,255,0.95)', width: 7 }),
        }),
        areaStyle,
      ];
    }

    const haloColor = selected ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.96)';
    return new Style({
      image: new CircleStyle({
        radius: selected ? 9 : 6,
        fill: new Fill({ color: markerColor }),
        stroke: new Stroke({ color: haloColor, width: selected ? 4 : 2.5 }),
      }),
      text: project.industrialLayer.labelVisible || selected
        ? new Text({
            text: String(feature.get('name') ?? ''),
            offsetY: -18,
            font: `${selected ? '800' : '700'} ${selected ? 13 : 11}px Pretendard, Arial, sans-serif`,
            fill: new Fill({ color: selected ? '#0F172A' : '#334155' }),
            stroke: new Stroke({ color: 'rgba(255,255,255,0.95)', width: 4 }),
            padding: [2, 4, 2, 4],
          })
        : undefined,
    });
  }

  useEffect(() => {
    adminLevelRef.current = project.adminLayer.level;
  }, [project.adminLayer.level]);

  useEffect(() => {
    if (!localRef.current || mapRef.current) return;
    mapElementRef.current = localRef.current;
    const baseLayers = createBaseLayers(project.map.baseMap, project.map.content);
    const adminLayer = createAdminLayer(project);
    const selectedFillLayer = new VectorLayer({
      source: new VectorSource(),
      visible: project.adminLayer.visible,
      style: (feature) => {
        const style = feature.get('style') ?? project.adminLayer.style;
        return new Style({
          fill: new Fill({ color: createPatternCanvas(style) ?? hexToRgba(style.fillColor, style.fillOpacity) }),
        });
      },
    });
    const compareLayer = new VectorLayer({ source: new VectorSource(), visible: project.compareLayer.enabled });
    const industrialLayer = new VectorLayer({
      source: new VectorSource(),
      visible: project.industrialLayer.visible,
      style: industrialParkStyle,
    });
    const shapeLayer = new VectorLayer({
      source: new VectorSource(),
      style: (feature) => shapeSelectionStyle(feature, selectedShapeIds, project),
    });
    const hoverLayer = new VectorLayer({
      source: new VectorSource(),
      style: [
        new Style({
          fill: new Fill({ color: 'rgba(37,99,235,0.13)' }),
          stroke: new Stroke({ color: 'rgba(255,255,255,0.96)', width: 7 }),
        }),
        new Style({
          stroke: new Stroke({ color: 'rgba(37,99,235,0.96)', lineDash: [8, 4], width: 3 }),
        }),
      ],
    });
    const maskLayer = createMaskLayer(project);
    const map = initMap(localRef.current, project, [...baseLayers, compareLayer, selectedFillLayer, adminLayer, industrialLayer, shapeLayer, maskLayer, hoverLayer]);
    baseLayerRefs.current = baseLayers;
    adminLayerRef.current = adminLayer;
    selectedFillLayerRef.current = selectedFillLayer;
    compareLayerRef.current = compareLayer;
    industrialLayerRef.current = industrialLayer;
    shapeLayerRef.current = shapeLayer;
    hoverLayerRef.current = hoverLayer;
    maskLayerRef.current = maskLayer;
    mapRef.current = map;

    map.on('click', (event) => {
      let handledShape = false;
      map.forEachFeatureAtPixel(event.pixel, (featureLike, layer) => {
        const feature = featureLike as Feature;
        if (layer === shapeLayer) {
          const id = feature.get('id');
          const browserEvent = event.originalEvent as MouseEvent;
          const multiSelect = browserEvent.ctrlKey || browserEvent.metaKey || browserEvent.shiftKey;
          if (multiSelect) {
            toggleSelectedShape(id);
            useProjectStore.getState().setShapePointEditMode(false);
          }
          else {
            setActiveShape(id);
            setActiveAdminCode(undefined);
          }
          handledShape = true;
          return true;
        }
        return false;
      });
      if (handledShape || drawMode) return;
      let handledIndustrialPark = false;
      map.forEachFeatureAtPixel(event.pixel, (featureLike, layer) => {
        if (layer !== industrialLayer) return false;
        const id = String((featureLike as Feature).get('id') ?? '');
        if (id) {
          selectIndustrialPark(id);
          setActiveShape(undefined);
          setActiveAdminCode(undefined);
          handledIndustrialPark = true;
        }
        return true;
      }, { hitTolerance: 8 });
      if (handledIndustrialPark) return;
      map.forEachFeatureAtPixel(event.pixel, (featureLike, layer) => {
        if (layer !== adminLayer) return false;
        const code = getFeatureCode((featureLike as Feature).getProperties());
        const browserEvent = event.originalEvent as MouseEvent;
        const multiSelect = browserEvent.ctrlKey || browserEvent.metaKey || browserEvent.shiftKey;
        if (code) {
          if (!multiSelect) setActiveShape(undefined);
          if (multiSelect) toggleSelectedCode(code);
          else selectSingleCode(code);
        }
        return true;
      });
    });

    map.on('pointermove', (event) => {
      if (event.dragging) {
        setHoverInfo(null);
        return;
      }
      let nextHover: HoverInfo | null = null;
      const hoverSource = hoverLayer.getSource();
      hoverSource?.clear();
      map.forEachFeatureAtPixel(
        event.pixel,
        (featureLike, layer) => {
          if (layer !== adminLayer) return false;
          const feature = featureLike as Feature;
          const properties = feature.getProperties();
          const size = map.getSize() ?? [0, 0];
          nextHover = {
            name: getFeatureName(properties),
            code: getFeatureCode(properties),
            level: adminLevelLabel[adminLevelRef.current],
            x: event.pixel[0],
            y: event.pixel[1],
            alignRight: event.pixel[0] > size[0] - 230,
          };
          const hoverFeature = feature.clone();
          hoverFeature.setProperties(properties);
          hoverSource?.addFeature(hoverFeature);
          return true;
        },
        { hitTolerance: 3 },
      );
      map.getTargetElement().style.cursor = nextHover ? 'pointer' : '';
      setHoverInfo(nextHover);
    });

    const handlePointerLeave = () => {
      map.getTargetElement().style.cursor = '';
      hoverLayer.getSource()?.clear();
      setHoverInfo(null);
    };
    map.getViewport().addEventListener('pointerleave', handlePointerLeave);

    const handleContextMenu = (browserEvent: MouseEvent) => {
      browserEvent.preventDefault();
      const pixel = map.getEventPixel(browserEvent);
      const coordinate = map.getCoordinateFromPixel(pixel);
      const lonLat = toLonLat(coordinate) as [number, number];
      const size = map.getSize() ?? [0, 0];
      const baseMenu = {
        x: pixel[0],
        y: pixel[1],
        alignRight: pixel[0] > size[0] - 250,
        alignBottom: pixel[1] > size[1] - 260,
        lonLat: [Number(lonLat[0].toFixed(6)), Number(lonLat[1].toFixed(6))] as [number, number],
      };
      let nextMenu: ContextMenuInfo | null = null;
      map.forEachFeatureAtPixel(pixel, (featureLike, layer) => {
        const feature = featureLike as Feature;
        if (layer === shapeLayer) {
          const shapeId = feature.get('id');
          nextMenu = {
            ...baseMenu,
            target: 'shape',
            shapeId,
            name: feature.get('name') ?? '도형',
            extent: feature.getGeometry()?.getExtent(),
          };
          return true;
        }
        return false;
      }, { hitTolerance: 3 });
      if (!nextMenu) {
        map.forEachFeatureAtPixel(pixel, (featureLike, layer) => {
          if (layer !== adminLayer) return false;
          const feature = featureLike as Feature;
          const properties = feature.getProperties();
          nextMenu = {
            ...baseMenu,
            target: 'admin',
            code: getFeatureCode(properties),
            name: getFeatureName(properties),
            extent: feature.getGeometry()?.getExtent(),
          };
          return true;
        }, { hitTolerance: 3 });
      }
      setContextMenu(nextMenu ?? { ...baseMenu, target: 'map' });
    };
    map.getViewport().addEventListener('contextmenu', handleContextMenu);

    map.on('moveend', () => {
      const view = map.getView();
      const center = toLonLat(view.getCenter() ?? fromLonLat(project.map.center)) as [number, number];
      const zoom = view.getZoom() ?? project.map.zoom;
      onStatusChange({ center: view.getCenter() ?? [0, 0], lonLat: center, zoom });
      window.clearTimeout(moveendSaveTimeoutRef.current);
      moveendSaveTimeoutRef.current = window.setTimeout(() => {
        setMapView([Number(center[0].toFixed(6)), Number(center[1].toFixed(6))], Number(zoom.toFixed(2)));
      }, 700);
    });

    return () => {
      window.clearTimeout(moveendSaveTimeoutRef.current);
      map.getViewport().removeEventListener('pointerleave', handlePointerLeave);
      map.getViewport().removeEventListener('contextmenu', handleContextMenu);
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const source = industrialLayerRef.current?.getSource();
    if (!source) return;
    loadIndustrialParks()
      .then((parks) => {
        if (cancelled) return;
        source.clear();
        parks.forEach((park) => {
          if (park.geometry.type !== 'Point') {
            const areaFeature = geoJson.readFeature(
              { type: 'Feature', properties: { id: park.id, kind: 'area', name: park.name, type: park.type, address: park.address, municipality: park.municipality }, geometry: park.geometry },
              { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
            ) as Feature;
            areaFeature.set('id', park.id);
            areaFeature.set('kind', 'area');
            source.addFeature(areaFeature);
          }
          const markerFeature = new Feature({
            geometry: new Point(fromLonLat(park.coordinates)),
            id: park.id,
            kind: 'marker',
            name: park.name,
            type: park.type,
            address: park.address,
            municipality: park.municipality,
          });
          markerFeature.set('id', park.id);
          markerFeature.set('kind', 'marker');
          source.addFeature(markerFeature);
        });
        onIndustrialParksLoaded(parks);
      })
      .catch(() => onIndustrialParksLoaded([]));
    return () => {
      cancelled = true;
    };
  }, [onIndustrialParksLoaded]);

  useEffect(() => {
    function closeContextMenu() {
      setContextMenu(null);
    }
    function closeByEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setContextMenu(null);
    }
    window.addEventListener('click', closeContextMenu);
    window.addEventListener('keydown', closeByEscape);
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('keydown', closeByEscape);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const source = adminLayerRef.current?.getSource();
    if (!source) return;
    setLoadMessage('행정구역 데이터를 불러오는 중');
    loadAdminGeoJson(project.adminLayer.level)
      .then((data) => {
        if (cancelled) return;
        source.clear();
        const features = geoJson.readFeatures(data, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
        source.addFeatures(features);
        onAdminDataLoaded(data);
        setLoadMessage(`${features.length.toLocaleString()}개 행정구역 로드됨`);
        if (pendingFitSelectedRef.current && fitSelectedFeatures()) {
          pendingFitSelectedRef.current = false;
          return;
        }
        if (features.length && useProjectStore.getState().project.adminLayer.selectedCodes.length === 0) {
          const extent = source.getExtent();
          if (extent) {
            mapRef.current?.getView().fit(extent as Extent, { padding: [40, 40, 40, 40], duration: 450, maxZoom: 12 });
          }
        }
      })
      .catch((error: Error) => setLoadMessage(error.message));
    return () => {
      cancelled = true;
    };
  }, [project.adminLayer.level, onAdminDataLoaded]);

  useEffect(() => {
    let cancelled = false;
    const source = compareLayerRef.current?.getSource();
    if (!source) return;
    source.clear();
    if (!project.compareLayer.enabled) return;
    loadAdminGeoJson(project.compareLayer.level)
      .then((data) => {
        if (cancelled) return;
        const features = geoJson.readFeatures(data, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
        source.addFeatures(features);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [project.compareLayer.enabled, project.compareLayer.level]);

  useEffect(() => {
    adminLayerRef.current?.setVisible(project.adminLayer.visible);
    adminLayerRef.current?.setStyle(adminStyle(project));
    adminLayerRef.current?.changed();
    selectedFillLayerRef.current?.setVisible(project.adminLayer.visible);
    selectedFillLayerRef.current?.setStyle((feature) => {
      const style = feature.get('style') ?? project.adminLayer.style;
      return new Style({
        fill: new Fill({ color: createPatternCanvas(style) ?? hexToRgba(style.fillColor, style.fillOpacity) }),
      });
    });
    compareLayerRef.current?.setVisible(project.compareLayer.enabled);
    compareLayerRef.current?.setStyle((feature) => new Style({
      fill: new Fill({ color: `rgba(255,255,255,${project.compareLayer.fillOpacity})` }),
      stroke: new Stroke({
        color: hexToRgba(project.compareLayer.strokeColor, project.compareLayer.strokeOpacity),
        width: project.compareLayer.strokeWidth,
      }),
      text: project.compareLayer.labels
        ? new Text({
            text: getFeatureName(feature.getProperties()),
            font: `700 ${project.compareLayer.labelFontSize}px ${project.compareLayer.labelFontFamily}, Pretendard, Arial, sans-serif`,
            fill: new Fill({ color: hexToRgba(project.compareLayer.labelFontColor, project.compareLayer.labelOpacity) }),
            stroke: new Stroke({ color: hexToRgba(project.compareLayer.labelBackgroundColor, project.compareLayer.labelBackgroundOpacity), width: project.compareLayer.labelBackground ? 5 : 3 }),
            backgroundFill: project.compareLayer.labelBackground
              ? new Fill({ color: hexToRgba(project.compareLayer.labelBackgroundColor, project.compareLayer.labelBackgroundOpacity) })
              : undefined,
            padding: project.compareLayer.labelBackground ? [2, 5, 2, 5] : undefined,
          })
        : undefined,
    }));
    compareLayerRef.current?.changed();
    industrialLayerRef.current?.setVisible(project.industrialLayer.visible);
    industrialLayerRef.current?.setStyle(industrialParkStyle);
    industrialLayerRef.current?.changed();
    const highlightedCodes = new Set([...project.adminLayer.selectedCodes, ...Object.keys(project.adminLayer.regionStyles)]);
    const selectedFeatures =
      adminLayerRef.current
        ?.getSource()
        ?.getFeatures()
        .filter((feature) => highlightedCodes.has(getFeatureCode(feature.getProperties()))) ?? [];
    const selectedFillSource = selectedFillLayerRef.current?.getSource();
    selectedFillSource?.clear();
    if (selectedFillSource && selectedFeatures.length > 0) {
      const groupedFeatures = new globalThis.Map<string, Feature[]>();
      selectedFeatures.forEach((feature) => {
        const code = getFeatureCode(feature.getProperties());
        const style = project.adminLayer.regionStyles[code] ?? project.adminLayer.style;
        const key = [
          style.fillColor,
          style.fillOpacity,
          style.strokeColor,
          style.strokeOpacity,
          style.strokeWidth,
          style.strokeDasharray ?? '',
        ].join('|');
        groupedFeatures.set(key, [...(groupedFeatures.get(key) ?? []), feature as Feature]);
      });
      groupedFeatures.forEach((features: Feature[]) => {
        const code = getFeatureCode(features[0].getProperties());
        const style = project.adminLayer.regionStyles[code] ?? project.adminLayer.style;
        const collection = geoJson.writeFeaturesObject(features, {
          dataProjection: 'EPSG:3857',
          featureProjection: 'EPSG:3857',
        }) as FeatureCollection<Polygon | MultiPolygon>;
        const merged = collection.features.length > 1 ? union(collection) : collection.features[0];
        const featureObject = merged ?? collection.features[0];
        if (!featureObject) return;
        const fillFeature = geoJson.readFeature(featureObject, {
          dataProjection: 'EPSG:3857',
          featureProjection: 'EPSG:3857',
        }) as Feature;
        fillFeature.set('style', style);
        selectedFillSource.addFeature(fillFeature);
      });
    }
    selectedFillLayerRef.current?.changed();
    if (maskLayerRef.current) updateMaskLayer(maskLayerRef.current as VectorLayer<VectorSource<FeatureLike>>, selectedFeatures, project);
  }, [project.adminLayer, project.highlight, project.labels, project.compareLayer, project.industrialLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    baseLayerRefs.current.forEach((layer) => map.removeLayer(layer));
    const nextLayers = createBaseLayers(project.map.baseMap, project.map.content);
    nextLayers.forEach((layer) => layer.setOpacity(project.map.baseOpacity));
    nextLayers
      .slice()
      .reverse()
      .forEach((layer) => map.getLayers().insertAt(0, layer));
    baseLayerRefs.current = nextLayers;
  }, [project.map.baseMap, project.map.content]);

  useEffect(() => {
    baseLayerRefs.current.forEach((layer) => layer.setOpacity(project.map.baseOpacity));
  }, [project.map.baseOpacity]);

  useEffect(() => {
    const source = shapeLayerRef.current?.getSource();
    if (!source) return;
    source.clear();
    project.customShapes.forEach((shape) => {
      const feature = geoJson.readFeature(
        { type: 'Feature', properties: { id: shape.id, name: shape.name, style: shape.style }, geometry: shape.geometry },
        { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
      ) as Feature;
      feature.set('id', shape.id);
      feature.set('style', shape.style);
      source.addFeature(feature);
    });
  }, [project.customShapes]);

  useEffect(() => {
    shapeLayerRef.current?.setStyle((feature) => shapeSelectionStyle(feature, selectedShapeIds, project));
    shapeLayerRef.current?.changed();
  }, [selectedShapeIds, project.customShapes, project.highlight]);

  useEffect(() => {
    const map = mapRef.current;
    const source = shapeLayerRef.current?.getSource();
    if (!map || !source) return;
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }
    if (!drawMode) return;
    const draw = createDrawInteraction(source, drawMode);
    draw.on('drawend', (event) => {
      const id = `shape-${Date.now()}`;
      const geometry = geoJson.writeGeometryObject(event.feature.getGeometry()!, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });
      event.feature.set('id', id);
      event.feature.set('style', shapeDefaultStyle);
      addShape({
        id,
        type: drawMode,
        name: `강조도형 ${project.customShapes.length + 1}`,
        geometry,
        style: shapeDefaultStyle,
      });
      setActiveShape(id);
    });
    map.addInteraction(draw);
    drawInteractionRef.current = draw;
    return () => {
      map.removeInteraction(draw);
    };
  }, [drawMode, addShape, setActiveShape, project.customShapes.length]);

  useEffect(() => {
    const map = mapRef.current;
    const source = shapeLayerRef.current?.getSource();
    if (!map || !source) return;
    if (modifyRef.current) {
      map.removeInteraction(modifyRef.current);
      modifyRef.current = null;
    }
    if (!shapePointEditMode || !activeShapeId || drawMode) return;
    const feature = source.getFeatures().find((item) => item.get('id') === activeShapeId);
    if (!feature) return;
    const modify = createPointModifyInteraction(new Collection([feature]));
    modify.on('modifyend', (event) => {
      event.features.forEach((modifiedFeature) => {
        const id = modifiedFeature.get('id');
        if (!id || !modifiedFeature.getGeometry()) return;
        const geometry = geoJson.writeGeometryObject(modifiedFeature.getGeometry()!, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        updateShape(id, { geometry });
      });
    });
    map.addInteraction(modify);
    modifyRef.current = modify;
    return () => {
      map.removeInteraction(modify);
      if (modifyRef.current === modify) modifyRef.current = null;
    };
  }, [activeShapeId, drawMode, project.customShapes, shapePointEditMode, updateShape]);

  useEffect(() => {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    const current = toLonLat(view.getCenter() ?? [0, 0]);
    if (Math.abs(current[0] - project.map.center[0]) > 0.01 || Math.abs(current[1] - project.map.center[1]) > 0.01) {
      view.setCenter(fromLonLat(project.map.center));
    }
    if (Math.abs((view.getZoom() ?? 0) - project.map.zoom) > 0.25) view.setZoom(project.map.zoom);
  }, [project.map.center, project.map.zoom]);

  useEffect(() => {
    if (!fitSelectedRequest || project.adminLayer.selectedCodes.length === 0) return;
    pendingFitSelectedRef.current = true;
    if (fitSelectedFeatures()) {
      pendingFitSelectedRef.current = false;
    }
  }, [fitSelectedRequest, selectedCodeKey]);

  useEffect(() => {
    const selectedId = project.industrialLayer.selectedId;
    if (!selectedId || !mapRef.current) return;
    const feature = industrialLayerRef.current?.getSource()?.getFeatures().find((item) => item.get('id') === selectedId);
    const geometry = feature?.getGeometry();
    if (!geometry) return;
    mapRef.current.getView().fit(geometry.getExtent(), { padding: [120, 120, 120, 120], duration: 420, maxZoom: 13 });
  }, [project.industrialLayer.selectedId]);

  function closeContextMenu() {
    setContextMenu(null);
  }

  function fitContextTarget() {
    if (!contextMenu?.extent || !mapRef.current) return;
    mapRef.current.getView().fit(contextMenu.extent, { padding: [80, 80, 80, 80], duration: 350, maxZoom: 14 });
    closeContextMenu();
  }

  function copyText(text: string) {
    void navigator.clipboard?.writeText(text);
    setLoadMessage('클립보드에 복사됨');
    window.setTimeout(() => setLoadMessage(`${adminLayerRef.current?.getSource()?.getFeatures().length.toLocaleString() ?? 0}개 행정구역 로드됨`), 1200);
    closeContextMenu();
  }

  function addPointAtContext() {
    if (!contextMenu) return;
    const id = `shape-${Date.now()}`;
    addShape({
      id,
      type: 'point',
      name: `표시점 ${project.customShapes.length + 1}`,
      geometry: { type: 'Point', coordinates: contextMenu.lonLat },
      style: shapeDefaultStyle,
    });
    setActiveShape(id);
    closeContextMenu();
  }

  function selectContextTarget(additive = false) {
    if (!contextMenu) return;
    if (contextMenu.target === 'shape' && contextMenu.shapeId) {
      if (additive) toggleSelectedShape(contextMenu.shapeId);
      else {
        setActiveShape(contextMenu.shapeId);
        setActiveAdminCode(undefined);
      }
    }
    if (contextMenu.target === 'admin' && contextMenu.code) {
      if (additive) toggleSelectedCode(contextMenu.code);
      else {
        setActiveShape(undefined);
        selectSingleCode(contextMenu.code);
      }
    }
    closeContextMenu();
  }

  function removeContextTarget() {
    if (!contextMenu) return;
    if (contextMenu.target === 'shape' && contextMenu.shapeId) {
      useProjectStore.getState().removeShape(contextMenu.shapeId);
    }
    if (contextMenu.target === 'admin' && contextMenu.code) {
      selectSingleCode(contextMenu.code);
      window.setTimeout(() => useProjectStore.getState().clearSelectedRegionStyles(), 0);
    }
    closeContextMenu();
  }

  return (
    <div className="map-shell">
      <div
        ref={localRef}
        className={project.map.tone.preserveOriginalColors ? 'map-canvas map-tone-preserved' : 'map-canvas map-tone-adjusted'}
        style={mapToneStyle}
      />
      <div className="map-load-message">{loadMessage}</div>
      {hoverInfo && (
        <div
          className={hoverInfo.alignRight ? 'admin-hover-card align-right' : 'admin-hover-card'}
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          <strong>{hoverInfo.name}</strong>
          <span>{hoverInfo.level}{hoverInfo.code ? ` · ${hoverInfo.code}` : ''}</span>
        </div>
      )}
      {contextMenu && (
        <div
          className={[
            'map-context-menu',
            contextMenu.alignRight ? 'align-right' : '',
            contextMenu.alignBottom ? 'align-bottom' : '',
          ].join(' ')}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          role="menu"
        >
          <div className="context-menu-title">
            <strong>{contextMenu.target === 'map' ? '지도 위치' : contextMenu.name}</strong>
            <span>{contextMenu.lonLat[0].toFixed(5)}, {contextMenu.lonLat[1].toFixed(5)}</span>
          </div>
          {contextMenu.target !== 'map' && (
            <>
              <button onClick={() => selectContextTarget(false)}>{contextMenu.target === 'shape' ? '도형 선택' : '지역 선택'}</button>
              <button onClick={() => selectContextTarget(true)}>추가 선택</button>
              <button onClick={fitContextTarget}>대상으로 확대</button>
              <button onClick={() => copyText(contextMenu.target === 'admin' ? `${contextMenu.name ?? ''}${contextMenu.code ? ` (${contextMenu.code})` : ''}` : contextMenu.name ?? '도형')}>
                이름 복사
              </button>
              <button className="danger-menu-item" onClick={removeContextTarget}>
                {contextMenu.target === 'shape' ? '도형 삭제' : '지역 속성 제거'}
              </button>
            </>
          )}
          {contextMenu.target === 'map' && (
            <>
              <button onClick={addPointAtContext}>여기에 점 도형 추가</button>
              <button onClick={() => copyText(`${contextMenu.lonLat[0].toFixed(6)}, ${contextMenu.lonLat[1].toFixed(6)}`)}>좌표 복사</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
