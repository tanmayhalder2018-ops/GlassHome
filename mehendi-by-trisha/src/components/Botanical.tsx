import { m, useReducedMotion } from 'framer-motion'
import type { CSSProperties } from 'react'

/* Hand-drawn style botanical line art. Every path "draws" itself into view. */

const draw = (delay = 0, duration = 2.2) => ({
  initial: { pathLength: 0, opacity: 0 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true, margin: '0px 0px -10% 0px' },
  transition: {
    pathLength: { duration, ease: [0.65, 0, 0.35, 1] as const, delay },
    opacity: { duration: 0.3, delay },
  },
})

interface ArtProps {
  className?: string
  style?: CSSProperties
  delay?: number
}

/** A tall curving sprig with alternating leaves and small buds. */
export function Sprig({ className, style, delay = 0 }: ArtProps) {
  const leaves = [
    'M60 250 C 40 238, 28 214, 34 196 C 52 206, 62 228, 60 250 Z',
    'M64 214 C 86 204, 100 182, 96 162 C 76 170, 64 192, 64 214 Z',
    'M58 176 C 38 164, 30 140, 38 124 C 54 136, 62 156, 58 176 Z',
    'M66 138 C 86 128, 96 108, 92 90 C 74 98, 64 118, 66 138 Z',
    'M60 102 C 44 92, 38 72, 44 58 C 58 70, 62 86, 60 102 Z',
  ]
  return (
    <svg className={`art ${className ?? ''}`} style={style} viewBox="0 0 120 320" fill="none" aria-hidden="true">
      <m.path d="M62 318 C 58 270, 70 230, 60 190 C 50 150, 70 110, 62 70 C 58 50, 60 34, 66 18" {...draw(delay)} />
      {leaves.map((d, i) => (
        <m.path key={i} d={d} {...draw(delay + 0.5 + i * 0.18, 1.2)} />
      ))}
      <m.circle cx="66" cy="14" r="5" {...draw(delay + 1.6, 0.6)} />
      <m.path d="M66 9 C 62 2, 70 2, 66 9" {...draw(delay + 1.8, 0.5)} />
    </svg>
  )
}

/** A wide flowing vine — used as a section ornament. */
export function Vine({ className, style, delay = 0 }: ArtProps) {
  return (
    <svg className={`art ${className ?? ''}`} style={style} viewBox="0 0 420 120" fill="none" aria-hidden="true">
      <m.path d="M4 70 C 60 20, 120 110, 190 64 S 320 20, 416 58" {...draw(delay, 2.6)} />
      <m.path d="M84 60 C 92 38, 112 30, 128 34 C 120 52, 104 62, 84 60 Z" {...draw(delay + 0.8, 1)} />
      <m.path d="M150 82 C 150 104, 166 114, 182 112 C 180 94, 168 84, 150 82 Z" {...draw(delay + 1, 1)} />
      <m.path d="M246 46 C 252 24, 272 16, 288 20 C 280 38, 264 48, 246 46 Z" {...draw(delay + 1.2, 1)} />
      <m.path d="M318 52 C 318 74, 334 84, 350 82 C 348 64, 336 54, 318 52 Z" {...draw(delay + 1.4, 1)} />
      <m.circle cx="210" cy="56" r="9" {...draw(delay + 1.5, 0.8)} />
      <m.circle cx="210" cy="56" r="3" {...draw(delay + 1.7, 0.6)} />
      <m.circle cx="40" cy="44" r="2.5" {...draw(delay + 1.8, 0.4)} />
      <m.circle cx="380" cy="34" r="2.5" {...draw(delay + 1.9, 0.4)} />
    </svg>
  )
}

