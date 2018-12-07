const path = require('path');

module.exports = {
  entry: {
    main: './d3Wrapper.js'
  },
  output: {
    path: path.resolve(__dirname, './'),
    library:"D3Wrapper",
    libraryTarget: 'umd',
    filename: 'index_bundle.js'
  },
  devtool: '#eval-source-map',
  module: {
    rules: [{
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: []
};