const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    main: './demo.js'
  },
  output: {
    path: path.resolve(__dirname, './'),
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
  plugins: [ new HtmlWebpackPlugin({  // Also generate a test.html
    filename: 'index.html',
    template: 'index.tmp.html'
  })]
};