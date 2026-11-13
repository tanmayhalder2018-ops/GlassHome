import { useEffect, useState } from 'react'
import { m, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

/**
 * Soft gold ring that trails the mouse on desktop and grows over links and
 * photos. The normal cursor stays visible, so usability is unaffected.
 * Disabled on touch devices and for visitors who prefer reduced motion.
 */
export function Cursor() {
  const reduce = useReducedMotion()
  const [enabled, setEnabled] = useState(false)
  const [hover, setHover] = useState(false)
  const [visible, setVisible] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.5 })
  const sy = useSpring(y, { stiffness: 380, damping: 32, mass: 0.5 })

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setEnabled(mq.matches && !reduce)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [reduce])

  useEffect(() => {
    if (!enabled) return
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setVisible(true)
      const t = e.target as Element | null
      setHover(!!t?.closest?.('a, button, select, input, textarea, label'))
    }
    const leave = () => setVisible(false)
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [enabled, x, y])

  if (!enabled) return null
  return (
    <m.div
      className={`cursor ${hover ? 'cursor--hover' : ''}`}
      style={{ x: sx, y: sy, opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    />
  )
}
