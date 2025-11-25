# RanchOS Multi-Tenant SaaS Architecture

**Version:** 1.0
**Date:** 2025-11-22
**Status:** Implementation Plan

---

## Executive Summary

This document outlines the complete transformation of RanchOS from a single-instance demo application into a scalable, multi-tenant SaaS platform. Each customer ranch will receive an isolated environment accessible via unique URL with shared authentication between web and iOS applications.

---

## Business Model

### Product Offering
- **Service:** RanchOS SaaS Platform
- **Target Market:** Cattle ranches of all sizes
- **Pricing Model:** Subscription-based (monthly/annual)
- **Delivery:** Cloud-hosted with unique customer URLs

### Customer Experience
1. Ranch purchases subscription at `https://ranchos.app`
2. Company name collected during signup → URL assigned: `https://ranch-{companyname}.ranchos.app`
3. Admin account created automatically
4. Ranch configured through WebUI admin panel
5. Operators invited via admin panel
6. iOS app configured with ranch URL for field operations

---

## Architecture Overview

### Current State (Single-Tenant)
```
┌─────────────────────────────────────┐
│         ranchos.app:8082            │
├─────────────────────────────────────┤
│  Express Server (server/index.js)   │
├─────────────────────────────────────┤
│  JSON Files (single ranch):         │
│  • users.json                       │
│  • sensors.json                     │
│  • cameras.json                     │
│  • cattle.json                      │
│  • pastures.json                    │
│  • config.json                      │
└─────────────────────────────────────┘
```

### Target State (Multi-Tenant)
```
┌──────────────────────────────────────────────────────────┐
│                    ranchos.app                           │
│            (Marketing + Signup Portal)                   │
└──────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴──────────────────┐
        │                                    │
┌───────▼────────────┐            ┌──────────▼───────────┐
│ ranch-3strands     │            │ ranch-smithfarm      │
│ .ranchos.app:8082  │            │ .ranchos.app:8082    │
├────────────────────┤            ├──────────────────────┤
│ Express Server     │            │ Express Server       │
│ + Tenant Middleware│            │ + Tenant Middleware  │
├────────────────────┤            ├──────────────────────┤
│ data/3strands/     │            │ data/smithfarm/      │
│ • users.json       │            │ • users.json         │
│ • sensors.json     │            │ • sensors.json       │
│ • cameras.json     │            │ • cameras.json       │
│ • cattle.json      │            │ • cattle.json        │
│ • pastures.json    │            │ • pastures.json      │
│ • config.json      │            │ • config.json        │
└────────────────────┘            └──────────────────────┘
        │                                    │
        └─────────┬──────────────────────────┘
                  │
         ┌────────▼─────────┐
         │  iOS App (Swift) │
         │  Connects to:    │
         │  ranch URL       │
         │  configured by   │
         │  user            │
         └──────────────────┘
```

---

## Core Requirements

### 1. Multi-Tenancy & Data Isolation

#### Approach: File-Based Multi-Tenancy with Directory Structure
**Why:** Maintains JSON simplicity while being production-ready for initial launch

**Directory Structure:**
```
server/
├── data/
│   ├── 3strands/
│   │   ├── users.json
│   │   ├── sensors.json
│   │   ├── cameras.json
│   │   ├── cattle.json
│   │   ├── pastures.json
│   │   └── config.json
│   ├── smithfarm/
│   │   ├── users.json
│   │   ├── sensors.json
│   │   └── ...
│   └── registry.json       # Master tenant registry
├── templates/
│   └── default-ranch.json  # Template for new ranch setup
└── index.js
```

**Registry Structure (`data/registry.json`):**
```json
{
  "tenants": [
    {
      "ranchId": "3strands",
      "companyName": "3 Strands Cattle Co., LLC",
      "subdomain": "ranch-3strands",
      "createdAt": "2025-01-15T00:00:00.000Z",
      "status": "active",
      "plan": "professional",
      "adminEmail": "jay@3strands.com"
    },
    {
      "ranchId": "smithfarm",
      "companyName": "Smith Family Ranch",
      "subdomain": "ranch-smithfarm",
      "createdAt": "2025-02-01T00:00:00.000Z",
      "status": "active",
      "plan": "basic",
      "adminEmail": "admin@smithfarm.com"
    }
  ]
}
```

