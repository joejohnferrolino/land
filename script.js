// ---- Lot area figures (driven by config.js so they can be changed in one place) ----
const setTextIfPresent = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};
setTextIfPresent('totalAreaText', `${SITE_CONFIG.totalLotAreaSqm.toLocaleString()} sqm`);
setTextIfPresent('soldAreaText', `Sold ${SITE_CONFIG.soldAreaSqm.toLocaleString()} sqm (SOLD)`);
setTextIfPresent('availableAreaText', `Other ${SITE_CONFIG.availableAreaSqm.toLocaleString()} sqm (AVAILABLE)`);
setTextIfPresent('lotAreaBadgeText', `Total Lot Area: ${SITE_CONFIG.totalLotAreaSqm.toLocaleString()} sqm`);

// ---- Modal handling ----
const openModal = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  if (PANO_MODALS[id]) initPanoViewer(id);
};
const closeModal = (el) => {
  el.classList.remove('open');
  if (PANO_MODALS[el.id]) destroyPanoViewer(el.id);
};

document.querySelectorAll('[data-modal]').forEach((trigger) => {
  trigger.addEventListener('click', () => openModal(trigger.dataset.modal));
});

document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
  overlay.querySelector('[data-close]').addEventListener('click', () => closeModal(overlay));
});

// ---- 360 / 3D pano viewers (Pannellum) ----
const PANO_MODALS = {
  view3dModal: { container: 'panoViewer3D', image: 'img/lot3d.jpg', instance: null },
};

function initPanoViewer(modalId) {
  const cfg = PANO_MODALS[modalId];
  if (cfg.instance || typeof pannellum === 'undefined') return;
  // Defer to next frame so the modal's layout (and the container's real size) is settled first.
  requestAnimationFrame(() => {
    cfg.instance = pannellum.viewer(cfg.container, {
      type: 'equirectangular',
      panorama: cfg.image,
      autoLoad: true,
      autoRotate: -2,
      compass: false,
      hfov: 100,
      draggable: true,
      mouseZoom: true,
      keyboardZoom: true,
    });
  });
}

function destroyPanoViewer(modalId) {
  const cfg = PANO_MODALS[modalId];
  if (cfg.instance) {
    cfg.instance.destroy();
    cfg.instance = null;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(closeModal);
  }
});

// ---- 360 HDR tour layer (shown by default via the "active" class in the HTML) ----
const tourStage = document.getElementById('tourStage');
const openTourBtn = document.getElementById('openTourBtn');
const tourCloseBtn = document.getElementById('tourCloseBtn');

function openTour() {
  tourStage.classList.add('active');
  document.dispatchEvent(new CustomEvent('tour:open'));
}
function closeTour() {
  tourStage.classList.remove('active');
  document.dispatchEvent(new CustomEvent('tour:close'));
}
if (openTourBtn) openTourBtn.addEventListener('click', openTour);
if (tourCloseBtn) tourCloseBtn.addEventListener('click', closeTour);

// ---- Info card minimize toggle ----
const infoCard = document.getElementById('infoCard');
const minimizeBtn = document.getElementById('minimizeBtn');
if (minimizeBtn && infoCard) {
  minimizeBtn.addEventListener('click', () => {
    const minimized = infoCard.classList.toggle('minimized');
    minimizeBtn.innerHTML = minimized ? '&plus;' : '&minus;';
    minimizeBtn.setAttribute('aria-label', minimized ? 'Expand' : 'Minimize');
  });
}

// ---- Gallery (placeholder tiles standing in for real property photos) ----
const galleryGrid = document.getElementById('galleryGrid');
const galleryColors = ['#7fae5a', '#5f9647', '#2f7fe0', '#c65a3a', '#3f7d33', '#16233a'];
const galleryLabels = ['Front View', 'Sold Portion', 'Available Portion', 'Access Road', 'Aerial Shot', 'Boundary'];
galleryColors.forEach((color, i) => {
  const div = document.createElement('div');
  div.className = 'thumb';
  div.style.background = color;
  div.textContent = galleryLabels[i];
  galleryGrid.appendChild(div);
});

