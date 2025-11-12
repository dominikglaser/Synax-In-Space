/**
 * Tests for collision detection
 */

import { describe, it, expect } from 'vitest';
import { aabbCollision, circleCollision, circleAabbCollision } from '../utils/math';

describe('Collision Detection', () => {
  describe('AABB Collision', () => {
    it('should detect overlapping rectangles', () => {
      const a = { x: 0, y: 0, width: 10, height: 10 };
      const b = { x: 5, y: 5, width: 10, height: 10 };
      expect(aabbCollision(a, b)).toBe(true);
    });

    it('should not detect non-overlapping rectangles', () => {
      const a = { x: 0, y: 0, width: 10, height: 10 };
      const b = { x: 20, y: 20, width: 10, height: 10 };
      expect(aabbCollision(a, b)).toBe(false);
    });

    it('should detect touching rectangles', () => {
      const a = { x: 0, y: 0, width: 10, height: 10 };
      const b = { x: 10, y: 0, width: 10, height: 10 };
      expect(aabbCollision(a, b)).toBe(true);
    });
  });

  describe('Circle Collision', () => {
    it('should detect overlapping circles', () => {
      const a = { x: 0, y: 0, radius: 5 };
      const b = { x: 5, y: 0, radius: 5 };
      expect(circleCollision(a, b)).toBe(true);
    });

    it('should not detect non-overlapping circles', () => {
      const a = { x: 0, y: 0, radius: 5 };
      const b = { x: 20, y: 0, radius: 5 };
      expect(circleCollision(a, b)).toBe(false);
    });

    it('should detect touching circles', () => {
      const a = { x: 0, y: 0, radius: 5 };
      const b = { x: 10, y: 0, radius: 5 };
      expect(circleCollision(a, b)).toBe(true);
    });
  });

  describe('Circle-AABB Collision', () => {
    it('should detect circle overlapping rectangle', () => {
      const circle = { x: 5, y: 5, radius: 5 };
      const rect = { x: 0, y: 0, width: 10, height: 10 };
      expect(circleAabbCollision(circle, rect)).toBe(true);
    });

    it('should not detect circle outside rectangle', () => {
      const circle = { x: 20, y: 20, radius: 5 };
      const rect = { x: 0, y: 0, width: 10, height: 10 };
      expect(circleAabbCollision(circle, rect)).toBe(false);
    });

    it('should detect circle touching rectangle edge', () => {
      const circle = { x: 10, y: 5, radius: 5 };
      const rect = { x: 0, y: 0, width: 10, height: 10 };
      expect(circleAabbCollision(circle, rect)).toBe(true);
    });
  });
});


