let viewScale = 1.0;
let viewTranslateX = 0;
let viewTranslateY = 0;
let targetViewScale = 1.0;
let targetViewTranslateX = 0;
let targetViewTranslateY = 0;

const LERP_FACTOR = 0.2; 
const MIN_VIEW_SCALE = 1;
const MAX_VIEW_SCALE = 10.0;
const VIEW_SCALE_SENSITIVITY = 0.001;

let mapDimensions = { width: 0, height: 0, cellSize: 1 };

export function initializeCamera(initialMapDimensions) {
    mapDimensions = initialMapDimensions;
}

export function resetCamera() {
    viewScale = 1.0;
    viewTranslateX = 0;
    viewTranslateY = 0;
    targetViewScale = 1.0;
    targetViewTranslateX = 0;
    targetViewTranslateY = 0;
}

function clampViewTranslate() {
    if (!mapDimensions || mapDimensions.width === 0) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const mapTotalWorldWidth = mapDimensions.width * mapDimensions.cellSize;
    const mapTotalWorldHeight = mapDimensions.height * mapDimensions.cellSize;

    const scaledMapWidth = mapTotalWorldWidth * targetViewScale;
    const scaledMapHeight = mapTotalWorldHeight * targetViewScale;

    if (scaledMapWidth < viewportWidth) {
        targetViewTranslateX = (viewportWidth - scaledMapWidth) / 2;
    } else {
        targetViewTranslateX = Math.max(viewportWidth - scaledMapWidth, Math.min(targetViewTranslateX, 0));
    }

    if (scaledMapHeight < viewportHeight) {
        targetViewTranslateY = (viewportHeight - scaledMapHeight) / 2;
    } else {
        targetViewTranslateY = Math.max(viewportHeight - scaledMapHeight, Math.min(targetViewTranslateY, 0));
    }
}

export function onResize() {
    clampViewTranslate();
}

export function pan(dx, dy) {
    targetViewTranslateX += dx;
    targetViewTranslateY += dy;
    clampViewTranslate();
}

export function zoom(event, canvas) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const worldXBeforeZoom = (mouseX - targetViewTranslateX) / targetViewScale;
    const worldYBeforeZoom = (mouseY - targetViewTranslateY) / targetViewScale;
    const delta = event.deltaY * VIEW_SCALE_SENSITIVITY * -1;
    
    let newViewScale = targetViewScale * Math.exp(delta);
    targetViewScale = Math.max(MIN_VIEW_SCALE, Math.min(MAX_VIEW_SCALE, newViewScale));
    
    targetViewTranslateX = mouseX - worldXBeforeZoom * targetViewScale;
    targetViewTranslateY = mouseY - worldYBeforeZoom * targetViewScale;
    
    clampViewTranslate();
}

export function update() {
    viewScale += (targetViewScale - viewScale) * LERP_FACTOR;
    viewTranslateX += (targetViewTranslateX - viewTranslateX) * LERP_FACTOR;
    viewTranslateY += (targetViewTranslateY - viewTranslateY) * LERP_FACTOR;
}

export function getTransform() {
    return {
        scale: viewScale,
        translateX: viewTranslateX,
        translateY: viewTranslateY
    };
}

export function screenToWorld(mouseX, mouseY, canvas) {
    const rect = canvas.getBoundingClientRect();
    const screenX = mouseX - rect.left;
    const screenY = mouseY - rect.top;
    const worldX = (screenX - viewTranslateX) / viewScale;
    const worldY = (screenY - viewTranslateY) / viewScale;
    return { worldX, worldY };
}