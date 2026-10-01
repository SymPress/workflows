import * as github from '@semantic-release/github';

// semantic-release clones each plugin context. Keep the publishing token out of
// the core Git environment, where authentication failure can construct token URLs.
function invoke(name, configuration, context) {
  const env = { ...context.env, GITHUB_TOKEN: process.env.SYMPRESS_RELEASE_TOKEN };
  delete env.GH_TOKEN;
  return github[name](configuration, { ...context, env });
}
export const verifyConditions = (configuration, context) => invoke('verifyConditions', configuration, context);
export const publish = (configuration, context) => invoke('publish', configuration, context);
export const addChannel = (configuration, context) => invoke('addChannel', configuration, context);
export const success = (configuration, context) => invoke('success', configuration, context);
export const fail = (configuration, context) => invoke('fail', configuration, context);
