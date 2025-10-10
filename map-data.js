import { createNoise, newFractalNoise, defaultOctaves, defaultFrequency, defaultPersistence, generateRandomSeed } from './mapgen.js';
import { generatePoliticalLayer } from './political-map-gen.js';
import { terrainType } from './terrain-types.js'; 

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

function getColorForCellDefault(cell) {
    switch(cell.type) {
        case terrainType.OCEAN: return '#003eb2';
        case terrainType.SEA: return '#0952c6';
        case terrainType.RIVER: return '#2581c2';
        case terrainType.WET_SAND: return '#867645';
        case terrainType.SAND: return '#a49463';
        case terrainType.DRY_SAND: return '#c2b281';
        case terrainType.MOUNTAIN_SNOW: return '#ebebeb';
        case terrainType.MOUNTAIN_ORE: return '#8c8e7b';
        case terrainType.MOUNTAIN: return '#a0a28f';
        case terrainType.DRY_GRASS: return '#284d00';
        case terrainType.GRASS: return '#3c6114';
        case terrainType.WET_GRASS: return '#5a7f32';
        case terrainType.FOREST: return '#203f00';
        default: return '#000000';
    }
}

function getColorForCellOklch(cell) {
    const variantValue = cell.variantNoise || 0;
    switch(cell.type) {
        case terrainType.OCEAN: return `oklch(${25 + variantValue * 2}% 0.1 230)`;
        case terrainType.SEA: return `oklch(${40 + variantValue * 4}% 0.12 220)`;
        case terrainType.RIVER: return 'oklch(55% 0.15 215)';
        case terrainType.WET_SAND: return `oklch(75% 0.08 90)`;
        case terrainType.SAND: return `oklch(${85 + variantValue * 8}% 0.09 90)`;
        case terrainType.DRY_SAND: return `oklch(92% 0.07 90)`;
        case terrainType.MOUNTAIN_SNOW: return `oklch(98% 0.005 100)`;
        case terrainType.MOUNTAIN_ORE: return `oklch(${60 + variantValue * 5}% 0.05 70)`;
        case terrainType.MOUNTAIN: return `oklch(${65 + variantValue * 5}% 0.03 100)`;
        case terrainType.DRY_GRASS: return `oklch(${70 + variantValue * 4}% 0.12 110)`;
        case terrainType.GRASS: return `oklch(${65 + variantValue * 4}% 0.15 130)`;
        case terrainType.WET_GRASS: return `oklch(${60 + variantValue * 4}% 0.14 140)`;
        case terrainType.FOREST: return `oklch(${45 + variantValue * 3}% 0.16 135)`;
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
    variantNoise: newFractalNoise({ noise: createNoise(seeds.variant), octaves: defaultOctaves, frequency: defaultFrequency, persistence: defaultPersistence }),
    detailNoise: newFractalNoise({ noise: createNoise(seeds.detail), octaves: 6, frequency: 0.6, persistence: 0.7 }),
    mountainNoise1: newFractalNoise({ noise: createNoise(seeds.mountain1), octaves: defaultOctaves, frequency: defaultFrequency, persistence: defaultPersistence }),
    mountainNoise2: newFractalNoise({ noise: createNoise(seeds.mountain2), octaves: defaultOctaves, frequency: defaultFrequency, persistence: defaultPersistence }),
    sandNoise,
    riverNoise: newFractalNoise({ noise: createNoise(seeds.river), octaves: 6, frequency: 0.5, persistence: 0.5 }),
    riverJitterNoise: newFractalNoise({ noise: createNoise(seeds.river ^ seeds.detail), octaves: 5, frequency: 1.8, persistence: 0.4 }),
    islandNoise: newFractalNoise({ noise: createNoise(seeds.island), octaves: 6, frequency: 0.4, persistence: 0.5 })
  };
}

