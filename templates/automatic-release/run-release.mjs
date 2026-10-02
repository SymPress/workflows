import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { cosmiconfig } from 'cosmiconfig';
import semanticRelease from 'semantic-release';

const directory = path.dirname(fileURLToPath(import.meta.url));
const gitTokenNames = ['GIT_CREDENTIALS', 'GITHUB_TOKEN', 'GH_TOKEN', 'GL_TOKEN', 'GITLAB_TOKEN', 'BB_TOKEN', 'BITBUCKET_TOKEN', 'BB_TOKEN_BASIC_AUTH', 'BITBUCKET_TOKEN_BASIC_AUTH'];
export function gitEnvironment(environment) {
  const result = { ...environment };
  for (const name of gitTokenNames) delete result[name];
  return result;
}
function plugin(value, configFile) {
  const replacement = path.join(directory, 'github-auth-plugin.mjs');
  if (value === '@semantic-release/github') return replacement;
  if (value === '@semantic-release/npm') throw new Error('npm publication is not supported by this GitHub release workflow; use a separate reviewed publishing workflow.');
  if (Array.isArray(value)) return [plugin(value[0], configFile), ...value.slice(1)];
  if (value && typeof value === 'object' && typeof value.path === 'string') return { ...value, path: plugin(value.path, configFile) };
  if (typeof value === 'string') {
    try {
      return createRequire(import.meta.url).resolve(value);
    } catch {
      return createRequire(configFile).resolve(value);
    }
  }
  return value;
}
export async function configuration(file, seen = new Set()) {
  const absolute = path.resolve(file);
  if (seen.has(absolute)) throw new Error('Release configuration extends a cycle.');
  seen.add(absolute);
  const loaded = await cosmiconfig('release').load(absolute);
  if (!loaded || !loaded.config || typeof loaded.config !== 'object') throw new Error('Release configuration must be an object.');
  let merged = {};
  const extensions = loaded.config.extends ? [loaded.config.extends].flat() : [];
  const require = createRequire(absolute);
  for (const extension of extensions) {
    const resolved = require.resolve(extension);
    merged = { ...merged, ...await configuration(resolved, new Set(seen)) };
  }
  const options = { ...merged, ...loaded.config };
  delete options.extends;
  if (!options.plugins) options.plugins = ['@semantic-release/commit-analyzer', '@semantic-release/release-notes-generator', '@semantic-release/github'];
  options.plugins = options.plugins.map(value => plugin(value, absolute));
  for (const name of ['verifyConditions', 'analyzeCommits', 'verifyRelease', 'generateNotes', 'prepare', 'publish', 'addChannel', 'success', 'fail']) {
    if (options[name]) options[name] = [options[name]].flat().map(value => plugin(value, absolute));
  }
  if (options.repositoryUrl && /https?:\/\/[^/]*@/.test(options.repositoryUrl)) throw new Error('Release repositoryUrl must be credential-free.');
  return options;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = await configuration(process.env.RELEASE_CONFIG || 'release.config.cjs');
    await semanticRelease({ ...options, ci: true, dryRun: process.env.SYMPRESS_RELEASE_DRY_RUN === 'true' }, { cwd: process.cwd(), env: gitEnvironment(process.env) });
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
