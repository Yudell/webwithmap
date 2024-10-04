const { makeNoise2D } = require('open-simplex-noise');

// чёткость
const defaultOctaves = 100;
// раздробленность островов
const defaultFrequency = 0.2;
// мягкость рельефа
//const defaultPersistence = 0.65;

//const defaultFrequency = Math.random() * (0.75 - 0.2) + 0.2;
const defaultPersistence = Math.random() * (0.65 - 0.6) + 0.6;

// Функция для генерации случайного сида
function generateRandomSeed() {
  return Math.floor(Math.random() * Math.pow(2, 32));
}

function createNoise(seed) {
  return makeNoise2D(seed);
}

function newFractalNoise(info) {
  const {
    noise,
    octaves = defaultOctaves,
    amplitude = 1,
    frequency = defaultFrequency,
    persistence = defaultPersistence
  } = info;

  return function getFractalNoise(x, y) {
    let value = 0.0;

    for (let octave = 0; octave < octaves; octave++) {
      let freq = frequency * Math.pow(2, octave);

      value += noise(
        x * freq,
        y * freq
      ) * (amplitude * Math.pow(persistence, octave));
    }

    return value / (2 - 1 / Math.pow(2, octaves - 1));
  };
}

module.exports = {
  createNoise,
  newFractalNoise,
  defaultOctaves,
  defaultFrequency,
  defaultPersistence,
  generateRandomSeed
};