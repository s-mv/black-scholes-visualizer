import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { BlackScholes, OptionType } from './pkg/black_scholes.js';

export const ThreeScene = ({ params, data, vizSettings, loading, setLoading }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f23);

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 10_000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);

    const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    let mouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseDown = (event) => {
      mouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleMouseUp = () => {
      mouseDown = false;
    };

    const handleMouseMove = (event) => {
      if (!mouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      const spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);
      spherical.theta -= deltaX * 0.01;
      spherical.phi += deltaY * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);

      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleWheel = (event) => {
      const zoomFactor = 1.1;
      if (event.deltaY < 0) {
        camera.position.multiplyScalar(1 / zoomFactor);
      } else {
        camera.position.multiplyScalar(zoomFactor);
      }
      camera.lookAt(0, 0, 0);
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('wheel', handleWheel);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    const updateSurface = () => {
      setLoading(true);

      const xMin = -5;
      const xMax = 5;

      const yPrices = data.map(point => point.price);
      const yMin = Math.min(...yPrices) * 0.9;
      const yMax = Math.max(...yPrices) * 1.1;
      const yMid = (yMin + yMax) / 2;
      const yMinCentered = yMin - yMid;
      const yMaxCentered = yMax - yMid;

      const gridSize = vizSettings.gridSize;

      const xStep = (xMax - xMin) / gridSize;
      const yStep = (yMaxCentered - yMinCentered) / gridSize;

      const points = [];
      const positions = [];
      const colors = [];

      for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
          const expiry = xMin + i * xStep;
          const stockPrice = yMinCentered + j * yStep;

          if (stockPrice <= 0) continue;

          try {
            const bs = new BlackScholes(
              stockPrice + yMid,
              params.strikePrice,
              expiry + 5,
              params.riskFreeRate,
              params.volatility
            );

            const callPrice = bs.price(OptionType.Call);

            if (isFinite(callPrice) && callPrice >= 0) {
              points.push({ expiry, stockPrice, callPrice });

              const x = expiry;
              const y = stockPrice;
              const z = callPrice;

              positions.push(x, y, z);

              const normalizedPrice = (callPrice - 0) / (yMaxCentered - yMinCentered || 1);
              const hue = (1 - normalizedPrice) * 0.7;
              const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
              colors.push(color.r, color.g, color.b);
            }
          } catch (error) {
            continue;
          }
        }
      }

      if (meshRef.current) {
        sceneRef.current.remove(meshRef.current);
      }

      if (points.length === 0) {
        setLoading(false);
        return;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
      });

      const mesh = new THREE.Points(geometry, material);
      meshRef.current = mesh;
      sceneRef.current.add(mesh);

      setLoading(false);
    };

    updateSurface();
  }, [params, data, vizSettings]);

  return <div ref={mountRef} className="w-full h-full rounded" />;
};
