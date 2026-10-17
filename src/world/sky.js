import * as THREE from 'three';
import { mulberry32 } from '../util/helpers.js';
import { glowTexture, softCircleTexture } from '../util/textures.js';

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uGlowDirection;
  varying vec3 vDirection;

  void main() {
    vec3 direction = normalize(vDirection);
    float height = clamp(direction.y, -0.15, 1.0);

    vec3 color = mix(uHorizon, uMid, smoothstep(0.0, 0.2, height));
    color = mix(color, uZenith, smoothstep(0.14, 0.72, height));

    float glow = pow(max(dot(direction, normalize(uGlowDirection)), 0.0), 9.0);
    color += uGlow * glow * 0.28;

    float haze = 1.0 - smoothstep(0.0, 0.1, height);
    color += vec3(0.02, 0.05, 0.065) * haze;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const AURORA_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const AURORA_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColorLow;
  uniform vec3 uColorHigh;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    float x = vUv.x;
    float y = vUv.y;
    float drift = uTime * 0.028;

    float curtain = fbm(vec2(x * 3.4 + drift, y * 1.7 - uTime * 0.018));
    float fine = fbm(vec2(x * 12.0 - drift * 2.0, y * 3.4 + uTime * 0.026));
    float band = smoothstep(0.28, 0.7, curtain) * (0.6 + 0.4 * fine);

    float rays = 0.68 + 0.32 * sin(x * 92.0 + fine * 9.0 + uTime * 0.55);
    rays = pow(clamp(rays, 0.0, 1.0), 1.7);

    float edge = smoothstep(0.0, 0.16, x) * smoothstep(1.0, 0.84, x);
    float fade = smoothstep(0.0, 0.34, y) * (1.0 - smoothstep(0.6, 1.0, y));

    float alpha = (band * 0.95 + fine * 0.22) * rays * edge * fade * uOpacity;
    vec3 color = mix(uColorLow, uColorHigh, smoothstep(0.08, 0.92, y + curtain * 0.2));
    color += vec3(0.1, 0.28, 0.22) * fine;
    color *= 1.35;

    gl_FragColor = vec4(color, alpha);
  }
