const path = require('path');
const dotenv = require('dotenv');
const webpack = require('webpack');
// const nodeExternals = require('webpack-node-externals');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin').CleanWebpackPlugin;
const WriteFilePlugin = require('write-file-webpack-plugin');

// call dotenv and it will return an Object with a parsed key 
const env = dotenv.config().parsed;

// reduce it to a nice object, the same as before
const envKeys = Object.keys(env).reduce((envKeys, next) => {
  envKeys[`process.env.${next}`] = JSON.stringify(env[next]);
  return envKeys;
}, {});

module.exports = {
  mode: 'development',
  entry: { main: './src/index.js' },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js'
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    inline: true,
    writeToDisk: true
  },
  // optimization: {
  //   minimize: true
  // },
  // target: 'node',
  // // externals: [nodeExternals()], 
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            // presets: ['@babel/preset-env'], 
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-private-methods'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        // use: { loader: 'file-loader' },
        use: [
          // {
          //   loader: 'url-loader',
          //   options: {
          //     limit: 8192,
          //   },
          // },
          'file-loader?name=/images/[name].[ext]'
        ],        
      },
      // {
      //   test: /\.(html)$/,
      //   use: ['html-loader']
      // }
    ]
  },
  resolve: {
    // modules: ['node_modules', 'src'],
    alias: {
      'xtermjs-css': path.join(__dirname, '../node_modules/xterm/css/xterm.css')
    }
  },
  plugins: [
    new CleanWebpackPlugin(),
    new WriteFilePlugin(),
    // new MiniCssExtractPlugin({
    //   filename: "style.css"
    // }),
    new HtmlWebpackPlugin({
      inject: false,
      hash: true,
      template: './src/start.html',
      filename: 'index.html'
    }),

    new webpack.DefinePlugin(envKeys)
  ]
};