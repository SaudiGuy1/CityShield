# 3D Smart City Visualization

Interactive real-time 3D visualization of CityShield's smart city components.

## Overview

The Overview dashboard features a fully interactive 3D city where each building represents a smart city component. Building height, color, and glow reflect live backend data (event counts, alert status). Users can orbit, zoom, hover for tooltips, and click buildings to inspect details.

## Dependencies

| Package | Purpose |
|---|---|
| `three` | Core 3D rendering engine |
| `@react-three/fiber` | React renderer for Three.js |
| `@react-three/drei` | Helpers (OrbitControls, PerspectiveCamera, Stars) |
| `@react-three/postprocessing` | Optional bloom/glow effects |
| `animejs` | UI-level animations (panel slide-in, stat counters) |

## Architecture

```
SmartCity3D.tsx          ← React wrapper: UI overlays, tooltip, details panel
  └─ CityScene.tsx       ← Canvas + lighting + camera + fog
       └─ Zones.tsx       ← Zone ground plates, roads, building layout
            └─ Building.tsx ← Individual 3D building mesh
  useCityData.ts          ← Data fetching hook (polls /api/overview/city-components)
  materials.ts            ← Shared colors, material factories
```

## Scene Structure

### Ground & Grid
- 50×50 dark ground plane (`#080c1a`)
- Subtle grid overlay for spatial reference

### Roads
- Cross-shaped road network dividing the city into four quadrants
- Center lane markings and dashes

### Zones (Quadrants)
| Zone | Position | Category | Accent Color |
|---|---|---|---|
| zone-a | NW (−5, −5) | Traffic | Red `#ef4444` |
| zone-b | NE (+5, −5) | IoT | Green `#10b981` |
| zone-c | SW (−5, +5) | Network | Blue `#3b82f6` |
| zone-d | SE (+5, +5) | Security | Purple `#8b5cf6` |

Each zone has:
- Dark ground plate (6.5×6.5)
- Colored border lines
- Buildings laid out in a grid within the zone

### Buildings
- `BoxGeometry` with width based on category
- Height derived from `eventsCount` (log scale: 0.6–4.0 units)
- Colored roof accent strip (category color)
- Procedural window rows on front face
- Selection ring when clicked

### Lighting
- Ambient light (cool blue tint)
- Directional light with soft shadows (2048px shadow map)
- Two colored point lights (blue + purple)
- Hemisphere light for sky/ground ambient
- Stars background

### Camera
- Perspective camera at `[14, 12, 14]`, FOV 45
- OrbitControls: rotate, pan, zoom
- Max polar angle prevents flipping below ground
- Smooth animated focus on building selection

## Data → Visual Mapping

| Data Field | Visual Property |
|---|---|
| `eventsCount` | Building height (log scale) |
| `status: ok` | Green color `#10b981` |
| `status: warning` | Amber color `#f59e0b` |
| `status: critical` | Red color `#ef4444` + pulsing emissive glow |
| `status: offline` | Gray color `#6b7280` + 50% opacity |
| `category` | Zone placement + roof accent color |
| `alertsCount` | Displayed in tooltip and details panel |

## Interactions

### Hover
- Building scales up 5%
- Color shifts to accent blue
- Emissive highlight appears
- Floating tooltip shows: name, status, event/alert counts
- Cursor changes to pointer

### Click Building
- Selection ring appears at base
- Camera smoothly pans to zone center
- Details panel slides in (right side, animated via anime.js)
- Shows: id, name, category, zone, status, events, alerts, last updated

### Click Empty Space
- Clears selection
- Details panel hides

## Backend API

### `GET /api/overview/city-components`

Returns array of:
```json
{
  "id": "traffic-ctrl-01",
  "name": "Traffic Control Hub",
  "category": "traffic",
  "status": "ok",
  "zone": "zone-a",
  "eventsCount": 142,
  "alertsCount": 0,
  "lastUpdated": "2026-02-09T12:00:00"
}
```

**Mock mode**: Set `USE_MOCK_CITY_COMPONENTS=true` in `.env` for deterministic demo data (20 components across 4 zones).

**Live mode**: Aggregates from OpenSearch `logs-*` and `alerts` indices. Components are derived from log event types grouped by simulator component.

## Performance

- **Stable keys**: Building positions are computed from component IDs and zone assignments. Data updates do not cause position jumps.
- **Memoization**: Heights, positions, materials, and groupings are memoized with `useMemo`.
- **Shadow map**: Single 2048×2048 directional shadow map.
- **DPR capping**: Canvas pixel ratio capped at 1.5.
- **Fog culling**: Scene fog hides distant geometry.
- **Minimal re-renders**: `useCallback` on event handlers; `useFrame` only runs for critical-status pulse animation.
- **Geometry sharing**: All buildings use the same `BoxGeometry` type (Three.js internally caches).

### Scaling Notes
For 100+ components, consider:
- `InstancedMesh` for buildings of the same category
- LOD (Level of Detail) for distant zones
- Virtualization of non-visible buildings

## Future Extensions

| Feature | Approach |
|---|---|
| CCTV cameras | Add `ConeGeometry` markers on traffic zone buildings |
| Power grid | Line geometry connecting buildings within zones |
| Water network | Animated tube geometry along roads |
| Real-time data streams | WebSocket push instead of polling |
| Day/night cycle | Animate directional light position and ambient color |
| Weather effects | Particle systems for rain/snow |
| Click-through to alerts | Link details panel to `/alerts?component=...` |
| Building labels | `Html` component from drei for floating text |
| Mini-map | Orthographic camera render-to-texture overlay |
