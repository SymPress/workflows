import assert from 'node:assert/strict';
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseDocument } from 'yaml';

const workflow = parseDocument(readFileSync('.github/workflows/deploy-deployer.yml', 'utf8')).toJS();
const step = (job, name) => workflow.jobs[job].steps.find(value => value.name === name).run;
const root = mkdtempSync(path.join(tmpdir(), 'sympress-artifact-contract-'));
try {
  const source = path.join(root, 'source');
  const build = path.join(root, 'build');
  const deploy = path.join(root, 'deploy');
  const runner = path.join(root, 'runner');
  for (const directory of [source, build, deploy, runner]) mkdirSync(directory);
  mkdirSync(path.join(source, 'vendor/bin'), { recursive: true });
  writeFileSync(path.join(source, 'vendor/library.php'), '<?php echo "fixture";');
  symlinkSync('../library.php', path.join(source, 'vendor/bin/library'));
  for (const name of ['.env', '.env.production', 'auth.json', '.npmrc']) {
    writeFileSync(path.join(source, name), 'private-artifact-sentinel');
  }
  writeFileSync(path.join(source, '.env.example'), 'PUBLIC_PLACEHOLDER=true');
  const env = { ...process.env, GITHUB_SHA: 'abcdef0123456789', GITHUB_RUN_ID: 'fixture-run', RUNNER_TEMP: runner };
  const run = (job, name, cwd, kind, overrides = {}) => spawnSync('bash', ['-c', step(job, name)], {
    cwd, env: { ...env, ARTIFACT_KIND: kind, ...overrides }, encoding: 'utf8', timeout: 10000,
  });
  let result = run('dependencies', 'Package dependencies artifact', source, 'dependencies');
  assert.equal(result.status, 0, result.stderr);
  mkdirSync(path.join(runner, 'sympress-dependencies'));
  const copy = spawnSync('cp', [path.join(runner, 'dependencies.tgz'), path.join(runner, 'sympress-dependencies')]);
  assert.equal(copy.status, 0);
  result = run('build', 'Restore dependencies artifact', build, 'dependencies');
  assert.equal(result.status, 0, result.stderr);
  assert(existsSync(path.join(build, '.env.example')));
  for (const name of ['.env', '.env.production', 'auth.json', '.npmrc']) assert(!existsSync(path.join(build, name)));
  assert.equal(readFileSync(path.join(build, 'vendor/bin/library'), 'utf8'), '<?php echo "fixture";');
  mkdirSync(path.join(build, 'dist'));
  writeFileSync(path.join(build, 'dist/build.txt'), 'verified-build');
  writeFileSync(path.join(build, '.env.generated'), 'private-artifact-sentinel');
  result = run('build', 'Package release artifact', build, 'release');
  assert.equal(result.status, 0, result.stderr);
  mkdirSync(path.join(runner, 'sympress-release'));
  assert.equal(spawnSync('cp', [path.join(runner, 'release.tgz'), path.join(runner, 'sympress-release')]).status, 0);
  result = run('deploy', 'Restore release artifact', deploy, 'release');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(path.join(deploy, 'dist/build.txt'), 'utf8'), 'verified-build');
  for (const name of ['.env.example', '.env.generated', 'auth.json', '.npmrc']) assert(!existsSync(path.join(deploy, name)));
  result = run('deploy', 'Restore release artifact', deploy, 'release', { GITHUB_SHA: 'different-commit' });
  assert.notEqual(result.status, 0, 'Different commit must fail provenance');
  for (const privateName of ['auth.json', '.env', '.env.production']) {
    symlinkSync(privateName, path.join(source, 'public-alias.json'));
    result = run('dependencies', 'Package dependencies artifact', source, 'dependencies');
    assert.notEqual(result.status, 0, 'A public link to private files must fail packaging');
    result = run('build', 'Package release artifact', source, 'release');
    assert.notEqual(result.status, 0, 'A release link to private files must fail packaging');
    rmSync(path.join(source, 'public-alias.json'));
  }
  linkSync(path.join(source, 'auth.json'), path.join(source, 'hard-link.json'));
  result = run('dependencies', 'Package dependencies artifact', source, 'dependencies');
  assert.notEqual(result.status, 0, 'Hard-linked private files must fail packaging');
  rmSync(path.join(source, 'hard-link.json'));
  symlinkSync('/etc/passwd', path.join(source, 'external-link'));
  result = run('dependencies', 'Package dependencies artifact', source, 'dependencies');
  assert.notEqual(result.status, 0, 'External links must fail packaging');
  assert(!JSON.stringify(workflow.jobs.build).includes('secrets.'));
  console.log('Passed artifact filtering, internal links, build propagation, provenance rejection and secret isolation.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
