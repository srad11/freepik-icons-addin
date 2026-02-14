#!/bin/bash
# FreePik Icons - macOS PowerPoint Sideload Installer
# This script installs the add-in manifest for local development.
#
# On macOS, sideloaded add-ins behave differently than on Windows:
# - The manifest in the wef folder makes the add-in available to PowerPoint
# - The ribbon button may not persist across restarts (known macOS limitation)
# - After restart, go to Home > Add-ins and re-select the add-in
# - Once a document is tagged with the add-in, the task pane auto-opens
#   when that document is reopened (via Office.AutoShowTaskpaneWithDocument)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --production flag uses the production manifest (GitHub Pages)
if [ "$1" = "--production" ]; then
    if [ -f "$PROJECT_DIR/dist/manifest-production.xml" ]; then
        MANIFEST_SOURCE="$PROJECT_DIR/dist/manifest-production.xml"
    else
        echo "ERROR: Production manifest not found. Run setup-production.sh first."
        exit 1
    fi
    MODE="production"
else
    MANIFEST_SOURCE="$PROJECT_DIR/manifest.xml"
    if [ -f "$PROJECT_DIR/dist/manifest.xml" ]; then
        MANIFEST_SOURCE="$PROJECT_DIR/dist/manifest.xml"
    fi
    MODE="development"
fi

APP_CONTAINER="$HOME/Library/Containers/com.microsoft.Powerpoint"
WEF_DIR="$APP_CONTAINER/Data/Documents/wef"
CACHE_DIR="$APP_CONTAINER/Data/Library/Caches"
OSF_CACHE="$HOME/Library/Containers/com.Microsoft.OsfWebHost/Data"

echo "=== FreePik Icons - PowerPoint Add-in Installer ==="
echo ""

# Check manifest exists
if [ ! -f "$MANIFEST_SOURCE" ]; then
    echo "ERROR: manifest.xml not found at $MANIFEST_SOURCE"
    exit 1
fi

echo "Using manifest: $MANIFEST_SOURCE"
echo ""

# Clear the Office web cache for PowerPoint to avoid stale manifest issues
echo "Clearing Office add-in cache..."
if [ -d "$OSF_CACHE" ]; then
    rm -rf "$OSF_CACHE"/* 2>/dev/null || true
    echo "  Cleared OsfWebHost cache"
fi
if [ -d "$CACHE_DIR" ]; then
    rm -rf "$CACHE_DIR"/* 2>/dev/null || true
    echo "  Cleared PowerPoint cache"
fi

# Also clear the alternate cache locations
ALT_CACHE="$APP_CONTAINER/Data/Library/Application Support/Microsoft/Office/16.0/Wef"
if [ -d "$ALT_CACHE" ]; then
    rm -rf "$ALT_CACHE"/* 2>/dev/null || true
    echo "  Cleared alternate Wef cache"
fi

# Create wef directory if it doesn't exist
if [ ! -d "$WEF_DIR" ]; then
    echo "Creating add-in directory..."
    mkdir -p "$WEF_DIR"
fi

# Remove any existing manifest to force a fresh load
rm -f "$WEF_DIR"/manifest.xml 2>/dev/null || true

# Copy manifest
echo "Installing manifest..."
cp "$MANIFEST_SOURCE" "$WEF_DIR/manifest.xml"

echo ""
echo "Manifest installed to: $WEF_DIR/manifest.xml"
echo ""
echo "=== Next Steps ==="
if [ "$MODE" = "production" ]; then
    echo "1. Quit PowerPoint completely (Cmd+Q)"
    echo "2. Reopen PowerPoint and open a presentation"
    echo "3. Go to Home > Add-ins (or Insert > Add-ins)"
    echo "4. Select 'FreePik Icons' from the dropdown"
    echo ""
    echo "No dev server needed - the add-in is hosted on GitHub Pages!"
else
    echo "1. Make sure the dev server is running: npm start"
    echo "2. Quit PowerPoint completely (Cmd+Q)"
    echo "3. Reopen PowerPoint and open a presentation"
    echo "4. Go to Home > Add-ins (or Insert > Add-ins)"
    echo "5. Select 'FreePik Icons' from the dropdown"
fi
echo ""
echo "NOTE: On macOS, the ribbon button may not persist after restarting"
echo "PowerPoint. This is a known macOS limitation. After restart, the"
echo "add-in is still installed -- just re-select it from the Add-ins menu."
echo "Once a document has been opened with the add-in, the task pane will"
echo "auto-open when that document is reopened."
echo ""
echo "To uninstall, run: $SCRIPT_DIR/uninstall.sh"
echo "  or manually delete: $WEF_DIR/manifest.xml"
echo "=== Done ==="
