import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const severityRank = {
  info: 1,
  low: 2,
  medium: 3,
  high: 4,
};
const failOnLevels = new Set(['none', ...Object.keys(severityRank)]);
const outputFormats = new Set(['text', 'json']);

function usage() {
  return `Usage: npm run doctor -- [options] [consumer-repository]

Options:
  --fail-on <level>   Exit non-zero when findings at or above level exist.
                      Levels: high, medium, low, info, none. Default: none.
  --format <format>   Output format: text or json. Default: text.
  --json              Alias for --format json.
  -h, --help          Show this help.
`;
}

function readOptionValue(args, index, name) {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    throw new Error(`${name} requires a value.`);
  }
  return [value, index + 1];
}

function parseArgs(args) {
  const options = {
    failOn: 'none',
    format: 'text',
    target: '.',
  };
  let targetSeen = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '-h' || arg === '--help') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--json') {
      options.format = 'json';
      continue;
    }
    if (arg === '--format') {
      const [value, nextIndex] = readOptionValue(args, index, '--format');
      options.format = value;
      index = nextIndex;
      continue;
    }
    if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length);
      continue;
    }
    if (arg === '--fail-on') {
      const [value, nextIndex] = readOptionValue(args, index, '--fail-on');
      options.failOn = value;
      index = nextIndex;
      continue;
    }
    if (arg.startsWith('--fail-on=')) {
      options.failOn = arg.slice('--fail-on='.length);
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (targetSeen) {
      throw new Error(`Only one consumer repository path is supported, got extra argument: ${arg}`);
    }
    options.target = arg;
    targetSeen = true;
  }

  if (!outputFormats.has(options.format)) {
    throw new Error(`Unsupported --format value: ${options.format}`);
  }
  if (!failOnLevels.has(options.failOn)) {
    throw new Error(`Unsupported --fail-on value: ${options.failOn}`);
  }

  return options;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  console.error('');
  console.error(usage());
  process.exit(2);
}

const targetRoot = path.resolve(options.target);

function exists(relativePath) {
  return existsSync(path.join(targetRoot, relativePath));
}

function read(relativePath) {
  return readFileSync(path.join(targetRoot, relativePath), 'utf8');
}

