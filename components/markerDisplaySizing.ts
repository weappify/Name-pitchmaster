type MarkerSizingInput = {
  size: number;
  x: number;
  y: number;
};

type MarkerSizingMode = 'normal' | 'precise';

const MIN_RENDER_SIZE = 14;
const PROXIMITY_PADDING_BY_MODE: Record<MarkerSizingMode, number> = {
  // Markers should stay full size until their edges actually touch.
  normal: 0,
  // Precise mode uses the same touch-first threshold so close infield placement feels natural.
  precise: 0,
};

export function computeDisplaySizesForMarkers(
  markers: MarkerSizingInput[],
  canvasSize: number,
  mode: MarkerSizingMode
) {
  const displaySizes = markers.map((marker) => marker.size);
  const proximityPadding = PROXIMITY_PADDING_BY_MODE[mode];

  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < markers.length; i += 1) {
      for (let j = i + 1; j < markers.length; j += 1) {
        const dx = (markers[i].x - markers[j].x) * canvasSize;
        const dy = (markers[i].y - markers[j].y) * canvasSize;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const currentRadiusSum = displaySizes[i] / 2 + displaySizes[j] / 2;
        const allowedRadiusSum = Math.max(distance - proximityPadding, MIN_RENDER_SIZE);

        if (currentRadiusSum <= allowedRadiusSum || currentRadiusSum <= 0) {
          continue;
        }

        const shrinkFactor = allowedRadiusSum / currentRadiusSum;
        const minSizeForI = Math.min(MIN_RENDER_SIZE, markers[i].size);
        const minSizeForJ = Math.min(MIN_RENDER_SIZE, markers[j].size);

        displaySizes[i] = Math.max(
          minSizeForI,
          Math.min(displaySizes[i], displaySizes[i] * shrinkFactor)
        );
        displaySizes[j] = Math.max(
          minSizeForJ,
          Math.min(displaySizes[j], displaySizes[j] * shrinkFactor)
        );
      }
    }
  }

  return displaySizes;
}
