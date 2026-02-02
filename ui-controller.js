let politicalLayerButton, settlementsLayerButton, poiLayerButton, loadingOverlay, view3dButton;
let isPanning = false;
let isDrawing = false;
let hasMoved = false;
let lastPanX, lastPanY;

export function showLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

export function hideLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

export function updateGenerationScaleDisplay(scale) {
    document.getElementById('scale-display').textContent = `${Math.round(scale * 100)}%`;
}

export function updateLayerButtonsState(isPoliticalMapVisible, isSettlementsLayerVisible, isPoiLayerVisible, is3dViewEnabled, hasPoliticalData, hasMap) {
    const setButtonState = (button, isVisible, visibleText, hiddenText) => {
        if (button) {
            button.style.display = hasMap ? 'inline-block' : 'none';
            button.textContent = hasPoliticalData && isVisible ? hiddenText : visibleText;
        }
    };
    setButtonState(politicalLayerButton, isPoliticalMapVisible, 'Show Politics', 'Hide Politics');
    setButtonState(settlementsLayerButton, isSettlementsLayerVisible, 'Show Settlements', 'Hide Settlements');
    setButtonState(poiLayerButton, isPoiLayerVisible, 'Show POI', 'Hide POI');
    
    if (view3dButton) {
        view3dButton.style.display = hasMap ? 'inline-block' : 'none';
        view3dButton.textContent = is3dViewEnabled ? 'Disable 3D View' : 'Enable 3D View';
    }
}

