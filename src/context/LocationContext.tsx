// LocationContext — provides user's current coordinates app-wide
//
// Why context instead of prop-drilling:
//   Distance is displayed inside VenueCard, RecurringRunCard, and MapPreviewCard.
//   All three are deep in the tree and used across multiple screens.
//   A context avoids threading `userCoords` through 3+ prop layers.
//
// Usage:
//   const { coords, permissionStatus } = useLocationContext();
//   const dist = coords ? haversineDistance(coords, venue.coordinates) : null;
//
// Supabase migration path: nothing changes here — location is always client-side.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import * as Location from 'expo-location';
import { Coordinates } from '../data/types';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface LocationContextValue {
  // null until permission granted and first fix received
  coords: Coordinates | null;
  permissionStatus: PermissionStatus;
  // true only during the initial permission request + first GPS fix
  isLocating: boolean;
}

const LocationContext = createContext<LocationContextValue>({
  coords: null,
  permissionStatus: 'undetermined',
  isLocating: false,
});

export function useLocationContext(): LocationContextValue {
  return useContext(LocationContext);
}

interface Props {
  children: ReactNode;
}

export function LocationProvider({ children }: Props) {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [isLocating, setIsLocating] = useState(true);

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    async function start() {
      // 1. Request foreground permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setPermissionStatus('denied');
        setIsLocating(false);
        return;
      }

      setPermissionStatus('granted');

      // 2. Get a fast initial fix (balanced accuracy = faster, good enough for distance)
      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
        });
      } catch {
        // Initial fix failed — will recover on first subscription update
      } finally {
        setIsLocating(false);
      }

      // 3. Watch for updates (low accuracy to save battery; app only needs city-level precision)
      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Low,
          distanceInterval: 50, // update only when user moves 50m
          timeInterval: 30_000,  // or every 30s at most
        },
        (loc) => {
          setCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
    }

    start();

    return () => {
      subscriber?.remove();
    };
  }, []);

  return (
    <LocationContext.Provider value={{ coords, permissionStatus, isLocating }}>
      {children}
    </LocationContext.Provider>
  );
}
