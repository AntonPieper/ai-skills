# Troubleshooting

## JAVA_HOME not resolved

Symptoms:

- Could not resolve JAVA_HOME for Java N+

Actions:

1. Run doctor and read Required Java and JAVA_HOME lines.
2. Set ANDROID_JAVA_HOME to a compatible JDK.
3. Re-run build-lint.

## sdkmanager not found

Symptoms:

- sdkmanager not found. Install Android SDK Command-Line Tools first.

Actions:

1. Install Command-Line Tools to `SDK_ROOT/cmdline-tools/latest/bin`.
1. Ensure ANDROID_SDK_ROOT points to the same SDK root.
1. Re-run doctor.

## Emulator console simulation fails

Symptoms:

- Could not read emulator console token
- Connection refused on localhost console port

Actions:

1. Confirm serial is `emulator-PORT`.
1. Verify the emulator is running and booted.
1. Confirm `~/.emulator_console_auth_token` exists.
1. Retry with explicit `--port`.

## No useful hierarchy for rendering surfaces

Symptoms:

- hierarchy.xml exists but does not describe the rendered content

Actions:

1. Use screen.png as source of truth for visual output.
2. Use hierarchy only to find controls and navigation elements.
3. Capture before and after interaction and compare screenshots.

## Obsolete Gradle wrapper or AGP

Symptoms:

- `SAXParseException` while parsing Android SDK repository metadata
- `Could not find com.android.tools.build:gradle:X.Y.Z`
- `Could not find method compile()` or `testCompile()`
- `Namespace not specified`

Actions:

1. Treat this as a modernization task, not an environment hack.
2. Upgrade `gradle/wrapper/gradle-wrapper.properties` to a supported
	Gradle release and regenerate wrapper files with the `wrapper` task.
3. Upgrade the Android Gradle Plugin in build files together with the
	wrapper version.
4. Replace `jcenter()` with `google()` and `mavenCentral()` where
	dependencies allow.
5. Replace deprecated dependency configurations with
	`implementation`, `testImplementation`,
	`androidTestImplementation`, and `runtimeOnly`.
6. Add `namespace` entries before moving to AGP 8+.
7. Do not patch `gradlew` or `gradlew.bat` manually, create fake SDK/JDK
	layouts, or modify the skill/helper to fake a pass.
