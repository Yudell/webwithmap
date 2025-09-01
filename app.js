// app.js

import {
  generateNewPhysmapData, getPhysmap, getCellSize, getGenerationScale,
  setGenerationScale, MIN_GENERATION_SCALE, MAX_GENERATION_SCALE,
  GENERATION_SCALE_STEP, generateAndStorePoliticalMap, getPoliticalMap,
  getCurrentMapSeeds, updateGenerationSettings 
} from './map-data.js';
import * as renderer from './renderer.js';
import * as camera from './camera.js';
import * as ui from './ui-controller.js';
import { initializeInfoPopup, showInfoPopup, hideInfoPopup, isPopupOpenForNation } from './info-popup.js';

let isPoliticalMapVisible = false;
let isSettlementsLayerVisible = false;
let nationLookup = null;
let resizeTimeout;

function updateNationColor(nationId, newColor) {
    if (!nationLookup) return;
    const nation = nationLookup.get(nationId);
    if (nation) {
        nation.color = newColor;
        // --- ИЗМЕНЕНО: Инвалидируем только политический кэш ---
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
    ui.updateLayerButtonsState(isPoliticalMapVisible, isSettlementsLayerVisible, !!politicalMap, !!physmap);
    ui.updateGenerationScaleDisplay(getGenerationScale());
}

function regenerateMapAndView(seeds = null) {
    ui.showLoading();
    setTimeout(() => {
        generateNewPhysmapData(seeds);
        nationLookup = null; 
        camera.resetCamera();
        isPoliticalMapVisible = false;
        isSettlementsLayerVisible = false;
        hideInfoPopup();
        // --- ИЗМЕНЕНО: Инвалидируем все кэши ---
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
            hideInfoPopup(); 
        }
        // --- ИЗМЕНЕНО: Инвалидируем политический и поселенческий кэши ---
        renderer.markPoliticalCachesDirty();
        fullStateUpdate();
        ui.hideLoading();
    }, 50);
}

const callbacks = {
    onGenerateMap: () => regenerateMapAndView(),
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

        // --- ИЗМЕНЕНО: Теперь для скачивания мы рисуем все слои последовательно ---
        renderer.drawCompleteMap(tempCtx, currentPhysmap, getPoliticalMap(), {
            cellSize: downloadCellPixelSize,
            drawBaseTerrain: true, // Начинаем с чистого ландшафта
            drawPoliticalLayer: isPoliticalMapVisible,
            drawRoads: isSettlementsLayerVisible,
            drawSettlements: isSettlementsLayerVisible,
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

        // --- ИЗМЕНЕНО: Логика стала значительно проще ---
        const needsData = !getPoliticalMap();

        if (needsData) {
            // Если данных нет, генерируем их (это также обновит кэши)
            regeneratePoliticalLayerViewOnly();
        } else {
            // Если данные есть, просто переключаем флаг видимости.
            // Перерисовка кэша не нужна, render loop сам подхватит изменение.
            if (layerType === 'political') {
                isPoliticalMapVisible = !isPoliticalMapVisible;
                if (!isPoliticalMapVisible) hideInfoPopup();
            }
            if (layerType === 'settlements') {
                isSettlementsLayerVisible = !isSettlementsLayerVisible;
            }
            // Обновляем только состояние кнопок в UI
            fullStateUpdate();
        }
    },
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
            showInfoPopup(nationLookup.get(clickedNationId));
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const canvas = renderer.initializeRenderer();
    if (!canvas) return;

    ui.initializeUI(callbacks);
    initializeInfoPopup({ onColorChange: updateNationColor });
    setGenerationScale(1.0);
    
    regenerateMapAndView(); 

    renderer.startRenderLoop(() => ({ isPoliticalMapVisible, isSettlementsLayerVisible }));

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => regenerateMapAndView(getCurrentMapSeeds()), 250);
    });
});