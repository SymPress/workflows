# Security Policy

## Supported Versions

The `main` branch is the supported development line for reusable workflows.
Consumers should pin workflow calls to a tag or commit once releases are cut.

## Reporting a Vulnerability

Please report workflow or supply-chain vulnerabilities privately through the
repository security advisory flow when available. Include the affected workflow,
the calling repository context, and a minimal reproduction.

## Workflow Security Baseline

- Workflows request the smallest useful permissions by default.
- Release, build-branch, and deployment workflows require explicit write
  credentials from the caller.
- Secrets are passed through `workflow_call` and are not printed.
- Optional environment variable JSON is parsed through `actions/github-script`
  so values can be masked before use.

