const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const devCerts = require("office-addin-dev-certs");

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  const config = {
    entry: {
      taskpane: "./src/taskpane/taskpane.js",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].[contenthash:8].js",
      clean: true,
    },
    resolve: {
      extensions: [".js"],
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        __API_BASE_URL__: JSON.stringify(
          dev ? "/api/freepik" : process.env.CF_WORKER_URL || "/api/freepik"
        ),
      }),
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["taskpane"],
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: "src/assets", to: "assets" },
          { from: "manifest.xml", to: "manifest.xml" },
          ...(dev ? [] : [{ from: "manifest-production.xml", to: "manifest-production.xml", noErrorOnMissing: true }]),
        ],
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, "dist"),
      },
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
      port: 3000,
      hot: true,
      proxy: [
        {
          context: ["/api/freepik"],
          target: "https://api.freepik.com",
          changeOrigin: true,
          secure: true,
          pathRewrite: (path) => path.replace(/^\/api\/freepik/, "/v1"),
        },
      ],
    },
  };

  if (dev) {
    config.devtool = "source-map";
    try {
      const httpsOptions = await devCerts.getHttpsServerOptions();
      config.devServer.server = {
        type: "https",
        options: httpsOptions,
      };
    } catch (e) {
      console.warn("Could not get dev certs. Run 'npm run dev-certs' first.");
      console.warn("Falling back to HTTP (add-in may not load in Office).");
    }
  }

  return config;
};
