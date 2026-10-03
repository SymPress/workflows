import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, cpSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = mkdtempSync(path.join(tmpdir(), 'sympress-release-tooling-'));
const tools = path.join(root, 'tools');
mkdirSync(tools);
const fixtureHome = path.join(root, 'home');
mkdirSync(fixtureHome);
// Build a local-only fixture environment rather than inheriting hosted PR/CI
// detection, credentials, Git configuration or runner output-file locations.
const fixtureEnvironment = {
  PATH: process.env.PATH,
  HOME: fixtureHome,
  LANG: 'C.UTF-8',
  TMPDIR: tmpdir(),
  CI: 'false',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
};
const run = (command, args, cwd, env = process.env) => {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result;
};
try {
  for (const file of ['package.json', 'package-lock.json', 'run-release.mjs', 'github-auth-plugin.mjs', 'sympress-bounded-braces-1.0.0.tgz']) {
    copyFileSync(path.join('templates/automatic-release', file), path.join(tools, file));
  }
  cpSync('templates/automatic-release/disabled-npm-plugin', path.join(tools, 'disabled-npm-plugin'), { recursive: true });
  cpSync('templates/automatic-release/bounded-braces', path.join(tools, 'bounded-braces'), { recursive: true });
  run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], tools);
  run('npm', ['audit', '--audit-level=moderate'], tools);
  assert.equal(JSON.parse(readFileSync(path.join(tools, 'node_modules/@sympress/release-disabled-npm-plugin/package.json'), 'utf8')).name, '@sympress/release-disabled-npm-plugin');
  const guard = await import(pathToFileURL(path.join(tools, 'disabled-npm-plugin/index.mjs')));
  assert.throws(() => guard.prepare(), /npm publication requires a separate reviewed workflow/);
  assert.equal(existsSync(path.join(tools, 'node_modules/npm')), false);
  const entry = await import(pathToFileURL(path.join(tools, 'run-release.mjs')));
  const core = entry.gitEnvironment({ GITHUB_TOKEN: 'canary-token', GH_TOKEN: 'canary-token', SYMPRESS_RELEASE_TOKEN: 'canary-token' });
  assert.equal(core.GITHUB_TOKEN, undefined);
  assert.equal(core.GH_TOKEN, undefined);
  assert.equal(core.SYMPRESS_RELEASE_TOKEN, 'canary-token');
  const unsupported = path.join(root, 'unsupported.cjs');
  writeFileSync(unsupported, "module.exports={plugins:['@semantic-release/npm']};");
  await assert.rejects(() => entry.configuration(unsupported), /npm publication is not supported/);
  const metadata = path.join(root, 'metadata');
  mkdirSync(metadata);
  writeFileSync(path.join(metadata, 'package.json'), JSON.stringify({ name: 'private-assets', private: true, version: '0.1.0', scripts: { version: 'touch lifecycle-ran' } }));
  writeFileSync(path.join(metadata, 'package-lock.json'), JSON.stringify({ version: '0.1.0', lockfileVersion: 3, packages: { '': { version: '0.1.0' } } }));
  run('node', [path.resolve('templates/automatic-release/update-version.cjs'), '1.2.3'], metadata);
  assert.equal(JSON.parse(readFileSync(path.join(metadata, 'package.json'), 'utf8')).version, '1.2.3');
  assert.equal(JSON.parse(readFileSync(path.join(metadata, 'package-lock.json'), 'utf8')).packages[''].version, '1.2.3');
  assert.equal(existsSync(path.join(metadata, 'lifecycle-ran')), false);
  const fakeBin = path.join(root, 'fake-bin');
  mkdirSync(fakeBin);
  const argsLog = path.join(root, 'git-args');
  const realGit = run('which', ['git'], root).stdout.trim();
  writeFileSync(path.join(fakeBin, 'git'), `#!/bin/sh\nprintf '%s\\n' "$@" >> "$GIT_ARGUMENT_LOG"\nif [ "\${FAIL_GIT_AUTH:-}" = true ] && [ "$1" = push ]; then exit 7; fi\nexec ${JSON.stringify(realGit)} "$@"\n`, { mode: 0o700 });
  const authUrl = (await import(pathToFileURL(path.join(tools, 'node_modules/semantic-release/lib/get-git-auth-url.js')))).default;
  const url = await authUrl({ cwd: root, env: { ...fixtureEnvironment, ...core, PATH: `${fakeBin}:${fixtureEnvironment.PATH}`, GIT_ARGUMENT_LOG: argsLog, FAIL_GIT_AUTH: 'true' }, branch: { name: 'main' }, options: { repositoryUrl: 'https://github.com/example/repo.git' } });
  assert.equal(url, 'https://github.com/example/repo.git');
  assert(!readFileSync(argsLog, 'utf8').includes('canary-token'));
  for (const variant of ['fallback', 'consumer']) {
    const cwd = path.join(root, variant);
    const bare = path.join(root, `${variant}.git`);
    mkdirSync(cwd);
    run('git', ['init', '--bare', '-b', 'main', bare], root, fixtureEnvironment);
    run('git', ['init', '-b', 'main'], cwd, fixtureEnvironment);
    run('git', ['config', 'user.email', 'fixture@example.test'], cwd, fixtureEnvironment);
    run('git', ['config', 'user.name', 'Fixture'], cwd, fixtureEnvironment);
    run('git', ['remote', 'add', 'origin', bare], cwd, fixtureEnvironment);
    writeFileSync(path.join(cwd, 'README.md'), 'fixture');
    run('git', ['add', 'README.md'], cwd, fixtureEnvironment);
    run('git', ['commit', '-m', 'feat: fixture'], cwd, fixtureEnvironment);
    run('git', ['push', '-u', 'origin', 'main'], cwd, fixtureEnvironment);
    let prefix;
    if (variant === 'fallback') {
      const fallback = path.join(cwd, 'fallback.cjs');
      copyFileSync('templates/automatic-release/release.config.cjs', fallback);
      prefix = `extends: ${JSON.stringify(fallback)},`;
    } else {
      prefix = `plugins: ['@semantic-release/commit-analyzer', '@semantic-release/github'],`;
    }
    writeFileSync(path.join(cwd, 'release.config.cjs'), `module.exports={${prefix}repositoryUrl:${JSON.stringify(bare)},branches:['main'],verifyConditions:[],generateNotes:()=> 'Fixture notes',prepare:[],publish:[],success:[],fail:[]};`);
    const configuration = await entry.configuration(path.join(cwd, 'release.config.cjs'));
    assert(configuration.plugins.some(item => (Array.isArray(item) ? item[0] : item).endsWith('github-auth-plugin.mjs')));
    const result = run('node', [path.join(tools, 'run-release.mjs')], cwd, { ...fixtureEnvironment, PATH: `${fakeBin}:${fixtureEnvironment.PATH}`, GIT_ARGUMENT_LOG: argsLog, RELEASE_CONFIG: 'release.config.cjs', SYMPRESS_RELEASE_DRY_RUN: 'true', GITHUB_TOKEN: 'canary-token', SYMPRESS_RELEASE_TOKEN: 'canary-token' });
    assert.match(result.stdout + result.stderr, /dry-run/);
    assert.match(result.stdout + result.stderr, /next release version is 1\.0\.0/);
    const expectedTag = 'v1.0.0';
    assert((result.stdout + result.stderr).includes(`Skip ${expectedTag} tag creation in dry-run mode`));
    assert.doesNotMatch(result.stdout + result.stderr, /triggered by a pull request/);
    assert.equal(run('git', ['tag', '--list'], cwd, fixtureEnvironment).stdout.trim(), '');
    assert.equal(run('git', ['--git-dir', bare, 'tag', '--list'], root, fixtureEnvironment).stdout.trim(), '');
    assert(!readFileSync(path.join(cwd, '.git/config'), 'utf8').includes('canary-token'));
    console.log(`Passed ${variant} release analysis for 1.0.0 in dry-run mode with no local or remote tags.`);
  }
  assert(!readFileSync(argsLog, 'utf8').includes('canary-token'));
  console.log('Passed locked tool install, fallback and consumer dry runs, and Git authentication-failure credential canaries.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
