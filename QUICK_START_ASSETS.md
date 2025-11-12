# Quick Start: Adding Kenney Assets

The game is now set up to automatically use Kenney Space Shooter Redux assets when available!

## Step 1: Download Assets

1. Go to: https://kenney.nl/assets/space-shooter-redux
2. Click "Download" (it's free, CC0 license)
3. Extract the ZIP file somewhere (e.g., `~/Downloads/space-shooter-redux`)

## Step 2: Run Setup Script

```bash
node scripts/setup-kenney-assets.mjs ~/Downloads/space-shooter-redux
```

This script will:
- Copy all sprites to `assets/raw/sprites/`
- Build a sprite atlas automatically
- Optimize the atlas

## Step 3: Restart Dev Server

```bash
npm run dev
```

The game will automatically detect and use the Kenney sprites!

## What Gets Improved

✅ **Player Ship** - Beautiful blue spaceship  
✅ **Enemy Ships** - Different enemy types (black, red, blue ships)  
✅ **Bullets** - Realistic laser projectiles  
✅ **Power-ups** - Colorful power-up icons  
✅ **Boss** - Larger enemy ship for boss battles  

## Fallback System

If assets aren't found, the game automatically falls back to procedural generation. No errors!

## Troubleshooting

**Assets not loading?**
- Check console for warnings
- Make sure you ran `npm run assets:build` after setup
- Verify `assets/generated/atlases/game.png` exists

**Sprites look wrong?**
- Some Kenney sprites might have different names
- Check `src/config/AssetMappings.ts` to adjust sprite names
- The game will use procedural sprites as fallback

## Next Steps

Want more assets?
- Add UI Pack: https://kenney.nl/assets/ui-pack
- Add Particles: https://kenney.nl/assets/particle-pack
- Add Planets: https://kenney.nl/assets/planets (for backgrounds)

Use the same setup script for any Kenney pack!







