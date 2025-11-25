# RanchOS iOS Integration Guide

**For:** swift-webui-integrator Agent
**Version:** 1.0
**Date:** 2025-11-22

---

## Overview

This guide provides complete specifications for building the RanchOS iOS app that works seamlessly with the multi-tenant web platform. The iOS app will authenticate against the same backend, use the same API endpoints, and maintain feature parity with the web application.

---

## Architecture

### Multi-Tenant Model
Each customer ranch has a unique URL:
- Example: `https://ranch-3strands.ranchos.app`
- Example: `https://ranch-smithfarm.ranchos.app`

The iOS app must:
1. Allow users to configure their ranch URL
2. Store the URL securely for all API calls
3. Authenticate against that specific ranch instance
4. Maintain data isolation between ranches

---

## Authentication

### Login Flow

```
┌────────────────────────────────────────────┐
│ App Launch                                 │
│ ↓                                          │
│ Check Keychain for stored token            │
│ ↓                                          │
│ YES → Validate token with server           │
│   ↓                                        │
│   Valid? → Dashboard                       │
│   Invalid? → Login Screen                  │
│ NO → Login Screen                          │
└────────────────────────────────────────────┘
```

### Login Endpoint

**Endpoint:** `POST /api/login`

**Request:**
```json
{
  "username": "jay",
  "password": "Admin1234!"
}
```

**Response (Success - 200):**
```json
{
  "status": "ok",
  "user": "jay",
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "ranchId": "3strands"
}
```

**Response (Failure - 401):**
```json
{
  "detail": "Invalid credentials"
}
```

**Swift Implementation:**
```swift
struct LoginRequest: Codable {
    let username: String
    let password: String
}

struct LoginResponse: Codable {
    let status: String
    let user: String
    let role: String
    let token: String
    let ranchId: String
}

func login(username: String, password: String) async throws -> LoginResponse {
    guard let ranchURL = UserDefaults.standard.string(forKey: "ranchURL"),
          let url = URL(string: "\(ranchURL)/api/login") else {
        throw AuthError.invalidURL
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body = LoginRequest(username: username, password: password)
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw AuthError.invalidCredentials
    }

    let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)

    // Store token in Keychain
    Keychain.save(key: "authToken", value: loginResponse.token)
    Keychain.save(key: "username", value: loginResponse.user)
    Keychain.save(key: "role", value: loginResponse.role)
    Keychain.save(key: "ranchId", value: loginResponse.ranchId)

    return loginResponse
}
```

### Token Verification

**Endpoint:** `POST /api/verify-token`

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response (Valid - 200):**
```json
{
  "valid": true,
  "user": "jay",
  "role": "admin",
  "ranchId": "3strands"
}
```

**Response (Invalid - 401):**
```json
{
  "error": "Invalid or expired token"
}
```

**Swift Implementation:**
```swift
func verifyToken() async throws -> Bool {
    guard let ranchURL = UserDefaults.standard.string(forKey: "ranchURL"),
          let token = Keychain.get(key: "authToken"),
          let url = URL(string: "\(ranchURL)/api/verify-token") else {
        return false
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    let (_, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
        return false
    }

    return httpResponse.statusCode == 200
}
```

### Token Refresh

**Endpoint:** `POST /api/refresh-token`

**Request Headers:**
```
Authorization: Bearer {current_token}
```

**Response (Success - 200):**
```json
{
  "token": "new_jwt_token_here",
  "expiresIn": 86400
}
```

**Usage:**
- Call before token expires (check `exp` claim in JWT)
- Recommended: Refresh when app comes to foreground if token expires within 1 hour
- Store new token in Keychain

### Logout

**Endpoint:** `POST /api/logout`

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response (Success - 200):**
```json
{
  "status": "ok"
}
```

**Swift Implementation:**
```swift
func logout() async {
    guard let ranchURL = UserDefaults.standard.string(forKey: "ranchURL"),
          let token = Keychain.get(key: "authToken"),
          let url = URL(string: "\(ranchURL)/api/logout") else {
        clearAuthState()
        return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    // Don't await - just clear local state
    Task {
        try? await URLSession.shared.data(for: request)
    }

    clearAuthState()
}

private func clearAuthState() {
    Keychain.delete(key: "authToken")
    Keychain.delete(key: "username")
    Keychain.delete(key: "role")
    Keychain.delete(key: "ranchId")
    // Navigate to login screen
}
```

