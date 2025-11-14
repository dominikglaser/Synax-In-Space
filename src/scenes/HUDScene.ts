/**
 * HUDScene - Overlay UI for score, lives, weapon tier, bombs, timer
 */

import Phaser from 'phaser';
// GAME_CONFIG available if needed in future
// import { GAME_CONFIG } from '../config/constants';
import type { GameState } from '../types';

export class HUDScene extends Phaser.Scene {
  private scoreText?: Phaser.GameObjects.Text;
  private livesText?: Phaser.GameObjects.Text;
  private weaponText?: Phaser.GameObjects.Text;
  private bombsText?: Phaser.GameObjects.Text;
  private shieldsText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private gameState?: GameState;

  constructor() {
    super({ key: 'HUDScene' });
  }

  create(): void {
    const padding = 20;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '16px',
      fontFamily: 'monospace',
    };

    // Score
    this.scoreText = this.add
      .text(padding, padding, 'SCORE: 0000000', style)
      .setColor('#ffffff')
      .setDepth(1000);

    // Lives
    this.livesText = this.add
      .text(padding, padding + 30, 'LIVES: 3', style)
      .setColor('#00ffff')
      .setDepth(1000);

    // Weapon tier
    this.weaponText = this.add
      .text(padding, padding + 60, 'WEAPON: I', style)
      .setColor('#ffff00')
      .setDepth(1000);

    // Bombs
    this.bombsText = this.add
      .text(padding, padding + 90, 'BOMBS: 3', style)
      .setColor('#ff00ff')
      .setDepth(1000);

    // Shields
    this.shieldsText = this.add
      .text(padding, padding + 120, 'SHIELDS: 1', style)
      .setColor('#4488ff')
      .setDepth(1000);

    // Timer
    const { width } = this.cameras.main;
    this.timerText = this.add
      .text(width - padding, padding, '00:00', style)
      .setOrigin(1, 0)
      .setColor('#ffffff')
      .setDepth(1000);
  }

  /**
   * Update HUD with current game state
   */
  updateHUD(state: GameState): void {
    if (!this.gameState) {
      this.gameState = state;
    } else {
      this.gameState = { ...this.gameState, ...state };
    }

    if (this.scoreText) {
      this.scoreText.setText(`SCORE: ${this.gameState.score.toString().padStart(7, '0')}`);
    }

    if (this.livesText) {
      this.livesText.setText(`LIVES: ${this.gameState.lives}`);
    }

    if (this.weaponText) {
      const maxTier = 6; // Maximum weapon tier
      if (this.gameState.weaponTier >= maxTier) {
        this.weaponText.setText('WEAPON: MAX LEVEL');
      } else {
        const tier = this.gameState.weaponTier + 1; // Convert to 1-based for display
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
        const roman = romanNumerals[tier - 1] || 'I';
        this.weaponText.setText(`WEAPON: ${roman}`);
      }
    }

    if (this.bombsText) {
      this.bombsText.setText(`BOMBS: ${this.gameState.bombs}`);
    }

    if (this.shieldsText) {
      this.shieldsText.setText(`SHIELDS: ${this.gameState.shields ?? 0}`);
    }

    if (this.timerText) {
      const minutes = Math.floor(this.gameState.stageTime / 60);
      const seconds = Math.floor(this.gameState.stageTime % 60);
      this.timerText.setText(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }
  }
}

