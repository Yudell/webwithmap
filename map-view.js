import {
  generateNewPhysmapData,
  getPhysmap,
  getCellSize,
  getGenerationScale,
  setGenerationScale,
  MIN_GENERATION_SCALE,
  MAX_GENERATION_SCALE,
  GENERATION_SCALE_STEP,
  generateAndStorePoliticalMap,
  getPoliticalMap
} from './map-data.js';
import { terrainType } from './map-data.js';
import { predefinedColors } from './colors.js';

let resizeTimeout;

let viewScale = 1.0;
const MIN_VIEW_SCALE = 1;
const MAX_VIEW_SCALE = 10.0;
const VIEW_SCALE_SENSITIVITY = 0.001;

let viewTranslateX = 0;
let viewTranslateY = 0;

let isPanning = false;
let lastPanX, lastPanY;

const canvas = document.getElementById('map-canvas');
const generatePoliticalMapButton = document.getElementById('generate-political-map');
let ctx = null;
let needsRedraw = false;
let isPoliticalMapVisible = false;

function updateGenerationScaleDisplay() {
  document.getElementById('scale-display').textContent =
    `${Math.round(getGenerationScale() * 100)}%`;
}

function updatePoliticalMapButtonText() {
    if (generatePoliticalMapButton) {
        const politicalData = getPoliticalMap(); 
        if (!politicalData || !politicalData.mapGrid) { 
            generatePoliticalMapButton.textContent = 'Politics';
            generatePoliticalMapButton.style.display = getPhysmap() ? 'inline-block' : 'none';
        } else {
            generatePoliticalMapButton.textContent = isPoliticalMapVisible ? 'Hide Politics' : 'Show Politics';
            generatePoliticalMapButton.style.display = 'inline-block';
        }
    }
}


function clampViewTranslate() {
    const currentPhysmap = getPhysmap();
    const currentCellSize = getCellSize();

    if (!currentPhysmap || !currentPhysmap.length || !currentPhysmap[0] || !currentPhysmap[0].length) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const mapTotalWorldWidth = currentPhysmap[0].length * currentCellSize;
    const mapTotalWorldHeight = currentPhysmap.length * currentCellSize;

    const scaledMapWidth = mapTotalWorldWidth * viewScale;
    const scaledMapHeight = mapTotalWorldHeight * viewScale;

    if (scaledMapWidth < viewportWidth) {
        viewTranslateX = Math.max(0, Math.min(viewTranslateX, viewportWidth - scaledMapWidth));
    } else {
        viewTranslateX = Math.max(viewportWidth - scaledMapWidth, Math.min(viewTranslateX, 0));
    }

    if (scaledMapHeight < viewportHeight) {
        viewTranslateY = Math.max(0, Math.min(viewTranslateY, viewportHeight - scaledMapHeight));
    } else {
        viewTranslateY = Math.max(viewportHeight - scaledMapHeight, Math.min(viewTranslateY, 0));
    }
}

function requestRedraw() {
  needsRedraw = true;
}

function updateCanvasSize() {
    if (!ctx) return;
    const deviceRatio = window.devicePixelRatio || 1;
    const newWidth = window.innerWidth * deviceRatio;
    const newHeight = window.innerHeight * deviceRatio;

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        requestRedraw();
    }
}

