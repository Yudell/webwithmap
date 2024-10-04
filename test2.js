const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const { createNoise, newFractalNoise, defaultOctaves, defaultFrequency, defaultPersistence, generateRandomSeed } = require('./mapgen');
const predefinedColors = require('./colors');

// Константы для типов местности
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

// Функция для генерации карты
function generateMap(width, height, terrainNoise, variantNoise, biomeNoise) {
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

      // Определение типа местности и вариантов на основе шумов
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
      } else if (biomeValue > 0.5) { // Используем biomeValue для определения пустыни
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

// Функция для отрисовки карты
function drawMap(map, cellSize) {
  const canvas = createCanvas(map[0].length * cellSize, map.length * cellSize);
  const ctx = canvas.getContext('2d');

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

  return canvas;
}

function generatePoliticalMap(physicalMap, width, height, minCountrySize) {
  const politicalMap = Array.from({ length: height }, () => Array(width).fill(0));
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

function drawSolidBorders(ctx, politicalMap, physicalMap, cellSize) {
  const width = politicalMap[0].length;
  const height = politicalMap.length;

  ctx.strokeStyle = '#000000'; // Цвет границ
  ctx.lineWidth = 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        // Проверка правой границы
        if (x + 1 < width && politicalMap[y][x + 1] !== countryId) {
          const neighborType = physicalMap[y][x + 1].type;
          if (neighborType !== terrainType.SEA && neighborType !== terrainType.OCEAN && neighborType !== terrainType.RIVER) {
            ctx.beginPath();
            ctx.moveTo((x + 1) * cellSize, y * cellSize);
            ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
            ctx.stroke();
          }
        }
        // Проверка нижней границы
        if (y + 1 < height && politicalMap[y + 1][x] !== countryId) {
          const neighborType = physicalMap[y + 1][x].type;
          if (neighborType !== terrainType.SEA && neighborType !== terrainType.OCEAN && neighborType !== terrainType.RIVER) {
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

// Сохранение карты в виде PNG-файла
function saveMapAsPNG(canvas, filename) {
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
}

// Конфигурация
const mapWidth = 500;
const mapHeight = 500;
const cellSize = 10;

// Генерация случайного сида
const terrainSeed = generateRandomSeed();
const variantSeed = generateRandomSeed();
const biomeSeed = generateRandomSeed();

// Использование случайного сида для функций шума
const terrainNoise = createNoise(terrainSeed);
const variantNoise = createNoise(variantSeed);
const biomeNoise = createNoise(biomeSeed);

const getTerrainNoise = newFractalNoise({
  noise: terrainNoise,
  octaves: defaultOctaves,
  frequency: defaultFrequency,
  persistence: defaultPersistence
});

const getVariantNoise = newFractalNoise({
  noise: variantNoise,
  octaves: defaultOctaves,
  frequency: defaultFrequency,
  persistence: defaultPersistence
});

const getBiomeNoise = newFractalNoise({
  noise: biomeNoise,
  octaves: defaultOctaves,
  frequency: defaultFrequency,
  persistence: defaultPersistence
});

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

  // Массив для определения противоположных направлений
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

  // Определение истоков рек
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((map[y][x].type === terrainType.MOUNTAIN || map[y][x].type === terrainType.MOUNTAIN_ORE || map[y][x].type === terrainType.WET_GRASS || map[y][x].type === terrainType.DRY_GRASS || map[y][x].type === terrainType.GRASS) && Math.random() < 0.000085) {
        riverSources.push({ x, y });
      }
    }
  }

  // Расчет вероятности завершения реки
  const riverTerminationProbability = 0.01 / averageRiverLength;

  // Построение рек
  riverSources.forEach(source => {
    let current = source;
    let riverDirection = directions[Math.floor(Math.random() * directions.length)];
    const visited = new Set();
    visited.add(`${current.x},${current.y}`);
    let riverLength = 0; // Начальная длина реки
    let previousDirection = null; // Предыдущее направление

    while (current) {
      map[current.y][current.x].type = terrainType.RIVER;
      map[current.y][current.x].color = '#0952c6'; // Синий цвет для реки
      map[current.y][current.x].width = Math.min(3, Math.floor(riverLength / 120) + 1); // Увеличиваем ширину реки с её длиной

      riverLength++; // Увеличиваем длину реки

      // Найти следующую клетку с наименьшей высотой
      let next = null;
      let minHeight = heightMap[current.y][current.x];
      const possibleDirections = [
        riverDirection,
        { dx: riverDirection.dx + 1, dy: riverDirection.dy },
        { dx: riverDirection.dx - 1, dy: riverDirection.dy },
        { dx: riverDirection.dx, dy: riverDirection.dy + 1 },
        { dx: riverDirection.dx, dy: riverDirection.dy - 1 }
      ].filter(dir => dir.dx >= -1 && dir.dx <= 1 && dir.dy >= -1 && dir.dy <= 1 && `${dir.dx},${dir.dy}` !== oppositeDirections[`${riverDirection.dx},${riverDirection.dy}`] && `${dir.dx},${dir.dy}` !== previousDirection);

      // Перемешиваем направления для разнообразия
      possibleDirections.sort(() => Math.random() - 0.65);

      for (const dir of possibleDirections) {
        const ny = current.y + dir.dy;
        const nx = current.x + dir.dx;
        if (ny >= 0 && ny < height && nx >= 0 && nx < width && !visited.has(`${nx},${ny}`)) {
          if (heightMap[ny][nx] < minHeight) {
            minHeight = heightMap[ny][nx];
            next = { x: nx, y: ny };
            previousDirection = `${riverDirection.dx},${riverDirection.dy}`; // Сохраняем предыдущее направление
            riverDirection = dir; // Обновляем основное направление реки
          } else if (heightMap[ny][nx] === minHeight && Math.random() < 0.005) {
            next = { x: nx, y: ny };
            previousDirection = `${riverDirection.dx},${riverDirection.dy}`; // Сохраняем предыдущее направление
            riverDirection = dir; // Обновляем основное направление реки
          } else {
            next = { x: nx, y: ny };
          }
        }
      }

      // Если следующая клетка — море или океан, завершить реку
      if (next && (map[next.y][next.x].type === terrainType.OCEAN || map[next.y][next.x].type === terrainType.SEA || map[next.y][next.x].type === terrainType.RIVER)) {
        map[next.y][next.x].type = terrainType.RIVER;
        map[next.y][next.x].color = '#0952c6';
        map[next.y][next.x].width = Math.min(3, Math.floor(riverLength / 120) + 1); // Увеличиваем ширину реки с её длиной
        break;
      }

      // Проверка вероятности завершения реки
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

// Генерация физической карты и рек
const physmap = generateMap(mapWidth, mapHeight, getTerrainNoise, getVariantNoise, getBiomeNoise);
generateRivers(physmap, physmap.map(row => row.map(cell => cell.type === terrainType.MOUNTAIN ? 1 : 0)), 250); // Средняя длина реки
const physcanvas = drawMap(physmap, cellSize);
saveMapAsPNG(physcanvas, 'physical_map_with_river.png');

// Функция для генерации случайных названий стран
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

// Функция для вычисления центра страны
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

registerFont('fonts/Cinzel-Bold.ttf', { family: 'Cinzel' })

// Функция для отрисовки названий стран
function drawCountryNames(ctx, politicalMap, countryNames, countryCenters, cellSize) {
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

  const possiblePositions = [
    { dx: 0, dy: 0 }, // Центр
    { dx: 0, dy: -1 }, // Вверх
    { dx: 0, dy: 1 }, // Вниз
    { dx: -1, dy: 0 }, // Влево
    { dx: 1, dy: 0 }, // Вправо
    { dx: -1, dy: -1 }, // Влево-вверх
    { dx: 1, dy: -1 }, // Вправо-вверх
    { dx: -1, dy: 1 }, // Влево-вниз
    { dx: 1, dy: 1 } // Вправо-вниз
  ];

  const possibleRotations = [0]; // Дефолтное положение по горизонтали
  for (let i = Math.PI / 16; i <= Math.PI / 3; i += Math.PI / 64) {
    possibleRotations.push(i); // По часовой стрелке
  }
  for (let i = -Math.PI / 16; i >= -Math.PI / 3; i -= Math.PI / 64) {
    possibleRotations.push(i); // Против часовой стрелки
  }

  const drawnNames = [];

  for (const countryId in countryCenters) {
    const center = countryCenters[countryId];
    const name = countryNames[countryId];
    const fontSize = Math.max(20, Math.min(128, Math.sqrt(center.size) * 1)); // Увеличенный размер шрифта

    // Вычисляем ширину и высоту названия в пикселях
    ctx.font = `${fontSize}px Cinzel`;
    const textMetrics = ctx.measureText(name);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    let bestPosition = null;
    let bestRotation = 0;
    let minOverlap = Infinity;

    for (const pos of possiblePositions) {
      for (const rotation of possibleRotations) {
        const textX = (center.x + pos.dx + 0.5) * cellSize;
        const textY = (center.y + pos.dy + 0.5) * cellSize + fontSize / 2;

        // Проверка на перекрытие с другими странами и границами
        let overlap = 0;
        for (let dy = -textHeight / 2; dy <= textHeight / 2; dy += 2) {
          for (let dx = -textWidth / 2; dx <= textWidth / 2; dx += 2) {
            const px = textX + dx * Math.cos(rotation) - dy * Math.sin(rotation);
            const py = textY + dx * Math.sin(rotation) + dy * Math.cos(rotation);
            const mapX = Math.floor(px / cellSize);
            const mapY = Math.floor(py / cellSize);

            if (mapX >= 0 && mapX < politicalMap[0].length && mapY >= 0 && mapY < politicalMap.length) {
              if (politicalMap[mapY][mapX] !== parseInt(countryId)) {
                overlap++;
              }
            }
          }
        }

        // Проверка на перекрытие с уже отрисованными названиями
        let nameOverlap = false;
        for (const drawnName of drawnNames) {
          const dx = Math.abs(drawnName.x - textX);
          const dy = Math.abs(drawnName.y - textY);
          if (dx < textWidth && dy < textHeight) {
            nameOverlap = true;
            break;
          }
        }

        if (!nameOverlap && overlap < minOverlap) {
          minOverlap = overlap;
          bestPosition = { x: textX, y: textY };
          bestRotation = rotation;
        }
      }
    }

    // Если найдено перекрытие, пытаемся сдвинуть название
    if (minOverlap > 0) {
      const directions = [
        { dx: 0, dy: -1 }, // Вверх
        { dx: 0, dy: 1 }, // Вниз
        { dx: -1, dy: 0 }, // Влево
        { dx: 1, dy: 0 } // Вправо
      ];

      let bestShift = null;
      let bestShiftOverlap = minOverlap;

      for (const dir of directions) {
        let shiftX = bestPosition.x;
        let shiftY = bestPosition.y;
        let shiftOverlap = minOverlap;

        while (shiftOverlap > 0) {
          shiftX += dir.dx * cellSize;
          shiftY += dir.dy * cellSize;

          shiftOverlap = 0;
          for (let dy = -textHeight / 2; dy <= textHeight / 2; dy += 2) {
            for (let dx = -textWidth / 2; dx <= textWidth / 2; dx += 2) {
              const px = shiftX + dx * Math.cos(bestRotation) - dy * Math.sin(bestRotation);
              const py = shiftY + dx * Math.sin(bestRotation) + dy * Math.cos(bestRotation);
              const mapX = Math.floor(px / cellSize);
              const mapY = Math.floor(py / cellSize);

              if (mapX >= 0 && mapX < politicalMap[0].length && mapY >= 0 && mapY < politicalMap.length) {
                if (politicalMap[mapY][mapX] !== parseInt(countryId)) {
                  shiftOverlap++;
                }
              }
            }
          }

          // Проверка на перекрытие с уже отрисованными названиями
          let nameOverlap = false;
          for (const drawnName of drawnNames) {
            const dx = Math.abs(drawnName.x - shiftX);
            const dy = Math.abs(drawnName.y - shiftY);
            if (dx < textWidth && dy < textHeight) {
              nameOverlap = true;
              break;
            }
          }

          if (!nameOverlap && shiftOverlap < bestShiftOverlap) {
            bestShiftOverlap = shiftOverlap;
            bestShift = { x: shiftX, y: shiftY };
          }
        }
      }

      if (bestShift) {
        bestPosition = bestShift;
      }
    }

    // Если все еще есть перекрытие, пытаемся найти свободную позицию в радиусе
    if (minOverlap > 0) {
      let radius = 1;
      while (radius < 10) { // Ограничиваем радиус поиска
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            const textX = (center.x + dx + 0.5) * cellSize;
            const textY = (center.y + dy + 0.5) * cellSize + fontSize / 2;

            let overlap = 0;
            for (let dy = -textHeight / 2; dy <= textHeight / 2; dy += 2) {
              for (let dx = -textWidth / 2; dx <= textWidth / 2; dx += 2) {
                const px = textX + dx * Math.cos(bestRotation) - dy * Math.sin(bestRotation);
                const py = textY + dx * Math.sin(bestRotation) + dy * Math.cos(bestRotation);
                const mapX = Math.floor(px / cellSize);
                const mapY = Math.floor(py / cellSize);

                if (mapX >= 0 && mapX < politicalMap[0].length && mapY >= 0 && mapY < politicalMap.length) {
                  if (politicalMap[mapY][mapX] !== parseInt(countryId)) {
                    overlap++;
                  }
                }
              }
            }

            // Проверка на перекрытие с уже отрисованными названиями
            let nameOverlap = false;
            for (const drawnName of drawnNames) {
              const dx = Math.abs(drawnName.x - textX);
              const dy = Math.abs(drawnName.y - textY);
              if (dx < textWidth && dy < textHeight) {
                nameOverlap = true;
                break;
              }
            }

            if (!nameOverlap && overlap < minOverlap) {
              minOverlap = overlap;
              bestPosition = { x: textX, y: textY };
            }
          }
        }
        radius++;
      }
    }

    // Отрисовка названия в лучшей позиции с тенью и вращением
    if (bestPosition) {
      ctx.save(); // Сохраняем текущее состояние контекста
      ctx.translate(bestPosition.x, bestPosition.y); // Перемещаем начало координат
      ctx.rotate(bestRotation); // Вращаем контекст

      // Настройка тени
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      // Рисуем текст
      ctx.fillStyle = '#000000'; // Цвет текста
      ctx.fillText(name, 0, 0);

      // Восстанавливаем состояние контекста
      ctx.restore();

      // Добавляем отрисованное название в список
      drawnNames.push({ x: bestPosition.x, y: bestPosition.y, width: textWidth, height: textHeight });
    }
  }
}

// Генерация политической карты
const minCountrySize = 1000; // Пример минимального размера страны
const politicalMap = generatePoliticalMap(physmap, mapWidth, mapHeight, minCountrySize);

// Проверка и корректировка идентификаторов стран
const uniqueCountryIds = new Set();
for (let y = 0; y < politicalMap.length; y++) {
  for (let x = 0; x < politicalMap[y].length; x++) {
    const countryId = politicalMap[y][x];
    if (countryId > 0) {
      uniqueCountryIds.add(countryId);
    }
  }
}

// Генерация названий стран
const countryNames = generateCountryNames(politicalMap);

// Вычисление центров стран
const countryCenters = calculateCountryCenters(politicalMap, physmap);

function checkAndAdjustCountryColors(politicalMap, physicalMap, cellSize) {
  const width = politicalMap[0].length;
  const height = politicalMap.length;
  const colors = {};
  let colorIndex = 0;

  // Создаем массив цветов для каждой страны
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0 && !colors[countryId]) {
        colors[countryId] = predefinedColors[colorIndex % predefinedColors.length];
        colorIndex++;
      }
    }
  }

  // Проверка и корректировка цветов стран
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        const countryColor = colors[countryId];
        const borderRadius = 30; // Радиус проверки

        // Проверка соседних клеток в радиусе 20 клеток
        for (let dy = -borderRadius; dy <= borderRadius; dy++) {
          for (let dx = -borderRadius; dx <= borderRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const neighborCountryId = politicalMap[ny][nx];
              if (neighborCountryId !== countryId && colors[neighborCountryId] === countryColor) {
                // Найдена соседняя страна с таким же цветом
                // Можно либо изменить цвет соседней страны, либо перекрасить текущую страну
                const newColor = predefinedColors[colorIndex % predefinedColors.length];
                colors[neighborCountryId] = newColor;
                colorIndex++;
              }
            }
          }
        }
      }
    }
  }

  return colors;
}

