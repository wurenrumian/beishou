import * as THREE from 'three';
import { materials } from '../materials.js';
import {
  clamp,
  fbm,
  markShadows,
  mulberry32,
  smoothstep,
} from '../util/helpers.js';
import { softCircleTexture } from '../util/textures.js';

const GROUND_SIZE = 300;
const GROUND_SEGMENTS = 170;

export function terrainHeight(x, z) {
  const radius = Math.hypot(x, z);
  const flat = smoothstep(2.4, 13, radius);

  let height = (fbm(x * 0.045 + 7.3, z * 0.045 - 2.1, 4) - 0.45) * 6.5 * flat;
  height += (fbm(x * 0.13 + 1.7, z * 0.13 + 3.2, 3) - 0.5) * 0.7 * flat;
  height += Math.sin(x * 0.42 + z * 0.24) * 0.06 * flat;
  height += smoothstep(32, 125, radius) * (fbm(x * 0.017 + 2.2, z * 0.017 - 4.6, 3) - 0.4) * 9;

  return height - 0.02;
}

function buildGround() {
  const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEGMENTS, GROUND_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const fresh = new THREE.Color(0xe0eef8);
  const shade = new THREE.Color(0x93b7ca);
  const deep = new THREE.Color(0x648aa1);
  const color = new THREE.Color();

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = terrainHeight(x, z);
    position.setY(i, y);

    const grain = fbm(x * 0.09 + 11.4, z * 0.09 - 5.7, 3);
    const ripple = fbm(x * 0.34 - 2.2, z * 0.34 + 8.8, 2);
    color.copy(fresh);
    color.lerp(shade, clamp(grain * 1.35 - 0.22, 0, 1) * 0.62);
    color.lerp(deep, clamp(-y * 0.12, 0, 0.4) + ripple * 0.12);
    color.lerp(shade, clamp(ripple - 0.65, 0, 1) * 0.3);

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.02,
    envMapIntensity: 0.55,
    dithering: true,
  });

  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  return ground;
}

function mountainMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.96,
    metalness: 0.04,
    envMapIntensity: 0.35,
  });
}

function buildMountains(random) {
  const group = new THREE.Group();
  const count = 30;

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.14;
    const radius = 78 + random() * 42;
    const height = 17 + random() * 23;
    const baseRadius = height * (0.62 + random() * 0.36);
    const segments = 5 + Math.floor(random() * 3);

    const geometry = new THREE.ConeGeometry(baseRadius, height, segments, 4);
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const rock = new THREE.Color(0x183647);
    const rockLight = new THREE.Color(0x2b4f61);
    const snow = new THREE.Color(0xb8d4e2);
    const vertex = new THREE.Color();

    for (let v = 0; v < position.count; v += 1) {
      const x = position.getX(v);
      const y = position.getY(v);
      const z = position.getZ(v);
      const normalized = (y + height / 2) / height;

      if (normalized < 0.99) {
        const jitter = (random() - 0.5) * 0.12;
        position.setX(v, x * (1 + jitter));
        position.setZ(v, z * (1 + jitter));
        position.setY(v, y + (random() - 0.5) * height * 0.03);
      }

      vertex.copy(rock).lerp(rockLight, normalized * 0.7);
      const snowLine = 0.54 + fbm(x * 0.2 + i, z * 0.2, 2) * 0.22;
      if (normalized > snowLine) {
        vertex.lerp(snow, clamp((normalized - snowLine) / 0.32, 0, 1) * 0.85);
      }
      colors[v * 3] = vertex.r;
      colors[v * 3 + 1] = vertex.g;
      colors[v * 3 + 2] = vertex.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, mountainMaterial());
    mesh.position.set(Math.sin(angle) * radius, height / 2 - 3.5, Math.cos(angle) * radius);
    mesh.rotation.y = random() * Math.PI;
    group.add(mesh);
  }

  // Low foreground ridges to give the horizon some overlap.
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2 + 0.31;
    const radius = 48 + random() * 14;
    const height = 4.5 + random() * 5.5;
    const geometry = new THREE.ConeGeometry(height * 1.9, height, 6, 2);
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const base = new THREE.Color(0x9db9c8);
    for (let v = 0; v < position.count; v += 1) {
      const normalized = (position.getY(v) + height / 2) / height;
      const c = base.clone().lerp(new THREE.Color(0xe4eff6), Math.pow(normalized, 2.2) * 0.8);
      colors[v * 3] = c.r;
      colors[v * 3 + 1] = c.g;
      colors[v * 3 + 2] = c.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, mountainMaterial());
    mesh.position.set(Math.sin(angle) * radius, height / 2 - 1.4, Math.cos(angle) * radius);
    mesh.rotation.y = random() * Math.PI;
    group.add(mesh);
  }

  return group;
}

