import { createNoise, newFractalNoise, defaultOctaves, defaultFrequency, defaultPersistence, generateRandomSeed } from './mapgen.js';
import { generatePoliticalLayer } from './political-map-gen.js';
import { terrainType } from './terrain-types.js';

/**
 * Новая фильтрация
 */
function filterSmallBiomes(map, width, height, minSize = 3) {
    const visited = Array.from({ length: height }, () => new Array(width).fill(false));
    const unfilterableTypes = new Set([
        terrainType.OCEAN,
        terrainType.SEA,
        terrainType.SHALLOW_WATER,
        terrainType.RIVER,
        terrainType.WET_SAND,
        terrainType.SAND,
        terrainType.DRY_SAND
    ]);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (visited[y][x]) continue;

            const currentType = map[y][x].type;
            if (unfilterableTypes.has(currentType)) {
                visited[y][x] = true;
                continue;
            }

            const componentCells = [];
            const queue = [{ x, y }];
            visited[y][x] = true;
            let head = 0;

            while (head < queue.length) {
                const pos = queue[head++];
                componentCells.push(pos);

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = pos.x + dx;
                        const ny = pos.y + dy;

                        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny][nx] && map[ny][nx].type === currentType) {
                            visited[ny][nx] = true;
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }
            }

            if (componentCells.length < minSize) {
                const neighborCounts = {};
                componentCells.forEach(cell => {
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = cell.x + dx;
                            const ny = cell.y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const neighborType = map[ny][nx].type;
                                if (neighborType !== currentType) {
                                    neighborCounts[neighborType] = (neighborCounts[neighborType] || 0) + 1;
                                }
                            }
                        }
                    }
                });

                let dominantNeighborType = terrainType.GRASS;
                let maxCount = 0;
                for (const type in neighborCounts) {
                    if (neighborCounts[type] > maxCount) {
                        maxCount = neighborCounts[type];
                        dominantNeighborType = type;
                    }
                }
                
                componentCells.forEach(cell => {
                    map[cell.y][cell.x].type = dominantNeighborType;
                });
            }
        }
    }
}


