import { getPhysmap, getPoliticalMap, getCellSize, getRiverNetwork, TERRAIN_HEIGHT_MAP } from './map-data.js';
import * as camera from './camera.js';
import { terrainType } from './terrain-types.js';

let canvas = null;
let ctx = null;

let terrainCache = null;
let politicalCache = null;
let settlementsCache = null;
let riverCache = null;

let isTerrainCacheDirty = true;
let isPoliticalCacheDirty = true;
let isSettlementsCacheDirty = true;
let isRiverCacheDirty = true;

export function initializeRenderer() {
    canvas = document.getElementById('map-canvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return null;
    }
    ctx = canvas.getContext('2d');
    return canvas;
}

export function markAllCachesDirty() {
    isTerrainCacheDirty = true;
    isPoliticalCacheDirty = true;
    isSettlementsCacheDirty = true;
    isRiverCacheDirty = true;
}

export function markPoliticalCachesDirty() {
    isPoliticalCacheDirty = true;
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

function ensureCacheCanvases(width, height) {
    const createIfNeeded = (c) => c || document.createElement('canvas');
    terrainCache = createIfNeeded(terrainCache);
    politicalCache = createIfNeeded(politicalCache);
    settlementsCache = createIfNeeded(settlementsCache);
    riverCache = createIfNeeded(riverCache);
    [terrainCache, politicalCache, settlementsCache, riverCache].forEach(c => {
        if (c.width !== width || c.height !== height) {
            c.width = width;
            c.height = height;
        }
    });
}

function updateTerrainCache(physmap, cachePixelSize, is3dViewEnabled) {
    if (!isTerrainCacheDirty || !physmap) return;
    const cacheCtx = terrainCache.getContext('2d');
    cacheCtx.imageSmoothingEnabled = false;
    cacheCtx.clearRect(0, 0, terrainCache.width, terrainCache.height);
    drawCompleteMap(cacheCtx, physmap, null, null, {
        cellSize: cachePixelSize,
        drawBaseTerrain: true,
        draw3dEdges: is3dViewEnabled
    });
    isTerrainCacheDirty = false;
}

function updateRiverCache(cachePixelSize) {
    if (!isRiverCacheDirty) return;
    const cacheCtx = riverCache.getContext('2d');
    cacheCtx.imageSmoothingEnabled = false;
    cacheCtx.clearRect(0, 0, riverCache.width, riverCache.height);
    
    const riverNetwork = getRiverNetwork();
    if (!riverNetwork || riverNetwork.length === 0) {
        isRiverCacheDirty = false;
        return;
    }

    drawCompleteMap(cacheCtx, null, null, riverNetwork, {
        cellSize: cachePixelSize,
        drawRivers: true
    });

    isRiverCacheDirty = false;
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
    drawCompleteMap(cacheCtx, physmap, politicalData, null, {
        cellSize: cachePixelSize,
        drawBaseTerrain: false,
        drawPoliticalLayer: true
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
    drawCompleteMap(cacheCtx, null, politicalData, null, {
        cellSize: cachePixelSize,
        drawRoads: true
    });
    isSettlementsCacheDirty = false;
}


function ensureCachesAreUpdated(is3dViewEnabled) {
    const physmap = getPhysmap();
    if (!physmap || !physmap[0]) return;
    const mapDataHeight = physmap.length;
    const mapDataWidth = physmap[0].length;
    const CACHE_PIXEL_SIZE = 3;
    ensureCacheCanvases(mapDataWidth * CACHE_PIXEL_SIZE, mapDataHeight * CACHE_PIXEL_SIZE);
    const politicalData = getPoliticalMap();
    updateTerrainCache(physmap, CACHE_PIXEL_SIZE, is3dViewEnabled);
    updateRiverCache(CACHE_PIXEL_SIZE);
    updatePoliticalCache(physmap, politicalData, CACHE_PIXEL_SIZE);
    updateSettlementsCache(politicalData, CACHE_PIXEL_SIZE);
}

function drawFrame(isPoliticalMapVisible, isSettlementsLayerVisible, isPoiLayerVisible, is3dViewEnabled) {
    ensureCachesAreUpdated(is3dViewEnabled);
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
    if (terrainCache) ctx.drawImage(terrainCache, 0, 0, mapTotalWorldWidth, mapTotalWorldHeight);
    if (riverCache) ctx.drawImage(riverCache, 0, 0, mapTotalWorldWidth, mapTotalWorldHeight);
    if (isPoliticalMapVisible && politicalCache) {
        ctx.drawImage(politicalCache, 0, 0, mapTotalWorldWidth, mapTotalWorldHeight);
    }
    if (isSettlementsLayerVisible && settlementsCache) {
        ctx.drawImage(settlementsCache, 0, 0, mapTotalWorldWidth, mapTotalWorldHeight);
    }
    const politicalData = getPoliticalMap();

    if ((isPoliticalMapVisible || isSettlementsLayerVisible || isPoiLayerVisible) && politicalData && politicalData.nations) {
        drawDynamicElements(politicalData, transform.scale, currentCellSize, isPoliticalMapVisible, isSettlementsLayerVisible, isPoiLayerVisible);
    }
    ctx.restore();
}

export function startRenderLoop(getState) {
    const loop = () => {
        updateCanvasSize();
        camera.update();
        const {
            isPoliticalMapVisible,
            isSettlementsLayerVisible,
            isPoiLayerVisible,
            is3dViewEnabled
        } = getState();
        drawFrame(isPoliticalMapVisible, isSettlementsLayerVisible, isPoiLayerVisible, is3dViewEnabled);
        requestAnimationFrame(loop);
    };
    loop();
}

export function drawCompleteMap(targetCtx, physmap, politicalData, riverNetwork = null, settings) {
    const {
        cellSize,
        drawBaseTerrain = false,
        draw3dEdges = false,
        drawPoliticalLayer = false,
        drawRivers = false,
        drawRoads = false,
        drawNationNames = false
    } = settings;

    if (drawBaseTerrain && physmap) {
        for (let y = 0; y < physmap.length; y++) {
            for (let x = 0; x < physmap[0].length; x++) {
                if (physmap[y] && physmap[y][x]) {
                    targetCtx.fillStyle = physmap[y][x].color;
                    targetCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
        
        if (draw3dEdges) {
            const mapHeight = physmap.length;
            const mapWidth = physmap[0].length;
            const highlightColor = 'rgba(255, 255, 255, 0.2)';
            const shadowColor = 'rgba(0, 0, 0, 0.2)';
            const lineWidth = Math.max(1, Math.floor(cellSize * 0.3));

            for (let y = 0; y < mapHeight; y++) {
                for (let x = 0; x < mapWidth; x++) {
                    const currentCell = physmap[y][x];
                    const isWater = currentCell.type === terrainType.OCEAN || currentCell.type === terrainType.SEA || currentCell.type === terrainType.SHALLOW_WATER;
                    if (isWater) {
                        continue;
                    }

                    const currentHeight = TERRAIN_HEIGHT_MAP[physmap[y][x].type] ?? 0;
                    
                    if (y < mapHeight - 1) {
                        const bottomHeight = TERRAIN_HEIGHT_MAP[physmap[y + 1][x].type] ?? 0;
                        if (currentHeight > bottomHeight) {
                            targetCtx.fillStyle = shadowColor;
                            targetCtx.fillRect(x * cellSize, (y + 1) * cellSize - lineWidth, cellSize, lineWidth);
                        }
                    }
                    if (x < mapWidth - 1) {
                        const rightHeight = TERRAIN_HEIGHT_MAP[physmap[y][x + 1].type] ?? 0;
                         if (currentHeight > rightHeight) {
                            targetCtx.fillStyle = shadowColor;
                            targetCtx.fillRect((x + 1) * cellSize - lineWidth, y * cellSize, lineWidth, cellSize);
                        }
                    }
                    
                    if (y > 0) {
                        const topHeight = TERRAIN_HEIGHT_MAP[physmap[y - 1][x].type] ?? 0;
                        if (currentHeight > topHeight) {
                            targetCtx.fillStyle = highlightColor;
                            targetCtx.fillRect(x * cellSize, y * cellSize, cellSize, lineWidth);
                        }
                    }
                    if (x > 0) {
                        const leftHeight = TERRAIN_HEIGHT_MAP[physmap[y][x - 1].type] ?? 0;
                        if (currentHeight > leftHeight) {
                            targetCtx.fillStyle = highlightColor;
                            targetCtx.fillRect(x * cellSize, y * cellSize, lineWidth, cellSize);
                        }
                    }
                }
            }
        }
    }
    
    if (drawRivers && riverNetwork) {
        targetCtx.strokeStyle = 'oklch(55% 0.15 215)';
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';

        riverNetwork.forEach(path => {
            if (path.length < 2) return;

            for (let i = 0; i < path.length - 1; i++) {
                const startPoint = path[i];
                const endPoint = path[i + 1];
                const progress = (i + 1) / path.length;

                const minWidth = 0.2 * cellSize;
                const maxWidth = 1.2 * cellSize;
                
                const width = minWidth + (Math.sqrt(progress) * (maxWidth - minWidth));
                targetCtx.lineWidth = width;

                targetCtx.beginPath();
                targetCtx.moveTo(
                    startPoint.x * cellSize + cellSize / 2, 
                    startPoint.y * cellSize + cellSize / 2
                );
                targetCtx.lineTo(
                    endPoint.x * cellSize + cellSize / 2, 
                    endPoint.y * cellSize + cellSize / 2
                );
                targetCtx.stroke();
            }
        });
    }

    const politicalGrid = politicalData ? politicalData.mapGrid : null;
    const localNationLookup = politicalData ? new Map(politicalData.nations.map(n => [n.id, n])) : null;

    if (drawPoliticalLayer && politicalData && physmap && politicalGrid) {
        for (let y = 0; y < physmap.length; y++) {
            for (let x = 0; x < physmap[0].length; x++) {
                const physCell = physmap[y] && physmap[y][x];
                if (physCell && physCell.type !== terrainType.OCEAN && physCell.type !== terrainType.SEA && physCell.type !== terrainType.RIVER && physCell.type !== terrainType.SHALLOW_WATER) {
                    const politicalCell = politicalGrid[y] && politicalGrid[y][x];
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
        targetCtx.fillStyle = '#000000';
        const lineWidth = 1;
        for (let y = 0; y < politicalGrid.length; y++) {
            for (let x = 0; x < politicalGrid[0].length; x++) {
                const politicalCell = politicalGrid[y] && politicalGrid[y][x];
                if (politicalCell && politicalCell.borders) {
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

        // --- ВСТАВИТЬ В renderer.js внутри drawCompleteMap ---

    if (drawRivers && riverNetwork) {
        targetCtx.strokeStyle = '#4fa4d6'; 
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';
    
        riverNetwork.forEach(path => {
            if (path.length < 2) return;
        
            for (let i = 0; i < path.length - 1; i++) {
                const p0 = path[i];
                const p1 = path[i + 1];
            
                targetCtx.beginPath();
                
                // Защита, если flux не рассчитан (старые данные)
                const fluxVal = p0.flux || 10; 
                
                // Толщина
                const width = Math.min(cellSize * 0.8, Math.max(cellSize * 0.2, Math.sqrt(fluxVal) * 0.05 * cellSize));
                targetCtx.lineWidth = width;
            
                const x0 = p0.x * cellSize + cellSize / 2;
                const y0 = p0.y * cellSize + cellSize / 2;
                const x1 = p1.x * cellSize + cellSize / 2;
                const y1 = p1.y * cellSize + cellSize / 2;
                
                targetCtx.moveTo(x0, y0);
                targetCtx.lineTo(x1, y1);
                targetCtx.stroke();
            }
        });
    }

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

function drawDynamicElements(politicalData, viewScale, currentCellSize, isPoliticalMapVisible, isSettlementsLayerVisible, isPoiLayerVisible) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const originalFontForMeasurement = ctx.font;
    const HIDE_NAMES_ZOOM_THRESHOLD = 2.5;

    const currentPhysmap = getPhysmap();
    const mapTotalWorldWidth = currentPhysmap[0].length * currentCellSize;
    const mapTotalWorldHeight = currentPhysmap.length * currentCellSize;

    if (isSettlementsLayerVisible) {
        politicalData.nations.forEach(nation => {
            const apparentSize = currentCellSize * viewScale;
            if (nation.settlements) {
                nation.settlements.forEach(settlement => {
                    const worldX = settlement.x * currentCellSize;
                    const worldY = settlement.y * currentCellSize;
                    drawSettlementIcon(ctx, worldX, worldY, settlement.type, apparentSize, currentCellSize, viewScale);
                });
            }
            if (nation.capital) {
                const worldX = nation.capital.x * currentCellSize;
                const worldY = nation.capital.y * currentCellSize;
                drawCapitalIcon(ctx, worldX, worldY, apparentSize, currentCellSize, viewScale);
            }
        });
    }

    if (isPoliticalMapVisible) {
        politicalData.nations.forEach(nation => {
            if (nation.labelPosition && viewScale <= HIDE_NAMES_ZOOM_THRESHOLD) {
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

                const textMetrics = ctx.measureText(nation.name);
                const textWidth = textMetrics.width;
                const textHeight = finalFontSizeInWorldUnits;
                const halfWidth = textWidth / 2;
                const halfHeight = textHeight / 2;

                const textLeft = labelWorldX - halfWidth;
                const textRight = labelWorldX + halfWidth;
                const textTop = labelWorldY - halfHeight;
                const textBottom = labelWorldY + halfHeight;

                let finalLabelX = labelWorldX;
                let finalLabelY = labelWorldY;

                if (textLeft < 0) {
                    finalLabelX -= textLeft;
                }
                if (textRight > mapTotalWorldWidth) {
                    finalLabelX -= (textRight - mapTotalWorldWidth);
                }
                if (textTop < 0) {
                    finalLabelY -= textTop;
                }
                if (textBottom > mapTotalWorldHeight) {
                    finalLabelY -= (textBottom - mapTotalWorldHeight);
                }
                
                const outlineWidthInWorld = Math.max(0.05 * finalFontSizeInWorldUnits, finalFontSizeInWorldUnits * 0.08);
                ctx.lineWidth = outlineWidthInWorld;
                ctx.strokeStyle = 'black';
                ctx.strokeText(nation.name, finalLabelX, finalLabelY);
                ctx.fillStyle = 'white';
                ctx.fillText(nation.name, finalLabelX, finalLabelY);
            }
        });
    }
    
    if (isPoiLayerVisible && politicalData.pointsOfInterest) {
        politicalData.pointsOfInterest.forEach(poi => {
            const poiX = poi.x * currentCellSize + currentCellSize / 2;
            const poiY = poi.y * currentCellSize + currentCellSize / 2;
            
            const iconSize = currentCellSize * 3.5;
            ctx.font = `${iconSize}px sans-serif`;
            ctx.fillText(poi.icon, poiX, poiY);

            if (viewScale > HIDE_NAMES_ZOOM_THRESHOLD) {
                const nameY = poiY + iconSize * 0.8;
                const fontSize = Math.max(14 / viewScale, currentCellSize * 0.8);
                ctx.font = `italic ${fontSize}px 'Cinzel', serif`;
                ctx.lineWidth = 2.0 / viewScale; 
                ctx.strokeStyle = 'black';
                ctx.strokeText(poi.name, poiX, nameY);
                ctx.fillStyle = '#f5e4b3';
                ctx.fillText(poi.name, poiX, nameY);
            }
        });
    }

    if (isSettlementsLayerVisible && viewScale > HIDE_NAMES_ZOOM_THRESHOLD) {
        politicalData.nations.forEach(nation => {
            if (nation.settlements) {
                nation.settlements.forEach(settlement => {
                    if (settlement.type === 'city') {
                        const cityX = settlement.x * currentCellSize + currentCellSize * 0.5;
                        const cityY = settlement.y * currentCellSize - currentCellSize * 0.4;
                        const fontSize = Math.max(16 / viewScale, currentCellSize * 0.9); 
                        ctx.font = `bold ${fontSize}px 'Cinzel', sans-serif`; 
                        ctx.lineWidth = 2.0 / viewScale; 
                        ctx.strokeStyle = 'black';
                        ctx.strokeText(settlement.name, cityX, cityY);
                        ctx.fillStyle = '#f0f0f0';
                        ctx.fillText(settlement.name, cityX, cityY);
                    }
                });
            }
            if (nation.capital && nation.capitalName) {
                const capitalX = nation.capital.x * currentCellSize + currentCellSize * 0.5;
                const capitalY = nation.capital.y * currentCellSize - currentCellSize * 0.5;
                const fontSize = Math.max(20 / viewScale, currentCellSize * 1.0); 
                ctx.font = `bold ${fontSize}px 'Cinzel', sans-serif`;
                ctx.lineWidth = 2.0 / viewScale;
                ctx.strokeStyle = 'black';
                ctx.strokeText(nation.capitalName, capitalX, capitalY);
                ctx.fillStyle = '#ffffe0';
                ctx.fillText(nation.capitalName, capitalX, capitalY);
            }
        });
    }

    ctx.font = originalFontForMeasurement;
}


function drawCapitalIcon(targetCtx, worldX, worldY, apparentSize, cellSize, viewScale) {
    const PIXEL_ART_THRESHOLD = 8;
    if (apparentSize < PIXEL_ART_THRESHOLD) {
        const size = cellSize * 1.5;
        const border = 1 / viewScale;
        targetCtx.fillStyle = '#000000';
        targetCtx.fillRect(worldX, worldY, size, size);
        targetCtx.fillStyle = '#FFFF00';
        targetCtx.fillRect(worldX + border, worldY + border, size - border * 2, size - border * 2);
    } else {
        const starSize = cellSize * 1.5;
        const cx = worldX + starSize / 2;
        const cy = worldY + starSize / 2;
        const spikes = 5;
        const outerRadius = starSize / 2;
        const innerRadius = starSize / 4;
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        targetCtx.beginPath();
        targetCtx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            targetCtx.lineTo(x, y);
            rot += step;
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            targetCtx.lineTo(x, y);
            rot += step;
        }
        targetCtx.lineTo(cx, cy - outerRadius);
        targetCtx.closePath();
        targetCtx.lineWidth = (1 / viewScale) * (starSize / 10);
        targetCtx.strokeStyle = '#000000';
        targetCtx.stroke();
        targetCtx.fillStyle = '#ffd700';
        targetCtx.fill();
    }
}

function drawSettlementIcon(targetCtx, worldX, worldY, type, apparentSize, cellSize, viewScale) {
    if (type === 'city') {
        const PIXEL_ART_THRESHOLD = 7;
        if (apparentSize < PIXEL_ART_THRESHOLD) {
            const size = cellSize * 1.2;
            const border = 1 / viewScale;
            targetCtx.fillStyle = '#000000';
            targetCtx.fillRect(worldX, worldY, size, size);
            targetCtx.fillStyle = '#d3d3d3';
            targetCtx.fillRect(worldX + border, worldY + border, size - border * 2, size - border * 2);

        } else {
            const radius = cellSize * 0.6;
            const cx = worldX + cellSize * 0.5;
            const cy = worldY + cellSize * 0.5;
            targetCtx.beginPath();
            targetCtx.arc(cx, cy, radius, 0, 2 * Math.PI, false);
            targetCtx.fillStyle = '#e0e0e0';
            targetCtx.fill();
            targetCtx.lineWidth = (1 / viewScale) * (cellSize / 4);
            targetCtx.strokeStyle = '#000000';
            targetCtx.stroke();
        }
    } else {
        const size = cellSize * 0.8;
        const startX = worldX + (cellSize - size) / 2;
        const startY = worldY + (cellSize - size) / 2;
        targetCtx.fillStyle = '#7a4d40';
        targetCtx.fillRect(startX, startY, size, size);
    }
}