#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILL_DIR="${SKILL_DIR:-$REPO_DIR/skills/android/android-development}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_ROOT="${RUN_ROOT:-${TMPDIR:-/tmp}/android-development-scenarios/$TIMESTAMP}"
REPOS_DIR="$RUN_ROOT/repos"
PROMPTS_DIR="$RUN_ROOT/prompts"
SCENARIOS_DIR="$RUN_ROOT/scenarios"
LOG_DIR="$RUN_ROOT/logs"
COPILOT_LOG_DIR="$RUN_ROOT/copilot-internal-logs"
SUMMARY_TSV="$RUN_ROOT/summary.tsv"
SKILL_LIST_FILE="$RUN_ROOT/skill-package.txt"

MODEL="${MODEL:-gpt-5.4-mini}"
REASONING_EFFORT="${REASONING_EFFORT:-medium}"
STREAM_MODE="${STREAM_MODE:-on}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-1500}"
COPILOT_BIN="${COPILOT_BIN:-}"
SKIP_CLONE="${SKIP_CLONE:-0}"
INSTALL_SKILL="${INSTALL_SKILL:-1}"
FAIL_ON_SCENARIO_ERROR="${FAIL_ON_SCENARIO_ERROR:-0}"

mkdir -p "$REPOS_DIR" "$PROMPTS_DIR" "$SCENARIOS_DIR" "$LOG_DIR" "$COPILOT_LOG_DIR"

if [ -z "$COPILOT_BIN" ]; then
  if command -v copilot >/dev/null 2>&1; then
    COPILOT_BIN="$(command -v copilot)"
  else
    COPILOT_BIN="$HOME/Library/Application Support/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot"
  fi
fi

if [ ! -x "$COPILOT_BIN" ]; then
  echo "Copilot CLI not found: $COPILOT_BIN" >&2
  exit 1
fi

clone_repo() {
  local label="$1"
  local url="$2"
  local branch="$3"
  local ref="$4"
  local repo_dir="$REPOS_DIR/$label"

  if [ "$SKIP_CLONE" = "1" ] && [ -d "$repo_dir/.git" ]; then
    return 0
  fi

  rm -rf "$repo_dir"
  git clone --depth 1 --branch "$branch" "$url" "$repo_dir" >/dev/null 2>&1

  if [ -n "$ref" ]; then
    (
      cd "$repo_dir"
      git fetch --depth 1 origin "$ref" >/dev/null 2>&1 || true
      git checkout --detach "$ref" >/dev/null 2>&1
    )
  fi
}

json_status() {
  local file="$1"
  node -e "const fs=require('node:fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); process.stdout.write(String(data.status || 'missing'));" "$file"
}

scenario_prompt() {
  local scenario_id="$1"
  local repo_dir="$2"
  local repo_label="$3"
  local repo_url="$4"
  local module_hint="$5"
  local result_json="$6"
  local report_md="$7"
  local raw_dir="$8"
  local media_processor="$9"
  local scenario_dir

  scenario_dir="$(dirname "$result_json")"

  case "$scenario_id" in
    toolchain-architecture-samples)
      cat <<EOF
Run a full Android toolchain validation using the android-development skill.

Repository root: $repo_dir
Repository label: $repo_label
Repository URL: $repo_url
Module hint: $module_hint

Required outputs:
- Write JSON to $result_json
- Write Markdown to $report_md
- If you capture raw screenshots or recordings, store them in $raw_dir

Task:
1. Find the real Android project root.
2. Identify the smallest reliable Gradle commands for build, unit tests, and connected tests.
3. Actually run those commands. If no connected test task exists, record a warning and explain what was verified instead.
4. Do not edit the repository under test.
5. Summarize what succeeded, what was skipped, and the exact commands that grounded the result.

Write JSON with this exact top-level shape:
{
  "scenarioId": "toolchain-architecture-samples",
  "type": "toolchain",
  "title": "short title",
  "status": "passed|warning|failed",
  "summary": "1-2 sentence summary",
  "generatedAt": "ISO-8601",
  "fixture": {
    "label": "$repo_label",
    "repoUrl": "$repo_url"
  },
  "project": {
    "root": "absolute path",
    "module": "module name or path"
  },
  "commands": [
    {
      "label": "short label",
      "command": "exact command",
      "status": "passed|warning|failed",
      "detail": "short outcome"
    }
  ],
  "checks": [
    {
      "label": "short label",
      "status": "passed|warning|failed",
      "detail": "short evidence"
    }
  ],
  "keyFindings": ["short bullet", "short bullet"]
}

Write Markdown with these sections in order:
- # Title
- ## Summary
- ## Commands
- ## Checks
- ## Findings

Keep both files concise and evidence-based.
EOF
      ;;
    interaction-architecture-create-task)
      cat <<EOF
