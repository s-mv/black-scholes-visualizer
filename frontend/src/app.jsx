import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faSyncAlt, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import Papa from 'papaparse';
import { BlackScholes, OptionType } from './pkg/black_scholes.js';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale, } from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale);

let wasmModule = null;

export const App = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const frameRef = useRef(null);

  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [csvFile, setCsvFile] = useState(null);

  const [params, setParams] = useState({
    spotPrice: 100,
    strikePrice: 105,
    timeToExpiry: 0.25,
    riskFreeRate: 0.05,
    volatility: 0.2
  });

  const [vizSettings, setVizSettings] = useState({
    xAxis: 'spotPrice',
    yAxis: 'volatility',
    zAxis: 'timeToExpiry',
    optionType: 'Call',
    showGreeks: false,
    gridSize: 50
  });

  const paramLabels = {
    spotPrice: 'Spot Price',
    strikePrice: 'Strike Price',
    timeToExpiry: 'Time to Expiry',
    riskFreeRate: 'Risk-Free Rate',
    volatility: 'Volatility'
  };

  const paramRanges = {
    spotPrice: { min: 50, max: 200, step: 1 },
    strikePrice: { min: 50, max: 200, step: 1 },
    timeToExpiry: { min: 0.01, max: 2, step: 0.01 },
    riskFreeRate: { min: 0, max: 0.2, step: 0.001 },
    volatility: { min: 0.01, max: 1, step: 0.01 }
  };

  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    setWasmLoaded(true);
  }, []);

  useEffect(() => {
    if (!mountRef.current || !wasmLoaded) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f23);

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
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

    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);

    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(10);
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

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

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
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [wasmLoaded]);

  const generateSurfaceData = () => {
    const { xAxis, yAxis, zAxis, gridSize } = vizSettings;
    const xRange = paramRanges[xAxis];
    const yRange = paramRanges[yAxis];
    const zRange = paramRanges[zAxis];

    const points = [];
    const xStep = (xRange.max - xRange.min) / gridSize;
    const yStep = (yRange.max - yRange.min) / gridSize;
    const zStep = (zRange.max - zRange.min) / gridSize;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        for (let k = 0; k <= Math.max(5, gridSize / 6); k++) {
          const xVal = xRange.min + i * xStep;
          const yVal = yRange.min + j * yStep;
          const zVal = zRange.min + k * zStep;

          const currentParams = { ...params };
          currentParams[xAxis] = xVal;
          currentParams[yAxis] = yVal;
          currentParams[zAxis] = zVal;

          if (currentParams.timeToExpiry <= 0 || currentParams.volatility <= 0 || currentParams.spotPrice <= 0) {
            continue;
          }

          try {
            const bs = new BlackScholes(
              currentParams.spotPrice,
              currentParams.strikePrice,
              currentParams.timeToExpiry,
              currentParams.riskFreeRate,
              currentParams.volatility
            );

            const optionType = vizSettings.optionType === 'Call' ? OptionType.Call : OptionType.Put;
            const price = bs.price(optionType);

            if (isFinite(price) && price >= 0) {
              points.push({
                [xAxis]: xVal,
                [yAxis]: yVal,
                [zAxis]: zVal,
                spotPrice: currentParams.spotPrice,
                strikePrice: currentParams.strikePrice,
                timeToExpiry: currentParams.timeToExpiry,
                riskFreeRate: currentParams.riskFreeRate,
                volatility: currentParams.volatility,
                price: price
              });
            }
          } catch (error) {
            continue;
          }
        }
      }
    }

    return points;
  };

  const updateSurface = () => {
    if (!sceneRef.current || !wasmLoaded) return;

    setLoading(true);

    setTimeout(() => {
      const points = data.length > 0 ? data : generateSurfaceData();

      if (meshRef.current) {
        sceneRef.current.remove(meshRef.current);
      }

      if (points.length === 0) {
        setLoading(false);
        return;
      }

      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];

      const prices = points.map(p => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice || 1;

      points.forEach((point) => {
        const xRange = paramRanges[vizSettings.xAxis];
        const yRange = paramRanges[vizSettings.yAxis];
        const zRange = paramRanges[vizSettings.zAxis];

        const x = (point[vizSettings.xAxis] - (xRange.min + xRange.max) / 2) / ((xRange.max - xRange.min) / 20);
        const y = (point[vizSettings.yAxis] - (yRange.min + yRange.max) / 2) / ((yRange.max - yRange.min) / 20);
        const z = (point[vizSettings.zAxis] - (zRange.min + zRange.max) / 2) / ((zRange.max - zRange.min) / 20);

        positions.push(x, y, z);

        const normalizedPrice = (point.price - minPrice) / priceRange;
        const hue = (1 - normalizedPrice) * 0.7;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
        colors.push(color.r, color.g, color.b);
      });

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
    }, 100);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setLoading(true);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const processedData = results.data.map(row => {
          const x = row[vizSettings.xAxis] || 0;
          const y = row[vizSettings.yAxis] || 0;
          const price = row.optionPrice || 0;

          const xRange = paramRanges[vizSettings.xAxis];
          const yRange = paramRanges[vizSettings.yAxis];

          return {
            x: (x - (xRange.min + xRange.max) / 2) / ((xRange.max - xRange.min) / 20),
            y: price / 10,
            z: (y - (yRange.min + yRange.max) / 2) / ((yRange.max - yRange.min) / 20),
            price: price,
            xParam: x,
            yParam: y
          };
        }).filter(point => !isNaN(point.price));

        setData(processedData);
        setLoading(false);
      },
      error: (error) => {
        setLoading(false);
      }
    });
  };

  const generateRandomData = () => {
    setLoading(true);

    setTimeout(() => {
      const randomPoints = [];
      const timeSteps = 100;
      const initialPrice = params.spotPrice;
      const drift = params.riskFreeRate;
      const volatility = params.volatility;
      const dt = params.timeToExpiry / timeSteps;

      let currentPrice = initialPrice;

      for (let i = 0; i < timeSteps; i++) {
        const randomShock = Math.random() * 2 - 1;
        const priceChange = drift * currentPrice * dt + volatility * currentPrice * Math.sqrt(dt) * randomShock;
        currentPrice += priceChange;

        randomPoints.push({
          x: i * dt,
          y: currentPrice,
          price: currentPrice
        });
      }

      setData(randomPoints);
      setLoading(false);
    }, 100);
  };

  useEffect(() => {
    if (wasmLoaded) {
      updateSurface();
    }
  }, [params, vizSettings, data, wasmLoaded]);

  const get2DGraphData = () => {
    const labels = data.map((point, index) => `${index + 1}`);
    const prices = data.map((point) => point.price);

    return {
      labels,
      datasets: [
        {
          label: 'Option Price',
          data: prices,
          borderColor: theme === 'dark' ? '#4F46E5' : '#3B82F6',
          backgroundColor: theme === 'dark' ? '#4F46E5' : '#3B82F6',
          tension: 0.4,
          fill: false
        }
      ]
    };
  };

  const graphOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: theme === 'dark' ? '#FFFFFF' : '#000000'
        }
      },
      tooltip: {
        enabled: true
      }
    },
    scales: {
      x: {
        ticks: {
          color: theme === 'dark' ? '#FFFFFF' : '#000000'
        }
      },
      y: {
        ticks: {
          color: theme === 'dark' ? '#FFFFFF' : '#000000'
        }
      }
    }
  };

  if (!wasmLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Black-Scholes WASM module...</div>
      </div>
    );
  }

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} min-h-screen`}>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Black-Scholes Options Visualizer</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4 overflow-y-auto h-[calc(100vh-100px)] p-2 border rounded">
            <div className={`border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} rounded p-3`}>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <FontAwesomeIcon icon={faUpload} className="mr-2" />
                Data Source
              </h3>
              <label className="block">
                <span className="text-sm">Upload CSV File</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className={`mt-1 block w-full text-sm ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'} border rounded`}
                />
              </label>
              <button
                onClick={generateRandomData}
                disabled={loading}
                className={`mt-3 w-full px-4 py-2 rounded ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} flex items-center justify-center`}
              >
                <FontAwesomeIcon icon={faSyncAlt} className="mr-2" />
                Generate Random Data
              </button>
            </div>

            <div className={`border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} rounded p-3`}>
              <h3 className="text-lg font-semibold mb-3">Parameters</h3>
              {Object.entries(params).map(([key, value]) => (
                <label key={key} className="block mb-2">
                  <span className="text-sm">{paramLabels[key]}</span>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setParams((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                    min={paramRanges[key].min}
                    max={paramRanges[key].max}
                    step={paramRanges[key].step}
                    className={`mt-1 block w-full px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'} border`}
                  />
                </label>
              ))}
            </div>

            <div className={`border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} rounded p-3`}>
              <h3 className="text-lg font-semibold mb-3">Visualization</h3>
              <label className="block mb-2">
                <span className="text-sm">X-Axis</span>
                <select
                  value={vizSettings.xAxis}
                  onChange={(e) => setVizSettings((prev) => ({ ...prev, xAxis: e.target.value }))}
                  className={`mt-1 block w-full px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'} border`}
                >
                  {Object.keys(paramLabels).map((key) => (
                    <option key={key} value={key}>
                      {paramLabels[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block mb-2">
                <span className="text-sm">Y-Axis</span>
                <select
                  value={vizSettings.yAxis}
                  onChange={(e) => setVizSettings((prev) => ({ ...prev, yAxis: e.target.value }))}
                  className={`mt-1 block w-full px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'} border`}
                >
                  {Object.keys(paramLabels).map((key) => (
                    <option key={key} value={key}>
                      {paramLabels[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block mb-2">
                <span className="text-sm">Z-Axis</span>
                <select
                  value={vizSettings.zAxis}
                  onChange={(e) => setVizSettings((prev) => ({ ...prev, zAxis: e.target.value }))}
                  className={`mt-1 block w-full px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'} border`}
                >
                  {Object.keys(paramLabels).map((key) => (
                    <option key={key} value={key}>
                      {paramLabels[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm">Grid Resolution</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={vizSettings.gridSize}
                  onChange={(e) => setVizSettings((prev) => ({ ...prev, gridSize: parseInt(e.target.value) }))}
                  className="mt-1 block w-full"
                />
                <span className="text-xs">{vizSettings.gridSize} points</span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} rounded p-3 h-[400px] relative`}>
              <div ref={mountRef} className="w-full h-full rounded" />
              {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                  <div className="text-white text-xl">Generating surface...</div>
                </div>
              )}
            </div>

            <div className={`border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} rounded p-3 h-[300px]`}>
              <h3 className="text-lg font-semibold mb-3">Price Over Time</h3>
              {data.length > 0 ? (
                <div className="w-full h-full">
                  <Line data={get2DGraphData()} options={graphOptions} />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-sm">No data available to display.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={toggleTheme}
        className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'}`}
      >
        <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
      </button>
    </div>
  );
};