---

## API Endpoints

All API endpoints require authentication via JWT token in the `Authorization` header.

### Base URL Configuration

**User Configuration Flow:**
1. First launch → Show ranch URL setup screen
2. User enters: `ranch-3strands.ranchos.app` (or full URL)
3. App validates URL (makes test request to `/api/config`)
4. If valid → Save to UserDefaults
5. Proceed to login screen

**Swift Helper:**
```swift
class RanchAPI {
    static let shared = RanchAPI()

    private var baseURL: String {
        guard let url = UserDefaults.standard.string(forKey: "ranchURL") else {
            fatalError("Ranch URL not configured")
        }
        return url.hasPrefix("http") ? url : "https://\(url)"
    }

    private func makeRequest<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method

        // Add auth token if available
        if let token = Keychain.get(key: "authToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add body if present
        if let body = body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Handle specific status codes
        switch httpResponse.statusCode {
        case 200...299:
            return try JSONDecoder().decode(T.self, from: data)
        case 401:
            // Token expired - trigger re-authentication
            NotificationCenter.default.post(name: .authenticationExpired, object: nil)
            throw APIError.authenticationRequired
        case 403:
            throw APIError.insufficientPermissions
        case 404:
            throw APIError.notFound
        default:
            throw APIError.serverError(httpResponse.statusCode)
        }
    }
}
```

### Sensors

**Endpoint:** `GET /api/sensors`

**Response:**
```json
{
  "sensors": {
    "WATER": {
      "status": "green",
      "value": "87%",
      "detail": "Water tank at optimal level"
    },
    "FENCE": {
      "status": "red",
      "value": "4.2kV",
      "detail": "Fence voltage below threshold - possible breach"
    },
    "GATE": {
      "status": "green",
      "value": "Locked",
      "detail": "All gates secured"
    },
    "SYSTEM": {
      "status": "green",
      "value": "Online",
      "detail": "All systems operational"
    }
  },
  "sensorsList": [
    {
      "id": "sensor_001",
      "type": "water",
      "name": "North Tank",
      "lat": 34.0522,
      "lon": -118.2437,
      "status": "green",
      "reading": "87%",
      "lastUpdate": "2025-11-22T10:30:00Z"
    }
  ]
}
```

**Swift Model:**
```swift
struct SensorReading: Codable {
    let status: String  // "green", "yellow", "red"
    let value: String
    let detail: String
}

struct SensorDetail: Codable, Identifiable {
    let id: String
    let type: String
    let name: String
    let lat: Double
    let lon: Double
    let status: String
    let reading: String
    let lastUpdate: String
}

struct SensorsResponse: Codable {
    let sensors: [String: SensorReading]
    let sensorsList: [SensorDetail]
}

// Usage
let sensors: SensorsResponse = try await RanchAPI.shared.makeRequest(endpoint: "/api/sensors")
```

### Herd (Cattle)

**Endpoint:** `GET /api/herd`

**Response:**
```json
{
  "herd": [
    {
      "id": "A001",
      "name": "Bessie",
      "lat": 34.0522,
      "lon": -118.2437,
      "weight": 1250,
      "temperature": 101.5,
      "vaccines": [
        {
          "name": "7-Way",
          "date": "2025-03-15",
          "administeredBy": "Dr. Smith"
        }
      ],
      "lastUpdated": "2025-11-22T10:30:00Z"
    }
  ]
}
```

**Swift Model:**
```swift
struct Vaccine: Codable {
    let name: String
    let date: String
    let administeredBy: String
}

struct Cattle: Codable, Identifiable {
    let id: String
    let name: String
    let lat: Double
    let lon: Double
    let weight: Int
    let temperature: Double
    let vaccines: [Vaccine]?
    let lastUpdated: String
}

struct HerdResponse: Codable {
    let herd: [Cattle]
}

// Usage
let herd: HerdResponse = try await RanchAPI.shared.makeRequest(endpoint: "/api/herd")
```

### Gates

**Endpoint:** `GET /api/gates`