function drawMapInternal() {
  const currentPhysmap = getPhysmap();
  const currentCellSize = getCellSize();

  if (!currentPhysmap || !currentPhysmap[0] || !currentPhysmap[0].length || !ctx) return;

  const deviceRatio = window.devicePixelRatio || 1;

  ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width / deviceRatio, canvas.height / deviceRatio);
  ctx.translate(viewTranslateX, viewTranslateY);
  ctx.scale(viewScale, viewScale);

  const mapDataHeight = currentPhysmap.length;
  const mapDataWidth = currentPhysmap[0].length;

  const renderingAdjustment = 2.5 / (viewScale * deviceRatio);

  const worldViewX1 = (0 - viewTranslateX) / viewScale;
  const worldViewY1 = (0 - viewTranslateY) / viewScale;
  const worldViewX2 = (window.innerWidth - viewTranslateX) / viewScale;
  const worldViewY2 = (window.innerHeight - viewTranslateY) / viewScale;

  const cullingMargin = 2;
  let startX = Math.max(0, Math.floor(worldViewX1 / currentCellSize) - cullingMargin);
  let startY = Math.max(0, Math.floor(worldViewY1 / currentCellSize) - cullingMargin);
  let endX = Math.min(mapDataWidth, Math.ceil(worldViewX2 / currentCellSize) + cullingMargin);
  let endY = Math.min(mapDataHeight, Math.ceil(worldViewY2 / currentCellSize) + cullingMargin);

  const politicalData = getPoliticalMap();
  const politicalLayer = politicalData ? politicalData.mapGrid : null;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (currentPhysmap[y] && currentPhysmap[y][x]) {
        let cellColor = currentPhysmap[y][x].color;
        const physCellType = currentPhysmap[y][x].type;

        if (isPoliticalMapVisible && politicalLayer) {
          const politicalCell = politicalLayer[y] && politicalLayer[y][x];
          if (politicalCell && typeof politicalCell.nationId === 'number' &&
              physCellType !== terrainType.OCEAN && physCellType !== terrainType.SEA) {
            const nationId = politicalCell.nationId;
            cellColor = predefinedColors[nationId % predefinedColors.length];
          }
        }
        ctx.fillStyle = cellColor;
        const cellWorldX = x * currentCellSize;
        const cellWorldY = y * currentCellSize;
        ctx.fillRect(cellWorldX, cellWorldY, currentCellSize + renderingAdjustment, currentCellSize + renderingAdjustment);
      }
    }
  }

  if (isPoliticalMapVisible && politicalLayer) {
      ctx.fillStyle = '#000000';
      const lineWidthInWorld = renderingAdjustment; 

      for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
              const politicalCell = politicalLayer[y] && politicalLayer[y][x];
              if (politicalCell && politicalCell.borders) {
                  const cellWorldX = x * currentCellSize;
                  const cellWorldY = y * currentCellSize;

                  if (politicalCell.borders.bottom) {
                      ctx.fillRect(cellWorldX, cellWorldY + currentCellSize - lineWidthInWorld, currentCellSize, lineWidthInWorld);
                  }
                  if (politicalCell.borders.right) {
                      ctx.fillRect(cellWorldX + currentCellSize - lineWidthInWorld, cellWorldY, lineWidthInWorld, currentCellSize);
                  }
                   if (y === startY && y === 0 && politicalCell.borders.top) { 
                       ctx.fillRect(cellWorldX, cellWorldY, currentCellSize, lineWidthInWorld);
                   }
                   if (x === startX && x === 0 && politicalCell.borders.left) { 
                       ctx.fillRect(cellWorldX, cellWorldY, lineWidthInWorld, currentCellSize);
                   }
              }
          }
      }
  }

  if (isPoliticalMapVisible && politicalData && politicalData.nations) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const originalFontForMeasurement = ctx.font;

    const TARGET_TEXT_WIDTH_TO_NATION_SPAN_RATIO = 0.6;
    const MIN_NATION_SPAN_FOR_FONT_SCALING = 2; 
    const REFERENCE_FONT_SIZE_FOR_MEASUREMENT = 10; 

    politicalData.nations.forEach(nation => {
        if (nation.labelPosition && nation.name && nation.name.trim() !== "") {
            const labelWorldX = nation.labelPosition.x * currentCellSize + currentCellSize / 2;
            const labelWorldY = nation.labelPosition.y * currentCellSize + currentCellSize / 2;
            
            const screenLabelX = (labelWorldX * viewScale) + viewTranslateX;
            const screenLabelY = (labelWorldY * viewScale) + viewTranslateY;

            if (screenLabelX > -100 && screenLabelX < window.innerWidth + 100 &&
                screenLabelY > -50 && screenLabelY < window.innerHeight + 50) {
                
                let baseFontSizeInWorldUnits;

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
        }
    });
    ctx.font = originalFontForMeasurement; 
  }
  ctx.restore();
}

function renderLoop() {
  updateCanvasSize();
  if (needsRedraw) {
    drawMapInternal();
    needsRedraw = false;
  }
  requestAnimationFrame(renderLoop);
}

