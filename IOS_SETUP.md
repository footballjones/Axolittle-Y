# iOS Setup Guide for Axolittle

This guide explains how to wrap the React/Vite web app in a native iOS shell using WKWebView for testing in Xcode.

## Overview

The game is built as a web app (React/Vite) that will be wrapped in a native iOS app using WKWebView. This allows you to test on real iOS devices while keeping the web-based codebase.

## Prerequisites

- **Xcode** (latest version recommended)
- **macOS** (required for Xcode)
- **Node.js** installed (for building the web app)
- **iOS device or Simulator** for testing

## Step 1: Build the Web App

First, build the production version of your web app:

```bash
npm install
npm run build
```

This creates a `dist/` folder with all the static files needed for the iOS app.

## Step 2: Create iOS Project Structure

You'll need to create an Xcode project. Here's the recommended structure:

```
Axolittle-iOS/
├── Axolittle/
│   ├── AppDelegate.swift
│   ├── SceneDelegate.swift
│   ├── ViewController.swift
│   ├── Info.plist
│   └── Assets.xcassets/
├── WebContent/
│   └── (copy dist/ files here)
└── Axolittle.xcodeproj
```

## Step 3: iOS Wrapper Implementation

The iOS app will use `WKWebView` to load your built web app. Key requirements:

### ViewController.swift
- Create a `WKWebView` that fills the screen
- Load `index.html` from the app bundle
- Handle device orientation (portrait only recommended)
- Configure for mobile web app (disable zoom, handle safe areas)

### Configuration
- Set minimum iOS version (iOS 13.0+ recommended)
- Configure app permissions if needed
- Set up proper viewport and safe area handling
- Disable user interaction for zooming/scrolling if needed

## Step 3: Build Script Integration

You can automate the build process:

1. **Option A: Manual Copy**
   - Run `npm run build`
   - Copy `dist/` contents to `WebContent/` in Xcode project
   - Build in Xcode

2. **Option B: Build Script in Xcode**
   - Add a "Run Script" build phase
   - Run `npm run build` before compilation
   - Copy files automatically

## Step 4: Testing Checklist

Before testing in Xcode:

- [ ] Web app builds successfully (`npm run build`)
- [ ] All assets load correctly (no 404s)
- [ ] localStorage works (game state persists)
- [ ] Touch events work properly
- [ ] Safe area insets are respected
- [ ] App works in portrait orientation
- [ ] No console errors in Safari Web Inspector

## Step 5: Device Testing

1. Connect your iOS device
2. Select your device in Xcode
3. Build and run
4. Test all game features on device
5. Use Safari Web Inspector for debugging (Settings → Safari → Advanced → Web Inspector)

## Important Considerations

### localStorage
- localStorage works in WKWebView
- Data persists between app launches
- Consider adding a "Clear Data" option in Settings for testing

### Performance
- Test on actual devices, not just simulator
- Monitor memory usage
- Test with low-end devices if targeting 7-14 year olds

### App Store Requirements
- App icons and launch screens
- Privacy policy (if collecting data)
- Age rating (likely 4+ for this game)
- App Store screenshots and metadata

## Alternative: Capacitor (Recommended for Production)

For a more robust solution, consider using **Capacitor**:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init
npx cap add ios
npm run build
npx cap sync ios
npx cap open ios
```

This provides:
- Better native integration
- Plugin ecosystem
- Easier build process
- Better performance

## Quick Start with Capacitor

If you want to use Capacitor (recommended):

1. Install Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/ios
   ```

2. Initialize Capacitor:
   ```bash
   npx cap init "Axolittle" "com.yourcompany.axolittle"
   ```

3. Add iOS platform:
   ```bash
   npx cap add ios
   ```

4. Build and sync:
   ```bash
   npm run build
   npx cap sync ios
   ```

5. Open in Xcode:
   ```bash
   npx cap open ios
   ```

## Troubleshooting

**Build fails:**
- Ensure all dependencies are installed
- Check Node.js version (v18+)
- Clear node_modules and reinstall

**WebView shows blank:**
- Check file paths in bundle
- Verify index.html is in the right location
- Check Xcode console for errors

**localStorage not working:**
- Ensure WKWebView configuration allows data storage
- Check app permissions

**Touch events not working:**
- Verify viewport meta tag is correct
- Check WKWebView user interaction settings

## Next Steps

1. Choose approach: Manual WKWebView wrapper or Capacitor
2. Set up Xcode project
3. Build web app and integrate
4. Test on device
5. Iterate based on testing feedback
