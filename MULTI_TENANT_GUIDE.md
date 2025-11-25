# RanchOS Multi-Tenant SaaS Platform - Complete Guide

## Overview

RanchOS has been transformed from a single-instance demo into a production-ready, multi-tenant SaaS platform. Each customer (ranch) gets a completely isolated instance with their own data, users, and configuration.

## Key Features

### 1. Multi-Tenancy
- Complete data isolation between ranches
- Ranch-scoped authentication and authorization
- Subdomain-based routing: `ranch-{customername}.ranchos.app`

### 2. JWT Authentication
- Secure token-based authentication
- 7-day token expiration
- bcrypt password hashing (10 salt rounds)
- Role-based access control (admin / user)

### 3. Self-Service Signup
- Customers can create their own ranch instances
- Web-based signup form
- Automatic data directory creation
- Default admin user setup

### 4. Data Isolation
- Ranch-scoped data stored in `/server/data/{ranchId}/`
- Separate files for: users, sensors, cattle, cameras, pastures, gates, config
- Central ranch registry in `/server/data/ranches.json`

## Architecture

### Backend Structure

```
server/
├── server-multitenant.js    # New multi-tenant Express server
├── auth.js                   # JWT authentication & authorization
├── dataStore.js              # Multi-tenant data access layer
├── migrate-to-multitenant.js # Migration script
├── index.backup.js           # Original single-tenant server backup
└── data/                     # Multi-tenant data directory
    ├── ranches.json          # Registry of all ranches
    ├── demo/                 # Demo ranch instance
    │   ├── users.json
    │   ├── sensors.json
    │   ├── cattle.json
    │   ├── cameras.json
    │   ├── pastures.json
    │   ├── gates.json
    │   └── config.json
    └── {ranchId}/            # Additional ranch instances
        └── ...
```

### Frontend Changes

- JWT token storage in localStorage
- Authorization headers on all API requests
- Dynamic ranch name in header
- Ranch signup component
- Demo mode removed
- Login-first flow enforced

## Usage

### Starting the Server

**Development:**
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:8082
```

**Production:**
```bash
npm run build
npm start
# Server: http://localhost:8082
```

### Accessing Ranches

**Development (Local):**
```
http://localhost:5173?ranchId=demo
http://localhost:5173?ranchId=testranch
```

**Production (Subdomain):**
```
https://ranch-demo.ranchos.app
https://ranch-testranch.ranchos.app
```

### Demo Ranch Credentials

After migration, the demo ranch is available:

- **Ranch ID:** demo
- **URL:** `http://localhost:8082?ranchId=demo`
- **Admin User:** admin
- **Password:** (bcrypt hashed from original)

Check `/server/data/demo/users.json` for available users.

## API Endpoints

### Public Endpoints (No Auth Required)

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}

