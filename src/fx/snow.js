import * as THREE from 'three';
import { softCircleTexture } from '../util/textures.js';

const FLAKE_TEXTURE = softCircleTexture(96);

export class Snowfall {
  constructor(scene, { quality = 1 } = {}) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.layers = [];
    this.storm = 0;

    this._addLayer({
      count: Math.round(1050 * quality),
      size: 0.2,
      opacity: 0.78,
      speedMin: 1.1,
      speedMax: 3.1,
      box: [52, 34, 52],
      color: 0xf1fbff,
    });

    this._addLayer({
      count: Math.round(2800 * quality),
      size: 0.085,
      opacity: 0.5,
      speedMin: 0.5,
      speedMax: 1.7,
      box: [76, 40, 76],
      color: 0xd6edfa,
    });

    this._addLayer({
      count: Math.round(420 * quality),
      size: 0.28,
      opacity: 0,
      stormGain: 0.42,
      speedMin: 2.4,
      speedMax: 4.6,
      box: [34, 22, 34],
      color: 0xf4fbff,
    });
  }

  _addLayer({ count, size, opacity, stormGain = 0, speedMin, speedMax, box, color }) {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const [width, height, depth] = box;

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * width;
      positions[i * 3 + 1] = Math.random() * height;
      positions[i * 3 + 2] = (Math.random() - 0.5) * depth;
      speeds[i] = speedMin + Math.random() * (speedMax - speedMin);
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size,
      map: FLAKE_TEXTURE,
      transparent: true,
      opacity,
      depthWrite: false,
      sizeAttenuation: true,
      fog: false,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.root.add(points);

    this.layers.push({
      points,
      material,
      positions,
      speeds,
      phases,
      count,
      width,
      height,
      depth,
      baseSize: size,
      baseOpacity: opacity,
      stormGain,
    });
  }

  update(dt, time) {
    const storm = this.storm;
    const speedScale = 1 + storm * 1.9;
    const windX = 0.35 + storm * 11;
    const windZ = 0.14 + storm * 2.6;

    for (const layer of this.layers) {
      const { positions, speeds, phases, count, width, height, depth } = layer;
      layer.material.opacity = (layer.baseOpacity + layer.stormGain * storm) * (1 - storm * 0.06);
      layer.material.size = layer.baseSize * (1 + storm * 0.5);

      for (let i = 0; i < count; i += 1) {
        const index = i * 3;
        positions[index] += (windX + Math.sin(time * 0.6 + phases[i]) * 0.5 * (1 + storm)) * dt;
        positions[index + 1] -= speeds[i] * speedScale * dt;
        positions[index + 2] += (windZ + Math.cos(time * 0.5 + phases[i]) * 0.3 * (1 + storm)) * dt;

        if (positions[index + 1] < -0.2) {
          positions[index + 1] = height;
          positions[index] = (Math.random() - 0.5) * width;
          positions[index + 2] = (Math.random() - 0.5) * depth;
        }
        if (positions[index] > width / 2) positions[index] -= width;
        if (positions[index + 2] > depth / 2) positions[index + 2] -= depth;
      }

      layer.points.geometry.attributes.position.needsUpdate = true;
    }
  }

  setStorm(value) {
    this.storm = value;
  }
}

export class Breath {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.sprites = [];
    this.timer = 0;

    const material = new THREE.SpriteMaterial({
      map: softCircleTexture(96),
      color: 0xd7ecf7,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    for (let i = 0; i < 8; i += 1) {
      const sprite = new THREE.Sprite(material.clone());
      sprite.visible = false;
      this.group.add(sprite);
      this.sprites.push({ sprite, age: 0, life: 0 });
    }
    this.index = 0;
  }

  update(dt, anchor, direction) {
    this.timer += dt;
    if (this.timer > 2.6) {
      this.timer = 0;
      this._emit(anchor, direction);
    }

    for (const puff of this.sprites) {
      if (!puff.sprite.visible) continue;
      puff.age += dt;
      const t = puff.age / puff.life;
      if (t >= 1) {
        puff.sprite.visible = false;
        continue;
      }
      puff.sprite.position.addScaledVector(puff.velocity, dt);
      puff.velocity.y += dt * 0.16;
      puff.sprite.scale.setScalar(0.16 + t * 0.72);
      puff.sprite.material.opacity = Math.sin(Math.min(1, t * 3.2) * Math.PI * 0.5) * (1 - t) * 0.34;
    }
  }

  burst(anchor, direction) {
    for (let i = 0; i < 4; i += 1) {
      this._emit(anchor, direction, true);
    }
  }

  _emit(anchor, direction, burst = false) {
    const puff = this.sprites[this.index];
    this.index = (this.index + 1) % this.sprites.length;
    puff.sprite.visible = true;
    puff.sprite.position.copy(anchor);
    puff.sprite.position.x += (Math.random() - 0.5) * 0.12;
    puff.sprite.position.y += (Math.random() - 0.5) * 0.08;
    puff.sprite.position.z += (Math.random() - 0.5) * 0.12;
    puff.sprite.scale.setScalar(0.14);
    puff.sprite.material.opacity = 0.25;
    puff.age = 0;
    puff.life = 2.0 + Math.random() * 0.8;
    puff.velocity = direction.clone()
      .multiplyScalar((burst ? 1.6 : 0.55) + Math.random() * 0.25)
      .add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.22 + Math.random() * 0.15, 0));
  }
}
