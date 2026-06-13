# Pull Request

## Summary

<!-- Describe the change and why it belongs in SymPress Workflows. -->

## Type Of Change

- [ ] Bug fix
- [ ] Workflow feature
- [ ] Documentation
- [ ] Security hardening
- [ ] Developer experience
- [ ] Maintenance
- [ ] Breaking change

## Workflow Impact

- [ ] No caller-facing behavior change
- [ ] Adds or changes workflow inputs, secrets, outputs, or permissions
- [ ] Changes artifact contents, release behavior, or deployment behavior
- [ ] Requires migration notes or a release note

## Security Checklist

- [ ] External actions remain pinned to full commit SHAs.
- [ ] Free-form shell input remains gated by an explicit `allow_*` input.
- [ ] Workflow inputs are not interpolated directly into `run` scripts.
- [ ] New permissions are documented and scoped to the smallest job.
- [ ] Artifact behavior keeps secret-file and secret-content protections.

## Verification

<!-- Check all that apply and list exact commands/results below. -->

- [ ] `npm run lint:workflows`
- [ ] `npm run test:contracts`
- [ ] `npm run lint:docs`
- [ ] `npm run doctor:repo`
- [ ] `npm audit --audit-level=moderate`
- [ ] Focused consumer or fixture test

```text
Paste verification notes here.
```

## Notes

<!-- Add open questions, tradeoffs, or follow-up work. -->
