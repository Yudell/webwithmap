/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ var __webpack_modules__ = ({

/***/ "./mapgen.js":
/*!*******************!*\
  !*** ./mapgen.js ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createNoise: () => (/* binding */ createNoise),\n/* harmony export */   defaultFrequency: () => (/* binding */ defaultFrequency),\n/* harmony export */   defaultOctaves: () => (/* binding */ defaultOctaves),\n/* harmony export */   defaultPersistence: () => (/* binding */ defaultPersistence),\n/* harmony export */   generateRandomSeed: () => (/* binding */ generateRandomSeed),\n/* harmony export */   newFractalNoise: () => (/* binding */ newFractalNoise)\n/* harmony export */ });\n/* harmony import */ var open_simplex_noise__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! open-simplex-noise */ \"./node_modules/open-simplex-noise/lib/2d.js\");\n\r\n\r\nfunction generateRandomSeed() {\r\n  return Math.floor(Math.random() * Math.pow(2, 32));\r\n}\r\n\r\nfunction createNoise(seed) {\r\n  return (0,open_simplex_noise__WEBPACK_IMPORTED_MODULE_0__.makeNoise2D)(seed);\r\n}\r\n\r\nfunction newFractalNoise(info) {\r\n  const {\r\n    noise,\r\n    octaves = defaultOctaves,\r\n    amplitude = 1,\r\n    frequency = defaultFrequency,\r\n    persistence = defaultPersistence,\r\n    stretchX = 1.0,  // New parameter\r\n    stretchY = 1.0 \r\n  } = info;\r\n\r\n  return function getFractalNoise(x, y) {\r\n    let value = 0.0;\r\n\r\n    for (let octave = 0; octave < octaves; octave++) {\r\n      let freq = frequency * Math.pow(2, octave);\r\n\r\n      const nx = x * freq * stretchX;\r\n      const ny = y * freq * stretchY;\r\n      value += noise(nx, ny) * (amplitude * Math.pow(persistence, octave));\r\n    }\r\n\r\n    return value / (2 - 1 / Math.pow(2, octaves - 1));\r\n  };\r\n}\r\n\r\nconst defaultOctaves = 11;\r\nconst defaultFrequency = 0.2;\r\nconst defaultPersistence = 0.65;\r\n\r\n\n\n//# sourceURL=webpack:///./mapgen.js?");

/***/ }),

