# Support

SymPress Workflows is shared automation infrastructure. Good support requests
include the caller workflow, the called workflow version, the failing run, and
the expected outcome.

## Before Opening An Issue

1. Check [Troubleshooting](docs/troubleshooting.md).
2. Run the doctor against the caller repository:

   ```bash
   npm run doctor -- /path/to/consumer-repository
   ```

3. Confirm the caller pins `sympress/workflows` to a tag or commit SHA.
4. Confirm the caller grants only the permissions required by the workflow.
5. Search existing issues and pull requests.

## Where To Ask

- Reproducible workflow failures: open a bug report.
- Missing workflow coverage or adoption problems: open a feature request.
- Documentation gaps: open a documentation issue.
- Security issues: use the private vulnerability reporting flow described in
  [SECURITY.md](SECURITY.md).

## What Maintainers Need

- Link to the failed GitHub Actions run.
- The caller workflow YAML, with secrets removed.
- The `sympress/workflows` ref being used.
- Relevant inputs, permissions, and event type.
- Logs from the failing step.
- Whether the issue reproduces with the latest release tag.
