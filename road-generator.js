// road-generator.js

import { createNoise } from './mapgen.js';
import { terrainType } from './terrain-types.js';

// --- ЧАСТЬ 1: Настройки и константы ---

// Стоимость передвижения по разным типам биомов
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

// Стоимость клетки, где уже есть дорога (чтобы новые дороги "прилипали" к старым)
const ROAD_COST = 0.1;

// --- ИЗМЕНЕНО: Гораздо более агрессивные настройки для кривых дорог ---
const ROAD_INTERFERENCE_NOISE_SCALE = 0.4; // Шум стал "мельче", заставляя дорогу чаще вилять
const ROAD_INTERFERENCE_STRENGTH = 20.0;   // Сила шума увеличена в 10 раз! Прямой путь становится невыгодным.
const WATER_GRAVITY_STRENGTH = 0.8;       // Сила притяжения к воде остается прежней

// Настройки для промежуточных точек (Waypoints)
const WAYPOINT_MIN_DISTANCE = 50;         // Минимальная длина дороги для добавления waypoints
const WAYPOINT_DENSITY = 30;             // Примерное расстояние между waypoints
const WAYPOINT_MAX_DEVIATION_FACTOR = 0.25; // Максимальное отклонение от прямой (25% от длины)


// --- ЧАСТЬ 2: Реализация алгоритма A* с очередью с приоритетом (без изменений) ---

class PriorityQueue {
    constructor() {
        this.elements = [];
    }
    enqueue(element, priority) {
        this.elements.push({ element, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }
    dequeue() {
        return this.elements.shift().element;
    }
    isEmpty() {
        return this.elements.length === 0;
    }
}

function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findPath(start, end, costMap, width, height) {
    const startNode = `${start.x},${start.y}`;
    const endNode = `${end.x},${end.y}`;

    const frontier = new PriorityQueue();
    frontier.enqueue(startNode, 0);

    const cameFrom = { [startNode]: null };
    const costSoFar = { [startNode]: 0 };

    while (!frontier.isEmpty()) {
        const currentKey = frontier.dequeue();
        
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
                        frontier.enqueue(neighborKey, priority);
                        cameFrom[neighborKey] = currentKey;
                    }
                }
            }
        }
    }
    return null;
}


// --- ЧАСТЬ 3: Создание комплексной карты стоимости (без изменений) ---

function createCostMap(physmap, seeds, width, height) {
    console.time("Cost map generation");
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
    console.timeEnd("Cost map generation");
    return costMap;
}

// --- ЧАСТЬ 4: Построение MST и ГЕНЕРАЦИЯ WAYPOINTS ---

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

// --- НОВАЯ ФУНКЦИЯ: Генерация промежуточных точек ---
function generateWaypoints(start, end, costMap, width, height) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx*dx + dy*dy);

    if (distance < WAYPOINT_MIN_DISTANCE) {
        return []; // Дорога слишком короткая для waypoints
    }

    const numWaypoints = Math.floor(distance / WAYPOINT_DENSITY);
    if (numWaypoints === 0) return [];
    
    const waypoints = [];
    
    // Вектор направления и перпендикулярный ему вектор
    const mainVec = { x: dx / distance, y: dy / distance };
    const perpVec = { x: -mainVec.y, y: mainVec.x };

    for (let i = 1; i <= numWaypoints; i++) {
        const progress = i / (numWaypoints + 1);
        const pointOnLine = {
            x: start.x + dx * progress,
            y: start.y + dy * progress
        };
        
        // Случайное смещение вдоль перпендикуляра
        const deviation = (Math.random() - 0.5) * 2 * distance * WAYPOINT_MAX_DEVIATION_FACTOR;
        
        let waypoint = {
            x: Math.round(pointOnLine.x + perpVec.x * deviation),
            y: Math.round(pointOnLine.y + perpVec.y * deviation)
        };
        
        // Проверяем, чтобы точка не попала в воду или за пределы карты
        waypoint.x = Math.max(0, Math.min(width - 1, waypoint.x));
        waypoint.y = Math.max(0, Math.min(height - 1, waypoint.y));

        // Если точка попала в воду, пытаемся найти ближайшую сушу (простой поиск)
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

// --- ЧАСТЬ 5: Главная управляющая функция (переписана для работы с waypoints) ---

export function generateRoadNetwork(physmap, politicalMap, seeds, width, height) {
    console.time("Total road generation");
    if (!politicalMap || !politicalMap.nations) return [];

    const majorSettlements = [];
    politicalMap.nations.forEach(nation => {
        if (nation.capital) {
            majorSettlements.push({ ...nation.capital, id: `cap_${nation.id}` });
        }
        nation.settlements?.forEach(s => {
            if (s.type === 'city') {
                majorSettlements.push({ ...s, id: `city_${s.name}` });
            }
        });
    });

    if (majorSettlements.length < 2) return [];

    const costMap = createCostMap(physmap, seeds, width, height);
    const roadConnections = buildRoadNetworkMST(majorSettlements);
    
    const allPaths = [];
    for (const connection of roadConnections) {
        // Генерируем промежуточные точки для каждого соединения
        const waypoints = generateWaypoints(connection.start, connection.end, costMap, width, height);
        const stops = [connection.start, ...waypoints, connection.end];
        
        let fullPath = [];
        
        // Строим путь по сегментам: от точки к точке
        for (let i = 0; i < stops.length - 1; i++) {
            const segmentStart = stops[i];
            const segmentEnd = stops[i+1];
            
            const segmentPath = findPath(segmentStart, segmentEnd, costMap, width, height);
            
            if (segmentPath) {
                // Добавляем сегмент к общему пути (удаляя дубликат начальной точки)
                fullPath = fullPath.concat(i > 0 ? segmentPath.slice(1) : segmentPath);
            } else {
                // Если сегмент не построился, прерываем создание этой дороги
                fullPath = [];
                break;
            }
        }
        
        if (fullPath.length > 0) {
            allPaths.push(fullPath);
            // Снижаем стоимость клеток на проложенном пути, чтобы другие дороги к нему "прилипали"
            for (const point of fullPath) {
                costMap[point.y][point.x] = ROAD_COST;
            }
        }
    }
    console.timeEnd("Total road generation");
    return allPaths;
}