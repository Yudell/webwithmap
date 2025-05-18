import {
  generateNewPhysmapData,
  getPhysmap,
  getCellSize,
  getGenerationScale,
  setGenerationScale,
  MIN_GENERATION_SCALE,
  MAX_GENERATION_SCALE,
  GENERATION_SCALE_STEP
} from './map-data.js';

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
let ctx = null;
let needsRedraw = false;

function updateGenerationScaleDisplay() {
  document.getElementById('scale-display').textContent =
    `${Math.round(getGenerationScale() * 100)}%`;
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
  const singleDevicePixelInWorldUnits = 1.0 / (viewScale * deviceRatio);

  const worldViewX1 = (0 - viewTranslateX) / viewScale;
  const worldViewY1 = (0 - viewTranslateY) / viewScale;
  const worldViewX2 = (window.innerWidth - viewTranslateX) / viewScale;
  const worldViewY2 = (window.innerHeight - viewTranslateY) / viewScale;

  const cullingMargin = 2;
  let startX = Math.max(0, Math.floor(worldViewX1 / currentCellSize) - cullingMargin);
  let startY = Math.max(0, Math.floor(worldViewY1 / currentCellSize) - cullingMargin);
  let endX = Math.min(mapDataWidth, Math.ceil(worldViewX2 / currentCellSize) + cullingMargin);
  let endY = Math.min(mapDataHeight, Math.ceil(worldViewY2 / currentCellSize) + cullingMargin);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (currentPhysmap[y] && currentPhysmap[y][x]) {
        ctx.fillStyle = currentPhysmap[y][x].color;
        const cellWorldX = x * currentCellSize;
        const cellWorldY = y * currentCellSize;
        const cellDrawingWidth = currentCellSize + singleDevicePixelInWorldUnits;
        const cellDrawingHeight = currentCellSize + singleDevicePixelInWorldUnits;
        ctx.fillRect(cellWorldX, cellWorldY, cellDrawingWidth, cellDrawingHeight);
      }
    }
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
    requestRedraw();
    updateGenerationScaleDisplay();
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
  if (isPanning) {
  }
  if (!isPanning) {
      canvas.style.cursor = 'grab';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error("Не удалось получить 2D контекст для canvas.");
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

  document.getElementById('download-map').addEventListener('click', () => {
    const currentPhysmap = getPhysmap();
    if (!currentPhysmap) { alert("Сначала сгенерируйте карту!"); return; }
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const mapDataHeight = currentPhysmap.length;
    const mapDataWidth = currentPhysmap[0].length;
    const downloadCellPixelSize = 3;
    tempCanvas.width = mapDataWidth * downloadCellPixelSize;
    tempCanvas.height = mapDataHeight * downloadCellPixelSize;
    tempCtx.imageSmoothingEnabled = false;
    for (let y = 0; y < mapDataHeight; y++) {
      for (let x = 0; x < mapDataWidth; x++) {
        if (currentPhysmap[y] && currentPhysmap[y][x]) {
          const info = currentPhysmap[y][x];
          tempCtx.fillStyle = info.color;
          tempCtx.fillRect(x*downloadCellPixelSize, y*downloadCellPixelSize, downloadCellPixelSize, downloadCellPixelSize);
        }
      }
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