**Response:**
```json
{
  "gates": [
    {
      "id": "North Gate",
      "lat": 34.0530,
      "lon": -118.2450,
      "status": "closed"
    },
    {
      "id": "South Gate",
      "lat": 34.0510,
      "lon": -118.2420,
      "status": "open"
    }
  ]
}
```

**Toggle Gate (Admin Only):**

**Endpoint:** `POST /api/gates`

**Request:**
```json
{
  "gateId": "North Gate"
}
```

**Response:**
```json
{
  "status": "ok",
  "gates": [...]
}
```

**Swift Model:**
```swift
struct Gate: Codable, Identifiable {
    let id: String
    let lat: Double
    let lon: Double
    let status: String  // "open" or "closed"
}

struct GatesResponse: Codable {
    let gates: [Gate]
}

struct ToggleGateRequest: Codable {
    let gateId: String
}

// Usage
let gates: GatesResponse = try await RanchAPI.shared.makeRequest(endpoint: "/api/gates")

// Toggle (admin only)
try await RanchAPI.shared.makeRequest(
    endpoint: "/api/gates",
    method: "POST",
    body: ToggleGateRequest(gateId: "North Gate")
)
```

### Cameras

**Endpoint:** `GET /api/cameras`

**Response:**
```json
{
  "cameras": [
    {
      "camera": "cam1",
      "name": "North Pasture Cam",
      "location": "North Pasture",
      "status": "online",
      "embedUrl": "https://www.youtube.com/embed/xyz",
      "predator_detected": false,
      "aiDetection": {
        "enabled": true,
        "lastScan": "2025-11-22T10:30:00Z",
        "detections": [],
        "alertLevel": "none",
        "confidence": 0
      }
    },
    {
      "camera": "cam2",
      "name": "South Gate Cam",
      "location": "South Gate",
      "status": "online",
      "embedUrl": "https://www.youtube.com/embed/abc",
      "predator_detected": true,
      "aiDetection": {
        "enabled": true,
        "lastScan": "2025-11-22T10:25:00Z",
        "detections": [
          {
            "timestamp": "2025-11-22T10:25:00Z",
            "category": "PREDATOR",
            "object": "coyote",
            "confidence": 0.87,
            "alertLevel": "high"
          }
        ],
        "alertLevel": "high",
        "confidence": 0.87
      }
    }
  ]
}
```

**Swift Model:**
```swift
struct AIDetection: Codable {
    let timestamp: String
    let category: String  // "PREDATOR", "THREAT", "LIVESTOCK", "NORMAL"
    let object: String
    let confidence: Double
    let alertLevel: String
}

struct CameraAI: Codable {
    let enabled: Bool
    let lastScan: String
    let detections: [AIDetection]
    let alertLevel: String
    let confidence: Double
}

struct Camera: Codable, Identifiable {
    let camera: String
    var id: String { camera }
    let name: String
    let location: String
    let status: String  // "online" or "offline"
    let embedUrl: String?
    let predator_detected: Bool
    let aiDetection: CameraAI?
}

struct CamerasResponse: Codable {
    let cameras: [Camera]
}

// Usage
let cameras: CamerasResponse = try await RanchAPI.shared.makeRequest(endpoint: "/api/cameras")
```

### Chute (Weighing Chute)

**Endpoint:** `GET /api/chute`

**Response:**
```json
{
  "chute": {
    "id": "A001",
    "weight": 1250,
    "temperature": 101.5,
    "operator": "jay",
    "notes": "Routine checkup",
    "last_weighed": "2025-11-22T10:30:00Z"
  }
}
```

**Swift Model:**
```swift
struct ChuteTransaction: Codable {
    let id: String
    let weight: Int
    let temperature: Double
    let `operator`: String
    let notes: String
    let last_weighed: String
}

struct ChuteResponse: Codable {
    let chute: ChuteTransaction
}

// Usage
let chute: ChuteResponse = try await RanchAPI.shared.makeRequest(endpoint: "/api/chute")
```

### Configuration

**Endpoint:** `GET /api/config`

