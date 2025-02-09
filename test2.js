import { createNoise, newFractalNoise, defaultOctaves, defaultFrequency, defaultPersistence, generateRandomSeed } from './mapgen.js';
import { predefinedColors } from './colors.js';
const terrainType = {
  OCEAN: 'OCEAN',
  SEA: 'SEA',
  WET_SAND: 'WET_SAND',
  SAND: 'SAND',
  DRY_SAND: 'DRY_SAND',
  DRY_GRASS: 'DRY_GRASS',
  GRASS: 'GRASS',
  WET_GRASS: 'WET_GRASS',
  MOUNTAIN_SNOW: 'MOUNTAIN_SNOW',
  MOUNTAIN_ORE: 'MOUNTAIN_ORE',
  MOUNTAIN: 'MOUNTAIN',
  DESERT: 'DESERT',
  RIVER: 'RIVER',
};

let physmap = null; // Глобальная переменная для физической карты
let politicalMap = null; // Глобальная переменная для политической карты

function generateMap(width, height, terrainNoise, variantNoise, biomeNoise, generateDeserts) {
  const map = [];
  const heightMap = [];
  
  for (let y = 0; y < height; y++) {
    map[y] = [];
    heightMap[y] = [];
    for (let x = 0; x < width; x++) {
      const terrainValue = terrainNoise(x / 100, y / 100);
      const variantValue = variantNoise(x / 100, y / 100);
      const biomeValue = biomeNoise(x / 100, y / 100);
      let info = {};

      if (terrainValue < 0) {
        info.color = '#003eb2';
        info.type = terrainType.OCEAN;
      } else if (terrainValue < 0.2) {
        info.color = '#0952c6';
        info.type = terrainType.SEA;
      } else if (terrainValue < 0.22) {
        info.variantNoise = variantValue;
        if (variantValue < -0.2) {
          info.color = '#867645';
          info.type = terrainType.WET_SAND;
        } else if (variantValue < 0.2) {
          info.color = '#a49463';
          info.type = terrainType.SAND;
        } else {
          info.color = '#c2b281';
          info.type = terrainType.DRY_SAND;
        }
      } else if (biomeValue > 0.5 && generateDeserts) {
        info.color = '#f0e68c';
        info.type = terrainType.DESERT;
      } else if (terrainValue < 0.5) {
        info.variantNoise = variantValue;
        if (variantValue < -0.2) {
          info.color = '#284d00';
          info.type = terrainType.DRY_GRASS;
        } else if (variantValue < 0.2) {
          info.color = '#3c6114';
          info.type = terrainType.GRASS;
        } else {
          info.color = '#5a7f32';
          info.type = terrainType.WET_GRASS;
        }
      } else {
        info.variantNoise = variantValue;
        if (variantValue < -0.2) {
          info.color = '#ebebeb';
          info.type = terrainType.MOUNTAIN_SNOW;
        } else if (variantValue < 0.2) {
          info.color = '#8c8e7b';
          info.type = terrainType.MOUNTAIN_ORE;
        } else {
          info.color = '#a0a28f';
          info.type = terrainType.MOUNTAIN;
        }
      }

      map[y][x] = info;
      heightMap[y][x] = terrainValue;
    }
  }

  return map;
}

function drawMap(map, cellSize) {
  const canvas = document.getElementById('map-canvas');
  canvas.width = map[0].length * cellSize;
  canvas.height = map.length * cellSize;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Очищаем холст

  // Отрисовка физической карты
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const info = map[y][x];
      ctx.fillStyle = info.color;

      if (info.type === terrainType.RIVER) {
        const width = info.width;
        if (width === 1) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        } else if (width === 2) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect((x - 1) * cellSize, y * cellSize, cellSize, cellSize);
        } else if (width === 3) {
          ctx.fillRect((x - 1) * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect((x + 1) * cellSize, y * cellSize, cellSize, cellSize);
        }
      } else {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
}