function labelContinents(physmap, width, height) {
    let continentId = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = physmap[y][x];
            const isLand = cell.type !== terrainType.OCEAN && cell.type !== terrainType.SEA;
            if (isLand && cell.continentId === undefined) {
                continentId++;
                const queue = [{ x, y }];
                cell.continentId = continentId;

                let head = 0;
                while (head < queue.length) {
                    const pos = queue[head++];
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = pos.x + dx;
                            const ny = pos.y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const neighborCell = physmap[ny][nx];
                                const isNeighborLand = neighborCell.type !== terrainType.OCEAN && neighborCell.type !== terrainType.SEA;
                                if (isNeighborLand && neighborCell.continentId === undefined) {
                                    neighborCell.continentId = continentId;
                                    queue.push({ x: nx, y: ny });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function labelWaterBodies(physmap, width, height) {
    const waterBodySizes = new Map();
    let waterBodyId = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = physmap[y][x];
            const isWater = cell.type === terrainType.OCEAN || cell.type === terrainType.SEA;
            if (isWater && cell.waterBodyId === undefined) {
                waterBodyId++;
                const queue = [{ x, y }];
                cell.waterBodyId = waterBodyId;
                let currentSize = 1;

                let head = 0;
                while (head < queue.length) {
                    const pos = queue[head++];
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = pos.x + dx;
                            const ny = pos.y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const neighborCell = physmap[ny][nx];
                                const isNeighborWater = neighborCell.type !== terrainType.OCEAN || neighborCell.type !== terrainType.SEA;
                                if (isNeighborWater && neighborCell.waterBodyId === undefined) {
                                    neighborCell.waterBodyId = waterBodyId;
                                    currentSize++;
                                    queue.push({ x: nx, y: ny });
                                }
                            }
                        }
                    }
                }
                waterBodySizes.set(waterBodyId, currentSize);
            }
        }
    }
    return waterBodySizes;
}

function generateWarpedLine(start, end, noise, depth, points) {
    const len = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

    if (depth <= 0 || len < 1) {
        points.push(end);
        return;
    }
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    const mainOffset = noise.riverNoise(midX / 40, midY / 40);

    const jitterOffset = noise.riverJitterNoise(midX / 10, midY / 10);
    
    const combinedNoise = mainOffset * 0.75 + jitterOffset * 0.25;

    const displacementStrength = 0.4;
    const offset = combinedNoise * len * displacementStrength;
    
    const perpX = -(end.y - start.y);
    const perpY = end.x - start.x;
    const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
    
    const newMidX = midX + (perpX / perpLen) * offset;
    const newMidY = midY + (perpY / perpLen) * offset;
    
    generateWarpedLine(start, { x: newMidX, y: newMidY }, noise, depth - 1, points);
    generateWarpedLine({ x: newMidX, y: newMidY }, end, noise, depth - 1, points);
}

function bresenhamLine(p1, p2) {
    const points = [];
    let x1 = Math.floor(p1.x), y1 = Math.floor(p1.y);
    const x2 = Math.floor(p2.x), y2 = Math.floor(p2.y);
    const dx = Math.abs(x2 - x1);
    const dy = -Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;
    while (true) {
        points.push({ x: x1, y: y1 });
        if (x1 === x2 && y1 === y2) break;
        let e2 = 2 * err;
        if (e2 >= dy) { err += dy; x1 += sx; }
        if (e2 <= dx) { err += dx; y1 += sy; }
    }
    return points;
}

