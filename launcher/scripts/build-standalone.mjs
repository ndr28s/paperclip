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
run(`pnpm deploy --filter @paperclipai/server --prod "${pnpmDeployDir}"`, repoRoot);

// pnpm creates node_modules with Windows symlinks; electron-packager can't
// recreate them in its temp dir without admin rights.  Copy everything with
// dereference so packager sees only plain files and directories.
console.log('  Flattening symlinks (dereference)...');
cpSync(pnpmDeployDir, serverFlatDir, { recursive: true, dereference: true });
// .pnpm virtual store is now redundant — top-level entries are real dirs.
rmSync(resolve(serverFlatDir, 'node_modules', '.pnpm'), { recursive: true, force: true });
// Remove the intermediate pnpm deploy directory.
rmSync(pnpmDeployDir, { recursive: true, force: true });

// Fix @paperclipai/* workspace package exports so they point to dist/.
console.log('  Fixing @paperclipai/* publishConfig...');
applyPublishConfig(resolve(serverFlatDir, 'node_modules'));

console.log('\n[3/3] Packaging Electron app...');
// Kill any running Paperclip process so electron-packager can overwrite the
// output folder (EBUSY if the exe is still running and holds a file lock).
execSync(
  'powershell -NoProfile -Command "Stop-Process -Name Paperclip -Force -ErrorAction SilentlyContinue"',
  { stdio: 'ignore' },
);
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
