const path = require('path');
const HTMLWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    main: './src/mandelbrot/entry.ts',
    workerBridge: './src/web-workers/bridge.ts'
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'public'),
    compress: true,
    port: 3000
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'public')
  },
  plugins: [
    new HTMLWebpackPlugin({
      chunks: ['main']
    })
  ],
  stats: {
    warnings: false
  }
};
