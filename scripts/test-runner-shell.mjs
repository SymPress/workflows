import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseDocument } from 'yaml';

const workflows = path.resolve('.github/workflows');
function step(file, name) {
  const data = parseDocument(readFileSync(path.join(workflows, file), 'utf8')).toJS();
  return Object.values(data.jobs).flatMap(job => job.steps).find(item => item.name === name);
}
function executable(file, body) {
  writeFileSync(file, `#!/bin/bash\n${body}\n`, { mode: 0o700 });
}
const root = mkdtempSync(path.join(tmpdir(), 'sympress-runner-shell-'));
let checks = 0;
try {
  mkdirSync(path.join(root, 'vendor/bin'), { recursive: true });
  mkdirSync(path.join(root, 'fake-bin'));
  const output = path.join(root, 'output');
  const defaults = { ...process.env, RUNNER_TEMP: root, GITHUB_OUTPUT: output,
    DEPLOY_ENVIRONMENT: 'production', DEPLOY_VERBOSITY: 'v',
    DEPLOY_COMMAND: './vendor/bin/dep deploy', ALLOW_CUSTOM_DEPLOY_COMMAND: 'false' };
  const run = (script, env = {}) => spawnSync('bash', ['-c', script], {
    cwd: root, encoding: 'utf8', env: { ...defaults, ...env }, timeout: 10000,
  });
  const deploy = step('deploy-deployer.yml', 'Run Deployer');
  assert.equal(deploy['continue-on-error'], undefined);
  for (const status of [0, 2, 7, 143]) {
    executable(path.join(root, 'vendor/bin/dep'), status === 143 ? 'kill -TERM $$' : `exit ${status}`);
    writeFileSync(output, '');
    const result = run(deploy.run);
    assert.equal(result.status, status, result.stderr);
    assert.match(readFileSync(output, 'utf8'), new RegExp(`exit_code=${status}`));
    assert.equal(existsSync(path.join(root, 'deployer.log')), false);
    checks++;
  }
  for (const invalid of [{ DEPLOY_ENVIRONMENT: '$(touch injected)' }, { DEPLOY_VERBOSITY: 'bad' }, { DEPLOY_COMMAND: 'touch injected' }]) {
    writeFileSync(output, '');
    const result = run(deploy.run, invalid);
    assert.equal(result.status, 1);
    assert.match(readFileSync(output, 'utf8'), /exit_code=1/);
    assert.equal(existsSync(path.join(root, 'injected')), false);
    checks++;
  }
  executable(path.join(root, 'vendor/bin/dep'), 'exit 0');
  executable(path.join(root, 'fake-bin/tee'), 'cat >/dev/null; exit 9');
  assert.equal(run(deploy.run, { PATH: `${root}/fake-bin:${process.env.PATH}` }).status, 9);
  checks++;
  const guard = step('deploy-deployer.yml', 'Fail on Deployer result');
  for (const [outcome, code, expected] of [['success', '0', 0], ['success', '', 1], ['success', 'oops', 1], ['failure', '0', 1], ['cancelled', '0', 1], ['success', '7', 1]]) {
    assert.equal(run(guard.run, { OUTCOME: outcome, EXIT_CODE: code }).status, expected);
    checks++;
  }
  executable(path.join(root, 'fake-bin/composer'), 'if [ "$1" = config ]; then echo vendor/bin; fi; exit 0');
  const gateEnvironment = { PATH: `${root}/fake-bin:${process.env.PATH}`, COMMAND: '', ALLOW_CUSTOM_COMMAND: 'false', PHPSTAN_ARGS: 'analyse', PHPUNIT_ARGS: '', PHPCS_ARGS: '', EVENT_NAME: 'push', ANNOTATE: 'false' };
  for (const [file, name] of [['php-coding-standards.yml', 'Run coding standards'], ['php-static-analysis.yml', 'Run PHP static analysis'], ['php-unit.yml', 'Run PHPUnit']]) {
    const candidate = step(file, name) || parseDocument(readFileSync(path.join(workflows, file), 'utf8')).toJS().jobs[Object.keys(parseDocument(readFileSync(path.join(workflows, file), 'utf8')).toJS().jobs)[0]].steps.find(item => item.env?.COMMAND && item.run);
    assert(candidate, file);
    assert.notEqual(run(candidate.run, gateEnvironment).status, 0, file);
    checks++;
  }
  for (const tool of ['phpcs', 'phpstan', 'phpunit']) executable(path.join(root, 'vendor/bin', tool), 'exit 0');
  for (const [file, name] of [['php-coding-standards.yml', 'Run coding standards'], ['php-static-analysis.yml', 'Run static analysis'], ['php-unit.yml', 'Run PHPUnit']]) {
    assert.notEqual(run(step(file, name).run, gateEnvironment).status, 0, `Installed tool without configuration: ${file}`);
    checks++;
  }
  for (const tool of ['phpcs', 'phpstan', 'phpunit']) rmSync(path.join(root, 'vendor/bin', tool));
  writeFileSync(path.join(root, 'phpcs.xml'), '<ruleset/>');
  writeFileSync(path.join(root, 'phpstan.neon'), 'parameters: {}');
  writeFileSync(path.join(root, 'phpunit.xml'), '<phpunit/>');
  for (const [file, name] of [['php-coding-standards.yml', 'Run coding standards'], ['php-static-analysis.yml', 'Run static analysis'], ['php-unit.yml', 'Run PHPUnit']]) {
    assert.notEqual(run(step(file, name).run, gateEnvironment).status, 0, `Configuration without installed tool: ${file}`);
    checks++;
  }
  for (const file of ['phpcs.xml', 'phpstan.neon', 'phpunit.xml']) rmSync(path.join(root, file));
  const qa = step('sympress-qa.yml', 'Run QA');
  const flags = { ...gateEnvironment, COMPOSER_OPTIONS: '', RUN_VALIDATE: 'false', RUN_AUDIT: 'false', RUN_PHPCS: 'true', RUN_PHPSTAN: 'true', RUN_PHPUNIT: 'true', RUN_NODE_BUILD: 'false' };
  assert.equal(run(qa.run, flags).status, 1);
  assert.equal(run(qa.run, { ...flags, RUN_PHPCS: 'false', RUN_PHPSTAN: 'false', RUN_PHPUNIT: 'false' }).status, 0);
  checks += 2;
  // A fake install tool confirms secrets exist only during fetch and private files
  // are removed by the actual dependency-step EXIT trap, including failures.
  executable(path.join(root, 'fake-bin/npm'), 'test -f "$NPM_CONFIG_USERCONFIG" || exit 8; printf "%s" "$NPM_CONFIG_USERCONFIG" > auth-path; exit "${INSTALL_EXIT:-0}"');
  writeFileSync(path.join(root, 'package-lock.json'), '{}');
  const install = step('deploy-deployer.yml', 'Install Node dependencies');
  for (const code of [0, 7]) {
    assert.equal(run(install.run, { ...gateEnvironment, REGISTRY_URL: 'https://npm.pkg.github.com/', NODE_AUTH_TOKEN: 'canary-token', INSTALL_EXIT: String(code) }).status, code);
    assert.equal(existsSync(readFileSync(path.join(root, 'auth-path'), 'utf8')), false);
    checks++;
  }
  // No deployment/install token is inherited by an authorized build child.
  executable(path.join(root, 'fake-bin/npm'), 'test -z "${NODE_AUTH_TOKEN:-}${COMPOSER_AUTH:-}${SSH_AUTH_SOCK:-}" || exit 8; touch build-completed');
  writeFileSync(path.join(root, 'package.json'), '{"scripts":{"build":"echo build"}}');
  assert.equal(run(step('deploy-deployer.yml', 'Build Node assets').run, { ...gateEnvironment, BUILD_SCRIPT: 'build' }).status, 0);
  assert(existsSync(path.join(root, 'build-completed')));
  checks++;
  // Exercise the real release helper without any network or publish operation.
  executable(path.join(root, 'fake-bin/git'), 'if [ "$1" = remote ] && [ "$2" = get-url ]; then echo https://github.com/example/repo.git; fi');
  executable(path.join(root, 'fake-bin/node'), 'test -f "$GIT_CONFIG_VALUE_0" || exit 8; if grep -q canary-token "$GIT_CONFIG_VALUE_0"; then exit 9; fi; printf "%s" "$GIT_CONFIG_VALUE_0" > helper-path; exit "${RELEASE_EXIT:-0}"');
  for (const code of [0, 7]) {
    assert.equal(run(step('automatic-release.yml', 'Release').run, { ...gateEnvironment, SYMPRESS_RELEASE_TOKEN: 'canary-token', REPOSITORY: 'example/repo', RELEASE_EXIT: String(code) }).status, code);
    assert.equal(existsSync(readFileSync(path.join(root, 'helper-path'), 'utf8')), false);
    checks++;
  }
  // DDEV fetch traps remove host files even when the container command fails.
  executable(path.join(root, 'fake-bin/ddev'), 'exit "${INSTALL_EXIT:-0}"');
  executable(path.join(root, 'fake-bin/npm'), 'exit "${INSTALL_EXIT:-0}"');
  for (const code of [0, 7]) {
    mkdirSync(path.join(root, 'sympress-install-auth'), { recursive: true });
    assert.equal(run(step('ddev-playwright.yml', 'Install dependencies with private authentication').run, { ...gateEnvironment, COMPOSER_AUTH: '{"token":"canary-token"}', NPM_TOKEN: 'canary-token', SSH_KEY: '', SSH_KNOWN_HOSTS: '', INSTALL_EXIT: String(code) }).status, code);
    assert.equal(existsSync(path.join(root, 'sympress-install-auth/auth.json')), false);
    assert.equal(existsSync(path.join(root, 'sympress-install-auth/npmrc')), false);
    writeFileSync(path.join(root, 'package-lock.json'), '{}');
    checks++;
  }
  console.log(`Passed ${checks} actual Bash runner cases.`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
