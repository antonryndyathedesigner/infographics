#!/usr/bin/env bash
set -euo pipefail
# Publish an already-built site without changing the checkout or its normal index.
task_repo_root="$(git rev-parse --show-toplevel)"
task_git_dir="$(git rev-parse --absolute-git-dir)"
test -f "$task_repo_root/dist/index.html"
touch "$task_repo_root/dist/.nojekyll"
task_index_dir="$(mktemp -d)"
trap 'rm -rf "$task_index_dir"' EXIT
export GIT_INDEX_FILE="$task_index_dir/index"
git --git-dir="$task_git_dir" --work-tree="$task_repo_root/dist" -C "$task_repo_root/dist" add --all
task_tree="$(git write-tree)"
task_parent_args=()
if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
  task_parent_args=(-p "$(git rev-parse refs/remotes/origin/gh-pages)")
fi
task_commit="$(git commit-tree "$task_tree" "${task_parent_args[@]}" -m 'Publish FORMA static site')"
git push origin "$task_commit:refs/heads/gh-pages"
