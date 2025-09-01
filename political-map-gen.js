import { createNoise } from './mapgen.js';
import { terrainType } from './terrain-types.js';
import { predefinedColors } from './colors.js';
import { generateRoadNetwork } from './road-generator.js';

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

const VOWELS = ["a", "e", "i", "o", "u", "ae", "ia", "ea", "ou", "ai"];
const CONSONANTS_START = ["b", "d", "f", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "z", "ch", "sh", "th", "br", "dr", "kl", "pr", "tr", "st", "sk"];
const CONSONANTS_END = ["b", "d", "g", "k", "l", "m", "n", "p", "r", "s", "t", "z", "th", "sh", "ng", "nd", "nt", "rt", "st", "sk", "ld", "rd"];
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
    [terrainType.SEA]: 0
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
};

const UNSUITABLE_TERRAIN_FOR_SETTLEMENTS = new Set([
    terrainType.MOUNTAIN_SNOW,
    terrainType.MOUNTAIN,
    terrainType.DRY_SAND,
]);

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateSyllable() {
    let syllable = "";
    if (Math.random() < 0.8) { 
        syllable += randomElement(CONSONANTS_START);
        syllable += randomElement(VOWELS);
        if (Math.random() < 0.4) { 
            syllable += randomElement(CONSONANTS_END);
        }
    } else {
        syllable += randomElement(VOWELS);
        syllable += randomElement(CONSONANTS_END);
    }
    return syllable;
}

