import { createNoise, newFractalNoise, defaultOctaves, defaultFrequency, defaultPersistence, generateRandomSeed } from './mapgen.js';

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
      } else if (biomeValue > 0.5) {
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

  // Очищаем холст перед отрисовкой новой карты
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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

const mapWidth = 500;
const mapHeight = 500;
const cellSize = 1;

const terrainSeed = generateRandomSeed();
const variantSeed = generateRandomSeed();
const biomeSeed = generateRandomSeed();

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

function generateAndDrawMap() {
  const physmap = generateMap(mapWidth, mapHeight, getTerrainNoise, getVariantNoise, getBiomeNoise);
  generateRivers(physmap, physmap.map(row => row.map(cell => cell.type === terrainType.MOUNTAIN ? 1 : 0)), 250);
  drawMap(physmap, cellSize);
}

document.getElementById('generate-map').addEventListener('click', generateAndDrawMap);