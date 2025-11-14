/**
 * Extended gamepad type definitions
 */

export interface ExtendedGamepad extends Phaser.Input.Gamepad.Gamepad {
  rightShoulder?: boolean;
  leftShoulder?: boolean;
  start?: boolean;
}

