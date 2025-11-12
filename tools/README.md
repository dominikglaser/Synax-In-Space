# Development Tools

This directory is for storing development tools and utilities.

## Recommended Tools

### TexturePacker
- **Purpose**: Create optimized sprite atlases
- **Install**: Download from https://www.codeandweb.com/texturepacker
- **CLI Usage**:
  ```bash
  TexturePacker --format phaser --data assets/generated/atlases/sprites.json \
    --sheet assets/generated/atlases/sprites.png \
    assets/raw/sprites/
  ```

### Tiled Map Editor
- **Purpose**: Create tilemaps and level layouts
- **Install**: Download from https://www.mapeditor.org/
- **Export Format**: JSON for Phaser

### AngelCode BMFont
- **Purpose**: Generate bitmap fonts
- **Install**: Download from https://www.angelcode.com/products/bmfont/
- **Output**: `.fnt` + `.png` files for Phaser

## Web-Based Tools (No Install)

These tools work in your browser:

- **SnowB Bitmap Font**: https://snowb.org/
- **Free Texture Packer**: https://free-tex-packer.com/
- **Particle Editor**: https://koreezgames.github.io/phaser-particle-editor/

## Integration with Project

Tools in this directory can be referenced in npm scripts or build processes.

Example npm script:
```json
{
  "scripts": {
    "pack:textures": "TexturePacker --format phaser ..."
  }
}
```







