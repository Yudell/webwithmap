import { createNoise } from './mapgen.js';
import { terrainType } from './terrain-types.js';


const TERRAIN_COSTS = {
    [terrainType.GRASS]: 1,
    [terrainType.WET_GRASS]: 1.5,
    [terrainType.DRY_GRASS]: 1.2,
    [terrainType.FOREST]: 8,
    'HILLS': 12,
    [terrainType.SAND]: 4,
    [terrainType.DRY_SAND]: 6,
    [terrainType.WET_SAND]: 3,
    [terrainType.MOUNTAIN]: 50,
    [terrainType.MOUNTAIN_ORE]: 60,
    [terrainType.MOUNTAIN_SNOW]: 100,
    [terrainType.RIVER]: Infinity, 
    [terrainType.OCEAN]: Infinity,
    [terrainType.SEA]: Infinity
};

const ROAD_COST = 0.1;

const ROAD_INTERFERENCE_NOISE_SCALE = 0.4;
const ROAD_INTERFERENCE_STRENGTH = 20.0;
const WATER_GRAVITY_STRENGTH = 0.8;

const WAYPOINT_MIN_DISTANCE = 50;
const WAYPOINT_DENSITY = 30;
const WAYPOINT_MAX_DEVIATION_FACTOR = 0.25;



class MinHeap {
    constructor() {
        this.heap = [];
    }
    getParentIndex(i) { return Math.floor((i - 1) / 2); }
    getLeftChildIndex(i) { return 2 * i + 1; }
    getRightChildIndex(i) { return 2 * i + 2; }
    hasParent(i) { return this.getParentIndex(i) >= 0; }
    hasLeftChild(i) { return this.getLeftChildIndex(i) < this.heap.length; }
    hasRightChild(i) { return this.getRightChildIndex(i) < this.heap.length; }
    swap(i1, i2) {
        [this.heap[i1], this.heap[i2]] = [this.heap[i2], this.heap[i1]];
    }
    peek() { return this.heap.length > 0 ? this.heap[0] : null; }
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
        while (this.hasParent(index) && this.heap[this.getParentIndex(index)].priority > this.heap[index].priority) {
            this.swap(this.getParentIndex(index), index);
            index = this.getParentIndex(index);
        }
    }
    heapifyDown() {
        let index = 0;
        while (this.hasLeftChild(index)) {
            let smallerChildIndex = this.getLeftChildIndex(index);
            if (this.hasRightChild(index) && this.heap[this.getRightChildIndex(index)].priority < this.heap[smallerChildIndex].priority) {
                smallerChildIndex = this.getRightChildIndex(index);
            }
            if (this.heap[index].priority <= this.heap[smallerChildIndex].priority) {
                break;
            }
            this.swap(index, smallerChildIndex);
            index = smallerChildIndex;
        }
    }
    isEmpty() { return this.heap.length === 0; }
}


function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findPath(start, end, costMap, width, height) {
    const startNode = `${start.x},${start.y}`;
    const endNode = `${end.x},${end.y}`;

    const frontier = new MinHeap();
    frontier.add({ element: startNode, priority: 0 });

    const cameFrom = { [startNode]: null };
    const costSoFar = { [startNode]: 0 };

    while (!frontier.isEmpty()) {
        const current = frontier.poll();
        const currentKey = current.element;
        
        if (currentKey === endNode) {
            const path = [];
            let temp = endNode;
            while (temp) {
                const [x, y] = temp.split(',').map(Number);
                path.push({ x, y });
                temp = cameFrom[temp];
            }
            return path.reverse();
        }

        const [currentX, currentY] = currentKey.split(',').map(Number);

        for (const dx of [-1, 0, 1]) {
            for (const dy of [-1, 0, 1]) {
                if (dx === 0 && dy === 0) continue;

                const neighborX = currentX + dx;
                const neighborY = currentY + dy;

                if (neighborX >= 0 && neighborX < width && neighborY >= 0 && neighborY < height) {
                    const neighborCost = costMap[neighborY]?.[neighborX];
                    if (neighborCost === undefined || neighborCost === Infinity) continue;

                    const moveCost = (dx !== 0 && dy !== 0) ? neighborCost * 1.414 : neighborCost;
                    const newCost = costSoFar[currentKey] + moveCost;
                    
                    const neighborKey = `${neighborX},${neighborY}`;
                    if (!(neighborKey in costSoFar) || newCost < costSoFar[neighborKey]) {
                        costSoFar[neighborKey] = newCost;
                        const priority = newCost + heuristic({x: neighborX, y: neighborY}, end);
                        frontier.add({ element: neighborKey, priority: priority });
                        cameFrom[neighborKey] = currentKey;
                    }
                }
            }
        }
    }
    return null;
}



