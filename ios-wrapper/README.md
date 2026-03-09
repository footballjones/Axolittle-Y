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
├── ViewController.swift      # Main WKWebView controller
├── AppDelegate.swift         # App delegate (if not using Storyboard)
├── Info.plist.template       # App configuration template
└── README.md                 # This file
```

## Key Features

- **WKWebView**: Loads the built web app
- **Portrait Lock**: App stays in portrait orientation
- **localStorage Support**: Game state persists
- **No Zoom**: Prevents accidental zooming
- **Safe Area Handling**: Respects device safe areas (notch, etc.)

## Testing

1. Build the web app: `npm run build`
2. Sync files to Xcode project
3. Run on simulator or device
4. Use Safari Web Inspector for debugging:
   - Connect device
   - Safari → Develop → [Your Device] → Axolittle

## Troubleshooting

**WebView is blank:**
- Check that `dist/` folder is added to Xcode project
- Verify file paths in `ViewController.swift`
- Check Xcode console for errors

**localStorage not working:**
- Ensure `WKWebsiteDataStore.default()` is used in config
- Check app permissions

**Build errors:**
- Ensure minimum iOS version is 13.0+
- Check that all Swift files compile
