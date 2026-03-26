#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

json_files=()
while IFS= read -r json_file; do
  json_files+=("$json_file")
done < <(find "$REPO_DIR/validation" -type f -name '*.json' -not -path '*/.git/*' | sort)

if [ "${#json_files[@]}" -eq 0 ]; then
  echo "No validation JSON files found (evals removed; scenario tests used instead)."
  exit 0
fi

for json_file in "${json_files[@]}"; do
  case "$json_file" in
    */evals/*)
      expected_skill="$(basename "$(dirname "$(dirname "$json_file")")")"
      skill_matches=()
      while IFS= read -r skill_file; do
        skill_matches+=("$skill_file")
      done < <(find "$REPO_DIR/skills" -type f -path "*/$expected_skill/SKILL.md" | sort)

      if [ "${#skill_matches[@]}" -ne 1 ]; then
        echo "Expected exactly one skill directory for validation asset $json_file, found ${#skill_matches[@]} matches for '$expected_skill'" >&2
        exit 1
      fi
      ;;
  esac

  case "$json_file" in
    */evals/evals.json)
      node -e '
        const fs = require("fs");
        const path = process.argv[1];
        const expectedSkill = process.argv[2];
        const data = JSON.parse(fs.readFileSync(path, "utf8"));
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("expected top-level object");
        }
        if (typeof data.skill_name !== "string" || data.skill_name.trim() === "") {
          throw new Error("missing skill_name");
        }
        if (data.skill_name !== expectedSkill) {
          throw new Error(`skill_name ${data.skill_name} does not match enclosing validation directory ${expectedSkill}`);
        }
        if (!Array.isArray(data.evals) || data.evals.length === 0) {
          throw new Error("missing evals array");
        }
        for (const [index, item] of data.evals.entries()) {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw new Error(`eval ${index} must be an object`);
          }
          for (const key of ["id", "prompt", "expected_output"]) {
            if (typeof item[key] !== "string" || item[key].trim() === "") {
              throw new Error(`eval ${index} missing ${key}`);
            }
          }
          if ("assertions" in item) {
            if (!Array.isArray(item.assertions) || item.assertions.length === 0) {
              throw new Error(`eval ${index} assertions must be a non-empty array when present`);
            }
            for (const assertion of item.assertions) {
              if (typeof assertion !== "string" || assertion.trim() === "") {
                throw new Error(`eval ${index} has an empty assertion`);
              }
            }
          }
        }
      ' "$json_file" "$expected_skill"
      ;;
    */evals/trigger-queries.*.json)
      node -e '
        const fs = require("fs");
        const path = process.argv[1];
        const data = JSON.parse(fs.readFileSync(path, "utf8"));
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("expected non-empty array");
        }
        for (const [index, item] of data.entries()) {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw new Error(`query ${index} must be an object`);
          }
          if (typeof item.query !== "string" || item.query.trim() === "") {
            throw new Error(`query ${index} missing query`);
          }
          if (typeof item.should_trigger !== "boolean") {
            throw new Error(`query ${index} missing boolean should_trigger`);
          }
        }
      ' "$json_file"
      ;;
    *)
      node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$json_file"
      ;;
  esac
done

printf 'Validated %s validation JSON files\n' "${#json_files[@]}"