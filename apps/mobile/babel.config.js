// Mobile babel config.
// NOTE: @tamagui/babel-plugin is intentionally disabled here — it's an
// optional compile-time optimizer and currently conflicts with Metro's
// transformer pipeline in this project setup. Tamagui works fine at runtime
// without it; revisit later for production tree-shaking gains.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