function generateRivers(map, heightMap, averageRiverLength) {
  const width = map[0].length;
  const height = map.length;
  const riverSources = [];
  const directions = [
    { dx: 0, dy: 1 },  // вниз
    { dx: 0, dy: -1 }, // вверх
    { dx: -1, dy: 0 }, // влево
    { dx: 1, dy: 0 },  // вправо
    { dx: 1, dy: 1 },  // вправо-вниз
    { dx: -1, dy: -1 },// влево-вверх
    { dx: -1, dy: 1 }, // влево-вниз
    { dx: 1, dy: -1 }  // вправо-вверх
  ];

  const oppositeDirections = {
    '0,1': '0,-1',
    '0,-1': '0,1',
    '-1,0': '1,0',
    '1,0': '-1,0',
    '1,1': '-1,-1',
    '-1,-1': '1,1',
    '-1,1': '1,-1',
    '1,-1': '-1,1'
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((map[y][x].type === terrainType.MOUNTAIN || map[y][x].type === terrainType.MOUNTAIN_ORE || map[y][x].type === terrainType.WET_GRASS || map[y][x].type === terrainType.DRY_GRASS || map[y][x].type === terrainType.GRASS) && Math.random() < 0.000085) {
        riverSources.push({ x, y });
      }
    }
  }

  const riverTerminationProbability = 0.01 / averageRiverLength;

  riverSources.forEach(source => {
    let current = source;
    let riverDirection = directions[Math.floor(Math.random() * directions.length)];
    const visited = new Set();
    visited.add(`${current.x},${current.y}`);
    let riverLength = 0;
    let previousDirection = null;

    while (current) {
      map[current.y][current.x].type = terrainType.RIVER;
      map[current.y][current.x].color = '#0952c6';
      map[current.y][current.x].width = Math.min(3, Math.floor(riverLength / 120) + 1);

      riverLength++;

      let next = null;
      let minHeight = heightMap[current.y][current.x];
      const possibleDirections = [
        riverDirection,
        { dx: riverDirection.dx + 1, dy: riverDirection.dy },
        { dx: riverDirection.dx - 1, dy: riverDirection.dy },
        { dx: riverDirection.dx, dy: riverDirection.dy + 1 },
        { dx: riverDirection.dx, dy: riverDirection.dy - 1 }
      ].filter(dir => dir.dx >= -1 && dir.dx <= 1 && dir.dy >= -1 && dir.dy <= 1 && `${dir.dx},${dir.dy}` !== oppositeDirections[`${riverDirection.dx},${riverDirection.dy}`] && `${dir.dx},${dir.dy}` !== previousDirection);

      possibleDirections.sort(() => Math.random() - 0.65);

      for (const dir of possibleDirections) {
        const ny = current.y + dir.dy;
        const nx = current.x + dir.dx;
        if (ny >= 0 && ny < height && nx >= 0 && nx < width && !visited.has(`${nx},${ny}`)) {
          if (heightMap[ny][nx] < minHeight) {
            minHeight = heightMap[ny][nx];
            next = { x: nx, y: ny };
            previousDirection = `${riverDirection.dx},${riverDirection.dy}`;
            riverDirection = dir;
          } else if (heightMap[ny][nx] === minHeight && Math.random() < 0.005) {
            next = { x: nx, y: ny };
            previousDirection = `${riverDirection.dx},${riverDirection.dy}`;
            riverDirection = dir;
          } else {
            next = { x: nx, y: ny };
          }
        }
      }

      if (next && (map[next.y][next.x].type === terrainType.OCEAN || map[next.y][next.x].type === terrainType.SEA || map[next.y][next.x].type === terrainType.RIVER)) {
        map[next.y][next.x].type = terrainType.RIVER;
        map[next.y][next.x].color = '#0952c6';
        map[next.y][next.x].width = Math.min(3, Math.floor(riverLength / 120) + 1);
        break;
      }

      if (Math.random() < riverTerminationProbability) {
        break;
      }

      if (next) {
        visited.add(`${next.x},${next.y}`);
      }
      current = next;
    }
  });
}