// Отрисовка политической карты с проверкой цветов стран
function drawPoliticalMapWithColorCheck(physicalMap, politicalMap, cellSize) {
  const canvas = drawMap(physicalMap, cellSize);
  const ctx = canvas.getContext('2d');

  const colors = checkAndAdjustCountryColors(politicalMap, physicalMap, cellSize);

  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        ctx.fillStyle = colors[countryId];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  // Рисуем сплошные границы
  drawSolidBorders(ctx, politicalMap, physicalMap, cellSize);

  // Отрисовка рек на политической карте
  for (let y = 0; y < physicalMap.length; y++) {
    for (let x = 0; x < physicalMap[y].length; x++) {
      const info = physicalMap[y][x];
      if (info.type === terrainType.RIVER) {
        ctx.fillStyle = info.color;
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
      }
    }
  }

  return canvas;
}

// Отрисовка политической карты с проверкой цветов стран и названиями стран
const politicalCanvasWithColorCheck = drawPoliticalMapWithColorCheck(physmap, politicalMap, cellSize);
const ctxWithColorCheck = politicalCanvasWithColorCheck.getContext('2d');
drawCountryNames(ctxWithColorCheck, politicalMap, countryNames, countryCenters, cellSize);

// Сохранение карты с проверкой цветов стран и названиями стран
saveMapAsPNG(politicalCanvasWithColorCheck, 'political_map_with_color_check_and_names.png');