/** Mehendi-style mandala bloom, built from concentric petal rings. */
export function Mandala({ className, style, delay = 0 }: ArtProps) {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30)
  const inner = Array.from({ length: 8 }, (_, i) => i * 45)
  const dots = Array.from({ length: 24 }, (_, i) => i * 15)
  return (
    <svg className={`art ${className ?? ''}`} style={style} viewBox="-110 -110 220 220" fill="none" aria-hidden="true">
      <m.circle r="14" {...draw(delay, 0.8)} />
      <m.circle r="5" {...draw(delay + 0.2, 0.6)} />
      {inner.map((a, i) => (
        <m.path key={a} d="M0 -16 C 12 -26, 12 -42, 0 -50 C -12 -42, -12 -26, 0 -16 Z" transform={`rotate(${a})`} {...draw(delay + 0.3 + i * 0.05, 1)} />
      ))}
      <m.circle r="56" {...draw(delay + 0.8, 1.2)} />
      {petals.map((a, i) => (
        <m.path key={a} d="M0 -58 C 18 -66, 20 -88, 0 -100 C -20 -88, -18 -66, 0 -58 Z" transform={`rotate(${a})`} {...draw(delay + 1 + i * 0.04, 1)} />
      ))}
      {dots.map((a, i) => (
        <m.circle key={a} r="1.6" cx="0" cy="-106" transform={`rotate(${a + 7.5})`} {...draw(delay + 1.6 + i * 0.02, 0.3)} />
      ))}
    </svg>
  )
}

/** Small eight-petal flower that slowly turns — the brand's signature mark. */
export function FlowerMark({ className, spin = true, size = 22 }: { className?: string; spin?: boolean; size?: number }) {
  const reduce = useReducedMotion()
  return (
    <m.svg
      className={`flower-mark ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      fill="none"
      aria-hidden="true"
      animate={spin && !reduce ? { rotate: 360 } : undefined}
      transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d="M0 -2.6 C 2.6 -4.4, 2.6 -8.4, 0 -10.6 C -2.6 -8.4, -2.6 -4.4, 0 -2.6 Z" transform={`rotate(${i * 45})`} />
      ))}
      <circle r="1.6" />
    </m.svg>
  )
}

/** A single leaf that sways gently. */
export function LeafMark({ className, size = 22 }: { className?: string; size?: number }) {
  const reduce = useReducedMotion()
  return (
    <m.svg
      className={`leaf-mark ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ originX: 0.5, originY: 1 }}
      animate={reduce ? undefined : { rotate: [-8, 8, -8] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d="M12 23 C 12 16, 12 10, 12 3" />
      <path d="M12 21 C 4 18, 3 9, 12 2 C 21 9, 20 18, 12 21 Z" />
      <path d="M12 9 L 8 6 M12 13 L 16 10 M12 17 L 7 14" />
    </m.svg>
  )
}

/** Floating leaf shapes that drift slowly in the background. */
export function FloatingLeaves({ count = 6, className }: { count?: number; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  const leaves = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 37 + 11) % 92}%`,
    top: `${(i * 53 + 7) % 86}%`,
    size: 12 + ((i * 7) % 14),
    dur: 9 + (i % 4) * 2.5,
    delay: i * 0.9,
    rot: (i * 47) % 360,
  }))
  return (
    <div className={`floating-leaves ${className ?? ''}`} aria-hidden="true">
      {leaves.map((l, i) => (
        <m.svg
          key={i}
          viewBox="0 0 24 24"
          width={l.size}
          height={l.size}
          style={{ left: l.left, top: l.top, rotate: l.rot }}
          animate={{ y: [0, -18, 0], x: [0, 8, 0], rotate: [l.rot, l.rot + 18, l.rot] }}
          transition={{ duration: l.dur, repeat: Infinity, ease: 'easeInOut', delay: l.delay }}
        >
          <path d="M12 22 C 3 18, 3 8, 12 2 C 21 8, 21 18, 12 22 Z M12 22 L 12 5" />
        </m.svg>
      ))}
    </div>
  )
}

/** Thin gold divider with a flower in the middle. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div className={`ornament ${className ?? ''}`} aria-hidden="true">
      <span />
      <FlowerMark size={16} />
      <span />
    </div>
  )
}
