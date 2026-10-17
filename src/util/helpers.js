import * as THREE from 'three';

export const UP = new THREE.Vector3(0, 1, 0);
export const Z_AXIS = new THREE.Vector3(0, 0, 1);

export function vec(v) {
  return v instanceof THREE.Vector3 ? v.clone() : new THREE.Vector3(v[0], v[1], v[2]);
}

/** Smooth ellipsoid built from a shared-unit sphere. */
export function ellipsoid(rx, ry, rz, material, widthSegments = 32, heightSegments = 20) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, widthSegments, heightSegments), material);
  mesh.scale.set(rx, ry, rz);
  return mesh;
}

/** Tapered cylinder between two points. `radiusA` sits at `a`, `radiusB` at `b`. */
export function segment(a, b, radiusA, radiusB, material, radialSegments = 20) {
  const from = vec(a);
  const to = vec(b);
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusB, radiusA, length, radialSegments, 1, false),
    material,
  );
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  return mesh;
}

/** Torus aligned so its hole faces `direction`. */
export function ringAt(position, direction, radius, tube, material, radialSegments = 8) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, radialSegments, 48), material);
  mesh.position.copy(vec(position));
  mesh.quaternion.setFromUnitVectors(Z_AXIS, vec(direction).normalize());
  return mesh;
}

/** Catmull-Rom tube through points. */
export function tube(points, radius, material, tubularSegments = 56, radialSegments = 7) {
  const curve = new THREE.CatmullRomCurve3(points.map(vec));
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false),
    material,
  );
}

/**
 * Build a parametric cloth grid.
 * `compute(u, v)` returns [x, y, z]; u runs across the sheet, v runs down it.
 */
export function gridGeometry(columns, rows, compute) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i <= columns; i += 1) {
      const u = i / columns;
      const v = j / rows;
      const point = compute(u, v);
      positions.push(point[0], point[1], point[2]);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const a = j * (columns + 1) + i;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function markShadows(root, cast = true, receive = true) {
  root.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = cast;
      object.receiveShadow = receive;
    }
  });
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

export function mulberry32(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function valueNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

export function fbm(x, y, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * frequency, y * frequency) * amplitude;
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}
