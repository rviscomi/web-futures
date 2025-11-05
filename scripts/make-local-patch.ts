#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function run(cmd: string, args: string[], opts: { cwd?: string; quiet?: boolean } = {}) {
  const res = spawnSync(cmd, args, {
    stdio: opts.quiet ? 'pipe' : 'inherit',
    encoding: 'utf-8',
    cwd: opts.cwd ?? process.cwd(),
  });
  return res;
}

function main() {
  const repoRoot = resolve(__dirname, '..');
  const patchDir = resolve(repoRoot, 'local-patches');
  const patchFile = resolve(patchDir, 'web-futures-local.patch');

  mkdirSync(patchDir, { recursive: true });

  // Ensure upstream/main exists and is up-to-date
  const hasUpstream = run('git', ['rev-parse', '--verify', 'upstream/main'], { quiet: true });
  if (hasUpstream.status === 0) {
    run('git', ['fetch', 'upstream', '--prune']);
  } else {
    console.warn("Warning: upstream/main not found. Ensure 'upstream' remote exists and has a 'main' branch.");
  }

  // Curated file list we want to preserve
  const files = [
    'index.ts',
    'packages/web-features/package.json',
  ];

  console.log(`Creating patch at ${patchFile} for: ${files.join(', ')}`);

  const diff = run('git', ['diff', 'upstream/main', '--', ...files], { quiet: true });
  const output = diff.stdout ?? '';
  writeFileSync(patchFile, output, 'utf8');

  if (!output.trim()) {
    console.log('Patch is empty (no diffs versus upstream/main for the selected files).');
  } else {
    console.log(`Patch written to ${patchFile}`);
  }
}

main();
