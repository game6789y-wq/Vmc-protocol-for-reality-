# VMC Protocol for Reality

Android-native test build setup for the VMC Protocol project.

## Project status

The repository currently contains a React/Vite web interface. The `android/` directory adds an **initial native Android test shell** as a separate application module. It is not yet a full native port of the existing 3D avatar, OSC transport, or VMC streaming features.

## Android Debug APK

GitHub Actions builds the Android debug variant when Android files change, on pull requests, or when manually started from the Actions tab.

1. Open **Actions → Android Debug APK**.
2. Select the latest successful run.
3. Download the `vmc-protocol-debug-apk` artifact.
4. Install `app-debug.apk` on an Android device for a basic launch test.

The workflow verifies the APK signature using Android's `apksigner` and records a SHA-256 checksum. The APK is signed with the standard Android debug certificate and is **for testing only**.

## Current native preview

- Native Android activity and launcher manifest
- Dark VMC-themed status screen
- Gradle-based Android build
- GitHub Actions build and APK signature verification
- Test APK artifact; no public Release is automatically published

## Before a production release

- Port and test the VMC packet parser, OSC transport, and 3D controls in native Android.
- Run device tests on supported Android versions.
- Review permissions, network security, and privacy.
- Configure a dedicated release keystore in GitHub Actions secrets; never commit the keystore or passwords.
- Verify the release signature and checksum before creating a public GitHub Release.

## Existing web app

The original React/Vite web interface and server remain in the repository. The native Android module is additive and does not replace them.
