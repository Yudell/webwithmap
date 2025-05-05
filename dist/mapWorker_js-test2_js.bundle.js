/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./mapWorker.js":
/*!**********************!*\
  !*** ./mapWorker.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _mapgen_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mapgen.js */ "./mapgen.js");
/* harmony import */ var _test2_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./test2.js */ "./test2.js");


self.onmessage = function (event) {
  var _event$data = event.data,
    mapWidth = _event$data.mapWidth,
    mapHeight = _event$data.mapHeight,
    terrainSeed = _event$data.terrainSeed,
    variantSeed = _event$data.variantSeed,
    biomeSeed = _event$data.biomeSeed;
  var terrainNoise = (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.createNoise)(terrainSeed);
  var variantNoise = (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.createNoise)(variantSeed);
  var biomeNoise = (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.createNoise)(biomeSeed);
  var getTerrainNoise = (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.newFractalNoise)({
    noise: terrainNoise,
    octaves: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultOctaves,
    frequency: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultFrequency,
    persistence: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultPersistence
  });
  var getVariantNoise = (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.newFractalNoise)({
    noise: variantNoise,
    octaves: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultOctaves,
    frequency: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultFrequency,
    persistence: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultPersistence
  });
  var getBiomeNoise = (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.newFractalNoise)({
    noise: biomeNoise,
    octaves: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultOctaves,
    frequency: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultFrequency,
    persistence: _mapgen_js__WEBPACK_IMPORTED_MODULE_0__.defaultPersistence
  });
  var map = (0,_test2_js__WEBPACK_IMPORTED_MODULE_1__.generateMap)(mapWidth, mapHeight, getTerrainNoise, getVariantNoise, getBiomeNoise);
  (0,_test2_js__WEBPACK_IMPORTED_MODULE_1__.generateRivers)(map, map.map(function (row) {
    return row.map(function (cell) {
      return cell.type === _test2_js__WEBPACK_IMPORTED_MODULE_1__.terrainType.MOUNTAIN ? 1 : 0;
    });
  }), 250);
  self.postMessage(map);
};

/***/ }),

/***/ "./mapgen.js":
/*!*******************!*\
  !*** ./mapgen.js ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createNoise: () => (/* binding */ createNoise),
/* harmony export */   defaultFrequency: () => (/* binding */ defaultFrequency),
/* harmony export */   defaultOctaves: () => (/* binding */ defaultOctaves),
/* harmony export */   defaultPersistence: () => (/* binding */ defaultPersistence),
/* harmony export */   generateRandomSeed: () => (/* binding */ generateRandomSeed),
/* harmony export */   newFractalNoise: () => (/* binding */ newFractalNoise)
/* harmony export */ });
/* harmony import */ var open_simplex_noise__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! open-simplex-noise */ "./node_modules/open-simplex-noise/lib/mod.js");

function generateRandomSeed() {
  return Math.floor(Math.random() * Math.pow(2, 32));
}
function createNoise(seed) {
  return (0,open_simplex_noise__WEBPACK_IMPORTED_MODULE_0__.makeNoise2D)(seed);
}
function newFractalNoise(info) {
  var noise = info.noise,
    _info$octaves = info.octaves,
    octaves = _info$octaves === void 0 ? defaultOctaves : _info$octaves,
    _info$amplitude = info.amplitude,
    amplitude = _info$amplitude === void 0 ? 1 : _info$amplitude,
    _info$frequency = info.frequency,
    frequency = _info$frequency === void 0 ? defaultFrequency : _info$frequency,
    _info$persistence = info.persistence,
    persistence = _info$persistence === void 0 ? defaultPersistence : _info$persistence;
  return function getFractalNoise(x, y) {
    var value = 0.0;
    for (var octave = 0; octave < octaves; octave++) {
      var freq = frequency * Math.pow(2, octave);
      value += noise(x * freq, y * freq) * (amplitude * Math.pow(persistence, octave));
    }
    return value / (2 - 1 / Math.pow(2, octaves - 1));
  };
}
var defaultOctaves = 10;
var defaultFrequency = 0.2;
var defaultPersistence = 0.65;


/***/ }),

/***/ "./test2.js":
/*!******************!*\
  !*** ./test2.js ***!
  \******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   drawMap: () => (/* binding */ drawMap),