#### Data Isolation Rules
1. **Ranch ID Derivation:** Extract from subdomain (`ranch-{ranchId}`)
2. **File Path Resolution:** All data operations use `data/{ranchId}/filename.json`
3. **API Middleware:** Every protected endpoint validates ranch access
4. **No Cross-Tenant Queries:** Impossible to access other ranch's data

---

### 2. Authentication System

#### Current Implementation (Session-Based)
```javascript
// POST /api/login
{ username, password } → { status: 'ok', user, role }
// Stored in localStorage
```

**Issues:**
- No token expiration
- No server-side session validation
- Not suitable for mobile app
- No "Remember Me" functionality

#### Enhanced Implementation (JWT-Based)

**JWT Token Structure:**
```javascript
{
  "userId": "usr_jay_3strands",
  "username": "jay",
  "ranchId": "3strands",
  "role": "admin",  // or "operator"
  "iat": 1732281600,
  "exp": 1732368000  // 24 hour expiration (configurable)
}
```

**Login Flow:**
```
Client → POST /api/login
        { username, password, ranchId? }
        ↓
Server → Validate credentials against data/{ranchId}/users.json
        ↓
Server → Generate JWT token
        ↓
Server → Set httpOnly cookie (web) + return token (mobile)
        { status: 'ok', user, role, token, ranchId }
        ↓
Client → Store token in:
         - httpOnly cookie (web, automatic)
         - Response body (mobile, saved to Keychain)
```

**Token Refresh:**
- Tokens expire after 24 hours (configurable)
- Refresh endpoint: `POST /api/refresh-token`
- Requires valid non-expired token
- Issues new token with extended expiration

**Logout:**
```
POST /api/logout
→ Clear httpOnly cookie
→ Client removes token from storage
→ Optional: Blacklist token server-side (future enhancement)
```

#### User Roles
1. **Admin**
   - Full access to ranch configuration
   - User management (add/remove operators)
   - Sensor and camera configuration
   - Property boundary management
   - Billing and subscription (future)

2. **Operator**
   - Read-only dashboard access
   - View cattle locations and health
   - View sensor readings
   - Access camera feeds
   - Cannot modify ranch settings

**Role Enforcement:**
```javascript
// Middleware example
const requireRole = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }
  next()
}

// Usage
app.post('/api/admin/sensors', requireAuth, requireRole(['admin']), ...)
```

---

### 3. Ranch-Specific URL Routing

#### Subdomain-Based Approach (Recommended)

**Domain Setup:**
- Main site: `ranchos.app` (marketing + signup)
- Ranch instances: `ranch-{ranchId}.ranchos.app`
- Wildcard DNS: `*.ranchos.app` → application server

**Express Middleware:**
```javascript
// Extract ranch ID from subdomain
const extractRanchId = (req, res, next) => {
  const hostname = req.hostname
  const parts = hostname.split('.')

  // Check if subdomain starts with 'ranch-'
  if (parts[0] && parts[0].startsWith('ranch-')) {
    const ranchId = parts[0].replace('ranch-', '')

    // Validate ranch exists
    const registry = readRegistry()
    const ranch = registry.tenants.find(t => t.ranchId === ranchId)

    if (!ranch) {
      return res.status(404).json({ error: 'Ranch not found' })
    }

    if (ranch.status !== 'active') {
      return res.status(403).json({ error: 'Ranch account suspended' })
    }

    req.ranchId = ranchId
    req.ranch = ranch
    next()
  } else {
    // Main site - serve marketing/signup page
    res.redirect('https://ranchos.app')
  }
}

// Apply to all API routes
app.use('/api', extractRanchId)
```

**Alternative: Path-Based Routing**
```javascript
// URLs like: ranchos.app/ranch/3strands/api/sensors
app.use('/ranch/:ranchId', validateRanchId, express.static(...))
```

**Why Subdomain Wins:**
- Cleaner URLs for customers
- Easier branding (each ranch feels independent)
- Simpler iOS app configuration
- Better future scaling (separate servers per ranch)

---

### 4. API Changes for Multi-Tenancy

#### File Helper Functions (Refactored)

**Before (Single-Tenant):**
```javascript
const readUsers = () => {
  const data = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf-8')
  return JSON.parse(data)
}
```

**After (Multi-Tenant):**
```javascript
const readUsers = (ranchId) => {
  const filePath = path.join(__dirname, 'data', ranchId, 'users.json')
  if (!fs.existsSync(filePath)) {
    return { users: [] }
  }
  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data)
}

const writeUsers = (ranchId, data) => {
  const dirPath = path.join(__dirname, 'data', ranchId)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  const filePath = path.join(dirPath, 'users.json')
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}
```