function regenerateMapAndView() {
    generateNewPhysmapData();
    viewScale = 1.0;
    viewTranslateX = 0;
    viewTranslateY = 0;
    clampViewTranslate();
    isPoliticalMapVisible = false;
    updatePoliticalMapButtonText();
    requestRedraw();
    updateGenerationScaleDisplay();
    if (generatePoliticalMapButton) generatePoliticalMapButton.style.display = getPhysmap() ? 'inline-block' : 'none';
}

function handleGenerationZoomIn() {
  const currentGenScale = getGenerationScale();
  if (currentGenScale < MAX_GENERATION_SCALE) {
    setGenerationScale(currentGenScale + GENERATION_SCALE_STEP);
    regenerateMapAndView();
  }
}

function handleGenerationZoomOut() {
  const currentGenScale = getGenerationScale();
  if (currentGenScale > MIN_GENERATION_SCALE) {
    setGenerationScale(currentGenScale - GENERATION_SCALE_STEP);
    regenerateMapAndView();
  }
}

function handleViewZoom(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const worldXBeforeZoom = (mouseX - viewTranslateX) / viewScale;
  const worldYBeforeZoom = (mouseY - viewTranslateY) / viewScale;
  const delta = event.deltaY * VIEW_SCALE_SENSITIVITY * -1;
  let newViewScale = viewScale * Math.exp(delta);
  newViewScale = Math.max(MIN_VIEW_SCALE, Math.min(MAX_VIEW_SCALE, newViewScale));
  viewTranslateX = mouseX - worldXBeforeZoom * newViewScale;
  viewTranslateY = mouseY - worldYBeforeZoom * newViewScale;
  viewScale = newViewScale;
  clampViewTranslate();
  requestRedraw();
}

function handlePanStart(event) {
  if (event.button !== 0) return;
  isPanning = true;
  lastPanX = event.clientX;
  lastPanY = event.clientY;
  canvas.style.cursor = 'grabbing';
}

function handlePanMove(event) {
  if (!isPanning) return;
  const dx = event.clientX - lastPanX;
  const dy = event.clientY - lastPanY;
  viewTranslateX += dx;
  viewTranslateY += dy;
  lastPanX = event.clientX;
  lastPanY = event.clientY;
  clampViewTranslate();
  requestRedraw();
}

function handlePanEnd(event) {
  if (isPanning && event.button === 0) {
     isPanning = false;
     canvas.style.cursor = 'grab';
  } else if (event.button !==0 && isPanning) {
    canvas.style.cursor = 'grab';
  }
}

