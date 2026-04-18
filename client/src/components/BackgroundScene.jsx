import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function BackgroundScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (prefersReducedMotion || isMobile) return undefined;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const count = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count * 3; index += 3) {
      positions[index] = (Math.random() - 0.5) * 14;
      positions[index + 1] = (Math.random() - 0.5) * 8;
      positions[index + 2] = (Math.random() - 0.5) * 8;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x14b8a6,
      size: 0.035,
      transparent: true,
      opacity: 0.58
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let raf = 0;
    let active = true;

    function animate() {
      if (!active) return;
      points.rotation.y += 0.0018;
      points.rotation.x += 0.0007;
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    }

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function handleVisibility() {
      active = !document.hidden;
      if (active) animate();
      else window.cancelAnimationFrame(raf);
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    animate();

    return () => {
      active = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="pointer-events-none fixed inset-0 z-0 opacity-80" aria-hidden="true" />;
}
