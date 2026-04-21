#!/usr/bin/env node
import { execSync } from 'child_process';
import { rmSync, mkdirSync, cpSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const launcherDir = resolve(__dirname, '..');
const repoRoot = resolve(launcherDir, '..');
// pnpm deploy writes a virtual-store (symlink-heavy) structure here first.
const pnpmDeployDir = resolve(launcherDir, 'dist', 'server-pnpm');
// electron-packager reads from here — symlinks resolved to real files.
const serverFlatDir = resolve(launcherDir, 'dist', 'server');

function run(cmd, cwd, env) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
}

// pnpm deploy only creates top-level node_modules entries for the target
// package's DIRECT dependencies.  Transitive deps (e.g. postgres, which is a
// dep of @paperclipai/db) live only inside node_modules/.pnpm/<pkg>/node_modules/.
// Node.js cannot find them there, so we hoist everything from .pnpm to the
// flat top-level before removing the virtual store.
function hoistTransitiveDeps(nodeModulesDir) {
  const pnpmDir = resolve(nodeModulesDir, '.pnpm');
  if (!existsSync(pnpmDir)) return;
  let hoisted = 0;
  for (const entry of readdirSync(pnpmDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const entryMods = resolve(pnpmDir, entry.name, 'node_modules');
    if (!existsSync(entryMods)) continue;
    for (const pkg of readdirSync(entryMods, { withFileTypes: true })) {
      if (!pkg.isDirectory() || pkg.name === '.bin' || pkg.name === '.modules.yaml') continue;
      if (pkg.name.startsWith('@')) {
        // Scoped package: iterate one level deeper (@scope/name)
        const scopeDir = resolve(entryMods, pkg.name);
        if (!existsSync(scopeDir)) continue;
        for (const scoped of readdirSync(scopeDir, { withFileTypes: true })) {
          if (!scoped.isDirectory()) continue;
          const dest = resolve(nodeModulesDir, pkg.name, scoped.name);
          if (!existsSync(dest)) {
            mkdirSync(resolve(nodeModulesDir, pkg.name), { recursive: true });
            cpSync(resolve(scopeDir, scoped.name), dest, { recursive: true });
            hoisted++;
          }
        }
      } else {
        const dest = resolve(nodeModulesDir, pkg.name);
        if (!existsSync(dest)) {
          cpSync(resolve(entryMods, pkg.name), dest, { recursive: true });
          hoisted++;
        }
      }
    }
  }
  console.log(`  Hoisted ${hoisted} transitive dep(s) to top-level node_modules`);
}

// pnpm deploy does not apply publishConfig overrides for workspace deps.
// @paperclipai/* packages have exports pointing to ./src/index.ts (dev) but
// publishConfig.exports pointing to ./dist/index.js (production).
// Without this fix the server crashes immediately trying to import .ts files
// that don't exist in the deploy output (files: ["dist"] only).
function applyPublishConfig(nodeModulesDir) {
  const paperclipDir = resolve(nodeModulesDir, '@paperclipai');
  if (!existsSync(paperclipDir)) return;
  for (const pkgName of readdirSync(paperclipDir, { withFileTypes: true })) {
    if (!pkgName.isDirectory()) continue;
    const pkgJsonPath = resolve(paperclipDir, pkgName.name, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    if (!pkg.publishConfig) continue;
    Object.assign(pkg, pkg.publishConfig);
    delete pkg.publishConfig;
    writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  Applied publishConfig for @paperclipai/${pkgName.name}`);
  }
}

console.log('=== Building Paperclip standalone exe ===');

console.log('\n[1/3] Building all packages...');
run('pnpm run build', repoRoot);

console.log('\n[2/3] Creating production server bundle...');
rmSync(pnpmDeployDir, { recursive: true, force: true });
rmSync(serverFlatDir, { recursive: true, force: true });
mkdirSync(resolve(launcherDir, 'dist'), { recursive: true });

// pnpm deploy does not run lifecycle scripts (prepack), so server/ui-dist/
// would be missing.  Copy it manually from the UI build output.
const uiDistSrc = resolve(repoRoot, 'ui', 'dist');
const uiDistDest = resolve(repoRoot, 'server', 'ui-dist');
if (existsSync(uiDistSrc)) {
  console.log('  Copying UI dist -> server/ui-dist...');
  rmSync(uiDistDest, { recursive: true, force: true });
  cpSync(uiDistSrc, uiDistDest, { recursive: true });
} else {
  console.warn('  WARNING: ui/dist not found; server will not serve the frontend');
}

run(`pnpm deploy --filter @paperclipai/server --prod "${pnpmDeployDir}"`, repoRoot);

// Remove the server/ui-dist copy we created (keep source tree clean).
rmSync(uiDistDest, { recursive: true, force: true });

// pnpm creates node_modules with Windows symlinks; electron-packager can't
// recreate them in its temp dir without admin rights.  Copy everything with
// dereference so packager sees only plain files and directories.
console.log('  Flattening symlinks (dereference)...');
cpSync(pnpmDeployDir, serverFlatDir, { recursive: true, dereference: true });
// Remove the intermediate pnpm deploy directory.
rmSync(pnpmDeployDir, { recursive: true, force: true });

// Hoist transitive deps from .pnpm virtual store to top-level node_modules
// before removing the store.  Without this, packages like `postgres` (a dep
// of @paperclipai/db, not a direct dep of server) are invisible to Node.js.
console.log('  Hoisting transitive dependencies...');
hoistTransitiveDeps(resolve(serverFlatDir, 'node_modules'));

// .pnpm virtual store is now redundant — all deps are at the top level.
rmSync(resolve(serverFlatDir, 'node_modules', '.pnpm'), { recursive: true, force: true });

// Fix @paperclipai/* workspace package exports so they point to dist/.
console.log('  Fixing @paperclipai/* publishConfig...');
applyPublishConfig(resolve(serverFlatDir, 'node_modules'));

console.log('\n[3/3] Packaging Electron app...');
// Kill any running Paperclip process so electron-packager can overwrite the
// output folder (EBUSY if the exe is still running and holds a file lock).
// Stop-Process exits with code 1 when no matching process is found, so we
// must swallow the error rather than letting execSync throw.
try {
  execSync(
    'powershell -NoProfile -Command "Stop-Process -Name Paperclip -Force -ErrorAction SilentlyContinue"',
    { stdio: 'ignore' },
  );
} catch (_) { /* process was not running — harmless */ }
// electron-packager works on Windows without admin/developer-mode rights.
// electron-builder portable fails because winCodeSign-2.6.0.7z contains
// macOS dylib symlinks that 7-Zip cannot create on Windows without elevated
// privileges (same issue that caused the BYG-23 switch to packager).
run('npm run build', launcherDir);

// Zip the output folder so it can be shared as a single file.
// The user extracts once, then runs Paperclip.exe from the folder.
const appFolder = resolve(launcherDir, 'dist', 'Paperclip-win32-x64');
const zipOut = resolve(launcherDir, 'dist', 'Paperclip-portable.zip');
if (existsSync(appFolder)) {
  console.log('  Creating distributable zip...');
  rmSync(zipOut, { force: true });
  run(
    `powershell -NoProfile -Command "Compress-Archive -Path '${appFolder}' -DestinationPath '${zipOut}' -Force"`,
    launcherDir,
  );
}

console.log('\n=== Done! ===');
console.log(`  App folder : dist\\Paperclip-win32-x64\\Paperclip.exe`);
console.log(`  Portable zip: dist\\Paperclip-portable.zip  (share this)`);
