import * as THREE from 'three';
import { materials } from '../materials.js';
import {
  clamp,
  ellipsoid,
  gridGeometry,
  markShadows,
  segment,
  tube,
} from '../util/helpers.js';
import { flagTexture, medallionTexture } from '../util/textures.js';

const FUR = materials.fur;
const FUR_SHADE = materials.furShade;

function drapeGeometry(radius, centerY, zFront, zBack, arc, lift = 0) {
  return gridGeometry(24, 12, (u, v) => {
    const z = zFront + (zBack - zFront) * u;
    const angle = (v - 0.5) * arc;
    const sag = Math.sin(u * Math.PI) * 0.018;
    return [
      Math.sin(angle) * radius,
      centerY + Math.cos(angle) * radius * 0.94 - sag + lift,
      z,
    ];
  });
}

function drapeEdgePoints(radius, centerY, zFront, zBack, arc, side) {
  const points = [];
  const steps = 28;
  if (side === 'front' || side === 'back') {
    for (let i = 0; i <= steps; i += 1) {
      const angle = -arc / 2 + (i / steps) * arc;
      points.push(new THREE.Vector3(
        Math.sin(angle) * radius,
        centerY + Math.cos(angle) * radius * 0.94 + 0.004,
        side === 'front' ? zFront : zBack,
      ));
    }
  } else {
    const angle = side === 'left' ? -arc / 2 : arc / 2;
    for (let i = 0; i <= steps; i += 1) {
      const u = i / steps;
      const z = zFront + (zBack - zFront) * u;
      points.push(new THREE.Vector3(
        Math.sin(angle) * radius,
        centerY + Math.cos(angle) * radius * 0.94 - Math.sin(u * Math.PI) * 0.018 + 0.004,
        z,
      ));
    }
  }
  return points;
}

export class PolarBear {
  constructor() {
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.body.position.y = 0;
    this.group.add(this.body);

    this.legs = [];
    this.phase = 0;
    this.roarTime = 0;
    this.roarDuration = 1.35;

    this._buildBody();
    this._buildHead();
    this._buildLegs();
    this._buildCaparison();
    this._buildBanner();
    this._buildReins();

    this.noseAnchor = new THREE.Object3D();
    this.noseAnchor.position.set(0, -0.04, 0.84);
    this.head.add(this.noseAnchor);

    markShadows(this.group, true, true);
    this.flag.castShadow = false;
    this.flag.receiveShadow = false;
  }

  _buildBody() {
    const torso = ellipsoid(1.05, 1.12, 1.72, FUR, 48, 32);
    torso.position.set(0, 1.48, 0);
    this.body.add(torso);
    this.torso = torso;
    this.torsoBaseScale = new THREE.Vector3(1.05, 1.12, 1.72);

    const hump = ellipsoid(0.86, 0.64, 0.92, FUR, 40, 26);
    hump.position.set(0, 1.86, 0.78);
    this.body.add(hump);

    const rump = ellipsoid(0.98, 0.94, 0.86, FUR, 40, 26);
    rump.position.set(0, 1.5, -1.12);
    this.body.add(rump);

    const chest = ellipsoid(0.8, 0.76, 0.66, FUR);
    chest.position.set(0, 1.42, 1.15);
    this.body.add(chest);

    const neck = segment([0, 1.8, 1.15], [0, 2.36, 2.02], 0.64, 0.47, FUR, 32);
    this.body.add(neck);

    // Thick ruff where the neck meets the shoulders.
    const ruff = [
      [-0.33, 2.08, 1.42, 0.3, 0.32, 0.34],
      [0.33, 2.08, 1.42, 0.3, 0.32, 0.34],
      [0, 1.86, 1.58, 0.5, 0.42, 0.36],
      [-0.5, 1.9, 1.35, 0.3, 0.3, 0.4],
      [0.5, 1.9, 1.35, 0.3, 0.3, 0.4],
    ];
    for (const [x, y, z, rx, ry, rz] of ruff) {
      const tuft = ellipsoid(rx, ry, rz, FUR, 24, 16);
      tuft.position.set(x, y, z);
      this.body.add(tuft);
    }

    const tail = ellipsoid(0.14, 0.13, 0.2, FUR_SHADE, 18, 12);
    tail.position.set(0, 1.72, -1.92);
    tail.rotation.x = 0.4;
    this.body.add(tail);
  }

