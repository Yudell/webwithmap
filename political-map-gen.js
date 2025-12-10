import { createNoise } from './mapgen.js';
import { terrainType } from './terrain-types.js';
import { generateRoadNetwork } from './road-generator.js';
import { POI_DEFINITIONS } from './poi-definitions.js';

class MinHeap {
    constructor(compareFn = (a, b) => {
        if (a.totalDist < b.totalDist) return -1;
        if (a.totalDist > b.totalDist) return 1;
        if (a.waterDist < b.waterDist) return -1;
        if (a.waterDist > b.waterDist) return 1;
        return 0;
    }) {
        this.heap = [];
        this.compareFn = compareFn;
    }
    getParentIndex(i) { return Math.floor((i - 1) / 2); }
    getLeftChildIndex(i) { return 2 * i + 1; }
    getRightChildIndex(i) { return 2 * i + 2; }
    hasParent(i) { return this.getParentIndex(i) >= 0; }
    hasLeftChild(i) { return this.getLeftChildIndex(i) < this.heap.length; }
    hasRightChild(i) { return this.getRightChildIndex(i) < this.heap.length; }
    parent(i) { return this.heap[this.getParentIndex(i)]; }
    leftChild(i) { return this.heap[this.getLeftChildIndex(i)]; }
    rightChild(i) { return this.heap[this.getRightChildIndex(i)]; }
    swap(i1, i2) {
        [this.heap[i1], this.heap[i2]] = [this.heap[i2], this.heap[i1]];
    }
    add(item) {
        this.heap.push(item);
        this.heapifyUp();
    }
    poll() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();
        const item = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.heapifyDown();
        return item;
    }
    heapifyUp() {
        let index = this.heap.length - 1;
        while (this.hasParent(index) && this.compareFn(this.parent(index), this.heap[index]) > 0) {
            this.swap(this.getParentIndex(index), index);
            index = this.getParentIndex(index);
        }
    }
    heapifyDown() {
        let index = 0;
        while (this.hasLeftChild(index)) {
            let smallerChildIndex = this.getLeftChildIndex(index);
            if (this.hasRightChild(index) && this.compareFn(this.rightChild(index), this.leftChild(index)) < 0) {
                smallerChildIndex = this.getRightChildIndex(index);
            }
            if (this.compareFn(this.heap[index], this.heap[smallerChildIndex]) <= 0) {
                break;
            } else {
                this.swap(index, smallerChildIndex);
            }
            index = smallerChildIndex;
        }
    }
    isEmpty() {
        return this.heap.length === 0;
    }
}

function findBestLabelPosition(nationId, nationMap, mapWidth, mapHeight) {
    const dist = Array.from({ length: mapHeight }, () => new Array(mapWidth).fill(0));

    // Initialize distances: 0 for borders/outside, Infinity for inside
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (nationMap[y][x].nationId === nationId) {
                dist[y][x] = Infinity;
            }
        }
    }

    // Pass 1: Top-left to bottom-right (calculates distance to nearest top or left border)
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (dist[y][x] !== 0) {
                let minDist = Infinity;
                if (y > 0) minDist = Math.min(minDist, dist[y - 1][x] + 1);
                if (x > 0) minDist = Math.min(minDist, dist[y][x - 1] + 1);
                if (y > 0 && x > 0) minDist = Math.min(minDist, dist[y-1][x-1] + 1.414); // Diagonal
                dist[y][x] = Math.min(dist[y][x], minDist);
            }
        }
    }

    // Pass 2: Bottom-right to top-left (calculates distance to nearest bottom or right border)
    let maxDist = 0;
    for (let y = mapHeight - 1; y >= 0; y--) {
        for (let x = mapWidth - 1; x >= 0; x--) {
            if (dist[y][x] !== 0) {
                let minDist = Infinity;
                if (y < mapHeight - 1) minDist = Math.min(minDist, dist[y + 1][x] + 1);
                if (x < mapWidth - 1) minDist = Math.min(minDist, dist[y][x + 1] + 1);
                if (y < mapHeight - 1 && x < mapWidth - 1) minDist = Math.min(minDist, dist[y+1][x+1] + 1.414); // Diagonal
                dist[y][x] = Math.min(dist[y][x], minDist);
                if (dist[y][x] > maxDist) maxDist = dist[y][x];
            }
        }
    }
    
    // Find the point with the best score, penalizing edges of the map
    let bestScore = -1;
    let bestPos = { x: -1, y: -1 };
    
    // The margin from the edge where the penalty starts to apply (e.g., 15% of the map width)
    const margin = Math.min(mapWidth, mapHeight) * 0.15;

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (nationMap[y][x].nationId === nationId) {
                // Distance from this point to the closest nation border
                const internalDistance = dist[y][x];

                // Calculate a weight based on distance from the map edges.
                // Weight is 1.0 inside the margin, and drops to 0 at the edge.
                const distToEdgeX = Math.min(x, mapWidth - 1 - x);
                const distToEdgeY = Math.min(y, mapHeight - 1 - y);
                
                const weightX = Math.min(1.0, distToEdgeX / margin);
                const weightY = Math.min(1.0, distToEdgeY / margin);
                
                // The final weight is the product of both axis weights.
                // This creates a strong penalty for being near any edge.
                const edgeWeight = weightX * weightY;

                // The score is the distance from the nation border, multiplied by the edge penalty.
                const score = internalDistance * edgeWeight;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestPos = { x, y };
                }
            }
        }
    }
    
    // Fallback in case no suitable point is found (e.g., for a 1-pixel nation)
    if (bestPos.x === -1) {
        for(let y = 0; y < mapHeight; y++) {
            for(let x = 0; x < mapWidth; x++) {
                if (nationMap[y][x].nationId === nationId) return {x, y};
            }
        }
    }

    return bestPos;
}


