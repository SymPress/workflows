# Automatic Release

Use `automatic-release.yml` for semantic-release based releases.

```yml
jobs:
  release:
    uses: sympress/workflows/.github/workflows/automatic-release.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
    with:
      workflow_ref: 177fa0d727b278d2103052ec77c102b4a4c492a0
    secrets:
      GITHUB_USER_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

If the repository has `release.config.cjs`, it is used. Otherwise, the workflow
copies the built-in SymPress config and helper script from the pinned
`workflow_ref` input. The example explicitly pins that input to the same reviewed
commit as the workflow call, selecting its configuration and locked toolchain.
The compatibility default remains `v1`; set the input explicitly when adopting
the reviewed version.

The fallback config:

- supports `main`, `next`, `beta`, and `alpha`;
- generates changelog entries;
- creates GitHub releases;
- updates `composer.json`, `package.json`, `package-lock.json`, and WordPress headers when present;
- commits release files with `[skip ci]`.

The fallback updates `package.json` and `package-lock.json` through its version
helper when present. It releases on GitHub and does not publish npm packages or
create the former unused npm tarball. Consumer configs requesting
`@semantic-release/npm` fail with a migration message; use a separate reviewed
workflow for npm publication.

semantic-release includes an npm plugin dependency even when it is never used.
The tool manifest explicitly replaces that unused dependency with a committed
local guard package, whose truthful name is
`@sympress/release-disabled-npm-plugin`. Calling that guard fails. This removes
the unused bundled npm engine without forcing a different npm version into an
upstream range. Both configuration paths pass locked installs, audits and actual
local Git dry runs.

The workflow serializes releases per ref. Both consumer and fallback configs use
the committed tooling manifest and transitive lockfile from `workflow_ref`,
installed with `npm ci --ignore-scripts` before release credentials are loaded.
Pin both the workflow call and `workflow_ref` to the same reviewed immutable SHA
or protected release tag. Dependabot monitors the tooling manifest separately.

HTTPS Git authentication uses a private temporary credential helper containing
only environment-variable references. Its token is scoped to the release step;
Git remotes and arguments remain credential-free, including authentication
failure. The wrapper keeps tokens out of semantic-release's core Git environment
and supplies the GitHub API token only to the official GitHub plugin. Consumer
plugins and release configs are trusted release code and can read step credentials.
The helper, tooling directory, signing files, and optional SSH agent are cleaned
up afterward. Production callers should pin both refs to a reviewed full commit SHA.
See [Release Strategy](release-strategy.md).

Release tooling has a separate moderate-severity audit gate. Do not publish a new
workflow tag while that gate fails.

The locked toolchain pairs Conventional Commits preset `10.4.0` with the official
`@semantic-release/release-notes-generator` prerelease `15.0.0-beta.3`. Its declared
Writer 9 dependency supports the preset's render functions. Stable generator
`14.1.1` still uses Writer 8 and fails when generating notes with preset 10. The
prerelease is an exact pin, with no forced writer override. See the
[upstream migration](https://github.com/semantic-release/release-notes-generator/releases/tag/v15.0.0-beta.2)
and [beta.3 release](https://github.com/semantic-release/release-notes-generator/releases/tag/v15.0.0-beta.3).

Use Node `^22.22.2` or `>=24.15`; the default Node 24 setup selects a supported
release. Native preset support covers `angular` and `conventionalcommits`, and
the omitted-preset default remains Angular. Consumers with custom `writerOpts`
must migrate Handlebars template strings to
[Writer 9 render functions](https://conventional-changelog.js.org/changelog-writer/).
Preset 10 also replaces `presetConfig.types[].hidden` and `bumpStrict` with
`effect`; review any custom preset configuration before adopting this toolchain.

`npm run test:release` executes the workflow's real tooling copy and locked
installation, then checks native patch, minor and breaking-change notes, GitHub
links and the Angular default. Local semantic-release dry runs exercise both
fallback and consumer configurations with the real notes plugin and local Git
remotes. Release credentials and publication hooks are excluded from the fixture;
it proves generation and orchestration, while hosted release permissions still
need the consumer branch check described in the maintainer guide.
