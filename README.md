# ai-skills

Monorepo for installable Copilot skills.

`npx skills add` discovers skills recursively from the repository root by `SKILL.md` plus frontmatter `name`, so skills can live at any depth.

## Install

Install from GitHub by skill name:

```bash
npx skills add AntonPieper/ai-skills --skill android-development
```

List all skills in the repository:

```bash
npx skills add AntonPieper/ai-skills --list
```

Install from a local clone:

```bash
npx skills add "$PWD" --skill android-development -g -a github-copilot -y
```

List from a local clone:

```bash
npx skills add "$PWD" --list
```

## Layout

```text
skills/
  android/
    android-development/
      SKILL.md
      references/
validation/
  android-development/
    smoke.sh
scripts/
  validate-skills-catalog.sh
```

Rules:

- Only files under `skills/.../<skill>/` are installable payload.
- Keep validation, smoke tests, and contributor docs outside `skills/`.
- Group skills by topic or platform, but keep each leaf skill directory named after the skill when practical.

## Validation

Catalog validation:

```bash
./scripts/validate-skills-catalog.sh
```

android-development smoke matrix:

```bash
./validation/android-development/smoke.sh
```

Useful overrides:

```bash
JOBS=2 TIMEOUT_SECONDS=240 ./validation/android-development/smoke.sh
REPOS=termux,cleanarchitecture SCENARIOS=discovery,modernization ./validation/android-development/smoke.sh
RUN_ROOT="$PWD/tmp/android-smoke" ./validation/android-development/smoke.sh
```
