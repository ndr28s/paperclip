// Metro config tuned for pnpm monorepo + Tamagui.
// - Watches workspace root so packages/* hot-reload.
// - Forces `react` to resolve to mobile-local copy so we don't get "two copies
//   of React" errors when web/desktop pin React 19 at the workspace root
//   (mobile uses React 18.3.1 to match RN 0.76).
// - react-native is NOT forced — with node-linker=hoisted there is only one
//   copy at workspace root; packages like expo-status-bar must resolve it from
//   there, not from apps/mobile/node_modules.
// - pnpm hoisting may store packages as @scope/name_tmp_XXXXX; we dynamically
//   build aliases so Metro can resolve them without cache.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

// ── pnpm _tmp_ alias resolver ─────────────────────────────
// When pnpm hoists packages with conflicting peer deps it renames them
// e.g. @react-navigation/native → @react-navigation/native_tmp_24980.
// Metro can't find the original name, so we build a map of aliases.
function buildPnpmAliases(rootNodeModules) {
  const aliases = {};
  try {
    for (const entry of fs.readdirSync(rootNodeModules)) {
      if (!entry.startsWith("@")) continue;
      const scopePath = path.join(rootNodeModules, entry);
      try {
        const byBase = {};
        for (const pkg of fs.readdirSync(scopePath)) {
          const idx = pkg.indexOf("_tmp_");
          if (idx === -1) continue;
          const base = pkg.slice(0, idx);
          if (!byBase[base]) byBase[base] = [];
          byBase[base].push(pkg);
        }
        for (const [base, variants] of Object.entries(byBase)) {
          const realPath = path.join(scopePath, base);
          if (!fs.existsSync(realPath)) {
            // Pick the variant with the largest suffix number (most recent)
            variants.sort((a, b) => {
              const na = parseInt(a.split("_tmp_")[1]) || 0;
              const nb = parseInt(b.split("_tmp_")[1]) || 0;
              return nb - na;
            });
            aliases[`${entry}/${base}`] = path.join(scopePath, variants[0]);
          }
        }
      } catch {}
    }
  } catch {}
  return aliases;
}

const PNPM_ALIASES = buildPnpmAliases(path.resolve(workspaceRoot, "node_modules"));

// ── Hard-wired @react-navigation _tmp_ overrides ─────────────
// pnpm creates stub dirs (@react-navigation/bottom-tabs with only LICENSE/README)
// while the real code lives in _tmp_ variants. The stub package.json says
// react-native: "src/index.tsx" which doesn't exist in the _tmp_ copy.
// We force these to lib/commonjs/index.js before Metro reads package.json.
const rootNM = path.resolve(workspaceRoot, "node_modules");
const REACT_NAV_MAP = {
  "@react-navigation/bottom-tabs":  path.join(rootNM, "@react-navigation/bottom-tabs_tmp_27448",  "lib/commonjs/index.js"),
  "@react-navigation/native":       path.join(rootNM, "@react-navigation/native_tmp_7888",        "lib/commonjs/index.js"),
  "@react-navigation/native-stack": path.join(rootNM, "@react-navigation/native-stack_tmp_7888",  "lib/commonjs/index.js"),
  "@react-navigation/elements":     path.join(rootNM, "@react-navigation/elements_tmp_25932",     "lib/commonjs/index.js"),
};

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
  // 1. FORCED aliases (react → local copy)
  for (const [name, target] of Object.entries(FORCED)) {
    if (moduleName === name || moduleName.startsWith(name + "/")) {
      const subpath = moduleName.slice(name.length); // "" or "/jsx-runtime"
      return context.resolveRequest(context, target + subpath, platform);
    }
  }

  // 1b. @react-navigation stub overrides — point directly to lib/commonjs
  //     so Metro never tries to resolve the broken "src/index.tsx" field.
  for (const [alias, libEntry] of Object.entries(REACT_NAV_MAP)) {
    if (moduleName === alias) {
      return { type: "sourceFile", filePath: libEntry };
    }
    if (moduleName.startsWith(alias + "/")) {
      // Subpath import like @react-navigation/native/utils
      const subpath = moduleName.slice(alias.length); // "/utils"
      const dir = path.dirname(libEntry); // lib/commonjs/
      const candidate = path.join(dir, subpath);
      return { type: "sourceFile", filePath: candidate };
    }
  }

  // 2. pnpm _tmp_ aliases — redirect to lib/commonjs (built output) since
  //    the _tmp_ variants don't contain full src/ trees.
  for (const [alias, target] of Object.entries(PNPM_ALIASES)) {
    if (moduleName === alias || moduleName.startsWith(alias + "/")) {
      const subpath = moduleName.slice(alias.length); // "" or "/utils" etc.
      // Try lib/commonjs first (avoids src/index.tsx resolution issue)
      const libEntry = path.join(target, "lib", "commonjs") + (subpath || "/index.js");
      const libIndex = path.join(target, "lib", "commonjs", "index.js");
      const tryLib = fs.existsSync(libEntry) ? libEntry
                   : fs.existsSync(libIndex)  ? libIndex
                   : null;
      if (tryLib) {
        return { type: "sourceFile", filePath: tryLib };
      }
      // Fallback: let Metro resolve from target dir normally
      try {
        return context.resolveRequest(context, target + subpath, platform);
      } catch {}
    }
  }

  // 3. Default
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// 4. Allow .mjs/.cjs source extensions
config.resolver.sourceExts.push("mjs", "cjs");

module.exports = config;
