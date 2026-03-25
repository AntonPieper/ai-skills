#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

extract_skill_name() {
  awk '
    BEGIN { in_frontmatter = 0 }
    /^---$/ {
      if (in_frontmatter == 0) {
        in_frontmatter = 1
        next
      }
      exit
    }
    in_frontmatter == 1 && $1 == "name:" {
      sub(/^name:[[:space:]]*/, "")
      print
      exit
    }
  ' "$1"
}

skill_files=()
while IFS= read -r skill_file; do
  skill_files+=("$skill_file")
done < <(find "$REPO_DIR" -type f -name SKILL.md -not -path '*/.git/*' | sort)

if [ "${#skill_files[@]}" -eq 0 ]; then
  echo "No skills found." >&2
  exit 1
fi

skill_names=()
seen_names_file="$(mktemp)"
cleanup() {
  rm -f "$seen_names_file"
}
trap cleanup EXIT

root_list_output="$(cd "$REPO_DIR" && npx -y skills add "$REPO_DIR" --list)"

for skill_file in "${skill_files[@]}"; do
  skill_dir="$(dirname "$skill_file")"
  skill_name="$(extract_skill_name "$skill_file")"

  if [ -z "$skill_name" ]; then
    echo "Missing skill name in $skill_file" >&2
    exit 1
  fi

  if grep -Fxq "$skill_name" "$seen_names_file"; then
    echo "Duplicate skill name '$skill_name' in $skill_file" >&2
    exit 1
  fi

  printf '%s\n' "$skill_name" >> "$seen_names_file"
  skill_names+=("$skill_name")

  if ! printf '%s\n' "$root_list_output" | rg -q "$skill_name"; then
    echo "Root skill listing did not include $skill_name" >&2
    exit 1
  fi

  direct_output="$(cd "$REPO_DIR" && npx -y skills add "$skill_dir" --list)"
  if ! printf '%s\n' "$direct_output" | rg -q "$skill_name"; then
    echo "Direct skill listing failed for $skill_name at $skill_dir" >&2
    exit 1
  fi

  temp_home="$(mktemp -d)"
  temp_cache="$temp_home/.npm"
  mkdir -p "$temp_cache"
  if ! env HOME="$temp_home" npm_config_cache="$temp_cache" \
    npx -y skills add "$REPO_DIR" --skill "$skill_name" -g -a github-copilot -y >/dev/null 2>&1; then
    echo "Repository-root install failed for skill $skill_name" >&2
    rm -rf "$temp_home"
    exit 1
  fi
  rm -rf "$temp_home"
done

printf 'Validated %s skills: %s\n' "${#skill_names[@]}" "$(IFS=', '; echo "${skill_names[*]}")"
