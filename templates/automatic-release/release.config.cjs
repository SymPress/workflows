module.exports = {
  branches: [
    'main',
    'next',
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true }
  ],
  tagFormat: '${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    '@semantic-release/changelog',
    ['@semantic-release/npm', {
      npmPublish: false,
      tarballDir: 'release'
    }],
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
  ]
};

