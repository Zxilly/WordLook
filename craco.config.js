const CracoEsbuildPlugin = require('craco-esbuild');
const {BundleAnalyzerPlugin} = require("webpack-bundle-analyzer");

const isProductionBuild = process.env.NODE_ENV === "production";
const analyzerMode = process.env.CI ? "json" : "server";

const plugins = [];

if (isProductionBuild) {
    plugins.push(new BundleAnalyzerPlugin({analyzerMode}));
}

module.exports = {
    plugins: [
        {
            plugin: CracoEsbuildPlugin
        },
    ],
    webpack: {
        plugins,
    },
};
