# Workflows 1.4.0

## Security

- `build-and-distribute.yml`: the push job replaces `.github` in the build branch tree with the directory from the source commit. A build script can no longer plant a workflow or local action that a push with `GITHUB_USER_TOKEN` or `GITHUB_USER_SSH_KEY` would start with the caller's secrets.
- `build-and-distribute.yml` and `wordpress-archive.yml` reject a `package_version` outside `[0-9A-Za-z][0-9A-Za-z.+_-]*`. Such values reached a `sed` replacement and could run shell commands through GNU sed's `e` command.
- `automatic-release.yml`: `workflow_repository` and `workflow_ref` now default to the repository and commit of the called workflow instead of the movable `v1` tag, so release templates and locked tooling always match the pinned workflow. Explicit inputs still win; the release example drops the redundant `workflow_ref`.
- `deploy-deployer.yml`: new optional `allowed_refs` input (whitespace-separated `GITHUB_REF` globs). The deploy job fails before it checks out the deployment source or loads a key when the ref matches none. Empty, the default, allows every ref. `docs/deploy.md` now recommends environment secrets with reviewers and a `main`-only branch policy; the production example sets `allowed_refs` and stops passing deployment secrets from the caller.
- `playwright.yml`, `javascript-unit.yml`, `javascript-static-analysis.yml` and `wp-scripts-lint.yml` remove `GITHUB_USER_SSH_KEY` from the agent right after the dependency install; builds, tests, linters and `pre_script` run without it.

## Fixes

- `build-and-distribute.yml`: the build branch is created from the checked staging directory instead of the workspace. Build output ignored by the source `.gitignore` (such as `vendor/` or `build/`) now reaches the branch, and `.distignore`, `artifact_extra_excludes` and the secret checks apply to it. **Visible change:** the branch holds the same filtered files as the artifact, without the per-run manifest files. With a `working_directory`, only that directory is replaced.
- `build-and-distribute.yml`: a push job whose source commit is no longer the tip of the source branch skips the push, so an older build that finishes late no longer covers a newer one.

## Repository

- Action pin comments name exact versions (`# v1.23.0` instead of `# v1`), checked by the contract test; the required "Audit workflow security" check is green again. zizmor is pinned to 1.32.0.
- Docs and examples pin this release; a contract test keeps them on the version of the newest release notes. Until `v1.4.0` is tagged they show `<release-sha>`, to be replaced with the tag commit.
- Also includes the 1.3.2 release-notes update (`99c3a62`).

Callable inputs, secrets and outputs stay compatible; `allowed_refs` is new.
