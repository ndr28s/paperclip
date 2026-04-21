#!/usr/bin/env node
import { execSync } from 'child_process';
import { rmSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const launcherDir = resolve(__dirname, '..');
const repoRoot = resolve(launcherDir, '..');
const serverDeployDir = resolve(launcherDir, 'dist', 'server');

function run(cmd, cwd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

console.log('=== Building Paperclip standalone exe ===');

console.log('\n[1/3] Building all packages...');
run('pnpm run build', repoRoot);

console.log('\n[2/3] Creating production server bundle...');
rmSync(serverDeployDir, { recursive: true, force: true });
mkdirSync(resolve(launcherDir, 'dist'), { recursive: true });
run(`pnpm deploy --filter @paperclipai/server --prod ${serverDeployDir}`, repoRoot);

console.log('\n[3/3] Packaging Electron app...');
run('npm run build', launcherDir);

console.log('\n=== Done! Output: launcher/dist/Paperclip-win32-x64/Paperclip.exe ===');
