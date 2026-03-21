# android-development

Cross-platform Android development skill for GitHub Copilot and other skills-compatible agents.

It provides a small Python helper for common Android workflows:

- bootstrap Android tooling on fresh clones
- resolve a compatible Java runtime for Gradle
- run build and lint with the Gradle wrapper
- capture screenshots, hierarchy dumps, and bounded logcat
- batch adb UI actions
- start emulators and send emulator console commands

## Layout

- `SKILL.md`: the skill instructions shown to the agent
- `scripts/android_tooling.py`: the helper CLI
- `references/`: short setup and troubleshooting notes

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

## Copilot CLI note

If you test the skill with non-interactive `copilot -p`, preapprove permissions for shell and path access.

```bash
copilot -p "Use the android-development skill ..." --allow-all
```

The narrower equivalent is:

```bash
copilot -p "Use the android-development skill ..." --allow-all-tools --allow-all-paths
```

Without those flags, Copilot CLI can deny helper execution in non-interactive mode because it cannot pause to request approval.

## Helper usage

```bash
python scripts/android_tooling.py --help
python scripts/android_tooling.py doctor --repo /path/to/android/repo
```

## Development

Validate the helper locally:

```bash
python3 -m py_compile scripts/android_tooling.py
python3 scripts/android_tooling.py --help
```