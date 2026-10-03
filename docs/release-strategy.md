# Release Strategy

SymPress Workflows are production infrastructure. Consumers should get stable
tags, clear migration notes, and a fast path for urgent fixes.

## Versioning

- `main` is the integration branch.
- Release tags follow the organization's `v`-prefixed SemVer convention, for example `v1.4.0`. Existing immutable tags remain unchanged.
- Major aliases keep the `v` prefix, for example `v1`.
- Patch releases fix workflow bugs without changing defaults.
- Minor releases add workflows, inputs, docs, or safer opt-in behavior.
- Major releases may change defaults or remove deprecated inputs.

## Caller Pinning

Production repositories should call workflows with a reviewed full commit SHA:

```yml
jobs:
  qa:
    uses: sympress/workflows/.github/workflows/sympress-qa.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
```

Use `@main` only while testing a new workflow or validating an upcoming change.
See [Usage](usage.md) for pinning options and tradeoffs.

## Major Alias Ownership

The `v1` alias intentionally moves after verified releases; immutable version tags
must remain protected separately. Restrict alias updates and deletion to the
trusted release owner with a dedicated tag ruleset and an explicit `Always`
bypass for that owner or the repository admin role. Confirm the owner's effective
permission before enabling the rule so routine releases remain possible for a
single maintainer. Do not add a second-person approval requirement. These are
configuration requirements, not a statement that every consumer has enabled them.
GitHub describes the available actors and tag rules in its
[repository ruleset API](https://docs.github.com/en/rest/repos/rules).

SHA-pinned callers must still receive reviewed dependency updates after an alias
release. A workflow SHA from a superseded candidate branch should be replaced
with the tested, published release commit, even if the candidate remains reachable.

## Release Automation

`automatic-release.yml` runs semantic-release with pinned packages. The fallback
config supports `main`, `next`, `beta`, and `alpha` branches, writes changelogs,
creates GitHub releases, and updates package metadata when present.

## Deprecations

When an input needs to be replaced, keep the old input for one minor line when
possible. Document the replacement in the affected workflow doc and in the
release notes. Security-sensitive defaults may change faster.
