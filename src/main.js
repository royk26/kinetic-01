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

if (canvas && stage) {
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 8.8);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.setClearColor(0x000000, 0);
    stage.classList.add('is-webgl');

    scene.add(new THREE.HemisphereLight(0xf5f5f0, 0x111500, 1.45));
    const keyLight = new THREE.PointLight(0xccff00, 42, 18, 1.8);
    keyLight.position.set(4.5, 3.2, 5.5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x7b49ff, 28, 15, 2);
    rimLight.position.set(-4, -2.5, 3);
    scene.add(rimLight);

    const sculpture = new THREE.Group();
    sculpture.rotation.set(-0.18, -0.5, 0.08);
    scene.add(sculpture);

    const solidCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.72, 4),
      new THREE.MeshStandardMaterial({
        color: 0x4f6500,
        emissive: 0x1b2400,
        emissiveIntensity: 1.25,
        metalness: 0.72,
        roughness: 0.2,
        flatShading: true,
      }),
    );
    sculpture.add(solidCore);

    const innerCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.22, 2),
      new THREE.MeshBasicMaterial({
        color: 0xccff00,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sculpture.add(innerCore);

    const cage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.12, 2),
      new THREE.MeshBasicMaterial({
        color: 0xccff00,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      }),
    );
    sculpture.add(cage);

    const edgeGeometry = new THREE.EdgesGeometry(new THREE.DodecahedronGeometry(2.38, 1), 12);
    const outerFrame = new THREE.LineSegments(
      edgeGeometry,
      new THREE.LineBasicMaterial({ color: 0xf5f5f0, transparent: true, opacity: 0.28 }),
    );
    sculpture.add(outerFrame);

    const count = window.innerWidth < 700 ? 1100 : 2400;
    const particlePositions = new Float32Array(count * 3);
    const particleColors = new Float32Array(count * 3);
    const lime = new THREE.Color(0xccff00);
    const violet = new THREE.Color(0x8257ff);
    for (let index = 0; index < count; index += 1) {
      const radius = 2.48 + Math.random() * 0.82;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const offset = index * 3;
      particlePositions[offset] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[offset + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[offset + 2] = radius * Math.cos(phi);
      const color = lime.clone().lerp(violet, Math.random() * 0.38);
      particleColors[offset] = color.r;
      particleColors[offset + 1] = color.g;
      particleColors[offset + 2] = color.b;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        size: window.innerWidth < 700 ? 0.036 : 0.029,
        vertexColors: true,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sculpture.add(particles);

    const rings = [
      [2.88, 0.012, 0xccff00, [1.1, 0.12, 0.35]],
      [3.08, 0.009, 0xf5f5f0, [0.28, 0.88, -0.2]],
      [2.72, 0.008, 0x8257ff, [0.62, -0.38, 1.08]],
    ].map(([radius, tube, color, rotation], ringIndex) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 8, 220),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: ringIndex === 1 ? 0.42 : 0.72,
          blending: THREE.AdditiveBlending,
        }),
      );
      ring.rotation.set(...rotation);
      sculpture.add(ring);
      return ring;
    });

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const drag = { active: false, lastX: 0, lastY: 0, rotationX: -0.18, rotationY: -0.5 };
    let elapsed = 0;

    const updatePointer = (event) => {
      const rect = stage.getBoundingClientRect();
      pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      if (drag.active) {
        drag.rotationY += (event.clientX - drag.lastX) * 0.009;
        drag.rotationX += (event.clientY - drag.lastY) * 0.009;
        drag.rotationX = THREE.MathUtils.clamp(drag.rotationX, -1.25, 1.25);
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
      }
    };

    stage.addEventListener('pointermove', updatePointer);
    stage.addEventListener('pointerdown', (event) => {
      drag.active = true;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      stage.classList.add('is-dragging');
      stage.setPointerCapture(event.pointerId);
    });
    const endDrag = (event) => {
      drag.active = false;
      stage.classList.remove('is-dragging');
      if (event?.pointerId != null && stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('pointerleave', () => {
      if (!drag.active) {
        pointer.targetX = 0;
        pointer.targetY = 0;
      }
    });

    const resize = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    resize();

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      stage.classList.remove('is-webgl');
      stage.classList.add('is-fallback');
    });

    const reducedMotion = prefersReducedMotion.matches;
    const clock = new THREE.Clock();
    const animate = () => {
      elapsed += Math.min(clock.getDelta(), 0.04);
      pointer.x += (pointer.targetX - pointer.x) * 0.075;
      pointer.y += (pointer.targetY - pointer.y) * 0.075;

      const autoSpin = reducedMotion ? 0 : elapsed * 0.16;
      sculpture.rotation.y += ((drag.rotationY + autoSpin + pointer.x * 0.24) - sculpture.rotation.y) * 0.075;
      sculpture.rotation.x += ((drag.rotationX - pointer.y * 0.18) - sculpture.rotation.x) * 0.075;
      sculpture.rotation.z = 0.08 + pointer.x * pointer.y * 0.06;
      camera.position.x += (pointer.x * 0.42 - camera.position.x) * 0.055;
      camera.position.y += (-pointer.y * 0.32 - camera.position.y) * 0.055;
      camera.lookAt(0, 0, 0);

      if (!reducedMotion) {
        solidCore.rotation.y += 0.0024;
        solidCore.rotation.x -= 0.0011;
        innerCore.rotation.y -= 0.0042;
        cage.rotation.y -= 0.0018;
        outerFrame.rotation.x += 0.0011;
        particles.rotation.y += 0.0008;
        rings[0].rotation.z += 0.0022;
        rings[1].rotation.y -= 0.0015;
        rings[2].rotation.x += 0.0012;
        const pulse = 1 + Math.sin(elapsed * 1.6) * 0.045;
        innerCore.scale.setScalar(pulse);
      }

      keyLight.position.x = 4.5 + pointer.x * 2.4;
      keyLight.position.y = 3.2 - pointer.y * 2;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();
    document.addEventListener('visibilitychange', () => clock.getDelta());
  } catch (error) {
    console.error('Unable to initialize the 3D scene.', error);
    stage.classList.add('is-fallback');
  }
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
