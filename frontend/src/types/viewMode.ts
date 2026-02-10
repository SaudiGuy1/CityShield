/**
 * ViewMode Type Definitions
 *
 * CityShield uses a unified visualization system for monitoring
 * smart city infrastructure with professional lighting, camera
 * controls, and rendering.
 */

/**
 * View mode for the 3D visualization
 */
export enum ViewMode {
  /**
   * OVERVIEW mode (Dashboard/Overview page)
   * - Shows status-encoded buildings representing asset groups
   * - Buildings use height to encode risk score
   * - Buildings use color to encode status
   * - Used by SmartCity3D component via CityScene + Zones
   * - Optimized for high-level monitoring
   */
  OVERVIEW = 'overview',
}

/**
 * Visualization system architecture:
 *
 * - CityScene component (professional 6-light setup + post-processing)
 * - OrbitControls (camera, pan, zoom, rotation)
 * - Environment map (city preset for reflections)
 * - Ground plane with subtle reflections
 * - Bloom and SSAO post-processing effects
 * - Fog for depth
 * - Consistent color scheme (STATUS_COLORS, CATEGORY_COLORS)
 * - CityScene → Zones → StatusBuilding components
 */

export interface ViewModeConfig {
  mode: ViewMode
  filterCategory?: string  // Filter by asset category
}

/**
 * Default configuration for the view mode
 */
export const VIEW_MODE_DEFAULTS: Record<ViewMode, ViewModeConfig> = {
  [ViewMode.OVERVIEW]: {
    mode: ViewMode.OVERVIEW,
  },
}
