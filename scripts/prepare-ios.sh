#!/bin/bash
# Validate the Vite build output is ready for the iOS WKWebView wrapper.
# Usage:  npm run build:ios
#   (runs vite build first, then this script)

set -e

DIST="dist"

echo ""
echo "=== iOS Build Validation ==="

# --- Check critical files exist ---
missing=0
for f in "$DIST/index.html"; do
  if [ ! -f "$f" ]; then
    echo "MISSING: $f"
    missing=1
  fi
done
if [ $missing -eq 1 ]; then
  echo "Build output is incomplete — aborting."
  exit 1
fi

# --- Verify no crossorigin attributes in HTML ---
if grep -q 'crossorigin' "$DIST/index.html"; then
  echo "WARNING: crossorigin attribute found in index.html — this breaks WKWebView."
  echo "Check the removeCrossorigin plugin in vite.config.ts."
  exit 1
fi

# --- Verify all asset paths are relative (no leading /) ---
if grep -Eq '(src|href)="/' "$DIST/index.html"; then
  echo "WARNING: Absolute asset paths found in index.html — these break file:// loading."
  echo "Ensure base: './' is set in vite.config.ts."
  exit 1
fi

# --- Summary ---
echo "index.html      OK (relative paths, no crossorigin)"
echo ""

js_count=$(find "$DIST/assets" -name '*.js' 2>/dev/null | wc -l | tr -d ' ')
css_count=$(find "$DIST/assets" -name '*.css' 2>/dev/null | wc -l | tr -d ' ')
img_count=$(find "$DIST/assets" -name '*.png' -o -name '*.jpg' -o -name '*.svg' 2>/dev/null | wc -l | tr -d ' ')
music_count=$(find "$DIST/music" -name '*.mp3' 2>/dev/null | wc -l | tr -d ' ')
sound_count=$(find "$DIST/sounds" -name '*.mp3' 2>/dev/null | wc -l | tr -d ' ')

echo "Assets:  ${js_count} JS, ${css_count} CSS, ${img_count} images"
echo "Audio:   ${music_count} music tracks, ${sound_count} sound effects"
echo ""
echo "Build is iOS-ready. Copy dist/ into your Xcode project:"
echo "  1. Delete the old dist group/folder in Xcode"
echo "  2. Drag the new dist/ folder into Xcode (Create folder references)"
echo "  3. Build & run in simulator to verify"
echo ""
