#!/bin/bash
# FreePik Icons - macOS PowerPoint Sideload Uninstaller
# Removes the add-in manifest and clears the Office cache

set -e

APP_CONTAINER="$HOME/Library/Containers/com.microsoft.Powerpoint"
WEF_DIR="$APP_CONTAINER/Data/Documents/wef"
CACHE_DIR="$APP_CONTAINER/Data/Library/Caches"
OSF_CACHE="$HOME/Library/Containers/com.Microsoft.OsfWebHost/Data"
ALT_CACHE="$APP_CONTAINER/Data/Library/Application Support/Microsoft/Office/16.0/Wef"

echo "=== FreePik Icons - Uninstaller ==="
echo ""

# Remove manifest
if [ -f "$WEF_DIR/manifest.xml" ]; then
    rm -f "$WEF_DIR/manifest.xml"
    echo "Removed manifest from $WEF_DIR"
else
    echo "No manifest found in $WEF_DIR"
fi

# Clear caches
echo "Clearing Office add-in caches..."
[ -d "$OSF_CACHE" ] && rm -rf "$OSF_CACHE"/* 2>/dev/null || true
[ -d "$CACHE_DIR" ] && rm -rf "$CACHE_DIR"/* 2>/dev/null || true
[ -d "$ALT_CACHE" ] && rm -rf "$ALT_CACHE"/* 2>/dev/null || true
echo "Caches cleared."

echo ""
echo "Quit and reopen PowerPoint for changes to take effect."
echo "=== Done ==="
