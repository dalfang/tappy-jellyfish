module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin", // Add Reanimated plugin for React Native Reanimated v2
    ],
  };
};
