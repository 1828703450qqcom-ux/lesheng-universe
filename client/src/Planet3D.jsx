import React, { useEffect, useRef, useState } from 'react';
import { DoubleSide, Group, Mesh, PerspectiveCamera, RingGeometry, Scene, ShaderMaterial, SphereGeometry, WebGLRenderer } from 'three';

const planetVertex = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vEye;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vEye = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const planetFragment = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vEye;
  void main() {
    float latitude = vUv.y + sin(vUv.x * 24.0 + vUv.y * 28.0) * 0.006;
    float narrow = sin(latitude * 118.0) * 0.5 + 0.5;
    float broad = sin(latitude * 42.0 + sin(vUv.x * 13.0) * 0.4) * 0.5 + 0.5;
    vec3 deep = vec3(0.025, 0.09, 0.23);
    vec3 blue = vec3(0.19, 0.40, 0.64);
    vec3 cloud = vec3(0.51, 0.69, 0.84);
    vec3 color = mix(deep, blue, 0.42 + broad * 0.32);
    color = mix(color, cloud, pow(narrow, 6.0) * (0.11 + broad * 0.16));
    vec2 stormUv = (vUv - vec2(0.67, 0.56)) * vec2(5.8, 12.0);
    float storm = 1.0 - smoothstep(0.46, 0.92, length(stormUv));
    color = mix(color, vec3(0.62, 0.75, 0.85), storm * 0.38);
    vec3 normal = normalize(vNormal);
    vec3 light = normalize(vec3(-0.58, 0.7, 0.8));
    float diffuse = max(dot(normal, light), 0.0);
    float fresnel = pow(1.0 - max(dot(normal, normalize(vEye)), 0.0), 2.3);
    float specular = pow(max(dot(reflect(-light, normal), normalize(vEye)), 0.0), 28.0);
    color *= 0.25 + diffuse * 0.82;
    color += vec3(0.29, 0.50, 0.77) * fresnel * 0.25;
    color += vec3(0.72, 0.83, 0.91) * specular * 0.23;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const ringVertex = `
  varying vec2 vRing;
  void main() {
    vRing = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragment = `
  varying vec2 vRing;
  void main() {
    float radius = length(vRing);
    float edge = smoothstep(1.33, 1.42, radius) * (1.0 - smoothstep(1.77, 1.84, radius));
    float grain = sin(radius * 135.0) * 0.5 + 0.5;
    float lane = sin(radius * 48.0) * 0.5 + 0.5;
    vec3 slate = vec3(0.26, 0.40, 0.60);
    vec3 gold = vec3(0.95, 0.76, 0.45);
    vec3 color = mix(slate, gold, 0.45 + lane * 0.4);
    float gap = 1.0 - (1.0 - smoothstep(1.62, 1.65, radius)) * smoothstep(1.59, 1.62, radius) * 0.7;
    gl_FragColor = vec4(color, edge * gap * (0.24 + grain * 0.29));
  }
`;

function mountPlanet(canvas, onReady) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 30);
  camera.position.z = 5.55;
  const model = new Group();
  model.rotation.set(0.12, -0.3, -0.18);
  scene.add(model);

  const sphereGeometry = new SphereGeometry(1, 56, 36);
  const sphereMaterial = new ShaderMaterial({ vertexShader: planetVertex, fragmentShader: planetFragment });
  const globe = new Mesh(sphereGeometry, sphereMaterial);
  model.add(globe);
  const ringGeometry = new RingGeometry(1.33, 1.84, 128, 10);
  const ringMaterial = new ShaderMaterial({ vertexShader: ringVertex, fragmentShader: ringFragment, side: DoubleSide, transparent: true, depthWrite: false });
  const ring = new Mesh(ringGeometry, ringMaterial);
  ring.rotation.set(-1.13, 0, -0.34);
  model.add(ring);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let frame = 0;
  let last = 0;
  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  const mobile = window.matchMedia('(max-width: 800px)').matches;
  const interval = mobile ? 1000 / 24 : 1000 / 40;

  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  const animate = time => {
    frame = window.requestAnimationFrame(animate);
    if (time - last < interval) return;
    const delta = Math.min((time - (last || time)) / 1000, 0.05);
    last = time;
    if (!dragging) globe.rotation.y += delta * 0.14;
    render();
  };
  const updateActivity = () => {
    const shouldRun = visible && !document.hidden && !reduced.matches;
    canvas.dataset.animating = shouldRun ? 'true' : 'false';
    if (shouldRun && !frame) { last = 0; frame = window.requestAnimationFrame(animate); }
    if (!shouldRun && frame) { window.cancelAnimationFrame(frame); frame = 0; render(); }
  };
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateActivity(); }, { threshold: 0.05 });
  const resizeObserver = new ResizeObserver(resize);
  const pointerDown = event => { dragging = true; previousX = event.clientX; previousY = event.clientY; canvas.setPointerCapture(event.pointerId); };
  const pointerMove = event => {
    if (!dragging) return;
    model.rotation.y += (event.clientX - previousX) * 0.008;
    model.rotation.x = Math.max(-0.65, Math.min(0.65, model.rotation.x + (event.clientY - previousY) * 0.006));
    previousX = event.clientX;
    previousY = event.clientY;
    canvas.dataset.rotationY = model.rotation.y.toFixed(3);
    render();
  };
  const pointerUp = () => { dragging = false; };
  const keyDown = event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') model.rotation.y -= 0.15;
    if (event.key === 'ArrowRight') model.rotation.y += 0.15;
    if (event.key === 'ArrowUp') model.rotation.x = Math.max(-0.65, model.rotation.x - 0.12);
    if (event.key === 'ArrowDown') model.rotation.x = Math.min(0.65, model.rotation.x + 0.12);
    canvas.dataset.rotationY = model.rotation.y.toFixed(3);
    render();
  };
  const contextLost = event => { event.preventDefault(); if (frame) window.cancelAnimationFrame(frame); frame = 0; onReady(false); };
  const contextRestored = () => { resize(); onReady(true); updateActivity(); };

  resize();
  resizeObserver.observe(canvas);
  observer.observe(canvas);
  reduced.addEventListener('change', updateActivity);
  document.addEventListener('visibilitychange', updateActivity);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('keydown', keyDown);
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  canvas.dataset.renderer = 'webgl2';
  onReady(true);
  updateActivity();

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    observer.disconnect();
    resizeObserver.disconnect();
    reduced.removeEventListener('change', updateActivity);
    document.removeEventListener('visibilitychange', updateActivity);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerUp);
    canvas.removeEventListener('keydown', keyDown);
    canvas.removeEventListener('webglcontextlost', contextLost);
    canvas.removeEventListener('webglcontextrestored', contextRestored);
    sphereGeometry.dispose();
    sphereMaterial.dispose();
    ringGeometry.dispose();
    ringMaterial.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
}

export default function Planet3D() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cleanup = () => {};
    try { cleanup = mountPlanet(canvasRef.current, setReady); }
    catch { setReady(false); }
    return () => cleanup();
  }, []);
  return <canvas ref={canvasRef} className={`planet-3d-canvas${ready ? ' planet-mesh-ready' : ''}`} aria-label="3D 环形星球，可拖动或用方向键旋转" role="img" tabIndex={0}/>;
}
