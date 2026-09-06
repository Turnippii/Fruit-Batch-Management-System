// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Cho bundler nhận đuôi .tflite là asset (require('assets/model/fruit_int8.tflite'))
// thay vì cố parse nó như code — cần cho react-native-fast-tflite (mốc 4).
config.resolver.assetExts.push('tflite');

module.exports = config;
