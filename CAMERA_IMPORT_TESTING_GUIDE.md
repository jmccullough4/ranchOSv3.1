# Camera Import Feature Testing Guide

## Quick Start

This guide helps you test the new simulator camera import feature.

## Prerequisites

1. RanchOS server running on `http://localhost:8082`
2. Admin panel accessible (login as admin user)
3. Camera management tab visible in admin panel

## Testing the UI (Frontend Only)

You can test the UI immediately, even before the backend API is implemented:

### What Works Now:
- Tab switching (Manual Entry ↔ Import from Simulator)
- Manual camera entry (existing feature)
- UI layout and styling
- Error handling for simulator connection

### What Needs Backend:
- Fetching simulator cameras (will show "Cannot connect" error)
- Importing cameras (button will work but API will fail)
- Seeing "IMPORTED" badge on already-imported cameras

## Manual Testing Steps

### Test 1: Manual Camera Entry (Existing Feature)

1. Navigate to Admin Panel → Camera Management
2. Verify "Manual Entry" tab is selected by default
3. Fill in the form:
   - **Camera Name**: "Test Camera"
   - **YouTube URL**: `https://www.youtube.com/watch?v=eJ7ZkQ5TC08`
   - **Enable AI**: Checked
4. Click "Add Camera"
5. **Expected**: Success message appears, camera shows in "Your Cameras" list with MANUAL badge
6. **Verify**: Camera card shows:
   - Camera name with MANUAL badge
   - YouTube URL link
   - AI Detection status
   - "Disable AI" and "Remove" buttons

### Test 2: Tab Switching

1. Click "Import from Simulator" tab
2. **Expected**: Tab indicator moves, content switches
3. **Verify**:
   - Tab has blue underline
   - "Available Simulator Cameras" header visible
   - "Refresh List" button present
4. Click "Manual Entry" tab
5. **Expected**: Tab switches back to manual form
6. **Verify**: Form is still there with previous state preserved

### Test 3: Simulator Unavailable State (Before Backend)

1. Click "Import from Simulator" tab
2. **Expected**: Warning icon appears with message:
   - "Cannot connect to simulator"
   - "Make sure it is running and try again"
   - "Retry Connection" button
3. Click "Retry Connection"
4. **Expected**: Same error appears (API not implemented yet)

### Test 4: Camera Badges

1. Add a manual camera
2. **Verify**: MANUAL badge appears (gray background)
3. **Check**:
   - Badge is uppercase
   - Badge has white text
   - Badge is positioned next to camera name

### Test 5: AI Detection Toggle

1. Add a camera with AI enabled
2. Click "Disable AI" button
3. **Expected**: Button changes to "Enable AI"
4. **Verify**: AI Detection line updates to "✗ Disabled"
5. Click "Enable AI"
6. **Expected**: Toggle back to enabled state

### Test 6: Camera Removal

1. Add a test camera
2. Click "Remove" button
3. **Expected**: Confirmation dialog appears
4. Click "OK"
5. **Expected**: Camera removed from list, success message shown

### Test 7: Empty State

1. Remove all cameras
2. **Expected**: Empty state message appears:
   - "No cameras configured yet"
   - "Add your first camera above to begin monitoring"

## Testing After Backend Implementation

Once the simulation-builder implements the API endpoints, test these scenarios:

### Test 8: Fetch Simulator Cameras

1. Start simulator (if separate service)
2. Navigate to "Import from Simulator" tab
3. **Expected**: Loading state briefly appears
4. **Expected**: List of simulator cameras appears with:
   - Camera icons (📹)
   - Camera names
   - Descriptions
   - GPS coordinates
   - Status (Online/Offline with colored dots)
   - AI Detection status
   - Coverage and resolution info
   - "Import Camera" buttons

### Test 9: Import Simulator Camera

1. Click "Import Camera" on any available camera
2. **Expected**: Loading state on button
3. **Expected**: Success message appears
4. **Expected**: Camera moves to "Your Cameras" list
5. **Verify**:
   - SIMULATOR badge (blue background)
   - Simulator ID shown
   - Import timestamp shown
   - "IMPORTED" badge on original card
   - Button changes to "Already Imported" (disabled)

