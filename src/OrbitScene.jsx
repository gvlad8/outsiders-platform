import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function OrbitScene() {
  const host = useRef(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, element.clientWidth / Math.max(element.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 0, 8);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      element.classList.add("orbit-fallback");
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(element.clientWidth || 1, element.clientHeight || 1);
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const coreGeometry = new THREE.IcosahedronGeometry(1.15, 2);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xff7a00,
      metalness: 0.72,
      roughness: 0.24,
      wireframe: true,
      transparent: true,
      opacity: 0.72
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    const ringMaterialA = new THREE.MeshBasicMaterial({ color: 0xff7a00, transparent: true, opacity: 0.34 });
    const ringMaterialB = new THREE.MeshBasicMaterial({ color: 0xe58a3a, transparent: true, opacity: 0.25 });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.008, 8, 180), ringMaterialA);
    ringA.rotation.set(0.8, 0.3, 0.1);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.006, 8, 180), ringMaterialB);
    ringB.rotation.set(1.2, 0.75, 0.35);
    group.add(ringA, ringB);

    const points = [];
    for (let index = 0; index < 260; index += 1) {
      const radius = 2 + Math.random() * 1.7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      points.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const stars = new THREE.Points(pointGeometry, new THREE.PointsMaterial({
      color: 0xffc28a,
      size: 0.018,
      transparent: true,
      opacity: 0.68
    }));
    group.add(stars);

    scene.add(new THREE.AmbientLight(0xffffff, 1));
    const light = new THREE.PointLight(0xff7a00, 22, 20);
    light.position.set(3, 3, 4);
    scene.add(light);

    let frame = 0;
    let animationFrame = 0;
    const render = () => renderer.render(scene, camera);
    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      frame += 0.003;
      group.rotation.y = frame * 0.45;
      group.rotation.x = Math.sin(frame * 0.5) * 0.12;
      ringA.rotation.z += 0.0012;
      ringB.rotation.y += 0.0009;
      core.rotation.z -= 0.001;
      render();
    };

    if (reducedMotion) render();
    else animate();

    const resize = () => {
      const width = element.clientWidth || 1;
      const height = element.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      render();
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(element);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      coreGeometry.dispose();
      coreMaterial.dispose();
      ringA.geometry.dispose();
      ringB.geometry.dispose();
      ringMaterialA.dispose();
      ringMaterialB.dispose();
      pointGeometry.dispose();
      stars.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      if (element.contains(renderer.domElement)) element.removeChild(renderer.domElement);
      element.classList.remove("orbit-fallback");
    };
  }, []);

  return <div className="orbit-scene" ref={host} aria-hidden="true" />;
}
