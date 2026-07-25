"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function EthDiamondCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xf6851b, 2.5, 50); // MetaMask Orange
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const secondaryLight = new THREE.PointLight(0xddfb9c, 2, 50); // Neon Lime
    secondaryLight.position.set(-5, -5, 5);
    scene.add(secondaryLight);

    // Ethereum Diamond (Octahedron)
    const geometry = new THREE.OctahedronGeometry(2.2, 0);
    const material = new THREE.MeshPhongMaterial({
      color: 0xddfb9c, // Neon Lime
      emissive: 0x3a5001,
      emissiveIntensity: 0.4,
      shininess: 100,
      transparent: true,
      opacity: 0.9,
      wireframe: false,
    });
    const ethLogo = new THREE.Mesh(geometry, material);
    scene.add(ethLogo);

    // Inner wireframe accent
    const wireframeGeo = new THREE.OctahedronGeometry(2.25, 0);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0xf6851b,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeo, wireframeMat);
    scene.add(wireframeMesh);

    // Floating particles
    const particlesCount = 120;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 16;
    }
    const particlesGeom = new THREE.BufferGeometry();
    particlesGeom.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.06,
      color: 0xf6851b,
      transparent: true,
      opacity: 0.8,
    });
    const particlesMesh = new THREE.Points(particlesGeom, particlesMat);
    scene.add(particlesMesh);

    camera.position.z = 7.5;

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      ethLogo.rotation.y += 0.008;
      ethLogo.rotation.z += 0.004;
      wireframeMesh.rotation.y += 0.008;
      wireframeMesh.rotation.z += 0.004;

      ethLogo.position.y = Math.sin(Date.now() * 0.0015) * 0.25;
      wireframeMesh.position.y = ethLogo.position.y;

      particlesMesh.rotation.y += 0.0008;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full min-h-[450px]" />;
}
