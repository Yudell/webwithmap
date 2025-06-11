import { createNoise, newFractalNoise, defaultOctaves, defaultFrequency, defaultPersistence, generateRandomSeed } from './mapgen.js';
import { generatePoliticalLayer } from './political-map-gen.js';

export const terrainType = {
  OCEAN: 'OCEAN',
  SEA: 'SEA',
  RIVER: 'RIVER',
  WET_SAND: 'WET_SAND',
  SAND: 'SAND',
  DRY_SAND: 'DRY_SAND',
  DRY_GRASS: 'DRY_GRASS',
  GRASS: 'GRASS',
  WET_GRASS: 'WET_GRASS',
  MOUNTAIN_SNOW: 'MOUNTAIN_SNOW',
  MOUNTAIN_ORE: 'MOUNTAIN_ORE',
  MOUNTAIN: 'MOUNTAIN',
  FOREST: 'FOREST'
};

let physmap = null;
let politicalMap = null;
let currentMapSeeds = null;
let cellSize = 3;

let currentGenerationScale = 1;
export const MIN_GENERATION_SCALE = 0.5;
export const MAX_GENERATION_SCALE = 5;
export const GENERATION_SCALE_STEP = 0.5;

function calculateCellSizeForGenerationInternal() {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const baseSize = Math.max(2, Math.min(4,
    Math.floor(Math.min(screenWidth, screenHeight) / 250)));
  return baseSize / currentGenerationScale;
}

function getMapDataDimensionsInternal() {
  return {
    width: Math.floor(window.innerWidth / cellSize),
    height: Math.floor(window.innerHeight / cellSize)
  };
}

function initializeNoiseGenerators() {
  const seeds = {
    terrain: generateRandomSeed(), variant: generateRandomSeed(), biome: generateRandomSeed(),
    detail: generateRandomSeed(), sand: generateRandomSeed(), mountain1: generateRandomSeed(),
    mountain2: generateRandomSeed(), river: generateRandomSeed()
  };
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
    riverJitterNoise: newFractalNoise({ noise: createNoise(seeds.river ^ seeds.detail), octaves: 5, frequency: 1.8, persistence: 0.4 })
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
                                const isNeighborWater = neighborCell.type === terrainType.OCEAN || neighborCell.type === terrainType.SEA;
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

function drawLineOnGrid(p1, p2, gridSet) {
    let x1 = Math.floor(p1.x), y1 = Math.floor(p1.y);
    const x2 = Math.floor(p2.x), y2 = Math.floor(p2.y);
    const dx = Math.abs(x2 - x1);
    const dy = -Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;
    while (true) {
        gridSet.add(`${x1},${y1}`);
        if (x1 === x2 && y1 === y2) break;
        let e2 = 2 * err;
        if (e2 >= dy) { err += dy; x1 += sx; }
        if (e2 <= dx) { err += dx; y1 += sy; }
    }
}

function generateRivers(physmap, width, height, noise) {
    labelContinents(physmap, width, height);
    const waterBodySizes = labelWaterBodies(physmap, width, height);

    const MIN_WATER_BODY_SIZE_FOR_RIVER = (width * height) * 0.01;

    const mountainsByContinent = {};
    const coastsByContinent = {};

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = physmap[y][x];
            if (cell.continentId === undefined) continue;

            if (cell.type === terrainType.MOUNTAIN || cell.type === terrainType.MOUNTAIN_ORE || cell.type === terrainType.HILLS || cell.type === terrainType.GRASS || cell.type === terrainType.WET_GRASS || cell.type === terrainType.DRY_GRASS) {
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

    const allRiverCells = new Set();
    
    for (const continentId in mountainsByContinent) {
        const mountains = mountainsByContinent[continentId];
        const coasts = coastsByContinent[continentId];
        const riverMouths = [];
        const MIN_RIVER_MOUTH_DISTANCE = Math.max(15, (width + height) / 2 * 0.05);
        const MIN_RIVER_MOUTH_DISTANCE_SQ = MIN_RIVER_MOUTH_DISTANCE * MIN_RIVER_MOUTH_DISTANCE;

        if (!coasts || coasts.length === 0) continue;

        for (let i = mountains.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mountains[i], mountains[j]] = [mountains[j], mountains[i]];
        }
        
        const numRivers = Math.min(mountains.length, Math.floor(mountains.length / 5000) + 1);

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
                    const end = validEndPoints[Math.floor(Math.random() * validEndPoints.length)];
                    riverMouths.push(end);
                    
                    const points = [start];
                    generateWarpedLine(start, end, noise, 10, points);
                    
                    for (let j = 0; j < points.length - 1; j++) {
                        drawLineOnGrid(points[j], points[j+1], allRiverCells);
                    }
                }
            }
        }
    }

    for (const key of allRiverCells) {
        const [x, y] = key.split(',').map(Number);
        const cell = physmap[y]?.[x];
        if (cell && cell.type !== terrainType.OCEAN && cell.type !== terrainType.SEA) {
            cell.type = terrainType.RIVER;
            cell.color = '#2581c2';
        }
    }
}

