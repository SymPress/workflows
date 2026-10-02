import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
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
  executable(path.join(root, 'fake-bin/composer'), 'printf "%s\\n" "$1" >> composer-calls; if [ "$1" = update ]; then exit "${UPDATE_EXIT:-0}"; fi; exit 0');
  const updateFlags = { ...flags, RUN_PHPCS: 'false', RUN_PHPSTAN: 'false', RUN_PHPUNIT: 'false', UPDATE_DEPENDENCIES: 'true' };
  assert.equal(run(qa.run, updateFlags).status, 0);
  assert.deepEqual(readFileSync(path.join(root, 'composer-calls'), 'utf8').trim().split('\n'), ['update', 'install']);
  rmSync(path.join(root, 'composer-calls'));
  assert.equal(run(qa.run, { ...updateFlags, UPDATE_EXIT: '7' }).status, 7);
  assert.deepEqual(readFileSync(path.join(root, 'composer-calls'), 'utf8').trim().split('\n'), ['update']);
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
  // Model DDEV's outer shell plus raw argument forwarding, then execute the
  // literal mounted script in a second real Bash process. Never log its contents.
  writeFileSync(path.join(root, 'fake-bin/ddev'), `#!/usr/bin/env python3
import json, os, pathlib, subprocess, sys
arguments = sys.argv[1:]
pathlib.Path('ddev-arguments').write_text(json.dumps(arguments))
if arguments[:3] != ['exec', '--raw', '--']:
    sys.exit(91)
mount = os.environ['RUNNER_TEMP'] + '/sympress-install-auth'
arguments = [value.replace('/run/sympress-install-auth', mount) for value in arguments]
environment = dict(os.environ)
for name in ['COMPOSER_AUTH', 'NPM_TOKEN', 'NODE_AUTH_TOKEN', 'SSH_KEY', 'SSH_AUTH_SOCK']:
    environment.pop(name, None)
if arguments[3] == 'bash':
    script = pathlib.Path(arguments[4]).read_text().replace('/run/sympress-install-auth', mount)
    result = subprocess.run(['bash', '-c', 'exec "$@"', 'ddev-outer-shell', 'bash', '-s'], input=script, text=True, env=environment)
elif arguments[3] == 'find':
    result = subprocess.run(arguments[3:], env=environment)
elif arguments[3] == 'php':
    sys.exit(1 if os.environ.get('TEST_CONTAINER_SSH_AUTH_SOCK') or os.environ.get('TEST_CONTAINER_AGENT_SOCKET_EXISTS') else 0)
else:
    sys.exit(94)
sys.exit(result.returncode)
`, { mode: 0o700 });
  executable(path.join(root, 'fake-bin/composer'), `
test "\${COMPOSER_AUTH:-}" = "$EXPECTED_AUTH" || exit 92
case "$1" in
  validate) test "$2" = --strict && test "$3" = --no-check-publish ;;
  install) test "$2" = --no-interaction && test "$3" = --no-progress && test "$4" = --no-scripts && test "$5" = --no-plugins; exit "\${INSTALL_EXIT:-0}" ;;
  *) exit 93 ;;
esac`);
  executable(path.join(root, 'fake-bin/npm'), 'test "$1" = ci && test "$2" = --ignore-scripts');
  writeFileSync(path.join(root, 'composer.json'), '{}');
  writeFileSync(path.join(root, 'composer.lock'), '{}');
  const ddevInstall = step('ddev-playwright.yml', 'Install dependencies with private authentication');
  const ddevVerify = step('ddev-playwright.yml', 'Verify install credentials removed');
  const secret = JSON.stringify({ token: 'nested-ddev-secret-canary$(touch injected-auth)"`literal`' });
  for (const [auth, code] of [['', 0], [secret, 0], [secret, 7]]) {
    const environment = { ...gateEnvironment, COMPOSER_AUTH: auth, EXPECTED_AUTH: auth,
      NPM_TOKEN: auth ? 'nested-ddev-secret-canary' : '', SSH_KEY: '', SSH_KNOWN_HOSTS: '', INSTALL_EXIT: String(code) };
    const result = run(ddevInstall.run, environment);
    assert.equal(result.status, code, result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr + readFileSync(path.join(root, 'ddev-arguments'), 'utf8'), /nested-ddev-secret-canary/);
    assert.deepEqual(JSON.parse(readFileSync(path.join(root, 'ddev-arguments'), 'utf8')), ['exec', '--raw', '--', 'bash', '/run/sympress-install-auth/install.sh']);
    assert.deepEqual(readdirSync(path.join(root, 'sympress-install-auth')), []);
    assert.equal(existsSync(path.join(root, 'injected-auth')), false);
    assert.equal(existsSync(path.join(root, 'sympress-install-auth/auth.json')), false);
    assert.equal(existsSync(path.join(root, 'sympress-install-auth/npmrc')), false);
    assert.equal(run(ddevVerify.run, environment).status, 0);
    checks++;
  }
  rmSync(path.join(root, 'composer.lock'));
  assert.equal(run(ddevInstall.run, { ...gateEnvironment, COMPOSER_AUTH: '', EXPECTED_AUTH: '', NPM_TOKEN: '', SSH_KEY: '', SSH_KNOWN_HOSTS: '' }).status, 1);
  checks++;
  writeFileSync(path.join(root, 'composer.lock'), '{}');
  rmSync(path.join(root, 'package-lock.json'));
  assert.equal(run(ddevInstall.run, { ...gateEnvironment, COMPOSER_AUTH: '', EXPECTED_AUTH: '', NPM_TOKEN: '', SSH_KEY: '', SSH_KNOWN_HOSTS: '' }).status, 1);
  writeFileSync(path.join(root, 'sympress-install-auth/unexpected'), 'residual');
  assert.equal(run(ddevVerify.run, gateEnvironment).status, 1);
  rmSync(path.join(root, 'sympress-install-auth/unexpected'));
  assert.equal(run(ddevVerify.run, { ...gateEnvironment, TEST_CONTAINER_SSH_AUTH_SOCK: '/tmp/agent.sock' }).status, 1);
  assert.equal(run(ddevVerify.run, { ...gateEnvironment, TEST_CONTAINER_AGENT_SOCKET_EXISTS: 'true' }).status, 1);
  checks += 4;
  const ddevDouble = readFileSync(path.join(root, 'fake-bin/ddev'), 'utf8');
  executable(path.join(root, 'fake-bin/ddev'), 'exit 0');
  mkdirSync(path.join(root, '.ddev'), { recursive: true });
  assert.equal(run(step('ddev-playwright.yml', 'Configure DDEV').run, { ...gateEnvironment, PHP_VERSION: '8.5', NODE_VERSION: '24' }).status, 0);
  assert.deepEqual(parseDocument(readFileSync(path.join(root, '.ddev/config.install-auth.yaml'), 'utf8')).toJS(), { omit_containers: ['ddev-ssh-agent'] });
  assert.equal(parseDocument(readFileSync(path.join(root, '.ddev/docker-compose.install-auth.yaml'), 'utf8')).toJS().services.web.environment.SSH_AUTH_SOCK, '');
  writeFileSync(path.join(root, 'fake-bin/ddev'), ddevDouble, { mode: 0o700 });
  assert.equal(run(step('ddev-playwright.yml', 'Remove install credentials').run, gateEnvironment).status, 0);
  assert.equal(existsSync(path.join(root, '.ddev/config.install-auth.yaml')), false);
  assert.equal(existsSync(path.join(root, '.ddev/docker-compose.install-auth.yaml')), false);
  checks += 2;
  console.log(`Passed ${checks} actual Bash runner cases.`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