const cellSize = 3;

let terrainSeed = generateRandomSeed();
let variantSeed = generateRandomSeed();
let biomeSeed = generateRandomSeed();

let terrainNoise = createNoise(terrainSeed);
let variantNoise = createNoise(variantSeed);
let biomeNoise = createNoise(biomeSeed);

let getTerrainNoise = newFractalNoise({
  noise: terrainNoise,
  octaves: defaultOctaves,
  frequency: defaultFrequency,
  persistence: defaultPersistence
});

let getVariantNoise = newFractalNoise({
  noise: variantNoise,
  octaves: defaultOctaves,
  frequency: defaultFrequency,
  persistence: defaultPersistence
});

let getBiomeNoise = newFractalNoise({
  noise: biomeNoise,
  octaves: defaultOctaves,
  frequency: defaultFrequency,
  persistence: defaultPersistence
});

let mapGenerated = false;

function createStatusMessage() {
  const statusMessage = document.createElement('div');
  statusMessage.id = 'status-message';
  statusMessage.className = 'status-message';
  statusMessage.textContent = 'your map will be here...';
  document.body.appendChild(statusMessage);
  return statusMessage;
}

function drawStatusMessage(message) {
  const statusMessage = document.getElementById('status-message');
  if (!statusMessage) {
    createStatusMessage();
  }

  // Get the selected language from the existing dropdown
  let language;
  if (document.getElementById('lang-en').classList.contains('active')) {
    language = 'en';
  } else if (document.getElementById('lang-ru').classList.contains('active')) {
    language = 'ru';
  } else {
    language = 'en'; // Default language
  }

  // Translations for status messages
  const translations = {
    en: {
      generating: 'Generating map...',
      mapGenerated: 'Map generated!',
      generatingPoliticalMap: 'Generating political map...'
    },
    ru: {
      generating: 'Генерируем карту...',
      mapGenerated: 'Карта сгенерирована!',
      generatingPoliticalMap: 'Генерируем политическую карту...'
    }
  };

  // Set the status message based on the selected language
  statusMessage.textContent = translations[language][message];
  statusMessage.style.display = 'block';
}

function hideStatusMessage() {
  const statusMessage = document.getElementById('status-message');
  if (statusMessage) {
    statusMessage.style.display = 'none';
  }
}

function centerStatusMessage() {
  const canvas = document.getElementById('map-canvas');
  const statusMessage = document.getElementById('status-message');
  if (statusMessage) {
    const canvasRect = canvas.getBoundingClientRect();
    statusMessage.style.top = `${canvasRect.top + window.scrollY + canvasRect.height / 2}px`;
    statusMessage.style.left = `${canvasRect.left + window.scrollX + canvasRect.width / 2}px`;
    statusMessage.style.transform = 'translate(-50%, -50%)';
  }
}

function setupResizeListener() {
  window.addEventListener('resize', centerStatusMessage);
}

function downloadMap() {
  const canvas = document.getElementById('map-canvas');
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'fantasy_map.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadPoliticalMap() {
  const canvas = document.getElementById('political-map-canvas');
  if (canvas) {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'fantasy_political_map.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    console.error('Canvas for political map not found');
  }
}

