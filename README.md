# Synax In Space

A complete side-scrolling shooter game built with Phaser 3 and TypeScript, featuring procedural assets, deterministic gameplay, and a comprehensive tuning system.

## Features

- **Side-scrolling shooter** gameplay inspired by R-Type
- **Procedural graphics** - all assets generated at runtime using Phaser Graphics
- **Deterministic RNG** - seeded random number generator for reproducible gameplay
- **Complete game systems** - player, enemies, bullets, power-ups, boss battles, shields
- **HUD overlay** - score, lives, weapon tier, bombs, shields, timer
- **Pause system** - pause/resume functionality
- **Audio system** - procedural WebAudio sound effects
- **Object pooling** - efficient memory management
- **Balancing system** - centralized tuning hub for all game parameters

## Assets

The game currently uses procedural (runtime-generated) assets. To use real sprite assets:

1. See [ASSETS_SETUP.md](./ASSETS_SETUP.md) for detailed instructions
2. Quick links: [DOWNLOAD_LINKS.md](./DOWNLOAD_LINKS.md)
3. After downloading, use the organize script:
   ```bash
   node scripts/organize-assets.mjs <download-path> <asset-type>
   ```
4. Build assets: `npm run assets:build`

## Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The game will open in your browser at `http://localhost:3000`.

### Building

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Testing

Run unit tests:

```bash
npm run test
```

### Linting and Formatting

Lint the code:

```bash
npm run lint
```

Format the code:

```bash
npm run format
```

## Controls

- **WASD / Arrow Keys**: Move player ship
- **Space**: Fire (hold for charge shot)
- **B**: Use bomb
- **N**: Activate shield (5 seconds of invincibility)
- **ESC**: Pause/Resume
- **R**: Re-seed (on menu screen)

## Gameplay

- **Player**: Move with WASD/arrows, fire with Space
- **Charge Shot**: Hold fire button for 600ms to unleash a powerful charged shot
- **Weapon Tiers**: Collect weapon power-ups to upgrade your firepower (3 tiers)
- **Bombs**: Clear screen of enemies and bullets (limited supply)
- **Lives**: Start with 3 lives, collect health power-ups to restore
- **Boss**: Face off against a multi-phase boss at 90 seconds

## Changing the RNG Seed

The game uses a deterministic random number generator for reproducible gameplay. To change the seed:

1. On the menu screen, press **R** to generate a new random seed
2. Or modify `src/config/constants.ts` to change the `defaultSeed` value
3. The seed is displayed on the menu screen

## Project Structure

```
src/
  config/          - Game constants and configuration
  entities/        - Game entities (Player, Enemy, Bullet, Boss, etc.)
  scenes/          - Phaser scenes (Boot, Preload, Menu, Game, HUD, Pause)
  systems/         - Game systems (Input, Collision, Spawner, Audio, etc.)
  ui/              - UI utilities (bitmap font generation)
  utils/           - Utility functions (math, events)
  tests/           - Unit tests
  styles/          - CSS styles
```

## Asset System

The game supports both procedural (runtime-generated) and pre-built assets:

### Procedural Assets (Default)
- All assets are generated at runtime if atlas/audio files are missing
- Works immediately without any asset setup

### Pre-built Assets
1. Drop PNG files in `assets/raw/sprites/` and WAV files in `assets/raw/audio/`
2. Run `npm run assets:build` to generate atlases and audio sprites
3. The game will automatically use these when available

See `docs/ASSETS.md` for detailed asset management guide.

## Asset Build Scripts

- `assets:clean` - Clean generated assets
- `assets:svg` - Optimize SVG files
- `assets:atlas` - Generate sprite atlases
- `assets:opt` - Optimize atlas images
- `assets:audio` - Pack audio sprites
- `assets:build` - Run all asset builds
- `assets:watch` - Watch for changes and rebuild

See `DesignTweaks.md` for detailed tuning information.

## Balancing

All game balance values are centralized in `src/systems/Balancer.ts`. This includes:

- Player speed, HP, fire rates
- Enemy HP, speeds, spawn schedules
- Power-up drop rates
- Boss configuration
- Weapon specifications

See `DesignTweaks.md` for a complete guide to balancing.

## Technology Stack

### Core
- **Phaser 3.70+**: Game framework
- **TypeScript**: Type-safe development
- **Vite**: Build tool and dev server
- **Vitest**: Unit testing
- **ESLint + Prettier**: Code quality

### Game Systems
- **seedrandom**: Deterministic RNG
- **howler**: Audio playback
- **simplex-noise**: Procedural noise generation
- **sat**: Collision detection (SAT)
- **bezier-easing**: Animation curves
- **colord**: Color utilities
- **phaser3-rex-plugins**: UI and utility plugins
- **zod**: Schema validation
- **tone**: Audio synthesis (optional)

### Asset Tools
- **spritesheet-js**: Atlas generation
- **sharp**: Image processing
- **audiosprite**: Audio sprite packing
- **svgo**: SVG optimization

## License

This project is provided as-is for educational purposes.


