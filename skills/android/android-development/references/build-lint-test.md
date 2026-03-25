# Build, Lint, And Test

Use this file for normal project validation after the environment is working.

If you are not sure you are in the right project root yet, open `references/nested-repo-discovery.md` first.

## Wrapper-First Commands

Prefer the smallest useful wrapper task:

```bash
./gradlew assembleDebug
./gradlew build
./gradlew check
```

Use `assembleDebug` for a fast package, `build` for a fuller pass, and `check` when the project wires extra verification into that lifecycle.

If `gradlew` is present but not executable, use a shell fallback first:

```bash
sh ./gradlew --version
sh ./gradlew test
```

Only use `chmod +x gradlew` if changing the file mode is acceptable for the task.

## Fast Preflight

Before heavier tasks, start with:

```bash
./gradlew --version
./gradlew help --task assembleDebug
```

Prefer targeted help over `tasks --all`.

## Lint

Use wrapper lint tasks instead of standalone lint:

```bash
./gradlew lint
./gradlew lintDebug
./gradlew lintRelease
```

Reports are usually under `module/build/reports/`.

## Unit Tests

Use the smallest scope that answers the question:

```bash
./gradlew test
./gradlew testDebugUnitTest
./gradlew :app:testDebugUnitTest
./gradlew testDebugUnitTest --tests 'com.example.MyTest'
```

Results are usually under `module/build/test-results/` and `module/build/reports/tests/`.

## Instrumentation Tests

Standard connected-device path:

```bash
./gradlew connectedAndroidTest
./gradlew connectedDebugAndroidTest
./gradlew :app:connectedDebugAndroidTest
```

Targeted execution on a selected device:

```bash
adb -s <serial> shell am instrument -w <test-package>/<runner>
adb -s <serial> shell am instrument -w -e class com.example.MyTest <test-package>/<runner>
```

Use Gradle for normal orchestration and `adb shell am instrument` for class or method targeting.

## Repeatable Device Test Loop

For a repeatable device run, reset only the state you need and verify the app actually started before capturing evidence:

```bash
adb -s <serial> logcat -c
adb -s <serial> shell am force-stop <package>
adb -s <serial> shell am start -W -n <package>/<activity>
adb -s <serial> shell pidof <package>
./gradlew connectedAndroidTest
```

Keep this as a single finite sequence. Do not turn it into a watch loop unless the user asks for continuous reruns.

## Useful Flags

Use these when the default output is not enough:

```bash
./gradlew build --stacktrace --warning-mode=all --console=plain
./gradlew build --scan
./gradlew test --rerun-tasks
```

Prefer `--warning-mode=all` during upgrades and `--scan` only when you need more detail.

## Keep It Small

- Run one task family at a time.
- Read generated reports before rerunning with more console verbosity.
- When building a nested sample, report the exact project root and artifact path you used.
- If the build fails because the project is old, switch to `references/modernization.md`.
