# Dependency compatibility canary

Run this workflow on a weekly schedule to check current stable Composer
dependencies, required QA tools, and the dependency audit. The existing QA
workflow accepts `update_dependencies: true`; ordinary pull-request checks keep
their committed lock behavior. Optional Node builds use the committed lock.

Canary Composer update/install disable scripts and plugins while fetch-only
authentication is present. The fetch trap removes private SSH files on success
and failure; QA rejects residual files and runs without authentication variables,
SSH agent access, or custom caller secrets. Updated dependency code runs only in
this credential-free QA phase. Ordinary locked QA retains its existing install
and custom-environment behavior.

The caller grants `issues: write` only to this reusable workflow. Its build job
has read permissions. The separate incident job has no checkout, dependency
installation, or Composer authentication. A failed or cancelled check opens one
incident. Repeated failures leave it unchanged; recovery closes it with the
successful run. Repository notification subscriptions determine who receives
GitHub notifications.

The incident job only observes runs that start. A schedule that has never run, or
has stopped running, needs an independent check of the last attempt and expected
schedule. Establish the first expected run from the schedule's activation time;
an empty run history must not be treated as healthy. Report a missing or overdue
run once and remain quiet while its state is unchanged. The workflow itself does
not provide this independent scheduler heartbeat.

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
    uses: sympress/workflows/.github/workflows/dependency-canary.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
    with:
      php_version: '8.5'
```

Use a reviewed, published workflow commit in the caller. A
private Composer dependency can use the optional read-only
`COMPOSER_AUTH_JSON` secret. It is unnecessary for public packages.
