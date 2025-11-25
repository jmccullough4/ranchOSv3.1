# RanchOS Multi-Tenant Quick Start Guide

## For the Impatient

**Start the server:**
```bash
npm run dev
```

**Access demo ranch:**
```
http://localhost:5173?ranchId=demo
Login: admin / Admin1234!
```

**Create a new ranch:**
1. Click "Create one here" on login screen
2. Fill in details
3. Login with new credentials

Done! 🎉

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RanchOS Multi-Tenant                      │
│                         v4.0.0                               │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  ranch-demo      │     │  ranch-alpha     │     │  ranch-beta      │
│  .ranchos.app    │     │  .ranchos.app    │     │  .ranchos.app    │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Express Server         │
                    │  server-multitenant.js  │
                    └─────────────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │ auth.js      │  │ dataStore.js │  │ JWT Tokens   │
        │ JWT + bcrypt │  │ File Storage │  │ 7-day expiry │
        └──────────────┘  └──────────────┘  └──────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │ data/demo/   │  │ data/alpha/  │  │ data/beta/   │
        │ users.json   │  │ users.json   │  │ users.json   │
        │ cattle.json  │  │ cattle.json  │  │ cattle.json  │
        │ sensors.json │  │ sensors.json │  │ sensors.json │
        └──────────────┘  └──────────────┘  └──────────────┘
```

## Authentication Flow

```
1. User → https://ranch-demo.ranchos.app
          │
          ▼
2. Middleware extracts ranchId: "demo"
          │
          ▼
3. User submits: {username: "admin", password: "Admin1234!"}
          │
          ▼
4. Server reads: /data/demo/users.json
          │
          ▼
5. bcrypt.compare(password, hash)
          │
          ▼
6. Generate JWT: {username, role, ranchId: "demo"}
          │
          ▼
7. Return: {status: "ok", token: "eyJhbG..."}
          │
          ▼
8. Client stores token in localStorage
          │
          ▼
9. All API requests: Authorization: Bearer eyJhbG...
          │
          ▼
10. Middleware validates: token.ranchId === url.ranchId
          │
          ▼
