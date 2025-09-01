// renderer.js
import { getPhysmap, getPoliticalMap, getCellSize } from './map-data.js';
import * as camera from './camera.js';
import { terrainType } from './terrain-types.js';

let canvas = null;
let ctx = null;

// --- ИЗМЕНЕНО: Заменяем два кэша на три именованных слоя ---
let terrainCache = null;
let politicalCache = null;
let settlementsCache = null;

// --- ИЗМЕНЕНО: Флаги "грязи" для каждого слоя ---
let isTerrainCacheDirty = true;
let isPoliticalCacheDirty = true;
let isSettlementsCacheDirty = true;

export function initializeRenderer() {
    canvas = document.getElementById('map-canvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return null;
    }
    ctx = canvas.getContext('2d');
    return canvas;
}

// --- ИЗМЕНЕНО: Функции для инвалидации конкретных кэшей ---
export function markAllCachesDirty() {
    isTerrainCacheDirty = true;
    isPoliticalCacheDirty = true;
    isSettlementsCacheDirty = true;
}

export function markPoliticalCachesDirty() {
    isPoliticalCacheDirty = true;
    // Поселения зависят от политической карты, поэтому их кэш тоже нужно обновить
    isSettlementsCacheDirty = true;
}

function updateCanvasSize() {
    const deviceRatio = window.devicePixelRatio || 1;
    const newWidth = window.innerWidth * deviceRatio;
    const newHeight = window.innerHeight * deviceRatio;

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
    }
}

// --- ИЗМЕНЕНО: Функция теперь создаёт и управляет тремя кэшами ---
function ensureCacheCanvases(width, height) {
    const createIfNeeded = (c) => c || document.createElement('canvas');

    terrainCache = createIfNeeded(terrainCache);
    politicalCache = createIfNeeded(politicalCache);
    settlementsCache = createIfNeeded(settlementsCache);

    [terrainCache, politicalCache, settlementsCache].forEach(c => {
        if (c.width !== width || c.height !== height) {
            c.width = width;
            c.height = height;
        }
    });
}

// --- НОВЫЕ: Функции для обновления каждого слоя кэша по отдельности ---

function updateTerrainCache(physmap, cachePixelSize) {
    if (!isTerrainCacheDirty || !physmap) return;
    
    const cacheCtx = terrainCache.getContext('2d');
    cacheCtx.imageSmoothingEnabled = false;
    cacheCtx.clearRect(0, 0, terrainCache.width, terrainCache.height);
    
    drawCompleteMap(cacheCtx, physmap, null, {
        cellSize: cachePixelSize,
        drawBaseTerrain: true,
        drawPoliticalLayer: false,
        drawRoads: false, // Дороги не рисуем на этом слое
        drawSettlements: false,
        drawNationNames: false,
    });

    isTerrainCacheDirty = false;
}

function updatePoliticalCache(physmap, politicalData, cachePixelSize) {
    if (!isPoliticalCacheDirty) return;

    const cacheCtx = politicalCache.getContext('2d');
    cacheCtx.imageSmoothingEnabled = false;
    cacheCtx.clearRect(0, 0, politicalCache.width, politicalCache.height);

    if (!politicalData || !physmap) {
        isPoliticalCacheDirty = false;
        return;
    }
    
    drawCompleteMap(cacheCtx, physmap, politicalData, {
        cellSize: cachePixelSize,
        drawBaseTerrain: false, // НЕ рисуем базовый террейн, только цвета и границы
        drawPoliticalLayer: true,
        drawRoads: false, // Дороги не рисуем на этом слое
        drawSettlements: false,
        drawNationNames: false
    });

    isPoliticalCacheDirty = false;
}

