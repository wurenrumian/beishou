import * as THREE from 'three';
import { clamp } from '../util/helpers.js';
import { softCircleTexture } from '../util/textures.js';

const PARTICLE_TEXTURE = softCircleTexture(64);

export class RoarBurst {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.age = 0;
    this.duration = 1.7;

    this.rings = [
      this._makeRing(0xcfefff, 0),
      this._makeRing(0xd8b56a, 0.09),
    ];

    const count = 120;
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.burst = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xe8f7ff,
        size: 0.09,
        map: PARTICLE_TEXTURE,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    this.burst.visible = false;
    scene.add(this.burst);
  }

  _makeRing(color, delay) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 96), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    this.scene.add(mesh);
    return { mesh, delay, material };
  }

  spawn(position) {
    this.active = true;
    this.age = 0;

    for (const ring of this.rings) {
      ring.mesh.visible = true;
      ring.mesh.position.set(position.x, 0.06, position.z);
      ring.mesh.scale.setScalar(1.4);
      ring.material.opacity = 0;
    }

    this.burst.visible = true;
    this.burst.material.opacity = 0.95;
    for (let i = 0; i < this.count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 4.2;
      this.positions[i * 3] = position.x + Math.cos(angle) * 0.4;
      this.positions[i * 3 + 1] = 0.25 + Math.random() * 1.5;
      this.positions[i * 3 + 2] = position.z + Math.sin(angle) * 0.4;
      this.velocities[i * 3] = Math.cos(angle) * speed;
      this.velocities[i * 3 + 1] = 1.2 + Math.random() * 4.5;
      this.velocities[i * 3 + 2] = Math.sin(angle) * speed;
    }
    this.burst.geometry.attributes.position.needsUpdate = true;
  }

  update(dt) {
    if (!this.active) return;
    this.age += dt;
    const t = this.age / this.duration;
    if (t >= 1) {
      this.active = false;
      this.burst.visible = false;
      for (const ring of this.rings) ring.mesh.visible = false;
      return;
    }

    for (const ring of this.rings) {
      const local = clamp((t - ring.delay) / (1 - ring.delay), 0, 1);
      const eased = 1 - (1 - local) ** 3;
      ring.mesh.scale.setScalar(1.4 + eased * 10.5);
      ring.material.opacity = Math.sin(local * Math.PI) * 0.5;
    }

    for (let i = 0; i < this.count; i += 1) {
      const index = i * 3;
      this.velocities[index + 1] -= 4.4 * dt;
      this.positions[index] += this.velocities[index] * dt;
      this.positions[index + 1] += this.velocities[index + 1] * dt;
      this.positions[index + 2] += this.velocities[index + 2] * dt;
      if (this.positions[index + 1] < 0.03) {
        this.positions[index + 1] = 0.03;
        this.velocities[index + 1] *= -0.24;
        this.velocities[index] *= 0.72;
        this.velocities[index + 2] *= 0.72;
      }
    }
    this.burst.geometry.attributes.position.needsUpdate = true;
    this.burst.material.opacity = 0.95 * (1 - t) ** 1.4;
  }
}