Run a manual on-device Android interaction scenario using the android-development skill.

Repository root: $repo_dir
Repository label: $repo_label
Repository URL: $repo_url
Module hint: $module_hint

Required outputs:
- Write JSON to $result_json
- Write Markdown to $report_md
- Save raw screenshots and recordings in $raw_dir
- After capturing media, run: node $media_processor "$scenario_dir"

This scenario was selected after repository exploration because architecture-samples has a deterministic, visually strong first-run todo creation flow.

Task:
1. Find the real Android project root and build a debuggable app if needed.
2. Clear app data to force the empty-state first-run path.
3. Install the app to the running emulator with adb and launch it.
4. Execute this manual visual flow using adb input and bounded hierarchy inspection when needed:
  - verify the empty state on the task list and prefer the visible empty-state screen over transient snackbars as proof,
   - tap the new-task action,
  - enter a short stable title and description, avoiding flaky adb text input patterns where possible,
  - hide the keyboard if it obscures the save action,
   - save the task,
   - verify the app returns to the list and the new task is visible.
5. Capture at least three screenshots: empty state, task entry form, and populated list after save.
6. Capture one short screen recording that shows the interaction path.
7. Keep any UI hierarchy dump or logcat capture bounded and use it only to ground ambiguous taps or assertions.
8. Do not dump unbounded XML or logs into the markdown.
9. After running the media processor, write a markdown report that embeds at least one processed image and one processed video using relative paths under ./media.

Use this exact JSON shape:
{
  "scenarioId": "interaction-architecture-create-task",
  "type": "interaction",
  "title": "short title",
  "status": "passed|warning|failed",
  "summary": "1-2 sentence summary",
  "generatedAt": "ISO-8601",
  "fixture": {
    "label": "$repo_label",
    "repoUrl": "$repo_url"
  },
  "project": {
    "root": "absolute path",
    "module": "module name or path",
    "packageName": "android package if discovered"
  },
  "commands": [
    {
      "label": "short label",
      "command": "exact command",
      "status": "passed|warning|failed",
      "detail": "short outcome"
    }
  ],
  "checks": [
    {
      "label": "short label",
      "status": "passed|warning|failed",
      "detail": "short evidence"
    }
  ],
  "keyFindings": ["short bullet", "short bullet"]
}

Write Markdown with these sections in order:
- # Title
- ## Summary
- ## Scenario steps
- ## Captured proof
- ## Commands
- ## Checks
- ## Findings

Embed the processed media with relative links like ./media/example.webp and a HTML <video> block that points at ./media/example.mp4.
EOF
      ;;
    interaction-termux-create-named-session)
      cat <<EOF
Run a manual on-device Android interaction scenario using the android-development skill.

Repository root: $repo_dir
Repository label: $repo_label
Repository URL: $repo_url
Module hint: $module_hint

Required outputs:
- Write JSON to $result_json
- Write Markdown to $report_md
- Save raw screenshots and recordings in $raw_dir
- After capturing media, run: node $media_processor "$scenario_dir"

This scenario was selected after repository exploration because Termux has a visually meaningful drawer-driven session workflow that can be verified with adb input and screenshots.

Task:
1. Find the real Android project root and build a debuggable app if needed.
2. Clear app data, install the app, and launch it.
3. Wait for first-run bootstrap to complete and confirm the terminal session is usable before continuing.
4. Execute this manual visual flow using adb input and bounded hierarchy inspection when needed:
   - open the drawer,
   - long-press the New session control,
   - create a named session with a short stable name,
  - verify the drawer list now shows the new named session and that the selected row state changed.
5. Capture at least three screenshots: first shell ready, create-session dialog, and drawer with the new named session.
6. Capture one short recording that shows the drawer interaction and resulting session list change.
7. Keep hierarchy and logcat capture bounded and only use them to ground brittle interactions; do not rely on terminal transcript text as the main assertion.
8. Do not use broad or destructive actions such as wiping the emulator.
9. After running the media processor, write a markdown report that embeds at least one processed image and one processed video using relative paths under ./media.

Use this exact JSON shape:
{
  "scenarioId": "interaction-termux-create-named-session",
  "type": "interaction",
  "title": "short title",
  "status": "passed|warning|failed",
  "summary": "1-2 sentence summary",
  "generatedAt": "ISO-8601",
  "fixture": {
    "label": "$repo_label",
    "repoUrl": "$repo_url"
  },
  "project": {
    "root": "absolute path",
    "module": "module name or path",
    "packageName": "android package if discovered"
  },
  "commands": [
    {
      "label": "short label",
      "command": "exact command",
      "status": "passed|warning|failed",
      "detail": "short outcome"
    }
  ],
  "checks": [
    {
      "label": "short label",
      "status": "passed|warning|failed",
      "detail": "short evidence"
    }
  ],
  "keyFindings": ["short bullet", "short bullet"]
}