function generateOklchPalette(count) {
    const colors = [];
    const goldenRatioConjugate = 0.61803398875;
    let hue = Math.random() * 360;

    for (let i = 0; i < count; i++) {
        const l = 90 + (Math.random() - 0.5) * 4;
        const c = 0.08 + (Math.random() - 0.5) * 0.02;
        colors.push(`oklch(${l}% ${c} ${hue})`);
        hue = (hue + goldenRatioConjugate * 360) % 360;
    }
    return colors;
}

const ONSET = ["b", "d", "f", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "z", "ch", "sh", "th", "br", "dr", "kl", "pr", "tr", "st", "sk", "j", "y", "c", "q"];
const NUCLEUS = ["a", "e", "i", "o", "u", "ae", "ia", "ea", "ou", "ai", "io", "ua", "ei"];
const CODA = ["b", "d", "g", "k", "l", "m", "n", "p", "r", "s", "t", "z", "th", "sh", "ng", "nd", "nt", "rt", "st", "sk", "ld", "rd", "x", "c"];

const PREFIXES = ["Alt", "El", "Dun", "Iron", "Shadow", "North", "South", "West", "East", "Port"];
const NATION_SUFFIXES = ["ia", "gard", "land", "stan", "ia", "dor", "mar", "grad", "dom"];

const PLACE_ADJECTIVES = ["High", "Low", "Old", "New", "North", "South", "West", "East", "Stone", "Iron", "Gold", "Silver", "Green", "White", "Black", "Red"];
const PLACE_NOUNS = ["bridge", "ford", "port", "stead", "gard", "pass", "river", "wood", "field", "crest", "watch", "burg", "hall", "town"];
const SETTLEMENT_SUFFIXES = ["ville", "burg", "ton", "ford", "ham", "stead", "port", "side", "wick", "bury", "hall"];

const GOVERNMENT_TYPES = ["Kingdom", "Empire", "Republic", "The Duchy", "Theocracy", "Federation", "Confederation", "The Sultanate", "Free City"];

const TERRAIN_POPULATION_MODIFIERS = {
    [terrainType.GRASS]: 1.0,
    [terrainType.WET_GRASS]: 0.8,
    [terrainType.DRY_GRASS]: 0.6,
    [terrainType.FOREST]: 0.5,
    'HILLS': 0.4,
    [terrainType.SAND]: 0.1,
    [terrainType.DRY_SAND]: 0.05,
    [terrainType.WET_SAND]: 0.2,
    [terrainType.MOUNTAIN]: 0.1,
    [terrainType.MOUNTAIN_ORE]: 0.15,
    [terrainType.MOUNTAIN_SNOW]: 0.0,
    [terrainType.RIVER]: 0,
    [terrainType.OCEAN]: 0,
    [terrainType.SEA]: 0,
    [terrainType.GRASS_HIGHLAND]: 0.9,
    [terrainType.FOREST_HIGHLAND]: 0.4,
    [terrainType.STONE_CLIFF]: 0.05
};

const TERRAIN_NAMES = {
    [terrainType.FOREST]: 'Forests',
    'HILLS': 'Hills',
    [terrainType.GRASS]: 'Plains',
    [terrainType.WET_GRASS]: 'Swamps',
    [terrainType.DRY_GRASS]: 'Steppes',
    [terrainType.MOUNTAIN]: 'Mountains',
    [terrainType.MOUNTAIN_SNOW]: 'Snow mountains',
    [terrainType.MOUNTAIN_ORE]: 'Ore mountains',
    [terrainType.SAND]: 'Coasts',
    [terrainType.DRY_SAND]: 'Coasts',
    [terrainType.WET_SAND]: 'Coasts',
    [terrainType.GRASS_HIGHLAND]: 'Highlands',
    [terrainType.FOREST_HIGHLAND]: 'Highland Forests',
    [terrainType.STONE_CLIFF]: 'Cliffs'
};