function createSeededRandom(seed) {
    let state = seed % 2147483647;
    if (state <= 0) state += 2147483646;
  
    return function() {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
}

let physmap = null;
let politicalMap = null;
let currentMapSeeds = null;
let cellSize = 3;
let currentMapPreset = 'CONTINENTS';
let riverNetwork = [];

let generationSettings = {
    waterLevel: 0.2,
    mountainThreshold: 0.55,
    forestThreshold: 0.7,
    numNations: 8,
    settlementDensity: 1.0
};

let currentGenerationScale = 1;
export const MIN_GENERATION_SCALE = 0.5;
export const MAX_GENERATION_SCALE = 5;
export const GENERATION_SCALE_STEP = 0.5;

const TERRAIN_HEIGHT_MAP = {
    [terrainType.OCEAN]: 0,
    [terrainType.SEA]: 1,
    [terrainType.SHALLOW_WATER]: 2,
    [terrainType.RIVER]: 2,
    [terrainType.WET_SAND]: 3,
    [terrainType.SAND]: 3,
    [terrainType.DRY_SAND]: 3,
    [terrainType.WET_GRASS]: 4,
    [terrainType.GRASS]: 4,
    [terrainType.DRY_GRASS]: 4,
    [terrainType.FOREST]: 5,
    [terrainType.GRASS_HIGHLAND]: 6,
    [terrainType.FOREST_HIGHLAND]: 7,
    [terrainType.STONE_CLIFF]: 5,
    'HILLS': 6,
    [terrainType.MOUNTAIN]: 8,
    [terrainType.MOUNTAIN_ORE]: 9,
    [terrainType.MOUNTAIN_SNOW]: 10,
};

function getColorForCellDefault(cell) {
    const noise = cell.variantNoise;
    switch(cell.type) {
        case terrainType.OCEAN: return '#183a8a';
        case terrainType.SEA: return '#204daf';
        case terrainType.SHALLOW_WATER: return '#2d71d3';
        case terrainType.RIVER: return '#2581c2';
        
        case terrainType.SAND:
        case terrainType.WET_SAND:
        case terrainType.DRY_SAND:
            return noise > 0.1 ? '#d1c9a0' : '#c2b88f';
        
        case terrainType.MOUNTAIN_SNOW: return '#f5f5f5';
        case terrainType.MOUNTAIN_ORE: return '#8c8e7b';
        case terrainType.MOUNTAIN: return '#a0a28f';

        case terrainType.GRASS:
        case terrainType.WET_GRASS:
        case terrainType.DRY_GRASS:
             return noise > 0.05 ? '#5e8c31' : '#567e2c';
        
        case terrainType.FOREST:
            return noise > 0.02 ? '#3b5a1f' : '#35501b';

        case terrainType.GRASS_HIGHLAND:
            return noise > 0.05 ? '#6a9b3a' : '#618c35';

        case terrainType.FOREST_HIGHLAND:
            return noise > 0.02 ? '#456926' : '#3e5e21';

        case terrainType.STONE_CLIFF:
            return noise > 0.1 ? '#828282' : '#7a7a7a';

        default: return '#000000';
    }
}

function getColorForCellOklch(cell) {
    const noise = cell.variantNoise;
     switch(cell.type) {
        case terrainType.OCEAN: return `oklch(35% 0.1 240)`;
        case terrainType.SEA: return `oklch(45% 0.12 235)`;
        case terrainType.SHALLOW_WATER: return `oklch(60% 0.14 230)`;
        case terrainType.RIVER: return 'oklch(55% 0.15 215)';
        
        case terrainType.SAND:
        case terrainType.WET_SAND:
        case terrainType.DRY_SAND:
            return noise > 0.1 ? `oklch(85% 0.06 95)` : `oklch(82% 0.07 95)`;
        
        case terrainType.MOUNTAIN_SNOW: return `oklch(98% 0.005 100)`;
        case terrainType.MOUNTAIN_ORE: return `oklch(60% 0.03 80)`;
        case terrainType.MOUNTAIN: return `oklch(68% 0.02 90)`;

        case terrainType.GRASS:
        case terrainType.WET_GRASS:
        case terrainType.DRY_GRASS:
             return noise > 0.05 ? `oklch(62% 0.11 130)` : `oklch(59% 0.12 130)`;
        
        case terrainType.FOREST:
            return noise > 0.05 ? `oklch(45% 0.1 135)` : `oklch(42% 0.11 135)`;

        case terrainType.GRASS_HIGHLAND:
            return noise > 0.05 ? `oklch(68% 0.12 125)` : `oklch(65% 0.13 125)`;

        case terrainType.FOREST_HIGHLAND:
            return noise > 0.05 ? `oklch(52% 0.11 135)` : `oklch(49% 0.12 135)`;

        case terrainType.STONE_CLIFF:
            return noise > 0.1 ? `oklch(58% 0.01 90)` : `oklch(55% 0.01 90)`;

        default: return '#000000';
    }
}

function assignCellColor(cell, palette) {
    if (palette === 'oklch') {
        cell.color = getColorForCellOklch(cell);
    } else {
        cell.color = getColorForCellDefault(cell);
    }
}

export function recalculatePhysmapColors(palette) {
    if (!physmap) return;
    for (let y = 0; y < physmap.length; y++) {
        for (let x = 0; x < physmap[0].length; x++) {
            assignCellColor(physmap[y][x], palette);
        }
    }
}


function calculateCellSizeForGenerationInternal() {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const baseSize = Math.max(2, Math.min(4,
    Math.floor(Math.min(screenWidth, screenHeight) / 300)));
  return baseSize / currentGenerationScale;
}

function getMapDataDimensionsInternal() {
  return {
    width: Math.floor(window.innerWidth / cellSize),
    height: Math.floor(window.innerHeight / cellSize)
  };
}

function initializeNoiseGenerators(providedSeeds = null) {
  let seeds;
  if (providedSeeds) {
      seeds = providedSeeds;
  } else {
      seeds = {
        terrain: generateRandomSeed(), variant: generateRandomSeed(), biome: generateRandomSeed(),
        detail: generateRandomSeed(), sand: generateRandomSeed(), mountain1: generateRandomSeed(),
        mountain2: generateRandomSeed(), river: generateRandomSeed(), island: generateRandomSeed()
      };
  }
  currentMapSeeds = seeds; 

  const sandNoise = newFractalNoise({ noise: createNoise(seeds.sand), octaves: 10, frequency: 0.1, persistence: 0.01 });
  return {
    terrainNoise: newFractalNoise({ noise: createNoise(seeds.terrain), octaves: defaultOctaves, frequency: defaultFrequency, persistence: defaultPersistence }),
    variantNoise: newFractalNoise({ noise: createNoise(seeds.variant), octaves: 8, frequency: 1.2, persistence: 0.8 }),
    detailNoise: newFractalNoise({ noise: createNoise(seeds.detail), octaves: 6, frequency: 0.6, persistence: 0.7 }),
    mountainNoise1: newFractalNoise({ noise: createNoise(seeds.mountain1), octaves: defaultOctaves, frequency: defaultFrequency, persistence: defaultPersistence }),
    mountainNoise2: newFractalNoise({ noise: createNoise(seeds.mountain2), octaves: defaultOctaves, frequency: defaultFrequency, persistence: defaultPersistence }),
    sandNoise,
    riverNoise: newFractalNoise({ noise: createNoise(seeds.river), octaves: 6, frequency: 0.5, persistence: 0.5 }),
    riverJitterNoise: newFractalNoise({ noise: createNoise(seeds.river ^ seeds.detail), octaves: 5, frequency: 1.8, persistence: 0.4 }),
    islandNoise: newFractalNoise({ noise: createNoise(seeds.island), octaves: 6, frequency: 0.4, persistence: 0.5 })
  };
}


class ErosionMinHeap {
    constructor(maxSize) {
        this.data = new Int32Array(maxSize);
        this.priorities = new Float32Array(maxSize);
        this.length = 0;
    }
    push(item, priority) {
        if (this.length >= this.data.length) return;
        this.data[this.length] = item;
        this.priorities[this.length] = priority;
        this._bubbleUp(this.length);
        this.length++;
    }
    pop() {
        if (this.length === 0) return null;
        const result = this.data[0];
        this.length--;
        if (this.length > 0) {
            this.data[0] = this.data[this.length];
            this.priorities[0] = this.priorities[this.length];
            this._bubbleDown(0);
        }
        return result;
    }
    size() { return this.length; }
    _bubbleUp(index) {
        while (index > 0) {
            const parentIndex = (index - 1) >>> 1;
            if (this.priorities[index] >= this.priorities[parentIndex]) break;
            this._swap(index, parentIndex);
            index = parentIndex;
        }
    }
    _bubbleDown(index) {
        while (true) {
            const left = (index << 1) + 1;
            const right = left + 1;
            let smallest = index;
            if (left < this.length && this.priorities[left] < this.priorities[smallest]) smallest = left;
            if (right < this.length && this.priorities[right] < this.priorities[smallest]) smallest = right;
            if (smallest === index) break;
            this._swap(index, smallest);
            index = smallest;
        }
    }
    _swap(i, j) {
        const tempD = this.data[i]; this.data[i] = this.data[j]; this.data[j] = tempD;
        const tempP = this.priorities[i]; this.priorities[i] = this.priorities[j]; this.priorities[j] = tempP;
    }
}

function generateRivers(physmap, width, height, noise) {
    console.time("Hydraulic Erosion Anti-Diagonal");
    riverNetwork = [];

    const totalPixels = width * height;
    const heightMap = new Float32Array(totalPixels);
    const oceanMap = new Uint8Array(totalPixels);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const cell = physmap[y][x];
            
            if (cell.type === terrainType.OCEAN || 
                cell.type === terrainType.SEA || 
                cell.type === terrainType.SHALLOW_WATER) {
                
                heightMap[idx] = -1000.0; 
                oceanMap[idx] = 1;        
            } else {
                heightMap[idx] = cell.heightValue;
            }
        }
    }

    const heap = new ErosionMinHeap(totalPixels);
    const visited = new Uint8Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
        const x = i % width;
        const y = (i / width) | 0;
        if (oceanMap[i] === 1 || x === 0 || x === width - 1 || y === 0 || y === height - 1) {
            visited[i] = 1;
            heap.push(i, heightMap[i]);
        }
    }

    const dxs = [-1, 0, 1, -1, 1, -1, 0, 1];
    const dys = [-1, -1, -1, 0, 0, 1, 1, 1];

    while (heap.size() > 0) {
        const idx = heap.pop();
        const h = heightMap[idx];
        const cx = idx % width;
        const cy = (idx / width) | 0;

        for (let i = 0; i < 8; i++) {
            const nx = cx + dxs[i];
            const ny = cy + dys[i];
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (visited[nIdx] === 0) {
                    visited[nIdx] = 1;
                    let newHeight = heightMap[nIdx];
                    if (newHeight < h) {
                        newHeight = h + 0.00001; 
                    }
                    heightMap[nIdx] = newHeight;
                    heap.push(nIdx, newHeight);
                }
            }
        }
    }

    const flowTarget = new Int32Array(totalPixels).fill(-1);
    const sortedIndices = new Int32Array(totalPixels);
    for(let i=0; i<totalPixels; i++) sortedIndices[i] = i;
    sortedIndices.sort((a, b) => heightMap[b] - heightMap[a]);

    const SQRT2 = 1.41421356;

    for (let i = 0; i < totalPixels; i++) {
        const idx = sortedIndices[i];
        if (oceanMap[idx]) continue;

        const cx = idx % width;
        const cy = (idx / width) | 0;

        let lowestIdx = -1;
        let maxSlope = -Infinity;

        for (let j = 0; j < 8; j++) {
            const nx = cx + dxs[j];
            const ny = cy + dys[j];
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                const drop = heightMap[idx] - heightMap[nIdx];
                
                if (drop > 0) {
                    const isDiagonal = (dxs[j] !== 0 && dys[j] !== 0);
                    const dist = isDiagonal ? SQRT2 : 1.0;
                    const slope = drop / dist;

                    if (slope > maxSlope) {
                        maxSlope = slope;
                        lowestIdx = nIdx;
                    }
                }
            }
        }
        if (lowestIdx !== -1) {
            flowTarget[idx] = lowestIdx;
        }
    }

    const flux = new Float32Array(totalPixels).fill(1.0);
    for (let i = 0; i < totalPixels; i++) {
        const idx = sortedIndices[i];
        const target = flowTarget[idx];
        if (target !== -1) {
            flux[target] += flux[idx];
        }
    }

    const RIVER_THRESHOLD = totalPixels * 0.0035; 
    const processed = new Uint8Array(totalPixels);
    let riverSegmentsCount = 0;

    const getJitter = (vx, vy) => {
        const val = Math.sin(vx * 12.9898 + vy * 78.233) * 43758.5453;
        return (val - Math.floor(val) - 0.5) * 0.7; 
    };

    for (let i = 0; i < totalPixels; i++) {
        const startIdx = sortedIndices[i];
        
        if (flux[startIdx] > RIVER_THRESHOLD && processed[startIdx] === 0 && !oceanMap[startIdx]) {
            const path = [];
            let curr = startIdx;
            let safety = 0;

            while (curr !== -1 && !oceanMap[curr] && safety < 10000) {
                processed[curr] = 1;
                const x = curr % width;
                const y = (curr / width) | 0;
                
                const jx = x + getJitter(x, y);
                const jy = y + getJitter(y, x);

                path.push({ x: jx, y: jy, flux: flux[curr] });
                
                const cell = physmap[y][x];
                cell.type = terrainType.RIVER;
                cell.heightValue = Math.min(cell.heightValue, heightMap[curr] - 0.05);

                const next = flowTarget[curr];
                
                if (next !== -1 && processed[next] === 1 && flux[next] > RIVER_THRESHOLD) {
                    const nx = next % width;
                    const ny = (next / width) | 0;
                    const njx = nx + getJitter(nx, ny);
                    const njy = ny + getJitter(ny, nx);
                    path.push({ x: njx, y: njy, flux: flux[next] });
                    break; 
                }
                
                curr = next;
                safety++;
            }
            
            if (path.length > 1) {
                riverNetwork.push(path);
                riverSegmentsCount++;
            }
        }
    }

    console.log(`Created ${riverSegmentsCount} river segments.`);
    console.timeEnd("Hydraulic Erosion Anti-Diagonal");
}

