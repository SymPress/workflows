import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

for (const name of ['COMPOSER_AUTH', 'INSTALL_SSH_KEY', 'GITHUB_USER_SSH_KEY',
  'NODE_AUTH_TOKEN', 'NPM_TOKEN', 'SSH_AUTH_SOCK']) {
  assert(!process.env[name], name + ' must be absent from the build job');
}
mkdirSync('dist', { recursive: true });
writeFileSync('dist/build.json', JSON.stringify({ commit: process.env.GITHUB_SHA }));
// These inert files must be filtered out of the release artifact.
writeFileSync('.env.probe', 'ARTIFACT_SENTINEL=fixture-private-value\n');
writeFileSync('auth.json', '{"fixture-private-value":true}\n');
writeFileSync('.npmrc', '//fixture.invalid/:_authToken=fixture-private-value\n');
// A valid, attested archive can still contain deployment-code tampering.
// None of these files may execute in the deployment job.
const tampered = '<?php throw new \\RuntimeException("Build-controlled deployment code executed");\n';
for (const file of ['deploy.php', 'verify.php', 'vendor/bin/dep', 'vendor/deployer/deployer/bin/dep']) {
  writeFileSync(file, tampered);
}
