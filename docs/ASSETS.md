# Assets Guide

This document explains how to manage assets in Synax In Space.

## Asset Structure

```
/assets
  /raw              - Drop your raw assets here
    /sprites        - PNG/SVG sprites
    /vector         - Source SVG files
    /ships          - Ship sprites
    /enemies        - Enemy sprites
    /boss           - Boss sprites
    /effects        - Effect sprites
    /ui             - UI elements
    /backgrounds    - Background images
    /tiles          - Tile sets
    /audio          - WAV/OGG audio files
    /music          - Music files
  /generated        - Auto-generated from raw assets
    /atlases        - Sprite atlases (.png + .json)
    /audio          - Packed audio sprites
    /bitmapfonts    - Generated bitmap fonts
    /voxels         - Voxel-to-2D spritesheets
  /kits             - Third-party asset packs
```

## Adding New Assets

### Sprites

1. Drop your PNG files into `assets/raw/sprites/`
2. Run `npm run assets:build`
3. The atlas will be generated in `assets/generated/atlases/`
4. Add the atlas to `src/config/Assets.ts`:

```typescript
atlases: [
  { key: 'game', textureURL: '...', atlasURL: '...' },
  { key: 'newAtlas', textureURL: '...', atlasURL: '...' }, // Add here
]
```

### Audio

1. Drop WAV files into `assets/raw/audio/`
2. Run `npm run assets:audio`
3. Audio sprite will be generated in `assets/generated/audio/`
4. Use in code: `audioSystem.play('soundName')`

### SVG Optimization

1. Place SVG files in `assets/raw/vector/`
2. Run `npm run assets:svg` to optimize
3. Convert to PNG and add to sprites folder if needed

## Placeholder Assets

For immediate testing, the game generates procedural assets at runtime. To use real assets:

1. Create placeholder PNGs (16x16 to 128x128) for:
   - Player ship
   - Enemies (chaser, turret, sineFlyer)
   - Boss
   - Bullets (player and enemy)
   - Power-ups (weapon, bomb, health)
   - Effects (explosions)

2. Create placeholder WAV files (0.1-0.5s) for:
   - laser.wav
   - boom.wav
   - chime.wav
   - hit.wav
   - enemy_shoot.wav

3. Place them in `assets/raw/sprites/` and `assets/raw/audio/`
4. Run `npm run assets:build`

## Asset Build Scripts

- `npm run assets:clean` - Clean generated assets
- `npm run assets:svg` - Optimize SVG files
- `npm run assets:atlas` - Generate sprite atlases
- `npm run assets:opt` - Optimize atlas images
- `npm run assets:audio` - Pack audio sprites
- `npm run assets:build` - Run all asset builds
- `npm run assets:watch` - Watch for changes and rebuild

## Third-Party Asset Packs

Place third-party packs under `/assets/kits/<provider>/<packname>` and credit in `CREDITS.md`.

## Procedural Assets

The game can also generate procedural assets at runtime if atlas files are not found. See `src/scenes/PreloadScene.ts` for procedural generation code.