function updateSettlementsCache(politicalData, cachePixelSize) {
    if (!isSettlementsCacheDirty) return;

    const cacheCtx = settlementsCache.getContext('2d');
    cacheCtx.imageSmoothingEnabled = false;
    cacheCtx.clearRect(0, 0, settlementsCache.width, settlementsCache.height);

    if (!politicalData) {
        isSettlementsCacheDirty = false;
        return;
    }

    // Рисуем дороги, если они есть
    if (politicalData.roadNetwork && politicalData.roadNetwork.length > 0) {
        cacheCtx.strokeStyle = '#4a3b2a'; // Цвет дороги
        cacheCtx.lineWidth = Math.max(1, cachePixelSize * 0.5); // Ширина дороги
        cacheCtx.lineCap = 'round';
        cacheCtx.lineJoin = 'round';
        
        politicalData.roadNetwork.forEach(path => {
            if (path.length < 2) return;
            
            cacheCtx.beginPath();
            cacheCtx.moveTo(
                path[0].x * cachePixelSize + cachePixelSize / 2,
                path[0].y * cachePixelSize + cachePixelSize / 2
            );
            
            for (let i = 1; i < path.length; i++) {
                cacheCtx.lineTo(
                    path[i].x * cachePixelSize + cachePixelSize / 2,
                    path[i].y * cachePixelSize + cachePixelSize / 2
                );
            }
            cacheCtx.stroke();
        });
    }
    
    // Рисуем поселения поверх дорог
    drawCompleteMap(cacheCtx, null, politicalData, {
        cellSize: cachePixelSize,
        drawBaseTerrain: false,
        drawPoliticalLayer: false,
        drawRoads: false, // Дороги уже нарисованы
        drawSettlements: true,
        drawNationNames: false
    });
    
    isSettlementsCacheDirty = false;
}

function ensureCachesAreUpdated() {
    const physmap = getPhysmap();
    if (!physmap || !physmap[0]) return;

    const mapDataHeight = physmap.length;
    const mapDataWidth = physmap[0].length;
    const CACHE_PIXEL_SIZE = 3;

    ensureCacheCanvases(mapDataWidth * CACHE_PIXEL_SIZE, mapDataHeight * CACHE_PIXEL_SIZE);

    const politicalData = getPoliticalMap();

    updateTerrainCache(physmap, CACHE_PIXEL_SIZE);
    updatePoliticalCache(physmap, politicalData, CACHE_PIXEL_SIZE);
    updateSettlementsCache(politicalData, CACHE_PIXEL_SIZE);
}

// --- ИЗМЕНЕНО: Основной кадр отрисовки теперь накладывает кэши друг на друга ---
function drawFrame(isPoliticalMapVisible, isSettlementsLayerVisible) {
    ensureCachesAreUpdated();

    const currentPhysmap = getPhysmap();
    const currentCellSize = getCellSize();
    if (!currentPhysmap || !currentPhysmap[0] || !ctx) return;
    
    const deviceRatio = window.devicePixelRatio || 1;
    ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width / deviceRatio, canvas.height / deviceRatio);

    const transform = camera.getTransform();
    ctx.translate(transform.translateX, transform.translateY);
    ctx.scale(transform.scale, transform.scale);
    
    const mapTotalWorldWidth = currentPhysmap[0].length * currentCellSize;
    const mapTotalWorldHeight = currentPhysmap.length * currentCellSize;

    // 1. Всегда рисуем базовый слой террейна
    if (terrainCache) ctx.drawImage(terrainCache, 0, 0, mapTotalWorldWidth, mapTotalWorldHeight);

    // 2. Накладываем политический слой, если он видим
    if (isPoliticalMapVisible && politicalCache) {
        ctx.drawImage(politicalCache, 0, 0, mapTotalWorldWidth, mapTotalWorldHeight);
    }
    
    // 3. Накладываем слой поселений, если он видим
    if (isSettlementsLayerVisible && settlementsCache) {
        ctx.drawImage(settlementsCache, 0, 0, mapTotalWorldWidth, mapTotalWorldHeight);
    }

    const politicalData = getPoliticalMap();
    if ((isPoliticalMapVisible || isSettlementsLayerVisible) && politicalData && politicalData.nations) {
        drawDynamicElements(politicalData, transform.scale, currentCellSize, isPoliticalMapVisible, isSettlementsLayerVisible);
    }
    ctx.restore();
}

export function startRenderLoop(getState) {
    const loop = () => {
        updateCanvasSize();
        camera.update();
        const { isPoliticalMapVisible, isSettlementsLayerVisible } = getState();
        drawFrame(isPoliticalMapVisible, isSettlementsLayerVisible);
        requestAnimationFrame(loop);
    };
    loop();
}

