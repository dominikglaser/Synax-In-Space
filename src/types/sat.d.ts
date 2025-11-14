/**
 * Type definitions for the 'sat' library
 */

declare module 'sat' {
  export class Vector {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    copy(other: Vector): Vector;
    clone(): Vector;
    perp(): Vector;
    rotate(angle: number): Vector;
    reverse(): Vector;
    normalize(): Vector;
    add(other: Vector): Vector;
    sub(other: Vector): Vector;
    scale(x: number, y?: number): Vector;
    project(other: Vector): Vector;
    dot(other: Vector): number;
    len2(): number;
    len(): number;
  }

  export class Circle {
    pos: Vector;
    r: number;
    constructor(pos: Vector, r: number);
  }

  export class Polygon {
    pos: Vector;
    angle: number;
    offset: Vector;
    points: Vector[];
    calcPoints: Vector[];
    edges: Vector[];
    normals: Vector[];
    constructor(pos: Vector, points: Vector[]);
    setOffset(offset: Vector): void;
    setAngle(angle: number): void;
    setOffset(offset: Vector): void;
    rotate(angle: number): void;
    translate(x: number, y: number): void;
    getAABB(): Box;
  }

  export class Box {
    pos: Vector;
    w: number;
    h: number;
    constructor(pos: Vector, w: number, h: number);
    toPolygon(): Polygon;
  }

  export class Response {
    a: Circle | Polygon | null;
    b: Circle | Polygon | null;
    aInB: boolean;
    bInA: boolean;
    overlap: number;
    overlapN: Vector;
    overlapV: Vector;
    clear(): void;
  }

  export function testCircleCircle(a: Circle, b: Circle, response?: Response): boolean;
  export function testPolygonCircle(polygon: Polygon, circle: Circle, response?: Response): boolean;
  export function testCirclePolygon(circle: Circle, polygon: Polygon, response?: Response): boolean;
  export function testPolygonPolygon(a: Polygon, b: Polygon, response?: Response): boolean;
}