/* harmony export */   generateMap: () => (/* binding */ generateMap),
/* harmony export */   generateRivers: () => (/* binding */ generateRivers),
/* harmony export */   terrainType: () => (/* binding */ terrainType)
/* harmony export */ });
/* harmony import */ var _mapgen_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mapgen.js */ "./mapgen.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }

var terrainType = {
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
  RIVER: 'RIVER'
};
function generateMap(width, height, terrainNoise, variantNoise, biomeNoise) {
  var map = [];
  var heightMap = [];
  for (var y = 0; y < height; y++) {
    map[y] = [];
    heightMap[y] = [];
    for (var x = 0; x < width; x++) {
      var terrainValue = terrainNoise(x / 100, y / 100);
      var variantValue = variantNoise(x / 100, y / 100);
      var biomeValue = biomeNoise(x / 100, y / 100);
      var info = {};
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
function generateRivers(map, heightMap, averageRiverLength) {
  var width = map[0].length;
  var height = map.length;
  var riverSources = [];
  var directions = [{
    dx: 0,
    dy: 1
  },
  // вниз
  {
    dx: 0,
    dy: -1
  },
  // вверх
  {
    dx: -1,
    dy: 0
  },
  // влево
  {
    dx: 1,
    dy: 0
  },
  // вправо
  {
    dx: 1,
    dy: 1
  },
  // вправо-вниз
  {
    dx: -1,
    dy: -1
  },
  // влево-вверх
  {
    dx: -1,
    dy: 1
  },
  // влево-вниз
  {
    dx: 1,
    dy: -1
  } // вправо-вверх
  ];
  var oppositeDirections = {
    '0,1': '0,-1',
    '0,-1': '0,1',
    '-1,0': '1,0',
    '1,0': '-1,0',
    '1,1': '-1,-1',
    '-1,-1': '1,1',
    '-1,1': '1,-1',
    '1,-1': '-1,1'
  };
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      if ((map[y][x].type === terrainType.MOUNTAIN || map[y][x].type === terrainType.MOUNTAIN_ORE || map[y][x].type === terrainType.WET_GRASS || map[y][x].type === terrainType.DRY_GRASS || map[y][x].type === terrainType.GRASS) && Math.random() < 0.000085) {
        riverSources.push({
          x: x,
          y: y
        });
      }
    }
  }
  var riverTerminationProbability = 0.01 / averageRiverLength;
  riverSources.forEach(function (source) {
    var current = source;
    var riverDirection = directions[Math.floor(Math.random() * directions.length)];
    var visited = new Set();
    visited.add("".concat(current.x, ",").concat(current.y));
    var riverLength = 0;
    var previousDirection = null;
    while (current) {
      map[current.y][current.x].type = terrainType.RIVER;
      map[current.y][current.x].color = '#0952c6';
      map[current.y][current.x].width = Math.min(3, Math.floor(riverLength / 120) + 1);
      riverLength++;
      var next = null;
      var minHeight = heightMap[current.y][current.x];
      var possibleDirections = [riverDirection, {
        dx: riverDirection.dx + 1,
        dy: riverDirection.dy
      }, {
        dx: riverDirection.dx - 1,
        dy: riverDirection.dy
      }, {
        dx: riverDirection.dx,
        dy: riverDirection.dy + 1
      }, {
        dx: riverDirection.dx,
        dy: riverDirection.dy - 1
      }].filter(function (dir) {
        return dir.dx >= -1 && dir.dx <= 1 && dir.dy >= -1 && dir.dy <= 1 && "".concat(dir.dx, ",").concat(dir.dy) !== oppositeDirections["".concat(riverDirection.dx, ",").concat(riverDirection.dy)] && "".concat(dir.dx, ",").concat(dir.dy) !== previousDirection;
      });
      possibleDirections.sort(function () {
        return Math.random() - 0.65;
      });
      var _iterator = _createForOfIteratorHelper(possibleDirections),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var dir = _step.value;
          var ny = current.y + dir.dy;
          var nx = current.x + dir.dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width && !visited.has("".concat(nx, ",").concat(ny))) {
            if (heightMap[ny][nx] < minHeight) {
              minHeight = heightMap[ny][nx];
              next = {
                x: nx,
                y: ny
              };
              previousDirection = "".concat(riverDirection.dx, ",").concat(riverDirection.dy);
              riverDirection = dir;
            } else if (heightMap[ny][nx] === minHeight && Math.random() < 0.005) {
              next = {
                x: nx,
                y: ny
              };
              previousDirection = "".concat(riverDirection.dx, ",").concat(riverDirection.dy);
              riverDirection = dir;
            } else {
              next = {
                x: nx,
                y: ny
              };
            }
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
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
        visited.add("".concat(next.x, ",").concat(next.y));
      }
      current = next;
    }
  });
}
function drawMap(map, cellSize) {
  console.log('Drawing map...');
  var canvas = document.getElementById('map-canvas');
  canvas.width = map[0].length * cellSize;
  canvas.height = map.length * cellSize;
  var ctx = canvas.getContext('2d');

  // Очищаем холст перед отрисовкой новой карты
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Дополнительная очистка с небольшим смещением
  ctx.clearRect(-1, -1, canvas.width + 2, canvas.height + 2);
  for (var y = 0; y < map.length; y++) {
    for (var x = 0; x < map[y].length; x++) {
      var info = map[y][x];
      ctx.fillStyle = info.color;
      if (info.type === terrainType.RIVER) {
        var width = info.width;
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
var cellSize = 3;
var mapGenerated = false;
function drawStatusMessage(message) {
  var statusMessage = document.getElementById('status-message');
  statusMessage.textContent = message;
  statusMessage.style.display = 'block';
}
function hideStatusMessage() {
  var statusMessage = document.getElementById('status-message');
  statusMessage.style.display = 'none';
}
function generateAndDrawMap() {
  return _generateAndDrawMap.apply(this, arguments);
}
function _generateAndDrawMap() {
  _generateAndDrawMap = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var mapWidthInput, mapHeightInput, mapWidth, mapHeight, terrainSeed, variantSeed, biomeSeed, worker;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          mapWidthInput = document.getElementById('map-width');
          mapHeightInput = document.getElementById('map-height');
          mapWidth = parseInt(mapWidthInput.value, 10);
          mapHeight = parseInt(mapHeightInput.value, 10);
          if (mapGenerated) {
            location.reload();
          } else {
            console.log('Generating and drawing new map...');
            drawStatusMessage('Generating map...');
            terrainSeed = (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.generateRandomSeed)();
            variantSeed = (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.generateRandomSeed)();
            biomeSeed = (0,_mapgen_js__WEBPACK_IMPORTED_MODULE_0__.generateRandomSeed)();
            worker = new Worker(new URL(/* worker import */ __webpack_require__.p + __webpack_require__.u("mapWorker_js-test2_js"), __webpack_require__.b));
            worker.postMessage({
              mapWidth: mapWidth,
              mapHeight: mapHeight,
              terrainSeed: terrainSeed,
              variantSeed: variantSeed,
              biomeSeed: biomeSeed
            });
            worker.onmessage = function (event) {
              var map = event.data;
              drawMap(map, cellSize);
              hideStatusMessage();
              mapGenerated = true;
            };
          }
        case 5:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _generateAndDrawMap.apply(this, arguments);
}
document.getElementById('generate-map').addEventListener('click', generateAndDrawMap);

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	__webpack_require__.x = () => {
/******/ 		// Load entry module and return exports
/******/ 		// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 		var __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-node_modules_open-simplex-noise_lib_mod_js"], () => (__webpack_require__("./mapWorker.js")))
/******/ 		__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 		return __webpack_exports__;
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".bundle.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = self.location + "";
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = {
/******/ 			"mapWorker_js-test2_js": 1
/******/ 		};
/******/ 		
/******/ 		// importScripts chunk loading
/******/ 		var installChunk = (data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			while(chunkIds.length)
/******/ 				installedChunks[chunkIds.pop()] = 1;
/******/ 			parentChunkLoadingFunction(data);
/******/ 		};
/******/ 		__webpack_require__.f.i = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					importScripts(__webpack_require__.p + __webpack_require__.u(chunkId));
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk"] = self["webpackChunk"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = installChunk;
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/startup chunk dependencies */
/******/ 	(() => {
/******/ 		var next = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			return __webpack_require__.e("vendors-node_modules_open-simplex-noise_lib_mod_js").then(next);
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// run startup
/******/ 	var __webpack_exports__ = __webpack_require__.x();
/******/ 	
/******/ })()
;
//# sourceMappingURL=mapWorker_js-test2_js.bundle.js.map