# RanchOS iOS Application - Complete Integration Guide

This guide documents the native iOS application for RanchOS, providing full integration details for development and deployment.

## Table of Contents

1. [Overview](#overview)
2. [Multi-Tenant Architecture](#multi-tenant-architecture)
3. [File Structure](#file-structure)
4. [Setup Instructions](#setup-instructions)
5. [API Integration](#api-integration)
6. [Security Implementation](#security-implementation)
7. [UI Components](#ui-components)
8. [Data Flow](#data-flow)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Checklist](#deployment-checklist)

## Overview

The RanchOS iOS application is a **native Swift/SwiftUI app** that provides complete access to the RanchOS ranch management platform on iPhone and iPad devices.

### Key Features

- **Multi-tenant server configuration** - Each ranch customer gets their own server URL
- **Secure authentication** - Username/password with Keychain credential storage
- **Real-time data polling** - Live updates for sensors, herd, gates, cameras
- **Interactive mapping** - MapKit integration with cattle tracking
- **Camera monitoring** - WKWebView for YouTube security feed embeds
- **Offline-ready architecture** - Local state management with SwiftUI

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Swift | 5.9+ |
| UI Framework | SwiftUI | iOS 17+ |
| Networking | URLSession | Native |
| Maps | MapKit | Native |
| Security | Keychain Services | Native |
| Web Content | WKWebView | Native |

**No third-party dependencies required** - the app uses only native iOS frameworks.

## Multi-Tenant Architecture

### Critical Design Principle

RanchOS is a **SaaS product** with multiple independent ranch customers. Each customer:

- Has their own unique server URL (e.g., `https://ranch-3strands.ranchos.app`)
- Operates in complete isolation from other ranches
- Configures their server URL on first app launch
- Cannot access other ranches' data

### Server URL Flow

```
App Launch
    ↓
Check ServerConfigManager.shared.getServerURL()
    ↓
    ├─ URL exists → Show LoginView
    └─ URL is nil → Show ServerConfigView
                      ↓
                   User enters URL (e.g., "http://localhost:8082")
                      ↓
                   Validate URL format
                      ↓
                   Test server health (HEAD request)
                      ↓
                   Save to UserDefaults
                      ↓
                   Proceed to LoginView
```

### Implementation Files

- **ServerConfigManager.swift** - Manages server URL persistence and validation
- **ServerConfigView.swift** - UI for entering and validating server URL
- **APIClient.swift** - Builds API URLs using configured server

## File Structure

```
ios-app/
├── README.md                      # Comprehensive documentation
├── QUICKSTART.md                  # 5-minute setup guide
│
├── RanchOS.xcodeproj/             # Xcode project file
│   └── project.pbxproj            # Project configuration
│
└── RanchOS/                       # Source code directory
    │
    ├── RanchOSApp.swift           # App entry point, AppState
    ├── ContentView.swift          # Main router
    ├── Info.plist                 # App configuration
    │
    ├── Models/                    # Data models
    │   └── RanchModels.swift      # Codable models matching API
    │
    ├── Services/                  # Business logic
    │   ├── APIClient.swift        # REST API client
    │   └── ServerConfigManager.swift  # Server URL management
    │
    ├── Utilities/                 # Helper classes
    │   └── SecureStorage.swift    # Keychain wrapper
    │
    ├── Views/                     # SwiftUI views
    │   ├── ServerConfigView.swift # Server configuration
    │   ├── LoginView.swift        # Authentication
    │   ├── MainTabView.swift      # Tab navigation
    │   ├── MapTabView.swift       # Live map
    │   ├── SensorsTabView.swift   # Sensor dashboard
    │   ├── CamerasTabView.swift   # Camera feeds
    │   ├── CattleTabView.swift    # Herd management
    │   └── AdminTabView.swift     # Admin panel
    │
    └── Resources/                 # Assets
        └── Assets.xcassets/       # Images, colors
            └── AppIcon.appiconset/
```

## Setup Instructions

### Prerequisites

1. **macOS** with Xcode 15.0 or later
2. **iOS device or simulator** running iOS 17.0+
3. **RanchOS backend** running (Express server on port 8082)

### Quick Setup (5 minutes)

See [QUICKSTART.md](ios-app/QUICKSTART.md) for detailed steps.

**TL;DR:**
1. Create new iOS App project in Xcode
2. Copy Swift files from `ios-app/RanchOS/` to project
3. Add Keychain Sharing capability
4. Configure Info.plist for HTTP (development only)
5. Run app, enter server URL, login

### Development Server Configuration

For **local development**, you have two options:

#### Option 1: Simulator with Localhost

```
Server URL: http://localhost:8082
```

Works when:
- Running iOS Simulator on same Mac as backend
- Backend started with `npm run dev` or `docker compose up`

#### Option 2: Physical Device with Local IP

```bash
# Find your Mac's IP address
ifconfig | grep "inet " | grep -v 127.0.0.1
# Example output: inet 192.168.1.100

# Use in app:
Server URL: http://192.168.1.100:8082
```

Works when:
- Testing on physical iPhone/iPad
- Device and Mac on same WiFi network
- Firewall allows port 8082

### Production Configuration

For **production deployment**:

```
Server URL: https://ranch-yourname.ranchos.app
```

Requirements:
- HTTPS only (no HTTP)
- Valid SSL certificate
- Remove `NSAllowsArbitraryLoads` from Info.plist

## API Integration

### REST Client Architecture

The app uses `URLSession` with Swift's modern async/await:

```swift
// Example: Fetch herd data
let herd = try await APIClient.shared.fetchHerd()
// Returns: HerdResponse { herd: [Cattle] }
```

### Endpoint Mapping

| Endpoint | Method | Purpose | Returns |
|----------|--------|---------|---------|
| `/api/login` | POST | Authentication | `LoginResponse` |
| `/api/config` | GET | Ranch configuration | `ConfigResponse` |
| `/api/sensors` | GET | Sensor readings | `SensorsResponse` |
| `/api/herd` | GET | Cattle positions | `HerdResponse` |
| `/api/gates` | GET | Gate statuses | `GatesResponse` |
| `/api/gates` | POST | Toggle gate | `GatesResponse` |
| `/api/cameras` | GET | Camera feeds | `CamerasResponse` |
| `/api/chute` | GET | Chute transaction | `ChuteResponse` |
| `/api/stray-alerts` | GET | AI stray detection | `StrayAlertsResponse` |
| `/api/pastures` | GET | Pasture boundaries | `PasturesResponse` |
| `/api/version` | GET | Version info | `VersionResponse` |

### Data Polling System

The `RanchDataManager` class manages real-time data updates:

```swift
class RanchDataManager: ObservableObject {
    // Polling intervals (matching web app)
    private let sensorRefreshInterval: TimeInterval = 5.0   // 5 seconds
    private let herdRefreshInterval: TimeInterval = 4.0     // 4 seconds
    private let gateRefreshInterval: TimeInterval = 6.0     // 6 seconds
    private let chuteRefreshInterval: TimeInterval = 8.0    // 8 seconds
    private let cameraRefreshInterval: TimeInterval = 10.0  // 10 seconds
    private let strayRefreshInterval: TimeInterval = 7.0    // 7 seconds
}
```

**Lifecycle:**
- Polling starts when `MainTabView` appears (user authenticated)
- Polling stops when app backgrounds or user logs out
- Manual refresh available via pull-to-refresh and toolbar buttons

### Error Handling

```swift
enum APIError: Error {
    case serverNotConfigured    // No server URL set
    case invalidURL            // Malformed URL
    case networkError(Error)   // Network failure
    case invalidResponse       // Non-HTTP response
    case httpError(Int, String?) // HTTP error (401, 500, etc.)
    case decodingError(Error)  // JSON parsing failed
    case unauthorized          // 401 Invalid credentials
}
```

Each error provides localized description for user-facing messages.

## Security Implementation

### Keychain Credential Storage

The `SecureStorage` class wraps iOS Keychain Services:

```swift
// Save credentials
SecureStorage.shared.saveCredentials(username: "jay", password: "3strands")

// Retrieve credentials
if let (username, password) = SecureStorage.shared.getCredentials() {
    // Auto-fill login form
}

// Clear on logout
SecureStorage.shared.clearCredentials()
```

**Security properties:**
- Data encrypted at rest by iOS
- Access restricted to app with matching bundle ID
- Protected by device passcode/biometrics
- `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` - no iCloud sync

### Authentication Flow

```
LoginView
    ↓
Enter username/password
    ↓
APIClient.shared.login(username, password)
    ↓
POST /api/login with JSON body
    ↓
Backend validates credentials
    ↓
    ├─ Success (200) → { status: "ok", user: "jay", role: "admin" }
    │                   ↓
    │                Save to Keychain (if "Remember" enabled)
    │                   ↓
    │                appState.login(username, role)
    │                   ↓
    │                Navigate to MainTabView
    │
    └─ Failure (401) → { detail: "Invalid credentials" }
                        ↓
                     Display error message
                        ↓
                     Clear password field
```

### Network Security

**Development (HTTP allowed):**
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

**Production (HTTPS required):**
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

## UI Components

### View Hierarchy

```
ContentView (Router)
    ├─ ServerConfigView (if no server URL)
    ├─ LoginView (if not authenticated)
    └─ MainTabView (authenticated)
           ├─ MapTabView
           ├─ SensorsTabView
           ├─ CamerasTabView
           ├─ CattleTabView
           └─ AdminTabView (admin only)
```

### MapTabView Features

- **MapKit Integration**: Native Apple Maps with hybrid satellite view
- **Cattle Annotations**: Interactive markers for each cow
- **Gate Markers**: Color-coded by status (green=closed, red=open)
- **Stray Alerts**: Orange warning markers for wandering cattle
- **Fence Overlay**: Yellow polygon showing property boundaries
- **Pasture Boundaries**: Blue polygons for designated pastures
- **Controls**: Zoom, compass, center-on-ranch button

**Why MapKit instead of Mapbox?**
1. No third-party SDK required (native to iOS)
2. Smaller app size (~20MB savings)
3. Better performance (native graphics pipeline)
4. No token management
5. Free unlimited usage

### CamerasTabView Features

- **WKWebView Integration**: Embeds YouTube camera feeds
- **Grid Layout**: 2-column responsive grid
- **Predator Alerts**: Red banner when threats detected
- **Online/Offline Indicators**: Real-time status display
- **Full-Screen Mode**: Tap camera to expand

**WKWebView Configuration:**
```swift
let configuration = WKWebViewConfiguration()
configuration.allowsInlineMediaPlayback = true
configuration.mediaTypesRequiringUserActionForPlayback = []
```

This allows auto-play of YouTube embeds without user interaction.

### SensorsTabView Features

- **System Status Banner**: Critical/Warning/Normal indicator
- **Sensor Cards**: Grid of status tiles with color coding
  - Green: Normal
  - Yellow: Warning
  - Red: Critical
- **Gate Controls**: Toggle buttons for opening/closing gates
- **Chute Transactions**: Latest weighing scale activity

### CattleTabView Features

- **Searchable List**: Filter by ID or name
- **Stray Alert Section**: Priority listing of wandering cattle
- **Cattle Details**: Tap for weight, temperature, vaccines
- **Chute Log**: Recent scale transactions

### AdminTabView Features

- **Server Management**: View and change server URL
- **Account Info**: Username and role display
- **Ranch Statistics**: Real-time counts
- **Version Information**: App and backend versions
- **Actions**: Refresh all data, logout

## Data Flow

### State Management

```swift
// Global app state
@StateObject private var appState = AppState()
    - isAuthenticated: Bool
    - currentUser: String?
    - userRole: String
    - serverURL: String?

// Ranch data state
@StateObject private var dataManager = RanchDataManager()
    - config: ConfigResponse?
    - sensors: SensorsResponse?
    - herd: [Cattle]
    - gates: [Gate]
    - cameras: [Camera]
    - strayAlerts: [StrayAlert]
    - pastures: [Pasture]
```

### Data Propagation

```
RanchDataManager (Source of Truth)
    ↓ @Published properties
    ↓ ObservableObject protocol
    ↓
Views subscribe via @EnvironmentObject
    ↓
SwiftUI auto-updates when data changes
    ↓
UI reflects latest state
```

### Polling Lifecycle

```
MainTabView.onAppear
    ↓
dataManager.startPolling()
    ↓
Create Timer for each endpoint
    ↓
Timers fire at intervals
    ↓
Async fetch from API
    ↓
@MainActor update @Published properties
    ↓
SwiftUI re-renders affected views
    ↓
MainTabView.onDisappear
    ↓
dataManager.stopPolling()
    ↓
Invalidate all timers
```

## Testing Strategy

### Manual Testing Checklist

**Server Configuration:**
- [ ] Enter valid HTTP URL → proceeds to login
- [ ] Enter valid HTTPS URL → proceeds to login
- [ ] Enter invalid URL → shows error
- [ ] Enter unreachable URL → shows "Cannot reach server"
- [ ] Change server from Admin panel → reconnects

**Authentication:**
- [ ] Login with valid credentials → shows dashboard
- [ ] Login with invalid credentials → shows error
- [ ] "Remember credentials" enabled → auto-fills next time
- [ ] Logout → clears credentials and returns to login

**Map Tab:**
- [ ] Cattle markers render at correct coordinates
- [ ] Tap cattle marker → opens detail sheet
- [ ] Gate markers color-coded correctly
- [ ] Stray alerts show orange markers
- [ ] Fence polygon renders
- [ ] Pasture boundaries visible
- [ ] Zoom and pan work smoothly
- [ ] Center button focuses on ranch

**Sensors Tab:**
- [ ] Sensor cards update in real-time
- [ ] Status colors match backend values
- [ ] Gate toggle buttons work
- [ ] System status banner reflects sensor states
- [ ] Chute transaction displays

**Cameras Tab:**
- [ ] Online cameras load YouTube embeds
- [ ] Offline cameras show placeholder
- [ ] Predator alerts display when detected
- [ ] Tap camera → full-screen view
- [ ] YouTube playback works

**Cattle Tab:**
- [ ] Search filters cattle list
- [ ] Stray alerts appear at top
- [ ] Tap cattle → shows detail sheet
- [ ] Chute log displays transactions
- [ ] Vaccine records show

**Admin Tab (admin role only):**
- [ ] Server URL displays correctly
- [ ] Statistics update in real-time
- [ ] Version info displays
- [ ] Refresh button works
- [ ] Logout button works

### Unit Testing (Future)

Recommended test coverage:

```swift
// ServerConfigManager
- testValidateHTTPURL()
- testValidateHTTPSURL()
- testRejectInvalidURL()
- testBuildAPIURL()

// SecureStorage
- testSaveAndRetrieveCredentials()
- testClearCredentials()
- testNoCredentialsReturnsNil()

// APIClient
- testLoginSuccess()
- testLoginUnauthorized()
- testNetworkError()
- testDecodingError()

// RanchDataManager
- testStartPolling()
- testStopPolling()
- testFetchHerd()
```

### UI Testing (Future)

```swift
// Navigation
- testServerConfigToLogin()
- testLoginToDashboard()
- testTabNavigation()

// Data Display
- testCattleListRendering()
- testMapAnnotations()
- testSensorCards()
```

## Deployment Checklist

### Pre-Submission

- [ ] **Remove Development Settings:**
  - Remove `NSAllowsArbitraryLoads` from Info.plist
  - Remove `NSAllowsLocalNetworking`
  - Ensure HTTPS-only server URLs

- [ ] **Configure Signing:**
  - Select Development Team
  - Choose Distribution provisioning profile
  - Verify App ID with required capabilities

- [ ] **Update Metadata:**
  - Set version number (CFBundleShortVersionString)
  - Increment build number (CFBundleVersion)
  - Update copyright year

- [ ] **Test Production Server:**
  - Configure with production HTTPS URL
  - Verify SSL certificate validity
  - Test all API endpoints
  - Confirm camera embeds work

- [ ] **Prepare Assets:**
  - Add App Icon (1024x1024)
  - Create launch screen
  - Prepare screenshots for all devices
  - Record demo video (optional)

### App Store Connect

- [ ] Create app listing
- [ ] Add description, keywords, screenshots
- [ ] Configure pricing (free)
- [ ] Set category (Business/Productivity)
- [ ] Add privacy policy URL
- [ ] Provide test account credentials

### Review Submission

**Notes for Reviewer:**

```
Test Credentials:
Username: jay
Password: 3strands
Role: admin

Server Configuration:
On first launch, app will prompt for server URL.
Use: https://demo.ranchos.app (or your test server)

Key Features to Review:
1. Multi-tenant server configuration
2. Real-time cattle tracking on map
3. Sensor monitoring dashboard
4. Security camera feeds
5. Herd management

Notes:
- App requires active internet connection
- Backend server must be running and accessible
- Camera feeds use YouTube embeds (requires YouTube access)
```

### Post-Approval

- [ ] Phased release (10% day 1, then increase)
- [ ] Monitor crash reports
- [ ] Track reviews and ratings
- [ ] Respond to user feedback
- [ ] Plan feature updates

## Compatibility Notes

### iOS Versions

- **Minimum**: iOS 17.0
- **Recommended**: iOS 17.2+
- **Tested on**: iOS 17.0 - 17.4

### Device Support

- **iPhone**: All models supporting iOS 17+
- **iPad**: All models supporting iOS 17+
- **Orientation**: Portrait and landscape supported
- **Screen sizes**:
  - Compact width (iPhone, iPad split screen)
  - Regular width (iPad full screen)

### Backend Compatibility

The iOS app is compatible with:
- Express backend (server/index.js) - **Primary**
- Python FastAPI backend (backend/app.py) - **Alternative**

Both backends provide identical REST API contracts.

## Performance Considerations

### Memory Management

- SwiftUI views automatically deallocated
- Timers invalidated on `stopPolling()`
- WKWebView instances released when dismissed
- No retain cycles in closures (weak self)

### Network Efficiency

- Polling intervals optimized per data type
- Failed requests don't block UI
- Async/await prevents callback pyramids
- URLSession connection pooling

### Battery Optimization

- Polling only when app foreground
- Timers suspended in background
- No background fetch (yet)
- Efficient MapKit rendering

## Future Enhancements

### High Priority

- [ ] Push notifications (APNs)
- [ ] Offline mode with Core Data caching
- [ ] Background fetch for critical alerts
- [ ] iPad-optimized layouts (sidebar)

### Medium Priority

- [ ] Widget support (WidgetKit)
- [ ] Apple Watch app
- [ ] Siri shortcuts
- [ ] Dark/light mode toggle

### Low Priority

- [ ] PDF export for reports
- [ ] Camera photo capture
- [ ] Historical data charts
- [ ] Geofencing alerts

## Support and Maintenance

### Logging

Debug logging enabled in `#if DEBUG` blocks:

```swift
#if DEBUG
print("📡 GET /api/herd -> 200")
#endif
```

### Error Reporting

Currently console-only. Consider adding:
- Crashlytics integration
- Sentry error tracking
- Custom analytics

### Backend Changes

If backend API changes:

1. Update models in `RanchModels.swift`
2. Update APIClient methods
3. Test data parsing
4. Update UI if needed

---

## Quick Reference

**Entry Point**: `RanchOSApp.swift`
**Main Router**: `ContentView.swift`
**API Client**: `Services/APIClient.swift`
**Data Manager**: `MainTabView.swift` → `RanchDataManager`
**Server Config**: `Services/ServerConfigManager.swift`
**Security**: `Utilities/SecureStorage.swift`

**Minimum iOS**: 17.0
**Language**: Swift 5.9+
**Framework**: SwiftUI
**Dependencies**: None (native frameworks only)

---

© 2024 3 Strands Cattle Co., LLC. All rights reserved.