export function initializeUI(callbacks) {
    politicalLayerButton = document.getElementById('toggle-political-layer');
    settlementsLayerButton = document.getElementById('toggle-settlements-layer');
    poiLayerButton = document.getElementById('toggle-poi-layer');
    view3dButton = document.getElementById('toggle-3d-view');
    loadingOverlay = document.getElementById('loading-overlay');
    const canvas = document.getElementById('map-canvas');

    document.getElementById('generate-map').addEventListener('click', callbacks.onGenerateMap);
    document.getElementById('download-map').addEventListener('click', callbacks.onDownloadMap);
    document.getElementById('zoom-in').addEventListener('click', callbacks.onGenerationZoomIn);
    document.getElementById('zoom-out').addEventListener('click', callbacks.onGenerationZoomOut);
    document.getElementById('copy-seed').addEventListener('click', callbacks.onCopySeed);
    document.getElementById('load-seed').addEventListener('click', () => {
        const seedInput = document.getElementById('seed-input');
        callbacks.onLoadSeed(seedInput.value);
    });

    politicalLayerButton.addEventListener('click', () => callbacks.onLayerToggle('political'));
    settlementsLayerButton.addEventListener('click', () => callbacks.onLayerToggle('settlements'));
    poiLayerButton.addEventListener('click', () => callbacks.onLayerToggle('poi'));
    view3dButton.addEventListener('click', callbacks.onToggle3dView);
    
    const presetButtons = document.querySelectorAll('.preset-button');
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            const preset = button.dataset.preset;
            presetButtons.forEach(btn => btn.classList.remove('active-preset'));
            button.classList.add('active-preset');
            callbacks.onPresetChange(preset);
        });
    });

    const paletteButtons = document.querySelectorAll('.palette-button');
    paletteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const palette = button.dataset.palette;
            paletteButtons.forEach(btn => btn.classList.remove('active-palette'));
            button.classList.add('active-palette');
            callbacks.onPaletteChange(palette);
        });
    });

    const sliders = [
        'water-level-slider', 'mountain-slider', 'forest-slider',
        'nation-slider', 'settlement-slider'
    ];
    let regenTimeout;
    sliders.forEach(id => {
        document.getElementById(id).addEventListener('input', (event) => {
            clearTimeout(regenTimeout);
            const settings = {
                waterLevel: parseFloat(document.getElementById('water-level-slider').value),
                mountainThreshold: parseFloat(document.getElementById('mountain-slider').value),
                forestThreshold: parseFloat(document.getElementById('forest-slider').value),
                numNations: parseInt(document.getElementById('nation-slider').value, 10),
                settlementDensity: parseFloat(document.getElementById('settlement-slider').value)
            };
            updateSliderDisplays(settings);
            
            const isPhysmapSlider = ['water-level-slider', 'mountain-slider', 'forest-slider'].includes(event.target.id);
            regenTimeout = setTimeout(() => {
                callbacks.onSliderChange(settings, isPhysmapSlider);
            }, 200);
        });
    });
    
    updateSliderDisplays({
        waterLevel: document.getElementById('water-level-slider').value,
        mountainThreshold: document.getElementById('mountain-slider').value,
        forestThreshold: document.getElementById('forest-slider').value,
        numNations: document.getElementById('nation-slider').value,
        settlementDensity: document.getElementById('settlement-slider').value
    });


    const editorToggleBtn = document.getElementById('toggle-editor-mode');
    if (editorToggleBtn) {
        editorToggleBtn.addEventListener('click', () => {
            if (callbacks.onToggleEditor) callbacks.onToggleEditor();
        });
    }

    const brushSizeInput = document.getElementById('brush-size');
    if (brushSizeInput) {
        brushSizeInput.addEventListener('input', (e) => {
            const val = e.target.value;
            document.getElementById('brush-size-display').textContent = val;
            if (callbacks.onBrushSizeChange) callbacks.onBrushSizeChange(val);
        });
    }

    const recalcWorldBtn = document.getElementById('recalc-world');
    if (recalcWorldBtn) {
        recalcWorldBtn.addEventListener('click', () => {
            if (callbacks.onRecalcWorld) callbacks.onRecalcWorld();
        });
    }

    const brushButtons = document.querySelectorAll('.brush-btn');
    brushButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            brushButtons.forEach(b => b.classList.remove('active-brush'));
            btn.classList.add('active-brush');
            if (callbacks.onBrushTypeChange) callbacks.onBrushTypeChange(btn.dataset.type);
        });
    });


    canvas.addEventListener('wheel', (e) => callbacks.onZoom(e, canvas), { passive: false });
    
    canvas.addEventListener('click', (e) => { 
        if (!hasMoved && (!callbacks.isEditorMode || !callbacks.isEditorMode())) {
            callbacks.onMapClick(e, canvas); 
        }
    });

    window.addEventListener('mousedown', (e) => {
        if (e.target !== canvas || e.target.closest('#nation-info-popup')) return;

        if (callbacks.isEditorMode && callbacks.isEditorMode()) {
            if (e.button === 0) {
                isDrawing = true;
                if (callbacks.onEditorDraw) callbacks.onEditorDraw(e);
                return; 
            }
        }

        if (e.button === 0) {
            isPanning = true;
            hasMoved = false;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (isDrawing && callbacks.isEditorMode && callbacks.isEditorMode()) {
            if (callbacks.onEditorDraw) callbacks.onEditorDraw(e);
            return;
        }

        if (!isPanning) return;
        const dx = e.clientX - lastPanX;
        const dy = e.clientY - lastPanY;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) hasMoved = true;
        callbacks.onPan(dx, dy);
        lastPanX = e.clientX;
        lastPanY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        if (isDrawing) {
            isDrawing = false;
        }
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'grab';
        }
    });

    const controlsWrapper = document.querySelector('.controls-wrapper');
    document.getElementById('menu-toggle').addEventListener('click', () => {
        controlsWrapper.classList.toggle('expanded');
    });

    const tabButtons = document.querySelectorAll('.menu-tab-button');
    const contentPanels = document.querySelectorAll('.menu-content-panel');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.dataset.tabId;
            tabButtons.forEach(btn => btn.classList.remove('active-tab'));
            contentPanels.forEach(panel => panel.classList.remove('active'));
            button.classList.add('active-tab');
            document.querySelector(`.menu-content-panel[data-content-id="${targetTabId}"]`).classList.add('active');
        });
    });
}

function updateSliderDisplays(settings) {
    const waterLevelSlider = document.getElementById('water-level-slider');
    document.getElementById('water-level-display').textContent = `${Math.round(((settings.waterLevel - waterLevelSlider.min) / (waterLevelSlider.max - waterLevelSlider.min)) * 100)}%`;

    const mountainSlider = document.getElementById('mountain-slider');
    document.getElementById('mountain-display').textContent = `${Math.round(((mountainSlider.max - settings.mountainThreshold) / (mountainSlider.max - mountainSlider.min)) * 100)}%`;

    const forestSlider = document.getElementById('forest-slider');
    document.getElementById('forest-display').textContent = `${Math.round(((forestSlider.max - settings.forestThreshold) / (forestSlider.max - forestSlider.min)) * 100)}%`;

    document.getElementById('nation-display').textContent = settings.numNations;
    
    const settlementSlider = document.getElementById('settlement-slider');
    document.getElementById('settlement-display').textContent = `${Math.round((settings.settlementDensity / settlementSlider.max) * 100)}%`;
}