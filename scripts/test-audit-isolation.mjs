import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseDocument } from 'yaml';

const workflow = parseDocument(readFileSync('.github/workflows/deploy-deployer.yml', 'utf8')).toJS();
const step = (job, name) => workflow.jobs[job].steps.find(value => value.name === name).run;
const root = mkdtempSync(path.join(tmpdir(), 'sympress-audit-isolation-'));
try {
  const audit = path.join(root, 'audit-source');
  const build = path.join(root, 'build-source');
  const runner = path.join(root, 'fresh-verifier');
  const buildRunner = path.join(root, 'build-runner');
  const sealed = path.join(root, 'sealed-artifact');
  for (const directory of [audit, build, runner, buildRunner, sealed]) mkdirSync(directory);
  mkdirSync(path.join(audit, 'vendor/composer'), { recursive: true });
  const packages = [{ name: 'vendor/runtime', version: '1.2.3' }];
  const lock = JSON.stringify({ packages, 'packages-dev': [] });
  const installed = JSON.stringify({ packages });
  writeFileSync(path.join(audit, 'composer.lock'), lock);
  writeFileSync(path.join(audit, 'vendor/composer/installed.json'), installed);
  writeFileSync(path.join(audit, 'package-lock.json'), JSON.stringify({ packages: {} }));
  const env = { ...process.env, WD: '.', GITHUB_REPOSITORY: 'SymPress/fixture', GITHUB_SHA: 'a'.repeat(40),
    GITHUB_RUN_ID: '123', GITHUB_OUTPUT: path.join(root, 'output'), ARTIFACT_KIND: 'release' };
  const run = (job, name, cwd, overrides = {}) => spawnSync('bash', ['-c', step(job, name)], {
    cwd, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 15000,
  });
  let result = run('audit', 'Generate production SBOM', audit);
  assert.equal(result.status, 0, result.stderr);
  for (const file of ['sympress-sbom.cdx.json', 'sympress-audit-locks.json']) cpSync(path.join(audit, file), path.join(sealed, file));
  cpSync(audit, build, { recursive: true });
  const marker = path.join(root, 'fake-audit-executed');
  const poison = path.join(build, 'poison-bin');
  const attack = 'const fs=require("node:fs"); fs.mkdirSync(' + JSON.stringify(poison) + ');\n'
    + 'for(const tool of ["composer","npm"]) fs.writeFileSync(' + JSON.stringify(poison)
    + '+"/"+tool, "#!/bin/sh\\ntouch ' + marker + '\\nexit 0\\n", {mode:0o700});\n'
    + 'fs.writeFileSync(process.env.GITHUB_PATH, ' + JSON.stringify(poison) + '+"\\n");\n'
    + 'fs.writeFileSync("composer.lock", \'{"packages":[]}\'); fs.writeFileSync("vendor/composer/installed.json", \'{"packages":[]}\');\n';
  writeFileSync(path.join(build, 'attack.cjs'), attack);
  writeFileSync(path.join(build, 'package.json'), JSON.stringify({ scripts: { build: 'node attack.cjs' } }));
  const githubPath = path.join(root, 'github-path');
  result = run('build', 'Build Node assets', build, { BUILD_SCRIPT: 'build', GITHUB_PATH: githubPath });
  assert.equal(result.status, 0, result.stderr);
  assert(readFileSync(githubPath, 'utf8').includes(poison));
  const poisonedPath = poison + path.delimiter + process.env.PATH;
  assert.equal(spawnSync('composer', ['audit'], { env: { ...env, PATH: poisonedPath } }).status, 0);
  assert(existsSync(marker), 'Control: post-build PATH can fake a passing audit');
  rmSync(marker);

  // A fresh runner downloads immutable audit evidence independently of the
  // build filesystem and its GITHUB_PATH/GITHUB_ENV state.
  mkdirSync(path.join(runner, 'sympress-audit'));
  mkdirSync(path.join(runner, 'sympress-release'));
  cpSync(sealed, path.join(runner, 'sympress-audit'), { recursive: true });
  const verify = () => {
    const packaged = run('build', 'Package release artifact', build, { RUNNER_TEMP: buildRunner });
    assert.equal(packaged.status, 0, packaged.stderr);
    const archive = readFileSync(path.join(buildRunner, 'release.tgz'));
    writeFileSync(path.join(runner, 'sympress-release/release.tgz'), archive);
    return run('verify', 'Verify immutable audit evidence', audit, {
      RUNNER_TEMP: runner, EXPECTED_SHA256: createHash('sha256').update(archive).digest('hex'),
    });
  };
  assert.notEqual(verify().status, 0, 'A modified lockfile must fail independent verification');
  writeFileSync(path.join(build, 'composer.lock'), lock);
  assert.notEqual(verify().status, 0, 'A removed production inventory must fail');
  writeFileSync(path.join(build, 'vendor/composer/installed.json'), installed);
  writeFileSync(path.join(build, 'sympress-sbom.cdx.json'), '{}');
  assert.notEqual(verify().status, 0, 'A replaced SBOM must fail');
  cpSync(path.join(sealed, 'sympress-sbom.cdx.json'), path.join(build, 'sympress-sbom.cdx.json'));
  result = verify();
  assert.equal(result.status, 0, result.stderr);
  assert(!existsSync(marker), 'Independent verification never runs poisoned build tools');
  console.log('Independent audit evidence rejects build PATH, lockfile, installed-inventory and SBOM tampering.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