function listFiles(relativeDirectory, predicate = () => true) {
  const absolute = path.join(targetRoot, relativeDirectory);
  if (!existsSync(absolute)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(absolute)) {
    const full = path.join(absolute, entry);
    const relative = path.relative(targetRoot, full);
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

function hasAny(paths) {
  return paths.some((candidate) => exists(candidate));
}

function hasComposerScript(relativePath, scriptNames) {
  if (!exists(relativePath)) {
    return false;
  }
  try {
    const composer = JSON.parse(read(relativePath));
    return scriptNames.some((name) => composer.scripts && Object.hasOwn(composer.scripts, name));
  } catch {
    return false;
  }
}

function packageDirectories() {
  const packagesRoot = path.join(targetRoot, 'packages');
  if (!existsSync(packagesRoot)) {
    return [];
  }
  return readdirSync(packagesRoot)
    .map((entry) => `packages/${entry}`)
    .filter((relative) => exists(`${relative}/composer.json`));
}

function detectWordPressPackage() {
  if (exists('style.css') && /^Theme Name:/m.test(read('style.css'))) {
    return 'theme';
  }
  const pluginFiles = listFiles('.', (file) => file.endsWith('.php') && !file.includes('vendor/'));
  for (const file of pluginFiles) {
    if (/^(\s*\*\s*)?Plugin Name:/m.test(read(file))) {
      return 'plugin';
    }
  }
  return '';
}

function workflowFiles() {
  return listFiles('.github/workflows', (file) => file.endsWith('.yml') || file.endsWith('.yaml'));
}

function addFinding(findings, severity, message) {
  findings.push({ severity, message });
}

function findingTriggersFailure(finding) {
  if (options.failOn === 'none') {
    return false;
  }
  return severityRank[finding.severity] >= severityRank[options.failOn];
}

const findings = [];
const suggestions = [];
const packages = packageDirectories();
const workflowTexts = workflowFiles().map((file) => [file, read(file)]);
const hasRootComposer = exists('composer.json');
const hasPackageJson = exists('package.json');
const hasJsLockfile = hasAny(['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock']);
const wordpressPackage = detectWordPressPackage();

if (hasRootComposer || packages.length > 0) {
  suggestions.push('Use `sympress-qa.yml` for Composer QA.');
}
if (packages.length > 0) {
  suggestions.push(`Detected ${packages.length} Composer package(s); prefer \`package_glob: packages/*\`.`);
}
if (hasRootComposer && packages.length > 0) {
  suggestions.push('For application monorepos, split root `composer-validate.yml` from package-level `sympress-qa.yml`.');
}
if (hasPackageJson) {
  suggestions.push('Use `javascript-static-analysis.yml`, `javascript-unit.yml`, `wp-scripts-lint.yml`, or asset workflows when package scripts exist.');
}
if (wordpressPackage) {
  suggestions.push(`Detected a WordPress ${wordpressPackage}; use \`wordpress-archive.yml\` plus \`wordpress-archive-check.yml\`.`);
}
if (exists('.wp-env.json')) {
  suggestions.push('Detected `.wp-env.json`; `playwright.yml` can boot wp-env before tests.');
}
if (exists('.ddev/config.yaml') || exists('.ddev/config.yml')) {
  suggestions.push('Detected DDEV; use `ddev-playwright.yml` for browser smoke tests.');
}
if (exists('deployment/composer.json') || exists('deploy.php')) {
  suggestions.push('Detected deployment files; use `deploy-deployer.yml` behind a protected GitHub environment.');
}

if (hasPackageJson && !hasJsLockfile) {
  addFinding(
    findings,
    'high',
    'package.json exists without a JavaScript lockfile. Add a lockfile or set `allow_unpinned_node_install: true` only for trusted callers.',
  );
}

for (const [file, text] of workflowTexts) {
  if (/sympress\/workflows\/\.github\/workflows\/[^@\s]+@main\b/.test(text)) {
    addFinding(findings, 'high', `${file} calls SymPress Workflows with @main; pin to @v1, @v1.x.y, or a commit SHA.`);
  }
  if (/secrets:\s*inherit/.test(text)) {
    addFinding(findings, 'medium', `${file} uses secrets: inherit; prefer explicit secret mapping for SymPress Workflows.`);
  }
  if (/permissions:\s*write-all/.test(text)) {
    addFinding(findings, 'high', `${file} grants write-all permissions; use workflow-specific least privilege.`);
  }
  if (/allow_(custom_command|custom_commands|inline_scripts|custom_deploy_command):\s*true/.test(text)) {
    addFinding(findings, 'medium', `${file} enables shell-command overrides; keep this on protected branches only.`);
  }
}

if (hasRootComposer) {
  if (!exists('composer.lock')) {
    addFinding(findings, 'medium', 'Root composer.json exists without composer.lock; CI will resolve floating dependencies.');
  }
  if (!hasComposerScript('composer.json', ['cs', 'cs:audit', 'phpcs'])) {
    addFinding(findings, 'info', 'No root Composer coding-standard script detected; focused PHPCS will fall back to config/binary discovery.');
  }
  if (!hasComposerScript('composer.json', ['phpstan', 'stan', 'static-analysis', 'cs:analyze'])) {
    addFinding(findings, 'info', 'No root Composer static-analysis script detected; PHPStan will fall back to config discovery.');
  }
}

const baselinePermissions = [
  'QA and archive creation: `contents: read`.',
  'Archive check and QIT: add `actions: read`; archive check also needs `checks: write` when annotating.',
  'Artifact attestations: add `actions: read`, `attestations: write`, and `id-token: write` only when `artifact_attestation` is enabled.',
  'Release: `contents: write`, `issues: write`, `pull-requests: write`.',
  'Deploy: `contents: read` plus a protected GitHub environment.',
];
const failingFindings = findings.filter(findingTriggersFailure);
const report = {
  target: targetRoot,
  workflowSource: ownRoot,
  suggestions,
  findings,
  baselinePermissions,
  failOn: options.failOn,
  status: failingFindings.length > 0 ? 'failed' : 'passed',
};

if (options.format === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`# SymPress workflow doctor`);
  console.log('');
  console.log(`Target: ${targetRoot}`);
  console.log(`Workflow source: ${ownRoot}`);
  console.log('');
  console.log('## Recommended workflows');
  if (suggestions.length === 0) {
    console.log('- No obvious SymPress workflow target detected.');
  } else {
    for (const suggestion of suggestions) {
      console.log(`- ${suggestion}`);
    }
  }
  console.log('');
  console.log('## Findings');
  if (findings.length === 0) {
    console.log('- No risky caller patterns detected.');
  } else {
    for (const finding of findings) {
      console.log(`- [${finding.severity}] ${finding.message}`);
    }
  }
  console.log('');
  console.log('## Baseline permissions');
  for (const permission of baselinePermissions) {
    console.log(`- ${permission}`);
  }
  if (options.failOn !== 'none') {
    console.log('');
    console.log(`## Exit policy`);
    console.log(
      failingFindings.length > 0
        ? `- Failed because ${failingFindings.length} finding(s) met --fail-on ${options.failOn}.`
        : `- Passed --fail-on ${options.failOn}.`,
    );
  }
}

if (failingFindings.length > 0) {
  process.exit(1);
}