**Response:**
```json
{
  "mapboxToken": "pk.eyJ1Ijoiam1jY3VsbG91Z2g0...",
  "ranchCenter": {
    "lat": 34.0522,
    "lon": -118.2437
  },
  "fence": [
    [-118.2450, 34.0530],
    [-118.2420, 34.0530],
    [-118.2420, 34.0510],
    [-118.2450, 34.0510],
    [-118.2450, 34.0530]
  ]
}
```

**Swift Model:**
```swift
struct RanchCenter: Codable {
    let lat: Double
    let lon: Double
}

struct ConfigResponse: Codable {
    let mapboxToken: String
    let ranchCenter: RanchCenter
    let fence: [[Double]]  // Array of [lon, lat] coordinates
}

// Usage
let config: ConfigResponse = try await RanchAPI.shared.makeRequest(endpoint: "/api/config")
```

### Stray Alerts (AI Detection)

**Endpoint:** `GET /api/stray-alerts`

**Response:**
```json
{
  "alerts": [
    {
      "cowId": "A001",
      "name": "Bessie",
      "lat": 34.0600,
      "lon": -118.2500,
      "altitude": 450,
      "duration": "15m ago",
      "distanceToClosest": 250,
      "closestCow": {
        "id": "A002",
        "name": "Daisy"
      }
    }
  ]
}
```

**Swift Model:**
```swift
struct ClosestCow: Codable {
    let id: String
    let name: String
}

struct StrayAlert: Codable, Identifiable {
    let cowId: String
    var id: String { cowId }
    let name: String
    let lat: Double
    let lon: Double
    let altitude: Int
    let duration: String
    let distanceToClosest: Int?
    let closestCow: ClosestCow?
}

struct StrayAlertsResponse: Codable {
    let alerts: [StrayAlert]
}

// Usage
let strays: StrayAlertsResponse = try await RanchAPI.shared.makeRequest(endpoint: "/api/stray-alerts")
```

---

## Role-Based Access Control

### Admin Role
**Capabilities:**
- View all data
- Modify ranch configuration
- Add/remove users
- Toggle gates
- Configure sensors and cameras

### Operator Role (Read-Only)
**Capabilities:**
- View sensor readings
- View cattle locations and health
- View camera feeds
- View alerts

**Restrictions:**
- Cannot modify settings
- Cannot toggle gates
- Cannot add/remove users

**Enforcement:**
The server enforces permissions. iOS app should:
1. Check user role from login response
2. Hide/disable admin features for operators
3. Show appropriate error if operator attempts admin action

**Swift Example:**
```swift
class UserSession: ObservableObject {
    @Published var isAuthenticated = false
    @Published var username: String?
    @Published var role: String?

    var isAdmin: Bool {
        role == "admin"
    }

    var isOperator: Bool {
        role == "user" || role == "operator"
    }
}

// In UI
if userSession.isAdmin {
    Button("Toggle Gate") {
        // Admin action
    }
} else {
    Text("Gate: \(gate.status)")
        .foregroundColor(.secondary)
}
```

---

## Polling and Real-Time Updates

The web application uses polling intervals:
- Sensors: Every 5 seconds
- Herd: Every 4 seconds
- Gates: Every 6 seconds
- Chute: Every 8 seconds
- Cameras: Every 10 seconds
- Stray Alerts: Every 7 seconds

**iOS Recommendations:**

### Foreground Polling
```swift
class DataPoller: ObservableObject {
    private var timers: [String: Timer] = [:]

    func startPolling() {
        timers["sensors"] = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
            Task {
                try? await self.fetchSensors()
            }
        }

        timers["herd"] = Timer.scheduledTimer(withTimeInterval: 4, repeats: true) { _ in
            Task {
                try? await self.fetchHerd()
            }
        }

        // ... other timers
    }

    func stopPolling() {
        timers.values.forEach { $0.invalidate() }
        timers.removeAll()
    }
}
```

### Background Refresh
```swift
// In AppDelegate or SceneDelegate
func application(_ application: UIApplication,
                performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    Task {
        // Fetch critical data (sensors, stray alerts)
        let hasNewData = try? await fetchCriticalData()
        completionHandler(hasNewData ? .newData : .noData)
    }
}

// Enable background fetch
BGTaskScheduler.shared.register(
    forTaskWithIdentifier: "com.ranchos.refresh",
    using: nil
) { task in
    // Fetch updates
}
```