### Test 10: Prevent Duplicate Import

1. Try to import a camera that's already imported
2. **Expected**: Button is disabled with "Already Imported" text
3. **Verify**: Can't click the button

### Test 11: Delete Imported Camera

1. Delete a camera that was imported from simulator
2. **Expected**: Camera removed from "Your Cameras"
3. Switch to "Import from Simulator" tab
4. **Expected**: Camera reappears in available list
5. **Expected**: Button is "Import Camera" again (not disabled)

### Test 12: Refresh Simulator List

1. In "Import from Simulator" tab
2. Click "Refresh List" button
3. **Expected**: Loading state briefly appears
4. **Expected**: List refreshes with latest simulator cameras
5. **Verify**: Imported cameras still show "IMPORTED" badge

### Test 13: Mixed Camera Sources

1. Add 2 manual cameras
2. Import 2 simulator cameras
3. **Verify** in "Your Cameras":
   - Manual cameras have MANUAL badge (gray)
   - Simulator cameras have SIMULATOR badge (blue)
   - Each shows appropriate metadata
   - Manual cameras show YouTube URLs
   - Simulator cameras show Simulator IDs

### Test 14: Error Handling

1. Stop the simulator service
2. Click "Refresh List" in simulator tab
3. **Expected**: Error message appears
4. **Verify**: Manual entry still works
5. Restart simulator service
6. Click "Retry Connection"
7. **Expected**: Cameras load successfully

## Visual Regression Testing

### Desktop Layout (1920x1080)

- [ ] Tabs are horizontally aligned
- [ ] Form inputs are in 2-column grid
- [ ] Camera cards are full width
- [ ] Badges don't wrap or overflow
- [ ] Buttons are properly aligned right

### Laptop Layout (1366x768)

- [ ] All content visible without horizontal scroll
- [ ] Form still uses 2-column grid
- [ ] Text doesn't overflow containers

### Tablet Layout (1024x768)

- [ ] Tabs still horizontal
- [ ] Form may stack to single column
- [ ] Cards remain readable
- [ ] Buttons don't overlap text

### Mobile Layout (375x667)

- [ ] Tabs may wrap or scroll
- [ ] Form stacks to single column
- [ ] Camera cards stack properly
- [ ] Badges wrap if needed
- [ ] Buttons stack vertically in cards

## Accessibility Testing

### Keyboard Navigation

1. Use Tab key to navigate through interface
2. **Verify**:
   - Can reach all buttons
   - Can switch tabs with Enter
   - Can submit form with Enter
   - Can activate buttons with Space
   - Focus indicators visible

### Screen Reader

1. Enable VoiceOver (Mac) or NVDA (Windows)
2. **Verify**:
   - Tab labels announced correctly
   - Button purposes clear ("Import Camera" not just "Import")
   - Status indicators announced (Online/Offline)
   - Error messages announced
   - Loading states announced

### Color Contrast

1. Check with browser DevTools contrast checker
2. **Verify**:
   - Badge text on colored backgrounds ≥ 4.5:1
   - Online/Offline status colors ≥ 3:1
   - Error text ≥ 4.5:1

## Performance Testing

### Network Latency

1. Throttle network to "Slow 3G" in DevTools
2. Click "Import from Simulator"
3. **Verify**: Loading indicator appears
4. **Verify**: UI doesn't freeze
5. **Verify**: Success message appears after completion

### Large Camera Lists

1. Configure simulator with 20+ cameras
2. Load "Import from Simulator" tab
3. **Verify**: List renders smoothly
4. **Verify**: Scrolling is smooth
5. **Verify**: No layout shift during load

## Integration Testing

### With Cattle Management

1. Add cameras and cattle
2. **Verify**: Both systems work independently
3. **Verify**: No state conflicts
4. **Verify**: Admin panel performance acceptable