function buildIceField(random) {
  const group = new THREE.Group();
  const clusters = [
    { angle: 1.85, radius: 15 },
    { angle: 3.75, radius: 18 },
    { angle: 5.2, radius: 12.5 },
    { angle: 5.95, radius: 24 },
  ];

  for (const cluster of clusters) {
    const centerX = Math.sin(cluster.angle) * cluster.radius;
    const centerZ = Math.cos(cluster.angle) * cluster.radius;
    const shards = 5 + Math.floor(random() * 5);

    for (let i = 0; i < shards; i += 1) {
      const geometry = new THREE.IcosahedronGeometry(1, 0);
      const width = 0.35 + random() * 0.75;
      const height = 1.4 + random() * 4.6;
      const depth = 0.35 + random() * 0.85;
      const mesh = new THREE.Mesh(geometry, materials.ice);
      mesh.scale.set(width, height, depth);
      mesh.position.set(
        centerX + (random() - 0.5) * 4.5,
        height * 0.72,
        centerZ + (random() - 0.5) * 4.5,
      );
      mesh.rotation.set(
        (random() - 0.5) * 0.34,
        random() * Math.PI,
        (random() - 0.5) * 0.26,
      );
      group.add(mesh);
    }

    // Snow drift hugging the shards.
    for (let i = 0; i < 4; i += 1) {
      const drift = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 12),
        new THREE.MeshStandardMaterial({ color: 0xe8f2f7, roughness: 0.95 }),
      );
      drift.scale.set(1.4 + random() * 2.4, 0.16 + random() * 0.22, 1.3 + random() * 2.2);
      drift.position.set(
        centerX + (random() - 0.5) * 6,
        0.02,
        centerZ + (random() - 0.5) * 6,
      );
      drift.receiveShadow = true;
      group.add(drift);
    }
  }

  return group;
}

function buildContactShadow() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 4.2),
    new THREE.MeshBasicMaterial({
      color: 0x07141d,
      map: softCircleTexture(128),
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.03, -0.1);
  return mesh;
}

function buildPawTrail() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0x7799ac,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });

  const geometry = new THREE.CircleGeometry(1, 20);
  for (let i = 0; i < 15; i += 1) {
    const z = -2.8 - i * 1.05;
    const curve = Math.sin(i * 0.28) * 0.55;
    for (const side of [-1, 1]) {
      const x = curve + side * 0.4;
      const print = new THREE.Mesh(geometry, material);
      print.position.set(x, terrainHeight(x, z) + 0.015, z);
      print.rotation.x = -Math.PI / 2;
      print.rotation.z = Math.sin(i * 0.28 + 0.4) * 0.2;
      print.scale.set(0.16, 0.3, 1);
      group.add(print);
    }
  }
  return group;
}

function buildGlints(random) {
  const count = 850;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 2.5 + Math.pow(random(), 0.7) * 48;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    positions[i * 3] = x;
    positions[i * 3 + 1] = terrainHeight(x, z) + 0.035 + random() * 0.05;
    positions[i * 3 + 2] = z;
    sizes[i] = 0.5 + random() * 1.4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xcceafb,
    size: 0.13,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    map: softCircleTexture(64),
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  return new THREE.Points(geometry, material);
}

export function createLighting(scene) {
  const hemisphere = new THREE.HemisphereLight(0x9fc9de, 0x142630, 0.58);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xffd2a0, 3.0);
  key.position.set(13, 17, 13);
  key.target.position.set(0, 2.2, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -5;
  key.shadow.camera.near = 4;
  key.shadow.camera.far = 58;
  key.shadow.bias = -0.00045;
  key.shadow.normalBias = 0.026;
  key.shadow.radius = 2.4;
  scene.add(key);
  scene.add(key.target);

  const rim = new THREE.DirectionalLight(0x9fe6de, 2.7);
  rim.position.set(-15, 10, -13);
  rim.target.position.set(0, 2.4, 0);
  scene.add(rim);
  scene.add(rim.target);

  const counter = new THREE.DirectionalLight(0x5a8ba6, 0.55);
  counter.position.set(-9, 4, 10);
  scene.add(counter);

  const ember = new THREE.PointLight(0xffa265, 9, 11, 2);
  ember.position.set(2.6, 4.2, 2.4);
  scene.add(ember);

  return {
    hemisphere,
    key,
    rim,
    ember,
    setStorm(mix) {
      key.intensity = THREE.MathUtils.lerp(3.0, 2.2, mix);
      rim.intensity = THREE.MathUtils.lerp(2.7, 2.0, mix);
      hemisphere.intensity = THREE.MathUtils.lerp(0.58, 0.48, mix);
      ember.intensity = THREE.MathUtils.lerp(9, 13, mix);
    },
  };
}

export function createEnvironment(scene) {
  const random = mulberry32(20241017);
  const group = new THREE.Group();
  scene.add(group);

  const ground = buildGround();
  group.add(ground);

  const contactShadow = buildContactShadow();
  group.add(contactShadow);

  const mountains = buildMountains(random);
  group.add(mountains);

  const ice = buildIceField(random);
  group.add(ice);

  const trail = buildPawTrail();
  group.add(trail);

  const glints = buildGlints(random);
  group.add(glints);
  glints.castShadow = false;
  glints.receiveShadow = false;

  markShadows(mountains, false, false);
  markShadows(ice, true, true);

  const lighting = createLighting(scene);

  return {
    group,
    lighting,
    heightAt: terrainHeight,
    update(time, storm) {
      glints.material.opacity = 0.38 + Math.sin(time * 1.7) * 0.08 + storm * 0.08;
      lighting.setStorm(storm);
      materials.ice.emissiveIntensity = 0.45 + Math.sin(time * 0.8) * 0.08 + storm * 0.15;
    },
  };
}
