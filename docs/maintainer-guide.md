# Maintainer Guide

This guide is for people changing this repository.

## Local Setup

```bash
npm ci
```

Run all repository checks:

```bash
npm run test:contracts
npm run check:interfaces
npm run lint:workflows
npm run lint:docs
npm run doctor:repo
npm run doctor -- --fail-on high fixtures/wp-plugin
npm audit --audit-level=moderate
```

## Repository Layout

| Path | Purpose |
| --- | --- |
| `.github/workflows` | Callable workflows and repository checks. |
| `docs` | User-facing documentation. |
| `examples` | Copyable caller workflow examples. |
| `fixtures` | Minimal projects used by contract tests and policy examples. |
| `scripts/doctor.mjs` | Consumer repository diagnostics and workflow recommendations. |
| `scripts/validate-contracts.mjs` | Structural workflow and documentation checks. |
| `scripts/validate-consumers.mjs` | Checks downstream calls against generated interfaces. |
| `workflow-catalog.json` | Workflow category, trust, and permission catalog. |
| `workflow-interfaces.json` | Generated `workflow_call` inputs, secrets, and outputs. |

## Change Rules

- Keep callable workflows directly under `.github/workflows`.
- Every shared workflow must use `workflow_call`.
- Default to `permissions: contents: read`.
- Gate free-form shell inputs with an explicit `allow_*` input.
- Do not interpolate workflow inputs directly into `run` scripts.
- Keep lockfile-less Node installs behind `allow_unpinned_node_install`.
- Keep artifact uploads hidden-file-safe by default.
- Keep artifact manifest and secret-content scanning enabled by default.
- Keep artifact attestation opt-in and isolated to jobs with attestation
  permissions.
- Do not reintroduce removed static-analysis or generic PHP lint workflows.
- Update docs and examples with every workflow input or behavior change.
- Update `workflow-catalog.json` when workflows are added, renamed, or removed,
  then run `npm run generate:interfaces`.
- Add contract-test coverage for new security or DX assumptions.

## Adding A Workflow

1. Add `.github/workflows/<name>.yml`.
2. Define `on.workflow_call` inputs, secrets, and outputs.
3. Set minimal permissions.
4. Add a documentation page under `docs`.
5. Add a caller example when the workflow is user-facing.
6. Add an entry to `workflow-catalog.json`.
7. Extend `scripts/validate-contracts.mjs` for new invariants.
8. Run all checks.

## Updating Pinned Dependencies

Pinned workflow tooling includes semantic-release packages, QIT, and zizmor.
When updating a pin:

1. Change the ref or package version.
2. Record why the update is safe in the pull request.
3. Run repository checks.
4. Test at least one consumer repository on a branch before tagging.

## Release Process

1. Merge changes into `main`.
2. Confirm repository checks are green.
3. Create or let semantic-release create the release tag.
4. Publish migration notes for behavior changes.
5. Upgrade one low-risk consumer repository first.

## Documentation Standard

Docs should answer:

- What problem does this workflow solve?
- When should it be used?
- What inputs and secrets matter most?
- What permissions does the caller need?
- What are the safe defaults?
- What is the minimal copyable example?
