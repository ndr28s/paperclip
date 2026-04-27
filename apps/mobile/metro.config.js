// Metro config tuned for pnpm monorepo + Tamagui.
// - Watches workspace root so packages/* hot-reload.
// - Forces `react` to resolve to mobile-local copy so we don't get "two copies
//   of React" errors when web/desktop pin React 19 at the workspace root
//   (mobile uses React 18.3.1 to match RN 0.76).
// - react-native is NOT forced — with node-linker=hoisted there is only one
//   copy at workspace root; packages like expo-status-bar must resolve it from
//   there, not from apps/mobile/node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from project first, then workspace
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// 3. Hard-alias React to this app's node_modules. Without this, hoisted deps
// can pull web/desktop's React 19 into the bundle, breaking hooks with
// "Cannot read property 'useId' of null".
// NOTE: react-native is NOT forced here — with node-linker=hoisted there is
// only one copy at the workspace root, and forcing it to mobile's local copy
// causes packages like expo-status-bar (also at root) to fail resolution.
const FORCED = {
  react: path.resolve(projectRoot, "node_modules/react"),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Match exact "react" / "react-native" and their subpaths (e.g. react/jsx-runtime).
  for (const [name, target] of Object.entries(FORCED)) {
    if (moduleName === name || moduleName.startsWith(name + "/")) {
      const subpath = moduleName.slice(name.length); // "" or "/jsx-runtime"
      return context.resolveRequest(
        context,
        target + subpath,
        platform,
      );
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// 4. Allow .mjs/.cjs source extensions
config.resolver.sourceExts.push("mjs", "cjs");

module.exports = config;
