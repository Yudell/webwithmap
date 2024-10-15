import { makeNoise2D } from 'open-simplex-noise';

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

const defaultOctaves = 50;
const defaultFrequency = 0.2;
const defaultPersistence = 0.65;

export {
  createNoise,
  newFractalNoise,
  defaultOctaves,
  defaultFrequency,
  defaultPersistence,
  generateRandomSeed
};