Response:
{
  "status": "ok",
  "user": "admin",
  "role": "admin",
  "ranchId": "demo",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Ranch Signup
```http
POST /api/signup
Content-Type: application/json

{
  "ranchId": "testranch",
  "companyName": "Test Ranch LLC",
  "adminUsername": "admin",
  "adminPassword": "SecurePass123!"
}

Response:
{
  "status": "created",
  "ranch": {
    "ranchId": "testranch",
    "companyName": "Test Ranch LLC",
    "url": "https://ranch-testranch.ranchos.app",
    "adminUsername": "admin"
  },
  "message": "Ranch instance created successfully"
}
```

#### List Ranches
```http
GET /api/ranches

Response:
{
  "ranches": [
    {
      "ranchId": "demo",
      "companyName": "3 Strands Cattle Co., LLC",
      "url": "https://ranch-demo.ranchos.app",
      "createdAt": "2025-01-24T...",
      "status": "active"
    }
  ]
}
```

### Authenticated Endpoints (Require JWT Token)

All authenticated endpoints require the `Authorization` header:

```http
Authorization: Bearer {your-jwt-token}
```

#### Get Ranch Config
```http
GET /api/config
```

#### Get Sensors
```http
GET /api/sensors
```

#### Get Herd/Cattle
```http
GET /api/herd
```

#### Get Cameras
```http
GET /api/cameras
```

#### Get Pastures
```http
GET /api/pastures
```

#### Get Gates
```http
GET /api/gates
```

### Admin Endpoints (Require Admin Role)

#### Get Users
```http
GET /api/admin/users
```

#### Create User
```http
POST /api/admin/users
Content-Type: application/json

{
  "username": "operator1",
  "password": "SecurePass123!",
  "role": "user"
}
```

#### Delete User
```http
DELETE /api/admin/users/{username}
```

#### Update Config
```http
POST /api/admin/config
Content-Type: application/json

{
  "countyGisApiUrl": "https://...",
  "ranchName": "My Ranch"
}
```

## Testing Multi-Tenant Isolation

### Step 1: Create First Test Ranch

**Via API:**
```bash
curl -X POST http://localhost:8082/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "ranchId": "ranch-alpha",
    "companyName": "Alpha Cattle Co.",
    "adminUsername": "alpha-admin",
    "adminPassword": "AlphaPass123!"
  }'
```

**Via Web UI:**
1. Visit http://localhost:5173?ranchId=ranch-alpha
2. Click "Create one here" on login screen
3. Fill in ranch details
4. Submit form

### Step 2: Create Second Test Ranch

```bash
curl -X POST http://localhost:8082/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "ranchId": "ranch-beta",
    "companyName": "Beta Ranches LLC",
    "adminUsername": "beta-admin",
    "adminPassword": "BetaPass123!"
  }'
```

### Step 3: Verify Data Isolation

**Login to Ranch Alpha:**
```bash
curl -X POST http://localhost:8082/api/login?ranchId=ranch-alpha \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alpha-admin",
    "password": "AlphaPass123!"
  }'
```

Save the returned token as `ALPHA_TOKEN`.

**Login to Ranch Beta:**
```bash
curl -X POST http://localhost:8082/api/login?ranchId=ranch-beta \
  -H "Content-Type: application/json" \
  -d '{
    "username": "beta-admin",
    "password": "BetaPass123!"
  }'
```

Save the returned token as `BETA_TOKEN`.

**Test Cross-Ranch Access:**
```bash
# This should FAIL - Alpha token cannot access Beta data
curl -X GET http://localhost:8082/api/herd?ranchId=ranch-beta \
  -H "Authorization: Bearer $ALPHA_TOKEN"

# Response: { "error": "Ranch access forbidden" }
```

**Verify Correct Access:**
```bash
# This should SUCCEED - Alpha token can access Alpha data
curl -X GET http://localhost:8082/api/herd?ranchId=ranch-alpha \
  -H "Authorization: Bearer $ALPHA_TOKEN"

# This should SUCCEED - Beta token can access Beta data
curl -X GET http://localhost:8082/api/herd?ranchId=ranch-beta \
  -H "Authorization: Bearer $BETA_TOKEN"
```

### Step 4: Verify File System Isolation

Check the data directories:

```bash
# Ranch Alpha data
ls -la server/data/ranch-alpha/

# Ranch Beta data
ls -la server/data/ranch-beta/

# Verify they have separate users.json files
cat server/data/ranch-alpha/users.json
cat server/data/ranch-beta/users.json
```

## iOS App Integration

The iOS app (built by swift-webui-integrator) should:

1. **Use the same JWT authentication:**
   ```swift
   let token = // stored token from login
   request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
   ```

2. **Store ranch ID and token:**
   ```swift
   UserDefaults.standard.set(ranchId, forKey: "ranchOS_ranchId")
   UserDefaults.standard.set(token, forKey: "ranchOS_token")
   ```

3. **Construct URLs with ranch ID:**
   ```swift
   let baseURL = "https://ranch-\(ranchId).ranchos.app"
   // OR for development:
   let baseURL = "http://localhost:8082?ranchId=\(ranchId)"
   ```

4. **Handle token expiration:**
   - Tokens expire after 7 days
   - HTTP 401 responses should trigger re-login
   - Refresh tokens can be added if needed

## Security Considerations

### Password Security
- All passwords hashed with bcrypt (SALT_ROUNDS = 10)
- Never store plain-text passwords
- Minimum 8 character requirement enforced

### JWT Security
- Secret key stored in `JWT_SECRET` environment variable
- 7-day expiration (configurable)
- Token includes: username, role, ranchId
- Signature verification on every request

### Data Isolation
- Middleware validates ranchId from subdomain/query
- JWT contains embedded ranchId
- Double verification: subdomain AND token must match
- File system isolation via separate directories

### Production Deployment

**Environment Variables:**
```bash
NODE_ENV=production
PORT=8082
JWT_SECRET=your-secure-random-secret-here
MAPBOX_TOKEN=your-mapbox-token
```

**Recommended Nginx Config:**
```nginx
server {
    listen 80;
    server_name *.ranchos.app;

    location / {
        proxy_pass http://localhost:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Migration from Single-Tenant

The migration has already been performed. Original data is now in `/server/data/demo/`.

**Original files backed up:**
- `/server/index.backup.js` - Original single-tenant server

**To re-run migration if needed:**
```bash
node server/migrate-to-multitenant.js
```

## Troubleshooting

### Issue: "Ranch not found" error
- Check ranch ID format (lowercase, alphanumeric, hyphens)
- Verify ranch exists in `/server/data/{ranchId}/`
- Check `/server/data/ranches.json` registry

### Issue: "Invalid token" error
- Token may be expired (7 day limit)
- JWT_SECRET may have changed
- Token may be from different ranch

### Issue: "Authentication required" error
- Missing Authorization header
- Token not prefixed with "Bearer "
- Token malformed or corrupted

### Issue: "Ranch access forbidden" error
- Token's ranchId doesn't match requested ranchId
- Cross-ranch access attempt detected
- Security violation logged

## Development Tips

### Adding New Features

1. **New API Endpoint:**
   ```javascript
   // In server-multitenant.js
   app.get('/api/my-new-endpoint', requireAuth, (req, res) => {
     const ranchId = req.ranchId // Automatically available
     const user = req.user       // Current user info
     // ... your logic
   })
   ```

2. **New Data Type:**
   ```javascript
   // In dataStore.js
   const readMyData = (ranchId) => readRanchData(ranchId, 'mydata.json', { items: [] })
   const writeMyData = (ranchId, data) => writeRanchData(ranchId, 'mydata.json', data)
   ```

3. **Admin-Only Endpoint:**
   ```javascript
   app.post('/api/admin/my-action', requireAuth, requireAdmin, (req, res) => {
     // Only admins can access this
   })
   ```

## Next Steps

1. **Add Full Feature Set:** Integrate all endpoints from original `server/index.js`
2. **Add Database:** Replace JSON files with PostgreSQL/MySQL for production
3. **Add Caching:** Implement Redis for session/data caching
4. **Add Analytics:** Track ranch usage, metrics, billing
5. **Add Billing:** Integrate Stripe for subscription management
6. **Add Email:** Send welcome emails, password resets
7. **Add Monitoring:** Implement logging, error tracking (Sentry)
8. **Add Backups:** Automated ranch data backups
9. **Add Rate Limiting:** Prevent API abuse
10. **Add WebSockets:** Real-time data updates

## Support

For issues or questions:
- Check this guide first
- Review `/server/auth.js` for authentication details
- Review `/server/dataStore.js` for data access patterns
- Review `/server/server-multitenant.js` for endpoint implementations

---

**Version:** 4.0.0 (Multi-Tenant)
**Last Updated:** 2025-01-24
