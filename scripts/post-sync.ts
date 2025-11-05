#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function run(cmd: string, args: string[], opts: { cwd?: string } = {}) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: opts.cwd ?? process.cwd(),
    encoding: 'utf-8',
  });
  return res.status ?? 1;
}

function sha256OfFile(path: string): string | null {
  if (!existsSync(path)) return null;
  const buf = readFileSync(path);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  return hash;
}

function main() {
  const repoRoot = resolve(__dirname, '..');
  const cacheDir = resolve(repoRoot, '.cache');
  const cacheFile = resolve(cacheDir, 'package-json-hashes.json');
  const rootPkg = resolve(repoRoot, 'package.json');
  const subPkgDir = resolve(repoRoot, 'packages', 'web-features');
  const subPkg = resolve(subPkgDir, 'package.json');

  // 1) Re-apply curated patches
  run('npm', ['run', '-s', 'apply-local-patches']);

  // 2) Conditional installs based on package.json hash changes
  mkdirSync(cacheDir, { recursive: true });
  let cache: Record<string, string> = {};
  if (existsSync(cacheFile)) {
    try {
      cache = JSON.parse(readFileSync(cacheFile, 'utf8')) as Record<string, string>;
    } catch {}
  }

  const updates: Array<{ cwd: string; label: string; path: string; hash: string | null }>
    = [
      { cwd: repoRoot, label: 'root', path: rootPkg, hash: sha256OfFile(rootPkg) },
      { cwd: subPkgDir, label: 'packages/web-features', path: subPkg, hash: sha256OfFile(subPkg) },
    ];

  for (const u of updates) {
    if (!u.hash) continue; // package.json missing
    const rel = u.path.replace(repoRoot + '/', '');
    const prev = cache[rel];
    if (prev !== u.hash) {
      console.log(`[post-sync] Detected change in ${rel}. Running npm install in ${u.label}...`);
      const status = run('npm', ['install', '--silent'], { cwd: u.cwd });
      if (status !== 0) {
        console.warn(`[post-sync] npm install failed in ${u.label}. You may need to run it manually.`);
      }
      cache[rel] = u.hash;
    }
  }

  writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

main();