#### Authentication Middleware

```javascript
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production'

const requireAuth = (req, res, next) => {
  // Try to get token from cookie or Authorization header
  const token = req.cookies?.authToken ||
                req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    // Verify token's ranchId matches request ranchId
    if (decoded.ranchId !== req.ranchId) {
      return res.status(403).json({ error: 'Invalid ranch access' })
    }

    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

#### Endpoint Transformation Examples

**Before:**
```javascript
app.get('/api/sensors', (req, res) => {
  const data = readSensors()
  res.json(data)
})
```

**After:**
```javascript
app.get('/api/sensors', requireAuth, (req, res) => {
  const ranchId = req.ranchId
  const data = readSensors(ranchId)
  res.json(data)
})
```

**All Protected Endpoints Need:**
1. `requireAuth` middleware
2. Ranch ID from `req.ranchId`
3. Data filtered by ranch ID

---

### 5. Login Screen Enhancement

#### Current State
- Simple overlay component
- Basic username/password
- Stores to localStorage
- No "Remember Me" option

#### Enhanced Login Screen

**Features:**
1. Professional ranch-themed UI
2. Logo and branding
3. Username and password fields
4. "Remember Me" checkbox (extends token expiration)
5. Error messaging with specific feedback
6. Password strength indicator (signup)
7. Forgot password link (future)
8. Responsive design (mobile, tablet, desktop web)

**UI Specifications:**

```jsx
// LoginOverlay.jsx (Enhanced)
function LoginOverlay({ visible, error, onSubmit }) {
  const [formState, setFormState] = useState({
    username: '',
    password: '',
    rememberMe: false
  })
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className={`login-overlay ${visible ? 'visible' : ''}`}>
      <div className="login-card">
        {/* Logo Section */}
        <div className="login-header">
          <img src="/static/logo.png" alt="RanchOS" />
          <h1>Welcome to RanchOS</h1>
          <p>Enter your credentials to access your ranch</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-group-checkbox">
            <input
              type="checkbox"
              id="rememberMe"
              name="rememberMe"
            />
            <label htmlFor="rememberMe">Remember me for 30 days</label>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-login"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Access Ranch'}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <a href="/forgot-password">Forgot password?</a>
        </div>
      </div>
    </div>
  )
}
```

**Styling Considerations:**
- High contrast for outdoor visibility
- Large touch targets (44px minimum)
- Clear error states
- Loading indicators
- Accessible (ARIA labels, keyboard navigation)

---

### 6. Routing Enforcement (Login-First Flow)

#### Current Issue
- App sometimes shows dashboard before login
- Authentication checked via `isAuthenticated` state
- Can bypass with localStorage manipulation

#### Required Flow
```
User visits ranch URL
  ↓
Check for valid token
  ↓
NO → Show Login Screen
  ↓
User enters credentials
  ↓
Token validated & stored
  ↓
YES → Show Dashboard
  ↓
On logout → Clear token → Return to Login
```

#### Implementation in App.jsx

**Enhanced Authentication Check:**
```javascript
const [isAuthenticated, setIsAuthenticated] = useState(false)
const [isAuthChecking, setIsAuthChecking] = useState(true)
const [currentUser, setCurrentUser] = useState(null)

useEffect(() => {
  // On mount, verify existing token
  const verifyToken = async () => {
    try {
      const response = await fetch('/api/verify-token', {
        method: 'POST',
        credentials: 'include' // Include httpOnly cookies
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.user)
        setUserRole(data.role)
        setIsAuthenticated(true)
      } else {
        // Token invalid or expired
        setIsAuthenticated(false)
        clearAuthState()
      }
    } catch (error) {
      setIsAuthenticated(false)
      clearAuthState()
    } finally {
      setIsAuthChecking(false)
    }
  }

  verifyToken()
}, [])

// Show loading spinner while checking auth
if (isAuthChecking) {
  return <LoadingScreen />
}

// Show login if not authenticated
if (!isAuthenticated) {
  return <LoginOverlay visible={true} error={loginError} onSubmit={handleLogin} />
}

