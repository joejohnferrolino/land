// Site configuration — edit these values to update the displayed property details.
const SITE_CONFIG = {
  totalLotAreaSqm: 1000,
  soldAreaSqm: 400,
  availableAreaSqm: 600,

  // Ground-overlay boundary lines shown in the HDR 360 tour, in meters.
  // Each line is independent — set width/depth/x/z directly to reshape or
  // reposition it. (x, z) is the rectangle's center, measured from the lot's
  // center point (0, 0). These are no longer auto-calculated from the sqm
  // values above, so you can match a non-square lot or adjust proportions freely.
  lotLines: {
    total:     { width: 31.6, depth: 31.6, x: 0,      z: 0 }, // white dashed
    sold:      { width: 12.6, depth: 31.6, x: -9.49,  z: 0 }, // red dashed
    available: { width: 19,   depth: 31.6, x: 6.32,   z: 0 }, // green
  },
};
