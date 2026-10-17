import * as THREE from 'three';
import { materials } from '../materials.js';
import { ellipsoid, markShadows, ringAt, segment, vec } from '../util/helpers.js';

function buildCape() {
  const columns = 12;
  const rows = 16;
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];

  const crimson = new THREE.Color(0x6f1220);
  const crimsonDeep = new THREE.Color(0x3f0a11);
  const crimsonLight = new THREE.Color(0x8c1b27);
  const gold = new THREE.Color(0xd8b56a);

  for (let j = 0; j <= rows; j += 1) {
    const v = j / rows;
    const width = 0.48 + v * 0.34;
    for (let i = 0; i <= columns; i += 1) {
      const u = i / columns;
      const x = (u - 0.5) * 2 * width + Math.sin(v * 5 + u * 1.6) * 0.03;
      const y = 0.96 - v * 1.13;
      const z = -0.18 - v * 0.86 - Math.sin(v * Math.PI) * 0.16;
      positions.push(x, y, z);
      uvs.push(u, v);

      const edge = u < 0.045 || u > 0.955 || v > 0.955;
      const color = edge
        ? gold
        : crimson.clone().lerp(crimsonDeep, v * 0.45).lerp(crimsonLight, Math.sin(u * Math.PI) * 0.12);
      colors.push(color.r, color.g, color.b);
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
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.7,
    metalness: 0.06,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xa33a2f),
    sheenRoughness: 0.6,
    envMapIntensity: 0.45,
  });

  return { geometry, material, columns, rows };
}

