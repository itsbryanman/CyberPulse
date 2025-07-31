codex/create-initial-files-and-implement-apis
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { fetchThreats } from './api';
import { Threat } from './types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current as HTMLElement,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 20],
      zoom: 1.5,
    });

    fetchThreats().then((threats) => {
      threats.forEach((threat: Threat) => {
        new mapboxgl.Marker({ color: threat.severity === 'high' ? 'red' : 'yellow' })
          .setLngLat([parseFloat(threat.ip.split('.')[0]), parseFloat(threat.ip.split('.')[1])])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<strong>${threat.source}</strong><br/>${threat.type}<br/>${threat.ip}`
            )
          )
          .addTo(map);
      });
    });

    return () => {
      map.remove();
    };
  }, []);

  return <div ref={mapContainer} style={{ width: '100vw', height: '100vh' }} />;
}

export default App;
=======
import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import LiveMap from './components/LiveMap';
import { ThreatEvent } from './types/ThreatEvent';
import './App.css';

const App: React.FC = () => {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:8081');
    
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    });

    newSocket.on('threat:new', (threat: ThreatEvent) => {
      setThreats(prev => {
        // Keep only the last 1000 threats for performance
        const updated = [threat, ...prev];
        return updated.slice(0, 1000);
      });
    });

    newSocket.on('threat:update', (updatedThreat: ThreatEvent) => {
      setThreats(prev => 
        prev.map(t => t.id === updatedThreat.id ? updatedThreat : t)
      );
    });

    // Add some mock data for testing
    const mockThreats: ThreatEvent[] = [
      {
        id: '1',
        type: 'DDoS',
        severity: 'critical',
        location: { latitude: 40.7128, longitude: -74.0060 }, // New York
        timestamp: new Date().toISOString(),
        source: { ip: '192.168.1.1' },
        metadata: { description: 'Large scale DDoS attack detected' }
      },
      {
        id: '2',
        type: 'Malware',
        severity: 'high',
        location: { latitude: 51.5074, longitude: -0.1278 }, // London
        timestamp: new Date().toISOString(),
        source: { ip: '10.0.0.1' },
        metadata: { description: 'Malware payload identified' }
      },
      {
        id: '3',
        type: 'Phishing',
        severity: 'medium',
        location: { latitude: 35.6762, longitude: 139.6503 }, // Tokyo
        timestamp: new Date().toISOString(),
        source: { ip: '172.16.0.1' },
        metadata: { description: 'Phishing attempt detected' }
      }
    ];

    setThreats(mockThreats);
    setSocket(newSocket);

    // Simulate continuous threat updates
    const threatUpdateInterval = setInterval(() => {
      const newThreat: ThreatEvent = {
        id: `threat_${Date.now()}`,
        type: ['DDoS', 'Malware', 'Phishing', 'Ransomware', 'Intrusion'][Math.floor(Math.random() * 5)],
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
        location: {
          latitude: (Math.random() - 0.5) * 180, // Random latitude between -90 and 90
          longitude: (Math.random() - 0.5) * 360  // Random longitude between -180 and 180
        },
        timestamp: new Date().toISOString(),
        source: { ip: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}` },
        metadata: { description: `Automated threat detection at ${new Date().toLocaleTimeString()}` }
      };

      setThreats(prev => {
        const updated = [newThreat, ...prev];
        return updated.slice(0, 1000); // Keep only last 1000 threats
      });
    }, 2000); // Add new threat every 2 seconds

    return () => {
      newSocket.close();
      clearInterval(threatUpdateInterval);
    };
  }, []);

  const handleThreatClick = (threat: ThreatEvent) => {
    console.log('Threat clicked:', threat);
    // You can add more detailed threat information display here
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>CyberPulse - Global Threat Intelligence</h1>
        <div className="connection-status">
          Status: {isConnected ? 
            <span className="connected">Connected</span> : 
            <span className="disconnected">Disconnected</span>
          }
        </div>
      </header>
      
      <main className="app-main">
        <LiveMap 
          threats={threats}
          onThreatClick={handleThreatClick}
          showAnimations={true}
          autoRotate={true}
        />
      </main>
    </div>
  );
};

export default App;
main