function createCostMap(physmap, seeds, width, height) {
    const costMap = Array.from({ length: height }, () => new Array(width).fill(0));
    const interferenceNoise = createNoise(seeds.terrain ^ 0xABCDEF);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const terrain = physmap[y][x].type;
            const baseCost = TERRAIN_COSTS[terrain] || Infinity;
            const noiseVal = interferenceNoise(x * ROAD_INTERFERENCE_NOISE_SCALE, y * ROAD_INTERFERENCE_NOISE_SCALE);
            const interference = (noiseVal + 1) * 0.5 * ROAD_INTERFERENCE_STRENGTH;
            costMap[y][x] = baseCost + interference;
        }
    }

    const distanceToWater = Array.from({ length: height }, () => new Array(width).fill(Infinity));
    const queue = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const terrain = physmap[y][x].type;
            if (terrain === terrainType.RIVER || terrain === terrainType.SEA || terrain === terrainType.OCEAN) {
                distanceToWater[y][x] = 0;
                queue.push({ x, y });
            }
        }
    }

    let head = 0;
    while(head < queue.length) {
        const {x, y} = queue[head++];
        for (const dx of [-1, 0, 1]) {
            for (const dy of [-1, 0, 1]) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height && distanceToWater[ny][nx] === Infinity) {
                    distanceToWater[ny][nx] = distanceToWater[y][x] + 1;
                    queue.push({ x: nx, y: ny });
                }
            }
        }
    }
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (costMap[y][x] !== Infinity) {
                const dist = distanceToWater[y][x];
                 if (dist > 0 && dist < 15) {
                    const gravityBonus = (1 / (dist + 1)) * WATER_GRAVITY_STRENGTH;
                    costMap[y][x] *= (1 - gravityBonus);
                 }
            }
        }
    }
    return costMap;
}


class DSU {
    constructor(n) { this.parent = Array.from({length: n}, (_, i) => i); }
    find(i) {
        if (this.parent[i] === i) return i;
        return this.parent[i] = this.find(this.parent[i]);
    }
    union(i, j) {
        const rootI = this.find(i);
        const rootJ = this.find(j);
        if (rootI !== rootJ) {
            this.parent[rootI] = rootJ;
            return true;
        }
        return false;
    }
}

function buildRoadNetworkMST(settlements) {
    if (settlements.length < 2) return [];

    const edges = [];
    for (let i = 0; i < settlements.length; i++) {
        for (let j = i + 1; j < settlements.length; j++) {
            const s1 = settlements[i];
            const s2 = settlements[j];
            const dist = Math.sqrt((s1.x - s2.x)**2 + (s1.y - s2.y)**2);
            edges.push({ u: i, v: j, weight: dist });
        }
    }

    edges.sort((a, b) => a.weight - b.weight);

    const dsu = new DSU(settlements.length);
    const mstEdges = [];
    for (const edge of edges) {
        if (dsu.union(edge.u, edge.v)) {
            mstEdges.push({ start: settlements[edge.u], end: settlements[edge.v] });
        }
        if (mstEdges.length === settlements.length - 1) break;
    }
    
    return mstEdges;
}

