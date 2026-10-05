import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { parseDocument } from 'yaml';

const workflow = parseDocument(readFileSync('.github/workflows/deploy-deployer.yml', 'utf8')).toJS();
const step = (job, name) => workflow.jobs[job].steps.find(value => value.name === name).run;
const root = mkdtempSync(path.join(tmpdir(), 'sympress-composer-private-'));
let server;
try {
  const source = path.join(root, 'source');
  const build = path.join(root, 'build');
  const cache = path.join(root, 'cache');
  const runner = path.join(root, 'runner');
  for (const directory of [source, build, cache, runner]) mkdirSync(directory);
  const execute = (command, args, cwd = source, overrides = {}) => {
    const result = spawnSync(command, args, { cwd, env: { ...process.env, COMPOSER_CACHE_DIR: cache, COMPOSER_ALLOW_SUPERUSER: '1', ...overrides }, encoding: 'utf8', timeout: 60000 });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout.trim();
  };
  const ready = path.join(root, 'ready');
  server = spawn('python3', ['-u', '-c', `
import base64, http.server, io, pathlib, zipfile
content = io.BytesIO()
with zipfile.ZipFile(content, 'w') as archive:
    archive.writestr('plugin/content.txt', 'authenticated-package')
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        if self.headers.get('Authorization') != 'Basic ' + base64.b64encode(b'review:fixture-secret').decode():
            self.send_response(401); self.send_header('WWW-Authenticate', 'Basic realm="fixture"'); self.end_headers(); return
        self.send_response(200); self.end_headers(); self.wfile.write(content.getvalue())
server = http.server.HTTPServer(('127.0.0.1', 0), Handler)
pathlib.Path(${JSON.stringify(ready)}).write_text(str(server.server_port))
server.serve_forever()
`], { stdio: 'ignore' });
  for (let attempt = 0; attempt < 100 && !existsSync(ready); attempt++) await setTimeout(30);
  assert(existsSync(ready), 'Authenticated package fixture did not start');
  const port = readFileSync(ready, 'utf8');
  const manifest = {
    name: 'sympress/private-cache-fixture', require: { 'private/dist-plugin': '1.0.0' },
    repositories: [{ type: 'package', package: { name: 'private/dist-plugin', version: '1.0.0', dist: { type: 'zip', url: `http://127.0.0.1:${port}/plugin.zip` } } }, { 'packagist.org': false }],
    config: { 'secure-http': false, 'allow-plugins': false },
  };
  writeFileSync(path.join(source, 'composer.json'), JSON.stringify(manifest));
  execute('composer', ['update', '--no-scripts', '--no-plugins', '--no-interaction', '--no-progress'], source,
    { COMPOSER_AUTH: JSON.stringify({ 'http-basic': { [`127.0.0.1:${port}`]: { username: 'review', password: 'fixture-secret' } } }) });
  const git = path.join(root, 'git-source');
  mkdirSync(git);
  execute('git', ['init', '-q', git]);
  writeFileSync(path.join(git, 'content.txt'), 'private-source-package');
  execute('git', ['add', '.'], git);
  execute('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture'], git);
  const reference = execute('git', ['rev-parse', 'HEAD'], git);
  const url = 'ssh://git@example.invalid/private.git';
  const mirror = path.join(cache, 'vcs', url.replace(/[^a-z0-9.]/gi, '-'));
  execute('git', ['clone', '--mirror', git, mirror]);
  execute('git', ['--git-dir', mirror, 'remote', 'set-url', 'origin', 'https://fixture-secret@example.invalid/private.git']);
  manifest.require['private/source-plugin'] = '1.0.0';
  manifest.repositories.unshift({ type: 'package', package: { name: 'private/source-plugin', version: '1.0.0', source: { type: 'git', url, reference } } });
  writeFileSync(path.join(source, 'composer.json'), JSON.stringify(manifest));
  execute('composer', ['update', '--no-scripts', '--no-plugins', '--no-interaction', '--no-progress'], source, { COMPOSER_DISABLE_NETWORK: '1', COMPOSER_AUTH: '' });
  const environment = { GITHUB_SHA: 'abcdef0123456789', GITHUB_RUN_ID: 'private-cache-fixture', RUNNER_TEMP: runner, ARTIFACT_KIND: 'dependencies', COMPOSER_AUTH: '' };
  execute('bash', ['-c', step('dependencies', 'Package dependencies artifact')], source, environment);
  mkdirSync(path.join(runner, 'sympress-dependencies'));
  copyFileSync(path.join(runner, 'dependencies.tgz'), path.join(runner, 'sympress-dependencies/dependencies.tgz'));
  execute('bash', ['-c', step('build', 'Restore dependencies artifact')], build, environment);
  rmSync(path.join(build, 'vendor'), { recursive: true });
  server.kill();
  execute('composer', ['install', '--prefer-dist', '--no-interaction', '--no-scripts', '--no-plugins', '--no-progress'], build,
    { COMPOSER_CACHE_DIR: path.join(build, '.sympress-composer-cache'), COMPOSER_DISABLE_NETWORK: '1', COMPOSER_AUTH: '', SSH_AUTH_SOCK: '', GIT_SSH_COMMAND: 'false' });
  assert.equal(readFileSync(path.join(build, 'vendor/private/dist-plugin/content.txt'), 'utf8'), 'authenticated-package');
  assert.equal(readFileSync(path.join(build, 'vendor/private/source-plugin/content.txt'), 'utf8'), 'private-source-package');
  assert(!readFileSync(path.join(build, '.sympress-composer-cache/vcs', path.basename(mirror), 'config'), 'utf8').includes('fixture-secret'));
  console.log('Authenticated private ZIP and private Git source both reinstall from sanitized build caches without network, credentials or SSH agent.');
} finally {
  server?.kill();
  rmSync(root, { recursive: true, force: true });
}
