import { useRef } from 'react'
import { m, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Img } from './Img'
import { Button } from './Button'
import { Sprig, Mandala, FloatingLeaves, FlowerMark } from './Botanical'
import { ease } from './Reveal'
import { HERO_SLUG } from '../data/gallery'
import { BUSINESS, whatsappLink } from '../config/site'
import { Portrait } from './Portrait'
import { WhatsAppIcon } from './BrandIcons'

const line = (delay: number) => ({
  initial: { y: '105%' },
  animate: { y: '0%' },
  transition: { duration: 1.1, ease, delay },
})

const CHIPS = ['Bridal & custom designs', 'Home & venue visits', 'Names & initials', 'Book on WhatsApp']

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '10%'])
  const smallY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-25%'])

  return (
    <section id="home" ref={ref} className="hero" aria-labelledby="hero-title">
      <FloatingLeaves count={6} className="hero__leaves" />
      <Mandala className="hero__mandala" delay={0.6} />

      <div className="container hero__grid">
        <div className="hero__copy">
          <h1 id="hero-title" className="hero__title">
            <m.span className="hero__kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.15 }}>
              <span className="hero__kicker-line" aria-hidden="true" />
              {BUSINESS.title} in <mark className="hl">{BUSINESS.locality}</mark>
            </m.span>
            <span className="line-mask"><m.span {...line(0.25)}>Where Art</m.span></span>
            <span className="line-mask"><m.span {...line(0.36)}>Meets <em>Tradition.</em></m.span></span>
          </h1>

          <m.p className="hero__lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease, delay: 0.6 }}>
            Handcrafted <mark className="hl">bridal &amp; custom henna</mark> for weddings and celebrations — Trisha comes to
            your <mark className="hl">home or venue</mark> across North 24 Parganas, Nadia &amp; Kolkata.
          </m.p>

          <m.div className="hero__ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease, delay: 0.75 }}>
            <Button href="#booking">Book Your Date</Button>
            <Button href={whatsappLink()} external variant="outline" icon={<WhatsAppIcon size={17} />}>
              WhatsApp
            </Button>
          </m.div>

          <m.ul
            className="hero__chips"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.95 } } }}
          >
            {CHIPS.map((c) => (
              <m.li key={c} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}>
                <Check size={14} strokeWidth={2.2} aria-hidden="true" /> {c}
              </m.li>
            ))}
          </m.ul>
        </div>

        <div className="hero__visual">
          <m.div
            className="hero__arch"
            initial={{ clipPath: 'inset(100% 0 0 0 round 999px 999px 0 0)' }}
            animate={{ clipPath: 'inset(0% 0 0 0 round 999px 999px 0 0)' }}
            transition={{ duration: 1.4, ease, delay: 0.1 }}
          >
            <m.div className="hero__arch-img" style={{ y: imgY }}>
              <Img
                slug={HERO_SLUG}
                alt="Bridal mehendi by Trisha: a peacock, hanging jhumkas, elephants and lotus motifs covering a bride's palm"
                sizes="(min-width: 960px) 36vw, 72vw"
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
            <Portrait className="hero__small-img" focus="47% 34%" />
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
    </section>
  )
}
