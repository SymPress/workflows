# Workflows 1.2.5

- Audit dependencies and generate the production CycloneDX SBOM in a separate job before application build code runs.
- Seal the audited lockfiles and Composer inventory in an independently uploaded artifact.
- Verify the completed release in a fresh job against that artifact before signing or deployment. Modified locks, missing packages and a replaced SBOM fail verification.
- Keep fetch credentials, trusted deployment tools and application build execution isolated; callable inputs and outputs remain compatible.
- Update the documentation toolchain to the patched KaTeX 0.18.2 dependency.

The SBOM describes audited dependency inputs. It does not certify the behavior of generated application code. Non-npm JavaScript inventories continue to be marked incomplete.
