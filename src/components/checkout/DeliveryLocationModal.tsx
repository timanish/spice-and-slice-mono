import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, Store, Navigation } from 'lucide-react';

interface DeliveryLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  distance: number;
}

const STORE_LOCATION = {
  address: '7451 N Beach St #172, Fort Worth, TX 76137',
  coordinates: [-97.2987, 32.9157] as [number, number], // [lng, lat]
};

export const DeliveryLocationModal = ({
  isOpen,
  onClose,
  deliveryAddress,
  distance,
}: DeliveryLocationModalProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
  } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!mapboxToken) {
      console.error("Mapbox token not found");
      setError("Map configuration error");
      return;
    }

    const initializeMap = () => {
      if (!mapContainer.current) {
        setTimeout(initializeMap, 100);
        return;
      }

    
      try {
        mapboxgl.accessToken = mapboxToken;
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: STORE_LOCATION.coordinates,
          zoom: 10,
          pitch: 0,
          bearing: 0,
          renderWorldCopies: false,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.once('load', () => {
          map.current!.addSource('store-marker', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: STORE_LOCATION.coordinates
                },
                properties: {
                  title: 'Store Location',
                  description: STORE_LOCATION.address
                }
              }]
            }
          });

          map.current!.addLayer({
            id: 'store-marker-circle',
            type: 'circle',
            source: 'store-marker',
            paint: {
              'circle-radius': 10,
              'circle-color': '#ef4444',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff'
            }
          });

          map.current!.on('click', 'store-marker-circle', (e: any) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
            const { title, description } = e.features[0].properties;
            
            new mapboxgl.Popup()
              .setLngLat(coordinates)
              .setHTML(`<div class="p-2">
                <p class="font-semibold">${title}</p>
                <p class="text-sm text-gray-600">${description}</p>
              </div>`)
              .addTo(map.current!);
          });

          map.current!.on('mouseenter', 'store-marker-circle', () => {
            map.current!.getCanvas().style.cursor = 'pointer';
          });
          map.current!.on('mouseleave', 'store-marker-circle', () => {
            map.current!.getCanvas().style.cursor = '';
          });

          map.current!.addSource('store-label', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: STORE_LOCATION.coordinates
                },
                properties: {
                  title: 'Spice & Slice Shop'
                }
              }]
            }
          });

          map.current!.addLayer({
            id: 'store-label-layer',
            type: 'symbol',
            source: 'store-label',
            layout: {
              'text-field': ['get', 'title'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 13,
              'text-offset': [0, -1.8],
              'text-anchor': 'bottom',
              'text-allow-overlap': true,
              'text-ignore-placement': true
            },
            paint: {
              'text-color': '#ef4444',
              'text-halo-color': '#ffffff',
              'text-halo-width': 2,
              'text-halo-blur': 1
            }
          });

          const fullAddress = `${deliveryAddress.line1}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postalCode}`;
          
          const geocodeAndShowRoute = async () => {
            setIsLoadingRoute(true);
            setError(null);
            try {
              const geocodeResponse = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                  fullAddress
                )}.json?access_token=${mapboxToken}&limit=1`
              );
              const geocodeData = await geocodeResponse.json();

              if (geocodeData.features && geocodeData.features.length > 0) {
                const deliveryCoordinates = geocodeData.features[0].center as [number, number];
                map.current!.addSource('delivery-marker', {
                  type: 'geojson',
                  data: {
                    type: 'FeatureCollection',
                    features: [{
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: deliveryCoordinates
                      },
                      properties: {
                        title: 'Delivery Location',
                        description: fullAddress
                      }
                    }]
                  }
                });

                map.current!.addLayer({
                  id: 'delivery-marker-circle',
                  type: 'circle',
                  source: 'delivery-marker',
                  paint: {
                    'circle-radius': 10,
                    'circle-color': '#22c55e',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#ffffff'
                  }
                });

                map.current!.on('click', 'delivery-marker-circle', (e: any) => {
                  const coordinates = e.features[0].geometry.coordinates.slice();
                  const { title, description } = e.features[0].properties;
                  
                  new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(`<div class="p-2">
                      <p class="font-semibold">${title}</p>
                      <p class="text-sm text-gray-600">${description}</p>
                    </div>`)
                    .addTo(map.current!);
                });

                map.current!.on('mouseenter', 'delivery-marker-circle', () => {
                  map.current!.getCanvas().style.cursor = 'pointer';
                });
                map.current!.on('mouseleave', 'delivery-marker-circle', () => {
                  map.current!.getCanvas().style.cursor = '';
                });

                map.current!.addSource('delivery-label', {
                  type: 'geojson',
                  data: {
                    type: 'FeatureCollection',
                    features: [{
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: deliveryCoordinates
                      },
                      properties: {
                        title: 'You'
                      }
                    }]
                  }
                });

                map.current!.addLayer({
                  id: 'delivery-label-layer',
                  type: 'symbol',
                  source: 'delivery-label',
                  layout: {
                    'text-field': ['get', 'title'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 13,
                    'text-offset': [0, -1.8],
                    'text-anchor': 'bottom',
                    'text-allow-overlap': true,
                    'text-ignore-placement': true
                  },
                  paint: {
                    'text-color': '#22c55e',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 2,
                    'text-halo-blur': 1
                  }
                });

                // Get driving route
                const routeResponse = await fetch(
                  `https://api.mapbox.com/directions/v5/mapbox/driving/${STORE_LOCATION.coordinates[0]},${STORE_LOCATION.coordinates[1]};${deliveryCoordinates[0]},${deliveryCoordinates[1]}?geometries=geojson&access_token=${mapboxToken}`
                );
                const routeData = await routeResponse.json();

                if (routeData.routes && routeData.routes.length > 0) {
                  const route = routeData.routes[0];
                  
                  setRouteInfo({
                    distance: route.distance / 1609.34, // Convert meters to miles
                    duration: route.duration / 60, // Convert seconds to minutes
                  });

                  map.current!.addSource('route', {
                    type: 'geojson',
                    data: {
                      type: 'Feature',
                      properties: {},
                      geometry: route.geometry,
                    },
                  });

                  map.current!.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: {
                      'line-join': 'round',
                      'line-cap': 'round',
                    },
                    paint: {
                      'line-color': '#3b82f6',
                      'line-width': 4,
                      'line-opacity': 0.8,
                    },
                  });

                  const bounds = new mapboxgl.LngLatBounds();
                  bounds.extend(STORE_LOCATION.coordinates);
                  bounds.extend(deliveryCoordinates);
                  
                  map.current!.fitBounds(bounds, {
                    padding: 100,
                    maxZoom: 13,
                  });
                }
              }
            } catch (error) {
              console.error('Error loading route:', error);
              setError('Failed to load route information');
            } finally {
              setIsLoadingRoute(false);
            }
          };

          geocodeAndShowRoute();
        });

  } catch (error) {
    console.error('Error initializing map:', error);
    setError('Failed to initialize map');
  }
};

