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
const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const legacyBrand = ['SymPress', ['Reus', 'able'].join(''), 'Workflows'].join(' ');
const legacySlug = ['sympress', [['reus', 'able'].join(''), 'workflows'].join('-')].join('/');

assert(packageJson.name === '@sympress/workflows', 'package.json must use the SymPress Workflows package name');
assert(packageLock.name === '@sympress/workflows', 'package-lock.json must use the SymPress Workflows package name');
assert(packageLock.packages[''].name === '@sympress/workflows', 'package-lock root package must use the SymPress Workflows package name');
assert(catalog.repository === 'sympress/workflows', 'workflow-catalog.json must use the SymPress Workflows repository slug');

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
  const workflow = parseDocument(read(file), { prettyErrors: true }).toJS();
  for (const [jobName, job] of Object.entries(workflow.jobs || {})) {
    const steps = Array.isArray(job.steps) ? job.steps : [];
    for (const [index, step] of steps.entries()) {
      if (typeof step.run === 'string') {
        assert(
          !step.run.includes('${{ inputs.'),
          `${file} job ${jobName} step ${index + 1} must not interpolate inputs directly into run scripts`,
        );
      }
    }
  }
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
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'SUPPORT.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  ...listFiles('docs', (file) => file.endsWith('.md')),
  ...listFiles('examples', (file) => file.endsWith('.yml') || file.endsWith('.yaml')),
];

for (const file of referenceFiles) {
  const text = read(file);
  for (const match of text.matchAll(/sympress\/workflows\/\.github\/workflows\/([^@\s]+)@[A-Za-z0-9._/-]+/g)) {
    assert(workflowNames.has(match[1]), `${file} references missing workflow ${match[1]}`);
  }
}

for (const file of [...workflowFiles, ...referenceFiles]) {
  const text = read(file);
  assert(!text.includes(legacyBrand), `${file} must use SymPress Workflows branding`);
  assert(!text.includes(legacySlug), `${file} must use the sympress/workflows repository slug`);
  assert(!/\bpsalm\b/i.test(text), `${file} must not reference Psalm`);
  assert(!/\bphp-lint\.yml\b/.test(text), `${file} must not reference php-lint.yml`);
  assert(!/\brun_lint\b/.test(text), `${file} must not reference run_lint`);
}

for (const file of referenceFiles) {
  assert(existsSync(path.join(root, file)), `${file} must exist`);
}

for (const file of [
  '.github/ISSUE_TEMPLATE/adoption-question.yml',
  '.github/ISSUE_TEMPLATE/bug-report.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/ISSUE_TEMPLATE/documentation.yml',
  '.github/ISSUE_TEMPLATE/feature-request.yml',
]) {
  assert(existsSync(path.join(root, file)), `${file} must exist`);
  const document = parseDocument(read(file), { prettyErrors: true });
  assert(document.errors.length === 0, `${file} must be valid YAML`);
}

const readme = read('README.md');
assert(readme.includes('Repository checks'), 'README.md must show repository check status');
assert(readme.includes('Why teams can trust it'), 'README.md must explain trust signals');

