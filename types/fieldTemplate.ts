import type { PlayerMarker } from '@/context/FieldMarkersContext';

export type FieldTemplate = {
  id: string;
  name: string;
  markers: PlayerMarker[];
};