function generateAndDrawMap() {
  // Скрываем политическую карту
  const politicalCanvas = document.getElementById('political-map-canvas');
  politicalCanvas.style.display = 'none';

  const downloadPoliticalMapButton = document.getElementById('download-political-map');
  downloadPoliticalMapButton.style.display = 'none';

  // Остальная логика генерации физической карты
  const mapWidthInput = document.getElementById('map-width');
  const mapHeightInput = document.getElementById('map-height');
  const generateRiversCheckbox = document.getElementById('generate-rivers');
  const generateDesertsCheckbox = document.getElementById('generate-deserts');
  const mapWidth = parseInt(mapWidthInput.value, 10);
  const mapHeight = parseInt(mapHeightInput.value, 10);

  const generatePoliticalMapButton = document.getElementById('generate-political-map');
  generatePoliticalMapButton.style.display = 'none';

  console.log('Generating and drawing new map...');

  setTimeout(() => {
    drawStatusMessage('generating');
  }, 0);
  centerStatusMessage();

  terrainSeed = generateRandomSeed();
  variantSeed = generateRandomSeed();
  biomeSeed = generateRandomSeed();

  terrainNoise = createNoise(terrainSeed);
  variantNoise = createNoise(variantSeed);
  biomeNoise = createNoise(biomeSeed);

  getTerrainNoise = newFractalNoise({
    noise: terrainNoise,
    octaves: defaultOctaves,
    frequency: defaultFrequency,
    persistence: defaultPersistence,
  });

  getVariantNoise = newFractalNoise({
    noise: variantNoise,
    octaves: defaultOctaves,
    frequency: defaultFrequency,
    persistence: defaultPersistence,
  });

  getBiomeNoise = newFractalNoise({
    noise: biomeNoise,
    octaves: defaultOctaves,
    frequency: defaultFrequency,
    persistence: defaultPersistence,
  });

  setTimeout(async () => {
    physmap = await new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          generateMap(
            mapWidth,
            mapHeight,
            getTerrainNoise,
            getVariantNoise,
            getBiomeNoise,
            generateDesertsCheckbox.checked
          )
        );
      }, 1);
    });

    if (generateRiversCheckbox.checked) {
      generateRivers(
        physmap,
        physmap.map((row) =>
          row.map((cell) => (cell.type === terrainType.MOUNTAIN ? 1 : 0))
        ),
        250
      );
    }

    drawMap(physmap, cellSize);
    mapGenerated = true;

    generatePoliticalMapButton.style.display = 'block';

    setTimeout(() => {
      drawStatusMessage('mapGenerated');
    }, 0);

    setTimeout(() => {
      hideStatusMessage();
    }, 2000);

    const downloadButton = document.getElementById('download-map');
    downloadButton.disabled = false;
  }, 1000);
}

document.getElementById('lang-en').addEventListener('click', () => {
  document.getElementById('lang-en').classList.add('active');
  document.getElementById('lang-ru').classList.remove('active');
});

document.getElementById('lang-ru').addEventListener('click', () => {
  document.getElementById('lang-ru').classList.add('active');
  document.getElementById('lang-en').classList.remove('active');
});

document.addEventListener('DOMContentLoaded', () => {
  centerStatusMessage();
  setupResizeListener();
  document.getElementById('generate-map').addEventListener('click', generateAndDrawMap);
  document.getElementById('download-map').addEventListener('click', downloadMap);
  document.getElementById('download-political-map').addEventListener('click', downloadPoliticalMap);
  
});

