# Assets Setup Guide

This guide provides instructions for downloading and organizing assets for Synax In Space.

## Directory Structure

```
assets/
├── kenney/          # Kenney.nl CC0 assets
│   ├── ships/       # Space Shooter Redux
│   ├── planets/     # Planets (2D)
│   ├── space-kit/   # Space Kit
│   ├── monsters/    # Monster Builder Pack
│   ├── characters/  # Roguelike Characters
│   ├── dungeon/     # Tiny Dungeon
│   ├── ui/          # UI Pack
│   └── particles/   # Particle Pack / Smoke Particles
├── audio/           # Audio assets
│   ├── sfx/         # Sound effects
│   ├── music/       # Background music
│   └── ambience/    # Ambient sounds
└── fonts/           # Bitmap fonts

tools/               # Development tools
```

## 1. Graphics Packs (Kenney.nl - CC0)

### Space Shooter Redux
- **URL**: https://kenney.nl/assets/space-shooter-redux
- **Download**: Click "Download" button
- **Extract to**: `assets/kenney/ships/`
- **Contains**: Ships, enemies, power-ups, UI elements
- **Use**: Main game sprites

### Planets (2D)
- **URL**: https://kenney.nl/assets/planets
- **Download**: Click "Download" button
- **Extract to**: `assets/kenney/planets/`
- **Contains**: Planetary backdrops for parallax
- **Use**: Background layers

### Space Kit
- **URL**: https://kenney.nl/assets/space-kit
- **Download**: Click "Download" button
- **Extract to**: `assets/kenney/space-kit/`
- **Contains**: Sci-fi vehicles/structures
- **Use**: Additional game elements

### Monster Builder Pack
- **URL**: https://kenney.nl/assets/monster-builder-pack
- **Download**: Click "Download" button
- **Extract to**: `assets/kenney/monsters/`
- **Contains**: Mix-and-match monster parts
- **Use**: Auto-generated alien variants

### Roguelike Characters
- **URL**: https://kenney.nl/assets/roguelike-characters
- **Download**: Click "Download" button
- **Extract to**: `assets/kenney/characters/`
- **Contains**: Hundreds of tiny characters
- **Use**: NPCs and mobs

### Tiny Dungeon
- **URL**: https://kenney.nl/assets/tiny-dungeon
- **Download**: Click "Download" button
- **Extract to**: `assets/kenney/dungeon/`
- **Contains**: Tiles + characters + Tiled sample map
- **Use**: Level prototyping

### UI Pack
- **URL**: https://kenney.nl/assets/ui-pack
- **Download**: Click "Download" button
- **Extract to**: `assets/kenney/ui/`
- **Contains**: Buttons, sliders, windows
- **Use**: Menu and HUD elements

### Particle Pack / Smoke Particles
- **URL**: https://kenney.nl/assets/particle-pack
- **Download**: Click "Download" button
- **Extract to**: `assets/kenney/particles/`
- **Contains**: Particles for thrust, explosions, hits
- **Use**: Visual effects

### All-in-1 Bundle (Optional)
- **URL**: https://kenney.itch.io/kenney-game-assets
- **Download**: Complete bundle (60k+ assets)
- **Extract to**: `assets/kenney/all-in-one/`
- **Note**: Very large download, contains everything above

## 2. Audio Packs

### Sonniss GDC Game Audio Bundle
- **URL**: https://www.sonniss.com/gameaudiogdc
- **Download**: Free archive bundles (requires email signup)
- **Extract to**: `assets/audio/sfx/`
- **Contains**: Professional SFX (lasers, UI, engines, ambience)
- **License**: Royalty-free, no attribution required
- **Note**: Very large files (tens to hundreds of GB)

### Kenney Interface/UI & Retro SFX
- **URL**: https://kenney.nl/assets/interface-sounds
- **Download**: Click "Download" button
- **Extract to**: `assets/audio/sfx/kenney/`
- **Contains**: Lightweight CC0 packs for menus
- **Use**: Classic arcade feel

## 3. Fonts (Bitmap)

### AngelCode BMFont (Windows)
- **URL**: https://www.angelcode.com/products/bmfont/
- **Install**: Download Windows installer
- **Location**: `tools/bmfont/` (or system install)
- **Use**: Generate `.fnt` + `.png` for Phaser
- **Alternative**: SnowB Bitmap Font (web-based)

### SnowB Bitmap Font (Web)
- **URL**: https://snowb.org/
- **Use**: Browser-based bitmap font generator
- **Export**: `.fnt` + `.png` format
- **No install required**: Works in browser

## 4. Development Tools

### TexturePacker
- **URL**: https://www.codeandweb.com/texturepacker
- **Install**: Download installer (free trial available)
- **Use**: Auto-atlas PNGs into Phaser JSON atlases
- **CLI**: Available for automation
- **Alternative**: Free Texture Packer (web-based)

### Free Texture Packer (Web)
- **URL**: https://free-tex-packer.com/
- **Use**: No-install alternative
- **Export**: Phaser JSON format
- **No install required**: Works in browser

### Tiled Map Editor
- **URL**: https://www.mapeditor.org/
- **Install**: Download for your OS
- **Use**: 2D level editor with JSON export
- **Location**: `tools/tiled/` (or system install)

### Particle Editor for Phaser 3
- **URL**: https://koreezgames.github.io/phaser-particle-editor/
- **Use**: Web-based particle editor
- **Export**: Emitter JSON for Phaser
- **No install required**: Works in browser

### Aseprite
- **URL**: https://www.aseprite.org/
- **Install**: Download installer (paid, or compile from source)
- **Use**: Export JSON spritesheets
- **Note**: Phaser has native Aseprite loading support

## 5. Integration Steps

### After Downloading Assets:

1. **Process Sprites**:
   ```bash
   # Copy Kenney sprites to raw folder
   cp assets/kenney/ships/*.png assets/raw/sprites/
   
   # Build atlas
   npm run assets:build
   ```

2. **Process Audio**:
   ```bash
   # Copy audio files to raw folder
   cp assets/audio/sfx/*.wav assets/raw/audio/
   
   # Build audio sprite
   npm run assets:audio
   ```

3. **Add to Assets.ts**:
   - Update `src/config/Assets.ts` with new atlas/audio paths

4. **Update PreloadScene**:
   - Add new texture keys to `src/scenes/PreloadScene.ts`
   - Or replace procedural generation with loaded sprites

## 6. Quick Start (Recommended Packs)

**Minimum required for basic game:**
1. Space Shooter Redux (ships, enemies, power-ups)
2. UI Pack (menus)
3. Particle Pack (effects)
4. Kenney Interface Sounds (audio)

**Full setup:**
- All Kenney packs listed above
- Sonniss audio bundle (if you have space)
- TexturePacker for optimization

## 7. Notes

- All Kenney assets are **CC0** (public domain)
- Sonniss audio is **royalty-free** (no attribution)
- Bitmap fonts need to be generated before use
- TexturePacker significantly reduces load size
- Consider using TexturePacker CLI for automation

## 8. Automation Scripts

After setting up assets, you can create scripts to:
- Auto-copy assets from download folders
- Batch process with TexturePacker
- Generate atlases automatically
- Update asset configuration files