  _buildHead() {
    const head = new THREE.Group();
    head.position.set(0, 2.42, 2.18);
    this.body.add(head);
    this.head = head;

    const skull = ellipsoid(0.46, 0.43, 0.5, FUR, 40, 28);
    head.add(skull);

    const cheekLeft = ellipsoid(0.2, 0.17, 0.22, FUR);
    cheekLeft.position.set(-0.26, -0.02, 0.24);
    head.add(cheekLeft);
    const cheekRight = cheekLeft.clone();
    cheekRight.position.x = 0.26;
    head.add(cheekRight);

    const muzzle = ellipsoid(0.3, 0.23, 0.38, FUR_SHADE, 32, 22);
    muzzle.position.set(0, -0.1, 0.42);
    head.add(muzzle);

    const bridge = ellipsoid(0.17, 0.13, 0.29, FUR);
    bridge.position.set(0, -0.005, 0.44);
    head.add(bridge);

    const nose = ellipsoid(0.135, 0.095, 0.1, materials.glossyBlack, 24, 16);
    nose.position.set(0, -0.06, 0.78);
    head.add(nose);

    const mouth = tube(
      [[-0.17, -0.23, 0.6], [0, -0.26, 0.68], [0.17, -0.23, 0.6]],
      0.011,
      materials.glossyBlack,
      24,
      5,
    );
    head.add(mouth);

    // Mouth cavity reveals itself when the jaw drops.
    const cavity = ellipsoid(0.19, 0.09, 0.22, materials.crimsonDark, 20, 12);
    cavity.position.set(0, -0.11, 0.46);
    head.add(cavity);

    const jaw = new THREE.Group();
    jaw.position.set(0, -0.17, 0.26);
    head.add(jaw);
    this.jaw = jaw;

    const jawMesh = ellipsoid(0.255, 0.085, 0.34, FUR_SHADE, 28, 16);
    jawMesh.position.set(0, -0.02, 0.13);
    jaw.add(jawMesh);

    for (const x of [-0.14, -0.05, 0.05, 0.14]) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.065, 6), materials.fur);
      tooth.position.set(x, 0.055, 0.34);
      tooth.rotation.x = Math.PI;
      jaw.add(tooth);
    }

    for (const side of [-1, 1]) {
      const eye = ellipsoid(0.055, 0.052, 0.035, materials.glossyBlack, 18, 12);
      eye.position.set(0.235 * side, 0.075, 0.415);
      head.add(eye);

      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xe8f6ff }),
      );
      glint.position.set(0.235 * side + 0.014, 0.094, 0.445);
      head.add(glint);

      const brow = ellipsoid(0.155, 0.062, 0.09, FUR, 20, 12);
      brow.position.set(0.21 * side, 0.175, 0.36);
      brow.rotation.z = side * 0.16;
      head.add(brow);

      const ear = new THREE.Group();
      ear.position.set(0.34 * side, 0.325, -0.03);
      head.add(ear);

      const earOuter = ellipsoid(0.14, 0.145, 0.08, FUR, 22, 16);
      ear.add(earOuter);

      const earInner = ellipsoid(0.075, 0.08, 0.035, materials.furDark, 18, 12);
      earInner.position.set(0, 0.005, 0.055);
      ear.add(earInner);
    }
  }

  _buildLegs() {
    const specs = [
      { x: -0.64, z: 1.04, offset: 0, front: true },
      { x: 0.64, z: 1.04, offset: Math.PI, front: true },
      { x: -0.7, z: -1.05, offset: Math.PI, front: false },
      { x: 0.7, z: -1.05, offset: 0, front: false },
    ];

    for (const spec of specs) {
      const hip = new THREE.Group();
      hip.position.set(spec.x, 1.18, spec.z);
      this.body.add(hip);

      const haunch = ellipsoid(
        spec.front ? 0.31 : 0.34,
        spec.front ? 0.36 : 0.4,
        spec.front ? 0.33 : 0.36,
        FUR,
      );
      haunch.position.y = 0.02;
      hip.add(haunch);

      const upper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.225, 0.4, 6, 18),
        FUR,
      );
      upper.position.y = -0.28;
      hip.add(upper);

      const knee = new THREE.Group();
      knee.position.y = -0.51;
      hip.add(knee);

      const kneeFur = ellipsoid(0.215, 0.2, 0.215, FUR, 22, 16);
      knee.add(kneeFur);

      const lower = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.165, 0.36, 6, 18),
        FUR,
      );
      lower.position.y = -0.27;
      knee.add(lower);

      const ankle = new THREE.Group();
      ankle.position.y = -0.5;
      knee.add(ankle);

      const cuff = ellipsoid(0.23, 0.11, 0.24, FUR, 22, 14);
      cuff.position.y = 0.015;
      ankle.add(cuff);

      const paw = ellipsoid(0.29, 0.14, 0.4, FUR, 28, 18);
      paw.position.set(0, -0.035, 0.09);
      ankle.add(paw);

      for (let toe = -1; toe <= 1; toe += 1) {
        const toeMesh = ellipsoid(0.075, 0.055, 0.1, FUR_SHADE, 16, 10);
        toeMesh.position.set(toe * 0.15, -0.055, 0.39);
        ankle.add(toeMesh);

        const claw = new THREE.Mesh(
          new THREE.ConeGeometry(0.017, 0.062, 5),
          materials.black,
        );
        claw.position.set(toe * 0.15, -0.07, 0.48);
        claw.rotation.x = 1.25;
        ankle.add(claw);
      }

      this.legs.push({
        hip,
        knee,
        ankle,
        offset: spec.offset,
        base: spec.front ? 0.02 : -0.02,
      });
    }
  }

  _buildCaparison() {
    const under = new THREE.Mesh(
      drapeGeometry(1.315, 1.38, 1.06, -1.24, 2.16, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x1b1512, roughness: 0.86, side: THREE.DoubleSide }),
    );
    this.body.add(under);

    const cloth = new THREE.Mesh(
      drapeGeometry(1.27, 1.4, 1.0, -1.18, 2.08, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0x74121e,
        roughness: 0.68,
        metalness: 0,
        side: THREE.DoubleSide,
        envMapIntensity: 0.45,
      }),
    );
    cloth.castShadow = true;
    cloth.receiveShadow = true;
    this.body.add(cloth);

    for (const side of ['front', 'back', 'left', 'right']) {
      const edge = drapeEdgePoints(side === 'front' || side === 'back' ? 1.27 : 1.27, 1.4, 1.0, -1.18, 2.08, side);
      this.body.add(tube(edge, 0.019, materials.gold, 64, 6));
    }

    // Girth straps under the caparison.
    for (const z of [0.36, -0.78]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.028, 8, 64), materials.leather);
      strap.position.set(0, 1.5, z);
      strap.scale.set(1, 1.05, 0.9);
      this.body.add(strap);

      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), materials.gold);
      buckle.position.set(1.07, 1.5, z);
      this.body.add(buckle);
    }

    // Chest medallion.
    const medallion = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 48),
      new THREE.MeshStandardMaterial({
        map: medallionTexture(),
        transparent: true,
        roughness: 0.5,
        metalness: 0.35,
        envMapIntensity: 1,
      }),
    );
    medallion.position.set(0, 1.55, 1.71);
    this.body.add(medallion);

    const medallionRim = new THREE.Mesh(new THREE.TorusGeometry(0.163, 0.014, 8, 56), materials.gold);
    medallionRim.position.set(0, 1.55, 1.716);
    this.body.add(medallionRim);

    // Saddle.
    const saddleBase = ellipsoid(0.47, 0.06, 0.55, materials.goldDim, 28, 14);
    saddleBase.position.set(0, 2.61, -0.38);
    this.body.add(saddleBase);

    const pad = ellipsoid(0.42, 0.09, 0.48, materials.leather, 28, 16);
    pad.position.set(0, 2.66, -0.38);
    this.body.add(pad);

    const cantle = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.07), materials.leather);
    cantle.position.set(0, 2.76, -0.86);
    cantle.rotation.x = -0.18;
    this.body.add(cantle);

    const cantleTrim = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.025, 0.09), materials.gold);
    cantleTrim.position.set(0, 2.86, -0.88);
    cantleTrim.rotation.x = -0.18;
    this.body.add(cantleTrim);

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), materials.gold);
    pommel.position.set(0, 2.72, 0.08);
    this.body.add(pommel);
  }

  _buildBanner() {
    const banner = new THREE.Group();
    banner.position.set(1.1, 2.5, -1.48);
    banner.rotation.x = -0.12;
    banner.rotation.z = -0.1;
    this.body.add(banner);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 1.86, 10), materials.bronze);
    pole.position.y = 0.93;
    banner.add(pole);

    for (const y of [0.3, 1.05, 1.66]) {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 12), materials.gold);
      collar.position.y = y;
      banner.add(collar);
    }

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), materials.gold);
    finial.position.y = 1.9;
    banner.add(finial);

    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.3, 8), materials.crimson);
    tassel.position.set(0.02, 1.68, -0.06);
    tassel.rotation.z = 0.04;
    banner.add(tassel);

    const flagGeometry = gridGeometry(20, 14, (u, v) => {
      const x = 0.07 + u * 0.9;
      const y = 1.68 - v * 1.12;
      const z = Math.sin(u * 5.2) * 0.028 * u;
      return [x, y, z];
    });

    const flag = new THREE.Mesh(
      flagGeometry,
      new THREE.MeshStandardMaterial({
        map: flagTexture(),
        side: THREE.DoubleSide,
        roughness: 0.82,
        metalness: 0.02,
        envMapIntensity: 0.5,
      }),
    );
    flag.castShadow = true;
    banner.add(flag);

    this.banner = banner;
    this.flag = flag;
    this.flagBase = flagGeometry.attributes.position.array.slice();
    this.flagUv = flagGeometry.attributes.uv.array;
  }

  _buildReins() {
    for (const side of [-1, 1]) {
      const hand = [0.3 * side, 3.34, 0.5];
      const points = [
        hand,
        [0.64 * side, 3.03, 1.18],
        [0.52 * side, 2.7, 1.92],
        [0.37 * side, 2.5, 2.28],
      ];
      this.body.add(tube(points, 0.017, materials.leather, 48, 6));

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 20), materials.goldDim);
      ring.position.set(0.372 * side, 2.5, 2.29);
      ring.rotation.y = Math.PI / 2;
      this.body.add(ring);

      const cheek = segment(
        [0.37 * side, 2.5, 2.3],
        [0.38 * side, 2.6, 2.06],
        0.013,
        0.013,
        materials.leather,
        6,
      );
      this.body.add(cheek);
    }
  }

  /** World-space position of the nose, used for breath and snow bursts. */
  getNoseWorld(target = new THREE.Vector3()) {
    this.noseAnchor.getWorldPosition(target);
    return target;
  }

  roar() {
    if (this.roarTime > 0.25) return false;
    this.roarTime = this.roarDuration;
    return true;
  }

  update(dt, time, storm = 0) {
    this.phase += dt * (1.5 + storm * 0.35);
    const phase = this.phase;

    this.body.position.y = Math.sin(phase * 2) * 0.035;
    this.body.rotation.z = Math.sin(phase) * 0.012;
    this.body.rotation.x = Math.sin(phase * 2 + 0.7) * 0.008;

    const breathe = Math.sin(time * 1.25) * 0.008;
    this.torso.scale.set(
      this.torsoBaseScale.x * (1 + breathe),
      this.torsoBaseScale.y * (1 + breathe * 0.7),
      this.torsoBaseScale.z,
    );

    for (const leg of this.legs) {
      const swing = Math.sin(phase + leg.offset);
      leg.hip.rotation.x = leg.base + swing * 0.44;
      leg.knee.rotation.x = Math.max(0, -swing) * 0.52 + 0.04;
      leg.ankle.rotation.x = -Math.max(0, swing) * 0.24;
    }

    const roarProgress = this.roarTime > 0 ? 1 - this.roarTime / this.roarDuration : 0;
    const roar = this.roarTime > 0 ? Math.sin(clamp(roarProgress, 0, 1) * Math.PI) : 0;

    this.head.rotation.x = -0.045 + Math.sin(time * 0.7) * 0.022 - roar * 0.34;
    this.head.rotation.y = Math.sin(time * 0.33) * 0.055;
    this.head.rotation.z = Math.sin(time * 0.42) * 0.015;
    this.jaw.rotation.x = roar * 0.5;
    if (this.roarTime > 0) {
      this.roarTime = Math.max(0, this.roarTime - dt);
    }

    // Banner ripple.
    const position = this.flag.geometry.attributes.position;
    const array = position.array;
    const base = this.flagBase;
    const uv = this.flagUv;
    const strength = 1 + storm * 1.4;
    for (let i = 0; i < array.length; i += 3) {
      const u = uv[(i / 3) * 2];
      const v = uv[(i / 3) * 2 + 1];
      const wave = Math.sin(u * 7.5 - time * 4.6 + v * 2.2) * 0.042 * u * strength;
      const ripple = Math.sin(v * 6.2 + time * 3.1) * 0.016 * u;
      array[i] = base[i] + Math.cos(u * 6.5 + time * 3.2) * 0.014 * u;
      array[i + 2] = base[i + 2] + wave + ripple;
    }
    position.needsUpdate = true;
    this.flag.geometry.computeVertexNormals();

    this.banner.rotation.z = -0.035 + Math.sin(time * 1.1) * 0.012 + storm * 0.03;
  }
}
