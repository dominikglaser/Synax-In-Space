# Design Tweaks & Balancing Guide

This document outlines all tuning knobs available in `src/systems/Balancer.ts` and provides guidance on how to balance the game.

## Tuning Hub Location

All game balance values are in: **`src/systems/Balancer.ts`**

## Player Configuration

### Movement
- **`playerSpeed`**: Player movement speed (pixels per second)
  - Default: 400
  - Range: 200-800 recommended
  - Higher = more responsive, easier dodging

### Lives & Health
- **`playerLives`**: Starting number of lives
  - Default: 3
  - Range: 1-5 recommended
  - Increase for easier gameplay

- **`playerIFramesMs`**: Invincibility duration after taking damage (milliseconds)
  - Default: 2000
  - Range: 1000-3000 recommended
  - Longer = more forgiving

### Combat
- **`playerChargeShotTime`**: Time to hold fire for charge shot (milliseconds)
  - Default: 600
  - Range: 300-1000 recommended
  - Lower = easier to charge, more powerful

- **`chargeShotDamage`**: Damage multiplier for charge shot
  - Default: 50
  - Range: 20-100 recommended
  - Higher = charge shots more powerful

- **`chargeShotSize`**: Size multiplier for charge shot visual
  - Default: 2
  - Range: 1.5-3 recommended
  - Visual only, but affects collision

### Bombs
- **`bombsStart`**: Starting number of bombs
  - Default: 3
  - Range: 1-5 recommended

- **`bombDamage`**: Damage to all enemies in radius
  - Default: 100
  - Range: 50-200 recommended

- **`bombClearRadius`**: Radius of bomb effect (pixels)
  - Default: 1000
  - Range: 500-1500 recommended

## Weapon System

Weapon tiers are defined in **`WEAPON_SPECS`** array:

- **`fireRate`**: Shots per second
  - Higher = faster firing
  - Default tier 1: 8, tier 2: 10, tier 3: 12

- **`damage`**: Damage per bullet
  - Higher = more damage
  - Default tier 1: 10, tier 2: 12, tier 3: 15

- **`bulletSpeed`**: Bullet velocity (pixels per second)
  - Higher = faster bullets
  - Default tier 1: 800, tier 2: 900, tier 3: 1000

- **`bulletCount`**: Number of bullets per shot
  - Higher = more coverage
  - Default tier 1: 1, tier 2: 2, tier 3: 3

- **`spreadAngle`**: Angle spread in degrees for multi-bullet shots
  - Higher = wider spread
  - Default tier 1: 0, tier 2: 15, tier 3: 20

## Enemy Configuration

### Health Points
- **`enemyHP.chaser`**: HP for chaser enemies
  - Default: 20
  - Range: 10-50 recommended

- **`enemyHP.turret`**: HP for turret enemies
  - Default: 30
  - Range: 20-60 recommended

- **`enemyHP.sineFlyer`**: HP for sine-flying enemies
  - Default: 15
  - Range: 10-40 recommended

### Movement Speed
- **`enemySpeeds.chaser`**: Chaser movement speed (pixels per second)
  - Default: 150
  - Range: 100-300 recommended

- **`enemySpeeds.turret`**: Turret movement speed
  - Default: 80
  - Range: 50-150 recommended

- **`enemySpeeds.sineFlyer`**: Sine-flyer movement speed
  - Default: 120
  - Range: 80-200 recommended

### Fire Rates
- **`enemyFireRates.chaser`**: Chaser fire rate (shots per second)
  - Default: 1.5
  - Range: 0.5-3 recommended

- **`enemyFireRates.turret`**: Turret fire rate
  - Default: 2
  - Range: 1-4 recommended

- **`enemyFireRates.sineFlyer`**: Sine-flyer fire rate
  - Default: 1
  - Range: 0.5-2 recommended

## Power-Up Drop Rates

All drop rates are probabilities (0-1):

- **`dropRates.weapon`**: Chance to drop weapon power-up
  - Default: 0.3 (30%)
  - Range: 0.1-0.5 recommended

- **`dropRates.bomb`**: Chance to drop bomb
  - Default: 0.2 (20%)
  - Range: 0.1-0.4 recommended

- **`dropRates.health`**: Chance to drop health (only if below max)
  - Default: 0.1 (10%)
  - Range: 0.05-0.3 recommended

**Note**: Total drop rate should be ≤ 1.0 to avoid too many power-ups.

## Boss Configuration

- **`bossHP`**: Total boss HP
  - Default: 500
  - Range: 300-1000 recommended
  - Higher = longer boss fight

