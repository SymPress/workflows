import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowDir = path.join(root, '.github', 'workflows');
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function listFiles(directory, predicate = () => true) {
  const absolute = path.join(root, directory);
  const files = [];

  for (const entry of readdirSync(absolute)) {
    const full = path.join(absolute, entry);
    const relative = path.relative(root, full);
    if (statSync(full).isDirectory()) {
      files.push(...listFiles(relative, predicate));
      continue;
    }
    if (predicate(relative)) {
      files.push(relative);
    }
  }

  return files;
}

const workflowFiles = listFiles('.github/workflows', (file) => file.endsWith('.yml'));
const workflowNames = new Set(workflowFiles.map((file) => path.basename(file)));
const catalog = JSON.parse(read('workflow-catalog.json'));
const catalogWorkflowFiles = new Set(catalog.workflows.map((workflow) => workflow.file));
const pinnedActionRef = /^[0-9a-f]{40}$/;

for (const file of workflowFiles) {
  assert(catalogWorkflowFiles.has(file), `workflow-catalog.json must include ${file}`);
}

for (const file of catalogWorkflowFiles) {
  assert(workflowFiles.includes(file), `workflow-catalog.json references missing workflow ${file}`);
}

for (const file of workflowFiles) {
  const document = parseDocument(read(file), { prettyErrors: true });
  assert(document.errors.length === 0, `${file} must be valid YAML`);
}

for (const file of workflowFiles) {
  const text = read(file);
  for (const match of text.matchAll(/^\s*uses:\s+([^@\s#]+)@([^\s#]+)/gm)) {
    const [, action, ref] = match;
    if (action.startsWith('./')) {
      continue;
    }
    assert(pinnedActionRef.test(ref), `${file} must pin ${action} to a full commit SHA, got ${ref}`);
  }
}

const referenceFiles = [
  'README.md',
  ...listFiles('docs', (file) => file.endsWith('.md')),
  ...listFiles('examples', (file) => file.endsWith('.yml') || file.endsWith('.yaml')),
];

for (const file of referenceFiles) {
  const text = read(file);
  for (const match of text.matchAll(/sympress\/reusable-workflows\/\.github\/workflows\/([^@\s]+)@[A-Za-z0-9._/-]+/g)) {
    assert(workflowNames.has(match[1]), `${file} references missing workflow ${match[1]}`);
  }
}

for (const file of [...workflowFiles, ...referenceFiles]) {
  const text = read(file);
  assert(!/\bpsalm\b/i.test(text), `${file} must not reference Psalm`);
  assert(!/\bphp-lint\.yml\b/.test(text), `${file} must not reference php-lint.yml`);
  assert(!/\brun_lint\b/.test(text), `${file} must not reference run_lint`);
}

for (const file of ['.github/workflows/build-and-distribute.yml', '.github/workflows/wordpress-archive.yml']) {
  const text = read(file);
  for (const required of [
    'artifact_allowed_env_files',
    'artifact_extra_excludes',
    "--exclude='.env*'",
    "--exclude='.npmrc'",
    "--exclude='auth.json'",
    "--exclude='*.pem'",
    "--exclude='*.key'",
    'Artifact contains blocked secret-like files',
  ]) {
    assert(text.includes(required), `${file} must contain artifact hardening rule ${required}`);
  }
}

const buildAndDistribute = read('.github/workflows/build-and-distribute.yml');
assert(buildAndDistribute.includes('GITHUB_KNOWN_HOSTS'), 'build-and-distribute.yml must support pinned GitHub known_hosts');
assert(buildAndDistribute.includes('allow_github_ssh_keyscan'), 'build-and-distribute.yml must gate github.com ssh-keyscan fallback');

for (const [file, gate] of [
  ['.github/workflows/build-and-distribute.yml', 'allow_inline_scripts'],
  ['.github/workflows/wordpress-archive.yml', 'allow_inline_scripts'],
  ['.github/workflows/playwright.yml', 'allow_inline_scripts'],
  ['.github/workflows/ddev-playwright.yml', 'allow_custom_commands'],
  ['.github/workflows/deploy-deployer.yml', 'allow_custom_deploy_command'],
  ['.github/workflows/php-coding-standards.yml', 'allow_custom_command'],
  ['.github/workflows/php-static-analysis.yml', 'allow_custom_command'],
  ['.github/workflows/php-unit.yml', 'allow_custom_command'],
  ['.github/workflows/javascript-static-analysis.yml', 'allow_custom_command'],
  ['.github/workflows/javascript-unit.yml', 'allow_custom_command'],
]) {
  const text = read(file);
  assert(text.includes(gate), `${file} must gate free-form shell input with ${gate}`);
}

const sympressQa = read('.github/workflows/sympress-qa.yml');
assert(sympressQa.includes('strategy:'), 'sympress-qa.yml must use a matrix strategy');
assert(sympressQa.includes('matrix:'), 'sympress-qa.yml must define a target matrix');
assert(!sympressQa.includes('for target in "${targets[@]}"'), 'sympress-qa.yml must not run targets serially');

const deploy = read('.github/workflows/deploy-deployer.yml');
assert(deploy.includes('environment: ${{ inputs.environment }}'), 'deploy-deployer.yml must bind GitHub environments');
assert(deploy.includes('SSH_KNOWN_HOSTS'), 'deploy-deployer.yml must support pinned SSH known_hosts');
assert(deploy.includes('allow_ssh_keyscan'), 'deploy-deployer.yml must gate ssh-keyscan fallback');

const release = read('.github/workflows/automatic-release.yml');
assert(release.includes('semantic-release@25.0.5'), 'automatic-release.yml must pin semantic-release');
assert(release.includes('conventional-changelog-conventionalcommits@9.3.1'), 'automatic-release.yml must pin release dependencies');
assert(release.includes('concurrency:'), 'automatic-release.yml must serialize release runs');

const qit = read('.github/workflows/woo-qit.yml');
assert(qit.includes('2745b88fb76608cd4a5d0e12d8ec4a7609a1a326'), 'woo-qit.yml must pin the default QIT ref');
assert(!qit.includes('/raw/trunk/qit'), 'woo-qit.yml must not download QIT from a floating trunk ref');
assert(qit.includes('qit_sha256'), 'woo-qit.yml must support optional QIT checksum verification');

const repositoryChecks = read('.github/workflows/_repository-checks.yml');
assert(repositoryChecks.includes('zizmorcore/zizmor-action@5f14fd08f7cf1cb1609c1e344975f152c7ee938d'), '_repository-checks.yml must pin zizmor');
assert(repositoryChecks.includes('npm run test:contracts'), '_repository-checks.yml must run contract tests');
assert(existsSync(path.join(root, '.github', 'dependabot.yml')), 'dependabot.yml must keep pinned action updates visible');

for (const [file, input] of [
  ['.github/workflows/assets-build.yml', 'artifact_include_hidden_files'],
  ['.github/workflows/ddev-playwright.yml', 'playwright_artifact_include_hidden_files'],
  ['.github/workflows/playwright.yml', 'playwright_artifact_include_hidden_files'],
]) {
  assert(read(file).includes(input), `${file} must expose hidden-file artifact control`);
}

assert(existsSync(workflowDir), 'workflow directory must exist');

if (failures.length > 0) {
  console.error('Contract validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Validated ${workflowFiles.length} workflows and ${referenceFiles.length} docs/examples.`);