/***/ "./node_modules/open-simplex-noise/lib/2d.js":
/*!***************************************************!*\
  !*** ./node_modules/open-simplex-noise/lib/2d.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\r\n// This is free and unencumbered software released into the public domain\r\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\r\nexports.makeNoise2D = void 0;\r\nvar shuffle_seed_1 = __webpack_require__(/*! ./shuffle_seed */ \"./node_modules/open-simplex-noise/lib/shuffle_seed.js\");\r\nvar NORM_2D = 1.0 / 47.0;\r\nvar SQUISH_2D = (Math.sqrt(2 + 1) - 1) / 2;\r\nvar STRETCH_2D = (1 / Math.sqrt(2 + 1) - 1) / 2;\r\nfunction contribution2D(multiplier, xsb, ysb) {\r\n    return {\r\n        dx: -xsb - multiplier * SQUISH_2D,\r\n        dy: -ysb - multiplier * SQUISH_2D,\r\n        xsb: xsb,\r\n        ysb: ysb,\r\n    };\r\n}\r\nfunction makeNoise2D(clientSeed) {\r\n    var contributions = [];\r\n    for (var i = 0; i < p2D.length; i += 4) {\r\n        var baseSet = base2D[p2D[i]];\r\n        var previous = null;\r\n        var current = null;\r\n        for (var k = 0; k < baseSet.length; k += 3) {\r\n            current = contribution2D(baseSet[k], baseSet[k + 1], baseSet[k + 2]);\r\n            if (previous === null)\r\n                contributions[i / 4] = current;\r\n            else\r\n                previous.next = current;\r\n            previous = current;\r\n        }\r\n        current.next = contribution2D(p2D[i + 1], p2D[i + 2], p2D[i + 3]);\r\n    }\r\n    var lookup = [];\r\n    for (var i = 0; i < lookupPairs2D.length; i += 2) {\r\n        lookup[lookupPairs2D[i]] = contributions[lookupPairs2D[i + 1]];\r\n    }\r\n    var perm = new Uint8Array(256);\r\n    var perm2D = new Uint8Array(256);\r\n    var source = new Uint8Array(256);\r\n    for (var i = 0; i < 256; i++)\r\n        source[i] = i;\r\n    var seed = new Uint32Array(1);\r\n    seed[0] = clientSeed;\r\n    seed = shuffle_seed_1.default(shuffle_seed_1.default(shuffle_seed_1.default(seed)));\r\n    for (var i = 255; i >= 0; i--) {\r\n        seed = shuffle_seed_1.default(seed);\r\n        var r = new Uint32Array(1);\r\n        r[0] = (seed[0] + 31) % (i + 1);\r\n        if (r[0] < 0)\r\n            r[0] += i + 1;\r\n        perm[i] = source[r[0]];\r\n        perm2D[i] = perm[i] & 0x0e;\r\n        source[r[0]] = source[i];\r\n    }\r\n    return function (x, y) {\r\n        var stretchOffset = (x + y) * STRETCH_2D;\r\n        var xs = x + stretchOffset;\r\n        var ys = y + stretchOffset;\r\n        var xsb = Math.floor(xs);\r\n        var ysb = Math.floor(ys);\r\n        var squishOffset = (xsb + ysb) * SQUISH_2D;\r\n        var dx0 = x - (xsb + squishOffset);\r\n        var dy0 = y - (ysb + squishOffset);\r\n        var xins = xs - xsb;\r\n        var yins = ys - ysb;\r\n        var inSum = xins + yins;\r\n        var hash = (xins - yins + 1) |\r\n            (inSum << 1) |\r\n            ((inSum + yins) << 2) |\r\n            ((inSum + xins) << 4);\r\n        var value = 0;\r\n        for (var c = lookup[hash]; c !== undefined; c = c.next) {\r\n            var dx = dx0 + c.dx;\r\n            var dy = dy0 + c.dy;\r\n            var attn = 2 - dx * dx - dy * dy;\r\n            if (attn > 0) {\r\n                var px = xsb + c.xsb;\r\n                var py = ysb + c.ysb;\r\n                var indexPartA = perm[px & 0xff];\r\n                var index = perm2D[(indexPartA + py) & 0xff];\r\n                var valuePart = gradients2D[index] * dx + gradients2D[index + 1] * dy;\r\n                value += attn * attn * attn * attn * valuePart;\r\n            }\r\n        }\r\n        return value * NORM_2D;\r\n    };\r\n}\r\nexports.makeNoise2D = makeNoise2D;\r\nvar base2D = [\r\n    [1, 1, 0, 1, 0, 1, 0, 0, 0],\r\n    [1, 1, 0, 1, 0, 1, 2, 1, 1],\r\n];\r\nvar gradients2D = [\r\n    5,\r\n    2,\r\n    2,\r\n    5,\r\n    -5,\r\n    2,\r\n    -2,\r\n    5,\r\n    5,\r\n    -2,\r\n    2,\r\n    -5,\r\n    -5,\r\n    -2,\r\n    -2,\r\n    -5,\r\n];\r\nvar lookupPairs2D = [\r\n    0,\r\n    1,\r\n    1,\r\n    0,\r\n    4,\r\n    1,\r\n    17,\r\n    0,\r\n    20,\r\n    2,\r\n    21,\r\n    2,\r\n    22,\r\n    5,\r\n    23,\r\n    5,\r\n    26,\r\n    4,\r\n    39,\r\n    3,\r\n    42,\r\n    4,\r\n    43,\r\n    3,\r\n];\r\nvar p2D = [\r\n    0,\r\n    0,\r\n    1,\r\n    -1,\r\n    0,\r\n    0,\r\n    -1,\r\n    1,\r\n    0,\r\n    2,\r\n    1,\r\n    1,\r\n    1,\r\n    2,\r\n    2,\r\n    0,\r\n    1,\r\n    2,\r\n    0,\r\n    2,\r\n    1,\r\n    0,\r\n    0,\r\n    0,\r\n];\r\n\n\n//# sourceURL=webpack:///./node_modules/open-simplex-noise/lib/2d.js?");

/***/ }),

