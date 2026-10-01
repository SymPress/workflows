# Dependency compatibility canary

Run this workflow on a weekly schedule to check current stable Composer
dependencies, required QA tools, and the dependency audit. The existing QA
workflow accepts `update_dependencies: true`; ordinary pull-request checks keep
their committed lock behavior. Optional Node builds use the committed lock.

The caller grants `issues: write` only to this reusable workflow. Its build job
has read permissions. The separate incident job has no checkout, dependency
installation, or Composer authentication. A failed or cancelled check opens one
incident. Repeated failures leave it unchanged; recovery closes it with the
successful run. Repository notification subscriptions determine who receives
GitHub notifications.

```yaml
name: Dependency compatibility
on:
  schedule:
    - cron: '17 3 * * 3'
  workflow_dispatch:
permissions:
  contents: read
jobs:
  compatibility:
    permissions:
      contents: read
      issues: write
    uses: sympress/workflows/.github/workflows/dependency-canary.yml@REVIEWED_COMMIT_SHA
    with:
      php_version: '8.5'
```

Replace `REVIEWED_COMMIT_SHA` with the reviewed, published workflow commit. A
private Composer dependency can use the optional read-only
`COMPOSER_AUTH_JSON` secret. It is unnecessary for public packages.
