---
name: android-development
description: Token-efficient Android CLI workflow for setup, validation, device work, visual checks, and modernization.
---

# Android Development

Keep context small. Read only the next file, command output, screenshot, or XML slice you need. If Android or Copilot behavior is unclear, check official docs first with GitHub Docs, Context7, web tools, browser tools, or GitHub MCP.

## Use It When

- The repo is a fresh clone or the Android toolchain is unclear.
- You need a standard Android CLI workflow without custom scripts.
- You need a small, repeatable path for build, test, device work, or modernization.

## Default Flow

1. Discover installed tools if the environment is unclear.

   ```bash
   java -version
   adb version
   adb devices -l
   ```

2. Find the Android project root.

   ```bash
   find . -maxdepth 4 \( -name gradlew -o -name settings.gradle -o -name settings.gradle.kts \)
   ```

3. Open only the next reference you need, then run the smallest task that answers the question.

## Working Rules

- Prefer standard upstream commands over custom wrappers.
- Prefer `./gradlew` over global `gradle`.
- In multi-sample or monorepo layouts, first find the nearest Android project root with `gradlew` plus `settings.gradle(.kts)`.
- Prefer explicit device targeting with `adb -s <serial>`.
- Prefer file reads and `./gradlew help --task <task>` over broad Gradle inspection.
- Prefer screenshot-first UI inspection. Reduce screenshots to a max dimension of 512px by default.
- Keep hierarchy dumps on disk, search them first, then read only matching slices.
- Prefer bounded logs and generated reports over long console output.
- Prefer stable, idempotent device flows: force-stop, start, verify, then capture.
- Prefer one finite test or capture sequence, not shell loops.
- Avoid destructive emulator actions such as `-wipe-data` unless the user asks for them.

## Progressive Disclosure

Open only the next reference you need:

- `references/setup-update.md` for environment setup, required tools, package installation, and updates.
- `references/nested-repo-discovery.md` for sample catalogs, monorepos, nested wrappers, and choosing the right Android project root.
- `references/build-lint-test.md` for wrapper tasks, lint, unit tests, instrumentation tests, and report locations.
- `references/device-emulator-control.md` for device discovery, AVD creation, emulator lifecycle, and boot readiness.
- `references/on-device-interaction-visual-testing.md` for adb interaction, screenshot-first UI triage, hierarchy dumps, and bounded logs.
- `references/modernization.md` for legacy Gradle or Android build logic, wrapper or AGP replacement, and best-practice upgrades.
- `references/troubleshooting.md` for a short symptom router.

## Modernization Trigger

Switch to `references/modernization.md` when you see any of these:

- very old Gradle wrapper or AGP
- `jcenter()` or `flatDir`
- `compile` or `testCompile`
- missing `namespace`
- support libraries instead of AndroidX
- heavy root `allprojects` or `subprojects` build logic