// Show dashboard only if authenticated
return (
  <div className="app-container">
    {/* Dashboard UI */}
  </div>
)
```

**Enhanced Logout:**
```javascript
const handleLogout = useCallback(async () => {
  try {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    setIsAuthenticated(false)
    setCurrentUser(null)
    setUserRole('user')
    localStorage.clear()
    sessionStorage.clear()
  }
}, [])
```

---

### 7. Self-Service Ranch Setup

#### Signup Flow

**Step 1: Registration Form** (`https://ranchos.app/signup`)
```
┌─────────────────────────────────────┐
│      Create Your Ranch Account      │
├─────────────────────────────────────┤
│ Company Name: [____________]        │
│               (becomes ranch ID)    │
│                                     │
│ Your Name:    [____________]        │
│ Email:        [____________]        │
│ Password:     [____________]        │
│ Confirm:      [____________]        │
│                                     │
│ [✓] I agree to Terms of Service     │
│                                     │
│         [ Create Ranch ]            │
└─────────────────────────────────────┘
```

**Step 2: Account Creation**
- Validate company name (alphanumeric, lowercase)
- Check for duplicate ranch IDs
- Create ranch directory: `data/{ranchId}/`
- Copy template files from `templates/default-ranch.json`
- Create admin user in `data/{ranchId}/users.json`
- Add entry to `data/registry.json`

**Step 3: Onboarding**
```
Redirect to: https://ranch-{companyname}.ranchos.app/onboarding
```

**Onboarding Wizard:**
1. **Welcome** - Quick tour of features
2. **Property Setup** - Draw fence boundaries on map
3. **Add Sensors** - Configure water, fence, gate sensors
4. **Add Cameras** - Import or configure security cameras
5. **Invite Team** - Add operator accounts
6. **Import Cattle** - Upload cattle inventory (CSV or manual)
7. **Complete** - Start using RanchOS

#### Provisioning Endpoints

```javascript
// POST /api/signup
app.post('/api/signup', async (req, res) => {
  const { companyName, adminName, email, password } = req.body

  // Validate and sanitize company name
  const ranchId = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')

  // Check if ranch already exists
  const registry = readRegistry()
  if (registry.tenants.find(t => t.ranchId === ranchId)) {
    return res.status(400).json({ error: 'Ranch already exists' })
  }

  // Create ranch directory
  const ranchDir = path.join(__dirname, 'data', ranchId)
  fs.mkdirSync(ranchDir, { recursive: true })

  // Copy template files
  const template = readTemplate()
  writeUsers(ranchId, {
    users: [{
      username: 'admin',
      password: hashPassword(password), // TODO: Add bcrypt
      role: 'admin',
      email,
      name: adminName,
      createdAt: new Date().toISOString()
    }]
  })
  writeSensors(ranchId, template.sensors)
  writeCameras(ranchId, template.cameras)
  writeConfig(ranchId, template.config)
  writePastures(ranchId, { pastures: [] })
  writeCattle(ranchId, { cattle: [] })

  // Add to registry
  registry.tenants.push({
    ranchId,
    companyName,
    subdomain: `ranch-${ranchId}`,
    createdAt: new Date().toISOString(),
    status: 'active',
    plan: 'trial',
    adminEmail: email
  })
  writeRegistry(registry)

  // Generate initial JWT token
  const token = jwt.sign(
    { userId: 'admin', username: 'admin', ranchId, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  )

  res.json({
    status: 'ok',
    ranchId,
    subdomain: `ranch-${ranchId}`,
    token
  })
})
```

#### Admin User Management

**Admin Panel Features:**
- View all users for the ranch
- Add new operator accounts
- Edit user permissions (future: custom roles)
- Deactivate/reactivate users
- Reset passwords

**Endpoint:**
```javascript
// GET /api/admin/users
app.get('/api/admin/users', requireAuth, requireRole(['admin']), (req, res) => {
  const ranchId = req.ranchId
  const users = readUsers(ranchId)

  // Don't send passwords to client
  const sanitized = users.users.map(u => ({
    username: u.username,
    role: u.role,
    email: u.email,
    createdAt: u.createdAt,
    status: u.status
  }))

  res.json({ users: sanitized })
})

// POST /api/admin/users
app.post('/api/admin/users', requireAuth, requireRole(['admin']), (req, res) => {
  const ranchId = req.ranchId
  const { username, password, role, email } = req.body

  const users = readUsers(ranchId)

  // Check for duplicate
  if (users.users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' })
  }

  users.users.push({
    username,
    password, // TODO: Hash with bcrypt
    role,
    email,
    createdAt: new Date().toISOString(),
    status: 'active'
  })

  writeUsers(ranchId, users)
  res.json({ status: 'ok' })
})
```