/***/ "./node_modules/open-simplex-noise/lib/shuffle_seed.js":
/*!*************************************************************!*\
  !*** ./node_modules/open-simplex-noise/lib/shuffle_seed.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, exports) => {

eval("\r\n// This is free and unencumbered software released into the public domain\r\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\r\nfunction shuffleSeed(seed) {\r\n    var newSeed = new Uint32Array(1);\r\n    newSeed[0] = seed[0] * 1664525 + 1013904223;\r\n    return newSeed;\r\n}\r\nexports[\"default\"] = shuffleSeed;\r\n\n\n//# sourceURL=webpack:///./node_modules/open-simplex-noise/lib/shuffle_seed.js?");

/***/ }),

/***/ "./test2.js":
/*!******************!*\
  !*** ./test2.js ***!
  \******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _mapgen_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mapgen.js */ \"./mapgen.js\");\n\r\n\r\nconst terrainType = {\r\n  OCEAN: 'OCEAN',\r\n  SEA: 'SEA',\r\n  WET_SAND: 'WET_SAND',\r\n  SAND: 'SAND',\r\n  DRY_SAND: 'DRY_SAND',\r\n  DRY_GRASS: 'DRY_GRASS',\r\n  GRASS: 'GRASS',\r\n  WET_GRASS: 'WET_GRASS',\r\n  MOUNTAIN_SNOW: 'MOUNTAIN_SNOW',\r\n  MOUNTAIN_ORE: 'MOUNTAIN_ORE',\r\n  MOUNTAIN: 'MOUNTAIN',\r\n  FOREST: 'FOREST'\r\n};\r\n\r\nlet physmap = null;\r\nlet cellSize = 3;\r\nlet resizeTimeout;\r\nlet scale = 1; // Текущий масштаб (1 = 100%)\r\nconst MIN_SCALE = 0.5; // Минимальный масштаб (50%)\r\nconst MAX_SCALE = 5; // Максимальный масштаб (300%)\r\nconst SCALE_STEP = 0.5; // Шаг изменения масштаба\r\n\r\nfunction calculateCellSize() {\r\n  const screenWidth = window.innerWidth;\r\n  const screenHeight = window.innerHeight;\r\n  const baseSize = Math.max(2, Math.min(4, \r\n    Math.floor(Math.min(screenWidth, screenHeight) / 250)));\r\n  return baseSize / scale; // Применяем масштаб\r\n}\r\n\r\nfunction updateScaleDisplay() {\r\n  document.getElementById('scale-display').textContent = \r\n    `${Math.round(scale * 100)}%`;\r\n}\r\n\r\nfunction getMapDimensions() {\r\n  return {\r\n    width: Math.floor(window.innerWidth / cellSize),\r\n    height: Math.floor(window.innerHeight / cellSize)\r\n  };\r\n}\r\n\r\nfunction initializeNoiseGenerators() {\r\n  const seeds = {\r\n    terrain: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.generateRandomSeed)(),\r\n    variant: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.generateRandomSeed)(),\r\n    biome: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.generateRandomSeed)(),\r\n    detail: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.generateRandomSeed)(),\r\n    sand: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.generateRandomSeed)(),\r\n    mountain1: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.generateRandomSeed)(),\r\n    mountain2: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.generateRandomSeed)()\r\n  };\r\n\r\n  const sandNoise = (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.newFractalNoise)({\r\n    noise: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.createNoise)(seeds.sand),\r\n    octaves: 10,\r\n    frequency: 0.1,\r\n    persistence: 0.01\r\n  });\r\n\r\n  return {\r\n    terrainNoise: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.newFractalNoise)({\r\n      noise: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.createNoise)(seeds.terrain),\r\n      octaves: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultOctaves,\r\n      frequency: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultFrequency,\r\n      persistence: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultPersistence\r\n    }),\r\n    variantNoise: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.newFractalNoise)({\r\n      noise: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.createNoise)(seeds.variant),\r\n      octaves: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultOctaves,\r\n      frequency: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultFrequency,\r\n      persistence: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultPersistence\r\n    }),\r\n    detailNoise: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.newFractalNoise)({\r\n      noise: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.createNoise)(seeds.detail),\r\n      octaves: 6,\r\n      frequency: 0.6,\r\n      persistence: 0.7\r\n    }),\r\n    mountainNoise1: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.newFractalNoise)({\r\n      noise: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.createNoise)(seeds.mountain1),\r\n      octaves: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultOctaves,\r\n      frequency: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultFrequency,\r\n      persistence: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultPersistence,\r\n    }),\r\n    mountainNoise2: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.newFractalNoise)({\r\n      noise: (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.createNoise)(seeds.mountain2),\r\n      octaves: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultOctaves,\r\n      frequency: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultFrequency,\r\n      persistence: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultPersistence,\r\n    }),\r\n    sandNoise\r\n  };\r\n}\r\n\r\nfunction generateMap() {\r\n  const { width, height } = getMapDimensions();\r\n  const noise = initializeNoiseGenerators();\r\n  \r\n  const map = [];\r\n  for (let y = 0; y < height; y++) {\r\n    map[y] = [];\r\n    for (let x = 0; x < width; x++) {\r\n      const terrainValue = noise.terrainNoise(x/100, y/100) + \r\n                         noise.detailNoise(x/20, y/20) * 0.15;\r\n      const variantValue = noise.variantNoise(x/100, y/100);\r\n      const sandValue = noise.sandNoise(x/50, y/50);\r\n      const localSandThreshold = 0.22 + sandValue * 0.01;\r\n\r\n      const isMountain = Math.max(\r\n        noise.mountainNoise1(x/100, y/100),\r\n        noise.mountainNoise2(x/100, y/100)\r\n      ) > 0.5;\r\n\r\n      let info = {};\r\n\r\n      if (terrainValue < 0) {\r\n        info.color = '#003eb2';\r\n        info.type = terrainType.OCEAN;\r\n      } else if (terrainValue < 0.2) {\r\n        info.color = '#0952c6';\r\n        info.type = terrainType.SEA;\r\n      } else if (terrainValue < localSandThreshold) {\r\n        info.variantNoise = variantValue;\r\n        if (variantValue < -0.2) {\r\n          info.color = '#867645';\r\n          info.type = terrainType.WET_SAND;\r\n        } else if (variantValue < 0.2) {\r\n          info.color = '#a49463';\r\n          info.type = terrainType.SAND;\r\n        } else {\r\n          info.color = '#c2b281';\r\n          info.type = terrainType.DRY_SAND;\r\n        }\r\n      } else if (isMountain && terrainValue > 0.3) {\r\n        info.variantNoise = variantValue;\r\n        if (variantValue < -0.2) {\r\n          info.color = '#ebebeb';\r\n          info.type = terrainType.MOUNTAIN_SNOW;\r\n        } else if (variantValue < 0.2) {\r\n          info.color = '#8c8e7b';\r\n          info.type = terrainType.MOUNTAIN_ORE;\r\n        } else {\r\n          info.color = '#a0a28f';\r\n          info.type = terrainType.MOUNTAIN;\r\n        }\r\n      } else if (terrainValue < 0.5) {\r\n        info.variantNoise = variantValue;\r\n        if (variantValue < -0.2) {\r\n          info.color = '#284d00';\r\n          info.type = terrainType.DRY_GRASS;\r\n        } else if (variantValue < 0.2) {\r\n          info.color = '#3c6114';\r\n          info.type = terrainType.GRASS;\r\n        } else {\r\n          info.color = '#5a7f32';\r\n          info.type = terrainType.WET_GRASS;\r\n        }\r\n      } else {\r\n        info.color = '#8c8e7b';\r\n        info.type = 'HILLS';\r\n      }\r\n\r\n      // Добавление лесов поверх травы\r\n      if (info.type === terrainType.GRASS && noise.detailNoise(x/10, y/10) > 0.7) {\r\n        info.type = terrainType.FOREST;\r\n        info.color = '#2d5a27';\r\n      }\r\n\r\n      map[y][x] = info;\r\n    }\r\n  }\r\n  return map;\r\n}\r\n\r\n// Функции drawMap, handleResize и обработчики событий остаются без изменений\r\nfunction drawMap(map) {\r\n  const canvas = document.getElementById('map-canvas');\r\n  const ctx = canvas.getContext('2d');\r\n  const ratio = window.devicePixelRatio || 1;\r\n  const { width, height } = getMapDimensions();\r\n\r\n  canvas.width = width * cellSize * ratio;\r\n  canvas.height = height * cellSize * ratio;\r\n  canvas.style.width = `${width * cellSize}px`;\r\n  canvas.style.height = `${height * cellSize}px`;\r\n\r\n  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);\r\n  ctx.imageSmoothingEnabled = false;\r\n\r\n  for (let y = 0; y < height; y++) {\r\n    for (let x = 0; x < width; x++) {\r\n      ctx.fillStyle = map[y][x].color;\r\n      ctx.fillRect(x * cellSize, y * cellSize, cellSize + 1, cellSize + 1);\r\n    }\r\n  }\r\n}\r\n\r\nfunction handleResize() {\r\n  cellSize = calculateCellSize();\r\n  physmap = generateMap();\r\n  drawMap(physmap);\r\n}\r\n\r\nfunction handleZoomIn() {\r\n  if (scale < MAX_SCALE) {\r\n    scale += SCALE_STEP;\r\n    scale = Math.min(scale, MAX_SCALE);\r\n    handleResize();\r\n    updateScaleDisplay();\r\n  }\r\n}\r\n\r\nfunction handleZoomOut() {\r\n  if (scale > MIN_SCALE) {\r\n    scale -= SCALE_STEP;\r\n    scale = Math.max(scale, MIN_SCALE);\r\n    handleResize();\r\n    updateScaleDisplay();\r\n  }\r\n}\r\n\r\ndocument.addEventListener('DOMContentLoaded', () => {\r\n  handleResize();\r\n  \r\n  window.addEventListener('resize', () => {\r\n    clearTimeout(resizeTimeout);\r\n    resizeTimeout = setTimeout(handleResize, 500);\r\n  });\r\n\r\n  document.getElementById('generate-map').addEventListener('click', () => {\r\n    physmap = generateMap();\r\n    drawMap(physmap);\r\n  });\r\n\r\n  document.getElementById('download-map').addEventListener('click', () => {\r\n    // Создаем временный холст с увеличенным разрешением\r\n    const tempCanvas = document.createElement('canvas');\r\n    const tempCtx = tempCanvas.getContext('2d');\r\n    \r\n    // Получаем исходные размеры карты (без учета масштаба)\r\n    const { width, height } = getMapDimensions();\r\n    \r\n    // Рассчитываем размеры для скачивания с учетом масштаба\r\n    const downloadCellSize = 3; // Базовый размер клетки (как в исходной карте)\r\n    const scaledCellSize = downloadCellSize * scale;\r\n    \r\n    tempCanvas.width = width * scaledCellSize;\r\n    tempCanvas.height = height * scaledCellSize;\r\n    \r\n    // Отключаем сглаживание\r\n    tempCtx.imageSmoothingEnabled = false;\r\n    \r\n    // Перерисовываем карту на временном холсте с увеличенным размером клеток\r\n    for (let y = 0; y < height; y++) {\r\n      for (let x = 0; x < width; x++) {\r\n        const info = physmap[y][x];\r\n        tempCtx.fillStyle = info.color;\r\n        tempCtx.fillRect(\r\n          x * scaledCellSize,\r\n          y * scaledCellSize,\r\n          scaledCellSize + 1, \r\n          scaledCellSize + 1\r\n        );\r\n      }\r\n    }\r\n    \r\n    // Скачиваем\r\n    const link = document.createElement('a');\r\n    link.download = 'fantasy-map.png';\r\n    link.href = tempCanvas.toDataURL();\r\n    link.click();\r\n  });\r\n\r\n  document.getElementById('zoom-in').addEventListener('click', handleZoomIn);\r\n  document.getElementById('zoom-out').addEventListener('click', handleZoomOut);\r\n  \r\n  // Обработчик для колесика мыши\r\n  document.addEventListener('wheel', (e) => {\r\n    if (e.ctrlKey) {\r\n      e.preventDefault();\r\n      if (e.deltaY < 0) handleZoomIn();\r\n      else handleZoomOut();\r\n    }\r\n  }, { passive: false });\r\n\r\n  updateScaleDisplay();\r\n\r\n});\n\n//# sourceURL=webpack:///./test2.js?");

/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/************************************************************************/
/******/ 
/******/ // startup
/******/ // Load entry module and return exports
/******/ // This entry module can't be inlined because the eval devtool is used.
/******/ var __webpack_exports__ = __webpack_require__("./test2.js");
/******/ 
