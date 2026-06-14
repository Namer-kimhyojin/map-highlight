import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LayerPanel } from './components/LayerPanel';
import { MapCanvas } from './components/MapCanvas';
import { ShortcutHelp } from './components/ShortcutHelp';
import { StatusBar } from './components/StatusBar';
import { StylePanel } from './components/StylePanel';
import { Toolbar } from './components/Toolbar';
import type { AdminFeatureCollection } from './types/geojson';
import type { MapStatus } from './types/map';
import { useProjectStore } from './store/useProjectStore';
import { downloadProject } from './utils/projectFile';
import { exportMapPng } from './utils/pngExport';
import { downloadSvg } from './utils/svgExport';
import { drawShortcutMap, isTypingTarget } from './utils/keyboardShortcuts';
import './styles.css';

export default function App() {
  const [adminGeoJson, setAdminGeoJson] = useState<AdminFeatureCollection | null>(null);
  const [status, setStatus] = useState<MapStatus | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const project = useProjectStore((state) => state.project);
  const clearSelection = useProjectStore((state) => state.clearSelection);
  const setDrawMode = useProjectStore((state) => state.setDrawMode);
  const setShapePointEditMode = useProjectStore((state) => state.setShapePointEditMode);
  const requestFitSelected = useProjectStore((state) => state.requestFitSelected);
  const setActiveShape = useProjectStore((state) => state.setActiveShape);
  const activeShapeId = useProjectStore((state) => state.activeShapeId);
  const selectedShapeIds = useProjectStore((state) => state.selectedShapeIds);
  const activeAdminCode = useProjectStore((state) => state.activeAdminCode);
  const removeSelectedShapes = useProjectStore((state) => state.removeSelectedShapes);
  const clearSelectedRegionStyles = useProjectStore((state) => state.clearSelectedRegionStyles);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      if (ctrlOrMeta && event.shiftKey && key === 's') {
        event.preventDefault();
        downloadSvg(project, adminGeoJson, mapElementRef.current);
        return;
      }
      if (ctrlOrMeta && event.shiftKey && key === 'p') {
        event.preventDefault();
        if (mapElementRef.current) exportMapPng(mapElementRef.current);
        return;
      }
      if (ctrlOrMeta && key === 's') {
        event.preventDefault();
        downloadProject(project);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDrawMode(undefined);
        setShapePointEditMode(false);
        setActiveShape(undefined);
        clearSelection();
        setShortcutHelpOpen(false);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (activeShapeId || selectedShapeIds.length > 0 || activeAdminCode || project.adminLayer.selectedCodes.length > 0) {
          event.preventDefault();
          if (activeAdminCode || project.adminLayer.selectedCodes.length > 0) clearSelectedRegionStyles();
          if (activeShapeId || selectedShapeIds.length > 0) removeSelectedShapes();
        }
        return;
      }
      if (key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        setShortcutHelpOpen((value) => !value);
        return;
      }
      if (key === 'f') {
        event.preventDefault();
        requestFitSelected();
        return;
      }
      if (key in drawShortcutMap) {
        event.preventDefault();
        setDrawMode(drawShortcutMap[key]);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeAdminCode,
    activeShapeId,
    adminGeoJson,
    clearSelectedRegionStyles,
    clearSelection,
    project,
    removeSelectedShapes,
    requestFitSelected,
    selectedShapeIds.length,
    setActiveShape,
    setDrawMode,
    setShapePointEditMode,
  ]);

  return (
    <div className="app">
      <Toolbar adminGeoJson={adminGeoJson} mapElement={mapElementRef.current} onOpenShortcuts={() => setShortcutHelpOpen(true)} />
      <main className={`workspace ${leftPanelOpen ? '' : 'left-collapsed'} ${rightPanelOpen ? '' : 'right-collapsed'}`}>
        {leftPanelOpen ? (
          <div className="panel-slot">
            <button className="panel-snap left" title="좌측 패널 접기" onClick={() => setLeftPanelOpen(false)}>
              <PanelLeftClose size={15} />
            </button>
            <LayerPanel adminGeoJson={adminGeoJson} />
          </div>
        ) : (
          <button className="panel-rail left-rail" title="좌측 패널 펼치기" onClick={() => setLeftPanelOpen(true)}>
            <PanelLeftOpen size={16} />
            <span>보기</span>
          </button>
        )}
        <div className="center-stage">
          <MapCanvas onAdminDataLoaded={setAdminGeoJson} onStatusChange={setStatus} mapElementRef={mapElementRef} />
        </div>
        {rightPanelOpen ? (
          <div className="panel-slot">
            <button className="panel-snap right" title="우측 패널 접기" onClick={() => setRightPanelOpen(false)}>
              <PanelRightClose size={15} />
            </button>
            <StylePanel adminGeoJson={adminGeoJson} />
          </div>
        ) : (
          <button className="panel-rail right-rail" title="우측 패널 펼치기" onClick={() => setRightPanelOpen(true)}>
            <PanelRightOpen size={16} />
            <span>도형</span>
          </button>
        )}
      </main>
      <StatusBar status={status} adminGeoJson={adminGeoJson} />
      <ShortcutHelp open={shortcutHelpOpen} onClose={() => setShortcutHelpOpen(false)} />
    </div>
  );
}
