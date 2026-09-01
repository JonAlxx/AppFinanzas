// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// EXCLUSIÓN PARA WINDOWS:
// Evita que Metro intente "vigilar" las carpetas nativas de compilación (android/ios).
// Esto soluciona el error ENOENT al compilar con la Nueva Arquitectura habilitada.
config.resolver.blockList = [
  /\/android\/.*/,
  /\/ios\/.*/,
];

module.exports = config;
