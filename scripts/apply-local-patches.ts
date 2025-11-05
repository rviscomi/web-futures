#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
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
  const patchFile = resolve(repoRoot, 'local-patches', 'web-futures-local.patch');

  if (!existsSync(patchFile)) {
    console.log(`No local patch found at ${patchFile}. Skipping.`);
    return;
  }
  const content = readFileSync(patchFile, 'utf8');
  if (!content.trim()) {
    console.log(`Patch file is empty at ${patchFile}. Skipping.`);
    return;
  }

  // If reverse patch applies, patch already applied
  let res = run('git', ['apply', '-R', '--check', patchFile], { quiet: true });
  if (res.status === 0) {
    console.log('Local patch already applied. Nothing to do.');
    return;
  }

  // Try a 3-way apply first
  res = run('git', ['apply', '-3', '--check', patchFile], { quiet: true });
  if (res.status === 0) {
    console.log('Applying local patch (3-way)...');
    const apply = run('git', ['apply', '-3', patchFile]);
    if (apply.status !== 0) process.exit(apply.status ?? 1);
    console.log('Patch applied successfully.');
    return;
  }

  console.log("Patch doesn't apply cleanly. Trying with --reject to write .rej files...");
  res = run('git', ['apply', '-3', '--reject', patchFile]);
  if (res.status !== 0) {
    console.error('Patch failed. Please resolve any .rej files and re-run: npm run apply-local-patches');
    process.exit(res.status ?? 1);
  } else {
    console.log('Patch applied with rejections. Check any *.rej files and resolve manually.');
  }
}

main();
