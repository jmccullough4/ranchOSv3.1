# RanchOS iOS - Quick Start Guide

Get the RanchOS iOS app running in 5 minutes.

## Prerequisites

- macOS with Xcode 15.0+
- iOS 17.0+ device or simulator
- RanchOS backend running (see main README.md)

## Step 1: Create Xcode Project

Since we have Swift source files but no generated .xcodeproj, create a new project:

1. Open Xcode
2. File → New → Project
3. Choose **iOS** → **App**
4. Configure:
   - Product Name: `RanchOS`
   - Team: (your team or personal)
   - Organization Identifier: `com.3strandscattle`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: None (we're not using Core Data)
   - Include Tests: Optional
5. Save in `ios-app/` directory (or anywhere you prefer)

## Step 2: Add Source Files

1. Delete the generated `ContentView.swift` and `RanchOSApp.swift` from the project
2. Drag all files from `RanchOS/` directory into your Xcode project:
   - `RanchOSApp.swift`
   - `ContentView.swift`
   - `Models/RanchModels.swift`
   - `Services/APIClient.swift`
   - `Services/ServerConfigManager.swift`
   - `Utilities/SecureStorage.swift`
   - All Views from `Views/` directory
3. When prompted, choose:
   - ✅ Copy items if needed
   - ✅ Create groups (not folder references)
   - ✅ Add to targets: RanchOS

## Step 3: Configure Info.plist

Replace the default Info.plist with the one from `RanchOS/Info.plist`, or add these keys manually:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>

<key>NSLocationWhenInUseUsageDescription</key>
<string>RanchOS needs your location to show your position on the ranch map.</string>
```

## Step 4: Add Capabilities

1. Select project in navigator
2. Select RanchOS target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add **Keychain Sharing**
6. Set keychain group to: `com.3strandscattle.RanchOS`

## Step 5: Start Backend Server

In your main ranchOSv2 directory:

```bash
# Option 1: Development mode
npm run dev

# Option 2: Docker
docker compose up --build
```

Backend will run on `http://localhost:8082`

## Step 6: Run the App

1. Select target device (iPhone 15 Pro simulator works great)
2. Click Run (Cmd+R)
3. Wait for build to complete

## Step 7: Configure and Login

### First Launch - Server Configuration

When app launches:

1. You'll see the server configuration screen
2. For local development, enter:
   ```
   http://localhost:8082
   ```
3. Click "Continue to Login"

**Note**: If testing on physical device, use your Mac's local IP:
```bash
# Find your IP
ifconfig | grep "inet " | grep -v 127.0.0.1
# Use: http://YOUR_IP:8082
```

### Login

Use demo credentials:
- Username: `jay` (or `kevin`, `april`, `ashley`)
- Password: `3strands`

Click "Access System"

## Step 8: Explore

You're in! Navigate through tabs:

- **Map**: Real-time cattle tracking
- **Sensors**: System monitoring
- **Cameras**: Live feeds
- **Cattle**: Herd management
- **Admin**: Settings (admin role only)

## Troubleshooting

### "Cannot reach server"

**Issue**: Server URL validation fails

**Fix**:
```bash
# Ensure backend is running
cd /path/to/ranchOSv2
npm run dev

# Check it's accessible
curl http://localhost:8082/api/config
```

### "Transport Security" Error

**Issue**: iOS blocks HTTP connections

**Fix**: Verify Info.plist has `NSAllowsLocalNetworking` and `NSAllowsArbitraryLoads`

### "No Such Module" Errors

**Issue**: Missing imports

**Fix**: Ensure iOS Deployment Target is 17.0+ (Project Settings → General → Deployment Info)

### Keychain Errors

**Issue**: SecureStorage fails to save

**Fix**: Add Keychain Sharing capability with group `com.3strandscattle.RanchOS`

### Map Not Showing Cattle

**Issue**: Empty map or no markers

**Fix**:
1. Check backend is returning data: `curl http://localhost:8082/api/herd`
2. Verify cattle have valid lat/lon coordinates
3. Check console in Xcode for API errors

## Next Steps

### Customize

- Change app name in project settings
- Update bundle identifier
- Add your company logo (replace system icons)
- Modify color scheme in views

### Test Features

- Toggle gates from Sensors tab
- Search cattle by ID or name
- View stray detection alerts
- Watch camera feeds
- Check admin panel statistics

### Deploy

- Connect physical iOS device
- Configure signing with your team
- Build and run on device
- Test over WiFi/cellular with production server URL

## File Structure Overview

```
RanchOS/
├── RanchOSApp.swift              # Entry point
├── ContentView.swift              # Router
├── Models/
│   └── RanchModels.swift         # API models
├── Services/
│   ├── APIClient.swift           # REST client
│   └── ServerConfigManager.swift # URL config
├── Utilities/
│   └── SecureStorage.swift       # Keychain
└── Views/
    ├── ServerConfigView.swift    # Setup
    ├── LoginView.swift           # Auth
    ├── MainTabView.swift         # Dashboard
    ├── MapTabView.swift          # Map
    ├── SensorsTabView.swift      # Sensors
    ├── CamerasTabView.swift      # Cameras
    ├── CattleTabView.swift       # Herd
    └── AdminTabView.swift        # Admin
```

## Support

- Review main README.md for detailed documentation
- Check backend CLAUDE.md for API details
- Inspect Xcode console for errors
- Test API endpoints with curl/Postman

---

**You're ready to go!** The app should now be polling the backend and displaying real-time ranch data.
