import React, { createContext, useContext, useState } from 'react';

type MapFocusContextType = {
  pendingVenueId: string | null;
  setPendingVenueId: (id: string | null) => void;
};

const MapFocusContext = createContext<MapFocusContextType>({
  pendingVenueId: null,
  setPendingVenueId: () => {},
});

export function MapFocusProvider({ children }: { children: React.ReactNode }) {
  const [pendingVenueId, setPendingVenueId] = useState<string | null>(null);
  return (
    <MapFocusContext.Provider value={{ pendingVenueId, setPendingVenueId }}>
      {children}
    </MapFocusContext.Provider>
  );
}

export function useMapFocus() {
  return useContext(MapFocusContext);
}
