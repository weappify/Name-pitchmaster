import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_FIELD_CONFIG,
  getMarkerRole,
  normalizeFieldConfig,
  type MarkerRole,
} from '@/lib/fieldSetupRules';
import type { FieldSetup } from '@/types/fieldSetup';
import { supabase } from '@/lib/supabase';

export type PlayerMarker = {
  id: string;
  label: string;
  name?: string;
  playerId?: string;
  x: number;
  y: number;
  size: number;
  draggable: boolean;
};

export function createInitialMarkers(): PlayerMarker[] {
  return [
    { id: 'f1', label: 'F1', x: 0.38, y: 0.63, size: 30, draggable: true },
    { id: 'f2', label: 'F2', x: 0.44, y: 0.58, size: 30, draggable: true },
    { id: 'f3', label: 'F3', x: 0.56, y: 0.58, size: 30, draggable: true },
    { id: 'f4', label: 'F4', x: 0.62, y: 0.63, size: 30, draggable: true },
    { id: 'f5', label: 'F5', x: 0.27, y: 0.45, size: 30, draggable: true },
    { id: 'f6', label: 'F6', x: 0.73, y: 0.45, size: 30, draggable: true },
    { id: 'f7', label: 'F7', x: 0.30, y: 0.77, size: 30, draggable: true },
    { id: 'f8', label: 'F8', x: 0.70, y: 0.77, size: 30, draggable: true },
    { id: 'f9', label: 'F9', x: 0.50, y: 0.24, size: 30, draggable: true },
    { id: 'b', label: 'B', x: 0.5, y: 0.58, size: 30, draggable: false },
    { id: 'wk', label: 'WK', x: 0.5, y: 0.40, size: 30, draggable: false },
  ];
}

type FieldMarkersContextValue = {
  markers: PlayerMarker[];
  activeSetupId: string | null;
  activeSetupName: string;
  activeTeamId: string | null;
  activeFieldConfig: FieldSetup['fieldConfig'];
  replaceMarkers: (markers: PlayerMarker[]) => void;
  updateMarkerPosition: (id: string, x: number, y: number) => void;
  updateMarkerDetails: (
    id: string,
    updates: Partial<Pick<PlayerMarker, 'label' | 'name' | 'size' | 'playerId'>>
  ) => void;
  swapMarkerRole: (id: string, nextRole: MarkerRole) => void;
  syncSizeToAllMarkers: (size: number) => void;
  loadFieldSetup: (setup: FieldSetup) => void;
  setActiveSetupMeta: (
    id: string | null,
    name: string,
    fieldConfig?: FieldSetup['fieldConfig']
  ) => void;
  setActiveTeamId: (teamId: string | null) => void;
};

const FieldMarkersContext = createContext<FieldMarkersContextValue | null>(null);

function cloneMarkers(markers: PlayerMarker[]) {
  return markers.map((marker) => ({ ...marker }));
}

function getSpecialMarkerId(role: Exclude<MarkerRole, 'fielder'>) {
  return role === 'bowler' ? 'b' : 'wk';
}

export function FieldMarkersProvider({ children }: { children: ReactNode }) {
  const [markers, setMarkers] = useState(createInitialMarkers);
  const [activeSetupId, setActiveSetupId] = useState<string | null>(null);
  const [activeSetupName, setActiveSetupName] = useState('');
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [activeFieldConfig, setActiveFieldConfig] = useState(DEFAULT_FIELD_CONFIG);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setMarkers(createInitialMarkers());
      setActiveSetupId(null);
      setActiveSetupName('');
      setActiveTeamId(null);
      setActiveFieldConfig(DEFAULT_FIELD_CONFIG);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<FieldMarkersContextValue>(
    () => ({
      markers,
      activeSetupId,
      activeSetupName,
      activeTeamId,
      activeFieldConfig,
      replaceMarkers: (nextMarkers) => {
        setMarkers(cloneMarkers(nextMarkers));
      },
      updateMarkerPosition: (id, x, y) => {
        setMarkers((currentMarkers) =>
          currentMarkers.map((marker) => {
            if (marker.id !== id) {
              return marker;
            }

            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              return marker;
            }

            const safeX = Math.min(Math.max(x, 0), 1);
            const safeY = Math.min(Math.max(y, 0), 1);

            return { ...marker, x: safeX, y: safeY };
          })
        );
      },
      updateMarkerDetails: (id, updates) => {
        setMarkers((currentMarkers) =>
          currentMarkers.map((marker) =>
            marker.id === id ? { ...marker, ...updates } : marker
          )
        );
      },
      swapMarkerRole: (id, nextRole) => {
        if (nextRole === 'fielder') {
          return;
        }

        setMarkers((currentMarkers) => {
          const nextMarkers = cloneMarkers(currentMarkers);
          const targetIndex = nextMarkers.findIndex((marker) => marker.id === id);

          if (targetIndex < 0) {
            return currentMarkers;
          }

          const currentRole = getMarkerRole(nextMarkers[targetIndex].id);

          if (currentRole === nextRole) {
            return currentMarkers;
          }

          const counterpartId = getSpecialMarkerId(nextRole);
          const counterpartIndex = nextMarkers.findIndex((marker) => marker.id === counterpartId);

          if (counterpartIndex < 0) {
            return currentMarkers;
          }

          const targetMarker = nextMarkers[targetIndex];
          const counterpartMarker = nextMarkers[counterpartIndex];

          nextMarkers[targetIndex] = {
            ...targetMarker,
            id: counterpartMarker.id,
            label: counterpartMarker.label,
            draggable: counterpartMarker.draggable,
          };
          nextMarkers[counterpartIndex] = {
            ...counterpartMarker,
            id: targetMarker.id,
            label: targetMarker.label,
            draggable: targetMarker.draggable,
          };

          return nextMarkers;
        });
      },
      syncSizeToAllMarkers: (size) => {
        const nextSize = Number.isFinite(size) ? Math.max(5, size) : 5;

        setMarkers((currentMarkers) =>
          currentMarkers.map((marker) => ({ ...marker, size: nextSize }))
        );
      },
      loadFieldSetup: (setup) => {
        setMarkers(cloneMarkers(setup.markers));
        setActiveSetupId(setup.id);
        setActiveSetupName(setup.name);
        setActiveTeamId(setup.teamId ?? null);
        setActiveFieldConfig(normalizeFieldConfig(setup.fieldConfig));
      },
      setActiveSetupMeta: (id, name, fieldConfig) => {
        setActiveSetupId(id);
        setActiveSetupName(name);
        setActiveFieldConfig(normalizeFieldConfig(fieldConfig));
      },
      setActiveTeamId: (teamId) => {
        setActiveTeamId(teamId);
      },
    }),
    [activeFieldConfig, activeSetupId, activeSetupName, activeTeamId, markers]
  );

  return (
    <FieldMarkersContext.Provider value={value}>
      {children}
    </FieldMarkersContext.Provider>
  );
}

export function useFieldMarkers() {
  const context = useContext(FieldMarkersContext);

  if (!context) {
    throw new Error('useFieldMarkers must be used within FieldMarkersProvider');
  }

  return context;
}
