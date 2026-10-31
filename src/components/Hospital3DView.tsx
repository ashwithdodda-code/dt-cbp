import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Department } from '../types';
import { RotateCw, ZoomIn, ZoomOut, Eye, Layers } from 'lucide-react';

interface Hospital3DViewProps {
  departments: Department[];
  selectedDeptId: string | null;
  onSelectDepartment: (deptId: string | null) => void;
  heightClass?: string;
}

export const Hospital3DView: React.FC<Hospital3DViewProps> = ({
  departments,
  selectedDeptId,
  onSelectDepartment,
  heightClass = 'h-96 md:h-[460px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredDept, setHoveredDept] = useState<Department | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // References to keep callbacks and state fresh without re-mounting Three.js
  const deptsRef = useRef(departments);
  deptsRef.current = departments;
  const onSelectRef = useRef(onSelectDepartment);
  onSelectRef.current = onSelectDepartment;
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(document.documentElement.classList.contains('dark') ? 0x0b1120 : 0xf8fafc);

    // 2. Camera setup (Isometric-style perspective)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(28, 24, 28);
    camera.lookAt(0, 2, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x38bdf8, 2, 50);
    blueLight.position.set(-15, 10, -15);
    scene.add(blueLight);

    // 5. Hospital Campus Ground Base
    const groundGeo = new THREE.CylinderGeometry(20, 20.5, 0.8, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: document.documentElement.classList.contains('dark') ? 0x1e293b : 0xe2e8f0,
      roughness: 0.8,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.4;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper overlay on the base
    const grid = new THREE.GridHelper(36, 18, 0x64748b, 0x94a3b8);
    grid.position.y = 0.02;
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    // 6. Central Corridor / Hub
    const hubGeo = new THREE.CylinderGeometry(2.5, 2.8, 5, 16);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.3,
      roughness: 0.4,
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(0, 2.5, 0);
    hub.castShadow = true;
    hub.receiveShadow = true;
    scene.add(hub);

    // Heliport on Central Hub
    const heliGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.2, 16);
    const heliMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const heli = new THREE.Mesh(heliGeo, heliMat);
    heli.position.set(0, 5.1, 0);
    scene.add(heli);

    // 7. Department Pavilions (Buildings)
    interface DeptMeshInfo {
      dept: Department;
      group: THREE.Group;
      buildingMesh: THREE.Mesh;
      glowRing: THREE.Mesh;
      baseColor: number;
    }

    const deptMeshes: DeptMeshInfo[] = [];

    // Layout configuration in campus circle
    // Layout configuration in campus circle (Telangana Hospital Wings)
    const layout = [
      { code: 'CASUALTY', altCode: 'ED', angle: 0, radius: 9, width: 4.8, depth: 4.5, height: 5.2, color: 0xef4444 },
      { code: 'DERM', altCode: 'DERM', angle: (2 * Math.PI) / 6, radius: 9.2, width: 4.0, depth: 4.0, height: 4.2, color: 0xec4899 },
      { code: 'RADIO', altCode: 'RADIO', angle: (4 * Math.PI) / 6, radius: 9.5, width: 4.4, depth: 4.4, height: 4.8, color: 0x6366f1 },
      { code: 'ICU', altCode: 'ICU', angle: (6 * Math.PI) / 6, radius: 9.5, width: 4.2, depth: 4.2, height: 6.8, color: 0xdc2626 },
      { code: 'GENMED', altCode: 'MEDSURG', angle: (8 * Math.PI) / 6, radius: 10, width: 5.5, depth: 5.0, height: 7.2, color: 0x0ea5e9 },
      { code: 'SURGERY', altCode: 'SURGERY', angle: (10 * Math.PI) / 6, radius: 9.2, width: 4.6, depth: 4.4, height: 6.0, color: 0xf59e0b },
    ];

    layout.forEach((cfg) => {
      const dept = deptsRef.current.find((d) => d.code === cfg.code || d.code === cfg.altCode) || {
        id: `dept_${cfg.code.toLowerCase()}`,
        name: cfg.code,
        code: cfg.code,
        total_beds: 20,
        baseline_staff: 10,
        surge_threshold_pct: 85,
        color: '#' + cfg.color.toString(16),
        occupancyPct: 75,
        availableBeds: 5,
        occupiedBeds: 15,
      };

      const posX = Math.cos(cfg.angle) * cfg.radius;
      const posZ = Math.sin(cfg.angle) * cfg.radius;

      const group = new THREE.Group();
      group.position.set(posX, 0, posZ);

      // Building Box
      const occPct = dept.occupancyPct || 70;
      let statusColor = 0x10b981; // Green
      if (occPct >= 85) statusColor = 0xef4444; // Red
      else if (occPct >= 75) statusColor = 0xf59e0b; // Amber

      const buildingGeo = new THREE.BoxGeometry(cfg.width, cfg.height, cfg.depth);
      const buildingMat = new THREE.MeshStandardMaterial({
        color: statusColor,
        roughness: 0.35,
        metalness: 0.25,
        transparent: true,
        opacity: 0.92,
      });
      const building = new THREE.Mesh(buildingGeo, buildingMat);
      building.position.y = cfg.height / 2;
      building.castShadow = true;
      building.receiveShadow = true;
      group.add(building);

      // Glass Windows Strip
      const windowGeo = new THREE.BoxGeometry(cfg.width * 1.02, 0.4, cfg.depth * 1.02);
      const windowMat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.3,
        roughness: 0.1,
      });
      for (let floorY = 1.2; floorY < cfg.height; floorY += 1.4) {
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.y = floorY;
        group.add(win);
      }

      // Ground status indicator pulse ring
      const ringGeo = new THREE.RingGeometry(2.8, 3.4, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: statusColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const glowRing = new THREE.Mesh(ringGeo, ringMat);
      glowRing.position.y = 0.05;
      group.add(glowRing);

      // Connecting Skyway bridge to Central Hub
      const bridgeDist = Math.sqrt(posX * posX + posZ * posZ) - 2.5 - cfg.width / 2;
      const bridgeGeo = new THREE.BoxGeometry(1.2, 0.9, bridgeDist);
      const bridgeMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.4,
        transparent: true,
        opacity: 0.85,
      });
      const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
      const midX = posX * 0.45;
      const midZ = posZ * 0.45;
      bridge.position.set(midX - posX, 2.2, midZ - posZ);
      bridge.lookAt(new THREE.Vector3(-posX, 2.2, -posZ));
      group.add(bridge);

      // 3D Bed clusters on top of roof
      const bedMarkerGeo = new THREE.SphereGeometry(0.35, 12, 12);
      const bedMarkerMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: statusColor,
        emissiveIntensity: 0.7,
      });
      const bedMarker = new THREE.Mesh(bedMarkerGeo, bedMarkerMat);
      bedMarker.position.set(0, cfg.height + 0.5, 0);
      group.add(bedMarker);

      // Metadata for raycasting
      building.userData = { deptId: dept.id, code: dept.code, name: dept.name };

      scene.add(group);
      deptMeshes.push({
        dept: dept as Department,
        group,
        buildingMesh: building,
        glowRing,
        baseColor: statusColor,
      });
    });

    // 8. Particle System (Animated Patient/Resource flow stream)
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let p = 0; p < particleCount; p++) {
      const angle = (p / particleCount) * Math.PI * 2;
      const r = 5.5 + (Math.random() - 0.5) * 3;
      positions[p * 3] = Math.cos(angle) * r;
      positions[p * 3 + 1] = 2.2 + (Math.random() - 0.5) * 0.8;
      positions[p * 3 + 2] = Math.sin(angle) * r;
      particleSpeeds[p] = 0.015 + Math.random() * 0.02;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.4,
      transparent: true,
      opacity: 0.85,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 9. Mouse Interaction & Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let sceneAngle = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isMouseDown) {
        const deltaX = e.clientX - prevMouseX;
        sceneAngle += deltaX * 0.008;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }

      // Raycast against buildings
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(deptMeshes.map((m) => m.buildingMesh));
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const hitDept = deptMeshes.find((m) => m.buildingMesh === hit);
        if (hitDept) {
          setHoveredDept(hitDept.dept);
          container.style.cursor = 'pointer';
        }
      } else {
        setHoveredDept(null);
        container.style.cursor = 'default';
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerUp = (e: MouseEvent) => {
      isMouseDown = false;
      // Click selection
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(deptMeshes.map((m) => m.buildingMesh));
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const hitDept = deptMeshes.find((m) => m.buildingMesh === hit);
        if (hitDept) {
          onSelectRef.current(hitDept.dept.id);
        }
      }
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);

    // 10. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Slow idle orbit if autoRotate is true and user is not dragging
      if (autoRotateRef.current && !isMouseDown) {
        sceneAngle += 0.003;
      }

      // Rotate scene root
      const radius = 38 / zoomLevel;
      camera.position.x = Math.sin(sceneAngle) * radius;
      camera.position.z = Math.cos(sceneAngle) * radius;
      camera.position.y = 22 / Math.sqrt(zoomLevel);
      camera.lookAt(0, 2.5, 0);

      // Pulse the status rings
      deptMeshes.forEach((item, idx) => {
        const scale = 1 + Math.sin(elapsedTime * 3 + idx) * 0.06;
        item.glowRing.scale.set(scale, scale, 1);
      });

      // Animate patient resource particles
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const currentX = posArray[i * 3];
        const currentZ = posArray[i * 3 + 2];
        let currentAngle = Math.atan2(currentZ, currentX);
        currentAngle += particleSpeeds[i];
        const r = Math.sqrt(currentX * currentX + currentZ * currentZ);
        posArray[i * 3] = Math.cos(currentAngle) * r;
        posArray[i * 3 + 2] = Math.sin(currentAngle) * r;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [zoomLevel]);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors`}>
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Viewport Overlay Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Layers className="w-3.5 h-3.5 text-teal-500" />
          <span>Interactive 3D Hospital Twin</span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50">
          Drag to orbit • Click ward to filter
        </div>
      </div>

      {/* Floating Controls (Zoom & Auto Rotate) */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl shadow-md border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2 rounded-lg text-xs transition-colors ${
            autoRotate ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle Auto Rotation"
          aria-label="Toggle Auto Rotation"
        >
          <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.0))}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        {selectedDeptId && (
          <button
            onClick={() => onSelectDepartment(null)}
            className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Live Hover Telemetry Card */}
      {hoveredDept && (
        <div className="absolute top-4 right-4 z-20 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredDept.color }} />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{hoveredDept.name}</h4>
            </div>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              {hoveredDept.code}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Occupancy</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {(hoveredDept.occupancyPct || 0).toFixed(0)}%
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Open Beds</span>
              <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                {hoveredDept.availableBeds ?? 4}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Surge Threshold: {hoveredDept.surge_threshold_pct}%</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Click to Inspect
            </span>
          </div>
        </div>
      )}

      {/* Legend Indicator */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Optimal (&lt;75%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Elevated (75-85%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Surge Risk (&gt;85%)
        </span>
      </div>
    </div>
  );
};
