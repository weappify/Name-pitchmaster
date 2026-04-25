import type { PlayerMarker } from '@/context/FieldMarkersContext';
import type { FieldTemplate } from '@/types/fieldTemplate';

type MarkerPosition = {
  x: number;
  y: number;
};

const MARKER_SIZE = 30;

function createTemplateMarkers(positions: Record<string, MarkerPosition>): PlayerMarker[] {
  return [
    { id: 'f1', label: 'F1', draggable: true, size: MARKER_SIZE, ...positions.f1 },
    { id: 'f2', label: 'F2', draggable: true, size: MARKER_SIZE, ...positions.f2 },
    { id: 'f3', label: 'F3', draggable: true, size: MARKER_SIZE, ...positions.f3 },
    { id: 'f4', label: 'F4', draggable: true, size: MARKER_SIZE, ...positions.f4 },
    { id: 'f5', label: 'F5', draggable: true, size: MARKER_SIZE, ...positions.f5 },
    { id: 'f6', label: 'F6', draggable: true, size: MARKER_SIZE, ...positions.f6 },
    { id: 'f7', label: 'F7', draggable: true, size: MARKER_SIZE, ...positions.f7 },
    { id: 'f8', label: 'F8', draggable: true, size: MARKER_SIZE, ...positions.f8 },
    { id: 'f9', label: 'F9', draggable: true, size: MARKER_SIZE, ...positions.f9 },
    { id: 'b', label: 'B', draggable: false, size: MARKER_SIZE, x: 0.5, y: 0.58 },
    { id: 'wk', label: 'WK', draggable: false, size: MARKER_SIZE, x: 0.5, y: 0.4 },
  ];
}

export const FIELD_TEMPLATES: FieldTemplate[] = [
  {
    id: 'attacking',
    name: 'Attacking Field',
    markers: createTemplateMarkers({
      f1: { x: 0.44, y: 0.36 },
      f2: { x: 0.39, y: 0.39 },
      f3: { x: 0.36, y: 0.43 },
      f4: { x: 0.32, y: 0.48 },
      f5: { x: 0.29, y: 0.58 },
      f6: { x: 0.66, y: 0.45 },
      f7: { x: 0.72, y: 0.57 },
      f8: { x: 0.64, y: 0.68 },
      f9: { x: 0.5, y: 0.76 },
    }),
  },
  {
    id: 'defensive',
    name: 'Defensive Field',
    markers: createTemplateMarkers({
      f1: { x: 0.22, y: 0.45 },
      f2: { x: 0.78, y: 0.45 },
      f3: { x: 0.18, y: 0.65 },
      f4: { x: 0.82, y: 0.65 },
      f5: { x: 0.3, y: 0.76 },
      f6: { x: 0.7, y: 0.76 },
      f7: { x: 0.5, y: 0.83 },
      f8: { x: 0.36, y: 0.54 },
      f9: { x: 0.64, y: 0.54 },
    }),
  },
  {
    id: 'pace',
    name: 'Pace Field',
    markers: createTemplateMarkers({
      f1: { x: 0.43, y: 0.35 },
      f2: { x: 0.37, y: 0.38 },
      f3: { x: 0.33, y: 0.44 },
      f4: { x: 0.25, y: 0.58 },
      f5: { x: 0.7, y: 0.45 },
      f6: { x: 0.76, y: 0.56 },
      f7: { x: 0.7, y: 0.74 },
      f8: { x: 0.52, y: 0.78 },
      f9: { x: 0.28, y: 0.76 },
    }),
  },
  {
    id: 'spin',
    name: 'Spin Field',
    markers: createTemplateMarkers({
      f1: { x: 0.45, y: 0.35 },
      f2: { x: 0.41, y: 0.41 },
      f3: { x: 0.35, y: 0.48 },
      f4: { x: 0.28, y: 0.56 },
      f5: { x: 0.62, y: 0.42 },
      f6: { x: 0.7, y: 0.52 },
      f7: { x: 0.68, y: 0.67 },
      f8: { x: 0.58, y: 0.77 },
      f9: { x: 0.44, y: 0.74 },
    }),
  },
  {
    id: 'powerplay',
    name: 'Powerplay Field',
    markers: createTemplateMarkers({
      f1: { x: 0.43, y: 0.35 },
      f2: { x: 0.37, y: 0.39 },
      f3: { x: 0.33, y: 0.44 },
      f4: { x: 0.28, y: 0.58 },
      f5: { x: 0.42, y: 0.58 },
      f6: { x: 0.65, y: 0.45 },
      f7: { x: 0.74, y: 0.56 },
      f8: { x: 0.62, y: 0.71 },
      f9: { x: 0.5, y: 0.8 },
    }),
  },
  {
    id: 'death-overs',
    name: 'Death Overs Field',
    markers: createTemplateMarkers({
      f1: { x: 0.18, y: 0.48 },
      f2: { x: 0.82, y: 0.48 },
      f3: { x: 0.2, y: 0.68 },
      f4: { x: 0.8, y: 0.68 },
      f5: { x: 0.31, y: 0.8 },
      f6: { x: 0.69, y: 0.8 },
      f7: { x: 0.5, y: 0.84 },
      f8: { x: 0.34, y: 0.57 },
      f9: { x: 0.66, y: 0.57 },
    }),
  },
];
