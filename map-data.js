import { createNoise, newFractalNoise, defaultOctaves, defaultFrequency, defaultPersistence, generateRandomSeed } from './mapgen.js';

export const terrainType = {
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
  FOREST: 'FOREST'
};

let physmap = null;
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
    mountain2: generateRandomSeed()
  };
  const sandNoise = newFractalNoise({ noise: createNoise(seeds.sand), octaves: 10, frequency: 0.1, persistence: 0.01 });
  return {
    terrainNoise: newFractalNoise({ noise: createNoise(seeds.terrain), octaves: defaultOctaves, frequency: defaultFrequency, persistence: defaultPersistence }),
    variantNoise: newFractalNoise({ noise: createNoise(seeds.variant), octaves: defaultOctaves, frequency: defaultFrequency, persistence: defaultPersistence }),
    detailNoise: newFractalNoise({ noise: createNoise(seeds.detail), octaves: 6, frequency: 0.6, persistence: 0.7 }),
    mountainNoise1: newFractalNoise({ noise: createNoise(seeds.mountain1), octaves: defaultOctaves, frequency: defaultFrequency, persistence: defaultPersistence }),
    mountainNoise2: newFractalNoise({ noise: createNoise(seeds.mountain2), octaves: defaultOctaves, frequency: defaultFrequency, persistence: defaultPersistence }),
    sandNoise
  };
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
      let info = {};
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
      } else { info.color = '#8c8e7b'; info.type = 'HILLS'; }
      if (info.type === terrainType.GRASS && noise.detailNoise(x/10, y/10) > 0.7) {
        info.type = terrainType.FOREST; info.color = '#2d5a27';
      }
      newMap[y][x] = info;
    }
  }
  physmap = newMap;
}

export function getPhysmap() {
  return physmap;
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