---

### 8. WebUI Cleanup

#### Items to Remove/Clean
1. **Demo Mode** - Remove or make configurable per ranch
2. **Hardcoded Test Data** - Use template system
3. **Single Ranch Assumptions** - Update all UI text
4. **Debug/Development Features** - Gate behind environment variable

#### Items to Add
1. **Ranch Branding** - Show ranch name from registry
2. **User Avatar/Menu** - Current user, role badge, logout
3. **Professional Styling** - Production-ready theme
4. **Loading States** - Skeleton screens, spinners
5. **Error Boundaries** - Graceful error handling

#### Header Enhancement
```jsx
<header className="floating-header glass-panel">
  <div className="header-brand">
    <img src="/static/logo.png" alt={ranch.companyName} />
    <div className="header-brand-text">
      <div className="header-company-name">{ranch.companyName}</div>
      <div className="header-brand-title">RanchOS Command Center</div>
    </div>
  </div>

  <div className="header-actions">
    {systemStatus && (
      <div className={`system-status status-${systemStatus}`}>
        <span className="status-dot" />
        <span>{systemStatusText}</span>
      </div>
    )}

    <div className="user-menu">
      <div className="user-avatar">{currentUser.charAt(0).toUpperCase()}</div>
      <span>{currentUser}</span>
      {userRole === 'admin' && <span className="role-badge">Admin</span>}
      <button onClick={handleLogout}>Logout</button>
    </div>
  </div>
</header>
```

---

### 9. iOS App Compatibility

#### Authentication Flow (Mobile)

**App Launch:**
1. Check Keychain for stored token
2. If token exists → Validate with server
3. If valid → Load dashboard
4. If invalid/missing → Show login

**Login Screen:**
```swift
struct LoginView: View {
    @State var ranchURL: String = ""
    @State var username: String = ""
    @State var password: String = ""
    @State var rememberMe: Bool = true

    var body: some View {
        VStack {
            TextField("Ranch URL", text: $ranchURL)
                .placeholder("ranch-yourname.ranchos.app")

            TextField("Username", text: $username)
            SecureField("Password", text: $password)

            Toggle("Remember Me", isOn: $rememberMe)

            Button("Login") {
                login()
            }
        }
    }

    func login() {
        // POST to {ranchURL}/api/login
        // Save token to Keychain
        // Navigate to dashboard
    }
}
```

**API Request Pattern:**
```swift
// All API calls include ranch URL from stored config
let ranchURL = UserDefaults.standard.string(forKey: "ranchURL")
let token = Keychain.get("authToken")

var request = URLRequest(url: URL(string: "\(ranchURL)/api/sensors")!)
request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

URLSession.shared.dataTask(with: request) { data, response, error in
    // Handle response
}
```

#### Coordination Points

**Shared Requirements:**
1. Same JWT token format
2. Same API endpoints
3. Same authentication flow
4. Same role-based access control

**iOS-Specific Considerations:**
- Token stored in Keychain (secure)
- Ranch URL configurable by user
- Offline mode support (future)
- Push notifications (future)

**Documentation for iOS Agent:**
```markdown
# iOS Integration Guide

## Authentication
- Endpoint: POST {ranchURL}/api/login
- Request: { username, password }
- Response: { status: 'ok', user, role, token, ranchId }
- Store token in Keychain
- Include in all API requests: `Authorization: Bearer {token}`

## API Endpoints
All endpoints require authentication token.

Base URL: User-configured ranch URL (e.g., https://ranch-3strands.ranchos.app)

- GET /api/sensors - Sensor status
- GET /api/herd - Cattle positions and health
- GET /api/gates - Gate statuses
- POST /api/gates - Toggle gate (admin only)
- GET /api/cameras - Camera feeds and alerts
- GET /api/chute - Latest chute transaction
- GET /api/config - Ranch configuration

## Role-Based Access
- Admin: Full access to all endpoints
- Operator: Read-only access, cannot modify settings

## Error Handling
- 401: Token expired or invalid → Re-authenticate
- 403: Insufficient permissions → Show error
- 404: Ranch not found → Check URL configuration
```

---

## Implementation Phases

### Phase 1: Multi-Tenant Foundation (Days 1-2)
**Goal:** Establish core multi-tenancy infrastructure

