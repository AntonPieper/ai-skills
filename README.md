# android-development skill

This repository contains one installable skill:

- `android-development/`

Only files under that directory are part of the installed skill payload. Development notes and validation tooling live outside that directory so they are not installed for skill users.

## Install

Global install for GitHub Copilot:

```bash
npx skills add /absolute/path/to/android-development -g -a github-copilot -y
```

Project install for GitHub Copilot:

```bash
cd /path/to/repo
npx skills add /absolute/path/to/android-development -a github-copilot -y
```

List the skill without installing:

```bash
npx skills add /absolute/path/to/android-development --list
```

## Validation

Skill package smoke test:

```bash
npx skills add /absolute/path/to/android-development --list
```

Local Copilot CLI single prompt:

```bash
copilot --model gpt-5-mini --reasoning-effort low -p "Use the android-development skill. Show the smallest standard commands to discover the Android toolchain and project wrapper tasks." --allow-all-tools --allow-all-paths --allow-all-urls --no-ask-user --add-dir /absolute/path/to/android-development
```

Smoke matrix with bounded timeouts, parallel runs, per-agent logs, and usage summaries:

```bash
./scripts/smoke-test-android-development.sh
```

Useful environment overrides:

```bash
JOBS=2 TIMEOUT_SECONDS=240 ./scripts/smoke-test-android-development.sh
REPOS=termux,aegis SCENARIOS=discovery,modernization ./scripts/smoke-test-android-development.sh
RUN_ROOT="$PWD/tmp/android-smoke" ./scripts/smoke-test-android-development.sh
```
