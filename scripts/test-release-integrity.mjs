import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseDocument } from 'yaml';

const workflow = parseDocument(readFileSync('.github/workflows/deploy-deployer.yml', 'utf8')).toJS();
const step = (job, name) => workflow.jobs[job].steps.find(value => value.name === name).run;
const root = mkdtempSync(path.join(tmpdir(), 'sympress-integrity-'));
try {
  const source = path.join(root, 'source');
  const runner = path.join(root, 'runner');
  const bin = path.join(root, 'bin');
  for (const dir of [source, runner, bin]) mkdirSync(dir);
  mkdirSync(path.join(source, 'vendor/composer'), { recursive: true });
  const installed = path.join(source, 'vendor/composer/installed.json');
  writeFileSync(installed, JSON.stringify({ packages: [{ name: 'vendor/runtime', version: '1.2.3' }] }));
  writeFileSync(path.join(source, 'composer.lock'), JSON.stringify({ 'packages-dev': [{ name: 'vendor/test-tool' }] }));
  writeFileSync(path.join(source, 'package-lock.json'), JSON.stringify({ packages: {
    '': { name: 'site' }, 'node_modules/web-lib': { version: '2.3.4' },
    'node_modules/test-tool': { version: '1.0.0', dev: true },
  } }));
  const env = { ...process.env, RUNNER_TEMP: runner, WD: '.', GITHUB_REPOSITORY: 'SymPress/fixture',
    GITHUB_SHA: 'a'.repeat(40), GITHUB_RUN_ID: '123', GITHUB_REF: 'refs/heads/main',
    SIGNER_DIGEST: 'b'.repeat(40), ARTIFACT_KIND: 'release' };
  const run = (job, name, overrides = {}) => spawnSync('bash', ['-c', step(job, name)], {
    cwd: source, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 10000,
  });
  let result = run('build', 'Generate production SBOM');
  assert.equal(result.status, 0, result.stderr);
  const sbomPath = path.join(source, 'sympress-sbom.cdx.json');
  const sbom = JSON.parse(readFileSync(sbomPath));
  assert.equal(sbom.bomFormat, 'CycloneDX');
  assert.deepEqual(sbom.components.map(c => c.purl), ['pkg:composer/vendor/runtime@1.2.3', 'pkg:npm/web-lib@2.3.4']);
  writeFileSync(installed, JSON.stringify({ packages: [{ name: 'vendor/test-tool', version: '1.0.0' }] }));
  assert.notEqual(run('build', 'Generate production SBOM').status, 0, 'Installed dev tools must fail the release inventory');
  writeFileSync(installed, JSON.stringify({ packages: [{ name: 'vendor/runtime', version: '1.2.3' }] }));
  rmSync(sbomPath);
  const privateFile = path.join(source, 'auth.json');
  writeFileSync(privateFile, 'private-sentinel');
  symlinkSync('auth.json', sbomPath);
  assert.notEqual(run('build', 'Generate production SBOM').status, 0, 'SBOM cannot overwrite a private alias');
  assert.equal(readFileSync(privateFile, 'utf8'), 'private-sentinel');
  rmSync(sbomPath);
  assert.equal(run('build', 'Generate production SBOM').status, 0);
  assert.equal(run('build', 'Package release artifact').status, 0);
  mkdirSync(path.join(runner, 'sympress-release'));
  const archive = path.join(runner, 'sympress-release/release.tgz');
  writeFileSync(archive, readFileSync(path.join(runner, 'release.tgz')));
  const digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
  assert.equal(run('attest', 'Verify archive digest before signing', { EXPECTED_SHA256: digest }).status, 0);
  assert.equal(run('deploy', 'Verify the deployment archive before extraction', {
    EXPECTED_SHA256: digest, REQUIRE_ATTESTATION: 'false',
  }).status, 0);
  const ghArgs = path.join(root, 'gh-arguments');
  writeFileSync(path.join(bin, 'gh'), '#!/bin/sh\nprintf "%s\\n" "$@" > "$GH_ARGUMENTS"\nexit "${GH_RESULT:-0}"\n');
  chmodSync(path.join(bin, 'gh'), 0o700);
  const verification = { EXPECTED_SHA256: digest, REQUIRE_ATTESTATION: 'true',
    PATH: bin + path.delimiter + process.env.PATH, GH_ARGUMENTS: ghArgs };
  assert.equal(run('deploy', 'Verify the deployment archive before extraction', verification).status, 0);
  const args = readFileSync(ghArgs, 'utf8').trim().split('\n');
  for (const [flag, value] of [['--repo', env.GITHUB_REPOSITORY], ['--signer-digest', env.SIGNER_DIGEST],
    ['--source-digest', env.GITHUB_SHA], ['--source-ref', env.GITHUB_REF],
    ['--signer-workflow', 'SymPress/workflows/.github/workflows/deploy-deployer.yml']]) {
    assert.equal(args[args.indexOf(flag) + 1], value);
  }
  assert(args.includes('--deny-self-hosted-runners'));
  assert.notEqual(run('deploy', 'Verify the deployment archive before extraction', { ...verification, GH_RESULT: '1' }).status, 0,
    'A signature verification failure must stop deployment');
  assert.notEqual(run('deploy', 'Verify the deployment archive before extraction', { ...verification, SIGNER_DIGEST: 'main' }).status, 0);
  rmSync(ghArgs);
  writeFileSync(archive, 'tampered archive');
  assert.notEqual(run('attest', 'Verify archive digest before signing', { EXPECTED_SHA256: digest }).status, 0);
  assert.notEqual(run('deploy', 'Verify the deployment archive before extraction', verification).status, 0);
  assert(!readFileSync(archive).equals(readFileSync(path.join(runner, 'release.tgz'))));
  assert.equal(spawnSync('test', ['-e', ghArgs]).status, 1, 'Tampering must fail before signature lookup or extraction');
  console.log('Passed installed SBOM, private alias, archive tampering and attestation failure contracts.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
