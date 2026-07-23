import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const HDR_URL = 'img/resting_place_1k.hdr';
const container = document.getElementById('hdrViewer');
const loaderEl = document.getElementById('tourLoader');
const loaderPercentEl = document.getElementById('tourLoaderPercent');

let renderer, labelRenderer, scene, camera, controls;
let animationId = null;
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.style.position = 'relative';
  container.appendChild(labelRenderer.domElement);

  new RGBELoader().load(
    HDR_URL,
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      hideLoader();
    },
    (event) => {
      if (event.lengthComputable && loaderPercentEl) {
        loaderPercentEl.textContent = `${Math.round((event.loaded / event.total) * 100)}%`;
      }
    },
    () => {
      if (loaderEl) loaderEl.querySelector('p').textContent = 'Failed to load the 360° view.';
    }
  );

  addLotOverlay();

  // Camera stays at the origin and only rotates — a real dolly zoom does
  // nothing useful against an infinite background, so zoom is done via FOV instead.
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.01, 0, 0);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = -0.3;

  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', onResize);

  animate();
}

function hideLoader() {
  if (loaderEl) loaderEl.classList.add('hidden');
}

// Ground-plane boundary lines, sized and positioned directly from config.js (SITE_CONFIG.lotLines).
// The HDR panorama is a generic sample capture (not geo-registered to the real lot), so
// this is a schematic guide — not a survey-accurate overlay — placed at a plausible eye height.
const EYE_HEIGHT = 1.6;

function rectPoints(xMin, zMin, xMax, zMax, y) {
  return [
    new THREE.Vector3(xMin, y, zMin),
    new THREE.Vector3(xMax, y, zMin),
    new THREE.Vector3(xMax, y, zMax),
    new THREE.Vector3(xMin, y, zMax),
    new THREE.Vector3(xMin, y, zMin),
  ];
}

function makeDashedRect(xMin, zMin, xMax, zMax, y, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints(rectPoints(xMin, zMin, xMax, zMax, y));
  const line = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color, dashSize: 0.6, gapSize: 0.4 }));
  line.computeLineDistances();
  return line;
}

function makeSolidRect(xMin, zMin, xMax, zMax, y, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints(rectPoints(xMin, zMin, xMax, zMax, y));
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
}

function makeLabel(text, color) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.color = color;
  el.style.fontFamily = 'Arial, sans-serif';
  el.style.fontWeight = '700';
  el.style.fontSize = '14px';
  el.style.textShadow = '0 1px 3px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.6)';
  el.style.whiteSpace = 'nowrap';
  return new CSS2DObject(el);
}

function addOverlayRect(group, spec, color, dashed, y) {
  if (!spec) return;
  const xMin = spec.x - spec.width / 2;
  const xMax = spec.x + spec.width / 2;
  const zMin = spec.z - spec.depth / 2;
  const zMax = spec.z + spec.depth / 2;
  group.add(dashed ? makeDashedRect(xMin, zMin, xMax, zMax, y, color) : makeSolidRect(xMin, zMin, xMax, zMax, y, color));
}

function addOverlayLabel(group, spec, text, color, y) {
  if (!spec) return;
  const label = makeLabel(text, color);
  label.position.set(spec.x, y, spec.z);
  group.add(label);
}

function addLotOverlay() {
  const cfg = typeof SITE_CONFIG !== 'undefined' ? SITE_CONFIG : {};
  const lines = cfg.lotLines ?? {};
  const total = cfg.totalLotAreaSqm ?? 0;
  const sold = cfg.soldAreaSqm ?? 0;
  const available = cfg.availableAreaSqm ?? 0;
  const y = -EYE_HEIGHT;

  const group = new THREE.Group();
  addOverlayRect(group, lines.total, 0xffffff, true, y); // total lot — white dashed
  addOverlayRect(group, lines.sold, 0xff3b30, true, y); // sold — red dashed
  addOverlayRect(group, lines.available, 0x2ecc71, false, y); // available — green

  if (lines.total) {
    // Offset toward the far edge so it doesn't overlap the sold/available labels at the center line.
    addOverlayLabel(
      group,
      { x: lines.total.x, z: lines.total.z + lines.total.depth / 2 - 1.5 },
      `TOTAL ${total.toLocaleString()} sqm`,
      '#ffffff',
      y
    );
  }
  addOverlayLabel(group, lines.sold, `SOLD ${sold.toLocaleString()} sqm`, '#ff5a4a', y);
  addOverlayLabel(group, lines.available, `AVAILABLE ${available.toLocaleString()} sqm`, '#4ade80', y);

  scene.add(group);
}

function onWheel(e) {
  e.preventDefault();
  camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.03, 30, 90);
  camera.updateProjectionMatrix();
}

function onResize() {
  if (!initialized || !container.clientWidth || !container.clientHeight) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function stop() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function resume() {
  if (initialized && animationId === null) animate();
}

function start() {
  init();
  requestAnimationFrame(onResize);
  resume();
}

document.addEventListener('tour:open', start);
document.addEventListener('tour:close', stop);

// This module loads deferred (after the DOM is parsed), so by the time we get here
// the "active" class script.js/the HTML set on page load is already reliably in place —
// unlike a dispatched event, which could fire before this listener above is registered.
const tourStage = document.getElementById('tourStage');
if (tourStage && tourStage.classList.contains('active')) {
  start();
}
