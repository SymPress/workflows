import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
  assert.match(sbom.serialNumber, /^urn:uuid:[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
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
  mkdirSync(path.join(source, 'deployment/vendor/bin'), { recursive: true });
  writeFileSync(path.join(source, 'deployment/deploy.php'), 'build-tampered-recipe');
  writeFileSync(path.join(source, 'deployment/vendor/bin/dep'), '#!/bin/sh\ntouch "$TAMPER_EXECUTED"\nexit 91\n', { mode: 0o700 });
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
  // Model the separate, fresh caller checkout. The release archive already
  // contains tampered deployment files, but must never overwrite this tree.
  const trustedRoot = path.join(source, 'sympress-trusted-deployment');
  const trusted = path.join(trustedRoot, 'deployment');
  mkdirSync(path.join(trusted, 'vendor/bin'), { recursive: true });
  mkdirSync(path.join(trusted, 'vendor/deployer/deployer/bin'), { recursive: true });
  for (const file of ['composer.json', 'composer.lock']) writeFileSync(path.join(trusted, file), '{}');
  writeFileSync(path.join(trusted, 'deploy.php'), 'trusted-recipe');
  writeFileSync(path.join(trusted, 'vendor/deployer/deployer/bin/dep'), 'trusted-deployer-source');
  writeFileSync(path.join(trusted, 'vendor/bin/dep'), '#!/bin/sh\ntest -n "$SSH_AUTH_SOCK"\ntest "$(cat deploy.php)" = trusted-recipe\ntest "$(cat "$SYMPRESS_RELEASE_DIRECTORY/deployment/deploy.php")" = build-tampered-recipe\ntouch "$TRUSTED_EXECUTED"\n', { mode: 0o700 });
  for (const args of [['init', '-q'], ['add', '.'], ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Trusted caller source']]) {
    const git = spawnSync('git', args, { cwd: trustedRoot, encoding: 'utf8' });
    assert.equal(git.status, 0, git.stderr);
  }
  const trustedSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: trustedRoot, encoding: 'utf8' }).stdout.trim();
  const output = path.join(root, 'deployment-output');
  const trustedEnv = { TRUSTED_DEPLOYMENT_DIRECTORY: trusted, DEPLOYMENT_DIRECTORY: 'deployment', GITHUB_OUTPUT: output };
  assert.equal(run('deploy', 'Validate trusted deployment directory', { ...trustedEnv, GITHUB_SHA: trustedSha }).status, 0);
  assert.notEqual(run('deploy', 'Validate trusted deployment directory', trustedEnv).status, 0, 'An untested caller commit must fail');
  for (const directory of ['../deployment', trusted]) {
    assert.notEqual(run('deploy', 'Validate trusted deployment directory', { ...trustedEnv, GITHUB_SHA: trustedSha, DEPLOYMENT_DIRECTORY: directory }).status, 0);
  }
  assert.equal(run('deploy', 'Verify trusted deployment tools', trustedEnv).status, 0);
  assert.equal(run('deploy', 'Restore release artifact', trustedEnv).status, 0);
  const payload = path.join(runner, 'sympress-release-payload');
  assert.equal(readFileSync(path.join(trusted, 'deploy.php'), 'utf8'), 'trusted-recipe');
  assert.equal(readFileSync(path.join(payload, 'deployment/deploy.php'), 'utf8'), 'build-tampered-recipe');
  const marker = path.join(root, 'tamper-executed');
  const trustedMarker = path.join(root, 'trusted-executed');
  const deployment = spawnSync('bash', ['-c', step('deploy', 'Run Deployer')], {
    cwd: trusted, env: { ...env, ...trustedEnv, SYMPRESS_RELEASE_DIRECTORY: payload, SSH_AUTH_SOCK: '/private-agent',
      DEPLOY_COMMAND: './vendor/bin/dep deploy', ALLOW_CUSTOM_DEPLOY_COMMAND: 'false',
      DEPLOY_ENVIRONMENT: 'fixture', DEPLOY_VERBOSITY: 'v', TAMPER_EXECUTED: marker, TRUSTED_EXECUTED: trustedMarker },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(deployment.status, 0, deployment.stderr);
  assert(existsSync(trustedMarker), 'Trusted Deployer must receive the built upload payload');
  assert(!existsSync(marker), 'Build-controlled Deployer must never execute with deployment credentials');
  const trustedBinary = readFileSync(path.join(trusted, 'vendor/bin/dep'));
  for (const [file, target] of [['vendor/bin/dep', path.join(payload, 'deployment/vendor/bin/dep')], ['deploy.php', path.join(payload, 'deployment/deploy.php')]]) {
    const original = readFileSync(path.join(trusted, file));
    rmSync(path.join(trusted, file));
    symlinkSync(target, path.join(trusted, file));
    assert.notEqual(run('deploy', 'Verify trusted deployment tools', trustedEnv).status, 0, 'Payload symlink wrappers must fail before SSH/VPN');
    rmSync(path.join(trusted, file));
    writeFileSync(path.join(trusted, file), original);
  }
  assert(readFileSync(path.join(trusted, 'vendor/bin/dep')).equals(trustedBinary));
  // A crafted archive cannot use traversal or a link to reach the trusted tools.
  for (const kind of ['traversal', 'symlink']) {
    rmSync(payload, { recursive: true });
    const attack = spawnSync('python3', ['-c', `import io, os, tarfile\nwith tarfile.open(os.environ['ATTACK_ARCHIVE'], 'w:gz') as archive:\n info = tarfile.TarInfo('../trusted-overwrite' if os.environ['ATTACK_KIND'] == 'traversal' else 'outside')\n if os.environ['ATTACK_KIND'] == 'symlink':\n  info.type, info.linkname = tarfile.SYMTYPE, os.environ['TRUSTED_RECIPE']\n else:\n  info.size = 6\n archive.addfile(info, io.BytesIO(b'attack') if info.isfile() else None)`], {
      env: { ...process.env, ATTACK_ARCHIVE: archive, ATTACK_KIND: kind, TRUSTED_RECIPE: path.join(trusted, 'deploy.php') }, encoding: 'utf8',
    });
    assert.equal(attack.status, 0, attack.stderr);
    assert.notEqual(run('deploy', 'Restore release artifact', trustedEnv).status, 0);
    assert.equal(readFileSync(path.join(trusted, 'deploy.php'), 'utf8'), 'trusted-recipe');
    assert(!existsSync(path.join(runner, 'trusted-overwrite')));
  }
  rmSync(ghArgs);
  writeFileSync(archive, 'tampered archive');
  assert.notEqual(run('attest', 'Verify archive digest before signing', { EXPECTED_SHA256: digest }).status, 0);
  assert.notEqual(run('deploy', 'Verify the deployment archive before extraction', verification).status, 0);
  assert(!readFileSync(archive).equals(readFileSync(path.join(runner, 'release.tgz'))));
  assert.equal(spawnSync('test', ['-e', ghArgs]).status, 1, 'Tampering must fail before signature lookup or extraction');
  console.log('Passed installed SBOM, archive/attestation integrity, isolated trusted deployment execution and traversal/symlink tampering contracts.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
