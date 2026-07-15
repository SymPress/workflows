# SymPress Workflows agent contract

## Purpose and boundaries

This repository is the CI control plane for SymPress repositories. Reusable
workflow inputs, secrets, outputs, permissions and check names are public
interfaces. Prefer the smallest existing workflow over adding another wrapper.

## Read first

- `docs/maintainer-guide.md`: layout, change and release rules.
- `workflow-catalog.json`: owned workflow inventory and trust posture.
- `workflow-interfaces.json`: generated callable interface snapshot; never edit
  it by hand.
- `scripts/validate-contracts.mjs`: security and repository invariants.
- `docs/consumer-canary.md`: downstream compatibility check and its limits.

## Verification

- Setup: `npm ci`.
- Fast after interface edits:
  `npm run generate:interfaces && npm run test:contracts`.
- Full: `npm run test:contracts && npm run check:interfaces`, then
  `npm run lint:workflows && npm run lint:docs && npm run doctor:repo`, then
  `npm audit --audit-level=moderate`.
- Validate a changed public interface against checked-out consumers with
  `npm run test:consumers -- <repo>`.

## Invariants

- Every workflow is catalogued; every consumer-facing workflow defines
  `workflow_call`.
- Default to `contents: read`; isolate jobs that need write permissions.
- Pin external actions to full commit SHAs and set checkout
  `persist-credentials: false`.
- Never interpolate inputs directly into shell scripts; pass them through `env`
  and gate free-form commands.
- Keep `composer qa` as the canonical full package check when a consumer
  exposes it.
- Regenerate `workflow-interfaces.json` after changing callable inputs, secrets
  or outputs.

## Cross-repository impact

Changes affect every repository calling `sympress/workflows@v1`. Keep renamed
or removed inputs backward compatible until a major release, run the structural
consumer canary, then exercise one real consumer branch before tagging
behavioral changes.

## Definition of done

All local checks pass, generated interfaces are current, docs/examples match
the workflow, and the relevant consumer canary succeeds.
