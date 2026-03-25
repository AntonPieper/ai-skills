#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

output_contains_text() {
  local text="$1"
  local needle="$2"
  printf '%s\n' "$text" | grep -Fq "$needle"
}

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

extract_skill_description() {
  awk '
    BEGIN { in_frontmatter = 0 }
    /^---$/ {
      if (in_frontmatter == 0) {
        in_frontmatter = 1
        next
      }
      exit
    }
    in_frontmatter == 1 && $1 == "description:" {
      sub(/^description:[[:space:]]*/, "")
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
  skill_description="$(extract_skill_description "$skill_file")"

  if [ -z "$skill_name" ]; then
    echo "Missing skill name in $skill_file" >&2
    exit 1
  fi

  if [ -z "$skill_description" ]; then
    echo "Missing single-line skill description in $skill_file" >&2
    exit 1
  fi

  if [ "${#skill_description}" -gt 1024 ]; then
    echo "Skill description exceeds 1024 characters in $skill_file" >&2
    exit 1
  fi

  if grep -Fxq "$skill_name" "$seen_names_file"; then
    echo "Duplicate skill name '$skill_name' in $skill_file" >&2
    exit 1
  fi

  printf '%s\n' "$skill_name" >> "$seen_names_file"
  skill_names+=("$skill_name")

  if ! output_contains_text "$root_list_output" "$skill_name"; then
    echo "Root skill listing did not include $skill_name" >&2
    exit 1
  fi

  direct_output="$(cd "$REPO_DIR" && npx -y skills add "$skill_dir" --list)"
  if ! output_contains_text "$direct_output" "$skill_name"; then
    echo "Direct skill listing failed for $skill_name at $skill_dir" >&2
    exit 1
  fi

  while IFS= read -r relative_reference; do
    [ -n "$relative_reference" ] || continue
    if [ ! -f "$skill_dir/$relative_reference" ]; then
      echo "Missing referenced file '$relative_reference' from $skill_file" >&2
      exit 1
    fi
  done < <(grep -Eo 'references/[A-Za-z0-9._/-]+\.md' "$skill_file" | sort -u)

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