### With Sensor Management

1. Add cameras and sensors
2. **Verify**: Both use similar patterns
3. **Verify**: Status badges consistent
4. **Verify**: No cross-contamination of data

### With Map Editor

1. Add cameras with GPS coordinates
2. Navigate to Pasture Boundaries tab
3. **Expected** (future): Cameras visible on map
4. **Current**: Tip message mentions map integration

## Common Issues & Solutions

### Issue: "Cannot connect to simulator" persists

**Cause**: Backend API not implemented yet
**Solution**: Wait for simulation-builder to implement `/api/simulator/cameras`
**Workaround**: Test manual entry only for now

### Issue: Import button doesn't work

**Cause**: Backend `/api/simulator/cameras/:id/import` not implemented
**Solution**: Implement backend endpoint first
**Temporary**: UI is ready, backend needed

### Issue: Cameras show "undefined" badges

**Cause**: `source` field missing in camera data
**Solution**: Ensure backend adds `source: "manual"` or `source: "simulator"`
**Fix**: Update backend POST/PUT endpoints

### Issue: GPS coordinates not showing

**Cause**: `lat`/`lon` fields null or missing
**Solution**: Simulator cameras should include GPS coords
**Check**: API response includes lat/lon fields

### Issue: Imported cameras don't show IMPORTED badge

**Cause**: `simulatorId` field not in response
**Solution**: Backend should return `simulatorId` when fetching cameras
**Fix**: Update `GET /api/admin/cameras` response

## API Response Validation

### GET /api/simulator/cameras

```json
{
  "status": "ok",
  "cameras": [
    {
      "id": "sim-cam-1",           // Required
      "name": "Camera Name",       // Required
      "lat": 36.7800,              // Required
      "lon": -119.4180,            // Required
      "status": "online",          // Required
      "streamUrl": "https://...",  // Required
      "aiDetection": {
        "enabled": true,           // Required
        "supported": true
      },
      "source": "simulator",       // Required
      "metadata": {
        "description": "...",      // Optional
        "coverage": "120°",        // Optional
        "resolution": "1080p"      // Optional
      }
    }
  ]
}
```

### POST /api/simulator/cameras/:id/import

Response should match GET /api/admin/cameras format with added fields:
- `simulatorId` - Original simulator camera ID
- `importedAt` - ISO timestamp
- `source` - "simulator"

### GET /api/admin/cameras

Should include new fields:
- `source` - "manual" or "simulator"
- `simulatorId` - Only if source is "simulator"
- `importedAt` - ISO timestamp (for simulator cameras)
- `createdAt` - ISO timestamp (for manual cameras)

## Test Coverage Checklist

- [x] Manual camera entry works
- [x] Tab switching works
- [x] UI handles simulator unavailable
- [x] Badges display correctly
- [x] AI toggle works
- [x] Camera removal works
- [x] Empty state shows
- [ ] Fetch simulator cameras (needs backend)
- [ ] Import camera (needs backend)
- [ ] Prevent duplicate import (needs backend)
- [ ] Delete re-enables import (needs backend)
- [ ] Refresh simulator list (needs backend)
- [ ] Mixed sources display (needs backend)
- [ ] Error recovery (needs backend)

## Next Steps

1. **For UI Developer**: Component is ready, test frontend interactions
2. **For Backend Developer**: Implement APIs per CAMERA_IMPORT_API_SPEC.md
3. **For QA**: Use this guide to test after backend implementation
4. **For Product**: Review UX per CAMERA_IMPORT_UX_DESIGN.md

## Reporting Issues

When reporting bugs, include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshot or video
5. Console errors (F12 → Console)
6. Network requests (F12 → Network)

## Success Criteria

Feature is complete when:
- [ ] All tests in this guide pass
- [ ] No console errors
- [ ] Responsive on all screen sizes
- [ ] Accessible via keyboard and screen reader
- [ ] Backend APIs implemented and working
- [ ] Documentation reviewed and approved
- [ ] Rancher user test passes (if available)
