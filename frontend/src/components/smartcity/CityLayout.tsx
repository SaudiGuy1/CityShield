/**
 * CityLayout: Master Layout Orchestrator
 *
 * Replaces Zones.tsx — hand-places building slots per district,
 * maps each CityAsset to a CyberpunkBuilding in the correct district.
 *
 * Layout (top-down):
 *
 *       Traffic District        IoT District
 *       (-12, -10)              (12, -10)
 *            \                    /
 *        ====== Main Highway E-W ======
 *                  |
 *           Central HQ District
 *           Network + Security
 *           (0, 4) — tallest towers
 *                  |
 *        ====== South Highway E-W =====
 *             /                  \
 *      Industrial District    Cyber Range
 *      (-4, 14)               Compound (18, 8)
 */

import { useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import District from './District'
import CyberpunkBuilding from './CyberpunkBuilding'
import type { BuildingShape } from './CyberpunkBuilding'
import IndustrialDistrict from './IndustrialDistrict'
import CyberRangeCompound from './CyberRangeCompound'
import { CATEGORY_COLORS } from './materials'
import type { CityAsset } from '../../types/assets'

interface CityLayoutProps {
  components: CityAsset[]
  selectedId: string | null
  attackedBuildingId?: string | null
  onSelect: (id: string | null) => void
  onHover: (component: CityAsset | null, event?: ThreeEvent<PointerEvent>) => void
}

// ── District Configurations ──────────────────────────────────────────────────
interface DistrictConfig {
  center: [number, number]
  size: [number, number]
  accentColor: string
  /** Building slots relative to district center */
  slots: Array<{ pos: [number, number, number]; shape: BuildingShape; isGlass?: boolean }>
}

const DISTRICT_CONFIGS: Record<string, DistrictConfig> = {
  // Traffic Management — NW quadrant
  'zone-a': {
    center: [-12, -10],
    size: [8, 7],
    accentColor: CATEGORY_COLORS.traffic,
    slots: [
      { pos: [-2.0, 0, -1.5], shape: 'skyscraper' },
      { pos: [0, 0, -1.5], shape: 'tower' },
      { pos: [2.0, 0, -1.5], shape: 'skyscraper' },
      { pos: [-1.5, 0, 0.8], shape: 'wideLow' },
      { pos: [0.8, 0, 0.8], shape: 'hexagon' },
      { pos: [2.5, 0, 0.8], shape: 'cylinder' },
    ],
  },

  // IoT Sensors — NE quadrant
  'zone-b': {
    center: [12, -10],
    size: [8, 7],
    accentColor: CATEGORY_COLORS.iot,
    slots: [
      { pos: [-2.0, 0, -1.5], shape: 'dome' },
      { pos: [0, 0, -1.5], shape: 'cylinder' },
      { pos: [2.0, 0, -1.5], shape: 'tower' },
      { pos: [-1.5, 0, 0.8], shape: 'hexagon' },
      { pos: [0.5, 0, 0.8], shape: 'dome' },
      { pos: [2.2, 0, 0.8], shape: 'skyscraper' },
    ],
  },

  // Network Infrastructure — Central HQ (left half)
  'zone-c': {
    center: [-3, 4],
    size: [7, 7],
    accentColor: CATEGORY_COLORS.network,
    slots: [
      { pos: [-1.5, 0, -1.5], shape: 'skyscraper', isGlass: true },
      { pos: [0.5, 0, -1.5], shape: 'tower', isGlass: true },
      { pos: [-1.0, 0, 0.8], shape: 'hexagon' },
      { pos: [1.0, 0, 0.8], shape: 'skyscraper' },
      { pos: [2.2, 0, -0.3], shape: 'cylinder' },
    ],
  },

  // Security Operations — Central HQ (right half)
  'zone-d': {
    center: [3, 4],
    size: [7, 7],
    accentColor: CATEGORY_COLORS.security,
    slots: [
      { pos: [-0.5, 0, -1.5], shape: 'skyscraper', isGlass: true },
      { pos: [1.5, 0, -1.5], shape: 'tower', isGlass: true },
      { pos: [-1.5, 0, 0.8], shape: 'hexagon' },
      { pos: [0.5, 0, 0.8], shape: 'skyscraper' },
      { pos: [-2.2, 0, -0.3], shape: 'dome' },
    ],
  },

  // Industrial Systems — SW (handled by IndustrialDistrict component)
  'zone-e': {
    center: [-4, 14],
    size: [9, 6],
    accentColor: CATEGORY_COLORS.industrial,
    slots: [], // managed by IndustrialDistrict
  },

  // Cyber Range — SE (handled by CyberRangeCompound component)
  'cyber-range': {
    center: [18, 8],
    size: [8, 6],
    accentColor: CATEGORY_COLORS.training,
    slots: [], // managed by CyberRangeCompound
  },
}

export default function CityLayout({
  components,
  selectedId,
  attackedBuildingId,
  onSelect,
  onHover,
}: CityLayoutProps) {
  // Group components by zone
  const grouped = useMemo(() => {
    const map = new Map<string, CityAsset[]>()
    for (const comp of components) {
      const zone = comp.zone || 'zone-a'
      if (!map.has(zone)) map.set(zone, [])
      map.get(zone)!.push(comp)
    }
    return map
  }, [components])

  return (
    <group>
      {/* Standard districts (zone-a, zone-b, zone-c, zone-d) */}
      {(['zone-a', 'zone-b', 'zone-c', 'zone-d'] as const).map(zone => {
        const config = DISTRICT_CONFIGS[zone]
        const zoneComps = grouped.get(zone) || []
        return (
          <District
            key={zone}
            center={config.center}
            size={config.size}
            accentColor={config.accentColor}
          >
            {zoneComps.map((comp, i) => {
              const slot = config.slots[i % config.slots.length]
              const compId = comp.id || comp.asset_id
              return (
                <CyberpunkBuilding
                  key={compId}
                  component={comp}
                  position={slot.pos}
                  shape={slot.shape}
                  isGlass={slot.isGlass}
                  selected={selectedId === compId}
                  isUnderAttack={attackedBuildingId === compId}
                  onSelect={onSelect}
                  onHover={onHover}
                />
              )
            })}
          </District>
        )
      })}

      {/* Industrial District — special component */}
      {(() => {
        const config = DISTRICT_CONFIGS['zone-e']
        const zoneComps = grouped.get('zone-e') || []
        return (
          <District
            key="zone-e"
            center={config.center}
            size={config.size}
            accentColor={config.accentColor}
          >
            <IndustrialDistrict
              components={zoneComps}
              selectedId={selectedId}
              attackedBuildingId={attackedBuildingId}
              onSelect={onSelect}
              onHover={onHover}
            />
          </District>
        )
      })()}

      {/* Cyber Range Compound — fortified special component */}
      {(() => {
        const config = DISTRICT_CONFIGS['cyber-range']
        const zoneComps = grouped.get('cyber-range') || []
        return (
          <District
            key="cyber-range"
            center={config.center}
            size={config.size}
            accentColor={config.accentColor}
          >
            <CyberRangeCompound
              components={zoneComps}
              selectedId={selectedId}
              attackedBuildingId={attackedBuildingId}
              onSelect={onSelect}
              onHover={onHover}
            />
          </District>
        )
      })()}
    </group>
  )
}
