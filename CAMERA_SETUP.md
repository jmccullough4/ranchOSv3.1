# Camera Feed Setup for ranchOS

## Video File Requirements

The ranchOS system expects security camera video files to be placed in the following directory:

```
frontend/public/static/media/cameras/
```

## Required Files

You need to provide 4 camera video files:
- `cam1.mp4`
- `cam2.mp4`
- `cam3.mp4`
- `cam4.mp4`

## Recommended Specifications

**Video Format:**
- Container: MP4 (H.264 codec)
- Resolution: 1280x720 (720p) or 1920x1080 (1080p)
- Frame Rate: 24-30 fps
- Duration: 10-60 seconds (will loop automatically)
- File Size: Keep under 10MB per file for optimal loading

## Creating Sample Ranch Camera Feeds

If you need to create sample videos showing ranch operations with predator detection scenarios:

### Option 1: Use Stock Footage

1. Download royalty-free ranch/farm footage from:
   - [Pexels](https://www.pexels.com/search/videos/ranch/)
   - [Pixabay](https://pixabay.com/videos/search/cattle/)
   - [Videvo](https://www.videvo.net/free-video/farm/)

2. Look for videos showing:
   - **cam1**: Main barn entrance
   - **cam2**: Feeding area / water troughs
   - **cam3**: Perimeter fence line (for predator detection)
   - **cam4**: Calving barn or livestock holding area

3. Convert/trim videos to recommended specs using ffmpeg:
   ```bash
   ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 22 -vf scale=1280:720 -t 30 cam1.mp4
   ```

### Option 2: Use Placeholder Videos

For testing, you can create simple placeholder videos:

```bash
# Create a 30-second test pattern video
ffmpeg -f lavfi -i testsrc=duration=30:size=1280x720:rate=30 \
       -f lavfi -i sine=frequency=1000:duration=30 \
       -pix_fmt yuv420p cam1.mp4

# Copy for other cameras
cp cam1.mp4 cam2.mp4
cp cam1.mp4 cam3.mp4
cp cam1.mp4 cam4.mp4
```

### Option 3: Use Screen Recording

Record your screen showing simulated ranch footage or images:
- Use OBS Studio, QuickTime (Mac), or Windows Game Bar
- Record for 30 seconds
- Export as MP4
- Convert to recommended specs

## Simulating Predator Detection

The system automatically flags **cam3** as having predator detection in the simulation. To create a realistic "predator alert" video for cam3:

1. Use footage showing:
   - Low-light or night vision footage
   - Movement near fence perimeter
   - Wildlife (coyotes, wolves, bears, mountain lions)
   - Infrared or thermal camera aesthetic (optional)

2. Add a subtle "motion detected" overlay or timestamp using ffmpeg:
   ```bash
   ffmpeg -i input.mp4 \
          -vf "drawtext=text='MOTION DETECTED':fontcolor=red:fontsize=24:x=10:y=10" \
          -c:a copy cam3.mp4
   ```

## Installation

Once you have your videos ready:

```bash
# Create the directory if it doesn't exist
mkdir -p frontend/public/static/media/cameras

# Copy your video files
cp /path/to/your/cam1.mp4 frontend/public/static/media/cameras/
cp /path/to/your/cam2.mp4 frontend/public/static/media/cameras/
cp /path/to/your/cam3.mp4 frontend/public/static/media/cameras/
cp /path/to/your/cam4.mp4 frontend/public/static/media/cameras/
```

## Verification

After placing the files, rebuild and restart the application:

```bash
npm run build
npm start
```

Then login and click the 📹 camera button to view your feeds!

## Troubleshooting

**Videos not playing:**
- Check that files are named exactly: `cam1.mp4`, `cam2.mp4`, `cam3.mp4`, `cam4.mp4`
- Ensure files are in the correct directory
- Verify MP4 format with H.264 codec
- Check browser console for errors

**Videos are too large/slow to load:**
- Compress videos using ffmpeg with higher CRF value (e.g., `-crf 28`)
- Reduce resolution to 720p
- Trim duration to 15-30 seconds
- Use two-pass encoding for better compression

**Mobile playback issues:**
- Ensure videos use baseline H.264 profile
- Add `playsinline muted` attributes (already included)
- Test on target devices

## Demo Mode

When demo mode is enabled (🔔 icon in quick actions), the system will:
- Simulate random predator alerts on cameras
- Show notifications when predators are detected
- Highlight cameras with active alerts in the camera grid

This happens automatically - the video files themselves don't need special formatting for demo mode.