Write Markdown with these sections in order:
- # Title
- ## Summary
- ## Scenario steps
- ## Captured proof
- ## Commands
- ## Checks
- ## Findings

Embed the processed media with relative links like ./media/example.webp and a HTML <video> block that points at ./media/example.mp4.
EOF
      ;;
    interaction-aegis-first-run)
      cat <<EOF
Run a manual on-device Android interaction scenario using the android-development skill.

Repository root: $repo_dir
Repository label: $repo_label
Repository URL: $repo_url
Module hint: $module_hint

Required outputs:
- Write JSON to $result_json
- Write Markdown to $report_md
- Save raw screenshots and recordings in $raw_dir
- After capturing media, run: node $media_processor "$scenario_dir"

This scenario was selected after repository exploration because Aegis has a deterministic first-run secure setup flow that produces strong visual state changes without camera or import dependencies.

Task:
1. Find the real Android project root and build a debuggable app if needed. Prefer a debug build because release screen-security behavior can block screenshots and recordings.
2. Clear app data, install the app, and launch it.
3. Execute this manual visual flow using adb input and bounded hierarchy inspection when needed:
   - progress through the intro screens,
  - explicitly choose password-based setup even if it appears preselected,
   - enter a stable test password and confirmation,
  - allow for the setup-complete transition to take a moment after password submission,
   - complete setup,
   - verify the app reaches the empty vault screen.
4. Capture at least three screenshots: intro/setup start, password entry, and empty vault after completion.
5. Capture one short recording that shows the end-to-end setup transition.
6. Keep hierarchy and logcat capture bounded and only use them to ground ambiguous taps or text fields.
7. Do not rely on camera, file picker, or external import flows.
8. After running the media processor, write a markdown report that embeds at least one processed image and one processed video using relative paths under ./media.

Use this exact JSON shape:
{
  "scenarioId": "interaction-aegis-first-run",
  "type": "interaction",
  "title": "short title",
  "status": "passed|warning|failed",
  "summary": "1-2 sentence summary",
  "generatedAt": "ISO-8601",
  "fixture": {
    "label": "$repo_label",
    "repoUrl": "$repo_url"
  },
  "project": {
    "root": "absolute path",
    "module": "module name or path",
    "packageName": "android package if discovered"
  },
  "commands": [
    {
      "label": "short label",
      "command": "exact command",
      "status": "passed|warning|failed",
      "detail": "short outcome"
    }
  ],
  "checks": [
    {
      "label": "short label",
      "status": "passed|warning|failed",
      "detail": "short evidence"
    }
  ],
  "keyFindings": ["short bullet", "short bullet"]
}

Write Markdown with these sections in order:
- # Title
- ## Summary
- ## Scenario steps
- ## Captured proof
- ## Commands
- ## Checks
- ## Findings

Embed the processed media with relative links like ./media/example.webp and a HTML <video> block that points at ./media/example.mp4.
EOF
      ;;
    modernization-cleanarchitecture)
      cat <<EOF
Run a modernization triage scenario using the android-development skill.

Repository root: $repo_dir
Repository label: $repo_label
Repository URL: $repo_url
Module hint: $module_hint

Required outputs:
- Write JSON to $result_json
- Write Markdown to $report_md

Task:
1. Find the real Android project root.
2. Ground the environment with the smallest useful wrapper command such as ./gradlew --version or ./gradlew help.
3. Inspect only the Gradle and Android build files you need to identify the most concrete modernization signals.
4. Do not edit files and do not recommend blind version bumps.
5. Finish with the first safe modernization step.

Use this exact JSON shape:
{
  "scenarioId": "modernization-cleanarchitecture",
  "type": "modernization",
  "title": "short title",
  "status": "passed|warning|failed",
  "summary": "1-2 sentence summary",
  "generatedAt": "ISO-8601",
  "fixture": {
    "label": "$repo_label",
    "repoUrl": "$repo_url"
  },
  "project": {
    "root": "absolute path",
    "module": "module name or path"
  },
  "commands": [
    {
      "label": "short label",
      "command": "exact command",
      "status": "passed|warning|failed",
      "detail": "short outcome"
    }
  ],
  "checks": [
    {
      "label": "short label",
      "status": "passed|warning|failed",
      "detail": "short evidence"
    }
  ],
  "keyFindings": ["short bullet", "short bullet"]
}

Write Markdown with these sections in order:
- # Title
- ## Summary
- ## Signals
- ## Commands
- ## Findings
- ## First safe next step
EOF
      ;;
    *)
      echo "Unknown scenario: $scenario_id" >&2
      return 1
      ;;
  esac
}

