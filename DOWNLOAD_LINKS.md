# Quick Download Links

## Graphics Packs (Kenney.nl - CC0)

1. **Space Shooter Redux**: https://kenney.nl/assets/space-shooter-redux
2. **Planets (2D)**: https://kenney.nl/assets/planets
3. **Space Kit**: https://kenney.nl/assets/space-kit
4. **Monster Builder Pack**: https://kenney.nl/assets/monster-builder-pack
5. **Roguelike Characters**: https://kenney.nl/assets/roguelike-characters
6. **Tiny Dungeon**: https://kenney.nl/assets/tiny-dungeon
7. **UI Pack**: https://kenney.nl/assets/ui-pack
8. **Particle Pack**: https://kenney.nl/assets/particle-pack
9. **Smoke Particles**: https://kenney.nl/assets/smoke-particles
10. **All-in-1 Bundle**: https://kenney.itch.io/kenney-game-assets

## Audio Packs

1. **Sonniss GDC Bundle**: https://www.sonniss.com/gameaudiogdc
2. **Kenney Interface Sounds**: https://kenney.nl/assets/interface-sounds
3. **Kenney Retro SFX**: https://kenney.nl/assets/retro-sounds

## Font Tools

1. **AngelCode BMFont**: https://www.angelcode.com/products/bmfont/
2. **SnowB Bitmap Font** (web): https://snowb.org/

## Development Tools

1. **TexturePacker**: https://www.codeandweb.com/texturepacker
2. **Free Texture Packer** (web): https://free-tex-packer.com/
3. **Tiled Map Editor**: https://www.mapeditor.org/
4. **Particle Editor** (web): https://koreezgames.github.io/phaser-particle-editor/
5. **Aseprite**: https://www.aseprite.org/
6. **Rex Plugins**: Already installed via npm ✅

## After Downloading

Use the organize script:
```bash
node scripts/organize-assets.mjs ~/Downloads/space-shooter-redux ships
```

Or manually copy files to:
- Sprites: `assets/kenney/[type]/`
- Audio: `assets/audio/[type]/`

Then run:
```bash
npm run assets:build  # For sprites
npm run assets:audio  # For audio
```







