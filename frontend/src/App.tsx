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