function generateNationName(syllables = 2) {
    const numSyllables = Math.floor(Math.random() * 2) + syllables; 
    let name = "";
    for (let i = 0; i < numSyllables; i++) {
        name += generateSyllable();
    }
    name = name.replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1');
    name = name.replace(/([aeiou])\1\1+/g, '$1$1'); 

    const maxLength = 10 + Math.floor(Math.random() * 4);
    name = name.substring(0, Math.min(name.length, maxLength));
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function generateSettlementName() {
    return generateNationName(1);
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function generatePoliticalLayer(physmap, baseSeeds, mapWidth, mapHeight, settings) {
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
    numNations = Math.max(2, Math.min(predefinedColors.length, Math.min(Math.floor(mapArea / 700), numNations)));
    if (mapArea < 250 && numNations > 2) numNations = 2;
    if (mapArea < 80 && numNations > 1) numNations = 1;

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
            attempts++; continue;
        }

        const terrainCell = physmap[cy][cx];
        if (terrainCell.type !== terrainType.OCEAN && terrainCell.type !== terrainType.SEA) {
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
                    x: cx, y: cy,
                    id: capitals.length, 
                    color: predefinedColors[capitals.length % predefinedColors.length]
                });
            }
        }
        attempts++;
    }

    if (capitals.length === 0 && numNations > 0 && mapArea > 0) {
        const landCells = [];
        for (let r = 0; r < mapHeight; r++) {
            for (let c = 0; c < mapWidth; c++) {
                if (physmap[r] && physmap[r][c] && physmap[r][c].type !== terrainType.OCEAN && physmap[r][c].type !== terrainType.SEA) {
                    landCells.push({x: c, y: r});
                }
            }
        }
        if (landCells.length > 0) {
            for (let i = 0; i < numNations && landCells.length > 0; i++) {
                const randIndex = Math.floor(Math.random() * landCells.length);
                const randomLandCell = landCells.splice(randIndex, 1)[0];
                 capitals.push({
                    x: randomLandCell.x, y: randomLandCell.y,
                    id: capitals.length,
                    color: predefinedColors[capitals.length % predefinedColors.length]
                });
                 if (capitals.length >= predefinedColors.length) break;
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
        { dx: 0, dy: -1, currentSide: 'top' }, { dx: 0, dy: 1,  currentSide: 'bottom' },
        { dx: -1, dy: 0, currentSide: 'left' },{ dx: 1, dy: 0,  currentSide: 'right' }
    ];

    while(head < landExpansionQueue.length) {
        const current = landExpansionQueue[head++];
        const currentDist = nationMap[current.y][current.x].dist;

        const shuffledDirs = shuffleArray([...BASE_DIRS]);

        for (const dir of shuffledDirs) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;

            if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight) {
                if (!physmap[ny] || !physmap[ny][nx]) continue;
                const neighborTerrainCell = physmap[ny][nx];
                if (neighborTerrainCell.type === terrainType.OCEAN || neighborTerrainCell.type === terrainType.SEA) continue;

                let baseStepCost = 1.0;
                if (neighborTerrainCell.type === terrainType.FOREST) baseStepCost = 1.8;
                else if (neighborTerrainCell.type === terrainType.RIVER) baseStepCost = 1.4;
                else if (neighborTerrainCell.type === terrainType.WET_GRASS || neighborTerrainCell.type === terrainType.DRY_GRASS) baseStepCost = 1.2;
                else if (neighborTerrainCell.type === terrainType.SAND || neighborTerrainCell.type === terrainType.DRY_SAND || neighborTerrainCell.type === terrainType.WET_SAND) baseStepCost = 1.5;
                else if (neighborTerrainCell.type === terrainType.MOUNTAIN ||
                    neighborTerrainCell.type === terrainType.MOUNTAIN_ORE ||
                    neighborTerrainCell.type === terrainType.MOUNTAIN_SNOW ||
                    neighborTerrainCell.type === 'HILLS') baseStepCost = 3.0;

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

    const ISLAND_MAX_WATER_CROSSING_DIST = 4;
    const SEA_CROSSING_COST_MULTIPLIER = 2.0;
    const islandClaimQueue = new MinHeap();

    for (let r = 0; r < mapHeight; r++) {
        for (let c = 0; c < mapWidth; c++) {
            if (nationMap[r][c].nationId !== null) {
                islandClaimQueue.add({
                    x: c, y: r,
                    nationId: nationMap[r][c].nationId,
                    waterDist: 0,
                    totalDist: nationMap[r][c].dist
                });
            }
        }
    }

    while (!islandClaimQueue.isEmpty()) {
        const current = islandClaimQueue.poll();
        if (!current) break;

        const currentPhysCell = physmap[current.y][current.x];
        const isCurrentCellLand = !(currentPhysCell.type === terrainType.OCEAN || currentPhysCell.type === terrainType.SEA);

        if (isCurrentCellLand && current.totalDist > nationMap[current.y][current.x].dist) {
            continue;
        }
        if (isCurrentCellLand && nationMap[current.y][current.x].nationId !== null &&
            nationMap[current.y][current.x].nationId !== current.nationId &&
            current.totalDist >= nationMap[current.y][current.x].dist) {
            continue;
        }

        for (const dir of BASE_DIRS) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;

            if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight) {
                const neighborPhysCell = physmap[ny][nx];
                let costToNeighbor = 1.0;
                let newWaterDist = current.waterDist;
                const isNeighborWater = (neighborPhysCell.type === terrainType.OCEAN || neighborPhysCell.type === terrainType.SEA);

                if (isNeighborWater) {
                    newWaterDist++;
                    if (newWaterDist > ISLAND_MAX_WATER_CROSSING_DIST) {
                        continue;
                    }
                    costToNeighbor = SEA_CROSSING_COST_MULTIPLIER;
                } else {
                    newWaterDist = 0;
                    let baseStepCost = 1.0;
                    if (neighborPhysCell.type === terrainType.FOREST) baseStepCost = 1.8;
                    else if (neighborPhysCell.type === terrainType.RIVER) baseStepCost = 1.4;
                    else if (neighborPhysCell.type === terrainType.WET_GRASS || neighborPhysCell.type === terrainType.DRY_GRASS) baseStepCost = 1.2;
                    else if (neighborPhysCell.type === terrainType.SAND || neighborPhysCell.type === terrainType.DRY_SAND || neighborPhysCell.type === terrainType.WET_SAND) baseStepCost = 1.5;
                    else if (neighborPhysCell.type === terrainType.MOUNTAIN ||
                             neighborPhysCell.type === terrainType.MOUNTAIN_ORE ||
                             neighborPhysCell.type === terrainType.MOUNTAIN_SNOW ||
                             neighborPhysCell.type === 'HILLS') baseStepCost = 3.0;

                    const distortionVal = (expansionDistortionNoise(nx / DISTORTION_NOISE_SCALE, ny / DISTORTION_NOISE_SCALE) + 1) / 2;
                    const distortionFactor = 1.0 + (distortionVal - 0.5) * MAX_DISTORTION_EFFECT_STRENGTH;
                    const roughnessVal = borderRoughnessNoise(nx / BORDER_ROUGHNESS_NOISE_SCALE, ny / BORDER_ROUGHNESS_NOISE_SCALE);
                    const roughnessFactor = 1.0 + roughnessVal * BORDER_ROUGHNESS_STRENGTH;
                    costToNeighbor = Math.max(0.1, baseStepCost * distortionFactor * roughnessFactor);
                }

                const newTotalDist = current.totalDist + costToNeighbor;

                if (!isNeighborWater) {
                    if (newTotalDist < nationMap[ny][nx].dist) {
                        nationMap[ny][nx] = { nationId: current.nationId, dist: newTotalDist };
                        islandClaimQueue.add({ x: nx, y: ny, nationId: current.nationId, waterDist: newWaterDist, totalDist: newTotalDist });
                    }
                } else {
                    islandClaimQueue.add({ x: nx, y: ny, nationId: current.nationId, waterDist: newWaterDist, totalDist: newTotalDist });
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
                physCell.type !== terrainType.OCEAN && physCell.type !== terrainType.SEA) {
                
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

        const resources = new Set();
        if (terrainPercentages.find(t => t.name === 'Mountains' && t.p > 5)) resources.add('Ore');
        if (terrainPercentages.find(t => t.name === 'Forests' && t.p > 20)) resources.add('Wood');
        if (terrainPercentages.find(t => t.name === 'Plains' && t.p > 20)) resources.add('Fertile lands');
        if (terrainPercentages.find(t => t.name === 'Deserts' && t.p > 30)) resources.add('Sand');
        if (resources.size === 0) resources.add('Low');
        nation.resources = [...resources].join(', ');
        
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
                    for(const settlement of allSettlements) {
                        const distSq = (settlement.x - cell.x)**2 + (settlement.y - cell.y)**2;
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
    
    const nationSumX = {}, nationSumY = {}, nationMinMaxCoords = {};
    nationInfoList.forEach(n => {
        nationSumX[n.id] = 0; nationSumY[n.id] = 0;
        nationMinMaxCoords[n.id] = { minX: mapWidth, maxX: -1, minY: mapHeight, maxY: -1 };
    });

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const cellNationInfo = nationMap[y][x];
            let currentCellNationId = cellNationInfo?.nationId ?? null;
            politicalMapOutput[y][x].nationId = currentCellNationId;
            
            const physCell = physmap[y][x];
            if (physCell.type === terrainType.OCEAN || physCell.type === terrainType.SEA || typeof currentCellNationId !== 'number') {
                continue;
            }

            const nation = nationDataMap[currentCellNationId];
            nationSumX[currentCellNationId] += x;
            nationSumY[currentCellNationId] += y;
            nationMinMaxCoords[currentCellNationId].minX = Math.min(nationMinMaxCoords[currentCellNationId].minX, x);
            nationMinMaxCoords[currentCellNationId].maxX = Math.max(nationMinMaxCoords[currentCellNationId].maxX, x);
            nationMinMaxCoords[currentCellNationId].minY = Math.min(nationMinMaxCoords[currentCellNationId].minY, y);
            nationMinMaxCoords[currentCellNationId].maxY = Math.max(nationMinMaxCoords[currentCellNationId].maxY, y);


            for (const dir of BASE_DIRS) {
                const nx = x + dir.dx;
                const ny = y + dir.dy;

                if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;
                
                const neighborPhysCell = physmap[ny][nx];
                if (neighborPhysCell.type === terrainType.OCEAN || neighborPhysCell.type === terrainType.SEA) continue;

                const neighborNationId = nationMap[ny][nx]?.nationId;
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
            const avgX = nationSumX[nation.id] / nation.cellCount;
            const avgY = nationSumY[nation.id] / nation.cellCount;
            let lx = Math.floor(avgX);
            let ly = Math.floor(avgY);
            if (!(nationMap[ly]?.[lx]?.nationId === nation.id && physmap[ly]?.[lx]?.type !== terrainType.OCEAN && physmap[ly]?.[lx]?.type !== terrainType.SEA)) {
                lx = nation.capital.x;
                ly = nation.capital.y;
            }
            nation.labelPosition = { x: lx, y: ly };
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

    // Создаем временный объект politicalMap для передачи в генератор дорог
    const tempPoliticalMap = { nations: nationInfoList };
    // Генерируем сеть дорог
    const roadNetwork = generateRoadNetwork(physmap, tempPoliticalMap, baseSeeds, mapWidth, mapHeight);

    // Возвращаем результат вместе с дорогами
    return { mapGrid: politicalMapOutput, nations: nationInfoList, roadNetwork: roadNetwork };
}