# 1.2.0 release notes

- Audit Composer production and Node dependencies before deploying; include a
  CycloneDX production inventory in every release archive.
- Compare the final build archive digest before extraction; optionally attest
  provenance and SBOM in an isolated job and verify the exact signer/source commits.
- Keep dependency credentials, authorized build code and deployment secrets in
  separate jobs. Private packages are not published or made available to consumers.
- Replace the unpatched `braces` recursion issue in repository lint/release tooling
  with an MIT derivative that enforces bounded string/AST nesting. Preserve the
  upstream sources/license and test the packaged bytes against reviewed sources.
  No vulnerability exclusion is introduced.
- Standardize new automatic release tags on `v`-prefixed SemVer. Existing tags stay
  immutable; the reusable `v1` compatibility ref remains separately maintained.

Validation includes actual artifact round trips, tampered archives, signature
failure paths, Composer dev-inventory rejection, pnpm/Yarn builds, recursion
regressions and semantic-release dry runs. The hosted local Deployer fixture must
also demonstrate attestation and verification before publishing the release.
