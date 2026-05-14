# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Capacitor 8 wrapper that packages the Next.js client portal (`/clients`, `/solicitar`) as a native iOS and Android app for **Jorge Minnesota Logistic LLC**. The web app is built in the parent directory — this directory only contains Capacitor config, native projects, and the build pipeline.

**App ID:** `com.jorgeminnesota.clientes`

## Commands

```bash
# Full build pipeline: export Next.js → copy to www/ → redirect index → cap sync
bash build.sh

# Platform-specific sync and open
npx cap sync ios
npx cap sync android
npx cap open ios        # Opens Xcode (use .xcodeproj, NOT .xcworkspace)
npx cap open android    # Opens Android Studio
```

No test framework, linter, or dev server exists in this directory. The web content is developed and tested from the parent directory (`npm run dev` there).

## Build Pipeline (`build.sh`)

1. Runs `npm run export` from the parent directory (Next.js static export to `out/`)
2. Copies `out/` → `mobile/www/`
3. Replaces `www/index.html` with a redirect to `/clients.html` (so the app opens the client portal)
4. Runs `npx cap sync` to push web assets + plugins to native projects

The `www/` directory is the build artifact — it's a copy of the parent's `out/` folder. Don't edit files in `www/` directly.

## Critical Configuration

- **`CapacitorHttp.enabled: false`** in `capacitor.config.json` — this is intentional. Enabling it breaks Firestore WebChannel streaming. Do not change this.
- **`server.allowNavigation`** includes `jorgeminnesota.duckdns.org` for the scraper API
- **Keyboard resize mode** is set to `"body"` to handle iOS keyboard overlap
- **Splash screen** auto-hides after 1500ms

## Native Projects

- **iOS:** `ios/App/App.xcodeproj` — uses Swift Package Manager (SPM), not CocoaPods. Open `.xcodeproj`, not `.xcworkspace`.
- **Android:** Standard Gradle project. `google-services.json` is optional — push notifications won't work without it. Min SDK 24, target SDK 36.

## Capacitor Plugins

| Plugin | Purpose |
|--------|---------|
| `@capacitor/push-notifications` | FCM push notifications (requires APNs setup for iOS) |
| `@capacitor/keyboard` | Keyboard resize behavior |
| `@capacitor/splash-screen` | Native splash screen |
| `@capacitor/status-bar` | Status bar styling |
| `@capacitor/haptics` | Haptic feedback |
| `@capacitor/app` | App lifecycle events |

## Assets

`assets/` contains source images for app icons and splash screens:
- `icon-only.png`, `icon-foreground.png`, `icon-background.png` — adaptive icon layers
- `splash.png` — splash screen source

## Known Issues

- Push notifications require Apple Developer Account ($99/year) + APNs key upload to Firebase Console. Only work on real devices, not simulators.
- CORS may block scraper API fetches from Capacitor WebView origin (`capacitor://localhost`) since `CapacitorHttp` is disabled. Fix requires CORS headers on the scraper server.
- `versionCode` and `versionName` in `android/app/build.gradle` are still at `1` / `"1.0"` — bump before store submission.
