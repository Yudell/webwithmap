const nationInfoPopup = document.getElementById('nation-info-popup');
const nationNameEl = document.getElementById('nation-name');
const nationDetailsEl = document.getElementById('nation-details');
const nationColorPicker = document.getElementById('nation-color-picker');

let currentlyOpenNationId = null;
let isDraggingPopup = false;
let popupOffsetX = 0;
let popupOffsetY = 0;
let onColorChangeCallback = null;

function hideInfoPopup() {
    if (nationInfoPopup) {
        nationInfoPopup.style.display = 'none';
    }
    currentlyOpenNationId = null;
}

function showInfoPopup(nation) {
    if (!nation || !nationInfoPopup) return;

    // Формируем HTML для детальной информации
    nationNameEl.textContent = `${nation.name} (${nation.formOfGovernment})`;
    nationColorPicker.value = nation.color; // Устанавливаем цвет пикера
    
    const cityCount = nation.settlements?.filter(s => s.type === 'city').length || 0;
    const villageCount = nation.settlements?.filter(s => s.type === 'village').length || 0;

    let detailsHTML = `
        <p><strong>Capital:</strong> ${nation.capitalName} (${nation.capital.x}, ${nation.capital.y})</p>
        <p><strong>Other Settlements:</strong> ${cityCount} cities, ${villageCount} villages</p>
        <p><strong>Population:</strong> ~${nation.population}</p>
        <p><strong>Size:</strong> ${nation.cellCount} Km²</p>
        <hr>
        <p><strong>Land:</strong> ${nation.terrainComposition}</p>
        <p><strong>Resources:</strong> ${nation.resources}</p>
    `;

    if (nation.neighbors && nation.neighbors.length > 0) {
        detailsHTML += `<hr><p><strong>Neighbors:</strong> ${nation.neighbors.join(', ')}</p>`;
    } else {
        detailsHTML += `<hr><p><strong>Neighbors:</strong> No</p>`;
    }

    nationDetailsEl.innerHTML = detailsHTML;

    // Показываем окно
    nationInfoPopup.style.display = 'block';
    
    nationInfoPopup.style.left = '15px';
    nationInfoPopup.style.top = '15px';
    
    currentlyOpenNationId = nation.id;
}

function isPopupOpenForNation(nationId) {
    return nationInfoPopup.style.display === 'block' && currentlyOpenNationId === nationId;
}


function initializeInfoPopup({ onColorChange }) {
    if (!nationInfoPopup) return;
    onColorChangeCallback = onColorChange;

    nationInfoPopup.querySelector('.close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        hideInfoPopup();
    });

    nationInfoPopup.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.closest('.close-btn') || e.target === nationColorPicker) return;
        
        isDraggingPopup = true;
        nationInfoPopup.style.cursor = 'grabbing';
        popupOffsetX = e.clientX - nationInfoPopup.offsetLeft;
        popupOffsetY = e.clientY - nationInfoPopup.offsetTop;
    });

    nationColorPicker.addEventListener('input', () => {
        if (currentlyOpenNationId !== null && onColorChangeCallback) {
            onColorChangeCallback(currentlyOpenNationId, nationColorPicker.value);
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (isDraggingPopup) {
            const newLeft = e.clientX - popupOffsetX;
            const newTop = e.clientY - popupOffsetY;
            nationInfoPopup.style.left = `${newLeft}px`;
            nationInfoPopup.style.top = `${newTop}px`;
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDraggingPopup) {
            isDraggingPopup = false;
            nationInfoPopup.style.cursor = 'grab';
        }
    });
}


export { initializeInfoPopup, showInfoPopup, hideInfoPopup, isPopupOpenForNation };