// ---- Compass control (optional — no-ops gracefully if the markup isn't present) ----
const dirs = Array.from(document.querySelectorAll('.dir'));
let dirIndex = Math.max(0, dirs.findIndex((d) => d.classList.contains('active')));

const setActiveDir = (index) => {
  if (!dirs.length) return;
  dirs[dirIndex].classList.remove('active');
  dirIndex = (index + dirs.length) % dirs.length;
  dirs[dirIndex].classList.add('active');
  applyTransform();
};

dirs.forEach((dirEl, i) => {
  dirEl.addEventListener('click', () => setActiveDir(i));
});

const prevDirBtn = document.getElementById('prevDir');
const nextDirBtn = document.getElementById('nextDir');
if (prevDirBtn) prevDirBtn.addEventListener('click', () => setActiveDir(dirIndex - 1));
if (nextDirBtn) nextDirBtn.addEventListener('click', () => setActiveDir(dirIndex + 1));

const scene = document.getElementById('scene');
const aerial = document.getElementById('aerial');
const rotationByDir = { West: -6, N: 0, East: 6, S: 0 };

// ---- Zoom + pan control (drag to pan once zoomed in, scroll/pinch or +/- to zoom) ----
let currentZoom = 1;
let offsetX = 0;
let offsetY = 0;
const ZOOM_STEP = 0.1;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

function clampOffsets() {
  const rect = scene.getBoundingClientRect();
  const maxX = (rect.width * (currentZoom - 1)) / 2;
  const maxY = (rect.height * (currentZoom - 1)) / 2;
  offsetX = Math.min(maxX, Math.max(-maxX, offsetX));
  offsetY = Math.min(maxY, Math.max(-maxY, offsetY));
}

function applyTransform() {
  const deg = dirs.length ? (rotationByDir[dirs[dirIndex].dataset.dir] ?? 0) : 0;
  aerial.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${deg}deg) scale(${currentZoom})`;
}

function setZoom(zoom) {
  currentZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  clampOffsets();
  applyTransform();
}

const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
if (zoomInBtn) zoomInBtn.addEventListener('click', () => setZoom(currentZoom + ZOOM_STEP));
if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => setZoom(currentZoom - ZOOM_STEP));

scene.addEventListener('wheel', (e) => {
  e.preventDefault();
  setZoom(currentZoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP));
}, { passive: false });

// Drag to pan (mouse + touch)
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let startOffsetX = 0;
let startOffsetY = 0;

function dragStart(x, y) {
  isDragging = true;
  dragStartX = x;
  dragStartY = y;
  startOffsetX = offsetX;
  startOffsetY = offsetY;
  scene.classList.add('dragging');
}
function dragMove(x, y) {
  if (!isDragging) return;
  offsetX = startOffsetX + (x - dragStartX);
  offsetY = startOffsetY + (y - dragStartY);
  clampOffsets();
  applyTransform();
}
function dragEnd() {
  isDragging = false;
  scene.classList.remove('dragging');
}

scene.addEventListener('mousedown', (e) => dragStart(e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY));
window.addEventListener('mouseup', dragEnd);

scene.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  dragStart(t.clientX, t.clientY);
}, { passive: true });
scene.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  dragMove(t.clientX, t.clientY);
}, { passive: true });
scene.addEventListener('touchend', dragEnd);

// ---- Request Viewing form ----
const requestForm = document.getElementById('requestForm');
const requestSuccess = document.getElementById('requestSuccess');

requestForm.addEventListener('submit', (e) => {
  e.preventDefault();
  requestForm.hidden = true;
  requestSuccess.hidden = false;
  setTimeout(() => {
    requestForm.reset();
    requestForm.hidden = false;
    requestSuccess.hidden = true;
  }, 2500);
});