// --- ИЗМЕНЕНО: drawCompleteMap теперь более гибкая для послойной отрисовки ---
export function drawCompleteMap(targetCtx, physmap, politicalData, settings) {
    const { cellSize, drawBaseTerrain = true, drawPoliticalLayer, drawRoads, drawSettlements, drawNationNames } = settings;

    // Этап 1: Отрисовка базового ландшафта (если требуется)
    if (drawBaseTerrain && physmap) {
        for (let y = 0; y < physmap.length; y++) {
            for (let x = 0; x < physmap[0].length; x++) {
                if (physmap[y]?.[x]) {
                    targetCtx.fillStyle = physmap[y][x].color;
                    targetCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
    }

    const politicalGrid = politicalData ? politicalData.mapGrid : null;
    const localNationLookup = politicalData ? new Map(politicalData.nations.map(n => [n.id, n])) : null;

    // Этап 2: Политический слой (цвета наций и границы)
    if (drawPoliticalLayer && politicalData && physmap) {
        // Накладываем цвета наций
        for (let y = 0; y < physmap.length; y++) {
            for (let x = 0; x < physmap[0].length; x++) {
                const physCellType = physmap[y]?.[x]?.type;
                if (physCellType && physCellType !== terrainType.OCEAN && physCellType !== terrainType.SEA && physCellType !== terrainType.RIVER) {
                    const politicalCell = politicalGrid[y]?.[x];
                    if (politicalCell && typeof politicalCell.nationId === 'number') {
                        const nation = localNationLookup.get(politicalCell.nationId);
                        if (nation) {
                            targetCtx.fillStyle = nation.color;
                            targetCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                        }
                    }
                }
            }
        }
        // Рисуем границы
        targetCtx.fillStyle = '#000000';
        const lineWidth = 1;
        for (let y = 0; y < politicalGrid.length; y++) {
            for (let x = 0; x < politicalGrid[0].length; x++) {
                const politicalCell = politicalGrid[y]?.[x];
                if (politicalCell?.borders) {
                    const cellDrawX = x * cellSize;
                    const cellDrawY = y * cellSize;
                    if (politicalCell.borders.bottom) targetCtx.fillRect(cellDrawX, cellDrawY + cellSize - lineWidth, cellSize, lineWidth);
                    if (politicalCell.borders.right) targetCtx.fillRect(cellDrawX + cellSize - lineWidth, cellDrawY, lineWidth, cellSize);
                    if (y === 0 && politicalCell.borders.top) targetCtx.fillRect(cellDrawX, cellDrawY, cellSize, lineWidth);
                    if (x === 0 && politicalCell.borders.left) targetCtx.fillRect(cellDrawX, cellDrawY, lineWidth, cellSize);
                }
            }
        }
    }

    // Этап 2.5: Рисуем дороги (перед поселениями, чтобы города были поверх дорог)
    if (drawRoads && politicalData && politicalData.roadNetwork) {
        targetCtx.strokeStyle = '#4a3b2a';
        targetCtx.lineWidth = Math.max(1, cellSize * 0.5);
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';

        politicalData.roadNetwork.forEach(path => {
            if (path.length < 2) return;
            targetCtx.beginPath();
            targetCtx.moveTo(path[0].x * cellSize + cellSize / 2, path[0].y * cellSize + cellSize / 2);
            for (let i = 1; i < path.length; i++) {
                targetCtx.lineTo(path[i].x * cellSize + cellSize / 2, path[i].y * cellSize + cellSize / 2);
            }
            targetCtx.stroke();
        });
    }

    // Этап 3: Поселения
    if (drawSettlements && politicalData) {
        politicalData.nations.forEach(nation => {
            nation.settlements?.forEach(settlement => {
                drawSettlement(targetCtx, settlement.x * cellSize, settlement.y * cellSize, settlement.type, cellSize);
            });
            if (nation.capital) {
                drawCapital(targetCtx, nation.capital.x * cellSize, nation.capital.y * cellSize, cellSize);
            }
        });
    }

    // Этап 4: Названия (обычно для скачивания)
    if (drawNationNames && politicalData) {
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        politicalData.nations.forEach(nation => {
            if (nation.labelPosition && nation.name && nation.name.trim() !== "") {
                const labelCanvasX = nation.labelPosition.x * cellSize + cellSize / 2;
                const labelCanvasY = nation.labelPosition.y * cellSize + cellSize / 2;

                let baseFontSize;
                const TARGET_TEXT_WIDTH_TO_NATION_SPAN_RATIO = 0.6;
                const MIN_NATION_SPAN_FOR_FONT_SCALING = 2;
                const REFERENCE_FONT_SIZE = 10;
                
                if (nation.estimatedSpanInCells && nation.estimatedSpanInCells >= MIN_NATION_SPAN_FOR_FONT_SCALING) {
                    const nationEstimatedSpanInPixels = nation.estimatedSpanInCells * cellSize;
                    const targetTextWidthInPixels = nationEstimatedSpanInPixels * TARGET_TEXT_WIDTH_TO_NATION_SPAN_RATIO;
                    
                    targetCtx.font = `${REFERENCE_FONT_SIZE}px 'Cinzel', serif`;
                    const refTextMetrics = targetCtx.measureText(nation.name);
                    
                    if (refTextMetrics.width > 0.01) {
                        baseFontSize = (targetTextWidthInPixels / refTextMetrics.width) * REFERENCE_FONT_SIZE;
                    } else {
                        baseFontSize = cellSize * 2;
                    }
                } else {
                    baseFontSize = cellSize * 2.5;
                }

                const finalFontSize = Math.max(8, Math.min(80, baseFontSize));
                targetCtx.font = `${finalFontSize}px 'Cinzel', serif`;
                const outlineWidth = Math.max(0.25, finalFontSize * 0.08);
                targetCtx.lineWidth = outlineWidth;
                targetCtx.strokeStyle = 'black';
                targetCtx.strokeText(nation.name, labelCanvasX, labelCanvasY);
                targetCtx.fillStyle = 'white';
                targetCtx.fillText(nation.name, labelCanvasX, labelCanvasY);
            }
        });
    }
}


function drawDynamicElements(politicalData, viewScale, currentCellSize, isPoliticalMapVisible, isSettlementsLayerVisible) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const originalFontForMeasurement = ctx.font;
    const HIDE_NAMES_ZOOM_THRESHOLD = 3.0;

    politicalData.nations.forEach(nation => {
        if (isPoliticalMapVisible && nation.labelPosition && viewScale <= HIDE_NAMES_ZOOM_THRESHOLD) {
            const labelWorldX = nation.labelPosition.x * currentCellSize + currentCellSize / 2;
            const labelWorldY = nation.labelPosition.y * currentCellSize + currentCellSize / 2;
            let baseFontSizeInWorldUnits;
            const TARGET_TEXT_WIDTH_TO_NATION_SPAN_RATIO = 0.6;
            const MIN_NATION_SPAN_FOR_FONT_SCALING = 2; 
            const REFERENCE_FONT_SIZE_FOR_MEASUREMENT = 10; 
            if (nation.estimatedSpanInCells && nation.estimatedSpanInCells >= MIN_NATION_SPAN_FOR_FONT_SCALING) {
                const nationEstimatedSpanInWorldUnits = nation.estimatedSpanInCells * currentCellSize;
                const targetTextWidthInWorldUnits = nationEstimatedSpanInWorldUnits * TARGET_TEXT_WIDTH_TO_NATION_SPAN_RATIO;
                ctx.font = `${REFERENCE_FONT_SIZE_FOR_MEASUREMENT}px 'Cinzel', sans-serif`;
                const refTextMetrics = ctx.measureText(nation.name);
                const refTextWidth = refTextMetrics.width; 
                if (refTextWidth > 0.01) { 
                    baseFontSizeInWorldUnits = (targetTextWidthInWorldUnits / refTextWidth) * REFERENCE_FONT_SIZE_FOR_MEASUREMENT;
                } else {
                    baseFontSizeInWorldUnits = currentCellSize * 2;
                }
            } else {
                baseFontSizeInWorldUnits = currentCellSize * 2.5; 
            }
            const minApparentSize = 8; 
            const maxApparentSize = 80; 
            let finalFontSizeInWorldUnits = baseFontSizeInWorldUnits;
            if (finalFontSizeInWorldUnits * viewScale < minApparentSize) {
                finalFontSizeInWorldUnits = minApparentSize / viewScale;
            }
            if (finalFontSizeInWorldUnits * viewScale > maxApparentSize) {
                finalFontSizeInWorldUnits = maxApparentSize / viewScale;
            }
            finalFontSizeInWorldUnits = Math.max(finalFontSizeInWorldUnits, currentCellSize * 0.3); 
            finalFontSizeInWorldUnits = Math.min(finalFontSizeInWorldUnits, currentCellSize * 20);   
            ctx.font = `${finalFontSizeInWorldUnits}px 'Cinzel', sans-serif`;
            const outlineWidthInWorld = Math.max(0.05 * finalFontSizeInWorldUnits, finalFontSizeInWorldUnits * 0.08); 
            ctx.lineWidth = outlineWidthInWorld;
            ctx.strokeStyle = 'black';
            ctx.strokeText(nation.name, labelWorldX, labelWorldY);
            ctx.fillStyle = 'white';
            ctx.fillText(nation.name, labelWorldX, labelWorldY);
        }

        if (isSettlementsLayerVisible) {
            if (nation.capital && nation.capitalName) {
                const capitalX = nation.capital.x * currentCellSize + currentCellSize;
                const capitalY = nation.capital.y * currentCellSize - currentCellSize * 0.2;
                const fontSize = Math.max(9 / viewScale, currentCellSize * 1.0);
                ctx.font = `bold ${fontSize}px 'Cinzel', sans-serif`;
                ctx.lineWidth = 1.5 / viewScale;
                ctx.strokeStyle = 'black';
                ctx.strokeText(nation.capitalName, capitalX, capitalY);
                ctx.fillStyle = '#ffffe0';
                ctx.fillText(nation.capitalName, capitalX, capitalY);
            }
            
            if (nation.settlements && viewScale > HIDE_NAMES_ZOOM_THRESHOLD) {
                nation.settlements.forEach(settlement => {
                    if (settlement.type === 'city') {
                        const cityX = settlement.x * currentCellSize + currentCellSize;
                        const cityY = settlement.y * currentCellSize - currentCellSize * 0.2;
                        const fontSize = Math.max(9 / viewScale, currentCellSize * 0.9);
                        ctx.font = `${fontSize}px 'Cinzel', sans-serif`;
                        ctx.lineWidth = 1.0 / viewScale;
                        ctx.strokeStyle = 'black';
                        ctx.strokeText(settlement.name, cityX, cityY);
                        ctx.fillStyle = 'white';
                        ctx.fillText(settlement.name, cityX, cityY);
                    }
                });
            }
        }
    });
    ctx.font = originalFontForMeasurement; 
}

function drawCapital(targetCtx, cellX, cellY, cellSize) {
    const s = Math.round(cellSize);
    if (s < 1) return;
    const totalSize = s * 2;
    const border = Math.max(1, Math.round(s / 4));
    const startX = Math.round(cellX);
    const startY = Math.round(cellY);
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(startX, startY, totalSize, totalSize);
    targetCtx.fillStyle = '#FFFF00';
    targetCtx.fillRect(startX + border, startY + border, totalSize - border * 2, totalSize - border * 2);
}

function drawSettlement(targetCtx, cellX, cellY, type, cellSize) {
    const s = Math.round(cellSize);
    if (s < 1) return;
    if (type === 'city') {
        const size = Math.max(2, Math.round(s * 0.9));
        const border = 1;
        if (size >= 3) {
            targetCtx.fillStyle = '#000000';
            targetCtx.fillRect(cellX, cellY, size, size);
            targetCtx.fillStyle = '#6a3d30'; 
            targetCtx.fillRect(cellX + border, cellY + border, size - (border * 2), size - (border * 2));
        } else {
            targetCtx.fillStyle = '#6a3d30';
            targetCtx.fillRect(cellX, cellY, size, size);
        }
    } else {
        const size = Math.max(1, Math.round(s * 0.6));
        targetCtx.fillStyle = '#a16657'; 
        targetCtx.fillRect(cellX, cellY, size, size);
    }
}