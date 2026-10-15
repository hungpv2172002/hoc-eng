import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function makeMesh(geometry: THREE.BufferGeometry, color: number, position: THREE.Vector3Tuple, scale?: THREE.Vector3Tuple) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  return mesh;
}

export function KidsGardenScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch {
      setFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 3.25, 8.1);
    camera.lookAt(0, 0.85, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x78a96b, 2.1));
    const sunlight = new THREE.DirectionalLight(0xffffff, 2.4);
    sunlight.position.set(-3, 6, 5);
    scene.add(sunlight);

    const garden = new THREE.Group();
    scene.add(garden);
    garden.add(makeMesh(new THREE.CylinderGeometry(1.6, 1.8, 0.48, 9), 0x9a633f, [0, 0.32, 0]));
    garden.add(makeMesh(new THREE.CylinderGeometry(1.9, 1.6, 0.35, 9), 0x65b96f, [0, 0.66, 0]));
    garden.add(makeMesh(new THREE.CylinderGeometry(0.23, 0.3, 0.95, 6), 0x95613e, [-0.2, 1.24, 0]));

    const leafGeometry = new THREE.ConeGeometry(0.75, 0.88, 7);
    garden.add(makeMesh(leafGeometry, 0x36a86d, [-0.2, 2.04, 0], [1, 1, 0.82]));
    garden.add(makeMesh(new THREE.ConeGeometry(0.59, 0.78, 7), 0x48c47b, [-0.2, 2.52, 0], [1, 1, 0.82]));
    garden.add(makeMesh(new THREE.SphereGeometry(0.2, 12, 10), 0xffd15c, [-0.48, 2.34, 0.51]));
    garden.add(makeMesh(new THREE.SphereGeometry(0.17, 12, 10), 0xffd15c, [0.1, 2.05, 0.62]));

    const flowerColors = [0xff6b78, 0xffc84a, 0x8d7bff];
    for (let i = 0; i < 3; i += 1) {
      const x = (i - 1) * 0.72;
      const z = i === 1 ? 0.76 : 0.25;
      garden.add(makeMesh(new THREE.CylinderGeometry(0.025, 0.035, 0.28, 5), 0x3d9b55, [x, 0.94, z]));
      garden.add(makeMesh(new THREE.SphereGeometry(0.12, 10, 8), flowerColors[i], [x, 1.1, z]));
    }

    const sun = makeMesh(new THREE.SphereGeometry(0.45, 16, 12), 0xffca4f, [1.55, 2.72, -0.75]);
    scene.add(sun);
    const cloudGroup = new THREE.Group();
    scene.add(cloudGroup);
    cloudGroup.position.set(-1.62, 2.82, -1.2);
    cloudGroup.add(makeMesh(new THREE.SphereGeometry(0.25, 10, 8), 0xffffff, [0, 0, 0], [1.35, 0.72, 0.72]));
    cloudGroup.add(makeMesh(new THREE.SphereGeometry(0.2, 10, 8), 0xffffff, [0.22, 0.09, 0], [1.1, 0.86, 0.78]));

    const floaters = [
      makeMesh(new THREE.IcosahedronGeometry(0.13, 0), 0xffd45e, [1.9, 1.25, 0.2]),
      makeMesh(new THREE.IcosahedronGeometry(0.1, 0), 0x63c9ef, [-1.85, 1.42, 0.15]),
    ];
    scene.add(...floaters);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    let frame = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    const animate = () => {
      if (disposed || !visible || reduceMotion.matches) return;
      const time = clock.getElapsedTime();
      garden.rotation.y = Math.sin(time * 0.45) * 0.12;
      floaters.forEach((item, index) => {
        item.position.y = (index === 0 ? 1.25 : 1.42) + Math.sin(time * 1.5 + index * 2) * 0.12;
        item.rotation.y = time * (index === 0 ? 0.45 : -0.55);
      });
      cloudGroup.position.x = -1.62 + Math.sin(time * 0.24) * 0.08;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };
    const startAnimation = () => {
      window.cancelAnimationFrame(frame);
      if (visible && !reduceMotion.matches) frame = window.requestAnimationFrame(animate);
      else renderer.render(scene, camera);
    };
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      startAnimation();
    }, { threshold: 0.05 });
    intersectionObserver.observe(host);
    reduceMotion.addEventListener('change', startAnimation);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reduceMotion.removeEventListener('change', startAnimation);
      const geometries = new Set<THREE.BufferGeometry>();
      const sceneMaterials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        meshMaterials.forEach((material) => sceneMaterials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose());
      sceneMaterials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="kids-garden-scene" ref={hostRef} role="img" aria-label="Khu vườn tiếng Anh thu nhỏ với cây, hoa và mặt trời">
      {failed && <span className="kids-garden-fallback">🌳 ☀️ 🌼</span>}
    </div>
  );
}