for (const file of ['.github/workflows/build-and-distribute.yml', '.github/workflows/wordpress-archive.yml']) {
  const text = read(file);
  for (const required of [
    'artifact_allowed_env_files',
    'artifact_extra_excludes',
    'artifact_secret_scan',
    'artifact_manifest',
    'artifact_attestation',
    'artifact_attestation requires artifact_manifest=true',
    "--exclude='.env*'",
    "--exclude='.npmrc'",
    "--exclude='auth.json'",
    "--exclude='*.pem'",
    "--exclude='*.key'",
    'Artifact contains blocked secret-like files',
    'Artifact content matched a blocked secret pattern',
    'artifact-sha256sums.txt',
    'artifact-manifest.json',
    'actions/attest-build-provenance@a2bbfa25375fe432b6a289bc6b6cd05ecd0c4c32',
    'actions: read',
    'attestations: write',
    'id-token: write',
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
assert(!release.includes('default: main'), 'automatic-release.yml fallback workflow_ref must not default to main');
assert(release.includes('RELEASE_CONFIG: ${{ inputs.release_config }}'), 'automatic-release.yml must pass release_config through env');

const qit = read('.github/workflows/woo-qit.yml');
assert(qit.includes('2745b88fb76608cd4a5d0e12d8ec4a7609a1a326'), 'woo-qit.yml must pin the default QIT ref');
assert(!qit.includes('/raw/trunk/qit'), 'woo-qit.yml must not download QIT from a floating trunk ref');
assert(qit.includes('qit_sha256'), 'woo-qit.yml must support optional QIT checksum verification');
assert(qit.includes('QIT_TEST'), 'woo-qit.yml must pass qit_test through env');
assert(qit.includes('args=("run:${QIT_TEST}"'), 'woo-qit.yml must run QIT with an argv array');

const repositoryChecks = read('.github/workflows/_repository-checks.yml');
assert(repositoryChecks.includes('zizmorcore/zizmor-action@5f14fd08f7cf1cb1609c1e344975f152c7ee938d'), '_repository-checks.yml must pin zizmor');
assert(repositoryChecks.includes('npm run test:contracts'), '_repository-checks.yml must run contract tests');
assert(repositoryChecks.includes('npm run doctor -- --fail-on high fixtures/wp-plugin'), '_repository-checks.yml must run the doctor fixture gate');
assert(repositoryChecks.includes('npm run doctor:repo'), '_repository-checks.yml must run the repository doctor gate');
assert(repositoryChecks.includes('fixtures/php-package'), '_repository-checks.yml must execute PHP fixture workflows');
assert(repositoryChecks.includes('fixtures/wp-plugin'), '_repository-checks.yml must execute archive fixture workflows');
assert(existsSync(path.join(root, '.github', 'dependabot.yml')), 'dependabot.yml must keep pinned action updates visible');
assert(existsSync(path.join(root, 'scripts', 'doctor.mjs')), 'doctor.mjs must provide consumer diagnostics');
const packageScripts = packageJson.scripts;
assert(packageScripts.doctor === 'node scripts/doctor.mjs', 'package.json must expose npm run doctor');
assert(packageScripts['doctor:repo'] === 'node scripts/doctor.mjs --fail-on high .', 'package.json must expose npm run doctor:repo');
assert(packageScripts['lint:docs'].includes('CODE_OF_CONDUCT.md'), 'lint:docs must include community health Markdown files');
assert(packageScripts['lint:docs'].includes('.github/**/*.md'), 'lint:docs must include GitHub Markdown templates');

const dependabot = read('.github/dependabot.yml');
const dependabotDocument = parseDocument(dependabot, { prettyErrors: true });
assert(dependabotDocument.errors.length === 0, 'dependabot.yml must be valid YAML');
assert(dependabot.includes('package-ecosystem: github-actions'), 'dependabot.yml must monitor GitHub Actions');
assert(dependabot.includes('groups:'), 'dependabot.yml must group dependency updates');
assert(dependabot.includes('github-actions:'), 'dependabot.yml must group GitHub Actions updates');
assert(dependabot.includes('dev-dependencies:'), 'dependabot.yml must group npm development dependency updates');

const doctor = read('scripts/doctor.mjs');
assert(doctor.includes('--fail-on <level>'), 'doctor.mjs must document --fail-on');
assert(doctor.includes('--format <format>'), 'doctor.mjs must document --format');
assert(doctor.includes('Artifact attestations:'), 'doctor.mjs must report attestation permissions');
assert(doctor.includes('process.exit(1)'), 'doctor.mjs must fail when gated findings are present');

for (const [file, input] of [
  ['.github/workflows/assets-build.yml', 'artifact_include_hidden_files'],
  ['.github/workflows/ddev-playwright.yml', 'playwright_artifact_include_hidden_files'],
  ['.github/workflows/playwright.yml', 'playwright_artifact_include_hidden_files'],
]) {
  assert(read(file).includes(input), `${file} must expose hidden-file artifact control`);
}

for (const file of workflowFiles) {
  const text = read(file);
  if (text.includes('ENV_VARS_JSON') || text.includes('DDEV_ENV_VARS_JSON')) {
    assert(text.includes('blockedNames'), `${file} must block reserved environment names`);
    assert(text.includes('Invalid environment variable name'), `${file} must validate environment variable names`);
  }
}

for (const file of [
  '.github/workflows/assets-build.yml',
  '.github/workflows/build-and-distribute.yml',
  '.github/workflows/deploy-deployer.yml',
  '.github/workflows/ddev-playwright.yml',
  '.github/workflows/javascript-static-analysis.yml',
  '.github/workflows/javascript-unit.yml',
  '.github/workflows/playwright.yml',
  '.github/workflows/sympress-qa.yml',
  '.github/workflows/wordpress-archive.yml',
  '.github/workflows/wp-scripts-lint.yml',
]) {
  const text = read(file);
  assert(text.includes('allow_unpinned_node_install'), `${file} must expose unpinned npm install control`);
  assert(text.includes('No JavaScript lockfile found'), `${file} must reject lockfile-less npm install by default`);
}

const playwright = read('.github/workflows/playwright.yml');
assert(playwright.includes('actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830'), 'playwright.yml must pin the Playwright browser cache action');
assert(!playwright.includes('source .env.ci'), 'playwright.yml must parse .env.ci without sourcing it');

const textQuality = read('.github/workflows/text-quality.yml');
assert(textQuality.includes('grammar-review:'), 'text-quality.yml must isolate grammar review permissions');
assert(textQuality.includes('pull-requests: write'), 'text-quality.yml must grant pull request write only to grammar review');

assert(existsSync(workflowDir), 'workflow directory must exist');

if (failures.length > 0) {
  console.error('Contract validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Validated ${workflowFiles.length} workflows and ${referenceFiles.length} docs/examples.`);
