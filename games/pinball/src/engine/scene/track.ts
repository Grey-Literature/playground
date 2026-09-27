// Geometry helpers shared by every theme's scene: coordinate mapping, wire-track
// tubes/ribbons along PathPts, sling and flipper solids.

import * as THREE from 'three';

// coordinate helpers: physics (x,y) -> world (x, 0, -y)
export const PX = (x: number) => x;
export const PZ = (y: number) => -y;

export type TrackPoint = { x: number; y: number; h: number };

export function trackCurve(points: TrackPoint[], offset = 0) {
  const shifted = points.map((p, i) => {
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 1)];
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    return new THREE.Vector3(p.x + nx * offset, p.h, PZ(p.y + ny * offset));
  });
  return new THREE.CatmullRomCurve3(shifted, false, 'centripetal', 0.2);
}

export function makeTrackTube(points: TrackPoint[], radius: number, offset = 0) {
  const curve = trackCurve(points, offset);
  return new THREE.TubeGeometry(curve, Math.max(24, points.length * 18), radius, 10, false);
}

// Ribbon with self-limiting edge offsets: instead of Gaussian simplification,
// we collapse the ribbon wide enough that the smooth CR centerline can never
// cut through its own edge walls (mirrors the physics corridor exactly).
export function makeTrackRibbon(points: TrackPoint[], halfWidth: number, edgeHalfWidth = halfWidth) {
  const curve = trackCurve(points, 0);
  const left = trackCurve(points, -edgeHalfWidth);
  const right = trackCurve(points, edgeHalfWidth);
  const segments = 96;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const c = curve.getPoint(t);
    const l = left.getPoint(t);
    const r = right.getPoint(t);
    positions.push((l.x + c.x) / 2, (l.y + c.y) / 2, (l.z + c.z) / 2);
    positions.push((r.x + c.x) / 2, (r.y + c.y) / 2, (r.z + c.z) / 2);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function makeTrackSurface(points: TrackPoint[], halfWidth: number) {
  // plain offset ribbon (no corners): used for the flat spiral ramp
  const curve = trackCurve(points);
  const segments = 72;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const center = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const horizontalLength = Math.hypot(tangent.x, tangent.z) || 1;
    const nx = -tangent.z / horizontalLength;
    const nz = tangent.x / horizontalLength;
    positions.push(center.x + nx * halfWidth, center.y, center.z + nz * halfWidth);
    positions.push(center.x - nx * halfWidth, center.y, center.z - nz * halfWidth);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}


export function triangleGeo(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(ax, ay);
  shape.lineTo(bx, by);
  shape.lineTo(cx, cy);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 });
  return geo;
}

export function makeFlipperGeometry(length: number, radius: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -radius);
  shape.lineTo(length, -radius);
  shape.absarc(length, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(0, radius);
  shape.absarc(0, 0, radius, Math.PI / 2, Math.PI * 1.5, false);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.12,
    bevelSegments: 3,
    curveSegments: 18,
  });
  geometry.computeVertexNormals();
  return geometry;
}
