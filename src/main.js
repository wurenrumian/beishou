import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { PolarBear } from './character/bear.js';
import { Emperor } from './character/emperor.js';
import { createEnvironment } from './world/environment.js';
import { createSky } from './world/sky.js';
import { Snowfall, Breath } from './fx/snow.js';
import { RoarBurst } from './fx/roar.js';
import { clamp, easeInOutCubic } from './util/helpers.js';

const canvas = document.querySelector('#stage');
const loader = document.querySelector('#loader');
const errorPanel = document.querySelector('#webglError');
const roarTag = document.querySelector('#roarTag');
const tempReadout = document.querySelector('#tempReadout');
const windReadout = document.querySelector('#windReadout');

const buttons = {
  orbit: document.querySelector('[data-action="orbit"]'),
  close: document.querySelector('[data-action="close"]'),
  storm: document.querySelector('[data-action="storm"]'),
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCompact = window.matchMedia('(max-width: 860px), (pointer: coarse)').matches;
const quality = prefersReducedMotion ? 0.45 : isCompact ? 0.62 : 1;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
  });
  if (!renderer.getContext()) throw new Error('WebGL context unavailable');
} catch (error) {
  console.error(error);
  errorPanel.classList.add('is-on');
  loader.classList.add('is-done');
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCompact ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x224653, 36, 170);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 600);

const wideTarget = new THREE.Vector3(isCompact ? 0 : -0.55, 3.05, 0);
const WIDE = { radius: 11.4, phi: 1.6235, theta: 0.72 };
const CLOSE = { radius: 7.0, phi: 1.6, theta: 0.5, target: new THREE.Vector3(0, 3.7, 0) };
const INTRO = { radius: 26, phi: 1.52, theta: -0.3 };
const INTRO_DURATION = prefersReducedMotion ? 1.2 : 3.4;

camera.position.set(0, 5, 20);
camera.lookAt(wideTarget);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(wideTarget);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 5.4;
controls.maxDistance = 26;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.72;
controls.rotateSpeed = 0.65;
controls.zoomSpeed = 0.8;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.45;
controls.enabled = false;

// ---------- world ----------

const sky = createSky(scene, renderer);
const environment = createEnvironment(scene);
if (isCompact) {
  environment.lighting.key.shadow.mapSize.set(1024, 1024);
}

const bear = new PolarBear();
scene.add(bear.group);

const emperor = new Emperor();
bear.body.add(emperor.group);

const snowfall = new Snowfall(scene, { quality });
const breath = new Breath(scene);
const roarBurst = new RoarBurst(scene);

// ---------- post processing ----------

const params = new URLSearchParams(window.location.search);
const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(window.innerWidth, window.innerHeight);
if (!isCompact && !params.has('nomsaa')) {
  composer.renderTarget1.samples = 4;
  composer.renderTarget2.samples = 4;
}
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

const usePostProcessing = !params.has('nopost');

// ---------- camera choreography ----------

function applySpherical(target, radius, phi, theta) {
  const sinPhi = Math.sin(phi);
  camera.position.set(
    target.x + radius * sinPhi * Math.sin(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * sinPhi * Math.cos(theta),
  );
  camera.lookAt(target);
}

function readSpherical() {
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  return { radius: spherical.radius, phi: spherical.phi, theta: spherical.theta };
}

let introActive = false;
let introElapsed = 0;

const flight = {
  active: false,
  elapsed: 0,
  duration: 1.35,
  from: null,
  to: null,
  fromTarget: new THREE.Vector3(),
  toTarget: new THREE.Vector3(),
};

let orbitEnabled = !prefersReducedMotion;
let closeUp = false;
let stormOn = false;
let stormTarget = 0;
let stormMix = 0;
let shake = 0;

if (!orbitEnabled) {
  buttons.orbit.classList.remove('is-active');
  buttons.orbit.setAttribute('aria-pressed', 'false');
}

applySpherical(wideTarget, INTRO.radius, INTRO.phi, INTRO.theta);

function finishIntro() {
  introActive = false;
  introElapsed = INTRO_DURATION;
  renderer.toneMappingExposure = 1.02;
  controls.target.copy(wideTarget);
  flyTo(WIDE, wideTarget);
}

function flyTo(preset, target) {
  flight.active = true;
  flight.elapsed = 0;
  flight.from = readSpherical();
  flight.to = preset;
  flight.fromTarget.copy(controls.target);
  flight.toTarget.copy(target);
  controls.enabled = false;
  controls.autoRotate = false;
}

function completeFlight() {
  flight.active = false;
  controls.enabled = true;
  controls.autoRotate = orbitEnabled;
  controls.update();
}

// ---------- interaction ----------

function markInteracted() {
  document.body.classList.add('has-interacted');
}

function triggerRoar() {
  if (introActive || flight.active) return;
  if (!bear.roar()) return;

  const nose = bear.getNoseWorld(new THREE.Vector3());
  roarBurst.spawn(new THREE.Vector3(0, 0, 1.15));
  breath.burst(nose, new THREE.Vector3(0, 0.15, 1));
  shake = 1;

  roarTag.classList.remove('is-on');
  // Force a reflow so the animation can restart on every tap.
  void roarTag.offsetWidth;
  roarTag.classList.add('is-on');
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerStart = { x: 0, y: 0 };
let suppressClick = false;

canvas.addEventListener('pointerdown', (event) => {
  markInteracted();
  pointerStart.x = event.clientX;
  pointerStart.y = event.clientY;
  suppressClick = false;

  if (introActive) {
    finishIntro();
    suppressClick = true;
  }
});

canvas.addEventListener('pointerup', (event) => {
  if (suppressClick || introActive || flight.active) {
    suppressClick = false;
    return;
  }

  const travel = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  if (travel > 7) return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(bear.group, true);
  if (hits.length > 0) triggerRoar();
});

buttons.orbit.addEventListener('click', () => {
  markInteracted();
  orbitEnabled = !orbitEnabled;
  controls.autoRotate = orbitEnabled && !introActive && !flight.active;
  buttons.orbit.classList.toggle('is-active', orbitEnabled);
  buttons.orbit.setAttribute('aria-pressed', String(orbitEnabled));
});

buttons.close.addEventListener('click', () => {
  markInteracted();
  if (flight.active || introActive) return;

  closeUp = !closeUp;
  buttons.close.classList.toggle('is-active', closeUp);
  buttons.close.setAttribute('aria-pressed', String(closeUp));

  if (closeUp) {
    flyTo({ ...CLOSE }, CLOSE.target);
  } else {
    flyTo(WIDE, wideTarget);
  }
});

buttons.storm.addEventListener('click', () => {
  markInteracted();
  stormOn = !stormOn;
  stormTarget = stormOn ? 1 : 0;
  buttons.storm.classList.toggle('is-active', stormOn);
  buttons.storm.setAttribute('aria-pressed', String(stormOn));

  tempReadout.textContent = stormOn ? '−47°C' : '−38°C';
  windReadout.textContent = stormOn ? 'WIND 26.4 M/S' : 'WIND 09.2 M/S';
});

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCompact ? 1.5 : 2));
  renderer.setSize(width, height);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(width, height);
});