### Push Notifications (Future)
For real-time critical alerts (predators, fence breaches), consider implementing push notifications.

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 401 | Unauthorized | Token expired → Re-authenticate |
| 403 | Forbidden | Insufficient permissions → Show error |
| 404 | Not Found | Resource doesn't exist → Show error |
| 500 | Server Error | Retry or show error |

**Swift Error Enum:**
```swift
enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case authenticationRequired
    case insufficientPermissions
    case notFound
    case serverError(Int)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid ranch URL. Please check your configuration."
        case .invalidResponse:
            return "Unexpected response from server."
        case .authenticationRequired:
            return "Your session has expired. Please log in again."
        case .insufficientPermissions:
            return "You don't have permission to perform this action."
        case .notFound:
            return "The requested resource was not found."
        case .serverError(let code):
            return "Server error: \(code). Please try again later."
        case .decodingError(let error):
            return "Data parsing error: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}
```

---

## Security Best Practices

### Token Storage
**Use Keychain for JWT tokens:**
```swift
import Security

class Keychain {
    static func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)  // Delete existing
        SecItemAdd(query as CFDictionary, nil)  // Add new
    }

    static func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)

        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}
```

### HTTPS Only
**Always use HTTPS for API calls:**
```swift
// Add to Info.plist
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

### Certificate Pinning (Production)
For added security, pin the ranch server certificate.

---

## Testing

### Test Ranch Instances
Use these test ranches for development:

**Ranch 1:**
- URL: `ranch-3strands.ranchos.app`
- Admin: `admin` / `Admin1234!`
- Operator: `jay` / `Admin1234!`

**Ranch 2:**
- URL: `ranch-testranch.ranchos.app`
- Admin: `admin` / `Admin1234!`

### Test Cases
1. **Login:** Valid credentials → Success
2. **Login:** Invalid credentials → Error message
3. **Token Refresh:** Before expiration → New token
4. **Token Expiration:** After 24 hours → Re-authenticate
5. **Data Isolation:** Ranch A user cannot access Ranch B data
6. **Role Enforcement:** Operator cannot toggle gates
7. **Offline Mode:** Show cached data when network unavailable

---

## UI/UX Considerations

### Rancher's Perspective
**Remember: Ranchers work in harsh conditions**
- Bright sunlight (high contrast UI)
- Gloves (large touch targets)
- Quick access to critical info
- Minimal taps to key features

### Recommended UI Layout

**Dashboard:**
```
┌─────────────────────────────────────┐
│ [Logo]  Ranch Name     [User] [●●●] │  ← Header
├─────────────────────────────────────┤
│                                     │
│        MAP VIEW (Primary)           │
│    • Cattle markers                 │
│    • Fence boundary                 │
│    • Gates                          │
│    • Sensors                        │
│                                     │
├─────────────────────────────────────┤
│ SENSORS: 🟢 WATER  🔴 FENCE  🟢 GATE│  ← Quick Status
├─────────────────────────────────────┤
│ [📹 Cameras] [⚖️ Chute] [🤖 Strays]│  ← Quick Actions
└─────────────────────────────────────┘
```

**Map Tappable Elements:**
- Cattle marker → Show details (name, weight, temp, vaccines)
- Gate → Show status, admin can toggle
- Sensor → Show reading details

**Critical Alerts:**
- Fence breach → Full-screen alert with sound
- Predator detection → Push notification + in-app alert
- Gate opened → Notification

### Accessibility
- VoiceOver support for all controls
- Dynamic Type support
- High contrast mode
- Color-blind friendly (don't rely only on color)

---

## Future Enhancements

### Offline Mode
- Cache last known state
- Queue actions when offline
- Sync when connection restored

### Push Notifications
- Critical alerts (predators, fence breaches)
- Daily summary
- Configurable notification preferences

### iPad Optimization
- Split view (map + details)
- Multi-camera grid view
- Keyboard shortcuts

### Apple Watch
- Quick glance at sensor status
- Critical alerts
- Quick gate toggle (admin)

---

## Questions?

Contact the RanchOS development team for:
- API changes or additions
- Authentication issues
- Testing credentials
- Feature requests

---

**End of iOS Integration Guide**
