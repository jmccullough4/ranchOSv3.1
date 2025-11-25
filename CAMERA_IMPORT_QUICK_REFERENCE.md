# Camera Import - Quick Reference Card

## For Ranch Operators

### Adding Cameras: Two Ways

#### Option 1: Manual Entry (For Testing)
1. Admin Panel → Camera Management
2. Stay on "Manual Entry" tab
3. Enter camera name and YouTube URL
4. Click "Add Camera"
5. Done - camera appears with gray MANUAL badge

#### Option 2: Import from Simulator (For Production)
1. Admin Panel → Camera Management
2. Click "Import from Simulator" tab
3. Browse available cameras
4. Click "Import Camera" on the one you want
5. Done - camera appears with blue SIMULATOR badge

### Understanding Camera Badges

- **SIMULATOR** (blue) = Imported from simulator, includes GPS location
- **MANUAL** (gray) = Manually added, usually for testing
- **IMPORTED** (green) = Already added to your cameras (can't import again)

### Camera Status Indicators

- **● Online** (green) = Camera is working
- **● Offline** (red) = Camera is not responding

### Common Tasks

**Toggle AI Detection:**
- Click "Disable AI" or "Enable AI" button on any camera card

**Remove a Camera:**
- Click "Remove" button → Confirm → Camera deleted

**Refresh Simulator List:**
- On "Import from Simulator" tab, click "Refresh List"

**Check Camera Location:**
- GPS coordinates shown on each camera card
- Format: latitude, longitude (e.g., 36.7800, -119.4180)

### Troubleshooting

**"Cannot connect to simulator"**
- Make sure simulator is running
- Click "Retry Connection"
- Manual entry still works

**"Camera already imported"**
- Camera is already in your list
- Check "Your Cameras" section below
- Delete it first if you want to re-import

**Camera won't import**
- Check if it shows "IMPORTED" badge
- Make sure simulator is online
- Try "Refresh List" button

### Tips

- Simulator cameras include GPS coordinates automatically
- You can mix manual and simulator cameras
- Deleting a simulator camera lets you re-import it
- Use Map Editor to see camera locations on the map

### Status Meanings

**In Simulator Tab:**
- "Import Camera" = Ready to import
- "Already Imported" (grayed out) = You already have this camera
- "Loading..." = Fetching camera list
- "⚠️ Cannot connect" = Simulator offline or unreachable

**In Your Cameras List:**
- "● Online" = Camera working normally
- AI: "✓ Enabled" = Predator detection active
- AI: "✗ Disabled" = Predator detection off
- Timestamp shown = When camera was imported

### Quick Decision Guide

**Use Manual Entry when:**
- Testing with YouTube videos
- Setting up temporary cameras
- Trying out the system
- Don't have GPS coordinates

**Use Simulator Import when:**
- Adding production cameras
- Need GPS tracking
- Want AI detection pre-configured
- Setting up permanent monitoring

### Safety Notes

- Removing a camera doesn't affect the physical camera
- It only removes it from your monitoring list
- Simulator cameras can always be re-imported
- Always confirm before removing cameras

### Getting Help

If you see errors:
1. Check simulator is running
2. Try "Refresh List" button
3. Try "Retry Connection" if simulator tab fails
4. Manual entry always works as backup
5. Contact admin if problems persist

---

**Remember**: Blue badge = Simulator (production), Gray badge = Manual (testing)
