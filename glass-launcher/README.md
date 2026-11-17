# Glass Launcher

An iOS / iPadOS-style home screen. Two builds come out of every run:

- `GlassLauncher-TabS10Lite.apk` — Samsung Galaxy Tab S10 Lite (tablet layout, rotates)
- `GlassLauncher-OnePlusNord5.apk` — OnePlus Nord 5 (iPhone-style 4-column layout, portrait)

## Features
- Frosted-glass dock, widgets and page dots (real blur of the wallpaper behind them)
- Clock, calendar and battery widgets on the first page
- Swipe **down** for Search, swipe **up** for the App Library, swipe down from the **top edge** for notifications
- Long-press an icon for an iOS-style menu (blurred background, icon lifts): Add/Remove from Dock, Remove from Home, App Info, Uninstall
- Long-press empty space for jiggle mode — tap the minus to remove apps from the home screen, tap Settings to customise
- Zoom-from-icon app launch and a zoom-in effect when returning home
- Uses your real system wallpaper. Picking a wallpaper in the launcher sets it as the system (and lock screen) wallpaper too
- Allow "wallpaper access" once (Settings → Use my system wallpaper) so the glass blur and the unlock zoom work with any wallpaper
- iPhone-style unlock: wallpaper zooms out of a soft blur while the icons fly in
- Today view (swipe right from the first page) and the home widget row accept real Android widgets as well as the built-in glass widgets
- Runs at the screen's highest refresh rate (90/120 Hz)
- 6 gradient wallpapers or any photo from your gallery
- Icon size (S/M/L) and app-name toggle; adapts to portrait and landscape

## Install
1. Open the repo's **Releases** page on the device and download the APK for it from the newest *Glass Launcher* build.
2. Open it and allow "Install unknown apps" for your browser / My Files when asked.
3. Open Glass Launcher → long-press empty space → **Settings** → **Set as default home app** → choose Glass Launcher.
   (Or: Settings → Apps → Choose default apps → Home app.)

To go back to One UI Home, pick it again in Settings → Apps → Choose default apps → Home app.

## Build
GitHub Actions builds `GlassLauncher.apk` on every push to `glass-launcher/`.
Locally: `./gradlew assembleTabRelease assemblePhoneRelease` (needs the Android SDK, JDK 17).
The repo's `glass.keystore` (password `android`) signs every build so updates install over the old version.
