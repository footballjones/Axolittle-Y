# Android Wrapper for Axolittle

Native Android wrapper that loads the built web app inside a `WebView`
using `WebViewAssetLoader` — the same pattern as the iOS WKWebView wrapper.

---

## How it works

Instead of `file://` (which breaks localStorage), the app serves the
`dist/` folder via a trusted `https://appassets.androidplatform.net/`
scheme. `WebViewAssetLoader` intercepts those requests and serves files
directly from `src/main/assets/` — no network traffic involved.

```
https://appassets.androidplatform.net/assets/dist/index.html
                                             ↓
                             src/main/assets/dist/index.html
```

Relative paths in `index.html` (`./assets/index-xxx.js`, `music/`, etc.)
all resolve correctly from that base URL.

---

## Setup in Android Studio

### 1. Create a new project

- Open Android Studio → **New Project**
- Template: **Empty Activity**
- Name: `Axolittle`
- Package name: `com.uomalabs.axolittle`
- Language: **Kotlin**
- Minimum SDK: **API 26 (Android 8.0)**

### 2. Add the wrapper files

Copy these files from `android-wrapper/` into your project:

| Source file | Destination in project |
|-------------|------------------------|
| `MainActivity.kt` | `app/src/main/java/com/uomalabs/axolittle/MainActivity.kt` |
| `AndroidManifest.xml` | `app/src/main/AndroidManifest.xml` (replace existing) |
| `app.build.gradle.kts` | `app/build.gradle.kts` (replace existing content) |

### 3. Build the web app

```bash
cd /path/to/Axolittle-Y
npm run build:ios     # same output works for Android
```

### 4. Copy dist/ into the Android project

```bash
# From the web repo root:
cp -R dist/ /path/to/android-project/app/src/main/assets/dist/
```

The final asset layout should look like:
```
app/src/main/assets/
└── dist/
    ├── index.html
    ├── assets/
    │   ├── index-xxxxx.js
    │   └── index-xxxxx.css
    ├── music/
    │   ├── aquarium/
    │   └── mini-games/
    └── sounds/
```

### 5. Sync and build

- Click **Sync Now** after editing `build.gradle.kts`
- **Build → Make Project** (Ctrl+F9)
- Run on emulator or device

---

## Debugging

Enable Chrome DevTools remote debugging:
1. Run the app on a device or emulator
2. Open Chrome on your desktop → `chrome://inspect`
3. Find **Axolittle** under Remote Target and click **inspect**

(Debug builds only — `WebView.setWebContentsDebuggingEnabled(true)` is
guarded by `BuildConfig.DEBUG` in `MainActivity.kt`.)

---

## Key differences vs iOS wrapper

| | iOS | Android |
|---|---|---|
| WebView class | `WKWebView` | `WebView` |
| Asset serving | `WKURLSchemeHandler` (`axolittle://`) | `WebViewAssetLoader` (`https://`) |
| Asset location | App bundle via build script | `src/main/assets/dist/` |
| localStorage | `WKWebsiteDataStore.default()` | `domStorageEnabled = true` |
| Debug tool | Safari Web Inspector | Chrome DevTools (`chrome://inspect`) |

---

## Troubleshooting

**White screen:**
- Confirm `dist/` is at `app/src/main/assets/dist/index.html`
- Check Logcat for `WebView` errors
- Open Chrome DevTools to inspect console errors

**Audio not playing:**
- `mediaPlaybackRequiresUserGesture = false` is set in `MainActivity.kt`
- Confirm mp3 files are inside `src/main/assets/dist/music/` and `sounds/`

**localStorage not persisting:**
- `domStorageEnabled = true` must be set (already in `MainActivity.kt`)
- Do NOT use `file://` URLs — the asset loader handles this correctly

**Build error — unresolved `WebViewAssetLoader`:**
- Confirm `implementation("androidx.webkit:webkit:1.12.1")` is in `build.gradle.kts`
- Click **Sync Now** in Android Studio
