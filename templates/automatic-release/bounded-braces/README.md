# Bounded braces derivative

This local MIT-licensed derivative replaces the unpatched npm `braces` dependency
in the repository lint and release toolchains. Upstream 3.0.3 source and license
are preserved under `vendor/`; the public wrapper validates patterns and ASTs
iteratively before any upstream recursive walker runs. Inputs deeper than 64 or
larger than 65,536 characters/nodes, nested pattern arrays and AST cycles fail
with a bounded error. Normal brace/range matching retains the upstream behavior.
Consumers cannot disable the limits through upstream options.

Reason: [CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
reviewed 2026-10-02, with no patched npm version at implementation time.
This is a source patch, not an audit exclusion. The original recursive helpers
must only be invoked through the guarded public API. Remove this derivative when
a reviewed upstream patch offers equivalent protection; rerun the regression,
Markdown glob and semantic-release dry-run tests first.