run_case() {
  local scenario_id="$1"
  local repo_label="$2"
  local repo_url="$3"
  local branch="$4"
  local ref="$5"
  local module_hint="$6"
  local repo_dir="$REPOS_DIR/$repo_label"
  local scenario_dir="$SCENARIOS_DIR/$scenario_id"
  local raw_dir="$scenario_dir/raw"
  local prompt_file="$PROMPTS_DIR/${scenario_id}.txt"
  local result_json="$scenario_dir/result.json"
  local report_md="$scenario_dir/report.md"
  local cli_log="$LOG_DIR/${scenario_id}.log"
  local cli_exit="0"
  local result_status="missing"

  clone_repo "$repo_label" "$repo_url" "$branch" "$ref"
  mkdir -p "$scenario_dir" "$raw_dir"

  scenario_prompt "$scenario_id" "$repo_dir" "$repo_label" "$repo_url" "$module_hint" "$result_json" "$report_md" "$raw_dir" "$REPO_DIR/scripts/process-android-scenario-artifacts.mjs" > "$prompt_file"

  if (
    cd "$repo_dir"
    perl -e 'alarm shift @ARGV; exec @ARGV' "$TIMEOUT_SECONDS" \
      "$COPILOT_BIN" \
      --model "$MODEL" \
      --reasoning-effort "$REASONING_EFFORT" \
      --stream "$STREAM_MODE" \
      --no-color \
      --allow-all-tools \
      --allow-all-paths \
      --allow-all-urls \
      --no-ask-user \
      --add-dir "$SKILL_DIR" \
      --add-dir "$repo_dir" \
      --add-dir "$scenario_dir" \
      --log-dir "$COPILOT_LOG_DIR" \
      -p "Use the android-development skill at $SKILL_DIR. If it is not installed, read $SKILL_DIR/SKILL.md directly and use progressive disclosure across the references directory. Work in the repository below and write the required result files to the absolute paths provided. Do not ask the user for input.\n\n$(cat "$prompt_file")" > "$cli_log" 2>&1
  ); then
    cli_exit="0"
  else
    cli_exit="$?"
  fi

  if [ -f "$result_json" ]; then
    result_status="$(json_status "$result_json" || printf 'missing')"
  fi

  printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$scenario_id" \
    "$repo_label" \
    "$cli_exit" \
    "$result_status" \
    "$result_json" \
    "$report_md" >> "$SUMMARY_TSV"

  if [ "$cli_exit" != "0" ] || [ ! -f "$result_json" ] || [ ! -f "$report_md" ]; then
    return 1
  fi

  return 0
}

printf 'scenario\trepo\tcli_exit\tresult_status\tresult_json\treport_md\n' > "$SUMMARY_TSV"

if command -v npx >/dev/null 2>&1; then
  npx -y skills add "$SKILL_DIR" --list > "$SKILL_LIST_FILE" 2>&1 || true
  if [ "$INSTALL_SKILL" = "1" ]; then
    npx -y skills add "$SKILL_DIR" -g -a github-copilot -y >/dev/null 2>&1
  fi
else
  printf 'npx not available; skipped skills package validation\n' > "$SKILL_LIST_FILE"
fi

failures=0

run_case toolchain-architecture-samples architecture-samples https://github.com/android/architecture-samples.git main ee66e1526b84c026615df032c705842b7d2a521f app || failures=$((failures + 1))
run_case interaction-architecture-create-task architecture-samples https://github.com/android/architecture-samples.git main ee66e1526b84c026615df032c705842b7d2a521f app || failures=$((failures + 1))
run_case interaction-termux-create-named-session termux-app https://github.com/termux/termux-app.git master '' app || failures=$((failures + 1))
run_case interaction-aegis-first-run Aegis https://github.com/beemdevelopment/Aegis.git master '' app || failures=$((failures + 1))
run_case modernization-cleanarchitecture cleanarchitecture https://github.com/android10/Android-CleanArchitecture.git master '' app || failures=$((failures + 1))

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    printf '# Android Development Scenario Runs\n\n'
    printf '| Scenario | Repo | Copilot CLI | Result JSON | Markdown |\n'
    printf '| --- | --- | --- | --- | --- |\n'
    awk -F '\t' 'NR > 1 { printf("| %s | %s | %s | %s | %s |\\n", $1, $2, $3, $4, $6) }' "$SUMMARY_TSV"
  } >> "$GITHUB_STEP_SUMMARY"
fi

printf '\nSummary:\n'
if command -v column >/dev/null 2>&1; then
  column -t -s $'\t' "$SUMMARY_TSV"
else
  cat "$SUMMARY_TSV"
fi

if [ "$failures" -gt 0 ] && [ "$FAIL_ON_SCENARIO_ERROR" = "1" ]; then
  exit 1
fi
