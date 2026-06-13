# Release Strategy

SymPress Workflows are production infrastructure. Consumers should get stable
tags, clear migration notes, and a fast path for urgent fixes.

## Versioning

- `main` is the integration branch.
- Release tags follow SemVer, for example `v1.4.0`.
- Patch releases fix workflow bugs without changing defaults.
- Minor releases add workflows, inputs, docs, or safer opt-in behavior.
- Major releases may change defaults or remove deprecated inputs.

## Caller Pinning

Production repositories should call workflows with a tag:

```yml
jobs:
  qa:
    uses: sympress/workflows/.github/workflows/sympress-qa.yml@v1
```

Use `@main` only while testing a new workflow or validating an upcoming change.
See [Usage](usage.md) for pinning options and tradeoffs.

## Release Automation

`automatic-release.yml` runs semantic-release with pinned packages. The fallback
config supports `main`, `next`, `beta`, and `alpha` branches, writes changelogs,
creates GitHub releases, and updates package metadata when present.

## Deprecations

When an input needs to be replaced, keep the old input for one minor line when
possible. Document the replacement in the affected workflow doc and in the
release notes. Security-sensitive defaults may change faster.
