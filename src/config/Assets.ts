/**
 * Asset configuration - paths to generated atlases, audio sprites, etc.
 */

export const ASSETS = {
  atlases: [
    {
      key: 'game',
      textureURL: 'assets/generated/atlases/game.png',
      atlasURL: 'assets/generated/atlases/game.json',
    },
  ],
  audioSprite: {
    key: 'sfx',
    url: 'assets/generated/audio/sfx.json',
    audioURL: ['assets/generated/audio/sfx.ogg', 'assets/generated/audio/sfx.mp3'],
  },
  // Bitmap fonts can be added here later
  // Tilemaps can be added here later
} as const;

