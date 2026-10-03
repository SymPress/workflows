import assert from 'node:assert/strict';
import { copyFileSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
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
  linkSync(path.join(source, 'vendor/library.php'), path.join(source, 'vendor/library-copy.php'));
  symlinkSync('../library.php', path.join(source, 'vendor/bin/library'));
  for (const name of ['.env', '.env.production', 'auth.json', '.npmrc', '.yarnrc.yml']) {
    writeFileSync(path.join(source, name), 'private-artifact-sentinel');
  }
  writeFileSync(path.join(source, '.env.example'), 'PUBLIC_PLACEHOLDER=true');
  const env = { ...process.env, GITHUB_SHA: 'abcdef0123456789', GITHUB_RUN_ID: 'fixture-run', RUNNER_TEMP: runner,
    GITHUB_OUTPUT: path.join(root, 'step-output') };
  const run = (job, name, cwd, kind, overrides = {}) => spawnSync('bash', ['-c', step(job, name)], {
    cwd, env: { ...env, ARTIFACT_KIND: kind, ...overrides }, encoding: 'utf8', timeout: 60000,
  });
  let result = run('dependencies', 'Package dependencies artifact', source, 'dependencies');
  assert.equal(result.status, 0, result.stderr);
  mkdirSync(path.join(runner, 'sympress-dependencies'));
  const copy = spawnSync('cp', [path.join(runner, 'dependencies.tgz'), path.join(runner, 'sympress-dependencies')]);
  assert.equal(copy.status, 0);
  result = run('build', 'Restore dependencies artifact', build, 'dependencies');
  assert.equal(result.status, 0, result.stderr);
  assert(existsSync(path.join(build, '.env.example')));
  for (const name of ['.env', '.env.production', 'auth.json', '.npmrc', '.yarnrc.yml']) assert(!existsSync(path.join(build, name)));
  assert.equal(readFileSync(path.join(build, 'vendor/bin/library'), 'utf8'), '<?php echo "fixture";');
  assert.equal(readFileSync(path.join(build, 'vendor/library-copy.php'), 'utf8'), '<?php echo "fixture";');
  assert(lstatSync(path.join(build, 'vendor/bin/library')).isSymbolicLink(), 'Internal relative symlinks must retain package resolution');
  mkdirSync(path.join(build, 'dist'));
  writeFileSync(path.join(build, 'dist/build.txt'), 'verified-build');
  writeFileSync(path.join(build, '.env.generated'), 'private-artifact-sentinel');
  result = run('build', 'Package release artifact', build, 'release');
  assert.equal(result.status, 0, result.stderr);
  mkdirSync(path.join(runner, 'sympress-release'));
  assert.equal(spawnSync('cp', [path.join(runner, 'release.tgz'), path.join(runner, 'sympress-release')]).status, 0);
  result = run('deploy', 'Restore release artifact', deploy, 'release');
  assert.equal(result.status, 0, result.stderr);
  const payload = path.join(runner, 'sympress-release-payload');
  assert.equal(readFileSync(path.join(payload, 'dist/build.txt'), 'utf8'), 'verified-build');
  assert(lstatSync(path.join(payload, 'vendor/bin/library')).isSymbolicLink());
  for (const name of ['.env.example', '.env.generated', 'auth.json', '.npmrc']) assert(!existsSync(path.join(payload, name)));
  assert(!existsSync(path.join(deploy, 'dist')), 'Release extraction must not write to the executable workspace');
  rmSync(payload, { recursive: true });
  result = run('deploy', 'Restore release artifact', deploy, 'release', { GITHUB_SHA: 'different-commit' });
  assert.notEqual(result.status, 0, 'Different commit must fail provenance');
  assert.match(result.stderr, /Artifact provenance mismatch/);
  for (const privateName of ['auth.json', '.env', '.env.production', '.npmrc', '.yarnrc.yml']) {
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
  result = run('build', 'Package release artifact', source, 'release');
  assert.notEqual(result.status, 0, 'Hard-linked private files must fail release packaging');
  rmSync(path.join(source, 'hard-link.json'));
  symlinkSync('/etc/passwd', path.join(source, 'external-link'));
  result = run('dependencies', 'Package dependencies artifact', source, 'dependencies');
  assert.notEqual(result.status, 0, 'External links must fail packaging');
  rmSync(path.join(source, 'external-link'));
  symlinkSync(path.join(source, 'vendor/library.php'), path.join(source, 'absolute-internal-link'));
  result = run('dependencies', 'Package dependencies artifact', source, 'dependencies');
  assert.notEqual(result.status, 0, 'Absolute links are not portable between jobs');
  rmSync(path.join(source, 'absolute-internal-link'));
  for (const alias of [symlinkSync, linkSync]) {
    rmSync(path.join(source, '.sympress-artifact.json'));
    alias(path.join(source, 'auth.json'), path.join(source, '.sympress-artifact.json'));
    for (const [job, name, kind] of [['dependencies', 'Package dependencies artifact', 'dependencies'], ['build', 'Package release artifact', 'release']]) {
      result = run(job, name, source, kind);
      assert.notEqual(result.status, 0, 'Reserved metadata must reject symlink and hardlink aliases before writing');
      assert.equal(readFileSync(path.join(source, 'auth.json'), 'utf8'), 'private-artifact-sentinel', 'Metadata preparation must preserve the aliased private target');
    }
    rmSync(path.join(source, '.sympress-artifact.json'));
    writeFileSync(path.join(source, '.sympress-artifact.json'), '{}');
  }
  assert(!JSON.stringify(workflow.jobs.build).includes('secrets.'));

  const bin = path.join(root, 'bin');
  mkdirSync(bin);
  const corepack = spawnSync('which', ['corepack'], { encoding: 'utf8' });
  assert.equal(corepack.status, 0, 'Artifact package-manager regressions require Corepack');
  // Put shims and Corepack downloads only inside this disposable fixture.
  symlinkSync(corepack.stdout.trim(), path.join(bin, 'corepack'));
  const managerEnv = { ...env, PATH: `${bin}:${process.env.PATH}`, HOME: path.join(root, 'home'),
    COREPACK_HOME: path.join(root, 'corepack'), COREPACK_ENABLE_DOWNLOAD_PROMPT: '0', COREPACK_ENABLE_AUTO_PIN: '0',
    COREPACK_NPM_REGISTRY: 'https://registry.npmjs.org' };
  for (const key of ['COMPOSER_AUTH', 'NODE_AUTH_TOKEN', 'NPM_TOKEN', 'SSH_AUTH_SOCK', 'SSH_AGENT_PID', 'GIT_SSH_COMMAND', 'NPM_CONFIG_USERCONFIG']) delete managerEnv[key];
  const command = (args, cwd, overrides = {}) => {
    const output = spawnSync(args[0], args.slice(1), { cwd, env: { ...managerEnv, ...overrides }, encoding: 'utf8', timeout: 60000 });
    assert.equal(output.status, 0, `${args.join(' ')}\n${output.stdout}\n${output.stderr}`);
    return output;
  };
  command(['corepack', 'enable', '--install-directory', bin], root);
  const roundTrip = (label, prepare) => {
    const fixture = path.join(root, label);
    const fetched = path.join(fixture, 'fetched');
    const restored = path.join(fixture, 'restored');
    const deployed = path.join(fixture, 'deployed');
    const temp = path.join(fixture, 'runner');
    for (const directory of [fetched, restored, deployed, temp]) mkdirSync(directory, { recursive: true });
    prepare(fetched);
    const overrides = { ...managerEnv, RUNNER_TEMP: temp, REGISTRY_URL: 'https://registry.npmjs.org/', NODE_AUTH_TOKEN: '', NODE_WORKING_DIRECTORY: '.', BUILD_SCRIPT: 'build' };
    for (const [job, name, directory, kind] of [
      ['dependencies', 'Install Node dependencies', fetched, 'dependencies'],
      ['build', 'Build Node assets', fetched, 'dependencies'],
      ['dependencies', 'Package dependencies artifact', fetched, 'dependencies'],
    ]) {
      const output = run(job, name, directory, kind, overrides);
      assert.equal(output.status, 0, `${label} ${name}\n${output.stdout}\n${output.stderr}`);
    }
    assert(!gunzipSync(readFileSync(path.join(temp, 'dependencies.tgz'))).includes(Buffer.from('private-artifact-sentinel')), `${label} dependency archive must contain no credential sentinel`);
    mkdirSync(path.join(temp, 'sympress-dependencies'));
    copyFileSync(path.join(temp, 'dependencies.tgz'), path.join(temp, 'sympress-dependencies/dependencies.tgz'));
    let output = run('build', 'Restore dependencies artifact', restored, 'dependencies', overrides);
    assert.equal(output.status, 0, output.stderr);
    rmSync(path.join(restored, 'dist'), { recursive: true, force: true });
    output = run('build', 'Build Node assets', restored, 'dependencies', overrides);
    assert.equal(output.status, 0, `${label} restored build\n${output.stdout}\n${output.stderr}`);
    assert.equal(readFileSync(path.join(restored, 'dist/result.txt'), 'utf8'), 'transitive-build');
    if (label.startsWith('yarn')) {
      const publicConfig = JSON.parse(readFileSync(path.join(restored, '.yarnrc.yml'), 'utf8'));
      assert.equal(publicConfig.nodeLinker, label === 'yarn-pnp' ? 'pnp' : 'node-modules');
      assert.equal(publicConfig.enableGlobalCache, false);
      assert.equal(publicConfig.yarnPath, '.yarn/releases/yarn-4.9.4.cjs');
      assert(!readFileSync(path.join(restored, '.yarnrc.yml'), 'utf8').includes('private-artifact-sentinel'));
      assert(!Object.keys(publicConfig).some(key => /auth|registry|scopes/i.test(key)));
      assert(readFileSync(path.join(fetched, '.yarnrc.yml'), 'utf8').includes('private-artifact-sentinel'), 'Original Yarn authentication file must remain unchanged');
    } else {
      assert(lstatSync(path.join(restored, 'node_modules/is-even')).isSymbolicLink());
    }
    output = run('build', 'Package release artifact', restored, 'release', overrides);
    assert.equal(output.status, 0, output.stderr);
    assert(!gunzipSync(readFileSync(path.join(temp, 'release.tgz'))).includes(Buffer.from('private-artifact-sentinel')), `${label} release archive must contain no credential sentinel`);
    mkdirSync(path.join(temp, 'sympress-release'));
    copyFileSync(path.join(temp, 'release.tgz'), path.join(temp, 'sympress-release/release.tgz'));
    output = run('deploy', 'Restore release artifact', deployed, 'release', overrides);
    assert.equal(output.status, 0, output.stderr);
    const payload = path.join(temp, 'sympress-release-payload');
    assert.equal(readFileSync(path.join(payload, 'dist/result.txt'), 'utf8'), 'transitive-build');
    assert(!existsSync(path.join(payload, '.yarnrc.yml')));
    assert(!existsSync(path.join(payload, 'node_modules')));
    assert(!existsSync(path.join(deployed, 'dist')));
  };
  const packageFiles = (directory, packageManager) => {
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ private: true, name: 'artifact-manager-fixture', packageManager,
      scripts: { build: 'node build.cjs' }, dependencies: { 'is-even': '1.0.0' } }));
    writeFileSync(path.join(directory, 'build.cjs'), "const assert = require('node:assert/strict'); const fs = require('node:fs'); assert.equal(require('is-even')(2), true); fs.mkdirSync('dist', {recursive:true}); fs.writeFileSync('dist/result.txt', 'transitive-build');\n");
  };
  roundTrip('pnpm', directory => {
    packageFiles(directory, 'pnpm@10.0.0');
    command(['pnpm', 'install', '--ignore-scripts', '--registry=https://registry.npmjs.org/'], directory);
  });
  for (const linker of ['pnp', 'node-modules']) {
    roundTrip(`yarn-${linker}`, directory => {
      packageFiles(directory, 'yarn@4.9.4');
      command(['yarn', 'set', 'version', '4.9.4', '--yarn-path'], directory);
      const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
      delete manifest.packageManager; // Legacy repositories choose Yarn solely through yarnPath.
      writeFileSync(path.join(directory, 'package.json'), JSON.stringify(manifest));
      writeFileSync(path.join(directory, '.yarnrc.yml'), `nodeLinker: ${linker}\nyarnPath: .yarn/releases/yarn-4.9.4.cjs\nnpmRegistryServer: https://registry.npmjs.org\nnpmAuthToken: private-artifact-sentinel\n`);
      command(['yarn', 'install', '--mode=skip-build'], directory, { YARN_ENABLE_GLOBAL_CACHE: 'false', YARN_ENABLE_SCRIPTS: 'false' });
    });
  }
  console.log('Passed artifact filtering, relative links, provenance, secret isolation and real pnpm/Yarn PnP/node-modules transitive build round trips.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
