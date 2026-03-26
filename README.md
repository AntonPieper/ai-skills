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
  build-pages-site.mjs
  process-android-scenario-artifacts.mjs
  validate-skills-catalog.sh
```

Rules:

- Only files under `skills/.../<skill>/` are installable payload.
- Keep validation, smoke tests, and contributor docs outside `skills/`.
- Group skills by topic or platform, but keep each leaf skill directory named after the skill when practical.

Authoring guidance:

- Write `description` in imperative trigger form: tell the agent when to use the skill, using user intent rather than internal implementation details.
- Keep `SKILL.md` focused on the reusable workflow and move heavier detail to targeted reference files.
- Prefer defaults and small, task-scoped procedures over menus of equal options.
- Keep evals and trigger-query sets under `validation/<skill>/evals/` so they do not ship as installable payload.

## Validation

Catalog validation:

```bash
./scripts/validate-skills-catalog.sh
./scripts/validate-validation-assets.sh
```

Scenario-based Android validation:

```bash
npm ci
./validation/android-development/smoke.sh
```

The Android scenario harness now relies on full toolchain runs instead of read-only smoke prompts. Each scenario writes its own files under `RUN_ROOT/scenarios/<scenario>/`:

- `result.json` written by the agent for structured status, checks, commands, and findings.
- `report.md` written by the agent for the user-facing narrative and embedded media.
- `raw/` for screenshots and recordings captured during the scenario.
- `media/` for optimized web output produced by `node ./scripts/process-android-scenario-artifacts.mjs <scenario-dir>`.

The current scenario mix includes:

- Toolchain validation against `architecture-samples` using real Gradle build, unit-test, and connected-test commands.
- Manual visual task creation in `architecture-samples` on the emulator.
- Manual visual named-session creation in `termux-app` on the emulator.
- Manual visual first-run secure setup in `Aegis` on the emulator.
- Modernization triage in `Android-CleanArchitecture` grounded in real Gradle metadata.

Useful overrides:

```bash
RUN_ROOT="$PWD/tmp/android-scenarios" ./validation/android-development/smoke.sh
FAIL_ON_SCENARIO_ERROR=1 ./validation/android-development/smoke.sh
TIMEOUT_SECONDS=1800 ./validation/android-development/smoke.sh
```

Skill eval assets for `android-development` live in `validation/android-development/evals/`:

- `evals.json` for output-quality eval cases and assertions.
- `trigger-queries.train.json` and `trigger-queries.validation.json` for description-trigger tuning.

The scheduled scenario workflow writes a GitHub Actions job summary and uploads the full site bundle plus the underlying scenario files, including JSON, markdown, optimized screenshots, short recordings, and the raw capture directory when a scenario produced one.

The GitHub Pages workflow publishes the generated static site from `dist/site/`, built by `node ./scripts/build-pages-site.mjs ./dist/site` in GitHub Actions.

When `build-pages-site.mjs` runs without a fresh `RUN_ROOT`, it now preserves the latest published scenario payload from GitHub Pages so content-only site deploys do not blank the dynamic example section.

For local preview, build the generated bundle first and then serve `dist/site/` over HTTP. Serving raw `site/` will skip the generated `data/latest.json` payload and bundled reports that the page expects.

```bash
npm run build:site
python3 -m http.server 4173 -d ./dist/site
```

The site build is now centered on one content model: scenario directories. The website reads structured scenario results from `data/latest.json`, renders the static product sections from the repository source, and embeds the scenario markdown reports after converting them through the unified, remark, and rehype stack with sanitization.