- **`bossHPPhases`**: HP thresholds for phase changes (0-1)
  - Default: [1.0, 0.7, 0.35]
  - Each phase has different attack patterns
  - Adjust to change when phases trigger

- **`bossSpeed`**: Boss movement speed
  - Default: 100
  - Range: 50-200 recommended

- **`bossFireRate`**: Boss fire rate (shots per second)
  - Default: 3
  - Range: 1-5 recommended

- **`bossBulletSpeed`**: Boss bullet speed
  - Default: 300
  - Range: 200-500 recommended

## Spawn Schedule

Enemy spawns are defined in **`spawnSchedule`** array:

```typescript
{ time: 2, enemyType: 'chaser', x: 1400 }
```

- **`time`**: Spawn time in seconds
- **`enemyType`**: Enemy type ('chaser', 'turret', 'sineFlyer')
- **`x`**: X position (typically screen edge: 1400)
- **`y`**: Optional Y position (random if omitted)

**Tips**:
- Start with sparse spawns early (2-10s)
- Increase density as time progresses
- Mix enemy types for variety
- Boss spawns at 90s (handled in GameScene)

## Scoring

- **`scorePerKill.chaser`**: Points for killing chaser
  - Default: 100

- **`scorePerKill.turret`**: Points for killing turret
  - Default: 150

- **`scorePerKill.sineFlyer`**: Points for killing sine-flyer
  - Default: 80

- **`scorePerKill.boss`**: Points for killing boss
  - Default: 5000

## Effects

- **`shakeIntensity`**: Camera shake intensity (pixels)
  - Default: 5
  - Range: 2-10 recommended

- **`shakeDuration`**: Shake duration (milliseconds)
  - Default: 200
  - Range: 100-500 recommended

## Balancing Checklist

When tuning the game, follow this checklist:

1. **Player Feel**
   - [ ] Movement feels responsive
   - [ ] Charge shot timing feels natural
   - [ ] I-frames provide enough safety window

2. **Difficulty Curve**
   - [ ] Early enemies are easy to kill
   - [ ] Mid-game provides challenge
   - [ ] Boss is challenging but fair

3. **Weapon Progression**
   - [ ] Tier 1 feels weak but usable
   - [ ] Tier 2 feels like a clear upgrade
   - [ ] Tier 3 feels powerful

4. **Enemy Balance**
   - [ ] Chasers are fast but weak
   - [ ] Turrets are slow but tanky
   - [ ] Sine-flyers are medium difficulty

5. **Power-Up Balance**
   - [ ] Weapon drops feel frequent enough
   - [ ] Bombs are rare but valuable
   - [ ] Health drops when needed

6. **Boss Fight**
   - [ ] Phase 1 is manageable
   - [ ] Phase 2 increases difficulty
   - [ ] Phase 3 is challenging
   - [ ] Total fight duration is 30-60 seconds

7. **Spawn Schedule**
   - [ ] Early waves are sparse
   - [ ] Mid-game has steady flow
   - [ ] Pre-boss waves are intense
   - [ ] No unfair bullet hell moments

8. **Scoring**
   - [ ] Points feel rewarding
   - [ ] Boss kill is significant
   - [ ] Score reflects skill

## Testing Changes

After making balance changes:

1. Play through the game from start to boss
2. Note any difficulty spikes or dead zones
3. Adjust values incrementally (10-20% changes)
4. Test with different seeds for consistency
5. Verify boss phases trigger at intended HP

## Common Issues & Solutions

**Problem**: Game feels too easy
- **Solution**: Increase enemy HP, reduce player speed, increase enemy fire rates

**Problem**: Game feels too hard
- **Solution**: Decrease enemy HP, increase player speed, reduce enemy fire rates

**Problem**: Charge shot feels weak
- **Solution**: Increase `chargeShotDamage`, decrease `playerChargeShotTime`

**Problem**: Too many/few power-ups
- **Solution**: Adjust `dropRates` values proportionally

**Problem**: Boss too easy/hard
- **Solution**: Adjust `bossHP`, `bossFireRate`, or phase thresholds

## Quick Reference

**Location**: `src/systems/Balancer.ts`

**Key Values**:
- Player: `playerSpeed`, `playerLives`, `playerIFramesMs`
- Weapons: `WEAPON_SPECS` array
- Enemies: `enemyHP`, `enemySpeeds`, `enemyFireRates`
- Drops: `dropRates`
- Boss: `bossHP`, `bossHPPhases`, `bossFireRate`
- Spawns: `spawnSchedule` array

Remember: Small incremental changes are better than large swings!


