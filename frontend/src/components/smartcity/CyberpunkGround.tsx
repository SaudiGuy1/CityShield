import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uGridColor;
  uniform vec3 uPulseColor;
  uniform vec3 uBaseColor;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vec2 p = vWorldPos.xz;

    // Grid lines via mod — major (every 2 units) and minor (every 0.5)
    vec2 majorGrid = abs(fract(p * 0.5) - 0.5) / fwidth(p * 0.5);
    float majorLine = min(majorGrid.x, majorGrid.y);
    float major = 1.0 - min(majorLine, 1.0);

    vec2 minorGrid = abs(fract(p * 2.0) - 0.5) / fwidth(p * 2.0);
    float minorLine = min(minorGrid.x, minorGrid.y);
    float minor = 1.0 - min(minorLine, 1.0);

    // Radial pulse — expanding ring from center
    float dist = length(p);
    float pulse = sin(dist * 0.8 - uTime * 1.5) * 0.5 + 0.5;
    pulse = smoothstep(0.3, 0.7, pulse);
    pulse *= smoothstep(40.0, 5.0, dist); // fade at edges

    // Compose
    vec3 color = uBaseColor;
    color = mix(color, uGridColor, minor * 0.3);
    color = mix(color, uGridColor, major * 0.6);
    color = mix(color, uPulseColor, pulse * major * 0.7);

    // Distance fade
    float fade = smoothstep(50.0, 20.0, dist);
    color *= fade;

    gl_FragColor = vec4(color, 1.0);
  }
`

interface CyberpunkGroundProps {
  onClick?: () => void
}

export default function CyberpunkGround({ onClick }: CyberpunkGroundProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGridColor: { value: new THREE.Color('#0e4a6a') },
      uPulseColor: { value: new THREE.Color('#00e5ff') },
      uBaseColor: { value: new THREE.Color('#060a14') },
    }),
    [],
  )

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onClick={onClick}
    >
      <planeGeometry args={[120, 120, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.FrontSide}
      />
    </mesh>
  )
}