Tasks:
1. Create `data/` directory structure
2. Create `data/registry.json` with initial tenant
3. Refactor all file helper functions (readUsers, writeSensors, etc.)
4. Add `extractRanchId` middleware
5. Update all API endpoints to accept `ranchId` parameter
6. Test with single tenant (backwards compatible)

**Validation:**
- All existing endpoints work with ranch ID parameter
- Data read/write isolated to ranch directory
- No errors when accessing ranch data

### Phase 2: Authentication Enhancement (Days 3-4)
**Goal:** JWT-based authentication system

Tasks:
1. Install `jsonwebtoken` and `cookie-parser` dependencies
2. Create JWT secret (environment variable)
3. Implement `requireAuth` middleware
4. Implement `requireRole` middleware
5. Update `/api/login` to generate JWT tokens
6. Add `/api/verify-token` endpoint
7. Add `/api/refresh-token` endpoint
8. Add `/api/logout` endpoint
9. Add httpOnly cookie support

**Validation:**
- Login generates valid JWT token
- Token verification works correctly
- Tokens expire after 24 hours
- Refresh token extends expiration
- Logout clears cookies

### Phase 3: Login & WebUI (Days 5-6)
**Goal:** Professional login experience and routing

Tasks:
1. Enhance `LoginOverlay.jsx` component
2. Add "Remember Me" functionality
3. Add password strength indicator
4. Implement loading states
5. Add better error messaging
6. Update `App.jsx` for login-first routing
7. Add token verification on mount
8. Add LoadingScreen component
9. Clean up demo mode
10. Update header with ranch branding

**Validation:**
- Login screen shows first on all visits
- Valid token bypasses login screen
- Logout returns to login screen
- Remember Me extends token to 30 days
- Error messages are clear and helpful

### Phase 4: Self-Service Signup (Days 7-8)
**Goal:** Customer onboarding and ranch provisioning

Tasks:
1. Create signup form component
2. Add `/api/signup` endpoint
3. Implement ranch provisioning logic
4. Create default ranch template
5. Add email validation
6. Add company name sanitization
7. Create onboarding wizard
8. Add admin user management UI
9. Add `/api/admin/users` endpoints

**Validation:**
- New ranch can be created via signup
- Ranch directory created with template files
- Admin user created successfully
- Onboarding wizard guides setup
- Admin can add/remove operators

### Phase 5: Testing & Documentation (Days 9-10)
**Goal:** Verify multi-tenant isolation and create docs

Tasks:
1. Create two test ranches
2. Add different data to each
3. Test login to both ranches
4. Verify data isolation (Ranch A cannot see Ranch B)
5. Test role-based access control
6. Test token expiration and refresh
7. Create iOS app integration docs
8. Document API changes
9. Update README.md
10. Create deployment guide

**Validation:**
- Complete data isolation confirmed
- Cross-ranch access impossible
- Roles enforced correctly
- Documentation complete and accurate

---

## Security Considerations

### Authentication
1. **Password Storage:** Use bcrypt for password hashing (add in Phase 2)
2. **JWT Secret:** Strong secret, stored in environment variable
3. **Token Expiration:** 24 hours default, 30 days with "Remember Me"
4. **httpOnly Cookies:** Prevents XSS token theft
5. **HTTPS Only:** Enforce in production (Docker/nginx config)

### Data Isolation
1. **Ranch ID Validation:** Always validate ranch exists and is active
2. **User-Ranch Binding:** Token contains ranchId, verified on every request
3. **File Path Sanitization:** Prevent directory traversal attacks
4. **No Cross-Tenant Queries:** Impossible by design (separate directories)

### API Security
1. **Rate Limiting:** Add rate limiting to prevent brute force (future)
2. **Input Validation:** Sanitize all user inputs
3. **SQL Injection:** N/A (using JSON files)
4. **XSS Prevention:** Sanitize all rendered user content

### Future Enhancements
1. **Two-Factor Authentication (2FA):** SMS or TOTP
2. **Audit Logging:** Track all admin actions
3. **IP Whitelisting:** Restrict admin access to known IPs
4. **Encryption at Rest:** Encrypt sensitive JSON files

---

## Scaling Considerations

### Current Architecture (Good for 0-50 ranches)
- Single server instance
- File-based storage
- Shared process for all tenants

### Future Migration Path (50+ ranches)
1. **Database Migration:** Move from JSON to PostgreSQL with tenant_id columns
2. **Separate Servers:** Dedicated server per ranch (isolation)
3. **Container Orchestration:** Kubernetes for auto-scaling
4. **Object Storage:** S3 for camera footage and large files
5. **CDN:** CloudFront for static assets

