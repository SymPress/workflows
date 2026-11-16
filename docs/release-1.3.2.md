# Workflows 1.3.2

- `build-and-distribute.yml` no longer holds push credentials while build code runs. The read-only `Build and distribute` job runs Composer, Node, asset compiler, scoper and `pre_script` steps without `GITHUB_USER_TOKEN`, `GITHUB_USER_SSH_KEY` or `GITHUB_KNOWN_HOSTS`, and hands the build branch tree to the next job as a thin Git bundle.
- The new `Push build branch` job runs only Git. It verifies the bundle and its tree, commits onto the current build branch tip and pushes with hooks disabled. The token reaches Git through a step-scoped credential helper instead of `.git/config`, and the SSH key is loaded only in this job.
- Callable inputs, secrets and outputs remain compatible. Callers see one extra check, `Push build branch`, and a one-day `<artifact>-build-tree` artifact. Builds for the same ref may run in parallel, but pushes are serialized.

`v1.3.1` was tagged by mistake on the docs-only pin refresh before this fix was merged. Its content equals v1.3.0 plus refreshed documentation pins; use v1.3.2.
