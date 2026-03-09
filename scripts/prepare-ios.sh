#!/bin/bash
# Script to prepare web app for iOS integration

echo "🚀 Preparing Axolittle for iOS..."

# Build the web app
echo "📦 Building web app..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open Xcode and create a new iOS project"
echo "2. Copy the 'dist' folder to your Xcode project"
echo "3. Add the Swift files from 'ios-wrapper/' to your Xcode project"
echo "4. Follow the instructions in IOS_SETUP.md"
echo ""
echo "📁 Built files are in: ./dist/"
