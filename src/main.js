import * as THREE from 'three';
import './style.css';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.querySelector('#orb-canvas');
const stage = document.querySelector('.orb-stage');

if (prefersReducedMotion.matches) {
  document.querySelectorAll('video').forEach((video) => {
    video.autoplay = false;
    video.pause();
  });
}

if (canvas && stage && !prefersReducedMotion.matches) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 8.2;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const group = new THREE.Group();
  scene.add(group);

  const count = window.innerWidth < 700 ? 1500 : 3200;
  const positions = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const lime = new THREE.Color('#ccff00');
  const ivory = new THREE.Color('#f5f5f0');

  for (let index = 0; index < count; index += 1) {
    const radius = 2.05 + Math.random() * 0.32;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const offset = index * 3;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    positions.set([x, y, z], offset);
    basePositions.set([x, y, z], offset);
    const color = lime.clone().lerp(ivory, Math.random() * 0.42);
    colors.set([color.r, color.g, color.b], offset);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.026, vertexColors: true, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false });
  const particles = new THREE.Points(geometry, material);
  group.add(particles);

  const rings = [
    [2.65, 0.004, '#ccff00', [1.12, 0.1, 0.3]],
    [2.82, 0.008, '#f5f5f0', [0.25, 0.82, 0]],
    [2.52, 0.005, '#ccff00', [0.55, -0.36, 1.1]],
  ].map(([radius, tube, color, rotation], ringIndex) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 180),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: ringIndex === 1 ? 0.28 : 0.55 }),
    );
    ring.rotation.set(...rotation);
    group.add(ring);
    return ring;
  });

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.68, 3),
    new THREE.MeshBasicMaterial({ color: '#283300', wireframe: true, transparent: true, opacity: 0.18 }),
  );
  group.add(core);

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0 };
  let dragging = false;
  let elapsed = 0;

  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (dragging) pointer.strength = Math.min(1.5, pointer.strength + 0.08);
  });
  stage.addEventListener('pointerdown', (event) => { dragging = true; pointer.strength = 0.65; stage.setPointerCapture(event.pointerId); });
  stage.addEventListener('pointerup', () => { dragging = false; });
  stage.addEventListener('pointerleave', () => { dragging = false; pointer.targetX = 0; pointer.targetY = 0; });

  const resize = () => {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  const clock = new THREE.Clock();
  const animate = () => {
    elapsed += Math.min(clock.getDelta(), 0.04);
    pointer.x += (pointer.targetX - pointer.x) * 0.045;
    pointer.y += (pointer.targetY - pointer.y) * 0.045;
    pointer.strength *= dragging ? 0.995 : 0.94;

    group.rotation.y = elapsed * 0.105 + pointer.x * 0.16;
    group.rotation.x = Math.sin(elapsed * 0.18) * 0.08 - pointer.y * 0.14;
    rings[0].rotation.z += 0.0017;
    rings[1].rotation.y -= 0.0012;
    rings[2].rotation.x += 0.0009;
    core.rotation.y -= 0.0018;

    const positionAttribute = geometry.attributes.position;
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      const bx = basePositions[offset];
      const by = basePositions[offset + 1];
      const bz = basePositions[offset + 2];
      const wave = Math.sin(bx * 2.3 + elapsed * 1.15) * Math.cos(by * 1.7 - elapsed * 0.72);
      const pull = 1 + wave * 0.018 + pointer.strength * 0.11 * Math.sin(bz * 3 + elapsed * 2);
      positionAttribute.array[offset] = bx * pull;
      positionAttribute.array[offset + 1] = by * pull;
      positionAttribute.array[offset + 2] = bz * pull;
    }
    positionAttribute.needsUpdate = true;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();
  document.addEventListener('visibilitychange', () => { clock.getDelta(); });
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
document.querySelector('#year').textContent = new Date().getFullYear();

const soundButton = document.querySelector('.sound-toggle');
let audioContext;
let oscillator;
let gain;

soundButton.addEventListener('click', async () => {
  const enabled = soundButton.getAttribute('aria-pressed') === 'true';
  if (enabled) {
    gain?.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);
    setTimeout(() => oscillator?.stop(), 380);
    soundButton.setAttribute('aria-pressed', 'false');
    soundButton.lastChild.textContent = ' Sound off';
    return;
  }
  audioContext = new AudioContext();
  oscillator = audioContext.createOscillator();
  gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 54;
  gain.gain.value = 0.0001;
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.022, audioContext.currentTime + 0.8);
  soundButton.setAttribute('aria-pressed', 'true');
  soundButton.lastChild.textContent = ' Sound on';
});