function generatePoliticalMap(physicalMap, width, height, minCountrySize) {
  let politicalMap = Array.from({ length: height }, () => Array(width).fill(0));
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  let countryId = 1;

  const directions = [
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 }
  ];

  function isValid(x, y) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  function floodFill(x, y, countryId) {
    const queue = [{ x, y }];
    const terrain = physicalMap[y][x].type;

    while (queue.length > 0) {
      const { x, y } = queue.shift();

      if (!isValid(x, y) || visited[y][x] || physicalMap[y][x].type !== terrain) {
        continue;
      }

      visited[y][x] = true;
      politicalMap[y][x] = countryId;

      for (const { dx, dy } of directions) {
        queue.push({ x: x + dx, y: y + dy });
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!visited[y][x] && physicalMap[y][x].type !== terrainType.OCEAN && physicalMap[y][x].type !== terrainType.SEA && physicalMap[y][x].type !== terrainType.RIVER) {
        floodFill(x, y, countryId);
        countryId++;
      }
    }
  }

  // Проверка размеров стран и их объединение при необходимости
  let countrySizes = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        if (!countrySizes[countryId]) {
          countrySizes[countryId] = 0;
        }
        countrySizes[countryId]++;
      }
    }
  }

  let countryNeighbors = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        if (!countryNeighbors[countryId]) {
          countryNeighbors[countryId] = new Set();
        }
        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (isValid(nx, ny) && politicalMap[ny][nx] !== countryId && politicalMap[ny][nx] !== 0) {
            countryNeighbors[countryId].add(politicalMap[ny][nx]);
          }
        }
      }
    }
  }

  const mergeCountries = (smallCountryId, largeCountryId) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (politicalMap[y][x] === smallCountryId) {
          politicalMap[y][x] = largeCountryId;
        }
      }
    }
  };

  let countriesToMerge = [];
  do {
    countriesToMerge = [];
    for (const [countryId, size] of Object.entries(countrySizes)) {
      if (size < minCountrySize) {
        countriesToMerge.push(parseInt(countryId));
      }
    }

    for (const smallCountryId of countriesToMerge) {
      if (countryNeighbors[smallCountryId] && countryNeighbors[smallCountryId].size > 0) {
        const largeCountryId = Array.from(countryNeighbors[smallCountryId])[0];
        mergeCountries(smallCountryId, largeCountryId);
      } else {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (politicalMap[y][x] === smallCountryId) {
              politicalMap[y][x] = 0;
            }
          }
        }
      }
    }

    // Пересчет размеров стран после объединения
    countrySizes = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const countryId = politicalMap[y][x];
        if (countryId > 0) {
          if (!countrySizes[countryId]) {
            countrySizes[countryId] = 0;
          }
          countrySizes[countryId]++;
        }
      }
    }

    // Пересчет соседей стран после объединения
    countryNeighbors = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const countryId = politicalMap[y][x];
        if (countryId > 0) {
          if (!countryNeighbors[countryId]) {
            countryNeighbors[countryId] = new Set();
          }
          for (const { dx, dy } of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (isValid(nx, ny) && politicalMap[ny][nx] !== countryId && politicalMap[ny][nx] !== 0) {
              countryNeighbors[countryId].add(politicalMap[ny][nx]);
            }
          }
        }
      }
    }
  } while (countriesToMerge.length > 0);

  // Проверка на наличие незанятых клеток и присоединение их к ближайшим странам
  const checkRadius = 100;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (politicalMap[y][x] === 0 && physicalMap[y][x].type !== terrainType.OCEAN && physicalMap[y][x].type !== terrainType.SEA && physicalMap[y][x].type !== terrainType.RIVER) {
        let nearestCountryId = null;
        let nearestDistance = Infinity;

        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
          for (let dx = -checkRadius; dx <= checkRadius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (isValid(nx, ny) && politicalMap[ny][nx] > 0) {
              const distance = Math.sqrt((nx - x) ** 2 + (ny - y) ** 2);
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestCountryId = politicalMap[ny][nx];
              }
            }
          }
        }

        if (nearestCountryId !== null) {
          politicalMap[y][x] = nearestCountryId;
        }
      }
    }
  }
  

  return politicalMap;
}

