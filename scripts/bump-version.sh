#!/usr/bin/env bash
# Usage: ./scripts/bump-version.sh 0.2.0
# Updates version in all client config files and creates a git tag.

set -euo pipefail

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 0.2.0"
    exit 1
fi

# Validate semver format
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo "Error: Version must be in semver format (e.g., 0.2.0)"
    exit 1
fi

ROOT="$(git rev-parse --show-toplevel)"

echo "Bumping version to $VERSION..."

# 1. client/package.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT/client/package.json"
echo "  Updated client/package.json"

# 2. client/src-tauri/tauri.conf.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT/client/src-tauri/tauri.conf.json"
echo "  Updated client/src-tauri/tauri.conf.json"

# 3. client/src-tauri/Cargo.toml (only the package version, first occurrence)
sed -i "0,/^version = \"[^\"]*\"/s//version = \"$VERSION\"/" "$ROOT/client/src-tauri/Cargo.toml"
echo "  Updated client/src-tauri/Cargo.toml"

echo ""
echo "Version bumped to $VERSION in all files."
echo ""
echo "Next steps:"
echo "  git add -A && git commit -m \"release: v$VERSION\""
echo "  git tag v$VERSION"
echo "  git push origin main --tags"
echo ""
echo "GitHub Actions will build and create the release automatically."