export class Emperor {
  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(0, 2.73, -0.1);
    this.strands = [];
    this._build();
    markShadows(this.group, true, true);
    this.cape.castShadow = false;
  }

  _build() {
    this._buildRobe();
    this._buildTorso();
    this._buildArms();
    this._buildHead();
    this._buildCrown();
    this._buildCape();

    const broochLeft = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 12), materials.gold);
    broochLeft.position.set(-0.3, 0.93, -0.14);
    this.group.add(broochLeft);
    const broochRight = broochLeft.clone();
    broochRight.position.x = 0.3;
    this.group.add(broochRight);
  }

  _buildRobe() {
    const profile = [
      [0.4, 0.12],
      [0.47, 0.02],
      [0.58, -0.08],
      [0.72, -0.2],
      [0.84, -0.3],
      [0.87, -0.34],
    ].map(([x, y]) => new THREE.Vector2(x, y));

    const geometry = new THREE.LatheGeometry(profile, 48);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const theta = Math.atan2(z, x);
      const y = position.getY(i);
      const ripple = Math.sin(theta * 8 + 0.6) * 0.016 * (y < -0.16 ? 1 : 0.25);
      position.setY(i, y + ripple);
      const flare = 1 + Math.sin(theta * 6.5) * 0.018 * (y < -0.16 ? 1 : 0);
      position.setX(i, x * flare);
      position.setZ(i, z * flare);
    }
    geometry.computeVertexNormals();

    const material = materials.lacquer.clone();
    material.side = THREE.DoubleSide;
    const skirt = new THREE.Mesh(geometry, material);
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    this.group.add(skirt);

    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.018, 6, 72), materials.gold);
    hem.rotation.x = Math.PI / 2;
    hem.position.y = -0.32;
    this.group.add(hem);

    const innerHem = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.012, 6, 64), materials.crimsonDark);
    innerHem.rotation.x = Math.PI / 2;
    innerHem.position.y = -0.37;
    this.group.add(innerHem);
  }

  _buildTorso() {
    const torso = ellipsoid(0.34, 0.5, 0.265, materials.lacquer, 36, 28);
    torso.position.set(0, 0.57, 0);
    this.group.add(torso);

    const chest = ellipsoid(0.4, 0.24, 0.27, materials.lacquer, 36, 24);
    chest.position.set(0, 0.85, 0.01);
    this.group.add(chest);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.36, 0.09, 32), materials.gold);
    belt.position.set(0, 0.24, 0);
    belt.scale.set(1, 1, 0.79);
    this.group.add(belt);

    const beltEdge = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 0.012, 32), materials.bronze);
    beltEdge.position.set(0, 0.288, 0);
    beltEdge.scale.set(1, 1, 0.79);
    this.group.add(beltEdge);

    const buckle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.028, 24), materials.jade);
    buckle.rotation.x = Math.PI / 2;
    buckle.position.set(0, 0.24, 0.285);
    this.group.add(buckle);

    const buckleRim = new THREE.Mesh(new THREE.TorusGeometry(0.079, 0.012, 6, 28), materials.gold);
    buckleRim.position.set(0, 0.24, 0.296);
    this.group.add(buckleRim);

    // Crossed lapel.
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.66, 0.018), materials.crimsonDark);
    lapel.position.set(0.01, 0.63, 0.248);
    lapel.rotation.z = 0.6;
    this.group.add(lapel);

    const lapelEdge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.68, 0.022), materials.gold);
    lapelEdge.position.set(0.058, 0.63, 0.262);
    lapelEdge.rotation.z = 0.6;
    this.group.add(lapelEdge);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.026, 6, 32), materials.goldDim);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 1.08, 0);
    this.group.add(collar);

    const innerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 32), materials.fur);
    innerCollar.rotation.x = Math.PI / 2;
    innerCollar.position.set(0, 1.13, 0);
    this.group.add(innerCollar);

    // Belt tassels.
    for (const x of [-0.06, 0, 0.06]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 5), materials.crimson);
      cord.position.set(x, 0.14, 0.285);
      this.group.add(cord);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), materials.gold);
      bead.position.set(x, 0.025, 0.285);
      this.group.add(bead);
    }
  }

  _buildArms() {
    const shoulders = [
      { side: -1, shoulder: [-0.36, 0.9, 0.0], elbow: [-0.48, 0.67, 0.2], wrist: [-0.3, 0.62, 0.6] },
      { side: 1, shoulder: [0.36, 0.9, 0.0], elbow: [0.48, 0.67, 0.2], wrist: [0.3, 0.62, 0.6] },
    ];

    for (const arm of shoulders) {
      const shoulder = vec(arm.shoulder);
      const elbow = vec(arm.elbow);
      const wrist = vec(arm.wrist);

      const upperSleeve = segment(shoulder, elbow, 0.155, 0.2, materials.lacquer, 18);
      this.group.add(upperSleeve);

      const lowerSleeve = segment(elbow, wrist, 0.2, 0.255, materials.lacquer, 20);
      this.group.add(lowerSleeve);

      const shoulderCap = ellipsoid(0.19, 0.17, 0.19, materials.lacquer, 24, 18);
      shoulderCap.position.copy(shoulder);
      this.group.add(shoulderCap);

      const direction = wrist.clone().sub(elbow).normalize();
      const lining = ringAt(wrist.clone().addScaledVector(direction, -0.03), direction, 0.198, 0.014, materials.crimson);
      this.group.add(lining);

      const hand = ellipsoid(0.07, 0.068, 0.09, materials.skin, 20, 14);
      hand.position.copy(wrist).addScaledVector(direction, 0.07);
      this.group.add(hand);

      const thumb = ellipsoid(0.03, 0.05, 0.035, materials.skin, 14, 10);
      thumb.position.copy(hand.position).add(new THREE.Vector3(0.02 * arm.side, 0.018, 0.02));
      thumb.rotation.z = arm.side * 0.4;
      this.group.add(thumb);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 5, 18), materials.gold);
      ring.position.copy(hand.position).addScaledVector(direction, -0.02);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      this.group.add(ring);
    }
  }

  _buildHead() {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 18), materials.skin);
    neck.position.set(0, 1.18, 0);
    this.group.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 1.42, 0.01);
    this.group.add(head);
    this.head = head;

    const skull = ellipsoid(0.235, 0.27, 0.24, materials.skin, 36, 28);
    head.add(skull);

    const hair = ellipsoid(0.248, 0.26, 0.225, materials.hair, 32, 24);
    hair.position.set(0, 0.045, -0.07);
    head.add(hair);

    const bun = ellipsoid(0.14, 0.12, 0.12, materials.hair, 22, 16);
    bun.position.set(0, 0.27, -0.12);
    head.add(bun);

    for (const side of [-1, 1]) {
      const sideburn = ellipsoid(0.055, 0.11, 0.06, materials.hair, 16, 12);
      sideburn.position.set(0.21 * side, -0.02, 0.06);
      head.add(sideburn);

      const ear = ellipsoid(0.032, 0.065, 0.042, materials.skin, 14, 10);
      ear.position.set(0.235 * side, 0.0, 0.01);
      head.add(ear);

      const eye = ellipsoid(0.042, 0.019, 0.015, materials.glossyBlack, 12, 8);
      eye.position.set(0.083 * side, 0.025, 0.222);
      eye.rotation.z = side * -0.12;
      head.add(eye);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.024, 0.02), materials.hair);
      brow.position.set(0.088 * side, 0.102, 0.218);
      brow.rotation.z = side * 0.28;
      head.add(brow);
    }

    const nose = ellipsoid(0.036, 0.062, 0.045, materials.skinShade, 16, 12);
    nose.position.set(0, -0.012, 0.248);
    head.add(nose);

    const nostrilLeft = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), materials.hair);
    nostrilLeft.position.set(-0.014, -0.045, 0.278);
    head.add(nostrilLeft);
    const nostrilRight = nostrilLeft.clone();
    nostrilRight.position.x = 0.014;
    head.add(nostrilRight);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.01, 0.012), materials.crimsonDark);
    mouth.position.set(0, -0.112, 0.24);
    head.add(mouth);

    for (const side of [-1, 1]) {
      const moustache = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.018, 0.012), materials.hair);
      moustache.position.set(0.05 * side, -0.078, 0.245);
      moustache.rotation.z = side * 0.55;
      head.add(moustache);
    }

    const beard = ellipsoid(0.145, 0.19, 0.075, materials.hair, 24, 18);
    beard.position.set(0, -0.235, 0.165);
    head.add(beard);

    const goatee = ellipsoid(0.075, 0.155, 0.06, materials.hair, 20, 14);
    goatee.position.set(0, -0.345, 0.185);
    head.add(goatee);

    const jawline = ellipsoid(0.17, 0.11, 0.08, materials.hair, 20, 14);
    jawline.position.set(0, -0.15, 0.13);
    head.add(jawline);
  }

  _buildCrown() {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.215, 0.14, 24), materials.lacquer);
    cap.position.set(0, 0.31, -0.02);
    this.head.add(cap);

    const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.218, 0.218, 0.022, 24), materials.gold);
    capBand.position.set(0, 0.255, -0.02);
    this.head.add(capBand);

    const crown = new THREE.Group();
    crown.position.set(0, 0.39, 0.0);
    crown.rotation.x = -0.13;
    this.head.add(crown);

    const boardBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.026, 0.48), materials.gold);
    boardBase.position.y = 0.006;
    crown.add(boardBase);

    const board = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.048, 0.43), materials.lacquer);
    board.position.y = 0.036;
    crown.add(board);

    const boardTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.012, 0.4), materials.crimsonDark);
    boardTop.position.y = 0.064;
    crown.add(boardTop);

    for (const z of [-0.215, 0.215]) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.012, 0.012), materials.gold);
      trim.position.set(0, 0.036, z);
      crown.add(trim);
    }

    const frontOrnament = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.02), materials.jade);
    frontOrnament.position.set(0, 0.016, 0.245);
    crown.add(frontOrnament);

    // 冕旒: ten strands of jade, gold and cinnabar beads.
    const beadMaterials = [materials.jade, materials.gold, materials.crimsonDark];
    for (const front of [true, false]) {
      for (let index = 0; index < 5; index += 1) {
        const strand = new THREE.Group();
        strand.position.set((index - 2) * 0.155, 0.385, front ? 0.215 : -0.215);
        this.head.add(strand);

        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), materials.hair);
        cord.position.y = -0.15;
        strand.add(cord);

        for (let bead = 0; bead < 3; bead += 1) {
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.023 - bead * 0.002, 10, 8),
            beadMaterials[bead],
          );
          mesh.position.y = -0.06 - bead * 0.085;
          strand.add(mesh);
        }

        this.strands.push({ group: strand, phase: index * 0.62 + (front ? 0 : 1.4) });
      }
    }
  }

  _buildCape() {
    const { geometry, material } = buildCape();
    const cape = new THREE.Mesh(geometry, material);
    cape.castShadow = false;
    this.group.add(cape);
    this.cape = cape;
    this.capeBase = geometry.attributes.position.array.slice();
    this.capeUv = geometry.attributes.uv.array;
  }

  update(time, storm = 0) {
    this.group.rotation.z = Math.sin(time * 1.1) * 0.009;
    this.group.rotation.x = Math.sin(time * 1.1 + 1.2) * 0.005;
    this.group.position.y = 2.73 + Math.sin(time * 1.35) * 0.007;
    this.head.rotation.y = Math.sin(time * 0.5) * 0.045;
    this.head.rotation.z = Math.sin(time * 0.75 + 0.4) * 0.012;

    for (const strand of this.strands) {
      strand.group.rotation.x = Math.sin(time * 2.2 + strand.phase) * 0.055 - 0.02;
      strand.group.rotation.z = Math.sin(time * 1.7 + strand.phase * 1.3) * 0.045;
    }

    const position = this.cape.geometry.attributes.position;
    const array = position.array;
    const base = this.capeBase;
    const uv = this.capeUv;
    const strength = 1 + storm * 2.2;
    for (let i = 0; i < array.length; i += 3) {
      const vertex = i / 3;
      const u = uv[vertex * 2];
      const v = uv[vertex * 2 + 1];
      const flutter = Math.sin(u * 7.5 + time * 2.4 + v * 5.2) * (0.012 + v * 0.045) * strength;
      const billow = Math.sin(v * 4.2 - time * 1.7) * v * 0.02 * strength;
      array[i + 2] = base[i + 2] + flutter + billow;
      array[i] = base[i] + Math.sin(v * 3.5 + time * 1.2) * v * 0.012;
    }
    position.needsUpdate = true;
    this.cape.geometry.computeVertexNormals();
  }
}
