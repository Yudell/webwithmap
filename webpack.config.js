const path = require('path');

module.exports = {
  entry: './test2.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    module: true,
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
  mode: 'development',
  resolve: {
    alias: {
      'open-simplex-noise': path.resolve(__dirname, 'node_modules/open-simplex-noise/lib/2d.js'),
    },
  },
};