const UNSUITABLE_TERRAIN_FOR_SETTLEMENTS = new Set([
    terrainType.MOUNTAIN_SNOW,
    terrainType.MOUNTAIN,
    terrainType.DRY_SAND,
    terrainType.STONE_CLIFF
]);

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateSyllable() {
    const r = Math.random();
    if (r < 0.5) return randomElement(ONSET) + randomElement(NUCLEUS);
    if (r < 0.85) return randomElement(ONSET) + randomElement(NUCLEUS) + randomElement(CODA);
    if (r < 0.95) return randomElement(NUCLEUS) + randomElement(CODA);
    return randomElement(NUCLEUS);
}

function generateNameCore(minSyllables, maxSyllables) {
    const numSyllables = minSyllables + Math.floor(Math.random() * (maxSyllables - minSyllables + 1));
    let name = "";
    let lastSyllable = "";
    for (let i = 0; i < numSyllables; i++) {
        let syllable = generateSyllable();
        while (syllable === lastSyllable) {
            syllable = generateSyllable();
        }
        name += syllable;
        lastSyllable = syllable;
    }
    return name;
}

function generateNationName() {
    let name = generateNameCore(2, 3);
    if (Math.random() < 0.15) {
        name = randomElement(PREFIXES) + name;
    } 
    else if (Math.random() < 0.4) {
        name += randomElement(NATION_SUFFIXES);
    }
    const maxLength = 10 + Math.floor(Math.random() * 4);
    name = name.substring(0, Math.min(name.length, maxLength));
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function generateSettlementName() {
    const r = Math.random();
    if (r < 0.65) {
        const root = generateNameCore(1, 2);
        const suffix = randomElement(SETTLEMENT_SUFFIXES);
        return (root + suffix).charAt(0).toUpperCase() + (root + suffix).slice(1);
    } 
    else {
        const adjective = randomElement(PLACE_ADJECTIVES);
        const noun = randomElement(PLACE_NOUNS);
        return adjective + noun;
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generatePointsOfInterest(physmap, politicalMap, mapWidth, mapHeight) {
    const pointsOfInterest = [];
    const POI_MIN_DISTANCE_SQ = 10 * 10;
    const SETTLEMENT_AVOID_DISTANCE_SQ = 8 * 8;

    const allSettlements = politicalMap.nations.flatMap(n => [n.capital, ...n.settlements]);

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const cellTerrain = physmap[y][x].type;

            for (const poiKey in POI_DEFINITIONS) {
                const poiDef = POI_DEFINITIONS[poiKey];
                const placementRules = poiDef.placement;

                if (!placementRules.requires.includes(cellTerrain)) {
                    continue;
                }

                if (Math.random() > poiDef.spawnChance) {
                    continue;
                }

                let tooCloseToOtherPOI = pointsOfInterest.some(
                    p => (p.x - x) ** 2 + (p.y - y) ** 2 < POI_MIN_DISTANCE_SQ
                );
                if (tooCloseToOtherPOI) {
                    continue;
                }

                if (placementRules.avoids && placementRules.avoids.includes('NEAR_SETTLEMENT')) {
                    let tooCloseToSettlement = allSettlements.some(
                        s => (s.x - x) ** 2 + (s.y - y) ** 2 < SETTLEMENT_AVOID_DISTANCE_SQ
                    );
                    if (tooCloseToSettlement) {
                        continue;
                    }
                }

                const newPoi = {
                    x,
                    y,
                    type: poiKey,
                    icon: poiDef.icon,
                    category: poiDef.category,
                    placedOnTerrain: cellTerrain
                };
                newPoi.name = poiDef.generateName(newPoi);

                pointsOfInterest.push(newPoi);
                
                break; 
            }
        }
    }
    return pointsOfInterest;
}

export function generatePoliticalLayer(physmap, baseSeeds, mapWidth, mapHeight, settings) {
    console.time("Political Layer Generation");
    if (!physmap || !physmap.length || !physmap[0] || !physmap[0].length) {
        console.error("Physmap is invalid for political map generation.");
        return null;
    }

    const expansionDistortionNoise = createNoise(baseSeeds.detail ^ baseSeeds.variant ^ 0xDEFACE);
    const borderRoughnessNoise = createNoise(baseSeeds.biome ^ 0xCAFEBABE);

    const DISTORTION_NOISE_SCALE = 6.0;
    const MAX_DISTORTION_EFFECT_STRENGTH = 3.0;
    const BORDER_ROUGHNESS_NOISE_SCALE = 1.5;
    const BORDER_ROUGHNESS_STRENGTH = 0.25;

    let numNations = settings.numNations || 8;
    const mapArea = mapWidth * mapHeight;
    const maxNations = Math.min(Math.floor(mapArea / 700), 25);
    numNations = Math.max(2, Math.min(maxNations, numNations));

    if (mapArea < 250 && numNations > 2) numNations = 2;
    if (mapArea < 80 && numNations > 1) numNations = 1;

    const nationColors = generateOklchPalette(numNations);

    const capitals = [];
    const capitalPlacementNoise = createNoise(baseSeeds.variant ^ 0x123456);
    let attempts = 0;
    const minCapitalDistFactor = 0.5;
    const effectiveNumNationsForSpacing = numNations > 1 ? numNations : 1.5;
    const minCapitalDistSq = Math.pow(Math.min(mapWidth, mapHeight) / effectiveNumNationsForSpacing * minCapitalDistFactor, 2);

    while (capitals.length < numNations && attempts < numNations * 350) {
        const cx = Math.floor(((capitalPlacementNoise(attempts * 0.13, attempts * 0.23) + 1) / 2) * mapWidth);
        const cy = Math.floor(((capitalPlacementNoise(attempts * 0.23, attempts * 0.13) + 1) / 2) * mapHeight);

        if (cx < 0 || cx >= mapWidth || cy < 0 || cy >= mapHeight || !physmap[cy] || !physmap[cy][cx]) {
            attempts++;
            continue;
        }

        const terrainCell = physmap[cy][cx];
        if (terrainCell.type !== terrainType.OCEAN && terrainCell.type !== terrainType.SEA && terrainCell.type !== terrainType.SHALLOW_WATER) {
            let tooClose = false;
            if (capitals.length > 0 && numNations > 1) {
                for (const cap of capitals) {
                    const distSq = (cap.x - cx) * (cap.x - cx) + (cap.y - cy) * (cap.y - cy);
                    if (distSq < minCapitalDistSq) {
                        tooClose = true;
                        break;
                    }
                }
            }
            if (!tooClose) {
                capitals.push({
                    x: cx,
                    y: cy,
                    id: capitals.length,
                    color: nationColors[capitals.length]
                });
            }
        }
        attempts++;
    }

    if (capitals.length === 0 && numNations > 0 && mapArea > 0) {
        const landCells = [];
        for (let r = 0; r < mapHeight; r++) {
            for (let c = 0; c < mapWidth; c++) {
                if (physmap[r] && physmap[r][c] && physmap[r][c].type !== terrainType.OCEAN && physmap[r][c].type !== terrainType.SEA && physmap[r][c].type !== terrainType.SHALLOW_WATER) {
                    landCells.push({ x: c, y: r });
                }
            }
        }
        if (landCells.length > 0) {
            for (let i = 0; i < numNations && landCells.length > 0; i++) {
                const randIndex = Math.floor(Math.random() * landCells.length);
                const randomLandCell = landCells.splice(randIndex, 1)[0];
                capitals.push({
                    x: randomLandCell.x,
                    y: randomLandCell.y,
                    id: capitals.length,
                    color: nationColors[capitals.length]
                });
            }
        }
        if (capitals.length === 0) {
            console.error("Fallback capital placement failed. No land available or too few nations requested.");
            return null;
        }
    }

    numNations = capitals.length;
    if (numNations === 0) {
        console.error("No capitals placed. Political map generation aborted.");
        return null;
    }

    const nationMap = Array.from({ length: mapHeight }, () =>
        Array.from({ length: mapWidth }, () => ({ nationId: null, dist: Infinity }))
    );
    const landExpansionQueue = [];

    capitals.forEach(cap => {
        if (nationMap[cap.y] && nationMap[cap.y][cap.x]) {
            nationMap[cap.y][cap.x] = { nationId: cap.id, dist: 0 };
            landExpansionQueue.push({ x: cap.x, y: cap.y, nationId: cap.id, dist: 0 });
        }
    });

    let head = 0;
    const BASE_DIRS = [
        { dx: 0, dy: -1, currentSide: 'top' }, { dx: 0, dy: 1, currentSide: 'bottom' },
        { dx: -1, dy: 0, currentSide: 'left' }, { dx: 1, dy: 0, currentSide: 'right' }
    ];

    while (head < landExpansionQueue.length) {
        const current = landExpansionQueue[head++];
        const currentDist = nationMap[current.y][current.x].dist;
        const shuffledDirs = shuffleArray([...BASE_DIRS]);
        for (const dir of shuffledDirs) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight) {
                if (!physmap[ny] || !physmap[ny][nx]) continue;
                const neighborTerrainCell = physmap[ny][nx];
                if (neighborTerrainCell.type === terrainType.OCEAN || neighborTerrainCell.type === terrainType.SEA || neighborTerrainCell.type === terrainType.SHALLOW_WATER) continue;
                let baseStepCost = 1.0;
                if (neighborTerrainCell.type === terrainType.FOREST) baseStepCost = 1.8;
                else if (neighborTerrainCell.type === terrainType.RIVER) baseStepCost = 1.4;
                else if (neighborTerrainCell.type === terrainType.WET_GRASS || neighborTerrainCell.type === terrainType.DRY_GRASS) baseStepCost = 1.2;
                else if (neighborTerrainCell.type === terrainType.SAND || neighborTerrainCell.type === terrainType.DRY_SAND || neighborTerrainCell.type === terrainType.WET_SAND) baseStepCost = 1.5;
                else if (neighborTerrainCell.type === terrainType.MOUNTAIN ||
                    neighborTerrainCell.type === terrainType.MOUNTAIN_ORE ||
                    neighborTerrainCell.type === terrainType.MOUNTAIN_SNOW ||
                    neighborTerrainCell.type === 'HILLS' ||
                    neighborTerrainCell.type === terrainType.STONE_CLIFF) baseStepCost = 3.0;
                const distortionVal = (expansionDistortionNoise(nx / DISTORTION_NOISE_SCALE, ny / DISTORTION_NOISE_SCALE) + 1) / 2;
                const distortionFactor = 1.0 + (distortionVal - 0.5) * MAX_DISTORTION_EFFECT_STRENGTH;
                const roughnessVal = borderRoughnessNoise(nx / BORDER_ROUGHNESS_NOISE_SCALE, ny / BORDER_ROUGHNESS_NOISE_SCALE);
                const roughnessFactor = 1.0 + roughnessVal * BORDER_ROUGHNESS_STRENGTH;
                const effectiveStepCost = Math.max(0.1, baseStepCost * distortionFactor * roughnessFactor);
                const newDist = currentDist + effectiveStepCost;
                if (newDist < nationMap[ny][nx].dist) {
                    nationMap[ny][nx] = { nationId: current.nationId, dist: newDist };
                    landExpansionQueue.push({ x: nx, y: ny, nationId: current.nationId, dist: newDist });
                }
            }
        }
    }

    const ALL_DIRS_8 = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: -1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }
    ];

    let expansionQueue = [];
    let visited = Array.from({ length: mapHeight }, () => new Array(mapWidth).fill(false));
    
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const nationId = nationMap[y][x].nationId;
            if (nationId !== null) {
                visited[y][x] = true; 
                let isCoastal = false;
                for (const dir of ALL_DIRS_8) {
                    const nx = x + dir.dx;
                    const ny = y + dir.dy;
                    if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight) {
                        const physCell = physmap[ny][nx];
                        if (physCell.type === terrainType.OCEAN || physCell.type === terrainType.SEA) {
                            isCoastal = true;
                            break;
                        }
                    }
                }
                if (isCoastal) {
                    expansionQueue.push({ x, y, nationId: nationId });
                }
            }
        }
    }
    
    let queueHead = 0;
    while(queueHead < expansionQueue.length) {
        const current = expansionQueue[queueHead++];

        for (const dir of ALL_DIRS_8) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            
            if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight && !visited[ny][nx]) {
                visited[ny][nx] = true;
                const neighborPhys = physmap[ny][nx];
                const isWater = neighborPhys.type === terrainType.OCEAN || neighborPhys.type === terrainType.SEA;
                const isUnclaimedLand = !isWater && nationMap[ny][nx].nationId === null;

                if (isUnclaimedLand) {
                    nationMap[ny][nx].nationId = current.nationId;
                    expansionQueue.push({ x: nx, y: ny, nationId: current.nationId });
                } else if (isWater) {
                    expansionQueue.push({ x: nx, y: ny, nationId: current.nationId });
                }
            }
        }
    }

    visited = Array.from({ length: mapHeight }, () => new Array(mapWidth).fill(false));
    const allLandmasses = [];

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const physCell = physmap[y][x];
            const isLand = physCell.type !== terrainType.OCEAN && physCell.type !== terrainType.SEA && physCell.type !== terrainType.SHALLOW_WATER;
            const nationId = nationMap[y][x].nationId;

            if (isLand && nationId !== null && !visited[y][x]) {
                const currentLandmass = { nationId, cells: [] };
                const queue = [{ x, y }];
                visited[y][x] = true;
                let head = 0;
                while (head < queue.length) {
                    const pos = queue[head++];
                    currentLandmass.cells.push(pos);
                    for (const dir of ALL_DIRS_8) {
                        const nx = pos.x + dir.dx;
                        const ny = pos.y + dir.dy;
                        if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight && !visited[ny][nx] &&
                            nationMap[ny][nx].nationId === nationId) {
                            visited[ny][nx] = true;
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }
                allLandmasses.push(currentLandmass);
            }
        }
    }

    const landmassesByNation = {};
    for (const landmass of allLandmasses) {
        if (!landmassesByNation[landmass.nationId]) {
            landmassesByNation[landmass.nationId] = [];
        }
        landmassesByNation[landmass.nationId].push(landmass);
    }

    const allFragments = [];
    for (const nationId in landmassesByNation) {
        const nationLandmasses = landmassesByNation[nationId];
        if (nationLandmasses.length > 1) {
            nationLandmasses.sort((a, b) => b.cells.length - a.cells.length);
            allFragments.push(...nationLandmasses.slice(1));
        }
    }

    for (const fragment of allFragments) {
        let isIsland = false;
        const neighborCounts = {};

        for (const cell of fragment.cells) {
            for (const dir of ALL_DIRS_8) {
                const nx = cell.x + dir.dx;
                const ny = cell.y + dir.dy;
                if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;
                
                const neighborPhys = physmap[ny][nx];
                const neighborIsWater = neighborPhys.type === terrainType.OCEAN || neighborPhys.type === terrainType.SEA || neighborPhys.type === terrainType.SHALLOW_WATER;
                
                if (neighborIsWater) {
                    isIsland = true;
                    break;
                }
                
                const neighborNationId = nationMap[ny][nx].nationId;
                if (neighborNationId !== null && neighborNationId !== fragment.nationId) {
                    neighborCounts[neighborNationId] = (neighborCounts[neighborNationId] || 0) + 1;
                }
            }
            if (isIsland) break;
        }

        if (!isIsland && Object.keys(neighborCounts).length > 0) {
            let dominantNeighborId = -1;
            let maxCount = -1;
            for (const neighborId in neighborCounts) {
                if (neighborCounts[neighborId] > maxCount) {
                    maxCount = neighborCounts[neighborId];
                    dominantNeighborId = parseInt(neighborId, 10);
                }
            }
            
            if (dominantNeighborId !== -1) {
                for (const cell of fragment.cells) {
                    nationMap[cell.y][cell.x].nationId = dominantNeighborId;
                }
            }
        }
    }

    const nationInfoList = [];
    const nationDataMap = {};

    capitals.forEach(cap => {
        const nationId = cap.id;
        nationInfoList.push({
            id: nationId,
            name: generateNationName(),
            formOfGovernment: randomElement(GOVERNMENT_TYPES),
            color: cap.color,
            capital: { x: cap.x, y: cap.y },
            capitalName: generateSettlementName(),
            settlements: [],
            labelPosition: null,
            estimatedSpanInCells: null,
            neighbors: new Set(),
            terrainCompositionRaw: {},
            population: 0,
            cellCount: 0,
            landCells: [],
        });
        nationDataMap[nationId] = nationInfoList[nationInfoList.length - 1];
    });

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const cellInfo = nationMap[y][x];
            const physCell = physmap[y][x];
            if (cellInfo && typeof cellInfo.nationId === 'number' &&
                physCell.type !== terrainType.OCEAN && physCell.type !== terrainType.SEA && physCell.type !== terrainType.SHALLOW_WATER) {
                const nationId = cellInfo.nationId;
                const nation = nationDataMap[nationId];
                if (!nation) continue;
                nation.cellCount++;
                const terrainMod = TERRAIN_POPULATION_MODIFIERS[physCell.type] ?? 0;
                nation.population += terrainMod;
                nation.landCells.push({ x, y, type: physCell.type });
                const terrainKey = TERRAIN_NAMES[physCell.type] || 'Прочее';
                nation.terrainCompositionRaw[terrainKey] = (nation.terrainCompositionRaw[terrainKey] || 0) + 1;
            }
        }
    }

    const TERRAIN_RESOURCE_POTENTIAL = {
        [terrainType.MOUNTAIN_ORE]:   [{ resource: 'Iron', weight: 10 }, { resource: 'Gold', weight: 1.5 }, { resource: 'Gems', weight: 0.5 }],
        [terrainType.MOUNTAIN]:       [{ resource: 'Stone', weight: 8 }, { resource: 'Iron', weight: 2 }],
        [terrainType.MOUNTAIN_SNOW]:  [{ resource: 'Stone', weight: 3 }],
        'HILLS':                      [{ resource: 'Stone', weight: 5 }, { resource: 'Iron', weight: 1 }, { resource: 'Game', weight: 2 }],
        [terrainType.FOREST]:         [{ resource: 'Wood', weight: 10 }, { resource: 'Game', weight: 5 }, { resource: 'Herbs', weight: 2 }],
        [terrainType.GRASS]:          [{ resource: 'Farmland', weight: 10 }, { resource: 'Livestock', weight: 4 }],
        [terrainType.WET_GRASS]:      [{ resource: 'Herbs', weight: 6 }, { resource: 'Farmland', weight: 4 }, { resource: 'Fish', weight: 2 }],
        [terrainType.DRY_GRASS]:      [{ resource: 'Livestock', weight: 7 }, { resource: 'Herbs', weight: 3 }],
        [terrainType.SAND]:           [{ resource: 'Fish', weight: 8 }, { resource: 'Salt', weight: 4 }],
        [terrainType.DRY_SAND]:       [{ resource: 'Salt', weight: 3 }],
        [terrainType.WET_SAND]:       [{ resource: 'Fish', weight: 10 }, { resource: 'Salt', weight: 2 }],
        [terrainType.STONE_CLIFF]:    [{ resource: 'Stone', weight: 4 }],
        [terrainType.GRASS_HIGHLAND]: [{ resource: 'Livestock', weight: 6 }],
        [terrainType.FOREST_HIGHLAND]:[{ resource: 'Wood', weight: 8 }, { resource: 'Game', weight: 4 }],
    };

    const RESOURCE_DESCRIPTIONS = {
        'Iron':      { high: ["Rich Iron Veins", "Abundant Iron Deposits"], medium: ["Decent Iron Deposits", "Workable Iron Seams"], low: ["Scarce Iron Traces"] },
        'Gold':      { high: ["Rich Gold Veins"], medium: ["Notable Gold Deposits"], low: ["Traces of Gold"] },
        'Gems':      { high: ["Rich Gemstone Deposits"], medium: ["Some Gemstones"], low: ["Few Gemstones"] },
        'Stone':     { high: ["Vast Stone Quarries"], medium: ["Good Stone Quarries"], low: ["Limited Stone"] },
        'Wood':      { high: ["Vast Forests", "Endless Timber"], medium: ["Sufficient Forests"], low: ["Sparse Woods"] },
        'Game':      { high: ["Abundant Wildlife"], medium: ["Plentiful Game"], low: ["Scarce Game"] },
        'Herbs':     { high: ["Plentiful Herbs"], medium: ["Common Herbs"], low: ["Rare Herbs"] },
        'Farmland':  { high: ["Fertile Plains", "Bountiful Farmland"], medium: ["Workable Farmland"], low: ["Poor Soil"] },
        'Livestock': { high: ["Excellent Pastures"], medium: ["Sufficient Pastures"], low: ["Poor Grazing Land"] },
        'Fish':      { high: ["Rich Fishing Grounds"], medium: ["Good Fishing"], low: ["Limited Fishing"] },
        'Salt':      { high: ["Abundant Salt Flats"], medium: ["Common Salt Deposits"], low: ["Scarce Salt"] }
    };
    
    nationInfoList.forEach(nation => {
        nation.population = Math.floor(nation.population * (250 + Math.random() * 100));
        const totalTerrainCells = nation.cellCount;
        const terrainPercentages = [];
        if (totalTerrainCells > 0) {
            for (const key in nation.terrainCompositionRaw) {
                const percentage = Math.round((nation.terrainCompositionRaw[key] / totalTerrainCells) * 100);
                if (percentage > 5) {
                    terrainPercentages.push({ name: key, p: percentage });
                }
            }
        }
        terrainPercentages.sort((a, b) => b.p - a.p);
        nation.terrainComposition = terrainPercentages.map(item => `${item.name} ${item.p}%`).join(', ') || 'No data';
    
        const resourceScores = new Map();
        if (nation.landCells && nation.landCells.length > 0) {
            nation.landCells.forEach(cell => {
                const potentials = TERRAIN_RESOURCE_POTENTIAL[cell.type];
                if (potentials) {
                    potentials.forEach(potential => {
                        const currentScore = resourceScores.get(potential.resource) || 0;
                        resourceScores.set(potential.resource, currentScore + potential.weight);
                    });
                }
            });
        }
    
        if (resourceScores.size > 0) {
            const sortedResources = [...resourceScores.entries()]
                .map(([resource, score]) => ({ resource, score }))
                .sort((a, b) => b.score - a.score);
    
            const topResources = sortedResources.slice(0, 3);
            const resourceDescriptions = [];
    
            topResources.forEach((res, index) => {
                const abundanceRatio = res.score / nation.cellCount;
                let abundanceLevel = 'low';

                if (index === 0) {
                    if (abundanceRatio > 5) abundanceLevel = 'high';
                    else if (abundanceRatio > 2) abundanceLevel = 'medium';
                } else {
                    if (abundanceRatio > 4) abundanceLevel = 'high';
                    else if (abundanceRatio > 2.5) abundanceLevel = 'medium';
                }
                
                if (index > 0 && abundanceRatio < 1.5) return;

                if (RESOURCE_DESCRIPTIONS[res.resource]) {
                    const possible = RESOURCE_DESCRIPTIONS[res.resource][abundanceLevel];
                    if (possible) {
                        resourceDescriptions.push(randomElement(possible));
                    }
                }
            });
    
            if (resourceDescriptions.length > 0) {
                nation.resources = resourceDescriptions.join('; ');
            } else {
                nation.resources = 'Poor';
            }
        } else {
            nation.resources = 'Poor';
        }

        const density = settings.settlementDensity ?? 1.0;
        if (nation.landCells.length > 50 && density > 0) {
            const numCities = Math.floor((nation.cellCount / 1200) * density) + (Math.random() > 0.6 ? 1 : 0);
            const numVillages = Math.floor((nation.cellCount / 300) * density) + Math.floor(Math.random() * 3 * density);
            const MIN_DIST_SQ = 25;
            const placeSettlement = (type, count) => {
                const suitableCells = shuffleArray(nation.landCells.filter(cell => !UNSUITABLE_TERRAIN_FOR_SETTLEMENTS.has(cell.type)));
                let placedCount = 0;
                for (const cell of suitableCells) {
                    if (placedCount >= count) break;
                    const allSettlements = [nation.capital, ...nation.settlements];
                    let tooClose = false;
                    for (const settlement of allSettlements) {
                        const distSq = (settlement.x - cell.x) ** 2 + (settlement.y - cell.y) ** 2;
                        if (distSq < MIN_DIST_SQ) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (!tooClose) {
                        nation.settlements.push({
                            x: cell.x,
                            y: cell.y,
                            name: generateSettlementName(),
                            type: type
                        });
                        placedCount++;
                    }
                }
            };
            placeSettlement('city', numCities);
            placeSettlement('village', numVillages);
        }
    });

    const politicalMapOutput = Array.from({ length: mapHeight }, () =>
        Array.from({ length: mapWidth }, () => ({ nationId: null, borders: { top: false, bottom: false, left: false, right: false } }))
    );
    const nationMinMaxCoords = {};
    nationInfoList.forEach(n => {
        nationMinMaxCoords[n.id] = { minX: mapWidth, maxX: -1, minY: mapHeight, maxY: -1 };
    });

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const cellNationInfo = nationMap[y][x];
            const currentCellNationId = (cellNationInfo && cellNationInfo.nationId !== null) ? cellNationInfo.nationId : null;
            politicalMapOutput[y][x].nationId = currentCellNationId;

            const physCell = physmap[y][x];
            if (physCell.type === terrainType.OCEAN || physCell.type === terrainType.SEA || physCell.type === terrainType.SHALLOW_WATER || typeof currentCellNationId !== 'number') {
                continue;
            }
            const nation = nationDataMap[currentCellNationId];
            nationMinMaxCoords[currentCellNationId].minX = Math.min(nationMinMaxCoords[currentCellNationId].minX, x);
            nationMinMaxCoords[currentCellNationId].maxX = Math.max(nationMinMaxCoords[currentCellNationId].maxX, x);
            nationMinMaxCoords[currentCellNationId].minY = Math.min(nationMinMaxCoords[currentCellNationId].minY, y);
            nationMinMaxCoords[currentCellNationId].maxY = Math.max(nationMinMaxCoords[currentCellNationId].maxY, y);
            for (const dir of BASE_DIRS) {
                const nx = x + dir.dx;
                const ny = y + dir.dy;
                if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;
                const neighborPhysCell = physmap[ny][nx];
                if (neighborPhysCell.type === terrainType.OCEAN || neighborPhysCell.type === terrainType.SEA || neighborPhysCell.type === terrainType.SHALLOW_WATER) continue;

                const neighborNationCell = nationMap[ny] && nationMap[ny][nx];
                const neighborNationId = (neighborNationCell && neighborNationCell.nationId !== null) ? neighborNationCell.nationId : null;

                if (typeof neighborNationId !== 'number') continue;
                if (neighborNationId !== currentCellNationId) {
                    politicalMapOutput[y][x].borders[dir.currentSide] = true;
                    const neighborNation = nationDataMap[neighborNationId];
                    if (nation && neighborNation) {
                        nation.neighbors.add(neighborNation.name);
                        neighborNation.neighbors.add(nation.name);
                    }
                }
            }
        }
    }
    nationInfoList.forEach(nation => {
        nation.neighbors = [...nation.neighbors];
        if (nation.cellCount > 0) {
            const bestPos = findBestLabelPosition(nation.id, nationMap, mapWidth, mapHeight);
            if (bestPos.x !== -1) {
                nation.labelPosition = bestPos;
            } else {
                nation.labelPosition = { x: nation.capital.x, y: nation.capital.y };
            }
        } else {
            nation.labelPosition = { x: nation.capital.x, y: nation.capital.y };
        }
        const coords = nationMinMaxCoords[nation.id];
        if (coords && coords.maxX !== -1) {
            const widthInCells = coords.maxX - coords.minX + 1;
            const heightInCells = coords.maxY - coords.minY + 1;
            nation.estimatedSpanInCells = Math.sqrt(Math.max(1, widthInCells) * Math.max(1, heightInCells));
        } else {
            nation.estimatedSpanInCells = 1;
        }
        delete nation.landCells;
    });

    const tempPoliticalMap = { nations: nationInfoList };
    const roadNetwork = generateRoadNetwork(physmap, tempPoliticalMap, baseSeeds, mapWidth, mapHeight);
    const pointsOfInterest = generatePointsOfInterest(physmap, tempPoliticalMap, mapWidth, mapHeight);

    console.timeEnd("Political Layer Generation");
    return { 
        mapGrid: politicalMapOutput, 
        nations: nationInfoList, 
        roadNetwork: roadNetwork,
        pointsOfInterest: pointsOfInterest
    };
}