setTimeout(initializeMap, 50);

return () => {
  if (map.current) {
    map.current.remove();
    map.current = null;
  }
};
}, [isOpen, deliveryAddress, mapboxToken]);

  const formatDistance = (miles: number) => {
    return `${miles.toFixed(1)} mi`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Delivery Route Preview
          </DialogTitle>
          <DialogDescription>
            See the exact route from our store to your delivery location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Map Container */}
          <div
            ref={mapContainer}
            className="w-full h-[500px] rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100"
            style={{ minHeight: '500px' }}
          />

          {/* Route Information */}
          {isLoadingRoute ? (
            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Loading route information...</p>
            </div>
          ) : error ? null : routeInfo ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <Navigation className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Distance</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatDistance(routeInfo.distance)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Calculated via driving route
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                <Store className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-900">Estimated Time</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatDuration(routeInfo.duration)}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Drive time from store
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Addresses */}
          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <p className="text-sm font-semibold text-gray-900">Store Location</p>
              </div>
              <p className="text-sm text-gray-600 pl-5">
                {STORE_LOCATION.address}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <p className="text-sm font-semibold text-gray-900">Delivery Address</p>
              </div>
              <p className="text-sm text-gray-600 pl-5">
                {deliveryAddress.line1}
                {deliveryAddress.line2 && <>, {deliveryAddress.line2}</>}
                <br />
                {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.postalCode}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
