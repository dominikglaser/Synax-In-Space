/**
 * Input system for keyboard and gamepad
 */

import Phaser from 'phaser';

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
  bomb: boolean;
  pause: boolean;
}

export class InputSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private space: Phaser.Input.Keyboard.Key;
  private bomb: Phaser.Input.Keyboard.Key;
  private shield: Phaser.Input.Keyboard.Key;
  private esc: Phaser.Input.Keyboard.Key;
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };
    this.space = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.bomb = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.shield = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.N); // N key for shield
    this.esc = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Gamepad support
    scene.input.gamepad?.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepad = pad;
    });
  }

  /**
   * Get current input state
   */
  getInputState(): InputState {
    const left = this.cursors.left.isDown || this.wasd.A.isDown || (this.gamepad?.leftStick.x ?? 0) < -0.5;
    const right = this.cursors.right.isDown || this.wasd.D.isDown || (this.gamepad?.leftStick.x ?? 0) > 0.5;
    const up = this.cursors.up.isDown || this.wasd.W.isDown || (this.gamepad?.leftStick.y ?? 0) < -0.5;
    const down = this.cursors.down.isDown || this.wasd.S.isDown || (this.gamepad?.leftStick.y ?? 0) > 0.5;
    const fire = this.space.isDown || (this.gamepad?.A ?? false);
    const bomb = this.bomb.isDown || (this.gamepad?.rightShoulder ?? false);
    const pause = Phaser.Input.Keyboard.JustDown(this.esc) || (this.gamepad?.start ?? false);

    return {
      left,
      right,
      up,
      down,
      fire,
      bomb,
      pause,
    };
  }

  /**
   * Check if fire button was just pressed (not held)
   */
  isFireJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.space) || (this.gamepad?.A ?? false);
  }

  /**
   * Check if bomb button was just pressed
   */
  isBombJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.bomb) || (this.gamepad?.rightShoulder ?? false);
  }
  
  /**
   * Check if shield button was just pressed
   */
  isShieldJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.shield) || (this.gamepad?.leftShoulder ?? false);
  }

  /**
   * Check if pause was just pressed
   */
  isPauseJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.esc) || (this.gamepad?.start ?? false);
  }
}


