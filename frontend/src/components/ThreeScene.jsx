import { useEffect, useRef, useState } from 'preact/hooks'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export const getColor = (value, min, max) => {
  const normalizedValue = (value - min) / (max - min) // 0 to 1
  // Convert to RGB: 1 = green (0,255,0), 0 = red (255,0,0)
  return {
    r: Math.floor(255 * (1 - normalizedValue)),
    g: Math.floor(255 * normalizedValue),
    b: 0
  }
}

export const ThreeScene = ({ data, colorType, title, strikes, volatilities }) => {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Add fullscreen change event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      ));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const normalizeValue = (value, type) => {
    const val = parseFloat(value)
    switch(type) {
      case 'prices':
        return val / 40 // Normalize prices to 0-1 range
      case 'delta':
        return (val + 1) / 2 // Delta is in [-1, 1]
      case 'gamma':
        return val * 10 // Gamma is typically small
      case 'theta':
        return (val + 0.5) / 1 // Adjust theta range
      case 'vega':
        return val * 2 // Scale vega
      case 'rho':
        return (val + 0.5) / 1 // Adjust rho range
      default:
        return val
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Setup
    const width = containerRef.current.clientWidth
    const height = (width * 3) / 4 // 4:3 aspect ratio

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    containerRef.current.appendChild(renderer.domElement)

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)
    const pointLight = new THREE.PointLight(0xffffff, 1)
    pointLight.position.set(10, 10, 10)
    scene.add(pointLight)

    // Create terrain geometry with normalized heights
    const geometry = new THREE.PlaneGeometry(
      10,
      10,
      data[0].length - 1,
      data.length - 1
    )

    // Find data range for z-axis (height)
    let minVal = Infinity
    let maxVal = -Infinity
    data.forEach(row => {
      row.forEach(val => {
        const normalized = normalizeValue(val, colorType)
        minVal = Math.min(minVal, normalized)
        maxVal = Math.max(maxVal, normalized)
      })
    })

    // Get ranges for each axis
    const strikeRange = {
      min: Math.min(...strikes),
      max: Math.max(...strikes)
    }
    const volRange = {
      min: Math.min(...volatilities),
      max: Math.max(...volatilities)
    }
    const valueRange = {
      min: minVal,
      max: maxVal
    }

    // Update vertices with normalized heights
    const vertices = geometry.attributes.position.array
    for (let i = 0; i < vertices.length; i += 3) {
      const x = Math.floor(i / 3) % data[0].length
      const y = Math.floor(i / (3 * data[0].length))
      
      if (y < data.length && x < data[0].length) {
        const normalized = normalizeValue(data[y][x], colorType)
        // Scale height from 0 to 1
        vertices[i + 2] = (normalized - minVal) / (maxVal - minVal)
      }
    }

    geometry.computeVertexNormals()

    // Create color texture with normalized values
    const canvas = document.createElement('canvas')
    canvas.width = data[0].length
    canvas.height = data.length
    const ctx = canvas.getContext('2d')
    
    for (let y = 0; y < data.length; y++) {
      for (let x = 0; x < data[0].length; x++) {
        const normalized = normalizeValue(data[y][x], colorType)
        const color = getColor(normalized, minVal, maxVal)
        ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas)

    // Create mesh
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
      shininess: 50,
      specular: new THREE.Color(0x333333),
      transparent: true,
      opacity: 0.8
    })

    const mesh = new THREE.Mesh(geometry, material)
    
    // Add wireframe
    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({ 
        color: 0x000000,
        linewidth: 1,
        opacity: 0.3,
        transparent: true 
      })
    )
    
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(0, 0.5, 0) // Adjusted height to half unit up
    wireframe.rotation.x = -Math.PI / 2
    wireframe.position.set(0, 0.5, 0) // Match mesh position
    
    scene.add(mesh)
    scene.add(wireframe)

    // Create bounding box with actual dimensions
    const boxWidth = strikeRange.max - strikeRange.min
    const boxHeight = maxVal - minVal
    const boxDepth = volRange.max - volRange.min
    
    const boxGeometry = new THREE.BoxGeometry(10, 1, 10) // Keep same scale but update labels
    const edges = new THREE.EdgesGeometry(boxGeometry)
    const box = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x888888 })
    )
    box.position.set(0, 0.5, 0)
    scene.add(box)

    // Add grid helper below the surface
    const gridHelper = new THREE.GridHelper(10, 10)
    gridHelper.position.y = 0 // Grid stays at 0
    scene.add(gridHelper)

    // Add axes
    const axesHelper = new THREE.AxesHelper(5)
    axesHelper.position.y = 0
    scene.add(axesHelper)

    // Add axis labels
    const createLabel = (text, position) => {
      const dpr = window.devicePixelRatio || 1
      const canvas = document.createElement('canvas')
      canvas.width = 512 * dpr  // Increased from 256
      canvas.height = 128 * dpr  // Increased from 64
      
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.fillStyle = 'white'
      ctx.font = '48px -apple-system, Times, serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Enable font smoothing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // Draw text at the center of the scaled canvas
      ctx.fillText(text, canvas.width / (2 * dpr), canvas.height / (2 * dpr))
      
      const texture = new THREE.CanvasTexture(canvas)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      
      const material = new THREE.SpriteMaterial({ map: texture })
      const sprite = new THREE.Sprite(material)
      sprite.position.copy(position)
      sprite.scale.set(2, 1, 1)
      return sprite
    }

    // Add labels for axes
    const strikeLabel = createLabel(`Strike (${strikeRange.min.toFixed(2)}-${strikeRange.max.toFixed(2)})`, new THREE.Vector3(5.5, 0, 0))
    const volLabel = createLabel(`Vol (${volRange.min.toFixed(2)}-${volRange.max.toFixed(2)})`, new THREE.Vector3(0, 0, 5.5))
    const valueLabel = createLabel(`Value (${valueRange.min.toFixed(2)}-${valueRange.max.toFixed(2)})`, new THREE.Vector3(0, 3, 0))
    scene.add(strikeLabel)
    scene.add(volLabel)
    scene.add(valueLabel)

    // Create tick marks and labels
    const createTickMarks = (range, axis, count = 5) => {
      const group = new THREE.Group();
      const step = 10 / (count - 1); // 10 is our scene scale
      const valueStep = (range.max - range.min) / (count - 1);
      
      for (let i = 0; i < count; i++) {
        // Create tick mark
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const material = new THREE.MeshBasicMaterial({ color: 0xcccccc });
        const tick = new THREE.Mesh(geometry, material);
        
        // Position tick based on axis
        switch(axis) {
          case 'x': // Strike Price
            tick.position.set(-5 + i * step, 0, -5);
            break;
          case 'y': // Value
            tick.position.set(-5, i * 0.1, -5);
            break;
          case 'z': // Volatility
            tick.position.set(-5, 0, -5 + i * step);
            break;
        }
        
        // Create label for tick
        const value = (range.min + i * valueStep).toFixed(2);
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.width = 64 * dpr;
        canvas.height = 32 * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.fillStyle = 'white';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value, canvas.width/(2*dpr), canvas.height/(2*dpr));
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const labelMaterial = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMaterial);
        label.scale.set(0.5, 0.25, 1);
        
        // Position label next to tick
        switch(axis) {
          case 'x':
            label.position.set(-5 + i * step, -0.3, -5);
            break;
          case 'y':
            label.position.set(-5.5, i * 0.1, -5);
            break;
          case 'z':
            label.position.set(-5, -0.3, -5 + i * step);
            break;
        }
        
        group.add(tick);
        group.add(label);
      }
      
      return group;
    };

    // Add tick marks for each axis
    const xTicks = createTickMarks(strikeRange, 'x');
    const yTicks = createTickMarks(valueRange, 'y');
    const zTicks = createTickMarks({
      min: volRange.min * 100,
      max: volRange.max * 100
    }, 'z');
    
    scene.add(xTicks);
    scene.add(yTicks);
    scene.add(zTicks);

    // Setup camera and controls
    camera.position.set(8, 2, 8) // Adjusted camera height
    camera.lookAt(0, 0.5, 0) // Look at center of mesh
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, 0.5, 0) // Set orbit center to middle of mesh
    controls.minPolarAngle = 0 // Limit vertical rotation
    controls.maxPolarAngle = Math.PI / 2
    controls.minDistance = 5 // Limit zoom
    controls.maxDistance = 20

    // Animation loop
    function animate() {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }

    // Start animation
    animate()

    // Store scene reference for cleanup
    sceneRef.current = { scene, camera, renderer, controls }

    // Cleanup
    return () => {
      controls.dispose()
      renderer.dispose()
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [data, colorType])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return

      const { camera, renderer } = sceneRef.current
      const width = containerRef.current.clientWidth
      const height = isFullscreen 
        ? window.innerHeight 
        : (width * 3) / 4; // Use full height in fullscreen

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isFullscreen])

  return (
    <div 
      class={`relative ${isFullscreen ? 'w-screen h-screen' : 'w-full aspect-[4/3]'} 
        bg-gray-900 rounded-lg overflow-hidden`} 
      ref={containerRef}
    >
      <div class="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-2 bg-gradient-to-b from-black/50 to-transparent">
        <div class="text-white font-bold">{title}</div>
        <button
          onClick={toggleFullscreen}
          class="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-white"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5 4a1 1 0 0 0-1 1v3a1 1 0 0 1-2 0V5a3 3 0 0 1 3-3h3a1 1 0 0 1 0 2H5zm10 0h-3a1 1 0 0 1 0-2h3a3 3 0 0 1 3 3v3a1 1 0 1 1-2 0V5a1 1 0 0 0-1-1zM5 16a1 1 0 0 0 1-1v-3a1 1 0 1 1 2 0v3a3 3 0 0 1-3 3H2a1 1 0 1 1 0-2h3zm10 0h3a1 1 0 1 1 0 2h-3a3 3 0 0 1-3-3v-3a1 1 0 1 1 2 0v3a1 1 0 0 0 1 1z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 4a1 1 0 0 1 1-1h3a1 1 0 0 1 0 2H4v3a1 1 0 0 1-2 0V4zm13-1h-3a1 1 0 1 0 0 2h3v3a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1zM3 16a1 1 0 0 0 1 1h3a1 1 0 1 0 0-2H4v-3a1 1 0 1 0-2 0v3a1 1 0 0 0 1 1zm13 1h3a1 1 0 1 0 0-2h-3v-3a1 1 0 1 0-2 0v3a1 1 0 0 0 1 1z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
