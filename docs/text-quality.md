# Text Quality

Use `text-quality.yml` when repositories need spelling and documentation checks
without mixing them into PHP or JavaScript lint jobs.

```yml
jobs:
  text-quality:
    uses: sympress/reusable-workflows/.github/workflows/text-quality.yml@v1
```

Defaults run:

- `typos` across the repository;
- CSpell against PHP, JavaScript, TypeScript, Markdown, JSON, and YAML files.

Add repository-specific vocabulary in `cspell.json`, `cspell.config.yaml`, or a
Typos config file. The workflow accepts `cspell_config` and `typos_config` when
the configuration lives outside the default lookup paths.

LanguageTool grammar review is intentionally opt-in because it is slower and
noisier for code-heavy repositories:

```yml
with:
  run_grammar: true
  grammar_language: en-US
```

Grammar review only runs for pull request events so reviewdog can attach useful
checks to the PR.
