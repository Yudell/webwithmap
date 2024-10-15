const path = require('path');

module.exports = {
    entry: './test2.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: 'development',
    experiments: {
        outputModule: true,
    },
};