export function generateNewPhysmapData(seeds = null, palette = 'default') {
  cellSize = calculateCellSizeForGenerationInternal();
  const { width, height } = getMapDataDimensionsInternal();
  const noise = initializeNoiseGenerators(seeds); 
  const newMap = [];
  riverNetwork = [];

  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < height; y++) {
    newMap[y] = [];
    for (let x = 0; x < width; x++) {
      let terrainValue = noise.terrainNoise(x/100, y/100) + noise.detailNoise(x/20, y/20) * 0.15;
      
      const dx = x - centerX;
      const dy = y - centerY;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      const normalizedDist = distFromCenter / maxDist;

      switch (currentMapPreset) {
          case 'PANGAEA': {
              const gradient = 1.0 - (normalizedDist * normalizedDist);
              terrainValue += gradient * 0.5;
              break;
          }
          case 'MEDITERRANEAN': {
              const landBoost = normalizedDist * 0.8;
              const seaCarve = (1.0 - normalizedDist) * 0.1;
              terrainValue = terrainValue + landBoost - seaCarve;
              break;
          }
          case 'ARCHIPELAGO': {
              const islandMask = (noise.islandNoise(x / 35, y / 35) + 1) / 2;
              const contrastMask = Math.pow(islandMask, 2.2); 
              terrainValue = terrainValue - contrastMask; 
              break;
          }
      }

      const variantValue = noise.variantNoise(x/50, y/50);
      const sandValue = noise.sandNoise(x/50, y/50);
      
      const localSandThreshold = generationSettings.waterLevel + 0.02 + sandValue * 0.01;
      
      const uplift = (noise.mountainNoise1(x / 350, y / 350) + 1) / 2;
      const mountainCore = Math.pow(uplift, 3.0);

      const warpX = noise.variantNoise(x / 90, y / 90) * 50;
      const warpY = noise.variantNoise(y / 90, x / 90) * 50;
      
      const ridgeNoise = noise.mountainNoise2((x + warpX) / 70, (y + warpY) / 70);
      const ridgeStructure = 1.0 - (ridgeNoise * ridgeNoise);

      const finalMountainValue = ridgeStructure * mountainCore;
      
      const threshold = 0.2 + (generationSettings.mountainThreshold - 0.4) * 1.0;
      const isMountain = finalMountainValue > threshold;

      let info = { variantNoise: variantValue, heightValue: terrainValue };
      
      if (terrainValue < generationSettings.waterLevel - 0.15) { info.type = terrainType.OCEAN; }
      else if (terrainValue < generationSettings.waterLevel - 0.05) { info.type = terrainType.SEA; }
      else if (terrainValue < generationSettings.waterLevel) { info.type = terrainType.SHALLOW_WATER; }
      else if (terrainValue < localSandThreshold) {
        if (variantValue < -0.2) { info.type = terrainType.WET_SAND; }
        else if (variantValue < 0.2) { info.type = terrainType.SAND; }
        else { info.type = terrainType.DRY_SAND; }
      } else if (isMountain && terrainValue > 0.3) {
        if (variantValue < -0.2) { info.type = terrainType.MOUNTAIN_SNOW; }
        else if (variantValue < 0.2) { info.type = terrainType.MOUNTAIN_ORE; }
        else { info.type = terrainType.MOUNTAIN; }
      } else if (terrainValue < generationSettings.forestThreshold) {
        if (variantValue < -0.2) { info.type = terrainType.DRY_GRASS; }
        else if (variantValue < 0.2) { info.type = terrainType.GRASS; }
        else { info.type = terrainType.WET_GRASS; }
      } else { info.type = terrainType.FOREST; }
      
      newMap[y][x] = info;
    }
  }

    filterSmallBiomes(newMap, width, height, 5);
  
    const TERRACE_STEP = 0.08;
    const CLIFF_THRESHOLD = 0.12;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = newMap[y][x];

            const isWorkableTerrain = cell.type === terrainType.GRASS || 
                                      cell.type === terrainType.WET_GRASS ||
                                      cell.type === terrainType.DRY_GRASS ||
                                      cell.type === terrainType.FOREST;

            if (isWorkableTerrain) {
                const baseHeight = generationSettings.waterLevel;
                if (cell.heightValue > baseHeight + TERRACE_STEP) {
                    if (cell.type === terrainType.FOREST) {
                        cell.type = terrainType.FOREST_HIGHLAND;
                    } else {
                        cell.type = terrainType.GRASS_HIGHLAND;
                    }
                }

                let max_diff = 0;
                if (y < height - 1) max_diff = Math.max(max_diff, Math.abs(cell.heightValue - newMap[y+1][x].heightValue));
                if (x < width - 1) max_diff = Math.max(max_diff, Math.abs(cell.heightValue - newMap[y][x+1].heightValue));
                if (y > 0) max_diff = Math.max(max_diff, Math.abs(cell.heightValue - newMap[y-1][x].heightValue));
                if (x > 0) max_diff = Math.max(max_diff, Math.abs(cell.heightValue - newMap[y][x-1].heightValue));

                if (max_diff > CLIFF_THRESHOLD) {
                    cell.type = terrainType.STONE_CLIFF;
                }
            }
        }
    }
  
    generateRivers(newMap, width, height, noise);
  
    physmap = newMap;
  
    recalculatePhysmapColors(palette);

    politicalMap = null; 
}

