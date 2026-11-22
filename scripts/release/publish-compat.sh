#!/usr/bin/env bash
# Run only after validation. Fast-forward updates only; concurrent pushes fail.
set -euo pipefail
repo_root=$(git rev-parse --show-toplevel)
compat_tmp=$(mktemp -d)
cleanup() {
  git -C "$repo_root" worktree remove --force "$compat_tmp/checkout" >/dev/null 2>&1 || true
  rm -rf "$compat_tmp"
}
trap cleanup EXIT
node "$repo_root/scripts/release/export-compat.cjs" "$compat_tmp/export"
git -C "$repo_root" fetch origin aiometadata-input
git -C "$repo_root" worktree add --detach "$compat_tmp/checkout" origin/aiometadata-input
git -C "$compat_tmp/checkout" rm -r --ignore-unmatch . >/dev/null
cp -a "$compat_tmp/export/." "$compat_tmp/checkout/"
git -C "$compat_tmp/checkout" add -A
if ! git -C "$compat_tmp/checkout" diff --cached --quiet; then
  git -C "$compat_tmp/checkout" -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' commit -m "Publish compatibility artifacts from $(git -C "$repo_root" rev-parse --short HEAD)"
  git -C "$compat_tmp/checkout" push origin HEAD:aiometadata-input
fi
