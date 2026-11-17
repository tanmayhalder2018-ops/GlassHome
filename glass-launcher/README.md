# Glass Launcher

An iPadOS-style home screen for the Samsung Galaxy Tab S10 Lite (works on any Android 12+ device).

## Features
- Frosted-glass dock, widgets and page dots (real blur of the wallpaper behind them)
- Clock, calendar and battery widgets on the first page
- Swipe **down** for Search, swipe **up** for the App Library, swipe down from the **top edge** for notifications
- Long-press an icon for an iOS-style menu (blurred background, icon lifts): Add/Remove from Dock, Remove from Home, App Info, Uninstall
- Long-press empty space for jiggle mode — tap the minus to remove apps from the home screen, tap Settings to customise
- Zoom-from-icon app launch and a zoom-in effect when returning home
- 6 gradient wallpapers or any photo from your gallery
- Icon size (S/M/L) and app-name toggle; adapts to portrait and landscape

## Install
1. Open the repo's **Releases** page on the tablet and download `GlassLauncher.apk` from the newest *Glass Launcher* build.
2. Open it and allow "Install unknown apps" for your browser / My Files when asked.
3. Open Glass Launcher → long-press empty space → **Settings** → **Set as default home app** → choose Glass Launcher.
   (Or: Settings → Apps → Choose default apps → Home app.)

To go back to One UI Home, pick it again in Settings → Apps → Choose default apps → Home app.

## Build
GitHub Actions builds `GlassLauncher.apk` on every push to `glass-launcher/`.
Locally: `./gradlew assembleRelease` (needs the Android SDK, JDK 17).
The repo's `glass.keystore` (password `android`) signs every build so updates install over the old version.