function generateCountryNames(politicalMap) {
  const countryNames = {};
  const nameParts = [
    ['Ael', 'Ber', 'Cor', 'Dor', 'Eri', 'Fel', 'Gil', 'Hel', 'Ili', 'Jor', 'Kal', 'Lor', 'Mer', 'Nor', 'Oli', 'Pel', 'Qui', 'Ral', 'Sel', 'Tel', 'Uli', 'Ver', 'Wel', 'Xel', 'Yel', 'Zel'],
    ['an', 'ar', 'en', 'er', 'in', 'ir', 'on', 'or', 'un', 'ur', 'as', 'es', 'is', 'os', 'us', 'ys', 'ax', 'ex', 'ix', 'ox', 'ux', 'ay', 'ey', 'iy', 'oy', 'uy'],
    ['d', 'f', 'g', 'l', 'm', 'n', 'r', 's', 't', 'v', 'x', 'z', 'ch', 'sh', 'th', 'ph', 'rh', 'kh', 'gh', 'dh'],
    ['a', 'e', 'i', 'o', 'u', 'ae', 'ai', 'ao', 'au', 'ea', 'ei', 'eo', 'eu', 'ia', 'ie', 'io', 'iu', 'oa', 'oe', 'oi', 'ou', 'ua', 'ue', 'ui', 'uo', 'uu']
  ];

  const uniqueCountryIds = new Set();

  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        uniqueCountryIds.add(countryId);
      }
    }
  }

  uniqueCountryIds.forEach(countryId => {
    let name = '';
    const nameLength = Math.floor(Math.random() * 3) + 2; // Длина имени от 2 до 4 слогов
    for (let i = 0; i < nameLength; i++) {
      name += nameParts[i % nameParts.length][Math.floor(Math.random() * nameParts[i % nameParts.length].length)];
    }
    countryNames[countryId] = name.charAt(0).toUpperCase() + name.slice(1);
  });

  return countryNames;
}

function calculateCountryCenters(politicalMap, physicalMap) {
  const countryCenters = {};
  const countrySizes = {};
  const directions = [
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 }
  ];

  function findIslands(countryId, width, height) {
    const visited = Array.from({ length: height }, () => Array(width).fill(false));
    const islands = [];

    function dfs(startX, startY) {
      const stack = [{ x: startX, y: startY }];
      const island = [];

      while (stack.length > 0) {
        const { x, y } = stack.pop();

        if (x < 0 || x >= width || y < 0 || y >= height || visited[y][x] || politicalMap[y][x] !== countryId) {
          continue;
        }

        visited[y][x] = true;
        island.push({ x, y });

        for (const { dx, dy } of directions) {
          stack.push({ x: x + dx, y: y + dy });
        }
      }

      return island;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (politicalMap[y][x] === countryId && !visited[y][x]) {
          const island = dfs(x, y);
          islands.push(island);
        }
      }
    }

    return islands;
  }

  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        if (!countrySizes[countryId]) {
          countrySizes[countryId] = 0;
        }
        countrySizes[countryId]++;
      }
    }
  }

  for (const countryId in countrySizes) {
    const islands = findIslands(parseInt(countryId), politicalMap[0].length, politicalMap.length);
    let largestIsland = null;
    let largestIslandSize = 0;

    for (const island of islands) {
      if (island.length > largestIslandSize) {
        largestIsland = island;
        largestIslandSize = island.length;
      }
    }

    if (largestIsland) {
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      for (const { x, y } of largestIsland) {
        sumX += x;
        sumY += y;
        count++;
      }

      countryCenters[countryId] = {
        x: Math.round(sumX / count),
        y: Math.round(sumY / count),
        size: countrySizes[countryId]
      };
    }
  }

  return countryCenters;
}

function drawCountryNames(ctx, politicalMap, countryNames, countryCenters, cellSize) {
  ctx.textAlign = 'center'; // Выравнивание текста по центру
  ctx.fillStyle = '#000000'; // Цвет текста

  for (const countryId in countryCenters) {
    const center = countryCenters[countryId];
    const name = countryNames[countryId];
    const countrySize = center.size;

    // Определяем начальный размер шрифта в зависимости от размера страны
    let fontSize = Math.max(10, Math.min(35, Math.floor(Math.sqrt(countrySize) / 2)));
    ctx.font = `${fontSize}px Cinzel`;

    // Вычисляем угол поворота текста
    const angle = Math.random() * Math.PI / 2 - Math.PI / 4; // Случайный угол от -22.5° до 22.5°

    // Сохраняем текущее состояние контекста
    ctx.save();

    // Перемещаем начало координат в центр текста
    ctx.translate((center.x + 0.5) * cellSize, (center.y + 0.5) * cellSize);

    // Поворачиваем контекст
    ctx.rotate(angle);

    // Проверяем, помещается ли текст в границы страны
    const textWidth = ctx.measureText(name).width;
    const textHeight = fontSize; // Приблизительная высота текста

    // Если текст не помещается, уменьшаем размер шрифта
    while (textWidth > countrySize * cellSize * 0.8 || textHeight > countrySize * cellSize * 0.8) {
      fontSize -= 1;
      ctx.font = `${fontSize}px Cinzel`;
    }

    // Отрисовка названия страны
    ctx.fillText(name, 0, 10); // Смещение по Y для выравнивания

    // Восстанавливаем состояние контекста
    ctx.restore();
  }
}

