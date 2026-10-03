import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const braces = require('../templates/automatic-release/bounded-braces/index.cjs');
for (const pattern of ['{'.repeat(10000) + 'x' + '}'.repeat(10000),
  '{'.repeat(60) + ')'.repeat(60) + '{'.repeat(60), '('.repeat(10000)]) {
  for (const method of ['parse', 'stringify', 'compile', 'expand', 'create']) {
    assert.throws(() => braces[method](pattern, { maxLength: Infinity }), /nesting limit/);
  }
  assert.throws(() => braces(pattern), /nesting limit/);
}
const cycle = { type: 'root', nodes: [] };
cycle.nodes.push(cycle);
let ast = { type: 'text', value: 'x' };
for (let i = 0; i < 10000; i++) ast = { type: 'brace', nodes: [ast] };
for (const method of ['stringify', 'compile', 'expand']) {
  assert.throws(() => braces[method](ast), /nesting limit/);
  assert.throws(() => braces[method](cycle), /cycle/);
}
assert.deepEqual(braces.expand('docs/{api,guide}-{1..3}.md'),
  ['docs/api-1.md', 'docs/api-2.md', 'docs/api-3.md', 'docs/guide-1.md', 'docs/guide-2.md', 'docs/guide-3.md']);
assert.equal(braces.compile('src/{foo,bar}/*.js'), 'src/(foo|bar)/*.js');
assert.equal(braces.stringify(braces.parse('src/{foo,bar}')), 'src/{foo,bar}');
const micromatch = require('micromatch');
assert.deepEqual(micromatch(['docs/api.md', 'docs/guide.md', 'docs/private.md', 'src/main.js'],
  ['docs/{api,guide}.md', '!docs/private.md']), ['docs/api.md', 'docs/guide.md']);
assert.throws(() => micromatch.braces('{'.repeat(10000) + 'x' + '}'.repeat(10000)), /nesting limit/);
// The npm file dependency must contain exactly the reviewed wrapper and sources.
const directory = 'templates/automatic-release/bounded-braces';
const archive = 'templates/automatic-release/sympress-bounded-braces-1.0.0.tgz';
const visit = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? visit(file) : [file];
});
const files = visit(directory).map(file => path.relative(directory, file));
const listed = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
assert.equal(listed.status, 0, listed.stderr);
assert.deepEqual(listed.stdout.trim().split('\n').sort(), files.map(file => 'package/' + file).sort());
for (const file of files) {
  const extracted = spawnSync('tar', ['-xOzf', archive, 'package/' + file]);
  assert.equal(extracted.status, 0);
  assert(extracted.stdout.equals(readFileSync(path.join(directory, file))), 'Packaged source differs: ' + file);
}
console.log('Passed recursion exploit, mixed delimiters, direct AST cycles and real micromatch compatibility.');
