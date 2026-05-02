#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Paperclip Android Release Script
# Usage: bash scripts/release-android.sh <version>
# Example: bash scripts/release-android.sh 0.0.3
# ─────────────────────────────────────────────────────────────
set -e

VERSION="${1:?Usage: $0 <version> (e.g. 0.0.3)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$MOBILE_DIR/../.." && pwd)"
ANDROID_DIR="$MOBILE_DIR/android"
ASSETS_DIR="$ANDROID_DIR/app/src/main/assets"
APK_IN="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
APK_OUT="$ANDROID_DIR/app/build/outputs/apk/debug/app-release-$VERSION.apk"
SERVER_UPDATES="$REPO_DIR/server/updates/android"
KEYSTORE="$USERPROFILE/.android/debug.keystore"
BUILD_TOOLS="$LOCALAPPDATA/Android/Sdk/build-tools/35.0.0"
HOOK_FILE="$MOBILE_DIR/src/hooks/useAppUpdate.ts"
APPJSON="$MOBILE_DIR/app.json"
MANIFEST="$SERVER_UPDATES/latest-android.json"

echo "══════════════════════════════════════════"
echo " Paperclip Android Release — v$VERSION"
echo "══════════════════════════════════════════"

# ── 1. Bump version in useAppUpdate.ts ─────────────────────
echo "[1/6] Bumping CURRENT_VERSION → $VERSION"
sed -i "s/const CURRENT_VERSION = '[^']*'/const CURRENT_VERSION = '$VERSION'/" "$HOOK_FILE"
grep "CURRENT_VERSION" "$HOOK_FILE"

# ── 2. Bump version in app.json ────────────────────────────
echo "[2/6] Bumping app.json version → $VERSION"
# Convert bash path to Windows path for Python
WIN_APPJSON="$(cygpath -w "$APPJSON" 2>/dev/null || echo "$APPJSON" | sed 's|/d/|D:/|')"
python3 -c "
import json
path = r'$WIN_APPJSON'
with open(path) as f: d = json.load(f)
d['expo']['version'] = '$VERSION'
with open(path, 'w') as f: json.dump(d, f, indent=2)
print('app.json updated to $VERSION')
"

# ── 3. Bundle JS via expo export ────────────────────────────
# (Using expo export instead of Gradle bundleDebugJsAndAssets because
#  the Gradle Expo plugin has classpath issues in this pnpm monorepo.)
echo "[3/6] Bundling JS (expo export)…"
cd "$MOBILE_DIR"
npx expo export --platform android --clear
BUNDLE_SRC=$(find "$MOBILE_DIR/dist/_expo/static/js/android" -name "*.hbc" | head -1)
if [ -z "$BUNDLE_SRC" ]; then
  echo "  ERROR: expo export produced no bundle" >&2
  exit 1
fi
cp "$BUNDLE_SRC" "$ASSETS_DIR/index.android.bundle"
echo "  Bundle: $(du -sh "$ASSETS_DIR/index.android.bundle" | cut -f1)"

# ── 4. Patch existing APK with new bundle ──────────────────
# We patch the existing app-debug.apk rather than rebuilding via Gradle
# (Gradle assembleDebug fails on this pnpm monorepo due to Expo plugin issues).
echo "[4/6] Patching APK…"
  PREV_APK="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
  WIN_PREV=$(cygpath -w "$PREV_APK" 2>/dev/null || echo "$PREV_APK" | sed 's|/d/|D:/|' | sed 's|/|\\\\|g')
WIN_BUNDLE=$(cygpath -w "$ASSETS_DIR/index.android.bundle" 2>/dev/null || echo "$ASSETS_DIR/index.android.bundle" | sed 's|/d/|D:/|' | sed 's|/|\\\\|g')
WIN_APK_OUT=$(cygpath -w "$APK_OUT" 2>/dev/null || echo "$APK_OUT" | sed 's|/d/|D:/|' | sed 's|/|\\\\|g')
python3 - << PYEOF
import zipfile, os
apk_in   = r"$WIN_PREV"
bundle   = r"$WIN_BUNDLE"
apk_out  = r"$WIN_APK_OUT"
with zipfile.ZipFile(apk_in, 'r') as zin, \
     zipfile.ZipFile(apk_out, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        if item.filename.startswith('META-INF/'): continue
        if item.filename == 'assets/index.android.bundle':
            zout.write(bundle, 'assets/index.android.bundle')
        else:
            zout.writestr(item, zin.read(item.filename))
print(f"  Patched APK: {os.path.getsize(apk_out)//1024//1024}MB")
PYEOF

# ── 5. Sign APK ─────────────────────────────────────────────
echo "[5/6] Signing APK…"
"$BUILD_TOOLS/apksigner.bat" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:android \
  --ks-key-alias androiddebugkey \
  --key-pass pass:android \
  "$APK_OUT"
echo "  Signed: $(du -sh "$APK_OUT" | cut -f1)"

# ── 6. Publish to server/updates/android ───────────────────
echo "[6/6] Publishing to server/updates/android…"
mkdir -p "$SERVER_UPDATES"
cp "$APK_OUT" "$SERVER_UPDATES/app-debug.apk"
WIN_MANIFEST=$(cygpath -w "$MANIFEST" 2>/dev/null || echo "$MANIFEST" | sed 's|/d/|D:/|' | sed 's|/|\\\\|g')
python3 -c "
import json
from datetime import date
manifest = {
    'version': '$VERSION',
    'apkName': 'app-debug.apk',
    'releaseDate': str(date.today()),
    'notes': 'v$VERSION 업데이트'
}
with open(r'$WIN_MANIFEST', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)
print(json.dumps(manifest, indent=2, ensure_ascii=False))
"

echo ""
echo "✅ Release v$VERSION complete!"
echo "   APK: $APK_OUT"
echo "   Server: $SERVER_UPDATES/app-debug.apk"
echo "   Manifest: $MANIFEST"