export function generateAndStorePoliticalMap() {
    if (!physmap || !currentMapSeeds) {
        console.error("Cannot generate political map without physical map or seeds.");
        return false;
    }
    const { width, height } = getMapDataDimensionsInternal();
    politicalMap = generatePoliticalLayer(physmap, currentMapSeeds, width, height, generationSettings);
    return politicalMap !== null;
}

export function updateGenerationSettings(newSettings) {
    generationSettings = { ...generationSettings, ...newSettings };
}

export function getPhysmap() {
  return physmap;
}

export function getPoliticalMap() {
    return politicalMap;
}

export function getCurrentMapSeeds() {
    return currentMapSeeds;
}

export function getRiverNetwork() {
    return riverNetwork;
}

export function getCellSize() {
  return cellSize;
}

export function getGenerationScale() {
  return currentGenerationScale;
}

export function setGenerationScale(newScale) {
  currentGenerationScale = Math.max(MIN_GENERATION_SCALE, Math.min(MAX_GENERATION_SCALE, newScale));
}

export function setMapPreset(preset) {
    currentMapPreset = preset;
}

export function applyTerrainBrush(centerX, centerY, radius, terrainKey) {
    if (!physmap) return null;

    const width = physmap[0].length;
    const height = physmap.length;

    if (radius === 1) {
        if (centerX >= 0 && centerX < width && centerY >= 0 && centerY < height) {
            const cell = physmap[centerY][centerX];
            if (cell.type !== terrainKey) {
                let targetHeight = 0.5;
                if (TERRAIN_HEIGHT_MAP[terrainKey] !== undefined) {
                    targetHeight = TERRAIN_HEIGHT_MAP[terrainKey] / 10.0;
                    if (terrainKey === terrainType.OCEAN) targetHeight = 0.05;
                    else if (terrainKey === terrainType.SEA) targetHeight = 0.1;
                    else if (terrainKey === terrainType.SHALLOW_WATER) targetHeight = 0.18;
                    else if (terrainKey === terrainType.RIVER) targetHeight = 0.19;
                }
                
                cell.type = terrainKey;
                cell.heightValue = targetHeight;
                cell.waterBodyId = undefined;
                cell.continentId = undefined;
                
                return { minX: centerX, minY: centerY, maxX: centerX, maxY: centerY };
            }
        }
        return null;
    }

    const effectiveRadius = radius - 0.5; 
    const radiusSq = effectiveRadius * effectiveRadius;

    const minX = Math.max(0, Math.floor(centerX - effectiveRadius - 1));
    const maxX = Math.min(width - 1, Math.ceil(centerX + effectiveRadius + 1));
    const minY = Math.max(0, Math.floor(centerY - effectiveRadius - 1));
    const maxY = Math.min(height - 1, Math.ceil(centerY + effectiveRadius + 1));

    let modified = false;

    let targetHeight = 0.5;
    if (TERRAIN_HEIGHT_MAP[terrainKey] !== undefined) {
         targetHeight = TERRAIN_HEIGHT_MAP[terrainKey] / 10.0;
         if (terrainKey === terrainType.OCEAN) targetHeight = 0.05;
         else if (terrainKey === terrainType.SEA) targetHeight = 0.1;
         else if (terrainKey === terrainType.SHALLOW_WATER) targetHeight = 0.18;
         else if (terrainKey === terrainType.RIVER) targetHeight = 0.19;
    }

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const distSq = (x - centerX) ** 2 + (y - centerY) ** 2;
            
            if (distSq <= radiusSq) {
                const cell = physmap[y][x];
                if (cell.type !== terrainKey) {
                    cell.type = terrainKey;
                    cell.heightValue = targetHeight; 
                    cell.waterBodyId = undefined; 
                    cell.continentId = undefined;
                    modified = true;
                }
            }
        }
    }

    if (modified) {
        return { 
            minX: Math.max(0, minX - 2), 
            minY: Math.max(0, minY - 2), 
            maxX: Math.min(width - 1, maxX + 2), 
            maxY: Math.min(height - 1, maxY + 2) 
        };
    }
    return null;
}

export function recalculateColorsInRect(rect, palette) {
     if (!physmap) return;
     for (let y = rect.minY; y <= rect.maxY; y++) {
        for (let x = rect.minX; x <= rect.maxX; x++) {
             assignCellColor(physmap[y][x], palette); 
        }
    }
}

export { terrainType, TERRAIN_HEIGHT_MAP };