function generateRivers(physmap, width, height, noise) {
    const random = createSeededRandom(currentMapSeeds.river);

    labelContinents(physmap, width, height);
    const waterBodySizes = labelWaterBodies(physmap, width, height);

    const MIN_WATER_BODY_SIZE_FOR_RIVER = (width * height) * 0.01;

    const mountainsByContinent = {};
    const coastsByContinent = {};

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = physmap[y][x];
            if (cell.continentId === undefined) continue;

            if (cell.type === terrainType.MOUNTAIN || cell.type === terrainType.MOUNTAIN_ORE || cell.type === 'FOREST' || cell.type === terrainType.GRASS || cell.type === terrainType.WET_GRASS || cell.type === terrainType.DRY_GRASS) {
                if (!mountainsByContinent[cell.continentId]) mountainsByContinent[cell.continentId] = [];
                mountainsByContinent[cell.continentId].push({ x, y });
            }
            
            let isCoastal = false;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                     if (dx === 0 && dy === 0) continue;
                     const nx = x + dx, ny = y + dy;
                     if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nCell = physmap[ny][nx];
                        const isWater = nCell.type === terrainType.OCEAN || nCell.type === terrainType.SEA;
                        if (isWater) {
                           const waterId = nCell.waterBodyId;
                           if (waterId !== undefined && waterBodySizes.get(waterId) >= MIN_WATER_BODY_SIZE_FOR_RIVER) {
                               isCoastal = true;
                               break; 
                           }
                        }
                     }
                }
                if (isCoastal) break;
            }

            if (isCoastal) {
                if (!coastsByContinent[cell.continentId]) coastsByContinent[cell.continentId] = [];
                coastsByContinent[cell.continentId].push({ x, y });
            }
        }
    }
    
    for (const continentId in mountainsByContinent) {
        const mountains = mountainsByContinent[continentId];
        const coasts = coastsByContinent[continentId];
        const riverMouths = [];
        const MIN_RIVER_MOUTH_DISTANCE = Math.max(15, (width + height) / 2 * 0.05);
        const MIN_RIVER_MOUTH_DISTANCE_SQ = MIN_RIVER_MOUTH_DISTANCE * MIN_RIVER_MOUTH_DISTANCE;

        if (!coasts || coasts.length === 0) continue;

        for (let i = mountains.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [mountains[i], mountains[j]] = [mountains[j], mountains[i]];
        }
        
        const numRivers = Math.min(mountains.length, Math.floor(mountains.length / 13000) + 1);

        for (let i = 0; i < numRivers; i++) {
            const start = mountains[i];
            
            if (coasts.length > 0) {
                const coastsWithDist = coasts.map(c => {
                    const dx = start.x - c.x;
                    const dy = start.y - c.y;
                    return { x: c.x, y: c.y, distSq: dx * dx + dy * dy };
                });
                coastsWithDist.sort((a, b) => a.distSq - b.distSq);
                
                const NUM_CANDIDATES_TO_CHECK = 30;
                const candidatePool = coastsWithDist.slice(0, Math.min(NUM_CANDIDATES_TO_CHECK, coastsWithDist.length));
                
                const validEndPoints = candidatePool.filter(potentialEnd => {
                    for (const mouth of riverMouths) {
                        const dx = potentialEnd.x - mouth.x;
                        const dy = potentialEnd.y - mouth.y;
                        if ((dx * dx + dy * dy) < MIN_RIVER_MOUTH_DISTANCE_SQ) {
                            return false;
                        }
                    }
                    return true;
                });

                if (validEndPoints.length > 0) {
                    const end = validEndPoints[Math.floor(random() * validEndPoints.length)];
                    riverMouths.push(end);
                    
                    const points = [start];
                    generateWarpedLine(start, end, noise, 10, points);
                    
                    const completeRiverPath = [];
                    for (let j = 0; j < points.length - 1; j++) {
                        const segment = bresenhamLine(points[j], points[j+1]);
                        if (j > 0) segment.shift();
                        completeRiverPath.push(...segment);
                    }
                    if (completeRiverPath.length > 0) {
                        riverNetwork.push(completeRiverPath);
                    }
                }
            }
        }
    }

    for (const path of riverNetwork) {
        for (const point of path) {
            const cell = physmap[point.y]?.[point.x];
            if (cell && cell.type !== terrainType.OCEAN && cell.type !== terrainType.SEA) {
                cell.type = terrainType.RIVER;
            }
        }
    }
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

      const variantValue = noise.variantNoise(x/100, y/100);
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

      let info = { terrainValue, variantNoise: variantValue };
      
      if (terrainValue < generationSettings.waterLevel - 0.15) { info.type = terrainType.OCEAN; }
      else if (terrainValue < generationSettings.waterLevel) { info.type = terrainType.SEA; }
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
      } else { info.type = 'FOREST'; }
      
      newMap[y][x] = info;
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

export { terrainType };