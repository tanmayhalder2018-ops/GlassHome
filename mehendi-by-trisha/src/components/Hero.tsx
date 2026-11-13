import { useRef } from 'react'
import { m, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Img } from './Img'
import { Button } from './Button'
import { Sprig, Mandala, FloatingLeaves, FlowerMark } from './Botanical'
import { ease } from './Reveal'
import { HERO_SLUG } from '../data/gallery'
import { BUSINESS } from '../config/site'
import { Portrait } from './Portrait'

const line = (delay: number) => ({
  initial: { y: '105%' },
  animate: { y: '0%' },
  transition: { duration: 1.1, ease, delay },
})

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '12%'])
  const smallY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-30%'])

  return (
    <section id="home" ref={ref} className="hero" aria-labelledby="hero-title">
      <FloatingLeaves count={7} className="hero__leaves" />
      <Mandala className="hero__mandala" delay={0.6} />

      <div className="container hero__grid">
        <div className="hero__copy">
          <m.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.2 }}>
            <span className="eyebrow__line" /> {BUSINESS.title}<span className="hero__eyebrow-place"> · {BUSINESS.locality}</span>
          </m.p>

          <h1 id="hero-title" className="hero__title">
            <span className="line-mask"><m.span {...line(0.25)}>Where Art</m.span></span>
            <span className="line-mask"><m.span {...line(0.38)}>Meets <em>Tradition.</em></m.span></span>
          </h1>

          <m.p className="hero__lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease, delay: 0.7 }}>
            Beautifully handcrafted henna designs for weddings, celebrations, and unforgettable moments.
          </m.p>

          <m.div className="hero__ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease, delay: 0.85 }}>
            <Button href="#gallery">Explore My Art</Button>
            <Button href="#booking" variant="outline">Book Your Date</Button>
          </m.div>

          <m.p className="hero__script" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, delay: 1.3 }} aria-hidden="true">
            let your hands do the talking
          </m.p>
        </div>

        <div className="hero__visual">
          <m.div
            className="hero__arch"
            initial={{ clipPath: 'inset(100% 0 0 0 round 999px 999px 0 0)' }}
            animate={{ clipPath: 'inset(0% 0 0 0 round 999px 999px 0 0)' }}
            transition={{ duration: 1.5, ease, delay: 0.1 }}
          >
            <m.div className="hero__arch-img" style={{ y: imgY }}>
              <Img
                slug={HERO_SLUG}
                alt="Bridal mehendi by Trisha: a peacock, hanging jhumkas, elephants and lotus motifs covering a bride's palm"
                sizes="(min-width: 960px) 40vw, 86vw"
                focus="center 42%"
                priority
              />
            </m.div>
          </m.div>
          <span className="hero__arch-line" aria-hidden="true" />

          <m.figure
            className="hero__small"
            style={{ y: smallY }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease, delay: 0.9 }}
          >
            <Portrait className="hero__small-img" focus="center 18%" />
            <figcaption className="hero__small-cap">
              <span className="script">Trisha</span>
              <span>{BUSINESS.title}</span>
            </figcaption>
          </m.figure>

          <Sprig className="hero__sprig" delay={0.9} />

          <m.div className="hero__badge" initial={{ opacity: 0, rotate: -20 }} animate={{ opacity: 1, rotate: 0 }} transition={{ duration: 1.2, ease, delay: 1.1 }} aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <defs>
                <path id="badge-circle" d="M60 60 m -46 0 a 46 46 0 1 1 92 0 a 46 46 0 1 1 -92 0" />
              </defs>
              <text>
                <textPath href="#badge-circle" textLength="287" lengthAdjust="spacing">HANDCRAFTED HENNA ✦ BRIDAL & FESTIVE ✦ </textPath>
              </text>
            </svg>
            <FlowerMark size={26} />
          </m.div>
        </div>
      </div>

      <a href="#about" className="scroll-cue" aria-label="Scroll to the artist introduction">
        <span>Scroll</span>
        <span className="scroll-cue__track"><span className="scroll-cue__dot" /></span>
      </a>
    </section>
  )
}
