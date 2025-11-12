/**
 * SAT (Separating Axis Theorem) collision detection for non-axis-aligned shapes
 */

import * as SAT from 'sat';

export interface CollisionResult {
  collided: boolean;
  overlap: number;
  normal: { x: number; y: number };
}

/**
 * Circle vs Polygon collision
 */
export function circleVsPolygon(
  cx: number,
  cy: number,
  r: number,
  points: { x: number; y: number }[]
): CollisionResult {
  const c = new SAT.Circle(new SAT.Vector(cx, cy), r);
  const p = new SAT.Polygon(
    new SAT.Vector(0, 0),
    points.map((pt) => new SAT.Vector(pt.x, pt.y))
  );
  const resp = new SAT.Response();
  const collided = SAT.testCirclePolygon(c, p, resp);

  return {
    collided,
    overlap: resp.overlap,
    normal: { x: resp.overlapN.x, y: resp.overlapN.y },
  };
}

/**
 * Circle vs Circle collision
 */
export function circleVsCircle(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): CollisionResult {
  const c1 = new SAT.Circle(new SAT.Vector(x1, y1), r1);
  const c2 = new SAT.Circle(new SAT.Vector(x2, y2), r2);
  const resp = new SAT.Response();
  const collided = SAT.testCircleCircle(c1, c2, resp);

  return {
    collided,
    overlap: resp.overlap,
    normal: { x: resp.overlapN.x, y: resp.overlapN.y },
  };
}

/**
 * Polygon vs Polygon collision
 */
export function polygonVsPolygon(
  points1: { x: number; y: number }[],
  points2: { x: number; y: number }[]
): CollisionResult {
  const p1 = new SAT.Polygon(
    new SAT.Vector(0, 0),
    points1.map((pt) => new SAT.Vector(pt.x, pt.y))
  );
  const p2 = new SAT.Polygon(
    new SAT.Vector(0, 0),
    points2.map((pt) => new SAT.Vector(pt.x, pt.y))
  );
  const resp = new SAT.Response();
  const collided = SAT.testPolygonPolygon(p1, p2, resp);

  return {
    collided,
    overlap: resp.overlap,
    normal: { x: resp.overlapN.x, y: resp.overlapN.y },
  };
}