function generateWaypoints(start, end, costMap, width, height) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx*dx + dy*dy);

    if (distance < WAYPOINT_MIN_DISTANCE) {
        return [];
    }

    const numWaypoints = Math.floor(distance / WAYPOINT_DENSITY);
    if (numWaypoints === 0) return [];
    
    const waypoints = [];
    
    const mainVec = { x: dx / distance, y: dy / distance };
    const perpVec = { x: -mainVec.y, y: mainVec.x };

    for (let i = 1; i <= numWaypoints; i++) {
        const progress = i / (numWaypoints + 1);
        const pointOnLine = {
            x: start.x + dx * progress,
            y: start.y + dy * progress
        };
        
        const deviation = (Math.random() - 0.5) * 2 * distance * WAYPOINT_MAX_DEVIATION_FACTOR;
        
        let waypoint = {
            x: Math.round(pointOnLine.x + perpVec.x * deviation),
            y: Math.round(pointOnLine.y + perpVec.y * deviation)
        };
        
        waypoint.x = Math.max(0, Math.min(width - 1, waypoint.x));
        waypoint.y = Math.max(0, Math.min(height - 1, waypoint.y));

        let attempts = 0;
        while(costMap[waypoint.y]?.[waypoint.x] === Infinity && attempts < 25) {
            const searchDX = Math.floor(Math.random() * 11) - 5;
            const searchDY = Math.floor(Math.random() * 11) - 5;
            waypoint.x = Math.max(0, Math.min(width - 1, waypoint.x + searchDX));
            waypoint.y = Math.max(0, Math.min(height - 1, waypoint.y + searchDY));
            attempts++;
        }
        
        if (costMap[waypoint.y]?.[waypoint.x] !== Infinity) {
             waypoints.push(waypoint);
        }
    }
    
    return waypoints;
}

function findFullPath(start, end, costMap, width, height) {
    const waypoints = generateWaypoints(start, end, costMap, width, height);
    const stops = [start, ...waypoints, end];
    let fullPath = [];
    
    for (let i = 0; i < stops.length - 1; i++) {
        const segmentStart = stops[i];
        const segmentEnd = stops[i+1];
        
        const segmentPath = findPath(segmentStart, segmentEnd, costMap, width, height);
        
        if (segmentPath) {
            fullPath = fullPath.concat(i > 0 ? segmentPath.slice(1) : segmentPath);
        } else {
            return null;
        }
    }
    return fullPath.length > 0 ? fullPath : null;
}



export function generateRoadNetwork(physmap, politicalMap, seeds, width, height) {
    console.time("Total road generation");
    if (!politicalMap || !politicalMap.nations) return [];

    const costMap = createCostMap(physmap, seeds, width, height);
    const allPaths = [];

    const majorSettlements = [];
    politicalMap.nations.forEach(nation => {
        if (nation.capital) {
            majorSettlements.push(nation.capital);
        }
        nation.settlements?.forEach(s => {
            if (s.type === 'city') {
                majorSettlements.push(s);
            }
        });
    });

    if (majorSettlements.length >= 2) {
        const roadConnections = buildRoadNetworkMST(majorSettlements);
        for (const connection of roadConnections) {
            const path = findFullPath(connection.start, connection.end, costMap, width, height);
            if (path) {
                allPaths.push(path);
                for (const point of path) {
                    costMap[point.y][point.x] = ROAD_COST;
                }
            }
        }
    }

    politicalMap.nations.forEach(nation => {
        const nationMajorSettlements = [];
        if (nation.capital) {
            nationMajorSettlements.push(nation.capital);
        }
        nation.settlements?.forEach(s => {
            if (s.type === 'city') {
                nationMajorSettlements.push(s);
            }
        });

        const nationVillages = nation.settlements?.filter(s => s.type === 'village') || [];

        if (nationMajorSettlements.length === 0 || nationVillages.length === 0) {
            return;
        }

        nationVillages.forEach(village => {
            let closestMajor = null;
            let minDistanceSq = Infinity;

            nationMajorSettlements.forEach(major => {
                const distSq = (village.x - major.x)**2 + (village.y - major.y)**2;
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    closestMajor = major;
                }
            });
            
            if (closestMajor) {
                const path = findFullPath(village, closestMajor, costMap, width, height);
                if (path) {
                    allPaths.push(path);
                    for (const point of path) {
                        costMap[point.y][point.x] = ROAD_COST;
                    }
                }
            }
        });
    });
    
    console.timeEnd("Total road generation");
    return allPaths;
}