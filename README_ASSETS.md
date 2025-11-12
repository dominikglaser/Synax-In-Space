# Automatic Asset Download

The game can now automatically download required assets!

## Quick Start

Run this single command to download and set up all assets:

```bash
npm run assets:setup
```

This will:
1. ✅ Download Kenney Space Shooter Redux (ships, enemies, bullets, power-ups)
2. ✅ Download Kenney UI Pack (optional)
3. ✅ Download Kenney Particle Pack (optional)
4. ✅ Organize all sprites automatically
5. ✅ Build sprite atlas
6. ✅ Optimize atlas

## Individual Commands

```bash
# Download assets only
npm run assets:download

# Build atlas from downloaded sprites
npm run assets:build

# Full setup (download + build)
npm run assets:setup
```

## What Gets Downloaded

### Required Assets
- **Kenney Space Shooter Redux**: Ships, enemies, bullets, power-ups, explosions
  - Source: GitHub (KenneyAssets/SpaceShooterRedux)
  - License: CC0 (Public Domain)

### Optional Assets
- **Kenney UI Pack**: Buttons, panels, windows
- **Kenney Particle Pack**: Particle effects

## How It Works

1. The script downloads ZIP files from GitHub repositories
2. Extracts them automatically
3. Finds all PNG files
4. Copies them to `assets/raw/sprites/` for processing
5. Also organizes them in `assets/kenney/[category]/`
6. Builds a sprite atlas automatically

## Fallback System

If assets fail to download:
- The game will automatically use procedural sprites
- No errors, the game will still work
- You can manually download assets later

## Manual Download (if needed)

If automatic download fails, you can:

1. Visit: https://kenney.nl/assets/space-shooter-redux
2. Download the ZIP file
3. Extract it
4. Copy PNG files to `assets/raw/sprites/`
5. Run: `npm run assets:build`

## Troubleshooting

**Download fails?**
- Check your internet connection
- Ensure you have `unzip`, `7z`, or Python installed
- Try manually downloading from the GitHub links

**Atlas not building?**
- Make sure `spritesheet-js` is installed: `npm install`
- Check that PNG files exist in `assets/raw/sprites/`

**Assets not showing?**
- Restart your dev server: `npm run dev`
- Check browser console for errors
- Verify `assets/generated/atlases/game.png` exists







