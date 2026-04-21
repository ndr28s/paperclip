#!/usr/bin/env node
import { execSync } from 'child_process';
import { rmSync, mkdirSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const launcherDir = resolve(__dirname, '..');
const repoRoot = resolve(launcherDir, '..');
// pnpm deploy writes a virtual-store (symlink-heavy) structure here first.
const pnpmDeployDir = resolve(launcherDir, 'dist', 'server-pnpm');
// electron-builder reads from here — symlinks resolved to real files.
const serverFlatDir = resolve(launcherDir, 'dist', 'server');

function run(cmd, cwd, env) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
}

console.log('=== Building Paperclip standalone exe ===');

console.log('\n[1/3] Building all packages...');
run('pnpm run build', repoRoot);

console.log('\n[2/3] Creating production server bundle...');
rmSync(pnpmDeployDir, { recursive: true, force: true });
rmSync(serverFlatDir, { recursive: true, force: true });
mkdirSync(resolve(launcherDir, 'dist'), { recursive: true });
run(`pnpm deploy --filter @paperclipai/server --prod "${pnpmDeployDir}"`, repoRoot);

// pnpm creates node_modules with Windows symlinks; electron-builder can't
// recreate them in its temp dir without admin rights.  Copy everything with
// dereference so packager sees only plain files and directories.
console.log('  Flattening symlinks (dereference)...');
cpSync(pnpmDeployDir, serverFlatDir, { recursive: true, dereference: true });
// .pnpm virtual store is now redundant — top-level entries are real dirs.
rmSync(resolve(serverFlatDir, 'node_modules', '.pnpm'), { recursive: true, force: true });
// Remove the intermediate pnpm deploy directory.
rmSync(pnpmDeployDir, { recursive: true, force: true });

console.log('\n[3/3] Packaging Electron app (portable exe)...');
// CSC_IDENTITY_AUTO_DISCOVERY=false prevents electron-builder from trying
// to download Windows code-signing tools (winCodeSign), which fails offline.
run('npx electron-builder --win portable', launcherDir, {
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
});

console.log('\n=== Done! Output: launcher/dist/Paperclip-portable.exe ===');
