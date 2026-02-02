import {
  generateNewPhysmapData, getPhysmap, getCellSize, getGenerationScale,
  setGenerationScale, MIN_GENERATION_SCALE, MAX_GENERATION_SCALE,
  GENERATION_SCALE_STEP, generateAndStorePoliticalMap, getPoliticalMap,
  getCurrentMapSeeds, updateGenerationSettings, setMapPreset, getRiverNetwork,
  recalculatePhysmapColors,
  applyTerrainBrush, recalculateColorsInRect 
} from './map-data.js';
import * as renderer from './renderer.js';
import * as camera from './camera.js';
import * as ui from './ui-controller.js';
import { initializeInfoPopup, showInfoPopup, hideInfoPopup, isPopupOpenForNation } from './info-popup.js';

let isPoliticalMapVisible = false;
let isSettlementsLayerVisible = false;
let isPoiLayerVisible = false;
let is3dViewEnabled = true;
let currentPalette = 'default';
let nationLookup = null;

let isEditorMode = false;
let currentBrushType = 'OCEAN';
let currentBrushSize = 3;

function getSeedFromURL() {
    const params = new URLSearchParams(window.location.search);
    const seedString = params.get('seed');
    if (!seedString) return null;

    try {
        const seeds = JSON.parse(atob(seedString.trim()));
        if (seeds && seeds.terrain) {
            return seeds;
        }
        console.warn('Invalid seed format in URL.');
        return null;
    } catch (error) {
        console.error('Failed to parse seed from URL:', error);
        return null;
    }
}

function updateURLWithSeed(seeds) {
    if (!seeds) return;
    const seedString = btoa(JSON.stringify(seeds));
    const url = new URL(window.location);
    url.searchParams.set('seed', seedString);
    window.history.replaceState({}, '', url);
}

function updateNationColor(nationId, newColor) {
    if (!nationLookup) return;
    const nation = nationLookup.get(nationId);
    if (nation) {
        nation.color = newColor;
        renderer.markPoliticalCachesDirty();
    }
}

function fullStateUpdate() {
    const physmap = getPhysmap();
    const politicalMap = getPoliticalMap();
    camera.initializeCamera({
        width: physmap ? physmap[0].length : 0,
        height: physmap ? physmap.length : 0,
        cellSize: getCellSize()
    });
    ui.updateLayerButtonsState(isPoliticalMapVisible, isSettlementsLayerVisible, isPoiLayerVisible, is3dViewEnabled, !!politicalMap, !!physmap);
    ui.updateGenerationScaleDisplay(getGenerationScale());
}

function regenerateMapAndView(seeds = null) {
    ui.showLoading();
    setTimeout(() => {
        generateNewPhysmapData(seeds, currentPalette);
        updateURLWithSeed(getCurrentMapSeeds());

        nationLookup = null; 
        camera.resetCamera();
        isPoliticalMapVisible = false;
        isSettlementsLayerVisible = false;
        isPoiLayerVisible = false;
        hideInfoPopup();
        renderer.markAllCachesDirty();
        fullStateUpdate();
        ui.hideLoading();
    }, 50); 
}

function regeneratePoliticalLayerViewOnly() {
    if (!getPhysmap()) return; 
    ui.showLoading();
    setTimeout(() => {
        if (generateAndStorePoliticalMap()) {
            const politicalData = getPoliticalMap();
            if (politicalData && politicalData.nations) {
                nationLookup = new Map(politicalData.nations.map(n => [n.id, n]));
            }
            isPoliticalMapVisible = true;
            isSettlementsLayerVisible = true;
            isPoiLayerVisible = true;
            hideInfoPopup(); 
        }
        renderer.markPoliticalCachesDirty();
        fullStateUpdate();
        ui.hideLoading();
    }, 50);
}

function handlePaletteChange(newPalette) {
    if (currentPalette === newPalette || !getPhysmap()) return;
    
    currentPalette = newPalette;
    
    recalculatePhysmapColors(newPalette);

    renderer.markAllCachesDirty();
}

function handleEditorDraw(e) {
    if (!isEditorMode) return;
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    
    const { worldX, worldY } = camera.screenToWorld(e.clientX, e.clientY, canvas);
    const cellSize = getCellSize();
    const gridX = Math.floor(worldX / cellSize);
    const gridY = Math.floor(worldY / cellSize);

    const dirtyRect = applyTerrainBrush(gridX, gridY, currentBrushSize, currentBrushType);
    
    if (dirtyRect) {
        recalculateColorsInRect(dirtyRect, currentPalette);
        renderer.updateTerrainPart(dirtyRect);
    }
}


