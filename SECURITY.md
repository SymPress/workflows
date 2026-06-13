# Security Policy

## Supported Versions

The `main` branch is the supported development line for SymPress Workflows.
Consumers should pin workflow calls to a tag or commit once releases are cut.

| Version | Supported |
| ------- | --------- |
| Latest default branch | Yes |
| Latest tagged release | Yes |
| Older releases | Best effort |

## Reporting a Vulnerability

Please do not report security vulnerabilities in public issues.

Use GitHub private vulnerability reporting when it is enabled for this
repository. If private reporting is not available, contact the maintainers
privately before publishing details.

Helpful reports include:

- Affected workflow and ref.
- Caller repository context and event type.
- Minimal caller workflow, with secrets removed.
- Reproduction steps or proof of concept.
- Impact assessment and any known workarounds.
- Whether the issue affects permissions, secrets, shell execution, artifacts,
  releases, or deployments.

Maintainers will acknowledge valid reports as soon as possible and coordinate
disclosure after a fix or mitigation is available.

## Workflow Security Baseline

- Workflows request the smallest useful permissions by default.
- Release, build-branch, and deployment workflows require explicit write
  credentials from the caller.
- Secrets are passed through `workflow_call` and are not printed.
- Optional environment variable JSON is parsed through `actions/github-script`
  so values can be masked before use.
- External GitHub Actions are pinned to full commit SHAs.
- Free-form shell inputs require explicit `allow_*` inputs.
- Node installs require lockfiles unless a trusted caller opts out.
- Artifact workflows block secret-like files, scan staged content, and can
  create manifest attestations.
