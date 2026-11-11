#!/usr/bin/env bash
# iOS sürümünü derler, App Store imzasıyla imzalar ve isterse App Store Connect'e (TestFlight) yükler.
#
#   ./build-ios.sh            → bundle/ios/export/Golem Forge.ipa (App Store imzalı)
#   ./build-ios.sh upload     → aynısını App Store Connect'e yükler (TestFlight'ta işlenir)
#
# Adımlar:
#  1. Defold (bob.jar) cihaz için release derler; ekibin geliştirme profiliyle imzalar (bob imza ister).
#  2. Info.plist'e derleme numarası (git commit sayısı) ve şifreleme beyanı eklenir.
#  3. Uygulama bir .xcarchive'e sarılır; xcodebuild -exportArchive App Store imzasını atar
#     (dağıtım sertifikası ve profili Xcode otomatik yönetir) ve istenirse yükler.
#
# Gerekenler:
#  - Xcode, ve Xcode'a ekleme yetkisi olan bir Apple hesabı (Xcode → Ayarlar → Hesaplar),
#    YA DA bir App Store Connect API anahtarı: ASC_KEY_ID, ASC_ISSUER_ID ve ASC_KEY_PATH (.p8) ortam değişkenleri.
#  - Yükleme için App Store Connect'te bu paket kimliğiyle (com.akcware.golemforge) bir uygulama kaydı.
set -euo pipefail
cd "$(dirname "$0")"

MODE="${1:-export}"
TEAM_ID="${TEAM_ID:-C9F7T2W586}"
JAVA="${DEFOLD_JAVA:-$HOME/Defold/editor/Defold/packages/jdk-25.0.4.1+1/bin/java}"
[ -x "$JAVA" ] || JAVA=/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home/bin/java
BOB="${DEFOLD_BOB:-$HOME/Defold/bob.jar}"
OUT=bundle/ios
APP_NAME="Golem Forge"

# bob, iOS paketini imzalamak için bir kimlik ve profil ister. Bu ara imza App Store imzasıyla değiştirilir.
DEV_IDENTITY="${DEV_IDENTITY:-$(security find-identity -v -p codesigning | sed -n 's/.*"\(Apple Development: [^"]*\)".*/\1/p' | head -1)}"
if [ -z "${DEV_PROFILE:-}" ]; then
  for f in "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/"* "$HOME/Library/MobileDevice/Provisioning Profiles/"*; do
    [ -f "$f" ] || continue
    id=$(security cms -D -i "$f" 2>/dev/null | plutil -extract Entitlements.application-identifier raw -o - - 2>/dev/null || true)
    if [ "$id" = "$TEAM_ID.*" ] || [ "$id" = "$TEAM_ID.com.akcware.golemforge" ]; then DEV_PROFILE="$f"; break; fi
  done
fi
[ -n "$DEV_IDENTITY" ] || { echo "Apple Development imza kimliği bulunamadı (Xcode → Ayarlar → Hesaplar)."; exit 1; }
[ -n "${DEV_PROFILE:-}" ] || { echo "Geliştirme profili bulunamadı; DEV_PROFILE ile .mobileprovision yolunu ver."; exit 1; }

# 1. derleme
(cd .. && npx tsx tools/bake-music.ts)
rm -rf "$OUT"
"$JAVA" -jar "$BOB" --root . --platform arm64-ios --architectures arm64-ios --variant release \
  --archive --texture-compression true \
  --identity "$DEV_IDENTITY" --mobileprovisioning "$DEV_PROFILE" \
  --bundle-output "$OUT/build" --build-server https://build.defold.com resolve build bundle

# 2. Info.plist
APP="$OUT/build/$APP_NAME.app"
BUILD_NUMBER="${BUILD_NUMBER:-$(git rev-list --count HEAD)}"
VERSION=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Info.plist")
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$APP/Info.plist"
# Defold CFBundleName'i boş bırakıyor; Xcode IPA adını ondan alır
/usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_NAME" "$APP/Info.plist"
# Yalnızca standart TLS (wss://) kullanılıyor: ihracat şifreleme beyanı "muaf"
/usr/libexec/PlistBuddy -c 'Delete :ITSAppUsesNonExemptEncryption' "$APP/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c 'Add :ITSAppUsesNonExemptEncryption bool false' "$APP/Info.plist"
echo "Sürüm $VERSION ($BUILD_NUMBER)"
# bob joker profilin yetkileriyle (TEAM.*) imzalar; Xcode dağıtım imzasında uygulama kimliğinin tam eşleşmesini
# ister. Info.plist de değiştiği için uygulamayı paket kimliğine özgü yetkilerle yeniden imzala.
cat > "$OUT/entitlements.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>application-identifier</key><string>$TEAM_ID.com.akcware.golemforge</string>
  <key>com.apple.developer.team-identifier</key><string>$TEAM_ID</string>
  <key>get-task-allow</key><true/>
  <key>keychain-access-groups</key><array><string>$TEAM_ID.com.akcware.golemforge</string></array>
</dict></plist>
EOF
codesign -f -s "$DEV_IDENTITY" --entitlements "$OUT/entitlements.plist" "$APP"

# 3. .xcarchive
ARCHIVE="$OUT/$APP_NAME.xcarchive"
mkdir -p "$ARCHIVE/Products/Applications"
cp -R "$APP" "$ARCHIVE/Products/Applications/"
cat > "$ARCHIVE/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>ApplicationProperties</key><dict>
    <key>ApplicationPath</key><string>Applications/$APP_NAME.app</string>
    <key>Architectures</key><array><string>arm64</string></array>
    <key>CFBundleIdentifier</key><string>com.akcware.golemforge</string>
    <key>CFBundleShortVersionString</key><string>$VERSION</string>
    <key>CFBundleVersion</key><string>$BUILD_NUMBER</string>
    <key>SigningIdentity</key><string>$DEV_IDENTITY</string>
    <key>Team</key><string>$TEAM_ID</string>
  </dict>
  <key>ArchiveVersion</key><integer>2</integer>
  <key>CreationDate</key><date>$(date -u +%Y-%m-%dT%H:%M:%SZ)</date>
  <key>Name</key><string>$APP_NAME</string>
  <key>SchemeName</key><string>$APP_NAME</string>
</dict></plist>
EOF

DEST=export; [ "$MODE" = "upload" ] && DEST=upload
cat > "$OUT/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>$DEST</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><false/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
EOF

AUTH=()
if [ -n "${ASC_KEY_ID:-}" ]; then
  AUTH=(-authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID" -authenticationKeyPath "$ASC_KEY_PATH")
fi
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist "$OUT/ExportOptions.plist" \
  -exportPath "$OUT/export" -allowProvisioningUpdates ${AUTH[@]+"${AUTH[@]}"}

if [ "$DEST" = upload ]; then
  echo "Yüklendi: $VERSION ($BUILD_NUMBER). App Store Connect → TestFlight'ta işlenmesi 5-30 dk sürer."
else
  echo "Hazır: $OUT/export/$APP_NAME.ipa"
fi
