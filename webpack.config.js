const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './backend/src/main.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'backend', 'dist')
  },
  target: 'electron-main',
  mode: 'production',
  node: {
    __dirname: false
  },
  externals: [ nodeExternals() ]
};
