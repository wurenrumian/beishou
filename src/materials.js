import * as THREE from 'three';

const physical = (options) => new THREE.MeshPhysicalMaterial(options);
const standard = (options) => new THREE.MeshStandardMaterial(options);

/**
 * Shared material library. Kept intentionally small and cohesive:
 * polar porcelain whites, lacquered ink, cinnabar silk, aged gold and jade.
 */
export const materials = {
  fur: physical({
    color: 0xeff4f6,
    roughness: 0.74,
    metalness: 0,
    sheen: 1,
    sheenColor: new THREE.Color(0xc3e4f4),
    sheenRoughness: 0.85,
    clearcoat: 0.16,
    clearcoatRoughness: 0.62,
    envMapIntensity: 0.72,
  }),
  furShade: physical({
    color: 0xd7e5ec,
    roughness: 0.82,
    sheen: 1,
    sheenColor: new THREE.Color(0xa9dcf2),
    sheenRoughness: 0.92,
    envMapIntensity: 0.5,
  }),
  furDark: standard({ color: 0x9db6c2, roughness: 0.92, metalness: 0 }),
  black: standard({ color: 0x0c0e11, roughness: 0.38, metalness: 0.18 }),
  glossyBlack: standard({ color: 0x07080a, roughness: 0.12, metalness: 0.25 }),
  lacquer: physical({
    color: 0x111318,
    roughness: 0.34,
    metalness: 0.22,
    clearcoat: 0.95,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.85,
  }),
  crimson: physical({
    color: 0x74121e,
    roughness: 0.64,
    metalness: 0,
    sheen: 0.75,
    sheenColor: new THREE.Color(0xb64438),
    sheenRoughness: 0.55,
    envMapIntensity: 0.42,
  }),
  crimsonDark: standard({ color: 0x460b12, roughness: 0.82, metalness: 0 }),
  gold: standard({
    color: 0xd8ac5f,
    metalness: 1,
    roughness: 0.26,
    envMapIntensity: 1.25,
  }),
  goldDim: standard({
    color: 0xa67f43,
    metalness: 0.95,
    roughness: 0.44,
    envMapIntensity: 1,
  }),
  bronze: standard({
    color: 0x9a723e,
    metalness: 0.9,
    roughness: 0.46,
    envMapIntensity: 0.9,
  }),
  jade: physical({
    color: 0x2f8a74,
    roughness: 0.24,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.1,
  }),
  skin: standard({ color: 0xd2a077, roughness: 0.64, metalness: 0 }),
  skinShade: standard({ color: 0xb98660, roughness: 0.7, metalness: 0 }),
  hair: standard({ color: 0x131418, roughness: 0.72, metalness: 0.12 }),
  leather: standard({ color: 0x2b1b15, roughness: 0.74, metalness: 0.04 }),
  ice: physical({
    color: 0xa9d9e8,
    roughness: 0.14,
    metalness: 0.06,
    transparent: true,
    opacity: 0.84,
    emissive: new THREE.Color(0x123c4d),
    emissiveIntensity: 0.55,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.4,
    flatShading: true,
    side: THREE.DoubleSide,
  }),
  snow: standard({
    color: 0xdfeef6,
    roughness: 0.92,
    metalness: 0.02,
    envMapIntensity: 0.55,
  }),
};