function drawCountryBorders(ctx, politicalMap, physicalMap, cellSize) {
  const width = politicalMap[0].length;
  const height = politicalMap.length;

  ctx.strokeStyle = '#000000'; // Цвет границ
  ctx.lineWidth = 1; // Толщина границ

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        // Проверка правой границы
        if (x + 1 < width && politicalMap[y][x + 1] !== countryId) {
          const neighborType = physicalMap[y][x + 1].type;
          // Не отрисовываем границу, если соседняя клетка — вода
          if (
            neighborType !== terrainType.OCEAN &&
            neighborType !== terrainType.SEA &&
            neighborType !== terrainType.RIVER
          ) {
            ctx.beginPath();
            ctx.moveTo((x + 1) * cellSize, y * cellSize);
            ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
            ctx.stroke();
          }
        }
        // Проверка нижней границы
        if (y + 1 < height && politicalMap[y + 1][x] !== countryId) {
          const neighborType = physicalMap[y + 1][x].type;
          // Не отрисовываем границу, если соседняя клетка — вода
          if (
            neighborType !== terrainType.OCEAN &&
            neighborType !== terrainType.SEA &&
            neighborType !== terrainType.RIVER
          ) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, (y + 1) * cellSize);
            ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
            ctx.stroke();
          }
        }
      }
    }
  }
}

function drawPoliticalMap(politicalMap, physicalMap, cellSize) {
  const canvas = document.getElementById('political-map-canvas');
  canvas.width = politicalMap[0].length * cellSize;
  canvas.height = politicalMap.length * cellSize;
  const ctx = canvas.getContext('2d');

  // Отрисовка физической карты на втором холсте
  for (let y = 0; y < physicalMap.length; y++) {
    for (let x = 0; x < physicalMap[y].length; x++) {
      const info = physicalMap[y][x];
      ctx.fillStyle = info.color;

      if (info.type === terrainType.RIVER) {
        const width = info.width;
        if (width === 1) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        } else if (width === 2) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect((x - 1) * cellSize, y * cellSize, cellSize, cellSize);
        } else if (width === 3) {
          ctx.fillRect((x - 1) * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect((x + 1) * cellSize, y * cellSize, cellSize, cellSize);
        }
      } else {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  const colors = {};
  let colorIndex = 0;

  // Создаем массив цветов для каждой страны
  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0 && !colors[countryId]) {
        colors[countryId] = predefinedColors[colorIndex % predefinedColors.length];
        colorIndex++;
      }
    }
  }

  // Отрисовка политической карты поверх физической
  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        ctx.fillStyle = colors[countryId];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  // Отрисовка границ стран (с проверкой на воду)
  drawCountryBorders(ctx, politicalMap, physicalMap, cellSize);

  // Генерация названий стран и их центров
  const countryNames = generateCountryNames(politicalMap);
  const countryCenters = calculateCountryCenters(politicalMap, physicalMap);

  // Отрисовка названий стран
  drawCountryNames(ctx, politicalMap, countryNames, countryCenters, cellSize);

  // Создание списка стран
  createCountryList(countryNames);

  // Показываем кнопку для создания карты страны
  document.getElementById('generate-country-map').style.display = 'block'

  // Показываем холст политической карты
  canvas.style.display = 'block';

  const downloadPoliticalMapButton = document.getElementById('download-political-map');
  downloadPoliticalMapButton.style.display = 'inline-block';
  downloadPoliticalMapButton.disabled = false;
}

