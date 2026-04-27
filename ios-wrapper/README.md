# iOS Wrapper for Axolittle

This folder contains the native iOS wrapper code for the Axolittle web app.

## Setup Instructions

### Option 1: Manual Xcode Project Setup

1. **Create a new Xcode project:**
   - Open Xcode
   - File → New → Project
   - Choose "iOS" → "App"
   - Product Name: `Axolittle`
   - Interface: `Storyboard` (or `SwiftUI` if preferred)
   - Language: `Swift`

2. **Add the wrapper files:**
   - Copy `ViewController.swift` to your project
   - Copy `AppDelegate.swift` to your project (or modify existing)
   - Update `Info.plist` with the template values

3. **Build the web app:**
   ```bash
   cd /path/to/Axolittleui
   npm run build
   ```

4. **Add web files to Xcode:**
   - In Xcode, right-click your project
   - "Add Files to Axolittle..."
   - Select the `dist/` folder
   - Check "Create folder references" (blue folder, not yellow)
   - This ensures the folder structure is preserved

5. **Configure build settings:**
   - Set minimum iOS version to 13.0 or higher
   - Ensure "Embedded Content Contains Swift Code" is set if needed

6. **Build and run:**
   - Select a simulator or device
   - Build and run (⌘R)

### Option 2: Use Capacitor (Recommended)

See the main `IOS_SETUP.md` for Capacitor setup instructions. This is the recommended approach for production.

## File Structure

```
ios-wrapper/
├── ViewController.swift          # Main WKWebView controller
├── BundleURLSchemeHandler.swift  # Serves dist/ assets under axolittle:// scheme
├── AppDelegate.swift             # App delegate (if not using Storyboard)
├── Axolittle_BetaApp.swift       # SwiftUI App entry point
├── ContentView.swift             # SwiftUI host for ViewController
├── Info.plist.template           # App configuration template
├── PrivacyInfo.xcprivacy         # Privacy manifest
└── README.md                     # This file
```

## How Web Content Is Loaded

The wrapper does **not** use `loadFileURL` against a temp file or copy
`index.html` to the temp directory — WebKit blocks that with:

> Navigation error: ignoring request to load this main resource because it is
> outside the sandbox

Instead, `ViewController` registers `BundleURLSchemeHandler` for a custom
`axolittle://` scheme on the `WKWebViewConfiguration` and loads
`axolittle:///index.html`. The handler streams `index.html` and every relative
asset (`./assets/…`, `/music/…`, `/sounds/…`, `/spine/…`, etc.) straight from
the bundled `dist/` folder, sets correct MIME types, and supports HTTP Range
requests so audio streaming doesn't stall. This gives the page a real,
non-`null` origin so `<script type="module">`, `fetch()`, and WebGL texture
loads all behave like normal same-origin requests.

If you start a fresh Xcode project, copy **both** `ViewController.swift` and
`BundleURLSchemeHandler.swift` over — the controller alone won't work without
the handler.

## Key Features

- **WKWebView + custom URL scheme**: Loads the built web app from the bundle without sandbox errors
- **Portrait Lock**: App stays in portrait orientation
- **localStorage Support**: Game state persists
- **No Zoom**: Prevents accidental zooming
- **Safe Area Handling**: Respects device safe areas (notch, etc.)
- **Range request support**: Audio/video streaming works correctly

## Testing

1. Build the web app: `npm run build`
2. Sync files to Xcode project
3. Run on simulator or device
4. Use Safari Web Inspector for debugging:
   - Connect device
   - Safari → Develop → [Your Device] → Axolittle

## Troubleshooting

**WebView is blank or shows "Missing bundled web assets":**
- Confirm `dist/` is in the app target's **Build Phases → Copy Bundle Resources**
- Confirm `dist/` was added as a **folder reference (blue icon)**, not a group (yellow). A group flattens the directory and breaks paths like `dist/assets/…`.
- Confirm `BundleURLSchemeHandler.swift` is in the target's **Compile Sources**
- Check the Xcode console — the scheme handler logs `❌ Not found: <path>` when a request can't be resolved, which tells you exactly which asset is missing
- Run `npm run build` to regenerate `dist/` if it's stale

**Sandbox navigation error ("outside the sandbox"):**
- This means something is loading the page via `loadFileURL` from a temp path. Confirm `ViewController.loadWebApp()` calls `webView.load(URLRequest(url: …axolittle:///index.html))` and that the scheme handler is registered on the `WKWebViewConfiguration` **before** the `WKWebView` is created.

**localStorage not working:**
- Ensure `WKWebsiteDataStore.default()` is used in config
- Check app permissions

**Build errors:**
- Ensure minimum iOS version is 13.0+
- Check that all Swift files compile