const callbacks = {
    onGenerateMap: () => regenerateMapAndView(),
    onPresetChange: (preset) => {
        setMapPreset(preset);
        regenerateMapAndView(getCurrentMapSeeds());
    },
    onDownloadMap: () => {
        const currentPhysmap = getPhysmap();
        if (!currentPhysmap) return;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const mapDataHeight = currentPhysmap.length;
        const mapDataWidth = currentPhysmap[0].length;
        const downloadCellPixelSize = 3;
        tempCanvas.width = mapDataWidth * downloadCellPixelSize;
        tempCanvas.height = mapDataHeight * downloadCellPixelSize;
        tempCtx.imageSmoothingEnabled = false;

        renderer.drawCompleteMap(tempCtx, currentPhysmap, getPoliticalMap(), getRiverNetwork(), {
            cellSize: downloadCellPixelSize,
            drawBaseTerrain: true,
            drawRivers: true,
            draw3dEdges: is3dViewEnabled,
            drawPoliticalLayer: isPoliticalMapVisible,
            drawRoads: isSettlementsLayerVisible,
            drawNationNames: isPoliticalMapVisible
        });

        const link = document.createElement('a');
        link.download = 'fantasy-map.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    },
    onGenerationZoomIn: () => {
        const currentGenScale = getGenerationScale();
        if (currentGenScale < MAX_GENERATION_SCALE) {
            setGenerationScale(currentGenScale + GENERATION_SCALE_STEP);
            regenerateMapAndView(getCurrentMapSeeds());
        }
    },
    onGenerationZoomOut: () => {
        const currentGenScale = getGenerationScale();
        if (currentGenScale > MIN_GENERATION_SCALE) {
            setGenerationScale(currentGenScale - GENERATION_SCALE_STEP);
            regenerateMapAndView(getCurrentMapSeeds());
        }
    },
    onCopySeed: () => {
        const seeds = getCurrentMapSeeds();
        if (!seeds) return;
        const seedString = btoa(JSON.stringify(seeds));
        navigator.clipboard.writeText(seedString).then(() => {
            const copySeedButton = document.getElementById('copy-seed');
            const originalText = copySeedButton.textContent;
            copySeedButton.textContent = 'Copied!';
            setTimeout(() => { copySeedButton.textContent = originalText; }, 2000);
        }).catch(err => console.error('Could not copy seed to clipboard', err));
    },
    onLoadSeed: (seedString) => {
        if (!seedString) {
            alert('Please paste a seed into the input field first.');
            return;
        }
        try {
            const seeds = JSON.parse(atob(seedString.trim()));
            if (seeds && seeds.terrain) regenerateMapAndView(seeds);
            else throw new Error('Invalid seed format.');
        } catch (error) {
            console.error('Failed to load seed:', error);
            alert('The provided seed is invalid or corrupted.');
        }
    },
    onLayerToggle: (layerType) => {
        if (!getPhysmap()) return;
        const needsData = !getPoliticalMap();

        if (needsData) {
            regeneratePoliticalLayerViewOnly();
        } else {
            if (layerType === 'political') {
                isPoliticalMapVisible = !isPoliticalMapVisible;
                if (!isPoliticalMapVisible) hideInfoPopup();
            }
            if (layerType === 'settlements') {
                isSettlementsLayerVisible = !isSettlementsLayerVisible;
            }
            if (layerType === 'poi') {
                isPoiLayerVisible = !isPoiLayerVisible;
            }
            fullStateUpdate();
        }
    },
    onToggle3dView: () => {
        is3dViewEnabled = !is3dViewEnabled;
        renderer.markAllCachesDirty();
        fullStateUpdate();
    },
    onPaletteChange: handlePaletteChange,
    onSliderChange: (settings, isPhysmapChange) => {
        updateGenerationSettings(settings);
        if (isPhysmapChange) {
            regenerateMapAndView(getCurrentMapSeeds());
        } else {
            regeneratePoliticalLayerViewOnly();
        }
    },
    onZoom: camera.zoom,
    onPan: camera.pan,
    onMapClick: (event, canvas) => {
        if (!isPoliticalMapVisible) return;
        const politicalData = getPoliticalMap();
        if (!politicalData || !nationLookup) return;
        
        const { worldX, worldY } = camera.screenToWorld(event.clientX, event.clientY, canvas);
        const gridX = Math.floor(worldX / getCellSize());
        const gridY = Math.floor(worldY / getCellSize());

        if (gridX < 0 || gridX >= politicalData.mapGrid[0].length || gridY < 0 || gridY >= politicalData.mapGrid.length) return;
        
        const clickedNationId = politicalData.mapGrid[gridY]?.[gridX]?.nationId;
        if (typeof clickedNationId === 'number' && !isPopupOpenForNation(clickedNationId)) {
            showInfoPopup(nationLookup.get(clickedNationId), event);
        }
    },
    
    onToggleEditor: () => {
        isEditorMode = !isEditorMode;
        
        const tools = document.getElementById('editor-tools');
        const btn = document.getElementById('toggle-editor-mode');
        if (tools) tools.style.display = isEditorMode ? 'block' : 'none';
        if (btn) btn.textContent = isEditorMode ? 'Disable Edit Mode' : 'Enable Edit Mode';
        
        if (isEditorMode) {
            isPoliticalMapVisible = false;
            isSettlementsLayerVisible = false;
            isPoiLayerVisible = false;
            hideInfoPopup();
        }
        fullStateUpdate();
    },
    onBrushSizeChange: (val) => {
        currentBrushSize = parseInt(val, 10);
    },
    onBrushTypeChange: (type) => {
        currentBrushType = type;
    },
    onRecalcWorld: () => {
        regeneratePoliticalLayerViewOnly();
    },
    isEditorMode: () => isEditorMode,
    onEditorDraw: handleEditorDraw
};

document.addEventListener('DOMContentLoaded', () => {
    const canvas = renderer.initializeRenderer();
    if (!canvas) return;

    ui.initializeUI(callbacks);
    initializeInfoPopup({ onColorChange: updateNationColor });
    setGenerationScale(1.0);
    
    const seedFromURL = getSeedFromURL();
    regenerateMapAndView(seedFromURL); 

    renderer.startRenderLoop(() => ({ isPoliticalMapVisible, isSettlementsLayerVisible, isPoiLayerVisible, is3dViewEnabled }));

    window.addEventListener('resize', () => {
        camera.onResize();
    });
});