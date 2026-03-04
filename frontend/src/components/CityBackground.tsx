import { useMemo } from 'react'

function generateStars(count: number) {
  const stars = []
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 60}%`,
      size: Math.random() * 2 + 1,
      duration: `${Math.random() * 4 + 2}s`,
      delay: `${Math.random() * 5}s`,
      opacity: Math.random() * 0.6 + 0.2,
    })
  }
  return stars
}

export default function CityBackground() {
  const stars = useMemo(() => generateStars(80), [])

  return (
    <div className="city-background" aria-hidden="true">
      {/* Gradient sky */}
      <div className="sky" />

      {/* Stars */}
      <div className="stars">
        {stars.map((s) => (
          <div
            key={s.id}
            className="star"
            style={{
              left: s.left,
              top: s.top,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              ['--duration' as string]: s.duration,
              ['--delay' as string]: s.delay,
            }}
          />
        ))}
      </div>

      {/* Ambient glow at bottom */}
      <div className="ambient-glow" />

      {/* SVG Building silhouettes */}
      <div className="buildings">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1440 400"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Far buildings - darker */}
          <g fill="#0a1220" opacity="0.7">
            <rect x="50" y="180" width="60" height="220" />
            <rect x="120" y="140" width="45" height="260" />
            <rect x="200" y="200" width="80" height="200" />
            <rect x="310" y="120" width="50" height="280" />
            <rect x="380" y="170" width="70" height="230" />
            <rect x="470" y="90" width="55" height="310" />
            <rect x="550" y="160" width="65" height="240" />
            <rect x="640" y="130" width="50" height="270" />
            <rect x="710" y="180" width="80" height="220" />
            <rect x="820" y="100" width="60" height="300" />
            <rect x="900" y="150" width="45" height="250" />
            <rect x="970" y="110" width="70" height="290" />
            <rect x="1060" y="170" width="55" height="230" />
            <rect x="1140" y="140" width="65" height="260" />
            <rect x="1230" y="190" width="50" height="210" />
            <rect x="1300" y="130" width="80" height="270" />
          </g>

          {/* Near buildings - slightly lighter */}
          <g fill="#0d1a2e" opacity="0.9">
            <rect x="80" y="220" width="90" height="180" />
            <rect x="190" y="250" width="50" height="150" />
            <rect x="270" y="200" width="70" height="200" />
            <rect x="370" y="240" width="55" height="160" />
            <rect x="450" y="190" width="85" height="210" />
            <rect x="570" y="230" width="60" height="170" />
            <rect x="660" y="210" width="75" height="190" />
            <rect x="770" y="250" width="45" height="150" />
            <rect x="850" y="200" width="70" height="200" />
            <rect x="950" y="230" width="55" height="170" />
            <rect x="1030" y="190" width="80" height="210" />
            <rect x="1140" y="240" width="60" height="160" />
            <rect x="1220" y="210" width="70" height="190" />
            <rect x="1320" y="250" width="65" height="150" />
          </g>

          {/* Window lights - tiny bright dots */}
          <g fill="#00f0ff" opacity="0.25">
            {/* Building 1 windows */}
            <rect x="95" y="240" width="3" height="3" rx="0.5" />
            <rect x="105" y="240" width="3" height="3" rx="0.5" />
            <rect x="95" y="260" width="3" height="3" rx="0.5" />
            <rect x="115" y="280" width="3" height="3" rx="0.5" />
            {/* Building 2 windows */}
            <rect x="285" y="220" width="3" height="3" rx="0.5" />
            <rect x="295" y="240" width="3" height="3" rx="0.5" />
            <rect x="305" y="220" width="3" height="3" rx="0.5" />
            {/* Building 3 windows */}
            <rect x="470" y="210" width="3" height="3" rx="0.5" />
            <rect x="490" y="230" width="3" height="3" rx="0.5" />
            <rect x="480" y="250" width="3" height="3" rx="0.5" />
            <rect x="500" y="210" width="3" height="3" rx="0.5" />
            {/* Building 4 windows */}
            <rect x="670" y="230" width="3" height="3" rx="0.5" />
            <rect x="690" y="250" width="3" height="3" rx="0.5" />
            <rect x="700" y="230" width="3" height="3" rx="0.5" />
            {/* Building 5 windows */}
            <rect x="865" y="220" width="3" height="3" rx="0.5" />
            <rect x="885" y="240" width="3" height="3" rx="0.5" />
            <rect x="895" y="260" width="3" height="3" rx="0.5" />
            {/* Building 6 windows */}
            <rect x="1050" y="210" width="3" height="3" rx="0.5" />
            <rect x="1070" y="230" width="3" height="3" rx="0.5" />
            <rect x="1060" y="250" width="3" height="3" rx="0.5" />
            <rect x="1080" y="210" width="3" height="3" rx="0.5" />
          </g>

          {/* Magenta window lights */}
          <g fill="#bf00ff" opacity="0.2">
            <rect x="145" y="260" width="3" height="3" rx="0.5" />
            <rect x="330" y="240" width="3" height="3" rx="0.5" />
            <rect x="510" y="220" width="3" height="3" rx="0.5" />
            <rect x="585" y="250" width="3" height="3" rx="0.5" />
            <rect x="780" y="270" width="3" height="3" rx="0.5" />
            <rect x="965" y="250" width="3" height="3" rx="0.5" />
            <rect x="1155" y="260" width="3" height="3" rx="0.5" />
            <rect x="1340" y="270" width="3" height="3" rx="0.5" />
          </g>
        </svg>
      </div>

      {/* Neon accent lines */}
      <div
        className="neon-line"
        style={{ bottom: '35%', left: '5%', width: '30%', animationDelay: '0s' }}
      />
      <div
        className="neon-line"
        style={{ bottom: '32%', left: '40%', width: '25%', animationDelay: '2s' }}
      />
      <div
        className="neon-line"
        style={{ bottom: '38%', left: '70%', width: '20%', animationDelay: '1s' }}
      />
    </div>
  )
}
