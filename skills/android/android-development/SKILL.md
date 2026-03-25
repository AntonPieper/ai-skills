---
name: android-development
description: Use this skill for Android CLI workflow tasks that involve finding the right project root, choosing the smallest build or test command, handling device or UI triage, or modernizing legacy Gradle or Android build logic.
---

# Android Development

Keep context small. Read only the next file, command output, screenshot, or XML slice you need. If Android or Gradle behavior is unclear, check current upstream documentation before changing files.

## Use It When

- The repo is a fresh clone and the Android project root is unclear.
- You need the smallest standard Android CLI path for build, lint, test, device, emulator, or UI-triage work.
- You need to inspect or modernize legacy Gradle, AGP, Kotlin, or Android build logic without jumping straight to broad scans.

## Default Flow

1. For build, lint, test, or modernization work, start by finding the Android project root.

   ```bash
   find . -maxdepth 4 \( -name gradlew -o -name settings.gradle -o -name settings.gradle.kts \)
   ```

2. Treat that command as the cheap first pass, not a hard limit. If it finds nothing and the repo still looks Android-related, widen the search carefully or inspect likely subdirectories before concluding there is no Android project.

3. For device, emulator, or on-device UI work, discover the target device only when that work is actually needed.

   ```bash
   adb version
   adb devices -l
   ```

4. Open only the next reference you need, then run the smallest task that answers the question.

## Defaults

- Prefer `./gradlew` over global `gradle`.
- Prefer file reads and `./gradlew help --task <task>` over broad Gradle inspection.
- Prefer the nearest Android project root with `gradlew` plus `settings.gradle(.kts)`.
- Prefer explicit device targeting with `adb -s <serial>`.
- Prefer screenshot-first UI triage, targeted XML slices, and bounded logs.
- Avoid destructive emulator actions such as `-wipe-data` unless the user asks for them.

## Gotchas

- Cheap root discovery is a first pass. Do not conclude there is no Android project just because `find . -maxdepth 4` returned nothing.
- Do not front-load adb or emulator discovery for build-only tasks.
- Modernization is usually a Gradle, AGP, Kotlin, and JDK compatibility problem, not a one-line wrapper bump.

## Progressive Disclosure

Open only the next reference you need:

- `references/setup-update.md` for environment setup, required tools, package installation, and updates.
- `references/nested-repo-discovery.md` for sample catalogs, monorepos, nested wrappers, and choosing the right Android project root.
- `references/build-lint-test.md` for wrapper tasks, lint, unit tests, instrumentation tests, and report locations.
- `references/device-emulator-control.md` for device discovery, AVD creation, emulator lifecycle, and boot readiness.
- `references/on-device-interaction-visual-testing.md` for adb interaction, screenshot-first UI triage, hierarchy dumps, and bounded logs.
- `references/modernization.md` for legacy Gradle or Android build logic such as old wrappers, AGP, `jcenter()`, support libraries, or missing `namespace`.
- `references/troubleshooting.md` for a short symptom router.
