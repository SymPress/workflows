# Automatic Release

Use `automatic-release.yml` for semantic-release based releases.

```yml
jobs:
  release:
    uses: sympress/workflows/.github/workflows/automatic-release.yml@v1
    secrets:
      GITHUB_USER_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

If the repository has `release.config.cjs`, it is used. Otherwise, the workflow
copies the built-in SymPress config and helper script from the pinned
`workflow_ref` input. The default is `v1`, so create the workflow tag
before relying on the fallback config in production.

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
up afterward. Production callers should pin this workflow to a release tag.
See [Release Strategy](release-strategy.md).

Release tooling has a separate moderate-severity audit gate. Do not publish a new
workflow tag while that gate fails.