### Performance Optimization
1. **File Caching:** Cache frequently accessed JSON files in memory
2. **Connection Pooling:** When migrating to database
3. **Redis Session Store:** For faster token validation
4. **WebSocket Support:** Real-time sensor updates (replace polling)

---

## Environment Variables

```bash
# Required
NODE_ENV=production
PORT=8082
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Optional
MAPBOX_TOKEN=your-mapbox-token
TOKEN_EXPIRATION=24h
TOKEN_EXPIRATION_REMEMBER_ME=30d
COOKIE_DOMAIN=.ranchos.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=Strict

# Future
DATABASE_URL=postgresql://user:pass@localhost/ranchos
REDIS_URL=redis://localhost:6379
EMAIL_SMTP_HOST=smtp.sendgrid.net
EMAIL_SMTP_USER=apikey
EMAIL_SMTP_PASS=your-sendgrid-api-key
```

---

## File Structure Changes

```
ranchOSv2/
├── server/
│   ├── data/
│   │   ├── registry.json          # Master tenant list
│   │   ├── 3strands/              # Ranch-specific data
│   │   │   ├── users.json
│   │   │   ├── sensors.json
│   │   │   ├── cameras.json
│   │   │   ├── cattle.json
│   │   │   ├── pastures.json
│   │   │   └── config.json
│   │   └── smithfarm/             # Another ranch
│   │       └── ...
│   ├── templates/
│   │   └── default-ranch.json     # New ranch template
│   ├── middleware/
│   │   ├── auth.js                # requireAuth, requireRole
│   │   ├── ranchId.js             # extractRanchId
│   │   └── errorHandler.js        # Centralized error handling
│   ├── routes/
│   │   ├── auth.js                # Login, logout, signup
│   │   ├── sensors.js             # Sensor endpoints
│   │   ├── cattle.js              # Herd endpoints
│   │   ├── cameras.js             # Camera endpoints
│   │   ├── admin.js               # Admin endpoints
│   │   └── index.js               # Route aggregation
│   ├── utils/
│   │   ├── jwt.js                 # JWT helpers
│   │   ├── fileStorage.js         # File CRUD operations
│   │   └── provisioning.js        # Ranch setup logic
│   └── index.js                   # Main server file
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── LoginOverlay.jsx   # Enhanced login
│       │   ├── SignupForm.jsx     # New signup form
│       │   ├── OnboardingWizard.jsx  # New onboarding
│       │   ├── LoadingScreen.jsx  # Loading state
│       │   └── ...
│       └── App.jsx                # Updated routing
├── docs/
│   ├── MULTI_TENANT_ARCHITECTURE.md  # This document
│   ├── IOS_INTEGRATION.md         # iOS app guide
│   └── API_REFERENCE.md           # Complete API docs
└── package.json
```

---

## Success Metrics

### Technical Metrics
- **Data Isolation:** 100% - No cross-ranch access possible
- **Authentication:** JWT-based with 24h expiration
- **API Coverage:** All endpoints protected and ranch-filtered
- **Test Coverage:** 2+ test ranches with different data

### User Experience Metrics
- **Signup Time:** < 5 minutes to create ranch and start setup
- **Login Time:** < 2 seconds from credentials to dashboard
- **Onboarding Completion:** Guide through all setup steps

### Business Metrics
- **Multi-Tenant Ready:** Support unlimited ranches
- **iOS Compatible:** Same auth, same API for mobile
- **Production Ready:** Security best practices, error handling
- **Scalable:** Clear migration path to database

---

## Next Steps

1. Review this architecture plan
2. Confirm subdomain vs. path-based routing preference
3. Confirm JWT token approach
4. Begin Phase 1 implementation
5. Coordinate with swift-webui-integrator on iOS requirements

---

## Questions for Resolution

1. **Domain Setup:** Who manages DNS for `*.ranchos.app` wildcard?
2. **SSL Certificates:** Wildcard cert or individual certs per ranch?
3. **Password Hashing:** Add bcrypt now or later?
4. **Email Service:** SendGrid, Mailgun, or other for password resets?
5. **Payment Integration:** Stripe for subscriptions (future scope)?
6. **Deployment:** Single Docker instance or orchestration (K8s)?

---

**End of Architecture Document**