// Функция для генерации цвета, близкого к заданному цвету
function generateSimilarColor(baseColor, variation) {
  const [r, g, b] = baseColor.match(/\w\w/g).map(c => parseInt(c, 16));
  const newR = Math.min(255, Math.max(0, r + Math.floor(Math.random() * variation * 3 - variation)));
  const newG = Math.min(255, Math.max(0, g + Math.floor(Math.random() * variation * 3 - variation)));
  const newB = Math.min(255, Math.max(0, b + Math.floor(Math.random() * variation * 3 - variation)));
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function drawRegionBorders(ctx, regionMap, physicalMap, cellSize) {
  const width = regionMap[0].length;
  const height = regionMap.length;

  ctx.strokeStyle = '#000000'; // Цвет границ
  ctx.lineWidth = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const regionId = regionMap[y][x];
      if (regionId > 0) {
        // Проверка правой границы
        if (x + 1 < width && regionMap[y][x + 1] !== regionId) {
          const neighborType = physicalMap[y][x + 1].type;
          if (neighborType !== terrainType.SEA && neighborType !== terrainType.OCEAN && neighborType !== terrainType.RIVER) {
            ctx.beginPath();
            ctx.moveTo((x + 1) * cellSize, y * cellSize);
            ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
            ctx.stroke();
          }
        }
        // Проверка нижней границы
        if (y + 1 < height && regionMap[y + 1][x] !== regionId) {
          const neighborType = physicalMap[y + 1][x].type;
          if (neighborType !== terrainType.SEA && neighborType !== terrainType.OCEAN && neighborType !== terrainType.RIVER) {
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

// Отрисовка карты регионов поверх политической карты с похожими цветами, границами регионов и названиями стран
function drawRegionMapOverPoliticalMapWithSimilarColorsAndBorders(physicalMap, politicalMap, regionMap, countryNames, countryCenters, cellSize) {
  const canvas = drawMap(physicalMap, cellSize);
  const ctx = canvas.getContext('2d');

  // Отрисовка политической карты
  const politicalColors = checkAndAdjustCountryColors(politicalMap, physicalMap, cellSize);
  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        ctx.fillStyle = politicalColors[countryId];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  // Отрисовка рек на политической карте
  for (let y = 0; y < physicalMap.length; y++) {
    for (let x = 0; x < physicalMap[y].length; x++) {
      const info = physicalMap[y][x];
      if (info.type === terrainType.RIVER) {
        ctx.fillStyle = info.color;
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
      }
    }
  }

  // Отрисовка регионов поверх политической карты с похожими цветами
  const regionColors = {};
  const regionCountryColors = {};

  // Переопределение цвета региона на основе страны, в которой он находится
  for (let y = 0; y < regionMap.length; y++) {
    for (let x = 0; x < regionMap[y].length; x++) {
      const regionId = regionMap[y][x];
      const countryId = politicalMap[y][x];
      if (regionId > 0 && !regionColors[regionId]) {
        if (!regionCountryColors[countryId]) {
          regionCountryColors[countryId] = politicalColors[countryId];
        }
        regionColors[regionId] = generateSimilarColor(regionCountryColors[countryId], 30); // Генерация цвета, близкого к цвету страны
      }
    }
  }

  // Проверка каждого региона на принадлежность к стране
  const regionCountries = {};
  for (let y = 0; y < regionMap.length; y++) {
    for (let x = 0; x < regionMap[y].length; x++) {
      const regionId = regionMap[y][x];
      const countryId = politicalMap[y][x];
      if (regionId > 0) {
        if (!regionCountries[regionId]) {
          regionCountries[regionId] = new Set();
        }
        regionCountries[regionId].add(countryId);
      }
    }
  }

  // Если регион принадлежит более чем одной стране, перекрашиваем его в цвет страны, в которой он находится
  for (const regionId in regionCountries) {
    if (regionCountries[regionId].size > 1) {
      const countryId = Array.from(regionCountries[regionId])[0]; // Берем первую страну из множества
      regionColors[regionId] = generateSimilarColor(politicalColors[countryId], 10);
    }
  }

  for (let y = 0; y < regionMap.length; y++) {
    for (let x = 0; x < regionMap[y].length; x++) {
      const regionId = regionMap[y][x];
      if (regionId > 0) {
        ctx.fillStyle = regionColors[regionId];
        ctx.globalAlpha = 0.8; // Устанавливаем полупрозрачность для регионов
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.globalAlpha = 1; // Возвращаем прозрачность к 1
      }
    }
  }

  // Отрисовка границ регионов
  drawRegionBorders(ctx, regionMap, physicalMap, cellSize);

  // Отрисовка границ стран
  drawSolidBorders(ctx, politicalMap, physicalMap, cellSize);

  // Отрисовка названий стран на политической карте
  drawCountryNames(ctx, politicalMap, countryNames, countryCenters, cellSize);

  return canvas;
}

// Генерация карты регионов с учетом границ страны
function generateRegionMapWithCountryBoundaries(politicalMap, physicalMap, width, height, minRegionSize, noiseSettings) {
  const regionMap = Array.from({ length: height }, () => Array(width).fill(0));
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  let regionId = 1;

  const directions = [
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 }
  ];

  function isValid(x, y) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  function floodFill(x, y, countryId, regionNoise) {
    const queue = [{ x, y }];
    const regionValue = regionNoise(x / 100, y / 100);
    const regionThreshold = 0.2;

    while (queue.length > 0) {
      const { x, y } = queue.shift();

      if (!isValid(x, y) || visited[y][x] || politicalMap[y][x] !== countryId) {
        continue;
      }

      visited[y][x] = true;
      regionMap[y][x] = regionId;

      for (const { dx, dy } of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (isValid(nx, ny) && !visited[ny][nx] && politicalMap[ny][nx] === countryId && Math.abs(regionNoise(nx / 100, ny / 100) - regionValue) < regionThreshold) {
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  // Первый проход: заполнение регионов внутри стран
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0 && !visited[y][x]) {
        const regionSeed = generateRandomSeed();
        const regionNoise = newFractalNoise({
          noise: createNoise(regionSeed),
          octaves: noiseSettings.octaves,
          frequency: noiseSettings.frequency,
          persistence: noiseSettings.persistence
        });
        floodFill(x, y, countryId, regionNoise);
        regionId++;
      }
    }
  }

  // Проверка размеров регионов и их объединение при необходимости
  let regionSizes = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const regionId = regionMap[y][x];
      if (regionId > 0) {
        if (!regionSizes[regionId]) {
          regionSizes[regionId] = 0;
        }
        regionSizes[regionId]++;
      }
    }
  }

  let regionNeighbors = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const regionId = regionMap[y][x];
      if (regionId > 0) {
        if (!regionNeighbors[regionId]) {
          regionNeighbors[regionId] = new Set();
        }
        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (isValid(nx, ny) && regionMap[ny][nx] !== regionId && regionMap[ny][nx] !== 0) {
            regionNeighbors[regionId].add(regionMap[ny][nx]);
          }
        }
      }
    }
  }

  const mergeRegions = (smallRegionId, largeRegionId) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (regionMap[y][x] === smallRegionId) {
          regionMap[y][x] = largeRegionId;
        }
      }
    }
  };

  let regionsToMerge = [];
  do {
    regionsToMerge = [];
    for (const [regionId, size] of Object.entries(regionSizes)) {
      if (size < minRegionSize) {
        regionsToMerge.push(parseInt(regionId));
      }
    }

    for (const smallRegionId of regionsToMerge) {
      if (regionNeighbors[smallRegionId] && regionNeighbors[smallRegionId].size > 0) {
        const largeRegionId = Array.from(regionNeighbors[smallRegionId])[0];
        mergeRegions(smallRegionId, largeRegionId);
      } else {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (regionMap[y][x] === smallRegionId) {
              regionMap[y][x] = 0;
            }
          }
        }
      }
    }

    // Пересчет размеров регионов после объединения
    regionSizes = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const regionId = regionMap[y][x];
        if (regionId > 0) {
          if (!regionSizes[regionId]) {
            regionSizes[regionId] = 0;
          }
          regionSizes[regionId]++;
        }
      }
    }

    // Пересчет соседей регионов после объединения
    regionNeighbors = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const regionId = regionMap[y][x];
        if (regionId > 0) {
          if (!regionNeighbors[regionId]) {
            regionNeighbors[regionId] = new Set();
          }
          for (const { dx, dy } of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (isValid(nx, ny) && regionMap[ny][nx] !== regionId && regionMap[ny][nx] !== 0) {
              regionNeighbors[regionId].add(regionMap[ny][nx]);
            }
          }
        }
      }
    }
  } while (regionsToMerge.length > 0);

  // Проверка на наличие незанятых клеток и присоединение их к ближайшим регионам
  const checkRadius = 100;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (regionMap[y][x] === 0 && politicalMap[y][x] > 0) {
        let nearestRegionId = null;
        let nearestDistance = Infinity;

        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
          for (let dx = -checkRadius; dx <= checkRadius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (isValid(nx, ny) && regionMap[ny][nx] > 0 && politicalMap[ny][nx] === politicalMap[y][x]) {
              const distance = Math.sqrt((nx - x) ** 2 + (ny - y) ** 2);
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestRegionId = regionMap[ny][nx];
              }
            }
          }
        }

        if (nearestRegionId !== null) {
          regionMap[y][x] = nearestRegionId;
        }
      }
    }
  }

  return regionMap;
}

// Генерация карты регионов с учетом границ страны
const minRegionSize = 600; // Минимальный размер региона
const noiseSettings = {
  octaves: 100, // Количество октав
  frequency: 1, // Частота шума
  persistence: 0.7 // Персистентность
};
const regionMap = generateRegionMapWithCountryBoundaries(politicalMap, physmap, mapWidth, mapHeight, minRegionSize, noiseSettings);

// Отрисовка карты регионов поверх политической карты с похожими цветами и названиями стран
const regionCanvasOverPoliticalMapWithSimilarColorsAndBorders = drawRegionMapOverPoliticalMapWithSimilarColorsAndBorders(physmap, politicalMap, regionMap, countryNames, countryCenters, cellSize);
saveMapAsPNG(regionCanvasOverPoliticalMapWithSimilarColorsAndBorders, 'political_map_with_regions_over_political_map_and_similar_colors_and_borders_and_names.png');