11. Access granted to /data/demo/* only
```

## Data Isolation Guarantee

```
┌─────────────────────────────────────────────────────────┐
│  Security Layers                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Subdomain/Query Extraction                         │
│     ✓ ranch-alpha.ranchos.app → "alpha"               │
│     ✓ localhost:8082?ranchId=demo → "demo"            │
│                                                         │
│  2. JWT Token Verification                             │
│     ✓ Signature check with JWT_SECRET                 │
│     ✓ Expiration check (7 days)                        │
│     ✓ Extract embedded ranchId from payload            │
│                                                         │
│  3. Ranch ID Matching                                  │
│     ✓ req.ranchId (from URL) === token.ranchId        │
│     ✓ Mismatch → 403 Forbidden                         │
│                                                         │
│  4. File System Isolation                              │
│     ✓ dataStore.read(ranchId, file)                   │
│     ✓ Path: /data/{ranchId}/file.json                 │
│     ✓ No directory traversal possible                  │
│                                                         │
│  5. Role-Based Access Control                          │
│     ✓ requireAuth middleware for all endpoints         │
│     ✓ requireAdmin for sensitive operations            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## API Quick Reference

### Public Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/login` | POST | Get JWT token | No |
| `/api/signup` | POST | Create ranch | No |
| `/api/ranches` | GET | List ranches | No |
| `/health` | GET | Health check | No |

### Authenticated Endpoints

| Endpoint | Method | Purpose | Admin Only |
|----------|--------|---------|------------|
| `/api/config` | GET | Ranch config | No |
| `/api/sensors` | GET | Sensor data | No |
| `/api/herd` | GET | Cattle data | No |
| `/api/cameras` | GET | Camera feeds | No |
| `/api/pastures` | GET | Pasture data | No |
| `/api/gates` | GET | Gate status | No |
| `/api/admin/users` | GET | List users | Yes |
| `/api/admin/users` | POST | Create user | Yes |
| `/api/admin/users/:id` | DELETE | Delete user | Yes |
| `/api/admin/config` | POST | Update config | Yes |

## Common Tasks

### Test Multi-Tenancy

**Create two ranches:**
```bash
# Ranch 1
curl -X POST http://localhost:8082/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "ranchId": "alpha",
    "companyName": "Alpha Ranch",
    "adminUsername": "alpha-admin",
    "adminPassword": "AlphaPass123!"
  }'

# Ranch 2
curl -X POST http://localhost:8082/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "ranchId": "beta",
    "companyName": "Beta Ranch",
    "adminUsername": "beta-admin",
    "adminPassword": "BetaPass123!"
  }'
```

**Verify isolation:**
```bash
# Login to alpha
TOKEN_ALPHA=$(curl -s -X POST "http://localhost:8082/api/login?ranchId=alpha" \
  -H "Content-Type: application/json" \
  -d '{"username":"alpha-admin","password":"AlphaPass123!"}' \
  | grep -o '"token":"[^"]*' | sed 's/"token":"//')

# Try to access beta with alpha token (should FAIL)
curl "http://localhost:8082/api/herd?ranchId=beta" \
  -H "Authorization: Bearer $TOKEN_ALPHA"
# Response: {"error":"Ranch access forbidden"}
```

### Access WebUI

**Development:**
- Demo: http://localhost:5173?ranchId=demo
- Alpha: http://localhost:5173?ranchId=alpha
- Beta: http://localhost:5173?ranchId=beta

**Production:**
- Demo: https://ranch-demo.ranchos.app
- Alpha: https://ranch-alpha.ranchos.app
- Beta: https://ranch-beta.ranchos.app

### Reset Everything

```bash
rm -rf server/data/
node server/migrate-to-multitenant.js
```

## File Locations

**Key Files:**
```
server/
├── server-multitenant.js    # Main server
├── auth.js                   # Authentication
├── dataStore.js              # Data access
├── migrate-to-multitenant.js # Migration
├── index.backup.js           # Original (backup)
└── data/
    ├── ranches.json          # Registry
    └── {ranchId}/            # Per-ranch data
        ├── users.json
        ├── sensors.json
        ├── cattle.json
        ├── cameras.json
        ├── pastures.json
        ├── gates.json
        └── config.json

frontend/src/
├── App.jsx                   # Main app (JWT integrated)
├── components/
│   ├── LoginOverlay.jsx     # Login screen
│   ├── RanchSignup.jsx      # Signup form
│   └── ...                  # Other components
```

## Troubleshooting

**Problem:** Login fails
- Check ranch exists: `ls server/data/{ranchId}`
- Check credentials: `cat server/data/{ranchId}/users.json`
- Check password is hashed (starts with `$2b$`)

**Problem:** "Ranch not found"
- Verify ranchId in URL matches directory name
- Check `server/data/ranches.json` for registry entry
- Ranch IDs must be lowercase

**Problem:** "Ranch access forbidden"
- Token ranchId doesn't match URL ranchId
- This is EXPECTED for cross-ranch access attempts
- Get new token for the correct ranch

**Problem:** "Invalid token"
- Token expired (7 days)
- JWT_SECRET changed
- Token corrupted
- Login again to get new token

## Production Deployment

**Requirements:**
- Node.js 18+
- Nginx (reverse proxy)
- SSL certificate (Let's Encrypt)
- Environment variables configured

**Quick Deploy:**
```bash
# Clone repo
git clone <repo-url>
cd ranchOSv2

# Install dependencies
npm install

# Build frontend
npm run build

# Set environment variables
export NODE_ENV=production
export PORT=8082
export JWT_SECRET=<your-secret>
export MAPBOX_TOKEN=<your-token>

# Start server
npm start
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name *.ranchos.app;

    location / {
        proxy_pass http://localhost:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## iOS App Integration

```swift
// Store after login
UserDefaults.standard.set(token, forKey: "ranchOS_token")
UserDefaults.standard.set(ranchId, forKey: "ranchOS_ranchId")

// Use in requests
request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

// Construct URL
let url = "https://ranch-\(ranchId).ranchos.app/api/herd"
```

## Next Steps

1. **Read Full Docs:** `/MULTI_TENANT_GUIDE.md`
2. **Review Implementation:** `/IMPLEMENTATION_SUMMARY_MULTITENANT.md`
3. **Test Everything:** Create 2-3 test ranches
4. **Deploy Staging:** Set up on test server
5. **Integrate iOS:** Test with mobile app

## Support

**Documentation:**
- `MULTI_TENANT_GUIDE.md` - Complete guide
- `IMPLEMENTATION_SUMMARY_MULTITENANT.md` - Implementation details
- `CLAUDE.md` - Project overview

**Code Reference:**
- `server/auth.js` - Authentication logic
- `server/dataStore.js` - Data access patterns
- `server/server-multitenant.js` - API endpoints

---

**You're all set! Happy ranching! 🤠🐄**
