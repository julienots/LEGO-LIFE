#!/usr/bin/env bash
# Construit dist/lego-powers.apk sans SDK Android : apktool (aapt2 + smali intégrés) + uber-apk-signer.
set -euo pipefail
cd "$(dirname "$0")"

TOOLS=tools/cache
mkdir -p "$TOOLS" dist
[ -f "$TOOLS/apktool.jar" ] || curl -sSLo "$TOOLS/apktool.jar" https://github.com/iBotPeaches/Apktool/releases/download/v2.10.0/apktool_2.10.0.jar
[ -f "$TOOLS/signer.jar" ]  || curl -sSLo "$TOOLS/signer.jar"  https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar

BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT
cp -r android "$BUILD/app"
mkdir -p "$BUILD/app/assets"
cp web/* "$BUILD/app/assets/"

java -jar "$TOOLS/apktool.jar" b "$BUILD/app" -o "$BUILD/unsigned.apk" -p "$BUILD/framework"
java -jar "$TOOLS/signer.jar" -a "$BUILD/unsigned.apk" -o "$BUILD/out" \
  --ks tools/powers-debug.keystore --ksAlias powers --ksPass android --ksKeyPass android
cp "$BUILD"/out/*.apk dist/lego-powers.apk
echo "OK -> dist/lego-powers.apk"
