const Path = require('path');
const vuePlugin = require('@vitejs/plugin-vue')

const { defineConfig } = require('vite');
const { resolve } = require("path");

/**
 * https://vitejs.dev/config
 */
const config = defineConfig({
    root: Path.join(__dirname, 'src', 'renderer'),
    publicDir: 'public',
    server: {
        port: 8080,
    },
    open: false,
    build: {
        outDir: Path.join(__dirname, 'build', 'renderer'),
        emptyOutDir: true,
    },
    plugins: [vuePlugin()],
    pluginOptions: {
        electronBuilder: {
            preload: 'src/main/preload.js',
        }
    },
    resolve: {
        alias: {
            path: 'path-browserify',
            '@renderer': resolve('src/renderer/src')
        }
    },
});

module.exports = config;
