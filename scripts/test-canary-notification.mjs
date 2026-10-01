import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const workflow = parse(readFileSync(new URL('../.github/workflows/dependency-canary.yml', import.meta.url), 'utf8'));
const script = workflow.jobs.incident.steps[0].with.script;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction('github', 'context', 'core', 'process', script);
const marker = '<!-- sympress-dependency-compatibility -->';

async function probe(result, issues = []) {
  const calls = [];
  const github = {
    paginate: async () => issues,
    rest: { issues: Object.fromEntries(['listForRepo', 'create', 'update', 'createComment'].map(name => [name, async input => calls.push({ name, input })])) },
  };
  const context = { serverUrl: 'https://github.com', repo: { owner: 'SymPress', repo: 'fixture' }, runId: 123 };
  await run(github, context, { setFailed: message => calls.push({ name: 'failure', message }) }, { env: { CANARY_RESULT: result } });
  return calls;
}

assert.deepEqual(await probe('success'), []);
assert.deepEqual((await probe('failure')).map(call => call.name), ['create']);
assert.deepEqual((await probe('cancelled')).map(call => call.name), ['create']);
assert.deepEqual(await probe('failure', [{ number: 1, state: 'open', body: marker }]), []);
assert.deepEqual((await probe('failure', [{ number: 1, state: 'closed', body: marker }])).map(call => call.name), ['update']);
assert.deepEqual((await probe('success', [{ number: 1, state: 'open', body: marker }])).map(call => call.name), ['createComment', 'update']);
assert.deepEqual(await probe('success', [{ number: 1, state: 'closed', body: marker }]), []);
assert.deepEqual((await probe('skipped')).map(call => call.name), ['failure']);
assert.deepEqual((await probe('failure', [{ number: 1, state: 'open', body: marker, pull_request: {} }])).map(call => call.name), ['create']);
console.log('Canary notification: 9 actual workflow-script scenarios passed.');