function handleMouseLeaveCanvas() {
  if (!isPanning) {
      canvas.style.cursor = 'grab';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  canvas.style.cursor = 'grab';

  setGenerationScale(1.0);
  regenerateMapAndView();

  requestAnimationFrame(renderLoop);

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      regenerateMapAndView();
    }, 250);
  });

  document.getElementById('generate-map').addEventListener('click', () => {
    regenerateMapAndView();
  });

  if (generatePoliticalMapButton) {
    generatePoliticalMapButton.addEventListener('click', () => {
        if (!getPhysmap()) {
            return;
        }

        const politicalData = getPoliticalMap();
        if (!politicalData || !politicalData.mapGrid) {
            if (generateAndStorePoliticalMap()) { 
                isPoliticalMapVisible = true;
                requestRedraw();
            } else {
                isPoliticalMapVisible = false;
            }
        } else {
            isPoliticalMapVisible = !isPoliticalMapVisible;
            requestRedraw();
        }
        updatePoliticalMapButtonText();
    });
  }


  document.getElementById('download-map').addEventListener('click', () => {
    const currentPhysmap = getPhysmap();
    if (!currentPhysmap) {
      return;
    }
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const mapDataHeight = currentPhysmap.length;
    const mapDataWidth = currentPhysmap[0].length;

    const downloadCellPixelSize = 3;

    tempCanvas.width = mapDataWidth * downloadCellPixelSize;
    tempCanvas.height = mapDataHeight * downloadCellPixelSize;
    tempCtx.imageSmoothingEnabled = false;

    const politicalDataFull = getPoliticalMap();
    const politicalGrid = politicalDataFull ? politicalDataFull.mapGrid : null;
    const nationsInfo = politicalDataFull ? politicalDataFull.nations : null;


    for (let y = 0; y < mapDataHeight; y++) {
      for (let x = 0; x < mapDataWidth; x++) {
        if (currentPhysmap[y] && currentPhysmap[y][x]) {
          let cellColor = currentPhysmap[y][x].color;
          const physCellType = currentPhysmap[y][x].type;

          if (isPoliticalMapVisible && politicalGrid) {
              const politicalCell = politicalGrid[y] && politicalGrid[y][x];
              if (politicalCell && typeof politicalCell.nationId === 'number' &&
                  physCellType !== terrainType.OCEAN && physCellType !== terrainType.SEA) {
                  cellColor = predefinedColors[politicalCell.nationId % predefinedColors.length];
              }
          }
          tempCtx.fillStyle = cellColor;
          tempCtx.fillRect(x * downloadCellPixelSize, y * downloadCellPixelSize, downloadCellPixelSize, downloadCellPixelSize);
        }
      }
    }

    if (isPoliticalMapVisible && politicalGrid) {
        tempCtx.fillStyle = '#000000';
        const downloadLineWidth = 1; 

        for (let y = 0; y < mapDataHeight; y++) {
            for (let x = 0; x < mapDataWidth; x++) {
                const politicalCell = politicalGrid[y] && politicalGrid[y][x];
                if (politicalCell && politicalCell.borders) {
                    const cellDrawX = x * downloadCellPixelSize;
                    const cellDrawY = y * downloadCellPixelSize;

                    if (politicalCell.borders.bottom) {
                        tempCtx.fillRect(cellDrawX, cellDrawY + downloadCellPixelSize - downloadLineWidth, downloadCellPixelSize, downloadLineWidth);
                    }
                    if (politicalCell.borders.right) {
                        tempCtx.fillRect(cellDrawX + downloadCellPixelSize - downloadLineWidth, cellDrawY, downloadLineWidth, downloadCellPixelSize);
                    }
                    if (y === 0 && politicalCell.borders.top) {
                         tempCtx.fillRect(cellDrawX, cellDrawY, downloadCellPixelSize, downloadLineWidth);
                    }
                    if (x === 0 && politicalCell.borders.left) {
                         tempCtx.fillRect(cellDrawX, cellDrawY, downloadLineWidth, downloadCellPixelSize);
                    }
                }
            }
        }
    }
    
    if (isPoliticalMapVisible && nationsInfo) {
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        
        nationsInfo.forEach(nation => {
            if (nation.labelPosition && nation.name && nation.name.trim() !== "") {
                const labelCanvasX = nation.labelPosition.x * downloadCellPixelSize + downloadCellPixelSize / 2;
                const labelCanvasY = nation.labelPosition.y * downloadCellPixelSize + downloadCellPixelSize / 2;
                
                let downloadFontSize = 5;
                if (nation.estimatedSpanInCells) {
                    downloadFontSize = Math.max(5, nation.estimatedSpanInCells * downloadCellPixelSize * 0.12); 
                    downloadFontSize = Math.min(downloadFontSize, downloadCellPixelSize * 3);
                }

                tempCtx.font = `${downloadFontSize}px 'Arial', sans-serif`;
                const downloadOutlineWidth = Math.max(0.25, downloadFontSize * 0.08);


                tempCtx.lineWidth = downloadOutlineWidth;
                tempCtx.strokeStyle = 'black';
                tempCtx.strokeText(nation.name, labelCanvasX, labelCanvasY);

                tempCtx.fillStyle = 'white';
                tempCtx.fillText(nation.name, labelCanvasX, labelCanvasY);
            }
        });
    }


    const link = document.createElement('a');
    link.download = 'fantasy-map.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  });

  document.getElementById('zoom-in').addEventListener('click', handleGenerationZoomIn);
  document.getElementById('zoom-out').addEventListener('click', handleGenerationZoomOut);

  canvas.addEventListener('wheel', handleViewZoom, { passive: false });
  canvas.addEventListener('mousedown', handlePanStart);
  window.addEventListener('mousemove', handlePanMove);
  window.addEventListener('mouseup', handlePanEnd);
  canvas.addEventListener('mouseleave', handleMouseLeaveCanvas);

  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) handleGenerationZoomIn();
      else handleGenerationZoomOut();
    }
  }, { passive: false });
});