document.getElementById('generate-political-map').addEventListener('click', async () => {
  // Показываем статусное сообщение
  drawStatusMessage('generatingPoliticalMap');

  // Центрируем статусное сообщение
  centerStatusMessage();

  await new Promise(resolve => setTimeout(resolve, 100));

  // Генерация политической карты
  politicalMap = generatePoliticalMap(physmap, physmap[0].length, physmap.length, 1000);
  console.log('Политическая карта сохранена:', politicalMap);
  // Отрисовываем политическую карту на втором холсте
  drawPoliticalMap(politicalMap, physmap, cellSize);

  // Скрываем статусное сообщение через 2 секунды
  setTimeout(() => {
    hideStatusMessage();
  }, 200);
});

function createCountryList(countryNames) {
  const countryList = document.getElementById('country-list');
  countryList.innerHTML = ''; // Очищаем список перед созданием нового

  for (const countryId in countryNames) {
    const option = document.createElement('option');
    option.value = countryId;
    option.textContent = countryNames[countryId];
    countryList.appendChild(option);
  }

  // Показываем список стран
  countryList.style.display = 'block';
}

document.getElementById('generate-country-map').addEventListener('click', () => {
  const countryList = document.getElementById('country-list');
  const selectedCountryId = parseInt(countryList.value, 10);
  if (!selectedCountryId) {
      alert('Выберите страну из списка!');
      return;
  }

  console.log('Проверка переменных перед использованием:', { politicalMap, physmap });
  
  if (!politicalMap || !Array.isArray(politicalMap) || politicalMap.length === 0) {
      alert('Политическая карта не была сгенерирована! Попробуйте снова.');
      return;
  }

  if (!physmap || !Array.isArray(physmap) || physmap.length === 0) {
      alert('Физическая карта не была сгенерирована! Попробуйте снова.');
      return;
  }

  const mapWidth = politicalMap[0].length;
  const mapHeight = politicalMap.length;
  let minX = mapWidth, maxX = 0, minY = mapHeight, maxY = 0;
  
  for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
          if (politicalMap[y][x] === selectedCountryId) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
          }
      }
  }

  const countryWidth = maxX - minX + 1;
  const countryHeight = maxY - minY + 1;
  const extraWidth = Math.floor(countryWidth * 0.1);
  const extraHeight = Math.floor(countryHeight * 0.1);
  
  const startX = Math.max(0, minX - extraWidth);
  const endX = Math.min(mapWidth - 1, maxX + extraWidth);
  const startY = Math.max(0, minY - extraHeight);
  const endY = Math.min(mapHeight - 1, maxY + extraHeight);

  const newWidth = endX - startX + 1;
  const newHeight = endY - startY + 1;

  const countryMapCanvas = document.getElementById('country-map-canvas');
  const ctx = countryMapCanvas.getContext('2d');
  countryMapCanvas.width = newWidth * cellSize;
  countryMapCanvas.height = newHeight * cellSize;
  
  ctx.clearRect(0, 0, countryMapCanvas.width, countryMapCanvas.height);
  
  for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
          if (politicalMap[y][x] === selectedCountryId) {
              ctx.fillStyle = physmap[y][x]?.color || '#000000';
              ctx.fillRect((x - startX) * cellSize, (y - startY) * cellSize, cellSize, cellSize);
          }
      }
  }
  
  countryMapCanvas.style.display = 'block';

  let downloadButton = document.getElementById('download-country-map');
  if (!downloadButton) {
      downloadButton = document.createElement('button');
      downloadButton.id = 'download-country-map';
      downloadButton.textContent = 'Скачать карту страны';
      document.body.appendChild(downloadButton);
  }

  downloadButton.addEventListener('click', () => {
      const dataURL = countryMapCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'country_map.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  });
});
