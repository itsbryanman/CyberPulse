import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';
import { ThreatEvent, LiveMapProps } from '../types/ThreatEvent';

const LiveMap: React.FC<LiveMapProps> = ({ 
  threats, 
  onThreatClick, 
  showAnimations = true, 
  autoRotate = true 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const globeRef = useRef<THREE.Mesh>();
  const wireframeRef = useRef<THREE.Mesh>();
  const atmosphereRef = useRef<THREE.Mesh>();
  const threatMarkersRef = useRef<THREE.Group>();
  const animationIdRef = useRef<number>();

  const [isLoading, setIsLoading] = useState(true);
  const [worldData, setWorldData] = useState<any>(null);
  const worldMapRef = useRef<THREE.Group>();

  // Load world map data
  useEffect(() => {
    fetch('/world-countries.json')
      .then(response => response.json())
      .then(data => {
        setWorldData(data);
      })
      .catch(error => {
        console.error('Error loading world map data:', error);
      });
  }, []);

  // Convert GeoJSON coordinates to 3D globe coordinates
  const geoJsonToSphere = React.useCallback((coordinates: number[][], radius: number = 1.01) => {
    const points: THREE.Vector3[] = [];
    coordinates.forEach(coord => {
      const [lng, lat] = coord;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      
      points.push(new THREE.Vector3(x, y, z));
    });
    return points;
  }, []);

  // Create world map geometry
  const createWorldMap = React.useCallback((geoData: any) => {
    const worldGroup = new THREE.Group();
    
    geoData.features.forEach((feature: any) => {
      const geometry = feature.geometry;
      
      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach((ring: number[][]) => {
          const points = geoJsonToSphere(ring);
          if (points.length > 2) {
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const lineMaterial = new THREE.LineBasicMaterial({
              color: 0x4a90e2,
              transparent: true,
              opacity: 0.8,
              linewidth: 1
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            worldGroup.add(line);
          }
        });
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: number[][][]) => {
          polygon.forEach((ring: number[][]) => {
            const points = geoJsonToSphere(ring);
            if (points.length > 2) {
              const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
              const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x4a90e2,
                transparent: true,
                opacity: 0.8,
                linewidth: 1
              });
              const line = new THREE.Line(lineGeometry, lineMaterial);
              worldGroup.add(line);
            }
          });
        });
      }
    });
    
    return worldGroup;
  }, [geoJsonToSphere]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000511);
    sceneRef.current = scene;

    // Add stars background
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
    const starsVertices = [];
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Globe geometry and material - Semi-transparent so you can see through
    const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Create semi-transparent Earth base
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0x4488bb,
      emissive: 0x112233,
      shininess: 0.6,
      transparent: true,
      opacity: 0.3  // Very transparent so you can see threats on other side
    });
    
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);
    globeRef.current = globe;

    // Add detailed geographic grid (latitude/longitude lines)
    const createLatLongLines = () => {
      const group = new THREE.Group();
      
      // Latitude lines (horizontal)
      for (let lat = -80; lat <= 80; lat += 20) {
        const phi = (90 - lat) * (Math.PI / 180);
        const radius = Math.sin(phi);
        const y = Math.cos(phi);
        
        const geometry = new THREE.RingGeometry(radius * 0.99, radius * 1.01, 64, 1);
        const material = new THREE.MeshBasicMaterial({
          color: 0x00ffaa,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(geometry, material);
        ring.position.y = y;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }
      
      // Longitude lines (vertical)
      for (let lng = 0; lng < 360; lng += 30) {
        const curve = new THREE.EllipseCurve(0, 0, 1, 1, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(
          points.map(p => new THREE.Vector3(
            Math.cos(lng * Math.PI / 180) * p.x,
            p.y,
            Math.sin(lng * Math.PI / 180) * p.x
          ))
        );
        const material = new THREE.LineBasicMaterial({
          color: 0x00ffaa,
          transparent: true,
          opacity: 0.2
        });
        const line = new THREE.Line(geometry, material);
        group.add(line);
      }
      
      return group;
    };
    
    const geoGrid = createLatLongLines();
    scene.add(geoGrid);
    wireframeRef.current = geoGrid;

    // Add world map if data is available
    if (worldData) {
      const worldMap = createWorldMap(worldData);
      scene.add(worldMap);
      worldMapRef.current = worldMap;
    }

    // Add atmospheric glow effect
    const atmosphereGeometry = new THREE.SphereGeometry(1.1, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x0099ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);
    atmosphereRef.current = atmosphere;

    // Threat markers group
    const threatMarkersGroup = new THREE.Group();
    scene.add(threatMarkersGroup);
    threatMarkersRef.current = threatMarkersGroup;

    // Enhanced lighting for better visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, -3, -5);
    scene.add(pointLight);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      if (autoRotate && globe) {
        globe.rotation.y += 0.005;
        if (wireframeRef.current) wireframeRef.current.rotation.y += 0.003; // Slower grid rotation
        if (worldMapRef.current) worldMapRef.current.rotation.y += 0.005; // Same speed as globe
        if (atmosphereRef.current) atmosphereRef.current.rotation.y += 0.002;
      }

      renderer.render(scene, camera);
    };

    animate();
    setIsLoading(false);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [autoRotate]);

  // Add world map when data is loaded
  useEffect(() => {
    if (worldData && sceneRef.current && !worldMapRef.current) {
      const worldMap = createWorldMap(worldData);
      sceneRef.current.add(worldMap);
      worldMapRef.current = worldMap;
    }
  }, [worldData, createWorldMap]);

  // Convert lat/lng to 3D coordinates
  const latLngToVector3 = (lat: number, lng: number, radius: number = 1) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  };

  // Get color based on threat severity
  const getSeverityColor = (severity: string): number => {
    switch (severity) {
      case 'critical': return 0xff0000;
      case 'high': return 0xff6600;
      case 'medium': return 0xffff00;
      case 'low': return 0x00ff00;
      default: return 0x0088ff;
    }
  };

  // Update threat markers
  useEffect(() => {
    if (!threatMarkersRef.current || !sceneRef.current) return;

    // Clear existing markers
    threatMarkersRef.current.clear();

    threats.forEach((threat) => {
      const position = latLngToVector3(
        threat.location.latitude,
        threat.location.longitude,
        1.02
      );

      // Create bright, visible threat marker
      const markerGeometry = new THREE.SphereGeometry(0.025, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: getSeverityColor(threat.severity),
        transparent: false,
        emissive: getSeverityColor(threat.severity),
        emissiveIntensity: 0.3
      });

      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(position);
      marker.userData = { threat };

      // Add outer glow ring
      const glowGeometry = new THREE.RingGeometry(0.03, 0.045, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: getSeverityColor(threat.severity),
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
      glowRing.position.copy(position);
      glowRing.lookAt(new THREE.Vector3(0, 0, 0));
      threatMarkersRef.current.add(glowRing);

      // Add a vertical beam/line for very visible threats
      if (threat.severity === 'critical' || threat.severity === 'high') {
        const beamGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.5, 8);
        const beamMaterial = new THREE.MeshBasicMaterial({
          color: getSeverityColor(threat.severity),
          transparent: true,
          opacity: 0.7
        });
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        
        // Position beam from surface to above
        const beamPosition = position.clone();
        beamPosition.multiplyScalar(1.25); // Extend outward from surface
        beam.position.copy(beamPosition);
        beam.lookAt(new THREE.Vector3(0, 0, 0));
        beam.rotateX(Math.PI / 2);
        threatMarkersRef.current.add(beam);
      }

      // Add pulsing animation for critical threats
      if (threat.severity === 'critical' && showAnimations) {
        const pulseGeometry = new THREE.RingGeometry(0.02, 0.04, 16);
        const pulseMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });

        const pulseRing = new THREE.Mesh(pulseGeometry, pulseMaterial);
        pulseRing.position.copy(position);
        pulseRing.lookAt(new THREE.Vector3(0, 0, 0));
        threatMarkersRef.current.add(pulseRing);

        // Animate pulse
        const animatePulse = () => {
          const time = Date.now() * 0.005;
          pulseRing.scale.setScalar(1 + Math.sin(time) * 0.3);
          pulseMaterial.opacity = 0.5 + Math.sin(time) * 0.3;
        };
        
        // Store animation function for cleanup
        (pulseRing as any).animatePulse = animatePulse;
      }

      threatMarkersRef.current.add(marker);
    });
  }, [threats, showAnimations]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;

      const width = mountRef.current?.clientWidth || window.innerWidth;
      const height = mountRef.current?.clientHeight || window.innerHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mouse interactions
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current || !onThreatClick) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = rendererRef.current!.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current!);
      
      if (threatMarkersRef.current) {
        const intersects = raycaster.intersectObjects(threatMarkersRef.current.children);
        
        if (intersects.length > 0) {
          const clicked = intersects[0].object;
          if (clicked.userData && clicked.userData.threat) {
            onThreatClick(clicked.userData.threat);
          }
        }
      }
    };

    rendererRef.current.domElement.addEventListener('click', handleClick);
    
    return () => {
      rendererRef.current?.domElement.removeEventListener('click', handleClick);
    };
  }, [onThreatClick]);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        backgroundColor: '#0a0a0a'
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif'
        }}>
          Loading Globe...
        </div>
      )}
      
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid #00ffaa'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>🌍 Global Threat Monitor</div>
        <div>Active Threats: <span style={{ color: '#00ffaa' }}>{threats.length}</span></div>
        <div style={{ marginTop: '8px' }}>
          <div style={{ color: '#ff0000', fontSize: '11px' }}>● Critical ({threats.filter(t => t.severity === 'critical').length})</div>
          <div style={{ color: '#ff6600', fontSize: '11px' }}>● High ({threats.filter(t => t.severity === 'high').length})</div>
          <div style={{ color: '#ffff00', fontSize: '11px' }}>● Medium ({threats.filter(t => t.severity === 'medium').length})</div>
          <div style={{ color: '#00ff00', fontSize: '11px' }}>● Low ({threats.filter(t => t.severity === 'low').length})</div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '10px', color: '#aaa' }}>
          💡 Globe is semi-transparent<br/>to see threats worldwide
        </div>
      </div>
      
      {/* Mini-map overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '200px',
        height: '120px',
        background: 'rgba(0, 20, 40, 0.9)',
        border: '1px solid #00ffaa',
        borderRadius: '8px',
        padding: '10px'
      }}>
        <div style={{ color: 'white', fontSize: '10px', marginBottom: '5px', textAlign: 'center' }}>🗺️ World View</div>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '90px',
          background: 'linear-gradient(180deg, #001122 0%, #003366 100%)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          {/* Simplified world map with threat dots */}
          {threats.map((threat, index) => {
            // Convert lat/lng to 2D map coordinates
            const x = ((threat.location.longitude + 180) / 360) * 180;
            const y = ((90 - threat.location.latitude) / 180) * 90;
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y}px`,
                  width: '4px',
                  height: '4px',
                  backgroundColor: threat.severity === 'critical' ? '#ff0000' :
                                 threat.severity === 'high' ? '#ff6600' :
                                 threat.severity === 'medium' ? '#ffff00' : '#00ff00',
                  borderRadius: '50%',
                  boxShadow: `0 0 6px ${threat.severity === 'critical' ? '#ff0000' :
                                        threat.severity === 'high' ? '#ff6600' :
                                        threat.severity === 'medium' ? '#ffff00' : '#00ff00'}`,
                  animation: threat.severity === 'critical' ? 'pulse 1s infinite' : 'none'
                }}
              />
            );
          })}
          {/* Grid lines for the mini-map */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(0,255,170,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,255,170,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '30px 15px'
          }} />
        </div>
      </div>
      
      {/* Add CSS animation for pulsing */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};


export default LiveMap;