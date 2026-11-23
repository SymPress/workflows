# Workflows 2.0.0

## Breaking changes

- `automatic-release.yml`: the locked release tooling moves to semantic-release
  26.0.1, which requires Node `>=26.13`. The `node_version` input now defaults to
  `26`. Callers that pass `node_version: '22'` or `'24'` must raise it to `26` or
  drop the input; with an older Node the release job fails before it publishes.
- semantic-release 26 now checks after the push-permission check that the local
  branch is up to date with the remote branch. A release run whose commit is no
  longer the tip of the release branch stops instead of releasing the older commit.

## Dependencies

- `automatic-release.yml` release tooling: semantic-release 26.0.1 (bundles the
  `@semantic-release/core` engine) and `@semantic-release/github` 12.0.11. The
  release-tooling audit gate reports no moderate or higher advisories.

## Repository

- The contracts job runs the locked release tooling tests on Node 26.
- Repository CI action pins are updated (CodeQL, text-quality).

All other workflows keep their inputs, secrets, outputs and defaults.