`;

function createSkyDome() {
  const uniforms = {
    uZenith: { value: new THREE.Color(0x03070f) },
    uMid: { value: new THREE.Color(0x0a2231) },
    uHorizon: { value: new THREE.Color(0x3b6d7e) },
    uGlow: { value: new THREE.Color(0xc98a58) },
    uGlowDirection: { value: new THREE.Vector3(-0.64, 0.28, 0.72) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(230, 48, 28), material);
  dome.frustumCulled = false;
  return dome;
}

function createStars(random) {
  const group = new THREE.Group();
  const layers = [
    { count: 1500, size: 0.85, opacity: 0.7, color: 0xcfe6f5 },
    { count: 150, size: 2.0, opacity: 0.85, color: 0xffffff },
  ];

  for (const layer of layers) {
    const positions = new Float32Array(layer.count * 3);
    for (let i = 0; i < layer.count; i += 1) {
      const theta = random() * Math.PI * 2;
      const y = 0.03 + Math.pow(random(), 0.7) * 0.97;
      const radius = Math.sqrt(1 - y * y);
      positions[i * 3] = Math.cos(theta) * radius * 205;
      positions[i * 3 + 1] = y * 205;
      positions[i * 3 + 2] = Math.sin(theta) * radius * 205;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: layer.color,
      size: layer.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: layer.opacity,
      map: softCircleTexture(64),
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    group.add(new THREE.Points(geometry, material));
  }

  return group;
}

function createMoon() {
  const group = new THREE.Group();
  group.position.set(-150, 55, -95);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(6.4, 72),
    new THREE.MeshBasicMaterial({ color: 0xfff4da, fog: false }),
  );
  group.add(disc);

  const craterMaterial = new THREE.MeshBasicMaterial({
    color: 0xd9cdb1,
    transparent: true,
    opacity: 0.32,
    fog: false,
  });
  const craters = [
    [-1.6, 1.1, 0.95],
    [1.2, -1.8, 1.3],
    [0.4, 2.2, 0.55],
    [-2.2, -1.4, 0.7],
    [2.4, 1.6, 0.45],
  ];
  for (const [x, y, radius] of craters) {
    const crater = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), craterMaterial);
    crater.position.set(x, y, 0.05);
    group.add(crater);
  }

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(256),
    color: 0xbfe6ff,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  }));
  halo.scale.set(30, 30, 1);
  halo.position.z = -0.4;
  group.add(halo);

  group.lookAt(0, 2.5, 0);
  return { group, halo, disc };
}

function createAurora(random) {
  const group = new THREE.Group();
  const curtains = [];
  const specs = [
    { angle: Math.PI, width: 155, height: 28, y: 24, radius: 96, opacity: 0.95 },
    { angle: Math.PI * 0.62, width: 120, height: 24, y: 30, radius: 104, opacity: 0.62 },
    { angle: Math.PI * 1.42, width: 135, height: 26, y: 26, radius: 100, opacity: 0.7 },
    { angle: -0.35, width: 110, height: 22, y: 32, radius: 108, opacity: 0.4 },
  ];

  for (const spec of specs) {
    const uniforms = {
      uTime: { value: random() * 10 },
      uOpacity: { value: spec.opacity },
      uColorLow: { value: new THREE.Color(0x19ae8b) },
      uColorHigh: { value: new THREE.Color(0xa8f7dc) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: AURORA_VERTEX,
      fragmentShader: AURORA_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, spec.height), material);
    mesh.position.set(
      Math.sin(spec.angle) * spec.radius,
      spec.y,
      Math.cos(spec.angle) * spec.radius,
    );
    mesh.rotation.y = spec.angle + Math.PI;
    mesh.renderOrder = -1;
    group.add(mesh);
    curtains.push({ uniforms, baseOpacity: spec.opacity });
  }

  return { group, curtains };
}

function makeEnvironmentCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#02060c');
  gradient.addColorStop(0.36, '#071b2a');
  gradient.addColorStop(0.5, '#2f6172');
  gradient.addColorStop(0.56, '#122a36');
  gradient.addColorStop(0.72, '#09141b');
  gradient.addColorStop(1, '#050b10');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  // Arctic horizon glow.
  const glow = ctx.createRadialGradient(760, 250, 10, 760, 250, 300);
  glow.addColorStop(0, 'rgba(226,178,120,0.5)');
  glow.addColorStop(0.4, 'rgba(163,112,72,0.14)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(300, 0, 724, 512);

  // Aurora smear in the environment map.
  const aurora = ctx.createLinearGradient(0, 140, 0, 260);
  aurora.addColorStop(0, 'rgba(44,190,150,0)');
  aurora.addColorStop(0.5, 'rgba(44,190,150,0.22)');
  aurora.addColorStop(1, 'rgba(44,190,150,0)');
  ctx.fillStyle = aurora;
  ctx.fillRect(80, 130, 860, 140);

  // Moon.
  const moon = ctx.createRadialGradient(205, 130, 4, 205, 130, 46);
  moon.addColorStop(0, 'rgba(255,248,226,1)');
  moon.addColorStop(0.2, 'rgba(255,244,214,0.85)');
  moon.addColorStop(1, 'rgba(190,220,240,0)');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(205, 130, 46, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

export function createEnvironmentMap(renderer) {
  const texture = new THREE.CanvasTexture(makeEnvironmentCanvas());
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  const generator = new THREE.PMREMGenerator(renderer);
  generator.compileEquirectangularShader();
  const target = generator.fromEquirectangular(texture);
  texture.dispose();
  generator.dispose();
  return target.texture;
}

export function createSky(scene, renderer) {
  const random = mulberry32(7719);
  const group = new THREE.Group();
  scene.add(group);

  const dome = createSkyDome();
  group.add(dome);

  const stars = createStars(random);
  group.add(stars);

  const moon = createMoon();
  group.add(moon.group);

  const aurora = createAurora(random);
  group.add(aurora.group);

  const environment = createEnvironmentMap(renderer);
  scene.environment = environment;
  scene.environmentIntensity = 0.5;

  const horizonBase = new THREE.Color(0x3b6d7e);
  const horizonStorm = new THREE.Color(0x22424f);

  return {
    group,
    moon,
    update(time, storm) {
      for (const curtain of aurora.curtains) {
        curtain.uniforms.uTime.value = time;
        curtain.uniforms.uOpacity.value = curtain.baseOpacity * (0.75 + storm * 0.35);
      }
      stars.children[0].material.opacity = 0.58 + Math.sin(time * 0.7) * 0.08;
      stars.children[1].material.opacity = 0.7 + Math.sin(time * 1.3 + 2) * 0.12;
      moon.halo.material.opacity = 0.48 + Math.sin(time * 0.45) * 0.05;
      moon.halo.scale.setScalar(29 + Math.sin(time * 0.6) * 1.4);
    },
    setStorm(mix) {
      dome.material.uniforms.uHorizon.value.copy(horizonBase).lerp(horizonStorm, mix);
    },
  };
}
