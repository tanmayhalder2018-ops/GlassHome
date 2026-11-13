import { m, type HTMLMotionProps } from 'framer-motion'
import { Fragment, type ReactNode } from 'react'

const ease = [0.22, 1, 0.36, 1] as const

interface RevealProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  delay?: number
  y?: number
  as?: 'div' | 'li' | 'p' | 'span'
}

/** Fades and lifts its content into view once, as the visitor scrolls. */
export function Reveal({ children, delay = 0, y = 28, as = 'div', ...rest }: RevealProps) {
  const Comp = m[as] as typeof m.div
  return (
    <Comp
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, ease, delay }}
      {...rest}
    >
      {children}
    </Comp>
  )
}

/** Splits a headline into words that rise one after another. */
export function RevealText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(' ')
  // The observer sits on the outer span: the words themselves start hidden
  // inside a clipping mask, so they can't be used to detect visibility.
  return (
    <m.span
      className={className}
      aria-label={text}
      role="text"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ staggerChildren: 0.06, delayChildren: delay }}
    >
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="word-mask" aria-hidden="true">
            <m.span
              className="word"
              variants={{ hidden: { y: '110%' }, show: { y: '0%', transition: { duration: 0.9, ease } } }}
            >
              {w}
            </m.span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </m.span>
  )
}

export { ease }