export function generateNewPhysmapData() {
  cellSize = calculateCellSizeForGenerationInternal();
  const { width, height } = getMapDataDimensionsInternal();
  const noise = initializeNoiseGenerators(); 
  const newMap = [];
  for (let y = 0; y < height; y++) {
    newMap[y] = [];
    for (let x = 0; x < width; x++) {
      const terrainValue = noise.terrainNoise(x/100, y/100) + noise.detailNoise(x/20, y/20) * 0.15;
      const variantValue = noise.variantNoise(x/100, y/100);
      const sandValue = noise.sandNoise(x/50, y/50);
      const localSandThreshold = 0.22 + sandValue * 0.01;
      const isMountain = Math.max(noise.mountainNoise1(x/100, y/100), noise.mountainNoise2(x/100, y/100)) > 0.5;
      let info = { terrainValue };
      if (terrainValue < 0) { info.color = '#003eb2'; info.type = terrainType.OCEAN; }
      else if (terrainValue < 0.2) { info.color = '#0952c6'; info.type = terrainType.SEA; }
      else if (terrainValue < localSandThreshold) {
        info.variantNoise = variantValue;
        if (variantValue < -0.2) { info.color = '#867645'; info.type = terrainType.WET_SAND; }
        else if (variantValue < 0.2) { info.color = '#a49463'; info.type = terrainType.SAND; }
        else { info.color = '#c2b281'; info.type = terrainType.DRY_SAND; }
      } else if (isMountain && terrainValue > 0.3) {
        info.variantNoise = variantValue;
        if (variantValue < -0.2) { info.color = '#ebebeb'; info.type = terrainType.MOUNTAIN_SNOW; }
        else if (variantValue < 0.2) { info.color = '#8c8e7b'; info.type = terrainType.MOUNTAIN_ORE; }
        else { info.color = '#a0a28f'; info.type = terrainType.MOUNTAIN; }
      } else if (terrainValue < 0.5) {
        info.variantNoise = variantValue;
        if (variantValue < -0.2) { info.color = '#284d00'; info.type = terrainType.DRY_GRASS; }
        else if (variantValue < 0.2) { info.color = '#3c6114'; info.type = terrainType.GRASS; }
        else { info.color = '#5a7f32'; info.type = terrainType.WET_GRASS; }
      } else { info.color = '#203f00'; info.type = 'HILLS'; }
      if (info.type === terrainType.GRASS && noise.detailNoise(x/10, y/10) > 0.7) {
        info.type = terrainType.FOREST; info.color = '#2d5a27';
      }
      newMap[y][x] = info;
    }
  }
  
  generateRivers(newMap, width, height, noise);
  
  physmap = newMap;
  politicalMap = null; 
}

export function generateAndStorePoliticalMap() {
    if (!physmap || !currentMapSeeds) {
        console.error("Cannot generate political map without physical map or seeds.");
        return false;
    }
    const { width, height } = getMapDataDimensionsInternal();
    politicalMap = generatePoliticalLayer(physmap, currentMapSeeds, width, height);
    return politicalMap !== null;
}

export function getPhysmap() {
  return physmap;
}

export function getPoliticalMap() {
    return politicalMap;
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