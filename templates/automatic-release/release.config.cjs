const fs = require('node:fs');

const plugins = [
  ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
  ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
  '@semantic-release/changelog',
  ['@semantic-release/exec', {
    prepareCmd: 'node .release/update-version.cjs ${nextRelease.version}'
  }],
  '@semantic-release/github',
  ['@semantic-release/git', {
    assets: [
      'CHANGELOG.md',
      'composer.json',
      'package.json',
      'package-lock.json',
      'style.css',
      '*.php'
    ],
    message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
  }]
];

if (fs.existsSync('package.json')) {
  plugins.splice(3, 0, ['@semantic-release/npm', {
    npmPublish: false,
    tarballDir: 'release'
  }]);
}

module.exports = {
  branches: [
    'main',
    'next',
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true }
  ],
  tagFormat: '${version}',
  plugins
};