// ---------- staging ----------

const noseWorld = new THREE.Vector3();
const forward = new THREE.Vector3();
const fogBase = new THREE.Color(0x224653);
const fogStorm = new THREE.Color(0x1a3441);
const timer = new THREE.Timer();
timer.connect(document);
let elapsed = 0;
let ready = false;

renderer.compile(scene, camera);
if (usePostProcessing) composer.render();
else renderer.render(scene, camera);

const minimumLoad = new Promise((resolve) => {
  window.setTimeout(resolve, 1500);
});
Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), minimumLoad]).then(() => {
  if (ready) return;
  ready = true;
  document.body.classList.add('is-ready');
  loader.classList.add('is-done');
  window.setTimeout(() => loader.remove(), 1100);
  introActive = true;
  introElapsed = 0;
});

function tick() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  elapsed += dt;

  stormMix += (stormTarget - stormMix) * Math.min(1, dt * 1.5);
  if (Math.abs(stormTarget - stormMix) < 0.002) stormMix = stormTarget;

  bear.update(dt, elapsed, stormMix);
  emperor.update(elapsed, stormMix);

  bear.getNoseWorld(noseWorld);
  bear.head.getWorldDirection(forward);
  breath.update(dt, noseWorld, forward);
  snowfall.setStorm(stormMix);
  snowfall.update(dt, elapsed);
  sky.setStorm(stormMix);
  environment.update(elapsed, stormMix);
  sky.update(elapsed, stormMix);
  roarBurst.update(dt);

  if (introActive) {
    introElapsed += dt;
    const t = clamp(introElapsed / INTRO_DURATION, 0, 1);
    const eased = easeInOutCubic(t);
    applySpherical(
      wideTarget,
      THREE.MathUtils.lerp(INTRO.radius, WIDE.radius, eased),
      THREE.MathUtils.lerp(INTRO.phi, WIDE.phi, eased),
      THREE.MathUtils.lerp(INTRO.theta, WIDE.theta, eased),
    );
    controls.target.copy(wideTarget);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(0.55, 1.02, eased);
    if (t >= 1) {
      introActive = false;
      controls.enabled = true;
      controls.autoRotate = orbitEnabled;
    }
  } else if (flight.active) {
    flight.elapsed += dt;
    const t = clamp(flight.elapsed / flight.duration, 0, 1);
    const eased = easeInOutCubic(t);
    const target = flight.fromTarget.clone().lerp(flight.toTarget, eased);
    applySpherical(
      target,
      THREE.MathUtils.lerp(flight.from.radius, flight.to.radius, eased),
      THREE.MathUtils.lerp(flight.from.phi, flight.to.phi, eased),
      THREE.MathUtils.lerp(flight.from.theta, flight.to.theta, eased),
    );
    controls.target.copy(target);
    if (t >= 1) completeFlight();
  } else {
    controls.update();
  }

  if (shake > 0.001) {
    camera.rotation.x += (Math.random() - 0.5) * 0.012 * shake;
    camera.rotation.y += (Math.random() - 0.5) * 0.016 * shake;
    camera.rotation.z += (Math.random() - 0.5) * 0.006 * shake;
    shake *= Math.exp(-dt * 3.6);
  } else {
    shake = 0;
  }

  if (!prefersReducedMotion) {
    camera.rotation.z += Math.sin(elapsed * 0.28) * 0.00035;
    camera.rotation.x += Math.sin(elapsed * 0.37 + 1) * 0.00025;
  }

  scene.fog.near = THREE.MathUtils.lerp(36, 16, stormMix);
  scene.fog.far = THREE.MathUtils.lerp(170, 80, stormMix);
  scene.fog.color.copy(fogBase).lerp(fogStorm, stormMix);

  if (usePostProcessing) composer.render();
  else renderer.render(scene, camera);
}

renderer.setAnimationLoop(tick);
