# Quick Start: Getting Axolittle into Xcode

## What You Need to Do

### 1. Build the Web App ✅
```bash
npm run build
```
This creates a `dist/` folder with all static files.

### 2. Choose Your Approach

**Option A: Manual WKWebView Wrapper** (Quick start)
- Use the files in `ios-wrapper/` folder
- Create Xcode project manually
- Copy `dist/` folder to Xcode project
- See `ios-wrapper/README.md` for details

**Option B: Capacitor** (Recommended for production)
- Better integration and tooling
- Easier build process
- See `IOS_SETUP.md` for full instructions

### 3. Minimum Requirements

- **Xcode** installed on macOS
- **iOS 13.0+** as minimum deployment target
- **Built web app** (`dist/` folder from `npm run build`)

## Quick Setup Steps (Manual)

1. **Build web app:**
   ```bash
   npm run build
   ```

2. **Create Xcode project:**
   - Open Xcode → New Project
   - iOS → App
   - Name: `Axolittle`
   - Language: Swift

3. **Add wrapper code:**
   - Copy `ios-wrapper/ViewController.swift` to your Xcode project
   - Update `AppDelegate.swift` (or use provided template)

4. **Add web files:**
   - Drag `dist/` folder into Xcode
   - Choose "Create folder references" (blue folder icon)

5. **Configure:**
   - Set minimum iOS version: 13.0
   - Lock to portrait orientation
   - Update `Info.plist` with template values

6. **Build and run:**
   - Select simulator or device
   - Press ⌘R to build and run

## What's Already Done ✅

- ✅ Web app is mobile-optimized (viewport meta tags)
- ✅ Safe area insets handled in CSS
- ✅ Touch-friendly UI (designed for 7-14 year olds)
- ✅ localStorage works (game state persists)
- ✅ No external image dependencies (all CSS/SVG)
- ✅ Portrait orientation optimized

## What You Need to Add

- ⚠️ **Xcode project** (create new or use provided wrapper)
- ⚠️ **App icons** (for App Store)
- ⚠️ **Launch screen** (splash screen)
- ⚠️ **Bundle identifier** (com.yourcompany.axolittle)
- ⚠️ **Signing certificates** (for device testing)

## Testing Checklist

Once in Xcode, test:
- [ ] App launches and loads web content
- [ ] Game state saves (localStorage)
- [ ] Touch events work correctly
- [ ] All mini-games are playable
- [ ] Safe areas respected (notch, home indicator)
- [ ] Portrait lock works
- [ ] No console errors

## Files Created for You

- `IOS_SETUP.md` - Comprehensive setup guide
- `ios-wrapper/ViewController.swift` - WKWebView wrapper
- `ios-wrapper/AppDelegate.swift` - App delegate template
- `ios-wrapper/Info.plist.template` - Configuration template
- `scripts/prepare-ios.sh` - Build automation script

## Next Steps After Xcode Setup

1. Test on real device (not just simulator)
2. Test on different screen sizes (iPhone SE, iPhone Pro Max)
3. Test performance (memory, frame rate)
4. Add app icons and launch screen
5. Configure App Store metadata
6. Test App Store submission process

## Common Issues

**WebView is blank:**
- Check that `dist/` folder is added correctly
- Verify file paths in ViewController.swift
- Check Xcode console for errors

**localStorage not working:**
- Ensure WKWebsiteDataStore is configured
- Check app permissions

**Build errors:**
- Ensure minimum iOS 13.0+
- Check Swift version compatibility

## Recommended: Use Capacitor

For the easiest setup, use Capacitor:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init
npx cap add ios
npm run build
npx cap sync ios
npx cap open ios
```

This automatically:
- Creates Xcode project
- Sets up proper configuration
- Handles file copying
- Provides native plugin support

See `IOS_SETUP.md` for detailed Capacitor instructions.
